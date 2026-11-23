import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useCrossTabSync, broadcastMessagingSync } from './useCrossTabSync';
import { useRealtimeMessaging, type RealtimePayload } from './useRealtimeMessaging';
import { playNotificationSound, primeAudioContext } from '../utils/soundNotification';
import {
  MESSAGE_LABELS,
  getConversations,
  getMessagesBetween,
  markConversationAsRead,
  sendMessage as dbSendMessage,
  toggleStar,
  toggleArchive,
  toggleMute,
  togglePin,
  toggleSpam,
  toggleLabel,
  toggleMessagePin,
  deleteMessage,
  deleteConversation,
  deleteConversations,
  editMessage as dbEditMessage,
  ensureMeta,
  isMessageReadByUser,
  markMessageAsReadByUser,
  getGroupMessages,
  sendGroupMessage,
  markGroupAsRead,
  getGroupsLastMessages,
  getGroupsUnreadCounts,
  getGroupMeta,
  toggleReaction,
  getUnreadCount,
  mapMessageRow,
  type Conversation,
  type Message,
  type MessageLabel,
  type MessageAttachment,
} from '../services/messageService';
import { getGroupById, getUserGroups, type Group } from '../services/groupService';
import { useI18n } from '../../config/i18n';

export type ActiveType = 'dm' | 'group' | null;

export interface GroupConversation {
  groupId: string;
  groupName: string;
  groupIcon: string;
  groupColor: string;
  memberCount: number;
  lastMessage: string;
  lastDate: string;
  unread: number;
  pinned: boolean;
  muted: boolean;
  starred: boolean;
  archived: boolean;
}

export interface UseMessagingResult {
  conversations: Conversation[];
  visibleConversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  groupedMessages: { day: string; items: Message[] }[];
  pinnedMessages: Message[];
  labelCounts: Record<MessageLabel, number>;
  totalUnread: number;
  groupConversations: GroupConversation[];
  totalGroupUnread: number;
  activeGroup: Group | null;
  activeId: string | null;
  activeType: ActiveType;
  activeLabel: MessageLabel;
  query: string;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  setActiveId: (id: string | null) => void;
  setActiveLabel: (label: MessageLabel) => void;
  setQuery: (q: string) => void;
  selectConversation: (id: string) => void;
  selectGroup: (groupId: string) => void;
  closeConversation: () => void;
  startConversation: (otherId: string) => Promise<void>;
  send: (text: string, options?: { replyToId?: string; attachments?: MessageAttachment[] }) => Promise<void>;
  edit: (messageId: string, text: string) => Promise<void>;
  removeMessage: (messageId: string) => Promise<void>;
  removeConversation: (otherId: string) => Promise<void>;
  removeConversations: (otherIds: string[]) => Promise<void>;
  archiveConversations: (otherIds: string[]) => Promise<void>;
  markRead: (messageId: string) => void;
  isRead: (messageId: string) => boolean;
  getMessage: (id: string) => Message | null;
  react: (messageId: string, emoji: string) => void;
  pinMessage: (messageId: string) => void;
  starActive: () => void;
  archiveActive: () => void;
  muteActive: () => void;
  pinActive: () => void;
  spamActive: () => void;
  labelActive: (label: MessageLabel) => void;
  toggleGroupPin: (groupId: string) => void;
  toggleGroupMute: (groupId: string) => void;
  toggleGroupStar: (groupId: string) => void;
  toggleGroupArchive: (groupId: string) => void;
}

const REALTIME_TABLES = ['messages', 'conversation_meta', 'groups', 'group_members'] as const;

