import { supabase } from '../lib/supabase';

export interface AwardEdition {
  year: number;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  ceremonyDate: string;
  nominationsPerCategory: number;
  totalNominees: number;
}

export interface AwardCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  genre: string;
}

export interface AwardNominee {
  id: string;
  categoryId: string;
  mangaTitle: string;
  mangaSubtitle: string;
  authorName: string;
  authorId: string;
  cover: string;
  genre: string;
  tag: string;
  reads: number;
  rating: number;
  likes: number;
}

export interface AwardNomination extends AwardNominee {
  votes: number;
  rank: number;
  percent: number;
}

export interface PastEdition {
  year: number;
  theme: string;
  winners: { categoryId: string; mangaTitle: string; authorName: string }[];
}

function mapEditionRow(data: any): AwardEdition {
  return {
    year: data.year,
    name: data.name,
    theme: data.theme,
    startDate: data.start_date,
    endDate: data.end_date,
    ceremonyDate: data.ceremony_date,
    nominationsPerCategory: data.nominations_per_category,
    totalNominees: data.total_nominees,
  };
}

export async function getEdition(): Promise<AwardEdition | null> {
  const { data } = await supabase
    .from('award_editions')
    .select('*')
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapEditionRow(data) : null;
}

export async function getActiveEdition(): Promise<AwardEdition | null> {
  const now = new Date().toISOString();

  const { data: active } = await supabase
    .from('award_editions')
    .select('*')
    .lte('start_date', now)
    .gte('end_date', now)
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) return mapEditionRow(active);

  const { data: upcoming } = await supabase
    .from('award_editions')
    .select('*')
    .gt('start_date', now)
    .order('start_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (upcoming) return mapEditionRow(upcoming);

  const { data: latest } = await supabase
    .from('award_editions')
    .select('*')
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle();

  return latest ? mapEditionRow(latest) : null;
}

export async function getCategories(): Promise<AwardCategory[]> {
  const { data } = await supabase.from('award_categories').select('*');
  if (!data) return [];

  return data.map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    icon: c.icon,
    color: c.color,
    genre: c.genre,
  }));
}

export async function getPastEditions(): Promise<PastEdition[]> {
  const { data } = await supabase
    .from('past_award_editions')
    .select('*')
    .order('year', { ascending: false });
  if (!data) return [];
  return data.map((d) => ({ year: d.year, theme: d.theme, winners: d.winners || [] }));
}

/** Totaux de votes par nominé (RPC SECURITY DEFINER : award_votes n'est lisible que par son auteur). */
async function fetchVoteCounts(categoryId: string | null): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('award_vote_counts', { p_category_id: categoryId });
  if (error) {
    console.error('[awardsService] award_vote_counts failed:', error.message);
    return new Map();
  }
  return new Map((data ?? []).map((r: any) => [r.nominee_id as string, Number(r.votes)]));
}

function voteErrorMessage(message: string | undefined): string {
  const m = (message || '').toLowerCase();
  if (m.includes('closed')) return 'Voting is closed for this edition.';
  if (m.includes('own series')) return 'You cannot vote for your own series.';
  if (m.includes('signed in') || m.includes('cannot vote')) return 'You must be signed in to vote.';
  return 'Failed to record vote.';
}

export async function getCategoryLeaderboard(categoryId: string): Promise<AwardNomination[]> {
  const { data: nominees, error } = await supabase
    .from('award_nominees')
    .select('*')
    .eq('category_id', categoryId);

  if (error || !nominees || nominees.length === 0) return [];
  const counts = await fetchVoteCounts(categoryId);

  const formatted = nominees.map((n: any) => ({
    id: n.id,
    categoryId: n.category_id,
    mangaTitle: n.manga_title,
    mangaSubtitle: n.manga_subtitle,
    authorName: n.author_name,
    authorId: n.author_id,
    cover: n.cover,
    genre: n.genre,
    tag: n.tag,
    reads: n.reads,
    rating: Number(n.rating),
    likes: n.likes,
    votes: counts.get(n.id) ?? 0,
  }));

  const totalVotes = formatted.reduce((sum, item) => sum + item.votes, 0);

  return formatted
    .map((n) => ({
      ...n,
      rank: 0,
      percent: totalVotes > 0 ? (n.votes / totalVotes) * 100 : 0,
    }))
    .sort((a, b) => b.votes - a.votes)
    .map((n, i) => ({ ...n, rank: i + 1 }));
}

