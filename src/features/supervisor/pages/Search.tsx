import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon, X, BookOpen, Users as UsersIcon,
  Flag, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import Cursor from '../../../shared/effects/Cursor';
import ParticlesCanvas from '../../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../../shared/effects/FloatingShapes';
import { getIcon } from '../../../shared/ui/Icon';
import { SupervisorHeader, SupervisorPageShell } from '../components';
import { getAllMangas, type Manga } from '../../../core/services/mangaService';
import { getUsers, type User } from '../../../core/services/userService';
import { getReports, type Report } from '../../../core/services/reportService';
import { useCurrentUserWithLoading } from '../../../core/hooks/useCurrentUser';
import '../../../styles/home-style.css';
import '../../../styles/profile-style.css';
import '../../../styles/panel-style.css';
import '../../../styles/supervisor-style.css';
import '../../../styles/supervisor-pages-style.css';
import { useT } from '../../../config/i18n';

type Filter = 'all' | 'manga' | 'user' | 'report';

export default function SupervisorSearch() {
  const t = useT();
  const { user, loading: authLoading } = useCurrentUserWithLoading();
  const navigate = useNavigate();

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: t.communityFeed.feedFilters.all },
    { id: 'manga', label: 'Manga' },
    { id: 'user', label: 'Users' },
    { id: 'report', label: 'Reports' },
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/let-go', { replace: true });
      return;
    }
    if (user.role !== 'supervisor') {
      navigate('/supervisor', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    if (user?.role !== 'supervisor') return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [m, u, r] = await Promise.all([
          getAllMangas(),
          getUsers(),
          getReports(),
        ]);
        if (cancelled) return;
        setMangas(m);
        setUsers(u);
        setReports(r);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const q = query.trim().toLowerCase();

  const filteredMangas = useMemo(() => {
    const pool = q
      ? mangas.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.author.toLowerCase().includes(q) ||
          m.genre.toLowerCase().includes(q) ||
          (m.tag ?? '').toLowerCase().includes(q),
      )
      : mangas;
    return pool.slice(0, 30);
  }, [mangas, q]);

  const filteredUsers = useMemo(() => {
    const pool = q
      ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.username ?? '').toLowerCase().includes(q),
      )
      : users;
    return pool.slice(0, 30);
  }, [users, q]);

  const filteredReports = useMemo(() => {
    const pool = q
      ? reports.filter(
        (r) =>
          r.reason.toLowerCase().includes(q) ||
          r.targetLabel.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q),
      )
      : reports;
    return pool.slice(0, 30);
  }, [reports, q]);

  if (authLoading || !user || user.role !== 'supervisor') return null;

  const counts = {
    manga: filteredMangas.length,
    user: filteredUsers.length,
    report: filteredReports.length,
  };

  const showManga = filter === 'all' || filter === 'manga';
  const showUser = filter === 'all' || filter === 'user';
  const showReport = filter === 'all' || filter === 'report';

  const totalShown =
    (showManga ? counts.manga : 0) +
    (showUser ? counts.user : 0) +
    (showReport ? counts.report : 0);

  return (
    <>
      <Cursor />
      <div className="home-bg">
        <ParticlesCanvas />
        <FloatingShapes />
        <div className="bg-overlay" />
      </div>

      <SupervisorHeader active="search" />

      <SupervisorPageShell
        tag="Console"
        tagIcon={<SearchIcon size={12} />}
        title="Global Search"
        subtitle="Search across manga, users and reports in one place."
      >
        <div className="supervisor-search-box">
          <SearchIcon size={18} />
          <input
            type="text"
            placeholder="Search manga, users, reports..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="supervisor-search-clear"
              onClick={() => setQuery('')}
              aria-label={t.events.clearFilters}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="supervisor-chips">
          {FILTERS.map((f) => {
            const count =
              f.id === 'all'
                ? counts.manga + counts.user + counts.report
                : counts[f.id];
            return (
              <button
                key={f.id}
                type="button"
                className={`supervisor-chip ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                <span>{f.label}</span>
                <span className="supervisor-chip-count">{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="supervisor-empty">
            <SearchIcon size={32} />
            <p>Loading…</p>
          </div>
        ) : totalShown === 0 ? (
          <div className="supervisor-empty">
            <SearchIcon size={32} />
            <p>No results</p>
            <span>Try a different keyword or filter.</span>
          </div>
        ) : (
          <div className="supervisor-results">
            {showManga && filteredMangas.length > 0 && (
              <section className="supervisor-results-section">
                <header className="supervisor-results-head">
                  <BookOpen size={14} />
                  <span>Manga</span>
                  <span className="supervisor-chip-count">{filteredMangas.length}</span>
                </header>
                {filteredMangas.map((m) => {
                  const Icon = getIcon(m.cover);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className="supervisor-result"
                      onClick={() => navigate(`/manga/${m.id}`)}
                    >
                      <span className="supervisor-result-avatar"><Icon size={20} /></span>
                      <div className="supervisor-result-info">
                        <strong>{m.title}</strong>
                        <span>
                          {m.author} · {m.genre} · {m.chapters?.length ?? 0} chapters
                        </span>
                      </div>
                      <span className="supervisor-result-tag">{m.tag}</span>
                    </button>
                  );
                })}
              </section>
            )}

            {showUser && filteredUsers.length > 0 && (
              <section className="supervisor-results-section">
                <header className="supervisor-results-head">
                  <UsersIcon size={14} />
                  <span>Users</span>
                  <span className="supervisor-chip-count">{filteredUsers.length}</span>
                </header>
                {filteredUsers.map((u) => (
                  <div key={u.id} className="supervisor-result">
                    <span className="supervisor-result-avatar">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="supervisor-result-info">
                      <strong>{u.name}</strong>
                      <span>
                        {u.email}
                        {u.username ? ` · @${u.username}` : ''}
                      </span>
                    </div>
                    <span className="supervisor-result-tag">{u.role ?? 'reader'}</span>
                  </div>
                ))}
              </section>
            )}

            {showReport && filteredReports.length > 0 && (
              <section className="supervisor-results-section">
                <header className="supervisor-results-head">
                  <Flag size={14} />
                  <span>Reports</span>
                  <span className="supervisor-chip-count">{filteredReports.length}</span>
                </header>
                {filteredReports.map((r) => (
                  <div key={r.id} className="supervisor-result">
                    <span className="supervisor-result-avatar">
                      {r.severity === 'high' ? (
                        <AlertTriangle size={20} />
                      ) : r.status === 'resolved' ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <Flag size={20} />
                      )}
                    </span>
                    <div className="supervisor-result-info">
                      <strong>{r.targetLabel}</strong>
                      <span>
                        {r.reason} · by {r.reporterName}
                      </span>
                    </div>
                    <span className={`supervisor-result-tag sev-${r.severity}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </SupervisorPageShell>
    </>
  );
}