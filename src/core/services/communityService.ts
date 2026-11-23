import { supabase } from '../lib/supabase';
import { getUsers } from './userService';
import type { UserRole, User } from './userService';
import { MANGA_GENRES as CANONICAL_GENRES } from '../../config/constants/genres';

export type PostType = 'release' | 'publication' | 'poll' | 'poster';
export type RankingPeriod = 'week' | 'month' | 'year' | 'global';
/** 'all' ou le nom d'un genre (dynamique, géré par le supervisor). */
export type RankingCategory = string;

/** Repli statique ; Community.tsx construit la liste avec useGenres(). */
export const RANKING_CATEGORIES: RankingCategory[] = ['all', ...CANONICAL_GENRES];
export const RANKING_PERIODS: { id: RankingPeriod }[] = [
  { id: 'week' }, { id: 'month' }, { id: 'year' }, { id: 'global' },
];

export const MANGA_GENRES = CANONICAL_GENRES;

export interface PollOption { id: string; label: string; votes: string[]; }
export interface CommunityComment { id: string; authorId: string; authorName: string; text: string; createdAt: string; }
export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  type: PostType;
  title: string;
  content: string;
  image?: string;
  genre?: string;
  mangaId?: string;
  seriesTitle?: string;
  chapterNumber?: number;
  pollOptions?: PollOption[];
  likes: string[];
  comments: CommunityComment[];
  createdAt: string;
  auto?: boolean;
}

export interface AuthorRanking { authorId: string; authorName: string; score: number; works: number; likes: number; comments: number; }
export interface CommunityGroup { id: string; name: string; genre: string; icon: string; members: number; }
export interface CommunityEvent { id: string; title: string; host: string; date: string; location: string; }
export interface TrendingGenre { tag: string; posts: number; trend: string; }
export interface SuggestedCreator { id: string; name: string; specialty: string; works: number; }

export interface CommunityMeta {
  groups: CommunityGroup[];
  events: CommunityEvent[];
  trending: TrendingGenre[];
  suggestedCreators: SuggestedCreator[];
}

export interface CommunityUserProfile {
  id: string;
  name: string;
  username?: string;
  photo?: string;
  bio?: string;
  role?: UserRole;
  country?: string;
  residence?: string;
  postCount: number;
  likeCount: number;
  commentCount: number;
  recentPosts: CommunityPost[];
  isRegistered: boolean;
}

function mapPostRow(p: any): CommunityPost {
  let parsedPoll = p.poll_options ?? [];
  if (Array.isArray(parsedPoll) && parsedPoll.length > 0) {
    parsedPoll = parsedPoll.map((opt: any) => ({
      ...opt,
      votes: (p.votes ?? [])
        .filter((v: any) => v.option_id === opt.id)
        .map((v: any) => v.user_id),
    }));
  }

  return {
    id: p.id,
    authorId: p.author_id,
    authorName: p.author_name,
    type: p.type,
    title: p.title,
    content: p.content,
    image: p.image,
    genre: p.genre,
    mangaId: p.manga_id,
    seriesTitle: p.series_title,
    chapterNumber: p.chapter_number,
    pollOptions: parsedPoll,
    createdAt: p.created_at,
    auto: p.auto,
    likes: (p.likes ?? []).map((l: any) => l.user_id),
    comments: (p.comments ?? [])
      .map((c: any) => ({
        id: c.id,
        authorId: c.author_id,
        authorName: c.author_name,
        text: c.text,
        createdAt: c.created_at,
      }))
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  };
}

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from('community_posts')
    .select(`*, comments:post_comments(*), likes:post_likes(user_id), votes:post_poll_votes(*)`)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) console.error('[communityService] getCommunityPosts failed:', error);
  if (error || !data) return [];
  return data.map(mapPostRow);
}

