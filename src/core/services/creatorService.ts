import { supabase } from '../lib/supabase';
import { getFollowedCreatorIds } from './followService';

export interface CreatorWork {
  id: string;
  title: string;
  genre: string;
  reads: number;
  likes: number;
  chapters: number;
  status?: string;
  cover?: string;
}

export interface SuggestedCreator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  /** Genre principal affiché : un genre favori de l'utilisateur s'il correspond, sinon celui des œuvres. */
  genre: string;
  country: string;
  bio: string;
  rank: number;
  followers: number;
  totalReads: number;
  totalLikes: number;
  works: CreatorWork[];
  followingBooks: string[];
  follows: string[];
  role?: string;
  penName?: string;
  specialization?: string;
  portfolioUrl?: string;
  /** Tous les genres du créateur (favoris + genres de ses œuvres). */
  genres?: string[];
  /** Genres du créateur qui correspondent aux genres favoris de l'utilisateur. */
  matchedGenres?: string[];
}

/** Colonnes publiques uniquement : jamais d'email, téléphone ou date de naissance. */
const PUBLIC_PROFILE_COLUMNS =
  'id, name, username, photo, bio, creator_bio, pen_name, specialization, portfolio_url, favorite_genres, country, role';

const norm = (g: string) => g.trim().toLowerCase();

function uniqueGenres(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    const key = norm(v);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
  }
  return out;
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, { label: string; n: number }>();
  for (const v of values) {
    const key = norm(v);
    const cur = counts.get(key);
    counts.set(key, { label: cur?.label ?? v, n: (cur?.n ?? 0) + 1 });
  }
  let best: { label: string; n: number } | null = null;
  counts.forEach((c) => { if (!best || c.n > best.n) best = c; });
  return best ? (best as { label: string; n: number }).label : null;
}

export function mapProfileToCreator(
  p: any,
  extras: { works?: CreatorWork[]; followers?: number } = {},
): SuggestedCreator {
  const works = extras.works ?? [];
  const favorites: string[] = Array.isArray(p.favorite_genres) ? p.favorite_genres.filter(Boolean) : [];
  const genres = uniqueGenres([...works.map((w) => w.genre), ...favorites]);
  const primary = mostCommon(works.map((w) => w.genre)) ?? favorites[0] ?? p.specialization ?? 'Manga';

  return {
    id: p.id,
    name: p.name || 'Unknown',
    username: p.username || '',
    avatar: p.photo || '',
    genre: primary,
    country: p.country || '',
    bio: p.creator_bio || p.bio || '',
    rank: 99,
    followers: extras.followers ?? 0,
    totalReads: works.reduce((sum, w) => sum + (w.reads || 0), 0),
    totalLikes: works.reduce((sum, w) => sum + (w.likes || 0), 0),
    works,
    followingBooks: [],
    follows: [],
    role: p.role,
    penName: p.pen_name || undefined,
    specialization: p.specialization || undefined,
    portfolioUrl: p.portfolio_url || undefined,
    genres,
    matchedGenres: [],
  };
}

async function fetchWorksByAuthor(authorIds: string[]): Promise<Map<string, CreatorWork[]>> {
  const map = new Map<string, CreatorWork[]>();
  if (authorIds.length === 0) return map;

  const { data, error } = await supabase
    .from('mangas')
    .select('id, title, genre, reads, likes, status, cover, author_id')
    .in('author_id', authorIds);
  if (error || !data) return map;

  for (const m of data as any[]) {
    const list = map.get(m.author_id) ?? [];
    list.push({
      id: m.id,
      title: m.title,
      genre: m.genre,
      reads: m.reads ?? 0,
      likes: m.likes ?? 0,
      chapters: 0,
      status: m.status,
      cover: m.cover,
    });
    map.set(m.author_id, list);
  }
  return map;
}

/** Nombre d'abonnés par créateur (fonction SQL d'agrégation : la RLS masque les lignes de `follows` des autres). */
async function fetchFollowerCounts(ids: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase.rpc('creator_follower_counts', { p_ids: ids });
  if (error) {
    // PGRST202 / 404 : appliquer supabase/migrations/20261124_creator_profiles.sql
    console.warn('[creatorService] creator_follower_counts failed:', error.code, error.message);
    return map;
  }
  (data ?? []).forEach((r: any) => map.set(r.creator_id, Number(r.followers) || 0));
  return map;
}

