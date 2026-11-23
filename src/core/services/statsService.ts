import { supabase } from '../lib/supabase';

export interface LiveStats {
  genres: number;
  series: number;
  readers: number;
  creators: number;
}

export async function getLiveStats(): Promise<LiveStats> {
  const [mangasRes, genresRes, readersRes, creatorsRes] = await Promise.all([
    supabase.from('mangas').select('*', { count: 'exact', head: true }),
    supabase.from('mangas').select('genre'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'reader')
      .eq('is_deleted', false)
      .eq('is_active', true),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['creator', 'both'])
      .eq('is_deleted', false)
      .eq('is_active', true),
  ]);

  const distinctGenres = new Set(
    (genresRes.data ?? []).map((r: any) => r.genre).filter(Boolean),
  );

  return {
    genres: distinctGenres.size,
    series: mangasRes.count || 0,
    readers: readersRes.count || 0,
    creators: creatorsRes.count || 0,
  };
}