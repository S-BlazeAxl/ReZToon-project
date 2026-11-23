import { supabase } from '../lib/supabase';

export type EventTemplate = 'classic' | 'bold' | 'minimal' | 'split' | 'poster';
export type EventBgType = 'solid' | 'gradient' | 'pattern';
export type EventCategory =
  | 'festival' | 'awards' | 'live' | 'contest' | 'workshop' | 'meetup' | 'premiere' | 'masterclass';

export const VALID_CATEGORIES: EventCategory[] = [
  'festival', 'awards', 'live', 'contest', 'workshop', 'meetup', 'premiere', 'masterclass',
];

export interface EventStat {
  value: string;
  label: string;
}

export interface EventDesign {
  accentColor: string;
  textColor: string;
  image: string;
  imageOverlay: 'none' | 'dark' | 'light' | 'gradient-bottom' | 'gradient-top';
  overlayIntensity: number;
  badgeText: string;
  ageBadge: string;
  rating: string;
  metaItems: string;
  titleHighlight: string;
  titleSize: number;
  primaryCta: string;
  secondaryCta: string;
  stats: EventStat[];
  template: EventTemplate;
  bgType: EventBgType;
  bgValue: string;
  decorationIcon: string;
  showHost: boolean;
  showLocation: boolean;
  showDate: boolean;
  showDescription: boolean;
  imageFit: 'cover' | 'contain';
  imageOpacity: number;
  imageBlur: number;
  imagePosition: string;
  titleAlign: 'left' | 'center' | 'right';
}

export interface CommunityEvent {
  id: string;
  title: string;
  tagline?: string;
  host: string;
  date: string;
  location: string;
  description?: string;
  category?: EventCategory;
  featured?: boolean;
  attendees?: number;
  price?: string;
  cta?: string;
  cover?: string;
  design?: EventDesign;
  createdAt?: string;
  createdBy?: string;
  createdByName?: string;
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  festival: 'Festival',
  awards: 'Awards',
  live: 'Live Stream',
  contest: 'Contest',
  workshop: 'Workshop',
  meetup: 'Meetup',
  premiere: 'Premiere',
  masterclass: 'Masterclass',
};

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  festival: '#f5b042',
  awards: '#a78bfa',
  live: '#ef4444',
  contest: '#60a5fa',
  workshop: '#4ade80',
  meetup: '#f472b6',
  premiere: '#22d3ee',
  masterclass: '#fb923c',
};

export const DEFAULT_EVENT_DESIGN: EventDesign = {
  accentColor: '#f5b042',
  textColor: '#ffffff',
  image: '',
  imageOverlay: 'gradient-bottom',
  overlayIntensity: 0.85,
  badgeText: 'FEATURED · EVENT',
  ageBadge: '',
  rating: '',
  metaItems: 'Festival · Africa',
  titleHighlight: '',
  titleSize: 62,
  primaryCta: 'Register',
  secondaryCta: 'Learn more',
  stats: [
    { value: '12k', label: 'ATTENDEES' },
    { value: '4.9', label: 'RATING' },
    { value: '3', label: 'DAYS' },
  ],
  template: 'classic',
  bgType: 'gradient',
  bgValue: 'linear-gradient(135deg, #1c1c2e 0%, #c25b3c 100%)',
  decorationIcon: 'Calendar',
  showHost: true,
  showLocation: true,
  showDate: true,
  showDescription: true,
  imageFit: 'cover',
  imageOpacity: 1,
  imageBlur: 0,
  imagePosition: 'background',
  titleAlign: 'left',
};

export const EVENT_BG_PRESETS = [
  { id: 'gold-terra', type: 'gradient' as const, value: 'linear-gradient(135deg, #f5b042 0%, #c25b3c 100%)', label: 'Gold → Terracotta' },
  { id: 'dark-gold', type: 'gradient' as const, value: 'linear-gradient(135deg, #1c1c2e 0%, #f5b042 100%)', label: 'Midnight → Gold' },
  { id: 'indigo-gold', type: 'gradient' as const, value: 'linear-gradient(135deg, #1e1b3a 0%, #f5b042 100%)', label: 'Indigo → Gold' },
  { id: 'afro-sunset', type: 'gradient' as const, value: 'linear-gradient(135deg, #c25b3c 0%, #f5b042 50%, #e8a75c 100%)', label: 'Afro Sunset' },
  { id: 'savanna-gold', type: 'gradient' as const, value: 'linear-gradient(135deg, #e8a75c 0%, #f5b042 100%)', label: 'Savanna → Sun' },
  { id: 'clay-terra', type: 'gradient' as const, value: 'linear-gradient(135deg, #6b3f2a 0%, #c25b3c 100%)', label: 'Clay → Terracotta' },
  { id: 'midnight', type: 'solid' as const, value: '#0d0d1a', label: 'Midnight' },
  { id: 'indigo', type: 'solid' as const, value: '#1e1b3a', label: 'Indigo' },
  { id: 'terracotta', type: 'solid' as const, value: '#c25b3c', label: 'Terracotta' },
  { id: 'gold', type: 'solid' as const, value: '#f5b042', label: 'Gold' },
  { id: 'clay', type: 'solid' as const, value: '#6b3f2a', label: 'Clay' },
  { id: 'savanna', type: 'solid' as const, value: '#e8a75c', label: 'Savanna' },
  { id: 'kente', type: 'pattern' as const, value: 'kente', label: 'Kente' },
  { id: 'dots', type: 'pattern' as const, value: 'dots', label: 'Dots' },
  { id: 'grid', type: 'pattern' as const, value: 'grid', label: 'Grid' },
];

