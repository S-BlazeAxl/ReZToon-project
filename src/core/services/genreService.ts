import { supabase } from '../lib/supabase';
import {
  DEFAULT_GENRES,
  slugifyGenre,
  type GenreRecord,
} from '../../config/constants/genres';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Genre = GenreRecord & {
  createdAt?: string;
  updatedAt?: string;
};

export interface GenreInput {
  name: string;
  equivalent?: string;
  tag?: string;
  descriptionFr?: string;
  descriptionEn?: string;
  accentColor?: string;
  isActive?: boolean;
}

export interface GenreUsage {
  series: number;
  groups: number;
  posts: number;
  characters: number;
}

export interface GenreResult<T = Genre> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface GenreRow {
  id: string;
  name: string;
  equivalent: string | null;
  tag: string | null;
  description_fr: string | null;
  description_en: string | null;
  accent_color: string | null;
  position: number | null;
  is_active: boolean | null;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_ACCENT = '#f5b042';

function fromRow(r: GenreRow): Genre {
  return {
    id: r.id,
    name: r.name,
    equivalent: r.equivalent ?? '',
    tag: r.tag ?? '',
    descriptionFr: r.description_fr ?? '',
    descriptionEn: r.description_en ?? '',
    accentColor: r.accent_color ?? DEFAULT_ACCENT,
    position: r.position ?? 0,
    isActive: r.is_active ?? true,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toRow(g: Partial<Genre>): Partial<GenreRow> {
  const row: Partial<GenreRow> = {};
  if (g.id !== undefined) row.id = g.id;
  if (g.name !== undefined) row.name = g.name;
  if (g.equivalent !== undefined) row.equivalent = g.equivalent;
  if (g.tag !== undefined) row.tag = g.tag;
  if (g.descriptionFr !== undefined) row.description_fr = g.descriptionFr;
  if (g.descriptionEn !== undefined) row.description_en = g.descriptionEn;
  if (g.accentColor !== undefined) row.accent_color = g.accentColor;
  if (g.position !== undefined) row.position = g.position;
  if (g.isActive !== undefined) row.is_active = g.isActive;
  return row;
}

/* ------------------------------------------------------------------ */
/* Store partagé (toute l'application lit les mêmes genres)            */
/* ------------------------------------------------------------------ */

export interface GenresState {
  genres: Genre[];
  /** true tant que la première lecture n'est pas terminée. */
  loading: boolean;
  /** true si les genres viennent de la base (false = repli statique). */
  fromDb: boolean;
}

let state: GenresState = {
  genres: DEFAULT_GENRES.map((g) => ({ ...g })),
  loading: false,
  fromDb: false,
};
let loadedAt = 0;
let inflight: Promise<Genre[]> | null = null;
const listeners = new Set<() => void>();
const STALE_MS = 5 * 60 * 1000;

function setState(next: GenresState) {
  state = next;
  listeners.forEach((l) => l());
}

export function subscribeGenres(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGenresSnapshot(): GenresState {
  return state;
}

/** Lecture synchrone (hors React) des genres actifs, triés. */
export function getCachedGenres(includeInactive = false): Genre[] {
  return includeInactive ? state.genres : state.genres.filter((g) => g.isActive);
}

export function getCachedGenreNames(includeInactive = false): string[] {
  return getCachedGenres(includeInactive).map((g) => g.name);
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

async function fetchGenres(): Promise<{ genres: Genre[]; fromDb: boolean }> {
  try {
    const { data, error } = await supabase
      .from('genres')
      .select('*')
      .order('position', { ascending: true })
      .order('name', { ascending: true });
    if (error || !data || data.length === 0) {
      return { genres: DEFAULT_GENRES.map((g) => ({ ...g })), fromDb: false };
    }
    return { genres: (data as GenreRow[]).map(fromRow), fromDb: true };
  } catch {
    return { genres: DEFAULT_GENRES.map((g) => ({ ...g })), fromDb: false };
  }
}

/** Force une relecture (à appeler après un CRUD). */
export function refreshGenres(): Promise<Genre[]> {
  if (inflight) return inflight;
  setState({ ...state, loading: true });
  inflight = fetchGenres()
    .then(({ genres, fromDb }) => {
      loadedAt = Date.now();
      setState({ genres, fromDb, loading: false });
      return genres;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Charge les genres si ce n'est pas déjà fait (ou si le cache est ancien). */
export function ensureGenresLoaded(): Promise<Genre[]> {
  if (inflight) return inflight;
  if (loadedAt && Date.now() - loadedAt < STALE_MS) return Promise.resolve(state.genres);
  return refreshGenres();
}

export async function getGenres(includeInactive = false): Promise<Genre[]> {
  const list = await ensureGenresLoaded();
  return includeInactive ? list : list.filter((g) => g.isActive);
}

/* ------------------------------------------------------------------ */
/* Usage (combien de contenus utilisent chaque genre)                  */
/* ------------------------------------------------------------------ */

export async function getGenreUsageMap(): Promise<Record<string, GenreUsage>> {
  const map: Record<string, GenreUsage> = {};
  const bump = (name: string | null | undefined, key: keyof GenreUsage) => {
    if (!name) return;
    if (!map[name]) map[name] = { series: 0, groups: 0, posts: 0, characters: 0 };
    map[name][key] += 1;
  };

  const [mangas, groups, posts, characters] = await Promise.all([
    supabase.from('mangas').select('genre'),
    supabase.from('groups').select('genre'),
    supabase.from('community_posts').select('genre'),
    supabase.from('characters').select('genre'),
  ]);

  (mangas.data ?? []).forEach((r: { genre: string | null }) => bump(r.genre, 'series'));
  (groups.data ?? []).forEach((r: { genre: string | null }) => bump(r.genre, 'groups'));
  (posts.data ?? []).forEach((r: { genre: string | null }) => bump(r.genre, 'posts'));
  (characters.data ?? []).forEach((r: { genre: string | null }) => bump(r.genre, 'characters'));
  return map;
}

/* ------------------------------------------------------------------ */
/* CRUD (réservé au supervisor, appliqué par les policies RLS)         */
/* ------------------------------------------------------------------ */

function cleanName(name: string): string {
  return (name ?? '').trim().replace(/\s+/g, ' ');
}

function validate(input: GenreInput, existing: Genre[], selfId?: string): string | null {
  const name = cleanName(input.name);
  if (!name) return 'Le nom du genre est obligatoire.';
  if (name.length > 40) return 'Le nom du genre ne doit pas dépasser 40 caractères.';
  const clash = existing.some(
    (g) => g.id !== selfId && g.name.toLowerCase() === name.toLowerCase(),
  );
  if (clash) return `Le genre « ${name} » existe déjà.`;
  return null;
}

export async function createGenre(input: GenreInput): Promise<GenreResult> {
  const current = state.genres;
  const invalid = validate(input, current);
  if (invalid) return { ok: false, error: invalid };

  const name = cleanName(input.name);
  let id = slugifyGenre(name) || `genre-${Date.now()}`;
  if (current.some((g) => g.id === id)) id = `${id}-${Date.now().toString(36)}`;

  const position = current.reduce((max, g) => Math.max(max, g.position), 0) + 1;
  const record: Genre = {
    id,
    name,
    equivalent: (input.equivalent ?? '').trim(),
    tag: (input.tag ?? input.equivalent ?? '').trim(),
    descriptionFr: (input.descriptionFr ?? '').trim(),
    descriptionEn: (input.descriptionEn ?? '').trim(),
    accentColor: input.accentColor || DEFAULT_ACCENT,
    position,
    isActive: input.isActive ?? true,
  };

  const { data, error } = await supabase
    .from('genres')
    .insert(toRow(record))
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };

  await refreshGenres();
  return { ok: true, data: fromRow(data as GenreRow) };
}

/**
 * Met à jour un genre. Si le nom change, il est propagé à tout le projet
 * (séries, groupes, posts, personnages, awards, genres favoris) via la
 * fonction SQL `rename_genre`.
 */
export async function updateGenre(id: string, input: GenreInput): Promise<GenreResult> {
  const current = state.genres.find((g) => g.id === id);
  if (!current) return { ok: false, error: 'Genre introuvable.' };

  const invalid = validate(input, state.genres, id);
  if (invalid) return { ok: false, error: invalid };

  const newName = cleanName(input.name);

  if (newName !== current.name) {
    const { error } = await supabase.rpc('rename_genre', {
      p_id: id,
      p_new_name: newName,
    });
    if (error) return { ok: false, error: error.message };
  }

  const patch = toRow({
    equivalent: (input.equivalent ?? current.equivalent).trim(),
    tag: (input.tag ?? current.tag).trim(),
    descriptionFr: (input.descriptionFr ?? current.descriptionFr).trim(),
    descriptionEn: (input.descriptionEn ?? current.descriptionEn).trim(),
    accentColor: input.accentColor || current.accentColor,
    isActive: input.isActive ?? current.isActive,
  });

  const { data, error } = await supabase
    .from('genres')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };

  await refreshGenres();
  return { ok: true, data: fromRow(data as GenreRow) };
}

export async function setGenreActive(id: string, isActive: boolean): Promise<GenreResult> {
  const { data, error } = await supabase
    .from('genres')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  await refreshGenres();
  return { ok: true, data: fromRow(data as GenreRow) };
}

/** Échange la position de deux genres voisins (monter / descendre). */
export async function moveGenre(id: string, direction: -1 | 1): Promise<GenreResult<null>> {
  const list = [...state.genres].sort((a, b) => a.position - b.position);
  const idx = list.findIndex((g) => g.id === id);
  const swapIdx = idx + direction;
  if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return { ok: true, data: null };

  const a = list[idx];
  const b = list[swapIdx];
  // Re-numérote proprement pour éviter les positions identiques.
  const reordered = [...list];
  reordered[idx] = b;
  reordered[swapIdx] = a;

  const results = await Promise.all(
    reordered.map((g, i) =>
      supabase.from('genres').update({ position: i + 1 }).eq('id', g.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  await refreshGenres();
  return { ok: true, data: null };
}

/**
 * Supprime un genre.
 * Si des contenus l'utilisent, `reassignTo` (nom d'un autre genre) est obligatoire :
 * tout le projet est alors basculé sur ce genre avant la suppression.
 */
export async function deleteGenre(id: string, reassignTo?: string): Promise<GenreResult<null>> {
  const { error } = await supabase.rpc('delete_genre', {
    p_id: id,
    p_reassign_to: reassignTo ?? null,
  });
  if (error) return { ok: false, error: error.message };
  await refreshGenres();
  return { ok: true, data: null };
}

/** Insère les 6 genres principaux (utile si la table est vide). */
export async function seedDefaultGenres(): Promise<GenreResult<null>> {
  const rows = DEFAULT_GENRES.map((g) => toRow(g));
  const { error } = await supabase.from('genres').upsert(rows, { onConflict: 'id' });
  if (error) return { ok: false, error: error.message };
  await refreshGenres();
  return { ok: true, data: null };
}
