import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, Search, X, Sparkles, CheckCircle2, Clock,
  Edit3, Trash2, CalendarPlus, History,
} from 'lucide-react';
import ParticlesCanvas from '../../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../../shared/effects/FloatingShapes';
import { useCurrentUserWithLoading } from '../../../core/hooks/useCurrentUser';
import {
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  type CommunityEvent,
} from '../../../core/services/eventService';
import { EventCard, EventEditor } from '../../events';
import { SupervisorHeader, SupervisorPageShell, SupervisorToast } from '../components';
import { formatRelativeTime } from '../../../core/utils/format';
import '../../../styles/home-style.css';
import '../../../styles/profile-style.css';
import '../../../styles/panel-style.css';
import '../../../styles/supervisor-style.css';
import '../../../styles/supervisor-pages-style.css';
import '../../../styles/events-reader-style.css';
import '../../../styles/event-editor-style.css';
import { useT } from '../../../config/i18n';

type StatusFilter = 'all' | 'upcoming' | 'past';
type SortMode = 'date' | 'created';

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function SupervisorEvents() {
  const t = useT();
  const { user, loading: authLoading } = useCurrentUserWithLoading();
  const navigate = useNavigate();

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('date');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityEvent | null>(null);

  const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: t.events.allEvents },
    { id: 'upcoming', label: t.events.upcoming },
    { id: 'past', label: t.events.past },
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/let-go', { replace: true });
      return;
    }
    if (user.role !== 'supervisor') navigate('/supervisor', { replace: true });
  }, [user, authLoading, navigate]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await getEvents();
    setEvents(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role === 'supervisor') void refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (event: CommunityEvent) => {
    setEditing(event);
    setEditorOpen(true);
  };

  const handleSave = async (payload: Partial<CommunityEvent>) => {
    if (editing) {
      const result = await updateEvent(editing.id, payload);
      if (!result) {
        setToast('Could not update event.');
        return;
      }
      setToast(`Event "${result.title}" updated.`);
    } else {
      const result = await addEvent({
        title: payload.title ?? '',
        host: payload.host ?? '',
        date: payload.date ?? '',
        location: payload.location ?? '',
        description: payload.description,
        category: payload.category,
        featured: payload.featured,
        attendees: payload.attendees,
        price: payload.price,
        design: payload.design,
        createdBy: user?.id,
        createdByName: user?.name,
      });
      if (!result) {
        setToast('Could not create event.');
        return;
      }
      setToast(`Event "${result.title}" published.`);
    }
    setEditorOpen(false);
    setEditing(null);
    await refresh();
  };

  const handleDelete = async (event: CommunityEvent) => {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    const ok = await deleteEvent(event.id);
    if (ok) {
      setToast(`Event "${event.title}" deleted.`);
      await refresh();
    }
  };

  const counts = useMemo(() => {
    const now = Date.now();
    const upcoming = events.filter((e) => new Date(e.date).getTime() >= now).length;
    return { all: events.length, upcoming, past: events.length - upcoming };
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();

    let list = events.filter((e) => {
      if (statusFilter === 'upcoming' && new Date(e.date).getTime() < now) return false;
      if (statusFilter === 'past' && new Date(e.date).getTime() >= now) return false;
      if (q) {
        const hay = [e.title, e.host, e.location, e.description ?? '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortMode === 'created') {
      list = list
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        );
    } else {
      list = list
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return list;
  }, [events, query, statusFilter, sortMode]);

  const hasFilters = query.trim() !== '' || statusFilter !== 'all';

  if (authLoading || !user || user.role !== 'supervisor') return null;

  return (
    <>
      <div className="home-bg">
        <ParticlesCanvas />
        <FloatingShapes />
        <div className="bg-overlay" />
      </div>

      <SupervisorHeader active="home" />

      <SupervisorPageShell
        tag="Console"
        tagIcon={<Calendar size={12} />}
        title={t.events.studio}
        subtitle={`${counts.upcoming} ${t.events.upcoming} · ${counts.past} ${t.events.past} · ${counts.all} ${t.events.total}`}
        actions={
          <button
            type="button"
            className="supervisor-page-action primary"
            onClick={openCreate}
          >
            <Plus size={14} /> {t.events.newEvent}
          </button>
        }
      >
        <div className="supervisor-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder={t.events.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="supervisor-search-clear"
              onClick={() => setQuery('')}
              aria-label={t.events.clearFilters}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="supervisor-chips">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`supervisor-chip ${statusFilter === f.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.id)}
            >
              <span>{f.label}</span>
              <span className="supervisor-chip-count">{counts[f.id]}</span>
            </button>
          ))}
          <span className="supervisor-chip-divider" />
          <button
            type="button"
            className={`supervisor-chip ${sortMode === 'date' ? 'active' : ''}`}
            onClick={() => setSortMode('date')}
          >
            <Clock size={12} />
            <span>By date</span>
          </button>
          <button
            type="button"
            className={`supervisor-chip ${sortMode === 'created' ? 'active' : ''}`}
            onClick={() => setSortMode('created')}
          >
            <History size={12} />
            <span>Recently created</span>
          </button>
          {hasFilters && (
            <button
              type="button"
              className="supervisor-chip reset"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
              }}
            >
              <X size={12} />
              <span>{t.events.resetFilters}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="supervisor-empty">
            <Calendar size={28} />
            <p>{t.events.loading}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="supervisor-empty">
            <CalendarPlus size={28} />
            <p>{t.events.noMatch}</p>
            <span>{t.events.tryAnother}</span>
            <button type="button" className="supervisor-empty-cta" onClick={openCreate}>
              <Plus size={13} /> {t.events.newEvent}
            </button>
          </div>
        ) : (
          <>
            <div className="supervisor-events-history-head">
              <History size={14} />
              <span>
                History · {filtered.length} event{filtered.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="events-history-grid">
              {filtered.map((event) => {
                const past = new Date(event.date).getTime() < Date.now();
                return (
                  <div
                    key={event.id}
                    className={`events-history-item ${past ? 'is-past' : ''}`}
                  >
                    <EventCard event={event} />

                    <div className="events-history-actions">
                      <div className="events-history-status">
                        {past ? (
                          <><CheckCircle2 size={11} /><span>{t.events.past}</span></>
                        ) : (
                          <><Sparkles size={11} /><span>{t.events.upcoming}</span></>
                        )}
                        <span className="dot">·</span>
                        <span>{formatEventDate(event.date)}</span>
                        {event.createdAt && (
                          <>
                            <span className="dot">·</span>
                            <span>
                              Created {formatRelativeTime(event.createdAt)}
                              {event.createdByName ? ` by ${event.createdByName}` : ''}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="events-history-buttons">
                        <button type="button" className="events-history-btn" onClick={() => openEdit(event)}>
                          <Edit3 size={12} /> Edit
                        </button>
                        <button type="button" className="events-history-btn danger" onClick={() => handleDelete(event)}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SupervisorPageShell>

      <EventEditor
        open={editorOpen}
        initial={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />

      {toast && <SupervisorToast message={toast} />}
    </>
  );
}