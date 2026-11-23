import { ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useGenres } from '../../core/hooks/useGenres';
import { useT } from '../../config/i18n';

export interface SearchFilterState {
  genres: string[];
  statuses: string[];
  lengthRange: string | null;
  minRating: number;
  sort: string;
}

export const EMPTY_FILTERS: SearchFilterState = {
  genres: [],
  statuses: [],
  lengthRange: null,
  minRating: 0,
  sort: 'relevance',
};

export const FILTER_LENGTH_RANGES = [
  { id: 'short', min: 0, max: 20 },
  { id: 'medium', min: 20, max: 50 },
  { id: 'long', min: 50, max: 9999 },
];

interface Props {
  filters: SearchFilterState;
  onChange: (next: SearchFilterState) => void;
  compact?: boolean;
}

export default function SearchFilters({ filters, onChange, compact = false }: Props) {
  const t = useT();
  const { names: genreNames } = useGenres();
  const [open, setOpen] = useState(!compact);

  const FILTER_DATA = {
    genres: genreNames.map((name) => ({ id: name, label: name })),
    statuses: [
      { id: 'ongoing', label: t.mangaDetail.statusOngoing },
      { id: 'completed', label: t.mangaDetail.statusCompleted },
      { id: 'hiatus', label: t.mangaDetail.statusHiatus },
    ],
    lengthRanges: [
      { id: 'short', label: t.search.lengthShort, min: 0, max: 20 },
      { id: 'medium', label: t.search.lengthMedium, min: 20, max: 50 },
      { id: 'long', label: t.search.lengthLong, min: 50, max: 9999 },
    ],
    sortOptions: [
      { id: 'relevance', label: t.search.sortRelevance },
      { id: 'recent', label: t.search.sortRecent },
      { id: 'rating', label: t.search.sortRating },
      { id: 'reads', label: t.search.sortReads },
      { id: 'likes', label: t.search.sortLikes },
      { id: 'alpha', label: t.search.sortAlpha },
    ],
  };

  const activeCount =
    filters.genres.length +
    filters.statuses.length +
    (filters.lengthRange ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.sort !== 'relevance' ? 1 : 0);

  const toggleArray = <K extends 'genres' | 'statuses'>(
    key: K,
    value: string,
  ) => {
    const current = filters[key] as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  const resetAll = () => onChange({ ...EMPTY_FILTERS });

  return (
    <div className={`search-filters ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className="search-filters-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal size={14} />
        <span>{t.search.filters}</span>
        {activeCount > 0 && (
          <span className="search-filters-badge">{activeCount}</span>
        )}
        <ChevronDown size={13} className={open ? 'up' : ''} />
      </button>

      {open && (
        <div className="search-filters-body">
          <div className="search-filters-group">
            <label className="search-filters-label">{t.search.genres}</label>
            <div className="search-filters-chips">
              {FILTER_DATA.genres.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`search-filter-chip ${
                    filters.genres.includes(g.id) ? 'active' : ''
                  }`}
                  onClick={() => toggleArray('genres', g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="search-filters-group">
            <label className="search-filters-label">{t.search.status}</label>
            <div className="search-filters-chips">
              {FILTER_DATA.statuses.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`search-filter-chip ${
                    filters.statuses.includes(s.id) ? 'active' : ''
                  }`}
                  onClick={() => toggleArray('statuses', s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="search-filters-group">
            <label className="search-filters-label">{t.search.length}</label>
            <div className="search-filters-chips">
              {FILTER_DATA.lengthRanges.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`search-filter-chip ${
                    filters.lengthRange === r.id ? 'active' : ''
                  }`}
                  onClick={() =>
                    onChange({
                      ...filters,
                      lengthRange: filters.lengthRange === r.id ? null : r.id,
                    })
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="search-filters-group">
            <label className="search-filters-label">
              {t.search.minRating}: <strong>{filters.minRating.toFixed(1)}</strong> ⭐
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={filters.minRating}
              onChange={(e) =>
                onChange({ ...filters, minRating: Number(e.target.value) })
              }
              className="search-filters-range"
            />
          </div>

          <div className="search-filters-group">
            <label className="search-filters-label">{t.search.sortBy}</label>
            <div className="search-filters-chips">
              {FILTER_DATA.sortOptions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`search-filter-chip ${
                    filters.sort === s.id ? 'active' : ''
                  }`}
                  onClick={() => onChange({ ...filters, sort: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              className="search-filters-reset"
              onClick={resetAll}
            >
              <X size={12} /> {t.search.reset}
            </button>
          )}
        </div>
      )}
    </div>
  );
}