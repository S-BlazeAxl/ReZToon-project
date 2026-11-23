import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Home as HomeIcon, BookOpen, Bookmark, CheckCircle2, Play, Trophy, Loader2 } from 'lucide-react';
import ParticlesCanvas from '../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../shared/effects/FloatingShapes';
import ProfileAvatar from '../../shared/layout/ProfileAvatar';
import SearchPanel from '../../shared/panels/SearchPanel';
import CreatorPanel from '../../shared/panels/CreatorPanel';
import NotificationsPanel from '../../shared/panels/NotificationsPanel';
import MessagesPanel from '../../shared/panels/MessagesPanel';
import LanguageSwitcher from '../../shared/ui/LanguageSwitcher';
import LiteModeToggle from '../../shared/ui/LiteModeToggle';
import { getIcon } from '../../shared/ui/Icon';
import { useCurrentUserWithLoading } from '../../core/hooks/useCurrentUser';
import { getMangasByIds } from '../../core/services/mangaService';
import { getLibrary, setLibraryStatus, type LibraryEntry, type LibraryStatus } from '../../core/services/libraryService';
import { getFooter } from '../../core/services/catalogueService';
import { useT } from '../../config/i18n';
import type { Manga } from '../../core/services/mangaService';
import '../../styles/home-style.css';
import '../../styles/profile-style.css';
import '../../styles/panel-style.css';
import '../../styles/library-style.css';
import '../../styles/pwa-style.css';

const FOOTER = getFooter();

interface ResolvedEntry {
  entry: LibraryEntry;
  manga: Manga;
}

