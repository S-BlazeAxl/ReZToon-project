import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, BookOpen, TrendingUp, Clock, Star, Loader2 } from 'lucide-react';
import { searchMangas, getAllMangas, type Manga } from '../../core/services/mangaService';
import { getPopularCards } from '../../core/services/catalogueService';
import { getIcon } from '../ui/Icon';
import SearchFilters, {
  EMPTY_FILTERS,
  type SearchFilterState,
  FILTER_LENGTH_RANGES,
} from './SearchFilters';
import type { PopularCardData } from '../../config/types';
import { useT } from '../../config/i18n';
import '../../styles/panel-style.css';

const RECENT_KEY = 'reztoon_recent_searches';
const MAX_RESULTS = 50;

export default function SearchPanel() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilterState>({ ...EMPTY_FILTERS });
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [mangas, setMangas] = useState<Manga[]>([]);
  const [trending, setTrending] = useState<PopularCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const hasFilters = filters.genres.length > 0 || filters.statuses.length > 0 || filters.lengthRange !== null || filters.minRating > 0;

  useEffect(() => {
    if (!open) return;
    let isCancelled = false;
    async function fetchData() {
      const data = await getPopularCards();
      if (!isCancelled) {
        setTrending(data.slice(0, 4));
        setInitialLoad(false);
      }
    }
    fetchData();
    return () => { isCancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();

    if (!q) {
      if (hasFilters) {
        let isCancelled = false;
        setLoading(true);
        getAllMangas().then((data) => {
          if (!isCancelled) {
            setMangas(data);
            setLoading(false);
          }
        });
        return () => { isCancelled = true; };
      } else {
        setMangas([]);
        return;
      }
    }

    let isCancelled = false;
    setLoading(true);
    
    const timer = setTimeout(async () => {
      const results = await searchMangas(q);
      if (!isCancelled) {
        setMangas(results);
        setLoading(false);
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, filters, hasFilters]);

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) setRecent(parsed.slice(0, 5));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  const persistRecent = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(0, 5);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const goToManga = (mangaId: string, title: string) => {
    persistRecent(title);
    setOpen(false);
    navigate(`/manga/${mangaId}`);
  };

  const clearRecent = () => {
    setRecent([]);
    localStorage.removeItem(RECENT_KEY);
  };

  const trimmedQuery = query.trim().toLowerCase();

  const filtered = mangas.filter((m) => {
    if (filters.genres.length > 0 && !filters.genres.includes(m.genre)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(m.status)) return false;
    if (filters.lengthRange) {
      const range = FILTER_LENGTH_RANGES.find((r) => r.id === filters.lengthRange);
      if (range && ((m.chapters?.length || 0) < range.min || (m.chapters?.length || 0) > range.max)) return false;
    }
    if (filters.minRating > 0 && m.rating < filters.minRating) return false;
    return true;
  }).sort((a, b) => {
    switch (filters.sort) {
      case 'rating': return b.rating - a.rating;
      case 'reads': return b.reads - a.reads;
      case 'likes': return b.likes - a.likes;
      case 'alpha': return a.title.localeCompare(b.title);
      default: return 0;
    }
  });

  const hasQuery = trimmedQuery.length > 0;
  const showResults = hasQuery || hasFilters;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (filtered.length > 0) {
      goToManga(filtered[0].id, filtered[0].title);
    } else if (trimmedQuery) {
      persistRecent(query);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`header-icon-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={t.common.search}
      >
        <Search size={18} />
      </button>

      {open &&
        createPortal(
          <div className="panel-anchor">
            <div className="panel panel-search panel-opaque" ref={panelRef}>
              <header className="panel-header">
                <div className="panel-header-title">
                  <Search size={16} />
                  <h3>{t.common.search}</h3>
                </div>
                <div className="panel-header-actions">
                  <button
                    type="button"
                    className="panel-icon-btn"
                    onClick={() => setOpen(false)}
                    aria-label={t.common.close}
                  >
                    <X size={14} />
                  </button>
                </div>
              </header>

              <form className="search-form" onSubmit={handleSubmit}>
                <div className="search-input-wrap">
                  <Search size={14} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={t.search.placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {loading && <Loader2 size={14} className="spin" />}
                  {query && !loading && (
                    <button
                      type="button"
                      className="search-clear"
                      onClick={() => setQuery('')}
                      aria-label={t.search.clear}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </form>

              <SearchFilters
                filters={filters}
                onChange={setFilters}
                compact
              />

              <div className="panel-body">
                {initialLoad ? (
                  <div className="panel-empty">
                    <p>{t.common.loading}</p>
                  </div>
                ) : showResults ? (
                  filtered.length === 0 ? (
                    <div className="panel-empty">
                      <Search size={28} />
                      <p>{t.search.noResults}</p>
                      <span>{t.search.tryOther}</span>
                    </div>
                  ) : (
                    <>
                      <div className="search-section-title">
                        <BookOpen size={12} /> {t.search.results}
                        <span className="search-count">{filtered.length}</span>
                      </div>
                      <ul className="search-list">
                        {filtered.slice(0, MAX_RESULTS).map((m) => {
                          const IconCmp = getIcon(m.cover);
                          return (
                            <li
                              key={m.id}
                              className="search-item"
                              onClick={() => goToManga(m.id, m.title)}
                            >
                              <span className="search-item-emoji">
                                <IconCmp size={18} />
                              </span>
                              <div className="search-item-info">
                                <strong>{m.title}</strong>
                                <span>
                                  {m.author} · {m.genre} · {m.chapters?.length || 0} {t.common.chapterShort}
                                </span>
                                <span className="search-item-rating">
                                  <Star size={10} fill="currentColor" />{' '}
                                  {m.rating.toFixed(1)}
                                </span>
                              </div>
                              <span className="search-item-tag">{m.tag}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )
                ) : (
                  <>
                    {recent.length > 0 && (
                      <>
                        <div className="search-section-title">
                          <Clock size={12} /> {t.search.recent}
                          <button
                            type="button"
                            className="search-clear-recent"
                            onClick={clearRecent}
                          >
                            {t.search.clear}
                          </button>
                        </div>
                        <ul className="search-list">
                          {recent.map((r) => (
                            <li
                              key={r}
                              className="search-recent-item"
                              onClick={() => setQuery(r)}
                            >
                              <Clock size={12} />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {trending.length > 0 && (
                      <>
                        <div className="search-section-title">
                          <TrendingUp size={12} /> {t.search.trending}
                        </div>
                        <ul className="search-list">
                          {trending.map((c) => {
                            const IconCmp = getIcon(c.icon);
                            return (
                              <li
                                key={c.id}
                                className="search-item"
                                onClick={() => goToManga(c.id, c.title)}
                              >
                                <span className="search-item-emoji">
                                  <IconCmp size={18} />
                                </span>
                                <div className="search-item-info">
                                  <strong>{c.title}</strong>
                                  <span>
                                    {c.tag} · {c.sub}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}