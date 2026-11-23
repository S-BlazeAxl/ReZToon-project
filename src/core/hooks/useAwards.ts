import { useCallback, useEffect, useState } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useT } from '../../config/i18n';
import {
  getCategories, getEdition, getEditionStatus, getCategoryLeaderboard,
  getUserVoteForCategory, getTotalVotes, getTrendingNominees, getPastEditions,
  castVote,
  type AwardNomination, type AwardEdition, type AwardCategory, type PastEdition,
} from '../services/awardsService';

const AWARDS_EVENT = 'reztoon:awards-change';

export function useAwards() {
  const user = useCurrentUser();
  const t = useT();
  const [tick, setTick] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [edition, setEdition] = useState<AwardEdition | null>(null);
  const [status, setStatus] = useState<'upcoming' | 'open' | 'closed' | 'none'>('none');
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [pastEditions, setPastEditions] = useState<PastEdition[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [trending, setTrending] = useState<AwardNomination[]>([]);
  const [leaderboard, setLeaderboard] = useState<AwardNomination[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    window.dispatchEvent(new Event(AWARDS_EVENT));
  }, []);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener(AWARDS_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(AWARDS_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [ed, cats, st, past] = await Promise.all([
          getEdition(), getCategories(), getEditionStatus(), getPastEditions(),
        ]);
        if (cancelled) return;
        setEdition(ed);
        setCategories(cats);
        setStatus(st);
        setPastEditions(past);
        setActiveCategory((prev) => {
          if (prev && cats.some((c) => c.id === prev)) return prev;
          return cats[0]?.id ?? null;
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tick]);

  useEffect(() => {
    if (!activeCategory) {
      setLeaderboard([]);
      setUserVote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [board, tot, trend, vote] = await Promise.all([
        getCategoryLeaderboard(activeCategory),
        getTotalVotes(),
        getTrendingNominees(6),
        user ? getUserVoteForCategory(user.id, activeCategory) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setLeaderboard(board);
      setTotalVotes(tot);
      setTrending(trend);
      setUserVote(vote);
    })();
    return () => { cancelled = true; };
  }, [activeCategory, user, tick]);

  useEffect(() => {
    if (!edition) return;
    const end = new Date(edition.endDate).getTime();

    const compute = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
        return false;
      }
      setCountdown({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1000),
        isOver: false,
      });
      return true;
    };

    const shouldContinue = compute();
    if (!shouldContinue) return;

    const interval = window.setInterval(() => {
      const keepGoing = compute();
      if (!keepGoing) window.clearInterval(interval);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [edition]);

  const vote = useCallback(async (nomineeId: string) => {
    if (!user) return { success: false, message: t.awards.signInToVote };
    if (!activeCategory) return { success: false, message: t.awards.noCategorySelected };

    const result = await castVote(user.id, nomineeId, activeCategory);
    if (result.success) refresh();
    return result;
  }, [user, activeCategory, refresh, t.awards.signInToVote, t.awards.noCategorySelected]);

  return {
    loading, edition, status, categories, activeCategory, setActiveCategory,
    leaderboard, totalVotes, trending, pastEditions, userVote, countdown, vote, refresh,
  };
}