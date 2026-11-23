import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Palette, Plus, Search, X, Edit3, Trash2, Eye, EyeOff,
  ChevronUp, ChevronDown, Database, Info,
} from 'lucide-react';
import ParticlesCanvas from '../../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../../shared/effects/FloatingShapes';
import { useCurrentUserWithLoading } from '../../../core/hooks/useCurrentUser';
import { useGenres } from '../../../core/hooks/useGenres';
import {
  createGenre,
  updateGenre,
  deleteGenre,
  setGenreActive,
  moveGenre,
  seedDefaultGenres,
  refreshGenres,
  getGenreUsageMap,
  type Genre,
  type GenreInput,
  type GenreUsage,
} from '../../../core/services/genreService';
import { DEFAULT_GENRES } from '../../../config/constants/genres';
import { SupervisorHeader, SupervisorPageShell, SupervisorToast } from '../components';
import GenreEditorModal from '../components/GenreEditorModal';
import GenreDeleteModal from '../components/GenreDeleteModal';
import '../../../styles/home-style.css';
import '../../../styles/profile-style.css';
import '../../../styles/panel-style.css';
import '../../../styles/supervisor-style.css';
import '../../../styles/supervisor-pages-style.css';
import '../../../styles/events-reader-style.css';
import '../../../styles/supervisor-genres-style.css';
import { useT, useI18n } from '../../../config/i18n';

type Filter = 'all' | 'active' | 'hidden';

const MAIN_IDS = new Set(DEFAULT_GENRES.map((g) => g.id));

