import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, User as UserIcon } from 'lucide-react';
import CharacterCard from './CharacterCard';
import { getAllCharacters, getGenresFromCharacters, type MangaCharacter } from '../../core/services/characterService';
import { useHorizontalScroll } from '../../core/hooks/useHorizontalScroll';
import { useT } from '../../config/i18n';

type Filter = 'all' | string;

export default function CharactersCarousel() {
  const t = useT();
  const [filter, setFilter] = useState<Filter>('all');
  const [all, setAll] = useState<MangaCharacter[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      setLoading(true);
      const [charactersData, genresData] = await Promise.all([
        getAllCharacters(),
        getGenresFromCharacters(),
      ]);

      if (!isCancelled) {
        setAll(charactersData);
        setGenres(genresData);
        setLoading(false);
      }
    }

    fetchData();
    return () => { isCancelled = true; };
  }, []);

  const filtered = useMemo<MangaCharacter[]>(() => {
    if (filter === 'all') return all;
    return all.filter((c) => c.genre === filter);
  }, [all, filter]);

  const {
    trackRef,
    canPrev,
    canNext,
    isDragging,
    scrollByAmount,
    dragHandlers,
    resetScroll,
  } = useHorizontalScroll('.character-card', {
    gap: 20,
    dragIgnoreSelector: '.character-hover',
    resetKey: `${filter}|${filtered.length}`,
  });

  useEffect(() => {
    resetScroll();
  }, [filter, resetScroll]);

  if (loading) {
    return (
      <section className="characters-section" aria-label={t.common.loading}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div className="loader-ring" style={{ width: 30, height: 30, borderWidth: 2 }}></div>
        </div>
      </section>
    );
  }

  if (all.length === 0) return null;

  return (
    <section className="characters-section" aria-label={t.characters.galleryAria}>
      <header className="annonces-header characters-header">
        <div className="annonces-heading">
          <span className="annonces-tag characters-tag">
            <UserIcon size={12} /> {t.characters.galleryTag}
          </span>
          <h2 className="annonces-title">{t.characters.galleryTitle}</h2>
          <p className="annonces-subtitle">
            {t.characters.gallerySubtitle}
          </p>
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

      <div className="characters-filters">
        <button
          type="button"
          className={`characters-filter-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <Sparkles size={12} />
          <span>{t.communityFeed.feedFilters.all}</span>
          <span className="characters-filter-count">{all.length}</span>
        </button>

        {genres.map((g) => {
          const count = all.filter((c) => c.genre === g).length;
          if (count === 0) return null;
          const active = filter === g;
          const accent = all.find((c) => c.genre === g)?.accentColor ?? '#f5b042';
          return (
            <button
              key={g}
              type="button"
              className={`characters-filter-chip ${active ? 'active' : ''}`}
              style={
                active
                  ? {
                      background: `${accent}22`,
                      borderColor: accent,
                      color: accent,
                    }
                  : undefined
              }
              onClick={() => setFilter(g)}
            >
              <span>{g}</span>
              <span className="characters-filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={trackRef}
        className={`annonces-track characters-track ${isDragging ? 'dragging' : ''}`}
        {...dragHandlers}
      >
        {filtered.map((character) => (
          <CharacterCard key={character.id} character={character} />
        ))}
      </div>
    </section>
  );
}