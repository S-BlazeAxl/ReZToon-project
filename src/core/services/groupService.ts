import { supabase } from '../lib/supabase';

export type GroupMemberRole = 'owner' | 'admin' | 'member';
export type GroupVisibility = 'public' | 'private';

export interface GroupMember {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: GroupMemberRole;
  joinedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  genre: string;
  icon: string;
  color: string;
  visibility: GroupVisibility;
  ownerId: string;
  ownerName: string;
  members: GroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupInput {
  name: string;
  description: string;
  genre: string;
  icon: string;
  color: string;
  visibility: GroupVisibility;
}

export interface CreateGroupResult {
  success: boolean;
  message: string;
  group?: Group;
}

function mapGroup(g: any, members: any[]): Group {
  return {
    id: g.id,
    name: g.name,
    description: g.description ?? '',
    genre: g.genre ?? '',
    icon: g.icon ?? 'Users',
    color: g.color ?? '#f5b042',
    visibility: g.visibility as GroupVisibility,
    ownerId: g.owner_id,
    ownerName: g.owner_name,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
    members: members.map((m: any) => ({
      userId: m.user_id,
      userName: m.user_name,
      userAvatar: m.user_avatar,
      role: m.role as GroupMemberRole,
      joinedAt: m.joined_at,
    })),
  };
}

export async function getAllGroups(): Promise<Group[]> {
  const { data: groups, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
  if (error || !groups) return [];

  const { data: members } = await supabase.from('group_members').select('*');

  return groups.map((g: any) => {
    const groupMembers = (members || []).filter((m: any) => m.group_id === g.id);
    return mapGroup(g, groupMembers);
  });
}

export async function getPublicGroups(): Promise<Group[]> {
  const all = await getAllGroups();
  return all.filter((g) => g.visibility === 'public');
}

export async function getGroupById(id: string): Promise<Group | null> {
  const { data: group, error } = await supabase.from('groups').select('*').eq('id', id).maybeSingle();
  if (error || !group) return null;

  const { data: members } = await supabase.from('group_members').select('*').eq('group_id', id);
  return mapGroup(group, members || []);
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (!memberships || memberships.length === 0) return [];

  const groupIds = memberships.map((m: any) => m.group_id);

  const { data: groups } = await supabase.from('groups').select('*').in('id', groupIds);
  if (!groups || groups.length === 0) return [];

  const { data: allMembers } = await supabase.from('group_members').select('*').in('group_id', groupIds);

  const membersByGroup = new Map<string, any[]>();
  (allMembers || []).forEach((m: any) => {
    const arr = membersByGroup.get(m.group_id) ?? [];
    arr.push(m);
    membersByGroup.set(m.group_id, arr);
  });

  return groups.map((g) => mapGroup(g, membersByGroup.get(g.id) || []));
}

export async function getSuggestedGroups(userId: string, limit = 6): Promise<Group[]> {
  const userGroups = new Set((await getUserGroups(userId)).map((g) => g.id));
  return (await getPublicGroups())
    .filter((g) => !userGroups.has(g.id))
    .sort((a, b) => b.members.length - a.members.length)
    .slice(0, limit);
}

export async function createGroup(
  owner: { id: string; name: string; avatar?: string },
  input: CreateGroupInput,
): Promise<CreateGroupResult> {
  const name = input.name.trim();
  if (!name) return { success: false, message: 'Group name is required.' };

  const { data: existing } = await supabase.from('groups').select('id').ilike('name', name).maybeSingle();
  if (existing) return { success: false, message: 'A group with this name already exists.' };

  const { data, error } = await supabase
    .from('groups')
    .insert({
      name,
      description: input.description.trim(),
      genre: input.genre,
      icon: input.icon,
      color: input.color,
      visibility: input.visibility,
      owner_id: owner.id,
      owner_name: owner.name,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[groupService] createGroup failed:', error);
    return {
      success: false,
      message:
        error?.code === '42501'
          ? 'You are not allowed to create a group. Please sign in again.'
          : error?.message || 'Failed to create group.',
    };
  }

  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: data.id,
    user_id: owner.id,
    user_name: owner.name,
    user_avatar: owner.avatar,
    role: 'owner',
  });
  if (memberError) {
    console.error('[groupService] owner membership failed:', memberError);
    // Évite un groupe orphelin sans propriétaire membre.
    await supabase.from('groups').delete().eq('id', data.id);
    return { success: false, message: memberError.message || 'Failed to create group.' };
  }

  const created = await getGroupById(data.id);
  return { success: true, message: `Group "${name}" created.`, group: created || undefined };
}

export async function joinGroup(
  groupId: string,
  user: { id: string; name: string; avatar?: string },
): Promise<boolean> {
  const group = await getGroupById(groupId);
  if (!group || group.visibility === 'private') return false;
  if (group.members.some((m) => m.userId === user.id)) return true;

  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: user.id,
    user_name: user.name,
    user_avatar: user.avatar,
    role: 'member',
  });

  if (error && error.code !== '23505') {
    console.error('[groupService] joinGroup failed:', error);
    return false;
  }
  return true;
}

export async function leaveGroup(groupId: string, userId: string): Promise<boolean> {
  const group = await getGroupById(groupId);
  if (!group) return false;
  if (group.ownerId === userId) return false;

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  return !error;
}

export async function deleteGroup(groupId: string, actorId: string): Promise<boolean> {
  const group = await getGroupById(groupId);
  if (!group || group.ownerId !== actorId) return false;
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  return !error;
}

export async function updateGroup(
  groupId: string,
  actorId: string,
  updates: Partial<Pick<Group, 'name' | 'description' | 'visibility' | 'icon' | 'color'>>,
): Promise<Group | null> {
  const group = await getGroupById(groupId);
  if (!group) return null;

  const actor = group.members.find((m) => m.userId === actorId);
  if (!actor || (actor.role !== 'owner' && actor.role !== 'admin')) return null;

  const dbUpdates: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.visibility !== undefined) dbUpdates.visibility = updates.visibility;
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
  if (updates.color !== undefined) dbUpdates.color = updates.color;

  const { error } = await supabase.from('groups').update(dbUpdates).eq('id', groupId);
  if (error) return null;
  return getGroupById(groupId);
}

export async function updateMemberRole(
  groupId: string,
  actorId: string,
  memberId: string,
  role: GroupMemberRole,
): Promise<boolean> {
  const group = await getGroupById(groupId);
  if (!group) return false;

  const actor = group.members.find((m) => m.userId === actorId);
  if (!actor || (actor.role !== 'owner' && actor.role !== 'admin')) return false;
  if (memberId === group.ownerId) return false;

  const { error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', memberId);
  return !error;
}

export async function kickMember(
  groupId: string,
  actorId: string,
  memberId: string,
): Promise<boolean> {
  const group = await getGroupById(groupId);
  if (!group) return false;

  const actor = group.members.find((m) => m.userId === actorId);
  if (!actor || (actor.role !== 'owner' && actor.role !== 'admin')) return false;
  if (memberId === group.ownerId) return false;

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', memberId);
  return !error;
}