export function formatTime(iso: string, locale?: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(iso: string, locale: string = 'en-GB'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

export function formatDay(iso: string, locale: string = 'en-GB'): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' });
}

function groupByDay(messages: Message[], locale: string = 'en-GB'): { day: string; items: Message[] }[] {
  const groups: { day: string; items: Message[] }[] = [];
  for (const m of messages) {
    const day = formatDay(m.date, locale);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  }
  return groups;
}

export function useMessaging(): UseMessagingResult | null {
  const user = useCurrentUser();
  const { lang } = useI18n();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';

  const [tick, setTick] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [groupConversations, setGroupConversations] = useState<GroupConversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [totalGroupUnread, setTotalGroupUnread] = useState(0);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ActiveType>(null);
  const [activeLabel, setActiveLabel] = useState<MessageLabel>('inbox');
  const [query, setQuery] = useState('');
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    try { return localStorage.getItem('reztoon_sound_enabled') !== '0'; } catch { return true; }
  });

  const prevTotalUnreadRef = useRef<number | null>(null);
  const audioPrimedRef = useRef(false);
  const groupIdsRef = useRef<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);

  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v);
    try { localStorage.setItem('reztoon_sound_enabled', v ? '1' : '0'); } catch { /* ignore */ }
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const refreshAndBroadcast = useCallback(() => { refresh(); broadcastMessagingSync(); }, [refresh]);

  useCrossTabSync(refresh);

  const handleRealtime = useCallback((payload?: RealtimePayload) => {
    if (payload?.table === 'messages' && payload.eventType === 'INSERT') {
      const newMsg = payload.new;

      if (user && activeId && activeType) {
        const isRelevant =
          (activeType === 'dm' &&
            ((newMsg.sender_id === activeId && newMsg.receiver_id === user.id) ||
              (newMsg.sender_id === user.id && newMsg.receiver_id === activeId))) ||
          (activeType === 'group' && newMsg.group_id === activeId);

        if (isRelevant) {
          setAllMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const tempId = prev.find(
              (m) =>
                m.isOptimistic &&
                m.text === newMsg.text &&
                m.senderId === newMsg.sender_id,
            )?.id;
            if (tempId) return prev.map((m) => (m.id === tempId ? mapMessageRow(newMsg) : m));
            return [...prev, mapMessageRow(newMsg)];
          });

          if (newMsg.sender_id !== user.id) {
            if (activeType === 'dm') markConversationAsRead(user.id, activeId);
            else markGroupAsRead(user.id, activeId);
          }
        }
      }
      refresh();
    } else {
      refresh();
    }
  }, [activeId, activeType, user, refresh]);

  useRealtimeMessaging({
    userId: user?.id,
    tables: REALTIME_TABLES,
    onChange: handleRealtime,
    groupIds,
  });

  useEffect(() => {
    if (audioPrimedRef.current) return;
    const onFirstClick = () => {
      primeAudioContext();
      audioPrimedRef.current = true;
      document.removeEventListener('click', onFirstClick);
    };
    document.addEventListener('click', onFirstClick);
    return () => document.removeEventListener('click', onFirstClick);
  }, []);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setGroupConversations([]);
      setAllMessages([]);
      setTotalUnread(0);
      setTotalGroupUnread(0);
      groupIdsRef.current = [];
      setGroupIds([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [convs, unreadCount, groups] = await Promise.all([
          getConversations(user.id),
          getUnreadCount(user.id),
          getUserGroups(user.id),
        ]);

        if (cancelled) return;
        setConversations(convs);
        setTotalUnread(unreadCount);

        const groupIds = groups.map((g) => g.id);
        groupIdsRef.current = groupIds;
        setGroupIds((prev) => (prev.join('|') === groupIds.join('|') ? prev : groupIds));

        const [lastMsgs, unreadCounts, metaMap] = await Promise.all([
          getGroupsLastMessages(groupIds),
          getGroupsUnreadCounts(user.id, groupIds),
          getGroupMeta(user.id, groupIds),
        ]);

        if (cancelled) return;

        const gConvs: GroupConversation[] = groups.map((g) => {
          const last = lastMsgs[g.id];
          const meta = metaMap[g.id];
          return {
            groupId: g.id,
            groupName: g.name,
            groupIcon: g.icon,
            groupColor: g.color,
            memberCount: g.members.length,
            lastMessage: last?.text ?? '',
            lastDate: last?.date ?? g.updatedAt,
            unread: unreadCounts[g.id] || 0,
            pinned: meta?.pinned ?? false,
            muted: meta?.muted ?? false,
            starred: meta?.starred ?? false,
            archived: meta?.archived ?? false,
          };
        });

        setGroupConversations(gConvs);
        setTotalGroupUnread(gConvs.reduce((sum, g) => sum + g.unread, 0));
      } catch (err) {
        console.error('[useMessaging] load failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [user, tick]);

  useEffect(() => {
    let cancelled = false;
    if (activeType === 'group' && activeId) {
      getGroupById(activeId).then((g) => { if (!cancelled) setActiveGroup(g); });
    } else {
      setActiveGroup(null);
    }
    return () => { cancelled = true; };
  }, [activeType, activeId, tick]);

  useEffect(() => {
    if (!user || !activeId || !activeType) {
      setAllMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const msgs =
        activeType === 'group'
          ? await getGroupMessages(activeId)
          : await getMessagesBetween(user.id, activeId);
      if (!cancelled) setAllMessages(msgs);
    })();
    return () => { cancelled = true; };
  }, [user, activeId, activeType, tick]);

  const visibleConversations = useMemo(() => {
    let list = conversations;
    if (activeLabel === 'inbox') list = list.filter((c) => !c.archived && !c.spam);
    else if (activeLabel === 'starred') list = list.filter((c) => c.starred);
    else if (activeLabel === 'archive') list = list.filter((c) => c.archived);
    else if (activeLabel === 'spam') list = list.filter((c) => c.spam);
    else if (activeLabel === 'trade') list = list.filter((c) => c.labels.includes('trade'));
    else if (activeLabel === 'collab') list = list.filter((c) => c.labels.includes('collab'));

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.userName.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q),
      );
    }
    return list;
  }, [conversations, activeLabel, query]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.userId === activeId) ?? null,
    [conversations, activeId],
  );

  const groupedMessages = useMemo(() => groupByDay(allMessages, locale), [allMessages, locale]);

  const pinnedMessages = useMemo(() => {
    if (activeType === 'dm' && activeConversation) {
      return allMessages.filter((m) => activeConversation.pinnedMessageIds.includes(m.id));
    }
    return [];
  }, [allMessages, activeConversation, activeType]);

  const labelCounts = useMemo(
    () => ({
      inbox: conversations.filter((c) => !c.archived && !c.spam).length,
      starred: conversations.filter((c) => c.starred).length,
      trade: conversations.filter((c) => c.labels.includes('trade')).length,
      collab: conversations.filter((c) => c.labels.includes('collab')).length,
      archive: conversations.filter((c) => c.archived).length,
      spam: conversations.filter((c) => c.spam).length,
    }),
    [conversations],
  );

  useEffect(() => {
    if (!user) {
      prevTotalUnreadRef.current = null;
      return;
    }
    const combined = totalUnread + totalGroupUnread;
    const prev = prevTotalUnreadRef.current;
    if (prev !== null && combined > prev && soundEnabled) playNotificationSound(0.35);
    prevTotalUnreadRef.current = combined;
  }, [totalUnread, totalGroupUnread, soundEnabled, user]);

  useEffect(() => {
    if (!user || !activeId || !activeType) return;

    if (activeType === 'dm') {
      setConversations((prev) => {
        const target = prev.find((c) => c.userId === activeId);
        if (target && target.unread > 0) {
          setTotalUnread((t) => Math.max(0, t - target.unread));
        }
        return prev.map((c) => (c.userId === activeId ? { ...c, unread: 0 } : c));
      });
    } else {
      setGroupConversations((prev) => {
        const target = prev.find((g) => g.groupId === activeId);
        if (target && target.unread > 0) {
          setTotalGroupUnread((t) => Math.max(0, t - target.unread));
        }
        return prev.map((g) => (g.groupId === activeId ? { ...g, unread: 0 } : g));
      });
    }

    (async () => {
      if (activeType === 'dm') await markConversationAsRead(user.id, activeId);
      else await markGroupAsRead(user.id, activeId);
      refresh();
    })();
  }, [user, activeId, activeType, refresh]);

  const selectConversation = useCallback((id: string) => {
    setActiveType('dm');
    setActiveId(id);
  }, []);

  const selectGroup = useCallback((groupId: string) => {
    setActiveType('group');
    setActiveId(groupId);
  }, []);

  const closeConversation = useCallback(() => {
    setActiveId(null);
    setActiveType(null);
  }, []);

  const startConversation = useCallback(
    async (otherId: string) => {
      if (!user || otherId === user.id) return;
      await ensureMeta(user.id, otherId);
      setActiveType('dm');
      setActiveId(otherId);
      refreshAndBroadcast();
    },
    [user, refreshAndBroadcast],
  );

  const send = useCallback(
    async (
      text: string,
      options?: { replyToId?: string; attachments?: MessageAttachment[] },
    ) => {
      if (!user || !activeId || !activeType) return;

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        id: tempId,
        senderId: user.id,
        senderName: user.name,
        receiverId: activeType === 'dm' ? activeId : undefined,
        groupId: activeType === 'group' ? activeId : undefined,
        conversationType: activeType,
        text,
        date: new Date().toISOString(),
        read: false,
        delivered: false,
        attachments: options?.attachments || [],
        reactions: [],
        isOptimistic: true,
      };

      setAllMessages((prev) => [...prev, optimisticMsg]);

      try {
        let realMsg: Message | null = null;
        if (activeType === 'group') {
          if (!activeGroup || !activeGroup.members.some((m) => m.userId === user.id)) {
            setAllMessages((prev) => prev.filter((m) => m.id !== tempId));
            return;
          }
          realMsg = await sendGroupMessage(
            { id: user.id, name: user.name },
            activeId,
            text,
            options,
          );
        } else {
          realMsg = await dbSendMessage(user.id, activeId, text, options);
        }

        if (realMsg) {
          setAllMessages((prev) => {
            const next = prev.map((m) => (m.id === tempId ? realMsg : m));
            return next.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);
          });
        } else {
          setAllMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      } catch {
        setAllMessages((prev) => prev.filter((m) => m.id !== tempId));
      } finally {
        refreshAndBroadcast();
      }
    },
    [user, activeId, activeType, activeGroup, refreshAndBroadcast],
  );

  const edit = useCallback(
    async (messageId: string, text: string) => {
      if (!user) return;
      await dbEditMessage(messageId, user.id, text);
      refreshAndBroadcast();
    },
    [user, refreshAndBroadcast],
  );

  const removeMessage = useCallback(
    async (id: string) => {
      if (!user) return;
      await deleteMessage(id, user.id);
      refreshAndBroadcast();
    },
    [user, refreshAndBroadcast],
  );

  const removeConversation = useCallback(
    async (otherId: string) => {
      if (!user) return;
      await deleteConversation(user.id, otherId);
      if (activeId === otherId && activeType === 'dm') closeConversation();
      refreshAndBroadcast();
    },
    [user, activeId, activeType, closeConversation, refreshAndBroadcast],
  );

  const removeConversations = useCallback(
    async (otherIds: string[]) => {
      if (!user || otherIds.length === 0) return;
      await deleteConversations(user.id, otherIds);
      if (activeId && activeType === 'dm' && otherIds.includes(activeId)) closeConversation();
      refreshAndBroadcast();
    },
    [user, activeId, activeType, closeConversation, refreshAndBroadcast],
  );

  const archiveConversations = useCallback(
    async (otherIds: string[]) => {
      if (!user || otherIds.length === 0) return;
      await Promise.all(otherIds.map((id) => toggleArchive(user.id, id)));
      refreshAndBroadcast();
    },
    [user, refreshAndBroadcast],
  );

  const markRead = useCallback(
    (id: string) => {
      if (!activeId || activeType === 'group') return;
      markMessageAsReadByUser(activeId, id);
      refreshAndBroadcast();
    },
    [activeId, activeType, refreshAndBroadcast],
  );

  const isRead = useCallback(
    (id: string) => {
      if (!activeId || activeType === 'group') return true;
      return isMessageReadByUser(activeId, id) as unknown as boolean;
    },
    [activeId, activeType],
  );

  const getMessage = useCallback(
    (id: string) => allMessages.find((m) => m.id === id) ?? null,
    [allMessages],
  );

  const react = useCallback(
    (id: string, emoji: string) => {
      if (!user) return;
      void toggleReaction(id, emoji, { id: user.id, name: user.name }).then(refreshAndBroadcast);
    },
    [user, refreshAndBroadcast],
  );

  const pinMessage = useCallback(
    (id: string) => {
      if (!user || !activeId) return;
      if (activeType === 'dm') void toggleMessagePin(user.id, activeId, id).then(refreshAndBroadcast);
    },
    [user, activeId, activeType, refreshAndBroadcast],
  );

  const starActive = useCallback(() => {
    if (activeId && activeType === 'dm' && user) void toggleStar(user.id, activeId).then(refreshAndBroadcast);
  }, [user, activeId, activeType, refreshAndBroadcast]);

  const archiveActive = useCallback(() => {
    if (activeId && activeType === 'dm' && user) {
      void toggleArchive(user.id, activeId).then(() => { closeConversation(); refreshAndBroadcast(); });
    }
  }, [user, activeId, activeType, closeConversation, refreshAndBroadcast]);

  const muteActive = useCallback(() => {
    if (activeId && activeType === 'dm' && user) void toggleMute(user.id, activeId).then(refreshAndBroadcast);
  }, [user, activeId, activeType, refreshAndBroadcast]);

  const pinActive = useCallback(() => {
    if (activeId && activeType === 'dm' && user) void togglePin(user.id, activeId).then(refreshAndBroadcast);
  }, [user, activeId, activeType, refreshAndBroadcast]);

  const spamActive = useCallback(() => {
    if (activeId && activeType === 'dm' && user) {
      void toggleSpam(user.id, activeId).then(() => { closeConversation(); refreshAndBroadcast(); });
    }
  }, [user, activeId, activeType, closeConversation, refreshAndBroadcast]);

  const labelActive = useCallback(
    (label: MessageLabel) => {
      if (activeId && activeType === 'dm' && user) void toggleLabel(user.id, activeId, label).then(refreshAndBroadcast);
    },
    [user, activeId, activeType, refreshAndBroadcast],
  );

  const toggleGroupPin = useCallback(
    (groupId: string) => {
      if (user) void togglePin(user.id, groupId, true).then(refreshAndBroadcast);
    },
    [user, refreshAndBroadcast],
  );

  const toggleGroupMute = useCallback(
    (groupId: string) => {
      if (user) void toggleMute(user.id, groupId, true).then(refreshAndBroadcast);
    },
    [user, refreshAndBroadcast],
  );

  const toggleGroupStar = useCallback(
    (groupId: string) => {
      if (user) void toggleStar(user.id, groupId, true).then(refreshAndBroadcast);
    },
    [user, refreshAndBroadcast],
  );

  const toggleGroupArchive = useCallback(
    (groupId: string) => {
      if (user) {
        void toggleArchive(user.id, groupId, true).then(() => {
          if (activeId === groupId && activeType === 'group') closeConversation();
          refreshAndBroadcast();
        });
      }
    },
    [user, activeId, activeType, closeConversation, refreshAndBroadcast],
  );

  if (!user) return null;

  return {
    conversations,
    visibleConversations,
    activeConversation,
    messages: allMessages,
    groupedMessages,
    pinnedMessages,
    labelCounts,
    totalUnread,
    groupConversations,
    totalGroupUnread,
    activeGroup,
    activeId,
    activeType,
    activeLabel,
    query,
    soundEnabled,
    setSoundEnabled,
    setActiveId,
    setActiveLabel,
    setQuery,
    selectConversation,
    selectGroup,
    closeConversation,
    startConversation,
    send,
    edit,
    removeMessage,
    removeConversation,
    removeConversations,
    archiveConversations,
    markRead,
    isRead,
    getMessage,
    react,
    pinMessage,
    starActive,
    archiveActive,
    muteActive,
    pinActive,
    spamActive,
    labelActive,
    toggleGroupPin,
    toggleGroupMute,
    toggleGroupStar,
    toggleGroupArchive,
  };
}

export { MESSAGE_LABELS };
export type { Message, Conversation, MessageLabel, MessageAttachment };