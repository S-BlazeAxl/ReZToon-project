﻿import { supabase } from '../lib/supabase';

export type NotificationType =
  | 'release' | 'follow' | 'comment' | 'like' | 'system'
  | 'message' | 'group' | 'review' | 'award';
export type MessageLabel = 'inbox' | 'starred' | 'trade' | 'collab' | 'archive' | 'spam';
export type ConversationType = 'dm' | 'group';

export const MESSAGE_LABELS: { id: MessageLabel; label: string; icon: string }[] = [
  { id: 'inbox', label: 'Inbox', icon: 'Inbox' },
  { id: 'starred', label: 'Starred', icon: 'Star' },
  { id: 'trade', label: 'Trade', icon: 'BookOpen' },
  { id: 'collab', label: 'Collab', icon: 'Users' },
  { id: 'archive', label: 'Archive', icon: 'Archive' },
  { id: 'spam', label: 'Spam', icon: 'AlertTriangle' },
];

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  read: boolean;
  /** Clé d'évènement (ex. 'manga_liked') : sert au rendu localisé ; absente pour les anciennes notifications. */
  event: string | null;
  actorId: string | null;
  actorName: string | null;
  actorPhoto: string | null;
  /** Route interne ouverte au clic. */
  link: string | null;
  entityType: string | null;
  entityId: string | null;
  entityTitle: string | null;
  /** Nombre d'actions regroupées dans cette notification ("A et 3 autres ..."). */
  count: number;
  meta: Record<string, unknown>;
}

export interface MessageAttachment {
  id: string;
  type: 'manga' | 'chapter' | 'image' | 'voice';
  mangaId?: string;
  chapterNumber?: number;
  imageData?: string;
  imageName?: string;
  imageSize?: number;
  audioData?: string;
  audioMimeType?: string;
  duration?: number;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  receiverId?: string;
  groupId?: string;
  conversationType?: ConversationType;
  text: string;
  date: string;
  read: boolean;
  readBy?: string[];
  delivered: boolean;
  replyToId?: string;
  attachments?: MessageAttachment[];
  reactions: MessageReaction[];
  edited?: boolean;
  editedAt?: string;
  isOptimistic?: boolean;
}

export interface Conversation {
  userId: string;
  userName: string;
  userPhoto?: string;
  lastMessage: string;
  lastDate: string;
  unread: number;
  pinned: boolean;
  muted: boolean;
  starred: boolean;
  archived: boolean;
  spam: boolean;
  labels: MessageLabel[];
  pinnedMessageIds: string[];
  readMessageIds: string[];
  online?: boolean;
}

interface MetaRow {
  id: string;
  user_id: string;
  other_id: string;
  is_group: boolean;
  starred: boolean;
  archived: boolean;
  muted: boolean;
  pinned: boolean;
  spam: boolean;
  labels: MessageLabel[];
  pinned_message_ids: string[];
  read_message_ids: string[];
  hidden_at: string | null;
}

export function initMessagingStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!localStorage.getItem('reztoon_messages')) {
      localStorage.setItem('reztoon_messages', '[]');
    }
  } catch {
    /* ignore */
  }
}

export function mapMessageRow(r: any): Message {
  return {
    id: r.id,
    senderId: r.sender_id,
    senderName: r.sender_name ?? undefined,
    receiverId: r.receiver_id ?? undefined,
    groupId: r.group_id ?? undefined,
    conversationType: r.conversation_type ?? (r.group_id ? 'group' : 'dm'),
    text: r.text ?? '',
    date: r.date ?? new Date().toISOString(),
    read: Boolean(r.read),
    readBy: Array.isArray(r.read_by) ? r.read_by : [],
    delivered: Boolean(r.delivered ?? true),
    replyToId: r.reply_to_id ?? undefined,
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    reactions: Array.isArray(r.reactions) ? r.reactions : [],
    edited: Boolean(r.edited),
    editedAt: r.edited_at ?? undefined,
  };
}

function defaultMeta(userId: string, otherId: string, isGroup = false): MetaRow {
  return {
    id: '',
    user_id: userId,
    other_id: otherId,
    is_group: isGroup,
    starred: false,
    archived: false,
    muted: false,
    pinned: false,
    spam: false,
    labels: ['inbox'],
    pinned_message_ids: [],
    read_message_ids: [],
    hidden_at: null,
  };
}

