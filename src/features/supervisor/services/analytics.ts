import { getUsers } from '../../../core/services/userService';
import type { User } from '../../../core/services/userService';
import { getCommunityPosts } from '../../../core/services/communityService';
import type { CommunityPost } from '../../../core/services/communityService';
import { getAllSeries } from '../../../core/services/contentService';
import type { Series } from '../../../core/services/contentService';
import { getReports } from '../../../core/services/reportService';
import { getAllMangas } from '../../../core/services/mangaService';
import type { Manga } from '../../../core/services/mangaService';
import type { TranslationSchema } from '../../../config/i18n/types';

export interface KpiCard {
  id: string;
  label: string;
  value: string;
  raw: number;
  trend: number | null;
  trendLabel: string;
  accent: string;
}

export interface GrowthPoint {
  month: string;
  users: number;
  creators: number;
  active: number;
}

export interface CountryStat {
  code: string;
  name: string;
  flag: string;
  users: number;
  creators: number;
  percent: number;
}

export interface RoleSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface TopCreator {
  id: string;
  name: string;
  country: string;
  series: number;
  chapters: number;
  reads: number;
  score: number;
}

export interface TopReader {
  id: string;
  name: string;
  country: string;
  posts: number;
  likes: number;
  comments: number;
  score: number;
}

export interface WeekdayActivity {
  day: string;
  value: number;
}

export interface GenreStat {
  genre: string;
  mangas: number;
  series: number;
  percent: number;
}

export interface AnalyticsSnapshot {
  kpis: KpiCard[];
  growth: GrowthPoint[];
  countries: CountryStat[];
  roles: RoleSlice[];
  topCreators: TopCreator[];
  topReaders: TopReader[];
  weekday: WeekdayActivity[];
  genres: GenreStat[];
  insights: string[];
  health: {
    score: number;
    openReports: number;
    resolvedReports: number;
    resolutionRate: number;
  };
}

const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
  senegal: { name: 'Senegal', flag: '🇸🇳' },
  mali: { name: 'Mali', flag: '🇲🇱' },
  'ivory coast': { name: 'Ivory Coast', flag: '🇨🇮' },
  "côte d'ivoire": { name: 'Ivory Coast', flag: '🇨🇮' },
  'cote d ivoire': { name: 'Ivory Coast', flag: '🇨🇮' },
  nigeria: { name: 'Nigeria', flag: '🇳🇬' },
  ghana: { name: 'Ghana', flag: '🇬🇭' },
  kenya: { name: 'Kenya', flag: '🇰🇪' },
  cameroon: { name: 'Cameroon', flag: '🇨🇲' },
  'south africa': { name: 'South Africa', flag: '🇿🇦' },
  morocco: { name: 'Morocco', flag: '🇲🇦' },
  egypt: { name: 'Egypt', flag: '🇪🇬' },
  algeria: { name: 'Algeria', flag: '🇩🇿' },
  tunisia: { name: 'Tunisia', flag: '🇹🇳' },
  ethiopia: { name: 'Ethiopia', flag: '🇪🇹' },
  tanzania: { name: 'Tanzania', flag: '🇹🇿' },
  uganda: { name: 'Uganda', flag: '🇺🇬' },
  rwanda: { name: 'Rwanda', flag: '🇷🇼' },
  congo: { name: 'Congo', flag: '🇨🇬' },
  'dr congo': { name: 'DR Congo', flag: '🇨🇩' },
  gabon: { name: 'Gabon', flag: '🇬🇦' },
  togo: { name: 'Togo', flag: '🇹🇬' },
  benin: { name: 'Benin', flag: '🇧🇯' },
  burkina: { name: 'Burkina Faso', flag: '🇧🇫' },
  'burkina faso': { name: 'Burkina Faso', flag: '🇧🇫' },
  guinea: { name: 'Guinea', flag: '🇬🇳' },
  france: { name: 'France', flag: '🇫🇷' },
  belgium: { name: 'Belgium', flag: '🇧🇪' },
  canada: { name: 'Canada', flag: '🇨🇦' },
  usa: { name: 'United States', flag: '🇺🇸' },
  'united states': { name: 'United States', flag: '🇺🇸' },
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function normalizeCountry(raw: string | undefined): { code: string; name: string; flag: string } {
  if (!raw) return { code: 'unknown', name: 'Unknown', flag: '🌍' };
  const key = raw.trim().toLowerCase();
  const found = COUNTRY_MAP[key];
  if (found) return { code: key, name: found.name, flag: found.flag };
  return { code: key, name: raw, flag: '🌍' };
}

