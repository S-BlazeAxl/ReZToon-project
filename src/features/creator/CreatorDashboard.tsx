import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Users, Eye, TrendingUp, Plus, ArrowRight,
} from 'lucide-react';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import {
  getChaptersByOwner,
  getSeriesByOwner,
} from '../../core/services/contentService';
import { supabase } from '../../core/lib/supabase';
import { useT } from '../../config/i18n';
import type { Chapter, Series } from '../../core/services/contentService';

export default function CreatorDashboard() {
  const user = useCurrentUser();
  const t = useT();
  const [series, setSeries] = useState<Series[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [followers, setFollowers] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [fetchedSeries, fetchedChapters] = await Promise.all([
          getSeriesByOwner(user.id),
          getChaptersByOwner(user.id),
        ]);

        if (cancelled) return;

        const seriesIds = fetchedSeries.map((s) => s.id);

        let followersCount = 0;
        if (seriesIds.length > 0) {
          const { count } = await supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('target_type', 'manga')
            .in('target_id', seriesIds);
          followersCount = count ?? 0;
        }

        if (cancelled) return;

        const { data: ratingRows } = await supabase
          .from('mangas')
          .select('rating')
          .eq('author_id', user.id)
          .not('rating', 'is', null);

        if (cancelled) return;

        const ratings = (ratingRows ?? [])
          .map((r: any) => Number(r.rating))
          .filter((n: number) => n > 0);
        const avg = ratings.length
          ? ratings.reduce((s: number, n: number) => s + n, 0) / ratings.length
          : null;

        setSeries(fetchedSeries);
        setChapters(fetchedChapters);
        setFollowers(followersCount);
        setAvgRating(avg);
      } catch (err) {
        console.error('[CreatorDashboard] load failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const totalReads = series.reduce((sum, s) => sum + s.reads, 0);
  const recentChapters = chapters.slice(0, 5);
  const recentSeries = series.slice(0, 3);

  return (
    <div className="creator-page">
      <header className="creator-page-header">
        <div>
          <span className="creator-page-tag">
            <BookOpen size={12} /> {t.creator.studio}
          </span>
          <h1>{t.creator.dashboard}</h1>
          <p>{t.creator.overviewActivity}</p>
        </div>
        <div className="creator-page-actions">
          <Link to="/creator/new" className="btn btn-primary">
            <Plus size={15} /> {t.creator.newChapter}
          </Link>
        </div>
      </header>

      <section className="creator-stats-grid">
        <div className="creator-stat-card">
          <div className="creator-stat-icon"><BookOpen size={18} /></div>
          <span className="creator-stat-label">{t.creator.mySeries}</span>
          <strong className="creator-stat-value">{loading ? '…' : series.length}</strong>
          <span className="creator-stat-trend">{t.creator.manageOngoing}</span>
        </div>
        <div className="creator-stat-card">
          <div className="creator-stat-icon"><Eye size={18} /></div>
          <span className="creator-stat-label">{t.common.totalReads}</span>
          <strong className="creator-stat-value">
            {loading ? '…' : totalReads.toLocaleString()}
          </strong>
          <span className="creator-stat-trend">{t.creator.allSeriesCombined}</span>
        </div>
        <div className="creator-stat-card">
          <div className="creator-stat-icon"><Users size={18} /></div>
          <span className="creator-stat-label">{t.common.followers}</span>
          <strong className="creator-stat-value">{loading ? '…' : followers}</strong>
          <span className="creator-stat-trend">{t.creator.acrossAllSeries}</span>
        </div>
        <div className="creator-stat-card">
          <div className="creator-stat-icon"><TrendingUp size={18} /></div>
          <span className="creator-stat-label">{t.common.avgRating}</span>
          <strong className="creator-stat-value">
            {loading ? '…' : avgRating !== null ? avgRating.toFixed(1) : '—'}
          </strong>
          <span className="creator-stat-trend">{t.creator.insights}</span>
        </div>
      </section>

      <section className="creator-section">
        <div className="creator-section-header">
          <h2>{t.creator.recentSeries}</h2>
          <Link to="/creator/series" className="creator-section-link">
            {t.creator.viewAll} <ArrowRight size={13} />
          </Link>
        </div>
        {loading ? (
          <div className="wallet-empty" style={{ minHeight: 120 }}>
            <p>{t.creator.loadingSeries}</p>
          </div>
        ) : recentSeries.length === 0 ? (
          <div className="wallet-empty" style={{ minHeight: 140 }}>
            <BookOpen size={24} />
            <p>{t.creator.noSeries}</p>
            <span>{t.creator.noSeriesDesc}</span>
            <Link to="/creator/series" className="btn btn-primary">
              {t.creator.newSeries}
            </Link>
          </div>
        ) : (
          <ul className="creator-series-grid">
            {recentSeries.map((s) => (
              <li key={s.id} className="creator-series-card">
                <div className="creator-series-cover">
                  <BookOpen size={32} />
                </div>
                <div className="creator-series-body">
                  <strong>{s.title}</strong>
                  <span>{s.genre}</span>
                  <span className="creator-series-meta">
                    {s.reads.toLocaleString()} {t.mangaDetail.reads.toLowerCase()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="creator-section">
        <div className="creator-section-header">
          <h2>{t.creator.newChapter}</h2>
          <Link to="/creator/new" className="creator-section-link">
            {t.creator.viewAll} <ArrowRight size={13} />
          </Link>
        </div>
        {loading ? (
          <div className="wallet-empty" style={{ minHeight: 120 }}>
            <p>{t.common.loading}</p>
          </div>
        ) : recentChapters.length === 0 ? (
          <div className="wallet-empty" style={{ minHeight: 120 }}>
            <BookOpen size={24} />
            <p>{t.creator.noSeries}</p>
          </div>
        ) : (
          <ul className="creator-chapters-list">
            {recentChapters.map((c) => (
              <li key={c.id} className="creator-chapter-row">
                <span className="creator-chapter-num">
                  {t.common.chapterShort} {c.number}
                </span>
                <span className="creator-chapter-title">{c.title}</span>
                <span className={`creator-chapter-status status-${c.status}`}>
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}