async function hydrate(profiles: any[]): Promise<SuggestedCreator[]> {
  const ids = profiles.map((p) => p.id);
  const [works, followers] = await Promise.all([fetchWorksByAuthor(ids), fetchFollowerCounts(ids)]);
  return profiles.map((p) => mapProfileToCreator(p, { works: works.get(p.id), followers: followers.get(p.id) }));
}

export async function getAllCreators(): Promise<SuggestedCreator[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .in('role', ['creator', 'both'])
    .eq('is_deleted', false)
    .eq('is_active', true);
  if (error || !data) return [];
  return hydrate(data);
}

export async function getCreatorById(id: string): Promise<SuggestedCreator | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('id', id)
    .in('role', ['creator', 'both'])
    .eq('is_deleted', false)
    .maybeSingle();
  if (error || !data) return null;
  return (await hydrate([data]))[0] ?? null;
}

/** Profil public d'un utilisateur (créateur ou lecteur) avec ses œuvres et son nombre d'abonnés. */
export async function getPublicProfile(id: string): Promise<SuggestedCreator | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error || !data) return null;
  return (await hydrate([data]))[0] ?? null;
}

export async function getCreatorsByIds(ids: string[]): Promise<SuggestedCreator[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .in('id', ids)
    .in('role', ['creator', 'both'])
    .eq('is_deleted', false);
  if (error || !data) return [];

  const hydrated = await hydrate(data);
  const byId = new Map(hydrated.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is SuggestedCreator => c !== undefined);
}

/**
 * Classe les créateurs selon les genres favoris de l'utilisateur :
 *   1. nombre de genres en commun (favoris du créateur + genres de ses œuvres) — critère dominant ;
 *   2. bonus si le genre principal du créateur correspond ;
 *   3. popularité (abonnés, lectures) pour départager, ou seul critère sans genres favoris.
 */
export function rankSuggestedCreators(
  creators: SuggestedCreator[],
  favoriteGenres: string[],
): SuggestedCreator[] {
  const wanted = new Set(favoriteGenres.map(norm).filter(Boolean));

  return creators
    .map((c) => {
      const matched = (c.genres ?? []).filter((g) => wanted.has(norm(g)));
      const primaryMatch = wanted.has(norm(c.genre)) ? 1 : 0;
      const popularity = Math.log1p(c.followers) * 5 + Math.log1p(c.totalReads) * 2 + c.works.length;
      const score = matched.length * 100 + primaryMatch * 50 + popularity;
      const genre = matched[0] ?? c.genre;
      return { creator: { ...c, matchedGenres: matched, genre }, score };
    })
    .sort((a, b) => b.score - a.score || a.creator.name.localeCompare(b.creator.name))
    .map(({ creator }, index) => ({ ...creator, rank: index + 1 }));
}

export async function getSuggestedCreatorsForUser({
  userId,
  userGenre,
  userFavoriteGenres,
  limit = 12,
}: {
  userId: string;
  userGenre?: string | null;
  userFavoriteGenres?: string[];
  limit?: number;
}): Promise<SuggestedCreator[]> {
  const genres = uniqueGenres([userGenre, ...(userFavoriteGenres ?? [])]);

  // On récupère un large échantillon PUIS on classe (l'ancienne version coupait à `limit` avant de trier).
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .neq('id', userId)
    .in('role', ['creator', 'both'])
    .eq('is_deleted', false)
    .eq('is_active', true)
    .limit(120);
  if (error || !data) return [];

  const [candidates, followedIds] = await Promise.all([hydrate(data), getFollowedCreatorIds(userId)]);
  const followed = new Set(followedIds);

  return rankSuggestedCreators(
    candidates.filter((c) => !followed.has(c.id)),
    genres,
  ).slice(0, limit);
}

export async function getFollows(creator: SuggestedCreator): Promise<SuggestedCreator[]> {
  if (!creator.follows || creator.follows.length === 0) return [];
  return getCreatorsByIds(creator.follows);
}

export function getFollowingBooks(creator: SuggestedCreator): string[] {
  return Array.isArray(creator.followingBooks) ? creator.followingBooks : [];
}