export default function SupervisorGenres() {
  const t = useT();
  const g = t.genresAdmin;
  const { lang } = useI18n();
  const { user, loading: authLoading } = useCurrentUserWithLoading();
  const navigate = useNavigate();

  const { genres, loading, fromDb } = useGenres({ includeInactive: true });
  const [usage, setUsage] = useState<Record<string, GenreUsage>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Genre | null>(null);
  const [deleting, setDeleting] = useState<Genre | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/let-go', { replace: true });
      return;
    }
    if (user.role !== 'supervisor') navigate('/home', { replace: true });
  }, [user, authLoading, navigate]);

  const reload = useCallback(async () => {
    await refreshGenres();
    try {
      setUsage(await getGenreUsageMap());
    } catch {
      /* les compteurs d'usage sont optionnels */
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'supervisor') void reload();
  }, [user, reload]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const counts = useMemo(() => {
    const active = genres.filter((x) => x.isActive).length;
    return { all: genres.length, active, hidden: genres.length - active };
  }, [genres]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return genres.filter((x) => {
      if (filter === 'active' && !x.isActive) return false;
      if (filter === 'hidden' && x.isActive) return false;
      if (!q) return true;
      return [x.name, x.equivalent, x.tag, x.descriptionFr, x.descriptionEn]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [genres, query, filter]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (genre: Genre) => {
    setEditing(genre);
    setEditorOpen(true);
  };

  const handleSave = async (input: GenreInput): Promise<string | null> => {
    const res = editing ? await updateGenre(editing.id, input) : await createGenre(input);
    if (!res.ok) return res.error ?? 'Erreur inconnue';
    const name = res.data?.name ?? input.name;
    setToast((editing ? g.updated : g.created).replace('{{name}}', name));
    setEditorOpen(false);
    setEditing(null);
    await reload();
    return null;
  };

  const handleDelete = async (reassignTo?: string): Promise<string | null> => {
    if (!deleting) return null;
    const res = await deleteGenre(deleting.id, reassignTo);
    if (!res.ok) return res.error ?? 'Erreur inconnue';
    setToast(g.deleted.replace('{{name}}', deleting.name));
    setDeleting(null);
    await reload();
    return null;
  };

  const toggleActive = async (genre: Genre) => {
    const res = await setGenreActive(genre.id, !genre.isActive);
    if (!res.ok) {
      setToast(`${g.failed} ${res.error}`);
      return;
    }
    setToast((genre.isActive ? g.toggledOff : g.toggledOn).replace('{{name}}', genre.name));
  };

  const move = async (genre: Genre, dir: -1 | 1) => {
    const res = await moveGenre(genre.id, dir);
    if (!res.ok) setToast(`${g.failed} ${res.error}`);
  };

  const seed = async () => {
    const res = await seedDefaultGenres();
    setToast(res.ok ? g.seedDone : `${g.failed} ${res.error}`);
    if (res.ok) await reload();
  };

  if (authLoading || !user || user.role !== 'supervisor') return null;

  const describe = (x: Genre) =>
    (lang === 'fr' ? x.descriptionFr || x.descriptionEn : x.descriptionEn || x.descriptionFr) || '—';

  const usageChips = (x: Genre) => {
    const u = usage[x.name];
    if (!u || u.series + u.groups + u.posts + u.characters === 0) return [g.unused];
    const chips: string[] = [];
    if (u.series) chips.push(g.usedSeries.replace('{{n}}', String(u.series)));
    if (u.groups) chips.push(g.usedGroups.replace('{{n}}', String(u.groups)));
    if (u.posts) chips.push(g.usedPosts.replace('{{n}}', String(u.posts)));
    if (u.characters) chips.push(g.usedCharacters.replace('{{n}}', String(u.characters)));
    return chips;
  };

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: g.filterAll },
    { id: 'active', label: g.filterActive },
    { id: 'hidden', label: g.filterInactive },
  ];

  return (
    <>
      <div className="home-bg">
        <ParticlesCanvas />
        <FloatingShapes />
        <div className="bg-overlay" />
      </div>

      <SupervisorHeader active="home" />

      <SupervisorPageShell
        tag={g.tag}
        tagIcon={<Palette size={12} />}
        title={g.title}
        subtitle={`${counts.active} ${g.filterActive.toLowerCase()} · ${counts.hidden} ${g.filterInactive.toLowerCase()} · ${counts.all} ${g.total}`}
        actions={
          <button type="button" className="supervisor-page-action" onClick={openCreate}>
            <Plus size={14} /> {g.newGenre}
          </button>
        }
      >
        <span className="gen-impact"><Info size={13} /> {g.impactNote}</span>

        {!loading && !fromDb && (
          <div className="gen-banner" role="status">
            <Database size={18} />
            <span>{g.fallbackBanner}</span>
            <button type="button" className="supervisor-page-action" onClick={seed}>
              {g.seedDefaults}
            </button>
          </div>
        )}

        <div className="supervisor-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder={g.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="supervisor-search-clear"
              onClick={() => setQuery('')}
              aria-label={t.common.cancel}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="supervisor-chips">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`supervisor-chip ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              <span>{f.label}</span>
              <span className="supervisor-chip-count">{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {loading && genres.length === 0 ? (
          <div className="supervisor-empty">
            <Palette size={28} />
            <p>{g.loading}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="supervisor-empty">
            <Palette size={28} />
            <p>{g.emptyTitle}</p>
            <span>{g.emptyHint}</span>
            <button type="button" className="supervisor-empty-cta" onClick={openCreate}>
              <Plus size={13} /> {g.newGenre}
            </button>
          </div>
        ) : (
          <div className="gen-grid">
            {filtered.map((x) => {
              const idx = genres.findIndex((y) => y.id === x.id);
              const reorderable = !query.trim() && filter === 'all';
              return (
                <article
                  key={x.id}
                  className={`gen-card ${x.isActive ? '' : 'is-hidden'}`}
                  style={{ ['--gen-accent' as string]: x.accentColor }}
                >
                  <header className="gen-card-head">
                    <div className="gen-card-title">
                      <h3>{x.name}</h3>
                      {x.equivalent && <span className="gen-equivalent">{x.equivalent}</span>}
                    </div>
                    <div className="gen-badges">
                      {MAIN_IDS.has(x.id) && <span className="gen-badge main">{g.mainBadge}</span>}
                      <span className={`gen-badge ${x.isActive ? 'on' : ''}`}>
                        {x.isActive ? g.active : g.inactive}
                      </span>
                    </div>
                  </header>

                  <p className="gen-desc">{describe(x)}</p>

                  <div className="gen-usage">
                    {usageChips(x).map((c) => <span key={c}>{c}</span>)}
                  </div>

                  <div className="gen-actions">
                    <button type="button" className="events-history-btn" onClick={() => openEdit(x)}>
                      <Edit3 size={12} /> {g.edit}
                    </button>
                    <button type="button" className="events-history-btn" onClick={() => toggleActive(x)}>
                      {x.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                      {x.isActive ? g.deactivate : g.activate}
                    </button>
                    <span className="spacer" />
                    <button
                      type="button"
                      className="events-history-btn"
                      onClick={() => move(x, -1)}
                      disabled={!reorderable || idx <= 0}
                      aria-label={g.moveUp}
                      title={g.moveUp}
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      className="events-history-btn"
                      onClick={() => move(x, 1)}
                      disabled={!reorderable || idx === genres.length - 1}
                      aria-label={g.moveDown}
                      title={g.moveDown}
                    >
                      <ChevronDown size={13} />
                    </button>
                    <button type="button" className="events-history-btn danger" onClick={() => setDeleting(x)}>
                      <Trash2 size={12} /> {g.delete}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SupervisorPageShell>

      <GenreEditorModal
        open={editorOpen}
        initial={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />

      <GenreDeleteModal
        genre={deleting}
        usage={deleting ? usage[deleting.name] : undefined}
        others={genres.filter((x) => x.id !== deleting?.id)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />

      {toast && <SupervisorToast message={toast} />}
    </>
  );
}
