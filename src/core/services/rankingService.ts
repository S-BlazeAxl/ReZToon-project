import { supabase } from '../lib/supabase';
import type { Manga } from './mangaService';

export type FeaturedPeriod = 'week' | 'month';

export interface FeaturedRankEntry {
  mangaId: string;
  rank: number;
  /** Vues sur la période (chapitres lus pour la première fois). */
  views: number;
  /** Likes reçus sur la période. */
  likes: number;
  /**
   * Semaine : (vues + likes) / 2.
   * Mois    : (vues + likes) / 2 x nombre d'apparitions dans les Top 5 hebdomadaires du mois.
   */
  score: number;
  /** Apparitions dans les Top 5 hebdomadaires de la période (mois) ; 1 ou 0 pour la semaine. */
  appearances: number;
  /** false = aucune activité sur la période : classé sur la moyenne (lectures + likes) / 2 de tous les temps. */
  hasActivity: boolean;
  periodStart?: string;
  periodEnd?: string;
}

export interface FeaturedRanking {
  entries: FeaturedRankEntry[];
  /** 'fallback' : la fonction SQL est absente / en erreur, classement calculé côté client sur les totaux. */
  source: 'server' | 'fallback';
}

/** Moyenne arithmétique vues / likes, arrondie à 0,1. */
export function averageScore(views: number, likes: number): number {
  return Math.round(((views + likes) / 2) * 10) / 10;
}

/** Repli : Top N sur la moyenne (lectures + likes) / 2 de tous les temps. */
export function rankByAverage(mangas: Manga[], limit = 5): FeaturedRankEntry[] {
  return mangas
    .map((m) => ({ m, avg: ((m.reads || 0) + (m.likes || 0)) / 2 }))
    .sort((a, b) => b.avg - a.avg || (b.m.likes || 0) - (a.m.likes || 0) || a.m.id.localeCompare(b.m.id))
    .slice(0, limit)
    .map(({ m }, i) => ({
      mangaId: m.id,
      rank: i + 1,
      views: m.reads || 0,
      likes: m.likes || 0,
      score: averageScore(m.reads || 0, m.likes || 0),
      appearances: 0,
      hasActivity: false,
    }));
}

export async function getFeaturedRanking(
  period: FeaturedPeriod,
  limit = 5,
  fallbackMangas: Manga[] = [],
): Promise<FeaturedRanking> {
  const { data, error } = await supabase.rpc('get_featured_ranking', {
    p_period: period,
    p_limit: limit,
  });

  if (error || !Array.isArray(data)) {
    // PGRST202 / 404 : appliquer supabase/migrations/20261122_featured_rankings.sql
    console.warn('[rankingService] get_featured_ranking failed, using fallback:', error?.code, error?.message);
    return { entries: rankByAverage(fallbackMangas, limit), source: 'fallback' };
  }

  return {
    source: 'server',
    entries: data.map((r: any) => ({
      mangaId: r.r_manga_id,
      rank: Number(r.r_pos),
      views: Number(r.r_views) || 0,
      likes: Number(r.r_likes) || 0,
      score: Number(r.r_score) || 0,
      appearances: Number(r.r_appearances) || 0,
      hasActivity: Boolean(r.r_has_activity),
      periodStart: r.r_period_start,
      periodEnd: r.r_period_end,
    })),
  };
}
