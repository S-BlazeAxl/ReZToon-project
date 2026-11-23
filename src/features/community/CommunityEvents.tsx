import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Home as HomeIcon, Trophy, Calendar, MapPin, Search, X,
  Sparkles, CheckCircle2, Clock, Filter, ArrowLeft,
} from 'lucide-react';
import ParticlesCanvas from '../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../shared/effects/FloatingShapes';
import ProfileAvatar from '../../shared/layout/ProfileAvatar';
import SearchPanel from '../../shared/panels/SearchPanel';
import CreatorPanel from '../../shared/panels/CreatorPanel';
import NotificationsPanel from '../../shared/panels/NotificationsPanel';
import MessagesPanel from '../../shared/panels/MessagesPanel';
import LanguageSwitcher from '../../shared/ui/LanguageSwitcher';
import LiteModeToggle from '../../shared/ui/LiteModeToggle';
import {
  getEvents,
  CATEGORY_COLORS,
} from '../../core/services/eventService';
import type {
  CommunityEvent,
  EventCategory,
} from '../../core/services/eventService';
import { getFooter } from '../../core/services/catalogueService';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { useT, useI18n } from '../../config/i18n';
import '../../styles/home-style.css';
import '../../styles/profile-style.css';
import '../../styles/panel-style.css';
import '../../styles/pwa-style.css';
import '../../styles/events-reader-style.css';

const FOOTER = getFooter();

type StatusFilter = 'all' | 'upcoming' | 'past';
type CategoryFilter = 'all' | EventCategory;

function resolveLocale(lang: string): string {
  return lang === 'fr' ? 'fr-FR' : 'en-GB';
}

function formatEventDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatShortDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function CommunityEvents() {
  const user = useCurrentUser();
  const t = useT();
  const { lang } = useI18n();
  const locale = resolveLocale(lang);

  const [menuOpen, setMenuOpen] = useState(false);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const isCreator = user?.role === 'creator' || user?.role === 'both';
  const isSupervisor = user?.role === 'supervisor';
  const hasCreatorAccess = isCreator || isSupervisor;

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const data = await getEvents();
      if (!cancelled) {
        setEvents(data);
        setLoading(false);
      }
    };
    void refresh();
    window.addEventListener('focus', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const counts = useMemo(() => {
    const now = Date.now();
    const upcoming = events.filter((e) => new Date(e.date).getTime() >= now).length;
    return { all: events.length, upcoming, past: events.length - upcoming };
  }, [events]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const key = e.category ?? 'other';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const availableCategories = useMemo<EventCategory[]>(() => {
    const set = new Set<EventCategory>();
    for (const e of events) {
      if (e.category) set.add(e.category);
    }
    return [...set];
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();

    let list = events.filter((e) => {
      const time = new Date(e.date).getTime();
      if (statusFilter === 'upcoming' && time < now) return false;
      if (statusFilter === 'past' && time >= now) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (q) {
        const hay = [e.title, e.host, e.location, e.description ?? '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = list
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return list;
  }, [events, query, statusFilter, categoryFilter]);

  const hasFilters =
    query.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all';

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  return (
    <>
      <div className="home-bg">
        <ParticlesCanvas />
        <FloatingShapes />
        <div className="bg-overlay" />
      </div>

      <header className={`home-header ${menuOpen ? 'menu-open' : ''}`}>
        <div className="container header-container">
          <div className="header-brand-group">
            <Link to="/home" className="logo" onClick={() => setMenuOpen(false)}>
              {FOOTER.brand}
            </Link>
            <Link to="/home" className="header-icon-btn" onClick={() => setMenuOpen(false)} aria-label={t.common.home}>
              <HomeIcon size={18} />
            </Link>
            <Link to="/community" className="header-icon-btn" onClick={() => setMenuOpen(false)} aria-label={t.common.community}>
              <Users size={18} />
            </Link>
            <Link to="/awards" className="header-icon-btn" onClick={() => setMenuOpen(false)} aria-label={t.awards.title}>
              <Trophy size={18} />
            </Link>
          </div>
          <button
            className={`nav-toggle ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t.nav.menu}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`header-actions ${menuOpen ? 'open' : ''}`}>
            <SearchPanel />
            {hasCreatorAccess && <CreatorPanel />}
            <LiteModeToggle />
            <LanguageSwitcher />
            {!isSupervisor && <NotificationsPanel />}
            {!isSupervisor && <MessagesPanel />}
            <ProfileAvatar />
          </div>
        </div>
      </header>

      <main className="community-events-page">
        <Link to="/community" className="community-events-back">
          <ArrowLeft size={14} /> {t.common.back}
        </Link>

        <header className="community-events-header">
          <span className="community-events-tag">
            <Calendar size={12} /> {t.events.title}
          </span>
          <h1 className="community-events-title">{t.events.allEvents}</h1>
          <p className="community-events-subtitle">
            {counts.upcoming} {t.events.upcoming} · {counts.past} {t.events.past} · {counts.all} {t.events.total}
          </p>
        </header>

        <div className="community-events-toolbar">
          <div className="community-events-search">
            <Search size={15} />
            <input
              type="text"
              placeholder={t.events.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="community-events-search-clear"
                onClick={() => setQuery('')}
                aria-label={t.common.close}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="community-events-chips">
            <span className="community-events-chips-label">
              <Filter size={11} /> {t.events.status}
            </span>
            <button
              type="button"
              className={`community-events-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              {t.events.all}
              <span className="community-events-chip-count">{counts.all}</span>
            </button>
            <button
              type="button"
              className={`community-events-chip ${statusFilter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setStatusFilter('upcoming')}
            >
              <Sparkles size={11} /> {t.events.upcoming}
              <span className="community-events-chip-count">{counts.upcoming}</span>
            </button>
            <button
              type="button"
              className={`community-events-chip ${statusFilter === 'past' ? 'active' : ''}`}
              onClick={() => setStatusFilter('past')}
            >
              <CheckCircle2 size={11} /> {t.events.past}
              <span className="community-events-chip-count">{counts.past}</span>
            </button>
          </div>

          {availableCategories.length > 0 && (
            <div className="community-events-chips">
              <span className="community-events-chips-label">
                <Calendar size={11} /> {t.events.category}
              </span>
              <button
                type="button"
                className={`community-events-chip ${categoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('all')}
              >
                {t.events.all}
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`community-events-chip ${categoryFilter === cat ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                  style={
                    categoryFilter === cat
                      ? {
                        background: `${CATEGORY_COLORS[cat]}20`,
                        borderColor: CATEGORY_COLORS[cat],
                        color: CATEGORY_COLORS[cat],
                      }
                      : undefined
                  }
                >
                  <span
                    className="community-events-chip-dot"
                    style={{ background: CATEGORY_COLORS[cat] }}
                  />
                  {t.events.categories[cat]}
                  <span className="community-events-chip-count">
                    {categoryCounts.get(cat) ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}

          {hasFilters && (
            <button type="button" className="community-events-reset" onClick={resetFilters}>
              <X size={12} /> {t.events.resetFilters}
            </button>
          )}
        </div>

        {loading ? (
          <div className="community-events-empty">
            <Calendar size={32} />
            <p>{t.events.loading}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="community-events-empty">
            <Calendar size={32} />
            <p>{t.events.noMatch}</p>
            <span>{t.events.tryAnother}</span>
            {hasFilters && (
              <button type="button" className="community-events-empty-cta" onClick={resetFilters}>
                {t.events.clearFilters}
              </button>
            )}
          </div>
        ) : (
          <div className="community-events-grid">
            {filtered.map((event) => {
              const past = new Date(event.date).getTime() < Date.now();
              const cat = event.category ?? 'festival';
              const accent = CATEGORY_COLORS[cat];
              const design = event.design;

              return (
                <article
                  key={event.id}
                  className={`community-event-card ${past ? 'is-past' : ''}`}
                >
                  <div
                    className="community-event-cover"
                    style={{
                      background: design?.image
                        ? `linear-gradient(135deg, ${accent}40, rgba(13,13,26,0.85)), url(${design.image}) center/cover`
                        : `linear-gradient(135deg, ${accent}30, rgba(13,13,26,0.9))`,
                      borderColor: `${accent}60`,
                    }}
                  >
                    <span
                      className="community-event-badge"
                      style={{ background: accent, color: '#0d0d1a' }}
                    >
                      {t.events.categories[cat]}
                    </span>
                    <span className={`community-event-status ${past ? 'past' : 'upcoming'}`}>
                      {past ? (
                        <>
                          <CheckCircle2 size={10} /> {t.events.past}
                        </>
                      ) : (
                        <>
                          <Sparkles size={10} /> {t.events.upcoming}
                        </>
                      )}
                    </span>
                  </div>

                  <div className="community-event-body">
                    <h3 className="community-event-title">{event.title}</h3>
                    <span className="community-event-host">{t.events.by} {event.host}</span>

                    {event.description && (
                      <p className="community-event-desc">{event.description}</p>
                    )}

                    <div className="community-event-meta">
                      <span>
                        <Calendar size={11} />
                        {formatShortDate(event.date, locale)}
                      </span>
                      <span>
                        <MapPin size={11} />
                        {event.location}
                      </span>
                    </div>

                    <div className="community-event-foot">
                      <span className="community-event-full-date">
                        <Clock size={10} />
                        {formatEventDate(event.date, locale)}
                      </span>
                      {event.price && (
                        <span
                          className="community-event-price"
                          style={{ color: accent, borderColor: `${accent}50` }}
                        >
                          {event.price}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}