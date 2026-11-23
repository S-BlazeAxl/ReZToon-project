import { supabase } from '../lib/supabase';
import { getGenres } from './genreService';
import type { LandingData, CatalogueCardData, StatItem, GenreDescription } from '../../config/types';

export interface GenresConfig {
  genres: Record<string, GenreDescription>;
  default: string;
}

const LANDING_FALLBACK: LandingData = {
  brand: 'ReZToon',
  copyright: '2026 ReZToon - All rights reserved.',
  nav: [
    { href: '#hero', label: 'Home' },
    { href: '#about', label: 'About' },
    { href: '#catalogue', label: 'Genres' },
    { href: '#newsletter', label: 'Contact' },
  ],
  hero: {
    badge: 'African Manga Platform',
    titleLineOne: 'Discover the soul of',
    titleHighlight: 'African Manga',
    subtitle: 'Six universes. A thousand stories. One continent rewriting its own legends — from Sahelian epics to Afrofuturist cities.',
    primaryCta: 'Explore Genres',
    secondaryCta: 'Read the Story',
  },
  about: {
    tag: 'Our Mission',
    title: 'Stories that carry the weight of a continent',
    paragraphs: [
      "ReZToon exists to give African manga a home that honors its roots. We publish, celebrate and protect stories born from griot traditions, urban streets, spiritual folklore and futuristic dreams.",
      "From Mankia's warrior epics to Mandrea's solarpunk cities, every genre on ReZToon is a doorway into a universe that only Africa could have imagined.",
    ],
    features: [
      { icon: 'BookOpen', label: '6 Unique Genres' },
      { icon: 'Users', label: 'Reader Community' },
      { icon: 'PenTool', label: 'Creator Studio' },
      { icon: 'Globe', label: 'Pan-African' },
    ],
  },
  catalogue: {
    tag: 'The Six Universes',
    title: 'Explore African Manga Genres',
    subtitle: 'Each genre is a distinct world with its own rules, aesthetics and storytelling traditions.',
  },
  newsletter: {
    tag: 'Contact Us',
    title: 'Send a message to the supervisor team',
    subtitle: 'Report an issue, ask a question, or share feedback — we read every message.',
    placeholder: 'your@email.com',
    cta: 'Send Message',
  },
};

export async function getLandingConfig(): Promise<LandingData> {
  const { data, error } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'landing')
    .maybeSingle();
  if (error || !data) return LANDING_FALLBACK;
  return data.value as LandingData;
}

export async function getCatalogueConfig(): Promise<CatalogueCardData[]> {
  const { data, error } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'catalogue')
    .maybeSingle();
  if (error || !data) return [];
  return (data.value as { cards: CatalogueCardData[] })?.cards || [];
}

export async function getGenresConfig(): Promise<GenresConfig> {
  const { data, error } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'genres')
    .maybeSingle();
  if (error || !data) return { genres: {}, default: 'Discover African manga.' };
  return data.value as GenresConfig;
}

export async function getRealPlatformStats(): Promise<StatItem[]> {
  const [activeGenres, seriesRes, readersRes, creatorsRes] = await Promise.all([
    getGenres(),
    supabase.rpc('get_public_manga_count'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['reader', 'both'])
      .eq('is_deleted', false)
      .eq('is_active', true),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['creator', 'both'])
      .eq('is_deleted', false)
      .eq('is_active', true),
  ]);

  if (seriesRes.error) console.error('Failed to load manga series count:', seriesRes.error);
  if (readersRes.error) console.error('Failed to load reader count:', readersRes.error);
  if (creatorsRes.error) console.error('Failed to load creator count:', creatorsRes.error);

  return [
    { target: activeGenres.length, label: 'GENRES' },
    { target: Number(seriesRes.data ?? 0), label: 'SERIES' },
    { target: readersRes.count ?? 0, label: 'READERS' },
    { target: creatorsRes.count ?? 0, label: 'CREATORS' },
  ];
}
