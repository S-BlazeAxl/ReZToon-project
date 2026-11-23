import { supabase } from '../lib/supabase';

export type FollowTargetType = 'creator' | 'manga';

export interface FollowRecord {
  targetId: string;
  targetType: FollowTargetType;
  followedAt: string;
}

export async function getFollowing(userId: string): Promise<FollowRecord[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('target_id, target_type, created_at')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching following:", error.message);
    return [];
  }
  
  return (data || []).map((r: any) => ({
    targetId: r.target_id,
    targetType: r.target_type as FollowTargetType,
    followedAt: r.created_at,
  }));
}

export async function getFollowingIds(
  userId: string,
  type?: FollowTargetType,
): Promise<string[]> {
  const records = await getFollowing(userId);
  return (type ? records.filter((f) => f.targetType === type) : records).map(
    (f) => f.targetId,
  );
}

export async function isFollowing(
  userId: string,
  targetId: string,
  type: FollowTargetType,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', userId)
    .eq('target_id', targetId)
    .eq('target_type', type)
    .maybeSingle();
    
  if (error) return false;
  return !!data;
}

export async function follow(
  userId: string,
  targetId: string,
  type: FollowTargetType,
): Promise<boolean> {
  if (userId === targetId) return false;
  
  const { error } = await supabase.from('follows').insert({
    follower_id: userId,
    target_id: targetId,
    target_type: type,
  });
  
  if (error) {
    if (error.code === '23505') return true; // Already following
    console.error('[followService] follow failed:', error.code, error.message);
    return false;
  }
  return true;
}

export async function unfollow(
  userId: string,
  targetId: string,
  type: FollowTargetType,
): Promise<boolean> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('target_id', targetId)
    .eq('target_type', type);
    
  if (error) {
    console.error('[followService] unfollow failed:', error);
    return false;
  }
  return true;
}

export async function toggleFollow(
  userId: string,
  targetId: string,
  type: FollowTargetType,
): Promise<boolean> {
  if (userId === targetId) throw new Error('Cannot follow yourself');
  
  const currently = await isFollowing(userId, targetId, type);
  
  if (currently) {
    const success = await unfollow(userId, targetId, type);
    if (!success) throw new Error('Failed to unfollow');
    return false;
  } else {
    const success = await follow(userId, targetId, type);
    if (!success) throw new Error('Failed to follow');
    return true;
  }
}

export async function getFollowingCount(userId: string): Promise<{
  creators: number;
  mangas: number;
  total: number;
}> {
  const [creatorsRes, mangasRes] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId).eq('target_type', 'creator'),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId).eq('target_type', 'manga'),
  ]);

  const creators = creatorsRes.count || 0;
  const mangas = mangasRes.count || 0;

  return { creators, mangas, total: creators + mangas };
}

export async function getFollowedMangaIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('target_id')
    .eq('follower_id', userId)
    .eq('target_type', 'manga')
    .order('created_at', { ascending: false });
    
  if (error) return [];
  return (data || []).map((r: any) => r.target_id);
}

export async function getFollowedCreatorIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('target_id')
    .eq('follower_id', userId)
    .eq('target_type', 'creator')
    .order('created_at', { ascending: false });
    
  if (error) return [];
  return (data || []).map((r: any) => r.target_id);
}