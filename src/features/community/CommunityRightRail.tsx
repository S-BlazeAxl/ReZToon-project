import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Trophy, Calendar, MapPin, Flame, Sparkles, PenTool, Star, BookOpen, Eye, Heart, Play } from 'lucide-react';
import type { CommunityMeta, AuthorRanking } from '../../core/services/communityService';
import { getSuggestedCreatorsForUser, type SuggestedCreator } from '../../core/services/creatorService';
import { getSeriesByOwner } from '../../core/services/contentService';
import { getAllMangas, type Manga } from '../../core/services/mangaService';
import { getIcon } from '../../shared/ui/Icon';
import FollowButton from '../../shared/ui/FollowButton';
import type { User } from '../../core/services/userService';
import { formatNumber } from '../../core/utils/format';
import { useT, useI18n } from '../../config/i18n';

interface Props {
  meta: CommunityMeta;
  topAuthors: AuthorRanking[];
  user: User | null;
}

function resolveLocale(lang: string): string {
  return lang === 'fr' ? 'fr-FR' : 'en-GB';
}

function formatEventDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

export default function CommunityRightRail({ meta, topAuthors, user }: Props) {
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useI18n();
  const locale = resolveLocale(lang);
  const isCreator = user?.role === 'creator' || user?.role === 'both';

  const [suggested, setSuggested] = useState<SuggestedCreator[]>([]);
  const [suggestedBooks, setSuggestedBooks] = useState<Manga[]>([]);

  // Dériver les événements depuis meta.events au lieu de refaire un appel DB
  const upcomingEvents = meta.events
    .filter((e) => new Date(e.date).getTime() >= Date.now())
    .slice(0, 4);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || !isCreator) return;
      const series = await getSeriesByOwner(user.id);
      let genre = user.favoriteGenres?.[0] || null;

      if (series.length > 0) {
        const counts = new Map<string, number>();
        for (const s of series) counts.set(s.genre, (counts.get(s.genre) ?? 0) + 1);
        let best: { genre: string; n: number } | null = null;
        for (const [g, n] of counts) { if (!best || n > best.n) best = { genre: g, n }; }
        if (best) genre = best.genre;
      }

      const data = await getSuggestedCreatorsForUser({
        userId: user.id,
        userGenre: genre,
        userFavoriteGenres: user.favoriteGenres,
        limit: 4,
      });
      if (!cancelled) setSuggested(data);
    })();
    return () => { cancelled = true; };
  }, [user, isCreator]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getAllMangas();
      const genres = new Set(user?.favoriteGenres ?? []);
      const scored = all.slice().sort((a, b) => {
        const aMatch = genres.has(a.genre) ? 1 : 0;
        const bMatch = genres.has(b.genre) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        return b.rating - a.rating || b.likes - a.likes;
      });
      if (!cancelled) setSuggestedBooks(scored.slice(0, 5));
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleOpenBook = (id: string) => navigate(`/manga/${id}`);
  const handleOpenEvents = () => navigate('/community/events');

  return (
    <aside className="community-right-rail">
      {isCreator && suggested.length > 0 && (
        <div className="rail-card rail-creators">
          <div className="rail-card-header"><PenTool size={14} /><span>{t.home.suggestedCreators}</span></div>
          <ul className="rail-suggested-list">
            {suggested.map((c) => (
              <li key={c.id} className="rail-suggested-item">
                <Link to={`/creators/${c.id}`} className="rail-suggested-avatar" aria-label={c.name}>
                  {/^(https?:\/\/|data:image\/|\/)/i.test(c.avatar)
                    ? <img src={c.avatar} alt="" loading="lazy" />
                    : c.name.charAt(0).toUpperCase()}
                </Link>
                <div className="rail-suggested-info">
                  <strong><Link to={`/creators/${c.id}`}>{c.name}</Link></strong>
                  <span>{c.genre}</span>
                </div>
                <FollowButton targetId={c.id} type="creator" size="sm" variant="icon" />
              </li>
            ))}
          </ul>
          <Link to="/home" className="rail-creators-cta">{t.rightRail.seeAllInHome}</Link>
        </div>
      )}

      <div className="rail-card rail-books">
        <div className="rail-card-header"><BookOpen size={14} /><span>{t.rightRail.suggestedBooks}</span></div>
        {suggestedBooks.length === 0 ? (
          <div className="rail-empty">{t.rightRail.noBooksAvailable}</div>
        ) : (
          <ul className="rail-books-list">
            {suggestedBooks.map((m) => {
              const Icon = getIcon(m.cover);
              return (
                <li key={m.id} className="rail-book-item" onClick={() => handleOpenBook(m.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenBook(m.id); } }}>
                  <div className="rail-book-cover">
                    <Icon size={22} />
                    <span className={`rail-book-status status-${m.status}`}>{m.status}</span>
                  </div>
                  <div className="rail-book-info">
                    <strong>{m.title}</strong>
                    <span>{m.author} · {m.genre}</span>
                    <div className="rail-book-metrics">
                      <span><Eye size={10} /> {formatNumber(m.reads)}</span>
                      <span><Heart size={10} /> {formatNumber(m.likes)}</span>
                      <span><Star size={10} fill="currentColor" /> {m.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <span className="rail-book-play"><Play size={11} fill="currentColor" /></span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rail-card">
        <div className="rail-card-header"><Trophy size={14} /><span>{t.rightRail.topAuthorsWeek}</span></div>
        {topAuthors.length === 0 ? (
          <div className="rail-empty">{t.rightRail.noRanking}</div>
        ) : (
          <ol className="rail-ranking-list">
            {topAuthors.slice(0, 5).map((a, i) => {
              const medal = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
              return (
                <li key={a.authorId} className={`rail-ranking-item ${medal}`}>
                  <span className="rail-ranking-pos">#{i + 1}</span>
                  <span className="rail-ranking-avatar">{a.authorName.charAt(0).toUpperCase()}</span>
                  <div className="rail-ranking-info">
                    <strong>{a.authorName}</strong>
                    <span>{a.works} {t.rightRail.works} · {a.likes} {t.common.likes.toLowerCase()}</span>
                  </div>
                  <span className="rail-ranking-score"><TrendingUp size={11} /> {a.score}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="rail-card">
        <div className="rail-card-header"><Flame size={14} /><span>{t.rightRail.trendingGenres}</span></div>
        <ul className="rail-trending-list">
          {meta.trending.map((tr) => (
            <li key={tr.tag} className="rail-trending-item">
              <div className="rail-trending-info">
                <strong>#{tr.tag}</strong>
                <span>{tr.posts} {t.rightRail.posts}</span>
              </div>
              <span className="rail-trending-pct">{tr.trend}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rail-card rail-events">
        <div className="rail-card-header"><Calendar size={14} /><span>{t.rightRail.upcomingEvents}</span></div>
        {upcomingEvents.length === 0 ? (
          <div className="rail-empty">{t.rightRail.noUpcomingEvents}</div>
        ) : (
          <ul className="rail-event-list">
            {upcomingEvents.map((e) => (
              <li key={e.id} className="rail-event-item" onClick={handleOpenEvents} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); handleOpenEvents(); } }}>
                <strong>{e.title}</strong>
                <span className="rail-event-host">{t.events.by} {e.host}</span>
                <div className="rail-event-meta">
                  <span><Calendar size={10} /> {formatEventDate(e.date, locale)}</span>
                  <span><MapPin size={10} /> {e.location}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {upcomingEvents.length > 0 && <Link to="/community/events" className="rail-creators-cta">{t.rightRail.seeAllEvents}</Link>}
      </div>

      <div className="rail-card">
        <div className="rail-card-header"><Sparkles size={14} /><span>{t.rightRail.communityStars}</span></div>
        <ul className="rail-suggested-list">
          {meta.suggestedCreators.slice(0, 4).map((c) => (
            <li key={c.id} className="rail-suggested-item">
              <span className="rail-suggested-avatar">{c.name.charAt(0).toUpperCase()}</span>
              <div className="rail-suggested-info">
                <strong>{c.name}</strong>
                <span>{c.specialty} · {c.works} {t.rightRail.works}</span>
              </div>
              <FollowButton targetId={c.id} type="creator" size="sm" variant="icon" />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}