async function fetchMeta(userId: string, otherId: string, isGroup = false): Promise<MetaRow | null> {
  const { data } = await supabase
    .from('conversation_meta')
    .select('*')
    .eq('user_id', userId)
    .eq('other_id', otherId)
    .eq('is_group', isGroup)
    .maybeSingle();
  return (data as MetaRow) ?? null;
}

export async function ensureMeta(userId: string, otherId: string, isGroup = false): Promise<MetaRow> {
  const existing = await fetchMeta(userId, otherId, isGroup);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('conversation_meta')
    .insert({
      user_id: userId,
      other_id: otherId,
      is_group: isGroup,
      labels: ['inbox'],
      pinned_message_ids: [],
      read_message_ids: [],
    })
    .select()
    .single();

  if (error || !data) return defaultMeta(userId, otherId, isGroup);
  return data as MetaRow;
}

async function patchMeta(
  userId: string,
  otherId: string,
  isGroup: boolean,
  patch: Partial<MetaRow>,
): Promise<void> {
  await ensureMeta(userId, otherId, isGroup);
  await supabase
    .from('conversation_meta')
    .update(patch)
    .eq('user_id', userId)
    .eq('other_id', otherId)
    .eq('is_group', isGroup);
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_type', 'dm')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('date', { ascending: false })
    .limit(500);

  if (error || !messages) return [];

  const partnerIds = new Set<string>();
  const lastByPartner = new Map<string, any>();
  const unreadByPartner = new Map<string, number>();

  for (const m of messages) {
    const partnerId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    if (!partnerId) continue;
    partnerIds.add(partnerId);
    if (!lastByPartner.has(partnerId)) lastByPartner.set(partnerId, m);
    if (m.receiver_id === userId && m.read === false) {
      unreadByPartner.set(partnerId, (unreadByPartner.get(partnerId) || 0) + 1);
    }
  }

  if (partnerIds.size === 0) return [];

  const [profilesRes, metasRes] = await Promise.all([
    supabase.from('profiles').select('id, name, photo').in('id', Array.from(partnerIds)),
    supabase.from('conversation_meta').select('*').eq('user_id', userId).eq('is_group', false).in('other_id', Array.from(partnerIds)),
  ]);

  const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
  const metaMap = new Map((metasRes.data || []).map((m: any) => [m.other_id, m]));

  const conversations: Conversation[] = [];
  for (const partnerId of partnerIds) {
    const last = lastByPartner.get(partnerId);
    const profile = profileMap.get(partnerId);
    const meta = metaMap.get(partnerId) as MetaRow | undefined;

    if (meta?.hidden_at) continue;

    conversations.push({
      userId: partnerId,
      userName: profile?.name ?? 'Unknown',
      userPhoto: profile?.photo,
      lastMessage: last?.text ?? '',
      lastDate: last?.date ?? new Date().toISOString(),
      unread: unreadByPartner.get(partnerId) || 0,
      pinned: meta?.pinned ?? false,
      muted: meta?.muted ?? false,
      starred: meta?.starred ?? false,
      archived: meta?.archived ?? false,
      spam: meta?.spam ?? false,
      labels: (meta?.labels ?? ['inbox']) as MessageLabel[],
      pinnedMessageIds: meta?.pinned_message_ids ?? [],
      readMessageIds: meta?.read_message_ids ?? [],
    });
  }

  return conversations.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
}

export async function getMessagesBetween(userId: string, otherId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_type', 'dm')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
    .order('date', { ascending: true });
  if (error || !data) return [];
  return data.map(mapMessageRow);
}

export async function getGroupMessages(groupId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_type', 'group')
    .eq('group_id', groupId)
    .order('date', { ascending: true });
  if (error || !data) return [];
  return data.map(mapMessageRow);
}

export async function sendMessage(
  userId: string,
  otherId: string,
  text: string,
  options?: { replyToId?: string; attachments?: MessageAttachment[] },
): Promise<Message | null> {
  const trimmed = text.trim();
  if (!trimmed && (!options?.attachments || options.attachments.length === 0)) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: userId,
      receiver_id: otherId,
      conversation_type: 'dm',
      text: trimmed,
      reply_to_id: options?.replyToId ?? null,
      attachments: options?.attachments ?? [],
      delivered: true,
    })
    .select()
    .single();

  if (error || !data) return null;
  await ensureMeta(userId, otherId, false);
  return mapMessageRow(data);
}