function pluralize(t: TranslationSchema, key: 'readers' | 'creators' | 'supervisors' | 'both', count: number): string {
  if (key === 'both') return t.supervisor.roleBoth;
  const base = key === 'readers' ? t.common.roleReader : key === 'creators' ? t.common.roleCreator : t.common.roleSupervisor;
  return count === 1 ? base : `${base}s`;
}

function buildGrowthSeries(users: User[], posts: CommunityPost[], mangas: Manga[]): GrowthPoint[] {
  const now = new Date();
  const points: GrowthPoint[] = [];
  const postsByMonth = new Map<string, Set<string>>();
  const chaptersByMonth = new Map<string, Set<string>>();

  for (const p of posts) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const set = postsByMonth.get(key) ?? new Set<string>();
    set.add(p.authorId);
    postsByMonth.set(key, set);
  }

  for (const m of mangas) {
    if (!m.authorId) continue;
    for (const ch of m.chapters ?? []) {
      if (!ch.publishedAt) continue;
      const d = new Date(ch.publishedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const set = chaptersByMonth.get(key) ?? new Set<string>();
      set.add(m.authorId);
      chaptersByMonth.set(key, set);
    }
  }

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const usersInMonth = users.filter((u) => {
      if (!u.createdAt) return false;
      const c = new Date(u.createdAt);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    });
    const creatorsInMonth = usersInMonth.filter((u) => u.role === 'creator' || u.role === 'both').length;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const activeSet = new Set<string>();
    postsByMonth.get(key)?.forEach((id) => activeSet.add(id));
    chaptersByMonth.get(key)?.forEach((id) => activeSet.add(id));
    points.push({ month: label, users: usersInMonth.length, creators: creatorsInMonth, active: activeSet.size });
  }
  return points;
}