export const EVENT_ACCENT_COLORS = ['#f5b042', '#c25b3c', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#e8a75c', '#ffffff'];
export const EVENT_TEXT_COLORS = ['#ffffff', '#0d0d1a', '#f5b042', '#e8e2d9'];
export const EVENT_ICONS = ['Calendar', 'Sparkles', 'Music', 'Mic', 'Star', 'Trophy', 'Flame', 'Heart', 'BookOpen', 'Users', 'MapPin', 'Award'];

function normalizeCategory(cat: string | null | undefined): EventCategory {
  if (!cat) return 'festival';
  return (VALID_CATEGORIES as string[]).includes(cat) ? (cat as EventCategory) : 'festival';
}

function mapSupabaseToEvent(row: any): CommunityEvent {
  return {
    id: row.id,
    title: row.title,
    tagline: row.tagline ?? undefined,
    host: row.host,
    date: row.date,
    location: row.location,
    description: row.description ?? undefined,
    category: normalizeCategory(row.category),
    featured: Boolean(row.featured),
    attendees: row.attendees ?? 0,
    price: row.price ?? undefined,
    cover: row.cover || row.image,
    design: row.design || { ...DEFAULT_EVENT_DESIGN },
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
    createdByName: row.created_by_name ?? undefined,
  };
}

export async function getEvents(): Promise<CommunityEvent[]> {
  const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
  if (error || !data) return [];
  return data.map(mapSupabaseToEvent);
}

export async function getEventsByCategory(
  category: EventCategory | 'all',
): Promise<CommunityEvent[]> {
  const events = await getEvents();
  if (category === 'all') return events;
  return events.filter((e) => e.category === category);
}

export async function getUpcomingEvents(): Promise<CommunityEvent[]> {
  const events = await getEvents();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const floor = todayStart.getTime();
  return events.filter((e) => {
    const d = new Date(e.date);
    const t = Number.isNaN(d.getTime()) ? 0 : d.getTime();
    return t >= floor;
  });
}

export async function getFeaturedEvents(): Promise<CommunityEvent[]> {
  const events = await getEvents();
  return events.filter((e) => e.featured);
}

export async function getEventById(id: string): Promise<CommunityEvent | null> {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapSupabaseToEvent(data);
}

export async function addEvent(
  payload: Omit<CommunityEvent, 'id' | 'createdAt'>,
): Promise<CommunityEvent | null> {
  const title = (payload.title ?? '').trim();
  const host = (payload.host ?? '').trim();
  const date = (payload.date ?? '').trim();
  const location = (payload.location ?? '').trim();

  if (!title || !host || !date || !location) return null;

  const dbInsert: Record<string, unknown> = {
    title,
    host,
    date,
    location,
    description: payload.description,
    category: normalizeCategory(payload.category),
    price: payload.price ?? 'Free',
    design: { ...DEFAULT_EVENT_DESIGN, ...(payload.design ?? {}) },
  };

  if (payload.cover !== undefined) dbInsert.cover = payload.cover;
  if (payload.tagline !== undefined) dbInsert.tagline = payload.tagline;
  if (payload.featured !== undefined) dbInsert.featured = payload.featured;
  if (payload.attendees !== undefined) dbInsert.attendees = payload.attendees;
  if (payload.createdBy !== undefined) dbInsert.created_by = payload.createdBy;
  if (payload.createdByName !== undefined) dbInsert.created_by_name = payload.createdByName;

  const { data, error } = await supabase.from('events').insert(dbInsert).select().single();
  if (error || !data) return null;
  return mapSupabaseToEvent(data);
}

export async function updateEvent(
  id: string,
  updates: Partial<Omit<CommunityEvent, 'id' | 'createdAt'>>,
): Promise<CommunityEvent | null> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title.trim();
  if (updates.host !== undefined) dbUpdates.host = updates.host.trim();
  if (updates.date !== undefined) dbUpdates.date = updates.date.trim();
  if (updates.location !== undefined) dbUpdates.location = updates.location.trim();
  if (updates.description !== undefined) dbUpdates.description = updates.description.trim();
  if (updates.category !== undefined) dbUpdates.category = normalizeCategory(updates.category);
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.cover !== undefined) dbUpdates.cover = updates.cover;
  if (updates.tagline !== undefined) dbUpdates.tagline = updates.tagline;
  if (updates.featured !== undefined) dbUpdates.featured = updates.featured;
  if (updates.attendees !== undefined) dbUpdates.attendees = updates.attendees;

  if (updates.design !== undefined) {
    const existing = await getEventById(id);
    const baseDesign = existing?.design ?? DEFAULT_EVENT_DESIGN;
    dbUpdates.design = { ...baseDesign, ...updates.design };
  }

  if (
    dbUpdates.title === '' ||
    dbUpdates.host === '' ||
    dbUpdates.date === '' ||
    dbUpdates.location === ''
  ) {
    return null;
  }

  const { data, error } = await supabase.from('events').update(dbUpdates).eq('id', id).select().single();
  if (error || !data) return null;
  return mapSupabaseToEvent(data);
}

export async function deleteEvent(id: string): Promise<boolean> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  return !error;
}