import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, Eye, Heart, UserCheck, ChevronLeft, ChevronRight, MapPin, Compass, RefreshCw,
} from 'lucide-react';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { useHorizontalScroll } from '../../core/hooks/useHorizontalScroll';
import { getFollowedMangaIds, getFollowedCreatorIds } from '../../core/services/followService';
import { getMangasByIds, type Manga } from '../../core/services/mangaService';
import { getCreatorsByIds, type SuggestedCreator } from '../../core/services/creatorService';
import FollowButton from '../../shared/ui/FollowButton';
import { getIcon } from '../../shared/ui/Icon';
import { formatNumber } from '../../core/utils/format';
import { useT } from '../../config/i18n';

const FOLLOW_EVENT = 'reztoon:follow-change';

type Filter = 'all' | 'creators' | 'mangas';

/** URL d'image (http(s), data:, blob:, chemin absolu) et non un emoji / une initiale. */
function isImageUrl(value?: string | null): value is string {
  return !!value && /^(https?:\/\/|data:image\/|blob:|\/)/i.test(value.trim());
}

/** Teinte stable (0-359) dérivée d'un texte, pour varier la bannière des cartes. */
function hueFrom(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function CreatorAvatar({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  if (isImageUrl(src) && !failed) {
    return (
      <img
        className="following-card-avatar-img"
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  // Emoji court stocké comme avatar, sinon initiale du nom.
  const text = src && !isImageUrl(src) && [...src].length <= 2
    ? src
    : name.trim().charAt(0).toUpperCase() || '?';
  return <span className="following-card-avatar-initial">{text}</span>;
}

function MangaCover({ cover }: { cover: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [cover]);

  if (isImageUrl(cover) && !failed) {
    return (
      <img
        className="following-card-cover-img"
        src={cover}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  const Icon = getIcon(cover);
  return <Icon size={38} />;
}

export default function FollowingFeed() {
  const user = useCurrentUser();
  const userId = user?.id ?? null;
  const t = useT();
  const f = t.followingFeed;

  const [mangas, setMangas] = useState<Manga[]>([]);
  const [creators, setCreators] = useState<SuggestedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [tick, setTick] = useState(0);
  const loadedForRef = useRef<string | null>(null);

  // Un follow / unfollow ailleurs dans l'app (bouton, profil...) rafraîchit la liste.
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener(FOLLOW_EVENT, onChange);
    return () => window.removeEventListener(FOLLOW_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!userId) {
      setMangas([]);
      setCreators([]);
      setLoading(false);
      loadedForRef.current = null;
      return;
    }

    let cancelled = false;
    // Skeleton seulement au premier chargement : pas de clignotement lors d'un refresh.
    if (loadedForRef.current !== userId) setLoading(true);
    setError(false);

    (async () => {
      try {
        const [mangaIds, creatorIds] = await Promise.all([
          getFollowedMangaIds(userId),
          getFollowedCreatorIds(userId),
        ]);
        const [resolvedMangas, resolvedCreators] = await Promise.all([
          getMangasByIds(mangaIds),
          getCreatorsByIds(creatorIds),
        ]);
        if (cancelled) return;
        setMangas(resolvedMangas);
        setCreators(resolvedCreators);
        loadedForRef.current = userId;
      } catch (err) {
        console.error('Failed to load following feed:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, tick]);

  const showCreators = filter !== 'mangas';
  const showMangas = filter !== 'creators';
  const visibleCount = (showCreators ? creators.length : 0) + (showMangas ? mangas.length : 0);

  const { trackRef, canPrev, canNext, isDragging, scrollByAmount, dragHandlers } =
    useHorizontalScroll('.following-card', {
      gap: 16,
      resetKey: `${filter}-${visibleCount}`,
      // Sans ça, le drag capte le mousedown et le bouton Suivre ne reçoit jamais le clic.
      dragIgnoreSelector: '.following-card-action',
    });

  const total = creators.length + mangas.length;
  const subtitle = useMemo(() => {
    const c = `${creators.length} ${creators.length === 1 ? f.creatorOne : f.creatorMany}`;
    const m = `${mangas.length} ${mangas.length === 1 ? f.mangaOne : f.mangaMany}`;
    return `${c} · ${m} ${total === 1 ? f.followedOne : f.followedMany}`;
  }, [creators.length, mangas.length, total, f]);

  if (!user) return null;

  const header = (withNav: boolean) => (
    <header className="following-header">
      <div className="following-heading">
        <span className="following-tag"><UserCheck size={12} /> {f.tag}</span>
        <h2 className="following-title">{f.title}</h2>
        <p className="following-subtitle">{total === 0 ? f.emptySubtitle : subtitle}</p>
      </div>
      {withNav && (
        <div className="annonces-nav">
          <button type="button" className="annonces-arrow" onClick={() => scrollByAmount(-1)}
            disabled={!canPrev} aria-label={t.common.previous}><ChevronLeft size={18} /></button>
          <button type="button" className="annonces-arrow" onClick={() => scrollByAmount(1)}
            disabled={!canNext} aria-label={t.common.next}><ChevronRight size={18} /></button>
        </div>
      )}
    </header>
  );

  if (loading) {
    return (
      <section className="following-section-wrapper" aria-busy="true" aria-label={f.title}>
        {header(false)}
        <div className="following-track" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="following-skeleton" />)}
        </div>
      </section>
    );
  }

  if (error && total === 0) {
    return (
      <section className="following-section-wrapper" aria-label={f.title}>
        {header(false)}
        <div className="following-feed-empty">
          <p>{f.loadError}</p>
          <button type="button" className="following-feed-cta" onClick={() => setTick((n) => n + 1)}>
            <RefreshCw size={14} /> {f.retry}
          </button>
        </div>
      </section>
    );
  }

  if (total === 0) {
    return (
      <section className="following-section-wrapper" aria-label={f.title}>
        {header(false)}
        <div className="following-feed-empty">
          <UserCheck size={28} />
          <p>{f.emptyTitle}</p>
          <span>{f.emptyDesc}</span>
          <Link to="/community" className="following-feed-cta"><Compass size={14} /> {f.discover}</Link>
        </div>
      </section>
    );
  }

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: f.filterAll, count: total },
    { id: 'creators', label: f.filterCreators, count: creators.length },
    { id: 'mangas', label: f.filterMangas, count: mangas.length },
  ];

  return (
    <section className="following-section-wrapper" aria-label={f.title}>
      {header(true)}

      <div className="following-filters" role="tablist" aria-label={f.title}>
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`following-filter ${filter === item.id ? 'active' : ''}`}
            onClick={() => setFilter(item.id)}
            disabled={item.count === 0 && item.id !== 'all'}
          >
            {item.label}
            <span className="following-filter-count">{item.count}</span>
          </button>
        ))}
      </div>

      <div ref={trackRef} className={`following-track ${isDragging ? 'dragging' : ''}`} {...dragHandlers}>
        {showCreators && creators.map((c) => (
          <article
            key={`creator-${c.id}`}
            className="following-card type-creator"
            style={{ '--hue': hueFrom(c.genre || c.name) } as React.CSSProperties}
          >
            <Link to={`/creators/${c.id}`} className="following-card-hit" aria-label={c.name} draggable={false} />
            <div className="following-card-action">
              <FollowButton targetId={c.id} type="creator" variant="icon" labels={{ on: t.common.following, off: t.common.follow }} />
            </div>
            <div className="following-card-banner" aria-hidden="true" />
            <div className="following-card-avatar"><CreatorAvatar src={c.avatar} name={c.name} /></div>
            <div className="following-card-body">
              <strong className="following-card-title">{c.name}</strong>
              <span className="following-card-sub">{c.username ? `@${c.username}` : f.creatorFallback}</span>
              <div className="following-card-metrics">
                {c.genre && <span className="following-card-chip">{c.genre}</span>}
                {c.country && (
                  <span className="following-card-country"><MapPin size={10} /> {c.country}</span>
                )}
              </div>
            </div>
          </article>
        ))}

        {showMangas && mangas.map((m) => (
          <article key={`manga-${m.id}`} className="following-card type-manga">
            <Link to={`/manga/${m.id}`} className="following-card-hit" aria-label={m.title} draggable={false} />
            <div className="following-card-action">
              <FollowButton targetId={m.id} type="manga" variant="icon" labels={{ on: t.common.following, off: t.common.follow }} />
            </div>
            <div className="following-card-cover">
              <MangaCover cover={m.cover} />
              <span className={`following-card-status status-${m.status}`}>{m.status}</span>
            </div>
            <div className="following-card-body">
              <strong className="following-card-title">{m.title}</strong>
              <span className="following-card-sub">{m.author} · {m.genre}</span>
              <div className="following-card-metrics">
                <span><Eye size={10} /> {formatNumber(m.reads)}</span>
                <span><Heart size={10} /> {formatNumber(m.likes)}</span>
                <span><Star size={10} fill="currentColor" /> {m.rating.toFixed(1)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
