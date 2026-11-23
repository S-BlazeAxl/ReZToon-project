import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface RealtimePayload {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
}

interface Options {
  userId: string | null | undefined;
  tables: readonly string[];
  onChange: (payload?: RealtimePayload) => void;
  debounceMs?: number;
  groupIds?: string[];
}

interface Subscriber {
  callback: (payload?: RealtimePayload) => void;
  groupIds: string[];
}

interface SharedChannel {
  channel: ReturnType<typeof supabase.channel>;
  subscribers: Set<Subscriber>;
  refCount: number;
  removalTimer: number | null;
}

const REMOVAL_GRACE_MS = 500;
/** Délai minimal entre deux « rattrapages » déclenchés par une erreur de canal (évite le spam réseau). */
const ERROR_BROADCAST_COOLDOWN_MS = 15000;
const registry = new Map<string, SharedChannel>();

function registryKey(userId: string, tables: readonly string[]): string {
  return `${userId}::${[...tables].sort().join('|')}`;
}

function createSharedChannel(
  userId: string,
  tables: readonly string[],
  key: string,
): SharedChannel {
  const channel = supabase.channel(`rt-${key}`);
  const subscribers = new Set<Subscriber>();

  const broadcast = (payload?: RealtimePayload) => {
    if (!payload) {
      subscribers.forEach((s) => s.callback());
      return;
    }

    if (payload.table === 'messages') {
      const msg = payload.new ?? payload.old ?? {};
      const isDM =
        msg.sender_id === userId || msg.receiver_id === userId;
      const isGroup = Boolean(msg.group_id);

      if (!isDM && !isGroup) return;

      if (isGroup) {
        subscribers.forEach((s) => {
          if (s.groupIds.length === 0 || s.groupIds.includes(msg.group_id)) {
            s.callback(payload);
          }
        });
        return;
      }
    }

    subscribers.forEach((s) => s.callback(payload));
  };

  for (const table of tables) {
    if (table === 'messages') {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) =>
          broadcast({
            table: 'messages',
            eventType: payload.eventType as RealtimePayload['eventType'],
            new: payload.new,
            old: payload.old,
          }),
      );
    } else if (table === 'notifications') {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) =>
          broadcast({
            table: 'notifications',
            eventType: payload.eventType as RealtimePayload['eventType'],
            new: payload.new,
            old: payload.old,
          }),
      );
    } else {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) =>
          broadcast({
            table,
            eventType: payload.eventType as RealtimePayload['eventType'],
            new: payload.new,
            old: payload.old,
          }),
      );
    }
  }

  let lastErrorBroadcast = 0;
  let wasDown = false;

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      // Retour du WebSocket après une coupure : un seul rattrapage pour récupérer ce qui a été manqué.
      if (wasDown) {
        wasDown = false;
        broadcast();
      }
      return;
    }

    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      wasDown = true;
      // Hors-ligne ou réseau instable : le client Supabase retente seul la connexion ;
      // inutile de lancer des requêtes qui échoueront (ERR_NETWORK_CHANGED).
      if (navigator.onLine === false) return;
      const now = Date.now();
      if (now - lastErrorBroadcast < ERROR_BROADCAST_COOLDOWN_MS) return;
      lastErrorBroadcast = now;
      broadcast();
    }
  });

  return { channel, subscribers, refCount: 0, removalTimer: null };
}

export function useRealtimeMessaging({
  userId,
  tables,
  onChange,
  debounceMs = 150,
  groupIds = [],
}: Options): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const tablesKey = tables.join('|');
  const groupIdsKey = [...groupIds].sort().join('|');

  useEffect(() => {
    if (!userId) return;

    const key = registryKey(userId, tables);
    let shared = registry.get(key);

    if (!shared) {
      shared = createSharedChannel(userId, tables, key);
      registry.set(key, shared);
    } else if (shared.removalTimer !== null) {
      window.clearTimeout(shared.removalTimer);
      shared.removalTimer = null;
    }

    let timer: number | null = null;
    let closed = false;
    let pendingPayload: RealtimePayload | undefined = undefined;

    const subscriber: Subscriber = {
      groupIds: [...groupIds],
      callback: (payload?: RealtimePayload) => {
        if (closed) return;
        if (payload) pendingPayload = payload;
        if (timer !== null) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          timer = null;
          if (!closed && navigator.onLine !== false) {
            onChangeRef.current(pendingPayload);
            pendingPayload = undefined;
          }
        }, debounceMs);
      },
    };

    shared.subscribers.add(subscriber);
    shared.refCount += 1;

    const onFocus = () => {
      if (!closed) subscriber.callback();
    };
    const onOnline = () => {
      if (!closed) subscriber.callback();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !closed) subscriber.callback();
    };

    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine && !closed) {
        subscriber.callback();
      }
    }, 30000);

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      closed = true;
      if (timer !== null) window.clearTimeout(timer);
      window.clearInterval(heartbeat);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);

      shared!.subscribers.delete(subscriber);
      shared!.refCount -= 1;

      if (shared!.refCount === 0) {
        shared!.removalTimer = window.setTimeout(() => {
          const current = registry.get(key);
          if (current === shared && shared!.refCount === 0) {
            registry.delete(key);
            void supabase.removeChannel(shared!.channel);
          }
        }, REMOVAL_GRACE_MS);
      }
    };
  }, [userId, tablesKey, debounceMs, groupIdsKey]);
}