function buildCountries(users: User[]): CountryStat[] {
  const map = new Map<string, { code: string; name: string; flag: string; users: number; creators: number }>();
  for (const u of users) {
    const c = normalizeCountry(u.country);
    const entry = map.get(c.code) ?? { code: c.code, name: c.name, flag: c.flag, users: 0, creators: 0 };
    entry.users += 1;
    if (u.role === 'creator' || u.role === 'both') entry.creators += 1;
    map.set(c.code, entry);
  }
  const total = users.length || 1;
  return [...map.values()]
    .map((c) => ({ ...c, percent: Math.round((c.users / total) * 1000) / 10 }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 10);
}

function buildRoles(users: User[], t: TranslationSchema): RoleSlice[] {
  const counts = { reader: 0, creator: 0, both: 0, supervisor: 0 };
  for (const u of users) {
    const r = u.role ?? 'reader';
    if (r in counts) counts[r as keyof typeof counts] += 1;
  }
  return [
    { id: 'reader', label: pluralize(t, 'readers', counts.reader), value: counts.reader, color: '#f5b042' },
    { id: 'creator', label: pluralize(t, 'creators', counts.creator), value: counts.creator, color: '#4ade80' },
    { id: 'both', label: pluralize(t, 'both', counts.both), value: counts.both, color: '#a78bfa' },
    { id: 'supervisor', label: pluralize(t, 'supervisors', counts.supervisor), value: counts.supervisor, color: '#60a5fa' },
  ].filter((s) => s.value > 0);
}

function buildTopCreators(users: User[], series: Series[], mangas: Manga[]): TopCreator[] {
  const chaptersByAuthor = new Map<string, number>();
  for (const m of mangas) {
    if (!m.authorId) continue;
    chaptersByAuthor.set(m.authorId, (chaptersByAuthor.get(m.authorId) ?? 0) + (m.chapters?.length ?? 0));
  }
  const byUser = new Map<string, { series: number; reads: number }>();
  for (const s of series) {
    const entry = byUser.get(s.ownerId) ?? { series: 0, reads: 0 };
    entry.series += 1;
    entry.reads += s.reads;
    byUser.set(s.ownerId, entry);
  }
  const result: TopCreator[] = [];
  for (const u of users) {
    if (u.role !== 'creator' && u.role !== 'both') continue;
    const stats = byUser.get(u.id) ?? { series: 0, reads: 0 };
    const chapterCount = chaptersByAuthor.get(u.id) ?? 0;
    const c = normalizeCountry(u.country);
    result.push({
      id: u.id,
      name: u.penName || u.name,
      country: `${c.flag} ${c.name}`,
      series: stats.series,
      chapters: chapterCount,
      reads: stats.reads || 0,
      score: stats.series * 30 + stats.reads / 100 + chapterCount * 5,
    });
  }
  return result.sort((a, b) => b.score - a.score).slice(0, 6);
}

function buildTopReaders(users: User[], posts: CommunityPost[]): TopReader[] {
  const byUser = new Map<string, { posts: number; likes: number; comments: number }>();
  for (const p of posts) {
    const entry = byUser.get(p.authorId) ?? { posts: 0, likes: 0, comments: 0 };
    entry.posts += 1;
    entry.likes += p.likes.length;
    entry.comments += p.comments.length;
    byUser.set(p.authorId, entry);
  }
  const result: TopReader[] = [];
  for (const u of users) {
    const s = byUser.get(u.id);
    if (!s) continue;
    const c = normalizeCountry(u.country);
    result.push({
      id: u.id,
      name: u.name,
      country: `${c.flag} ${c.name}`,
      posts: s.posts,
      likes: s.likes,
      comments: s.comments,
      score: s.posts * 10 + s.likes * 2 + s.comments * 3,
    });
  }
  return result.sort((a, b) => b.score - a.score).slice(0, 6);
}

function buildWeekday(posts: CommunityPost[]): WeekdayActivity[] {
  const counts = new Array(7).fill(0);
  for (const p of posts) {
    const d = new Date(p.createdAt).getDay();
    counts[d === 0 ? 6 : d - 1] += 1;
  }
  return WEEKDAY_LABELS.map((day, i) => ({ day, value: counts[i] }));
}

function buildGenres(mangas: Manga[], series: Series[]): GenreStat[] {
  const map = new Map<string, { mangas: number; series: number }>();
  for (const m of mangas) {
    const e = map.get(m.genre) ?? { mangas: 0, series: 0 };
    e.mangas += 1;
    map.set(m.genre, e);
  }
  for (const s of series) {
    const e = map.get(s.genre) ?? { mangas: 0, series: 0 };
    e.series += 1;
    map.set(s.genre, e);
  }
  const total = [...map.values()].reduce((s, x) => s + x.mangas, 0) || 1;
  return [...map.entries()]
    .map(([genre, v]) => ({
      genre,
      mangas: v.mangas,
      series: v.series,
      percent: Math.round((v.mangas / total) * 1000) / 10,
    }))
    .sort((a, b) => b.mangas - a.mangas)
    .slice(0, 6);
}

function buildKpis(users: User[], growth: GrowthPoint[], t: TranslationSchema): KpiCard[] {
  const total = users.length;
  const creators = users.filter((u) => u.role === 'creator' || u.role === 'both').length;
  const readers = users.filter((u) => u.role === 'reader' || u.role === 'both').length;
  const supervisors = users.filter((u) => u.role === 'supervisor').length;
  const last = growth[growth.length - 1];
  const prev = growth[growth.length - 2] ?? last;
  const totalPrev = total - (last.users - prev.users);
  const growthPct = totalPrev > 0 ? Math.round(((total - totalPrev) / totalPrev) * 1000) / 10 : 0;

  return [
    { id: 'users', label: t.analytics.totalUsers, value: String(total), raw: total, trend: growthPct, trendLabel: t.analytics.vsLastMonth, accent: '#f5b042' },
    { id: 'creators', label: pluralize(t, 'creators', creators), value: String(creators), raw: creators, trend: Math.round((creators / (total || 1)) * 100), trendLabel: t.analytics.ofTotalUsers, accent: '#4ade80' },
    { id: 'readers', label: pluralize(t, 'readers', readers), value: String(readers), raw: readers, trend: Math.round((readers / (total || 1)) * 100), trendLabel: t.analytics.ofTotalUsers, accent: '#60a5fa' },
    { id: 'supervisors', label: pluralize(t, 'supervisors', supervisors), value: String(supervisors), raw: supervisors, trend: null, trendLabel: t.analytics.fullAccess, accent: '#a78bfa' },
    { id: 'active', label: t.analytics.activeUsers, value: String(last.active), raw: last.active, trend: null, trendLabel: t.analytics.publishedContent, accent: '#f472b6' },
    { id: 'new', label: t.analytics.newUsers, value: String(last.users), raw: last.users, trend: null, trendLabel: t.analytics.growthRate, accent: '#22d3ee' },
  ];
}

function buildInsights(
  users: User[],
  countries: CountryStat[],
  topCreators: TopCreator[],
  health: { score: number; openReports: number },
  t: TranslationSchema,
): string[] {
  const insights: string[] = [];
  const topCountry = countries[0];
  if (topCountry) {
    insights.push(
      `${topCountry.flag} ${topCountry.name} ${t.analytics.leadingUsers} ${topCountry.users} ${t.analytics.totalUsers.toLowerCase()} (${topCountry.percent}%).`,
    );
  }
  if (topCreators[0]) {
    insights.push(
      `${topCreators[0].name} ${t.analytics.mostActiveCreator} ${topCreators[0].series} ${t.common.series}.`,
    );
  }
  const total = users.length || 1;
  const creators = users.filter((u) => u.role === 'creator' || u.role === 'both').length;
  insights.push(`${Math.round((creators / total) * 100)}% ${t.analytics.healthyBalance}`);
  if (health.openReports === 0) {
    insights.push(`${t.analytics.noOpenReports} ${health.score}/100.`);
  } else {
    insights.push(`${health.openReports} ${t.analytics.openReports.toLowerCase()}.`);
  }
  return insights;
}

export async function getAnalyticsSnapshot(t: TranslationSchema): Promise<AnalyticsSnapshot> {
  const [users, posts, series, reports, mangas] = await Promise.all([
    getUsers(),
    getCommunityPosts(),
    getAllSeries(),
    getReports(),
    getAllMangas(),
  ]);

  const growth = buildGrowthSeries(users, posts, mangas);
  const countries = buildCountries(users);
  const roles = buildRoles(users, t);
  const topCreators = buildTopCreators(users, series, mangas);
  const topReaders = buildTopReaders(users, posts);
  const weekday = buildWeekday(posts);
  const genres = buildGenres(mangas, series);
  const kpis = buildKpis(users, growth, t);

  const openReports = reports.filter((r) => r.status === 'open').length;
  const resolvedReports = reports.filter((r) => r.status === 'resolved').length;
  const totalReports = openReports + resolvedReports;
  const resolutionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 100;
  const score = Math.max(0, 100 - openReports * 5);
  const insights = buildInsights(users, countries, topCreators, { score, openReports }, t);

  return {
    kpis,
    growth,
    countries,
    roles,
    topCreators,
    topReaders,
    weekday,
    genres,
    insights,
    health: { score, openReports, resolvedReports, resolutionRate },
  };
}