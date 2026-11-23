import { supabase } from '../lib/supabase';

export type CharacterRole = 'protagonist' | 'deuteragonist' | 'antagonist' | 'supporting';

export interface MangaCharacter {
  id: string;
  name: string;
  title: string;
  series: string;
  seriesId: string; // Mappé depuis manga_id
  role: CharacterRole;
  genre: string;
  icon: string;
  accentColor: string; // Mappé depuis accent_color
  age: number;
  power: string;
  bio: string;
}

export const ROLE_LABELS: Record<CharacterRole, string> = {
  protagonist: 'Protagonist',
  deuteragonist: 'Ally',
  antagonist: 'Antagonist',
  supporting: 'Supporting',
};

export const ROLE_COLORS: Record<CharacterRole, string> = {
  protagonist: '#f5b042',
  deuteragonist: '#4ade80',
  antagonist: '#ef4444',
  supporting: '#60a5fa',
};

function mapSupabaseToCharacter(row: any): MangaCharacter {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    series: row.series || 'Unknown Series',
    seriesId: row.manga_id,
    role: row.role as CharacterRole,
    genre: row.genre,
    icon: row.icon,
    accentColor: row.accent_color,
    age: row.age || 0,
    power: row.power || '',
    bio: row.bio || '',
  };
}

export async function getAllCharacters(): Promise<MangaCharacter[]> {
  const { data, error } = await supabase.from('characters').select('*');
  if (error || !data) return [];
  return data.map(mapSupabaseToCharacter);
}

export async function getCharactersBySeries(seriesId: string): Promise<MangaCharacter[]> {
  const { data, error } = await supabase.from('characters').select('*').eq('manga_id', seriesId);
  if (error || !data) return [];
  return data.map(mapSupabaseToCharacter);
}

export async function getGenresFromCharacters(): Promise<string[]> {
  const all = await getAllCharacters();
  const set = new Set<string>();
  for (const c of all) {
    if (c.genre) set.add(c.genre);
  }
  return [...set].sort();
}

export async function getCharactersByGenre(genre: string): Promise<MangaCharacter[]> {
  const all = await getAllCharacters();
  if (genre === 'all') return all;
  return all.filter((c) => c.genre === genre);
}

export async function getCharactersByRole(role: CharacterRole | 'all'): Promise<MangaCharacter[]> {
  const all = await getAllCharacters();
  if (role === 'all') return all;
  return all.filter((c) => c.role === role);
}

export async function getCharacterById(id: string): Promise<MangaCharacter | null> {
  const { data, error } = await supabase.from('characters').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapSupabaseToCharacter(data);
}