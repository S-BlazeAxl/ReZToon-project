import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, PenTool, Users, MapPin, Sparkles,
} from 'lucide-react';
import {
  getSuggestedCreatorsForUser,
  type SuggestedCreator,
} from '../../core/services/creatorService';
import { useHorizontalScroll } from '../../core/hooks/useHorizontalScroll';
import FollowButton from '../../shared/ui/FollowButton';
import { formatNumber } from '../../core/utils/format';
import { useT } from '../../config/i18n';

interface Props {
  userId: string;
  role: 'creator' | 'both' | 'reader' | 'supervisor';
  /** Genres favoris du profil : ils pilotent le classement des suggestions. */
  favoriteGenres?: string[];
}

function isImageUrl(value?: string | null): value is string {
  return !!value && /^(https?:\/\/|data:image\/|blob:|\/)/i.test(value.trim());
}

function CreatorAvatar({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  if (isImageUrl(src) && !failed) {
    return (
      <img
        className="creator-avatar-img"
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return <>{name.trim().charAt(0).toUpperCase() || '?'}</>;
}

export default function SuggestedCreators({ userId, role, favoriteGenres }: Props) {
  const t = useT();
  const s = t.creatorsSuggest;
  const [creators, setCreators] = useState<SuggestedCreator[]>([]);
  const [loading, setLoading] = useState(true);

  const genresKey = favoriteGenres?.join('|') ?? '';
  const genres = genresKey ? genresKey.split('|') : [];

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await getSuggestedCreatorsForUser({
          userId,
          userGenre: null,
          userFavoriteGenres: genresKey ? genresKey.split('|') : undefined,
          limit: 12,
        });
        if (!cancelled) setCreators(data);
      } catch (err) {
        console.error('Failed to load suggested creators:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, genresKey]);

  const {
    trackRef,
    canPrev,
    canNext,
    isDragging,
    scrollByAmount,
    dragHandlers,
  } = useHorizontalScroll('.creator-card', {
    gap: 20,
    resetKey: creators.length,
    // Sans ça, le glisser capte le mousedown : « Voir le profil » et « Suivre » ne reçoivent jamais le clic.
    dragIgnoreSelector: 'a, button',
  });

  if (loading) {
    return (
      <section className="creators-section">
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t.common.loading}
        </div>
      </section>
    );
  }

  if (creators.length === 0) return null;

  const isCreatorProfile = role === 'creator' || role === 'both';
  const subtitleText = genres.length > 0
    ? s.basedOnGenres.replace('{genres}', genres.slice(0, 4).join(', '))
    : isCreatorProfile ? s.subtitleCreator : s.subtitleReader;

  return (
    <section className="creators-section" aria-label={t.home.suggestedCreators}>
      <header className="creators-header">
        <div className="creators-heading">
          <span className="creators-tag">
            <Sparkles size={12} />{' '}
            {isCreatorProfile ? s.tagCollab : s.tagFollow}
          </span>
          <h2 className="creators-title">{t.home.suggestedCreators}</h2>
          <p className="creators-subtitle">{subtitleText}</p>
          {genres.length === 0 && <p className="creators-hint">{s.addGenresHint}</p>}
        </div>

        <div className="annonces-nav">
          <button
            type="button"
            className="annonces-arrow"
            onClick={() => scrollByAmount(-1)}
            disabled={!canPrev}
            aria-label={t.common.previous}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="annonces-arrow"
            onClick={() => scrollByAmount(1)}
            disabled={!canNext}
            aria-label={t.common.next}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div
        ref={trackRef}
        className={`annonces-track creators-track ${isDragging ? 'dragging' : ''}`}
        {...dragHandlers}
      >
        {creators.map((creator) => {
          const matched = creator.matchedGenres ?? [];
          return (
            <article key={creator.id} className="creator-card">
              <div className="creator-card-head">
                <div className="creator-avatar">
                  <CreatorAvatar src={creator.avatar} name={creator.name} />
                </div>

                <div className="creator-card-title">
                  <h3>{creator.name}</h3>
                  <span className="creator-username">
                    {creator.username ? `@${creator.username}` : s.creatorFallback}
                  </span>

                  {/* Statistiques déplacées dans l'en-tête, à droite de l'avatar. */}
                  <div className="creator-card-stats">
                    <span title={s.works}>
                      <PenTool size={11} />
                      <strong>{creator.works?.length || 0}</strong> {s.works}
                    </span>
                    <span title={s.followersLabel}>
                      <Users size={11} />
                      <strong>{formatNumber(creator.followers)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="creator-card-meta">
                <span className={`creator-genre-chip ${matched.length > 0 ? 'match' : ''}`}>
                  {matched.length > 0 && <Sparkles size={10} />} {creator.genre}
                </span>
                {matched.slice(1, 3).map((g) => (
                  <span key={g} className="creator-genre-chip match">{g}</span>
                ))}
                {creator.country && (
                  <span className="creator-country">
                    <MapPin size={10} /> {creator.country}
                  </span>
                )}
              </div>

              {matched.length > 0 && <p className="creator-card-match">{s.matchesTaste}</p>}

              {creator.bio && <p className="creator-card-bio">{creator.bio}</p>}

              <div className="creator-card-actions">
                <Link to={`/creators/${creator.id}`} className="creator-btn view">
                  {s.viewProfile}
                </Link>
                <FollowButton
                  targetId={creator.id}
                  type="creator"
                  size="sm"
                  variant="outline"
                  labels={{ on: t.common.following, off: t.common.follow }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