export async function getUserVoteForCategory(
  userId: string,
  categoryId: string,
): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id || session.user.id !== userId) return null;

  const { data: nominees } = await supabase
    .from('award_nominees')
    .select('id')
    .eq('category_id', categoryId);
  if (!nominees || nominees.length === 0) return null;

  const { data: vote } = await supabase
    .from('award_votes')
    .select('nominee_id')
    .eq('user_id', session.user.id)
    .in('nominee_id', nominees.map((n) => n.id))
    .maybeSingle();

  return vote ? vote.nominee_id : null;
}

export async function castVote(
  userId: string,
  nomineeId: string,
  categoryId: string,
): Promise<{ success: boolean; message: string }> {
  const { data: nominee } = await supabase
    .from('award_nominees')
    .select('manga_title')
    .eq('id', nomineeId)
    .single();
  if (!nominee) return { success: false, message: 'Nominee not found.' };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return { success: false, message: 'You must be signed in to vote.' };
  if (session.user.id !== userId) return { success: false, message: 'Invalid session.' };

  const { error } = await supabase.rpc('cast_award_vote', {
    p_nominee_id: nomineeId,
    p_category_id: categoryId,
  });

  if (error) {
    console.error('[awardsService] cast_award_vote failed:', error.message);
    return { success: false, message: voteErrorMessage(error.message) };
  }

  return { success: true, message: `Vote for "${nominee.manga_title}" recorded!` };
}

export async function getTotalVotesForCategory(categoryId: string): Promise<number> {
  const leaderboard = await getCategoryLeaderboard(categoryId);
  return leaderboard.reduce((s, n) => s + n.votes, 0);
}

export async function getTotalVotes(): Promise<number> {
  const { data, error } = await supabase.rpc('get_total_award_votes');

  if (!error && data !== null && data !== undefined) {
    return typeof data === 'number' ? data : Number(data);
  }

  const { count } = await supabase
    .from('award_votes')
    .select('*', { count: 'exact', head: true });
  return count || 0;
}

export async function getEditionStatus(): Promise<'upcoming' | 'open' | 'closed' | 'none'> {
  const edition = await getActiveEdition();
  if (!edition) return 'none';

  const now = Date.now();
  const start = new Date(edition.startDate).getTime();
  const end = new Date(edition.endDate).getTime();

  if (now < start) return 'upcoming';
  if (now > end) return 'closed';
  return 'open';
}

export async function getTimeRemaining(): Promise<{
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOver: boolean;
}> {
  const edition = await getActiveEdition();
  if (!edition) return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };

  const end = new Date(edition.endDate).getTime();
  const diff = end - Date.now();

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    isOver: false,
  };
}

export async function getTrendingNominees(limit = 6): Promise<AwardNomination[]> {
  const { data: nominees, error } = await supabase
    .from('award_nominees')
    .select('*');

  if (error || !nominees) return [];
  const counts = await fetchVoteCounts(null);

  const formatted = nominees.map((n: any) => ({
    id: n.id,
    categoryId: n.category_id,
    mangaTitle: n.manga_title,
    mangaSubtitle: n.manga_subtitle,
    authorName: n.author_name,
    authorId: n.author_id,
    cover: n.cover,
    genre: n.genre,
    tag: n.tag,
    reads: n.reads,
    rating: Number(n.rating),
    likes: n.likes,
    votes: counts.get(n.id) ?? 0,
  }));

  const topPerCategory = new Map<string, any>();
  for (const n of formatted) {
    const current = topPerCategory.get(n.categoryId);
    if (!current || n.votes > current.votes) {
      topPerCategory.set(n.categoryId, n);
    }
  }

  return Array.from(topPerCategory.values())
    .sort((a, b) => b.votes - a.votes)
    .slice(0, limit)
    .map((n) => ({
      ...n,
      rank: 0,
      percent: 0,
    }));
}