export async function getCommunityMeta(posts: CommunityPost[] = []): Promise<CommunityMeta> {
  const [creatorsRes, eventsRes, groupsRes, previousPostsRes, membersRes] = await Promise.all([
    supabase.from('profiles').select('id, name, favorite_genres').in('role', ['creator', 'both']).eq('is_deleted', false).eq('is_active', true).limit(4),
    supabase.from('events').select('*').order('date', { ascending: true }).limit(6),
    supabase.from('groups').select('*').limit(6),
    supabase.from('community_posts').select('genre, created_at').gte(
      'created_at',
      new Date(Date.now() - 30 * 86400000).toISOString(),
    ),
    supabase.from('group_members').select('group_id'),
  ]);

  const memberCounts = new Map<string, number>();
  (membersRes.data || []).forEach((m: any) => {
    memberCounts.set(m.group_id, (memberCounts.get(m.group_id) || 0) + 1);
  });

  const genreCounts = new Map<string, number>();
  posts.forEach((p) => {
    if (p.genre) genreCounts.set(p.genre, (genreCounts.get(p.genre) || 0) + 1);
  });

  const previousGenreCounts = new Map<string, number>();
  (previousPostsRes.data || []).forEach((p: any) => {
    if (p.genre) previousGenreCounts.set(p.genre, (previousGenreCounts.get(p.genre) || 0) + 1);
  });

  const trending: TrendingGenre[] = Array.from(genreCounts.entries())
    .map(([tag, count]) => {
      const previous = previousGenreCounts.get(tag) ?? 0;
      const growth = previous > 0 ? Math.round(((count - previous) / previous) * 100) : 0;
      return {
        tag,
        posts: count,
        trend: growth !== 0 ? `${growth > 0 ? '+' : ''}${growth}%` : '—',
      };
    })
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 5);

  return {
    groups: (groupsRes.data || [])
      .filter((g: any) => g.visibility !== 'private')
      .map((g: any) => ({
        id: g.id,
        name: g.name,
        genre: g.genre,
        icon: g.icon,
        members: memberCounts.get(g.id) || 0,
      })),
    trending,
    events: (eventsRes.data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      host: e.host,
      date: e.date,
      location: e.location,
    })),
    suggestedCreators: (creatorsRes.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      specialty: (Array.isArray(c.favorite_genres) && c.favorite_genres[0]) || 'Creator',
      works: 0,
    })),
  };
}

export function getPostsByAuthor(authorId: string, allPosts: CommunityPost[]): CommunityPost[] {
  return allPosts.filter((p) => p.authorId === authorId);
}

export async function getCommunityUserProfile(
  authorId: string,
  fallbackName: string,
  allPosts?: CommunityPost[],
  providedUsers?: Record<string, User> | User[],
): Promise<CommunityUserProfile> {
  let userRecord: User | undefined;
  if (providedUsers) {
    if (Array.isArray(providedUsers)) userRecord = providedUsers.find((u) => u.id === authorId);
    else userRecord = providedUsers[authorId];
  } else {
    const users = await getUsers();
    userRecord = users.find((u) => u.id === authorId);
  }

  const posts = allPosts
    ? getPostsByAuthor(authorId, allPosts)
    : await getPostsByAuthorFromDb(authorId);

  let likeCount = 0;
  let commentCount = 0;
  for (const p of posts) {
    likeCount += p.likes.length;
    commentCount += p.comments.length;
  }

  return {
    id: authorId,
    name: userRecord?.name ?? fallbackName,
    username: userRecord?.username,
    photo: userRecord?.photo,
    bio: userRecord?.bio,
    role: userRecord?.role,
    country: userRecord?.country,
    residence: userRecord?.residence,
    postCount: posts.length,
    likeCount,
    commentCount,
    recentPosts: posts.slice(0, 6),
    isRegistered: Boolean(userRecord),
  };
}

async function getPostsByAuthorFromDb(authorId: string): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from('community_posts')
    .select(`*, comments:post_comments(*), likes:post_likes(user_id), votes:post_poll_votes(*)`)
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data.map(mapPostRow);
}

export async function createAutoReleasePost(
  author: { id: string; name: string },
  payload: {
    mangaId: string;
    seriesTitle: string;
    genre?: string;
    chapterNumber: number;
    chapterTitle: string;
    summary?: string;
  },
): Promise<CommunityPost | null> {
  const content =
    payload.summary?.trim() ||
    `Chapter ${payload.chapterNumber} — "${payload.chapterTitle}" is now live.`;

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      author_id: author.id,
      author_name: author.name,
      type: 'release',
      title: `${payload.seriesTitle} — Chapter ${payload.chapterNumber}`,
      content,
      genre: payload.genre,
      manga_id: payload.mangaId,
      series_title: payload.seriesTitle,
      chapter_number: payload.chapterNumber,
      auto: true,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[communityService] createAutoReleasePost failed:', error);
    return null;
  }
  return mapPostRow({ ...data, likes: [], comments: [], votes: [] });
}

