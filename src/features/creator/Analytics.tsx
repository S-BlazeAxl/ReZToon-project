import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Eye, Users, Heart, BookOpen, MapPin, Clock } from 'lucide-react';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { supabase } from '../../core/lib/supabase';
import { useT, useI18n } from '../../config/i18n';

interface SeriesAnalytics {
  id: string;
  title: string;
  genre: string;
  status: string;
  reads: number;
  likes: number;
  chapters: number;
}

interface TopReaderCountry {
  country: string;
  readers: number;
}

interface DailyActivity {
  date: string;
  count: number;
}

export default function Analytics() {
  const user = useCurrentUser();
  const t = useT();
  const { lang } = useI18n();
  
  const [series, setSeries] = useState<SeriesAnalytics[]>([]);
  const [chapterCount, setChapterCount] = useState(0);
  const [totalReads, setTotalReads] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [newFollowers, setNewFollowers] = useState(0);
  const [topCountries, setTopCountries] = useState<TopReaderCountry[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      const { data: mangasData } = await supabase
        .from('mangas')
        .select('id, title, genre, status, reads, likes, chapters (id)')
        .eq('author_id', user.id)
        .order('reads', { ascending: false });

      if (cancelled) return;

      const mangas = (mangasData ?? []) as any[];
      const seriesIds = mangas.map((m) => m.id);

      const enriched: SeriesAnalytics[] = mangas.map((m) => ({
        id: m.id,
        title: m.title,
        genre: m.genre,
        status: m.status,
        reads: m.reads ?? 0,
        likes: m.likes ?? 0,
        chapters: Array.isArray(m.chapters) ? m.chapters.length : 0,
      }));

      const totalChapters = enriched.reduce((sum, s) => sum + s.chapters, 0);
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();

      let followsCount = 0;
      if (seriesIds.length > 0) {
        const { count } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('target_type', 'manga')
          .in('target_id', seriesIds)
          .gte('created_at', since30);
        followsCount = count ?? 0;
      }

      if (cancelled) return;

      let libraryRows: { last_read_at: string | null; user_id: string }[] = [];
      if (seriesIds.length > 0) {
        const { data } = await supabase
          .from('library_entries')
          .select('last_read_at, user_id')
          .in('manga_id', seriesIds)
          .not('last_read_at', 'is', null)
          .gte('last_read_at', since7);
        libraryRows = (data ?? []) as { last_read_at: string | null; user_id: string }[];
      }

      if (cancelled) return;

      const uniqueReaderIds = [...new Set(libraryRows.map((r) => r.user_id))];

      let countries: TopReaderCountry[] = [];
      if (uniqueReaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, country')
          .in('id', uniqueReaderIds);

        const counts = new Map<string, number>();
        for (const p of profiles ?? []) {
          const country = ((p as any).country ?? '').trim() || 'Unknown';
          counts.set(country, (counts.get(country) ?? 0) + 1);
        }
        countries = [...counts.entries()]
          .map(([country, readers]) => ({ country, readers }))
          .sort((a, b) => b.readers - a.readers)
          .slice(0, 5);
      }

      if (cancelled) return;

      setSeries(enriched);
      setChapterCount(totalChapters);
      setTotalReads(enriched.reduce((sum, s) => sum + s.reads, 0));
      setTotalLikes(enriched.reduce((sum, s) => sum + s.likes, 0));
      setNewFollowers(followsCount);
      setTopCountries(countries);
      setDailyActivity(buildDailyActivity(libraryRows, lang));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, lang]);

  const topSeries = useMemo(() => series.slice(0, 5), [series]);
  const maxDaily = useMemo(
    () => Math.max(1, ...dailyActivity.map((d) => d.count)),
    [dailyActivity],
  );
  const hasActivity = dailyActivity.some((d) => d.count > 0);

  return (
    <div className="creator-page">
      <header className="creator-page-header">
        <div>
          <span className="creator-page-tag">{t.creator.insights}</span>
          <h1>{t.creator.analytics}</h1>
          <p>{t.creator.trackReadership}</p>
        </div>
      </header>

      <section className="creator-stats-grid">
        <div className="creator-stat-card">
          <div className="creator-stat-icon"><Eye size={18} /></div>
          <span className="creator-stat-label">{t.common.totalReads}</span>
          <strong className="creator-stat-value">
            {loading ? '…' : totalReads.toLocaleString()}
          </strong>
          <span className="creator-stat-trend">{t.creator.allSeriesCombined}</span>
        </div>
        <div className="creator-stat-card">
          <div className="creator-stat-icon"><BookOpen size={18} /></div>
          <span className="creator-stat-label">{t.mangaDetail.chapters}</span>
          <strong className="creator-stat-value">{loading ? '…' : chapterCount}</strong>
          <span className="creator-stat-trend">{t.creator.acrossSeries} {series.length} {t.common.series}</span>
        </div>
        <div className="creator-stat-card">
          <div className="creator-stat-icon"><Users size={18} /></div>
          <span className="creator-stat-label">{t.creator.newFollowers}</span>
          <strong className="creator-stat-value">{loading ? '…' : newFollowers}</strong>
          <span className="creator-stat-trend">{t.creator.last30Days}</span>
        </div>
        <div className="creator-stat-card">
          <div className="creator-stat-icon"><Heart size={18} /></div>
          <span className="creator-stat-label">{t.common.likes}</span>
          <strong className="creator-stat-value">
            {loading ? '…' : totalLikes.toLocaleString()}
          </strong>
          <span className="creator-stat-trend">{t.creator.acrossAllSeries}</span>
        </div>
      </section>

      <section className="creator-section">
        <div className="creator-section-header">
          <h2>{t.creator.readerActivity}</h2>
        </div>
        {loading ? (
          <div className="wallet-empty" style={{ minHeight: 140 }}>
            <p>{t.common.loading}</p>
          </div>
        ) : !hasActivity ? (
          <div className="wallet-empty" style={{ minHeight: 140 }}>
            <Clock size={24} />
            <p>{t.creator.noActivity}</p>
            <span>{t.creator.publishNewChapter}</span>
          </div>
        ) : (
          <div className="creator-chart">
            {dailyActivity.map((d) => (
              <div key={d.date} className="creator-chart-col">
                <div
                  className="creator-chart-bar"
                  style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }}
                />
                <span>{d.date}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="creator-two-col">
        <section className="creator-section">
          <div className="creator-section-header">
            <h2>{t.creator.topSeriesReads}</h2>
          </div>
          {loading ? (
            <div className="wallet-empty" style={{ minHeight: 140 }}>
              <p>{t.common.loading}</p>
            </div>
          ) : topSeries.length === 0 ? (
            <div className="wallet-empty" style={{ minHeight: 140 }}>
              <BookOpen size={24} />
              <p>{t.creator.noSeries}</p>
              <span>{t.creator.noSeriesDesc}</span>
            </div>
          ) : (
            <ul className="creator-rank-list">
              {topSeries.map((s) => (
                <li key={s.id} className="creator-rank-item">
                  <span className="creator-rank-title">{s.title}</span>
                  <span className="creator-rank-value">
                    {s.reads.toLocaleString()}
                  </span>
                  <TrendingUp size={14} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="creator-section">
          <div className="creator-section-header">
            <h2>{t.creator.topReaderCountries}</h2>
          </div>
          {loading ? (
            <div className="wallet-empty" style={{ minHeight: 140 }}>
              <p>{t.common.loading}</p>
            </div>
          ) : topCountries.length === 0 ? (
            <div className="wallet-empty" style={{ minHeight: 140 }}>
              <MapPin size={24} />
              <p>{t.creator.noReaderData}</p>
              <span>{t.creator.onceReaders}</span>
            </div>
          ) : (
            <ul className="creator-rank-list">
              {topCountries.map((c) => (
                <li key={c.country} className="creator-rank-item">
                  <MapPin size={14} />
                  <span className="creator-rank-title">{c.country}</span>
                  <span className="creator-rank-value">{c.readers}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function buildDailyActivity(
  library: { last_read_at: string | null }[],
  lang: string,
): DailyActivity[] {
  const days: DailyActivity[] = [];
  const now = new Date();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(locale, { weekday: 'short' });
    const count = library.filter(
      (l) => l.last_read_at && l.last_read_at.slice(0, 10) === key,
    ).length;
    days.push({ date: label, count });
  }

  return days;
}