export async function sendGroupMessage(
  user: { id: string; name: string },
  groupId: string,
  text: string,
  options?: { replyToId?: string; attachments?: MessageAttachment[] },
): Promise<Message | null> {
  const trimmed = text.trim();
  if (!trimmed && (!options?.attachments || options.attachments.length === 0)) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: user.id,
      sender_name: user.name,
      group_id: groupId,
      conversation_type: 'group',
      text: trimmed,
      reply_to_id: options?.replyToId ?? null,
      attachments: options?.attachments ?? [],
      delivered: true,
      // L'auteur a lu son propre message : sinon il compte comme "non lu" pour lui-même.
      read_by: [user.id],
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[messageService] sendGroupMessage failed:', error?.code, error?.message);
    return null;
  }
  return mapMessageRow(data);
}

export async function editMessage(messageId: string, userId: string, text: string): Promise<boolean> {
  const { error } = await supabase
    .from('messages')
    .update({ text: text.trim(), edited: true, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', userId);
  return !error;
}

export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', userId);
  return !error;
}

export async function markConversationAsRead(userId: string, otherId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('receiver_id', userId)
    .eq('sender_id', otherId)
    .eq('read', false);

  // Lire la conversation efface aussi la notification "X vous a envoyé un message".
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('dedupe_key', `dm:${otherId}`)
    .eq('read', false);
}

export async function markGroupAsRead(userId: string, groupId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_group_read', { uid: userId, gid: groupId });
  if (error) {
    // PGRST202 / 404 = fonction absente : appliquer supabase/migrations/20261121_group_messaging.sql
    console.warn('[messageService] mark_group_read failed:', error.code, error.message);
  }
}

export async function deleteConversation(userId: string, otherId: string): Promise<boolean> {
  const { error } = await supabase
    .from('conversation_meta')
    .update({ hidden_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('other_id', otherId)
    .eq('is_group', false);
  return !error;
}

export async function deleteConversations(userId: string, otherIds: string[]): Promise<number> {
  if (otherIds.length === 0) return 0;
  const { error } = await supabase
    .from('conversation_meta')
    .update({ hidden_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('other_id', otherIds)
    .eq('is_group', false);
  return error ? 0 : otherIds.length;
}

export async function toggleStar(userId: string, otherId: string, isGroup = false): Promise<void> {
  const meta = await ensureMeta(userId, otherId, isGroup);
  await patchMeta(userId, otherId, isGroup, { starred: !meta.starred });
}

export async function toggleArchive(userId: string, otherId: string, isGroup = false): Promise<void> {
  const meta = await ensureMeta(userId, otherId, isGroup);
  const nextArchived = !meta.archived;
  await patchMeta(userId, otherId, isGroup, {
    archived: nextArchived,
    labels: nextArchived ? ['archive'] : ['inbox'],
  });
}

export async function toggleMute(userId: string, otherId: string, isGroup = false): Promise<void> {
  const meta = await ensureMeta(userId, otherId, isGroup);
  await patchMeta(userId, otherId, isGroup, { muted: !meta.muted });
}

export async function togglePin(userId: string, otherId: string, isGroup = false): Promise<void> {
  const meta = await ensureMeta(userId, otherId, isGroup);
  await patchMeta(userId, otherId, isGroup, { pinned: !meta.pinned });
}

export async function toggleSpam(userId: string, otherId: string): Promise<void> {
  const meta = await ensureMeta(userId, otherId, false);
  await patchMeta(userId, otherId, false, { spam: !meta.spam });
}

export async function toggleLabel(
  userId: string,
  otherId: string,
  label: MessageLabel,
): Promise<void> {
  const meta = await ensureMeta(userId, otherId, false);
  const current = meta.labels ?? ['inbox'];
  const next = current.includes(label)
    ? current.filter((l) => l !== label)
    : [...current, label];
  await patchMeta(userId, otherId, false, { labels: next });
}

export async function toggleMessagePin(
  userId: string,
  otherId: string,
  messageId: string,
): Promise<void> {
  const meta = await ensureMeta(userId, otherId, false);
  const current = meta.pinned_message_ids ?? [];
  const next = current.includes(messageId)
    ? current.filter((id) => id !== messageId)
    : [...current, messageId];
  await patchMeta(userId, otherId, false, { pinned_message_ids: next });
}

export async function toggleReaction(
  messageId: string,
  emoji: string,
  user: { id: string; name: string },
): Promise<void> {
  const { data } = await supabase
    .from('messages')
    .select('reactions')
    .eq('id', messageId)
    .maybeSingle();
  if (!data) return;

  const reactions: MessageReaction[] = Array.isArray(data.reactions) ? data.reactions : [];
  const existingIndex = reactions.findIndex((r) => r.userId === user.id && r.emoji === emoji);
  let next: MessageReaction[];

  if (existingIndex >= 0) {
    next = reactions.filter((_, i) => i !== existingIndex);
  } else {
    next = [...reactions.filter((r) => r.userId !== user.id), { emoji, userId: user.id, userName: user.name }];
  }

  await supabase.from('messages').update({ reactions: next }).eq('id', messageId);
}

export async function isMessageReadByUser(_otherId: string, messageId: string): Promise<boolean> {
  const { data } = await supabase
    .from('messages')
    .select('read, read_by')
    .eq('id', messageId)
    .maybeSingle();
  if (!data) return false;
  return Boolean(data.read) || (Array.isArray(data.read_by) && data.read_by.length > 0);
}

export async function markMessageAsReadByUser(_otherId: string, messageId: string): Promise<void> {
  await supabase.from('messages').update({ read: true }).eq('id', messageId);
}

export async function getGroupsLastMessages(
  groupIds: string[],
): Promise<Record<string, { text: string; date: string }>> {
  if (groupIds.length === 0) return {};
  const { data, error } = await supabase
    .from('messages')
    .select('group_id, text, date')
    .in('group_id', groupIds)
    .eq('conversation_type', 'group')
    .order('date', { ascending: false });
  if (error || !data) return {};

  const map: Record<string, { text: string; date: string }> = {};
  for (const row of data) {
    if (row.group_id && !map[row.group_id]) {
      map[row.group_id] = { text: row.text ?? '', date: row.date ?? new Date().toISOString() };
    }
  }
  return map;
}

export async function getGroupsUnreadCounts(
  userId: string,
  groupIds: string[],
): Promise<Record<string, number>> {
  if (groupIds.length === 0) return {};
  const { data, error } = await supabase
    .from('messages')
    .select('group_id, read_by, sender_id')
    .in('group_id', groupIds)
    .eq('conversation_type', 'group')
    .neq('sender_id', userId);
  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    if (!row.group_id) continue;
    const readBy = Array.isArray(row.read_by) ? row.read_by : [];
    if (!readBy.includes(userId)) {
      counts[row.group_id] = (counts[row.group_id] || 0) + 1;
    }
  }
  return counts;
}

export async function getGroupMeta(
  userId: string,
  groupIds: string[],
): Promise<Record<string, { archived: boolean; pinned: boolean; muted: boolean; starred: boolean }>> {
  if (groupIds.length === 0) return {};
  const { data, error } = await supabase
    .from('conversation_meta')
    .select('other_id, archived, pinned, muted, starred')
    .eq('user_id', userId)
    .eq('is_group', true)
    .in('other_id', groupIds);
  if (error || !data) return {};

  const map: Record<string, { archived: boolean; pinned: boolean; muted: boolean; starred: boolean }> = {};
  for (const row of data) {
    map[row.other_id] = {
      archived: row.archived ?? false,
      pinned: row.pinned ?? false,
      muted: row.muted ?? false,
      starred: row.starred ?? false,
    };
  }
  return map;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('read', false);
  return count ?? 0;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map((n: any) => ({
    id: n.id,
    userId: n.user_id,
    type: n.type as NotificationType,
    title: n.title,
    message: n.message ?? '',
    date: n.date,
    read: Boolean(n.read),
    event: n.event ?? null,
    actorId: n.actor_id ?? null,
    actorName: n.actor_name ?? null,
    actorPhoto: n.actor_photo ?? null,
    link: n.link ?? null,
    entityType: n.entity_type ?? null,
    entityId: n.entity_id ?? null,
    entityTitle: n.entity_title ?? null,
    count: Number(n.count) > 0 ? Number(n.count) : 1,
    meta: n.meta && typeof n.meta === 'object' ? n.meta : {},
  }));
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('id', notificationId);
}

export async function markAllAsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function clearNotifications(userId: string): Promise<void> {
  await supabase.from('notifications').delete().eq('user_id', userId);
}

/**
 * @deprecated Les notifications sont créées côté base par des triggers (supabase/migrations/20261123_notifications_engine.sql).
 * Les insertions directes depuis le client sont refusées par la RLS.
 */
export async function addNotification(payload: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}): Promise<boolean> {
  const { error } = await supabase.from('notifications').insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
  });
  return !error;
}