export async function createPost(
  author: { id: string; name: string },
  payload: Omit<CommunityPost, 'id' | 'createdAt' | 'likes' | 'comments' | 'authorId' | 'authorName'>,
): Promise<CommunityPost> {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      author_id: author.id,
      author_name: author.name,
      type: payload.type,
      title: payload.title,
      content: payload.content,
      image: payload.image,
      genre: payload.genre,
      manga_id: payload.mangaId,
      series_title: payload.seriesTitle,
      chapter_number: payload.chapterNumber,
      poll_options: payload.pollOptions,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[communityService] createPost failed:', error);
    throw new Error(
      error?.code === '42501'
        ? 'You are not allowed to publish. Please sign in again.'
        : 'Failed to create post',
    );
  }
  return mapPostRow({ ...data, likes: [], comments: [], votes: [] });
}

export async function deletePost(postId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', userId);
  if (error) console.error('[communityService] deletePost failed:', error);
  return !error;
}

export async function toggleLike(postId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  const { error } = data
    ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
    : await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
  // 23505 = like déjà présent (double clic) : l'état voulu est atteint.
  if (error && error.code !== '23505') {
    console.error('[communityService] toggleLike failed:', error);
    return false;
  }
  return true;
}

export async function addComment(
  postId: string,
  comment: { authorId: string; authorName: string; text: string },
): Promise<boolean> {
  const text = comment.text.trim();
  if (!text) return false;
  const { error } = await supabase.from('post_comments').insert({
    post_id: postId,
    author_id: comment.authorId,
    author_name: comment.authorName,
    text,
  });
  if (error) console.error('[communityService] addComment failed:', error);
  return !error;
}

export async function deleteComment(
  postId: string,
  commentId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('post_comments')
    .select('author_id')
    .eq('id', commentId)
    .single();
  const { data: post } = await supabase
    .from('community_posts')
    .select('author_id')
    .eq('id', postId)
    .single();

  if (!data || !post) return false;
  if (data.author_id !== userId && post.author_id !== userId) return false;

  const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
  if (error) console.error('[communityService] deleteComment failed:', error);
  return !error;
}

export async function votePoll(postId: string, optionId: string, userId: string): Promise<boolean> {
  const { error: delError } = await supabase
    .from('post_poll_votes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (delError) {
    console.error('[communityService] votePoll (clear) failed:', delError);
    return false;
  }
  const { error } = await supabase.from('post_poll_votes').insert({
    post_id: postId,
    option_id: optionId,
    user_id: userId,
  });
  if (error) console.error('[communityService] votePoll failed:', error);
  return !error;
}

function periodStart(period: RankingPeriod): number {
  const now = Date.now();
  switch (period) {
    case 'week': return now - 7 * 86400000;
    case 'month': return now - 30 * 86400000;
    case 'year': return now - 365 * 86400000;
    case 'global': return 0;
  }
}

export async function getRankings(
  period: RankingPeriod,
  category: RankingCategory,
  allPosts?: CommunityPost[],
): Promise<AuthorRanking[]> {
  const posts = allPosts || (await getCommunityPosts());
  const since = periodStart(period);
  const filtered = posts.filter(
    (p) =>
      new Date(p.createdAt).getTime() >= since &&
      (category === 'all' || p.genre === category),
  );
  const map = new Map<string, AuthorRanking>();

  for (const p of filtered) {
    const existing = map.get(p.authorId) ?? {
      authorId: p.authorId,
      authorName: p.authorName,
      score: 0,
      works: 0,
      likes: 0,
      comments: 0,
    };
    existing.works += 1;
    existing.likes += p.likes.length;
    existing.comments += p.comments.length;
    existing.score += p.likes.length * 1 + p.comments.length * 3;
    map.set(p.authorId, existing);
  }
  return [...map.values()].sort((a, b) => b.score - a.score);
}

export async function getUserStats(
  userId: string,
  allPosts?: CommunityPost[],
): Promise<{ posts: number; likes: number }> {
  const posts = allPosts ? getPostsByAuthor(userId, allPosts) : await getPostsByAuthorFromDb(userId);
  return { posts: posts.length, likes: posts.reduce((sum, p) => sum + p.likes.length, 0) };
}