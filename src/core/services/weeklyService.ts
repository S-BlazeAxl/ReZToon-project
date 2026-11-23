import { supabase } from '../lib/supabase';
import { MANGA_GENRES } from '../../config/constants/genres';

export type WeekDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface WeeklyRelease {
  id: string;
  title: string;
  genre: string;
  subtitle: string;
  day: WeekDay;
  chapter: number;
  label: string;
  icon: string;
  tag: string;
  mangaId: string;
  chapterNumber: number;
}

export const WEEK_DAYS: WeekDay[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

/** Repli statique ; les écrans utilisent les genres dynamiques (useGenres). */
export const WEEKLY_GENRES: string[] = [...MANGA_GENRES];

export async function getAllWeeklyReleases(): Promise<WeeklyRelease[]> {
  const { data, error } = await supabase.rpc('get_weekly_releases');

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    title: r.title ?? '',
    genre: r.genre ?? '',
    subtitle: r.subtitle ?? '',
    day: r.day as WeekDay,
    chapter: r.chapter ?? 0,
    label: r.label ?? '',
    icon: r.icon ?? '',
    tag: r.tag ?? '',
    mangaId: r.manga_id,
    chapterNumber: r.chapter_number ?? 0,
  }));
}

export function getWeeklyFiltered(
  releases: WeeklyRelease[],
  genre: string,
  day: WeekDay | 'all',
): WeeklyRelease[] {
  return releases.filter((r) => {
    if (genre !== 'all' && r.genre !== genre) return false;
    if (day !== 'all' && r.day !== day) return false;
    return true;
  });
}

export function sortByDay(releases: WeeklyRelease[]): WeeklyRelease[] {
  return releases
    .slice()
    .sort((a, b) => WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day));
}

export function getWeeklyCounts(
  releases: WeeklyRelease[],
  dayFilter: WeekDay | 'all' = 'all',
  genreNames: readonly string[] = WEEKLY_GENRES,
): Record<string, number> {
  const source =
    dayFilter === 'all' ? releases : releases.filter((r) => r.day === dayFilter);
  const counts: Record<string, number> = { all: source.length };
  for (const g of genreNames) counts[g] = 0;
  for (const r of source) {
    if (counts[r.genre] !== undefined) counts[r.genre] += 1;
  }
  return counts;
}

export function getDayCounts(
  releases: WeeklyRelease[],
  genreFilter: string = 'all',
): Record<string, number> {
  const source =
    genreFilter === 'all'
      ? releases
      : releases.filter((r) => r.genre === genreFilter);
  const counts: Record<string, number> = { all: source.length };
  for (const d of WEEK_DAYS) counts[d] = 0;
  for (const r of source) {
    if (counts[r.day] !== undefined) counts[r.day] += 1;
  }
  return counts;
}