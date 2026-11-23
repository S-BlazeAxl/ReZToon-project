import { supabase } from '../lib/supabase';
import type { UserRole } from './userService';

export interface Contact {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: UserRole;
  genre: string;
  country: string;
  bio: string;
  online: boolean;
}

function mapProfileToContact(u: any): Contact {
  return {
    id: u.id,
    name: u.name,
    username: u.username || u.email?.split('@')[0] || 'user',
    avatar: u.photo || u.name?.charAt(0).toUpperCase() || '?',
    role: (u.role as UserRole) || 'reader',
    genre: Array.isArray(u.favorite_genres) && u.favorite_genres.length > 0 ? u.favorite_genres[0] : 'Manga',
    country: u.country || 'Unknown',
    bio: u.bio || '',
    online: false,
  };
}

export async function getAllContacts(excludeId?: string): Promise<Contact[]> {
  let query = supabase
    .from('profiles')
    .select('id,name,username,photo,role,favorite_genres,country,bio')
    .eq('is_deleted', false)
    .eq('is_active', true)
    .limit(50);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapProfileToContact);
}

export async function getContactById(id: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,username,photo,role,favorite_genres,country,bio')
    .eq('id', id)
    .eq('is_deleted', false)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return mapProfileToContact(data);
}

export async function searchContacts(query: string, excludeId?: string): Promise<Contact[]> {
  // Search only a bounded, wildcard-neutral term and select only contact-safe fields.
  const q = query.trim().slice(0, 80).replace(/[\%_]/g, '');
  if (!q) return [];

  const columns = ['name', 'username', 'country', 'email'] as const;
  const results = await Promise.all(columns.map(async (column) => {
    let dbQuery = supabase
      .from('profiles')
      .select('id,name,username,photo,role,favorite_genres,country,bio')
      .ilike(column, `%${q}%`)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .limit(20);
    if (excludeId) dbQuery = dbQuery.neq('id', excludeId);
    const { data, error } = await dbQuery;
    if (error || !data) return [];
    return data;
  }));

  const unique = new Map<string, any>();
  results.flat().forEach((row) => unique.set(row.id, row));
  return Array.from(unique.values()).slice(0, 20).map(mapProfileToContact);
}

export async function getContactsByGenre(genre: string, excludeId?: string): Promise<Contact[]> {
  let dbQuery = supabase
    .from('profiles')
    .select('id,name,username,photo,role,favorite_genres,country,bio')
    .eq('is_deleted', false)
    .eq('is_active', true)
    .limit(30);

  if (genre !== 'all') dbQuery = dbQuery.contains('favorite_genres', [genre]);
  if (excludeId) dbQuery = dbQuery.neq('id', excludeId);

  const { data, error } = await dbQuery;
  if (error || !data) return [];
  return data.map(mapProfileToContact);
}