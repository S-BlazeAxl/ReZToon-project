import { useCallback, useEffect, useRef, useState } from 'react';
import { useCurrentUser } from './useCurrentUser';
import {
  isFollowing as dbIsFollowing,
  toggleFollow as dbToggleFollow,
  type FollowTargetType,
} from '../services/followService';

const FOLLOW_EVENT = 'reztoon:follow-change';

/**
 * Détail de l'événement : permet à chaque bouton d'ignorer les notifications
 * qu'il a lui-même émises et de ne rafraîchir que la cible concernée.
 */
interface FollowChangeDetail {
  targetId: string;
  type: FollowTargetType;
  following: boolean;
  source: symbol;
}

export function notifyFollowChange(detail?: Partial<FollowChangeDetail>): void {
  window.dispatchEvent(new CustomEvent<Partial<FollowChangeDetail>>(FOLLOW_EVENT, { detail }));
}

/**
 * Cache mémoire partagé par tous les boutons : évite N requêtes identiques
 * (une par carte) et empêche toute cascade « effet → setState → effet ».
 */
const inflight = new Map<string, Promise<boolean>>();

function cacheKey(userId: string, targetId: string, type: FollowTargetType): string {
  return `${userId}:${type}:${targetId}`;
}

function fetchFollowing(
  userId: string,
  targetId: string,
  type: FollowTargetType,
  force = false,
): Promise<boolean> {
  const key = cacheKey(userId, targetId, type);
  const existing = inflight.get(key);
  if (existing && !force) return existing;
  const promise = dbIsFollowing(userId, targetId, type)
    .catch(() => false)
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

export function useFollow(targetId: string, type: FollowTargetType) {
  const user = useCurrentUser();
  const userId = user?.id ?? null;

  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const busyRef = useRef(false);
  const followingRef = useRef(false);
  const sourceRef = useRef(Symbol('follow-button'));

  const apply = useCallback((next: boolean) => {
    followingRef.current = next;
    // Le setter de React ignore déjà les valeurs identiques : aucun re-render superflu.
    setFollowing(next);
  }, []);

  // Chargement initial / changement de cible : une seule requête, jamais relancée par un événement.
  useEffect(() => {
    if (!userId) {
      apply(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchFollowing(userId, targetId, type, tick > 0)
      .then((v) => {
        if (!cancelled && !busyRef.current) apply(v);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, targetId, type, tick, apply]);

  // Synchronisation avec les autres boutons de la même cible (aucune requête réseau).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Partial<FollowChangeDetail>> | undefined)?.detail;
      // Événement externe sans détail : on revérifie une seule fois côté serveur.
      if (!detail || typeof detail.following !== 'boolean') {
        setTick((n) => n + 1);
        return;
      }
      if (detail.source === sourceRef.current) return;
      if (detail.targetId !== targetId || detail.type !== type) return;
      apply(detail.following);
    };
    window.addEventListener(FOLLOW_EVENT, handler);
    return () => window.removeEventListener(FOLLOW_EVENT, handler);
  }, [targetId, type, apply]);

  const toggle = useCallback(async () => {
    if (!userId || busyRef.current) return followingRef.current;

    busyRef.current = true;
    const previousState = followingRef.current;
    apply(!previousState);

    try {
      const nextState = await dbToggleFollow(userId, targetId, type);
      apply(nextState);
      notifyFollowChange({ targetId, type, following: nextState, source: sourceRef.current });
      return nextState;
    } catch (err) {
      console.error('[useFollow] toggle failed (RLS ? appliquer supabase/migrations/20261120_community_awards_rls.sql):', err);
      apply(previousState);
      return previousState;
    } finally {
      busyRef.current = false;
    }
  }, [userId, targetId, type, apply]);

  return {
    following,
    toggle,
    canFollow: Boolean(userId),
    loading,
  };
}