export default function Library() {
  const { user, loading: authLoading } = useCurrentUserWithLoading();
  const userId = user?.id;
  const navigate = useNavigate();
  const t = useT();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<LibraryStatus>('reading');
  const [refreshKey, setRefreshKey] = useState(0);
  const [entries, setEntries] = useState<ResolvedEntry[]>([]);
  const [counts, setCounts] = useState({ reading: 0, wishlist: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  const TABS: { id: LibraryStatus; label: string; icon: typeof BookOpen }[] = [
    { id: 'reading', label: t.library.reading, icon: BookOpen },
    { id: 'wishlist', label: t.library.wishlist, icon: Bookmark },
    { id: 'completed', label: t.library.completed, icon: CheckCircle2 },
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      navigate('/let-go');
    }
  }, [userId, authLoading, navigate]);

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

  useEffect(() => {
    let isCancelled = false;

    async function fetchLibraryData() {
      if (!userId) return;
      setLoading(true);

      try {
        const allEntries = await getLibrary(userId);
        
        if (isCancelled) return;

        setCounts({
          reading: allEntries.filter(e => e.status === 'reading').length,
          wishlist: allEntries.filter(e => e.status === 'wishlist').length,
          completed: allEntries.filter(e => e.status === 'completed').length,
        });

        const activeEntries = allEntries.filter((e) => e.status === tab);
        const mangaIds = activeEntries.map((e) => e.mangaId);
        
        const mangas = await getMangasByIds(mangaIds);
        const mangaMap = new Map(mangas.map((m) => [m.id, m]));

        const resolved: ResolvedEntry[] = [];
        for (const entry of activeEntries) {
          const manga = mangaMap.get(entry.mangaId);
          if (manga) {
            resolved.push({ entry, manga });
          }
        }

        if (!isCancelled) {
          setEntries(resolved);
        }
      } catch (err) {
        console.error('Failed to load library:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchLibraryData();

    return () => {
      isCancelled = true;
    };
  }, [userId, tab, refreshKey]);

  if (authLoading || !user) return null;

  const isCreator = user.role === 'creator' || user.role === 'both';
  const isSupervisor = user.role === 'supervisor';
  const hasCreatorAccess = isCreator || isSupervisor;

  const handleStatusChange = async (mangaId: string, next: LibraryStatus) => {
    if (!userId) return;
    await setLibraryStatus(userId, mangaId, next);
    setRefreshKey((k) => k + 1);
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
            <div className="desktop-only-nav">
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
            <div className="mobile-only-nav">
              <Link to="/home" className="header-icon-btn active" onClick={() => setMenuOpen(false)}>
                <HomeIcon size={18} /> <span>{t.common.home}</span>
              </Link>
              <Link to="/community" className="header-icon-btn" onClick={() => setMenuOpen(false)}>
                <Users size={18} /> <span>{t.common.community}</span>
              </Link>
              <Link to="/awards" className="header-icon-btn" onClick={() => setMenuOpen(false)}>
                <Trophy size={18} /> <span>{t.awards.title}</span>
              </Link>
            </div>
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

      <main className="library-main">
        <Link to="/home" className="library-back">
          <ArrowLeft size={14} /> {t.common.back}
        </Link>

        <header className="library-header">
          <span className="library-page-tag">{t.library.title}</span>
          <h1 className="library-title">{t.library.title}</h1>
          <p className="library-subtitle">
            {t.library.subtitle}
          </p>
        </header>

        <nav className="library-tabs">
          {TABS.map((tItem) => {
            const Icon = tItem.icon;
            return (
              <button
                key={tItem.id}
                type="button"
                className={`library-tab ${tab === tItem.id ? 'active' : ''}`}
                onClick={() => setTab(tItem.id)}
              >
                <Icon size={14} />
                <span>{tItem.label}</span>
                <span className="library-tab-count">{counts[tItem.id]}</span>
              </button>
            );
          })}
        </nav>

        {loading ? (
          <div className="library-empty" style={{ borderStyle: 'solid', background: 'transparent' }}>
            <Loader2 size={36} className="spin" style={{ color: 'var(--primary)' }} />
            <p>{t.common.loading}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="library-empty">
            <BookOpen size={36} />
            <p>
              {tab === 'reading'
                ? t.library.empty
                : tab === 'wishlist'
                  ? t.library.wishlistEmpty
                  : t.library.completedEmpty}
            </p>
            <span>{t.library.emptyDesc}</span>
            <Link to="/home" className="btn btn-primary">
              {t.library.explore}
            </Link>
          </div>
        ) : (
          <section className="library-grid">
            {entries.map(({ entry, manga }) => {
              const IconCmp = getIcon(manga.cover);
              const totalChapters = manga.chapters?.length || 1;
              const percent = Math.min(100, Math.round((entry.chaptersRead.length / totalChapters) * 100));
              const continueChapter = entry.currentChapter > 0 ? entry.currentChapter : 1;

              return (
                <article key={entry.mangaId} className="library-card">
                  <Link to={`/manga/${manga.id}`} className="library-cover">
                    <IconCmp size={48} />
                    <span className={`library-status status-${entry.status}`}>{entry.status}</span>
                  </Link>

                  <div className="library-body">
                    <h3 className="library-card-title">{manga.title}</h3>
                    <span className="library-card-genre">{manga.genre}</span>

                    <div className="library-progress">
                      <div className="library-progress-fill" style={{ width: `${percent}%` }} />
                    </div>

                    <div className="library-progress-meta">
                      <span>{t.common.chapterShort} {entry.currentChapter} / {manga.chapters?.length || 0}</span>
                      <span>{percent}%</span>
                    </div>

                    <div className="library-actions">
                      <Link to={`/manga/${manga.id}/read/${continueChapter}`} className="library-read-btn">
                        <Play size={13} fill="currentColor" /> {t.library.continue}
                      </Link>
                      <Link to={`/manga/${manga.id}`} className="library-details-btn">
                        {t.library.details}
                      </Link>
                    </div>

                    <div className="library-actions" style={{ marginTop: 8 }}>
                      {entry.status !== 'reading' && (
                        <button type="button" className="library-details-btn" onClick={() => handleStatusChange(manga.id, 'reading')}>
                          {t.library.markReading}
                        </button>
                      )}
                      {entry.status !== 'completed' && (
                        <button type="button" className="library-details-btn" onClick={() => handleStatusChange(manga.id, 'completed')}>
                          {t.library.markCompleted}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </>
  );
}