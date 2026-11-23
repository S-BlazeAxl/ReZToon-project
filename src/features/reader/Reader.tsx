import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, List, X, Heart, Settings,
  Maximize2, Minimize2, Sun, SunDim, Columns, Rows, Square, BookOpen,
  RotateCcw, Smartphone, Headphones,
} from 'lucide-react';
import Cursor from '../../shared/effects/Cursor';
import MangaPage from './MangaPage';
import WebtoonStrip from './WebtoonStrip';
import ChapterComments from './ChapterComments';
import AudioPlayer from './AudioPlayer';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import {
  getMangaById,
  getChaptersForManga,
  toggleMangaLike,
  isMangaLikedByUser,
  type Manga,
  type ChapterMeta,
} from '../../core/services/mangaService';
import { markChapterAsRead } from '../../core/services/libraryService';
import { useT } from '../../config/i18n';
import {
  getReaderPrefs,
  saveReaderPrefs,
  type ReadingMode,
  type FitMode,
  type ReaderPrefs,
} from '../../core/services/readerService';
import {
  hasAudioForChapter,
  getAudioOnlyMode,
  setAudioOnlyMode,
} from '../../core/services/audioService';
import '../../styles/reader-style.css';

const MODE_ICONS: Record<ReadingMode, typeof Rows> = {
  scroll: Rows,
  single: Square,
  double: Columns,
  webtoon: Smartphone,
};

export default function Reader() {
  const { id = '', chapter = '1' } = useParams<{ id: string; chapter: string }>();
  const chapterNum = Number(chapter);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const t = useT();

  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [m, c] = await Promise.all([getMangaById(id), getChaptersForManga(id)]);
      if (cancelled) return;
      setManga(m);
      setChapters(c);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const currentIndex = useMemo(
    () => chapters.findIndex((c) => c.number === chapterNum),
    [chapters, chapterNum],
  );

  const current = currentIndex >= 0 ? chapters[currentIndex] : null;
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : null;

  const [prefs, setPrefs] = useState<ReaderPrefs>(() => getReaderPrefs(user?.id));
  const [pageIndex, setPageIndex] = useState(0);
  const [showChapterList, setShowChapterList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [liked, setLiked] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioOnly, setAudioOnly] = useState<boolean>(() => getAudioOnlyMode());
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [pendingAtLast, setPendingAtLast] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef(false);
  const prefsHydratedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    hasAudioForChapter(id, chapterNum).then((v) => {
      if (!cancelled) setAudioAvailable(v);
    });
    return () => { cancelled = true; };
  }, [id, chapterNum]);

  useEffect(() => {
    if (!user || !manga) {
      setLiked(false);
      return;
    }
    let cancelled = false;
    isMangaLikedByUser(manga.id, user.id).then((v) => {
      if (!cancelled) setLiked(v);
    });
    return () => { cancelled = true; };
  }, [user, manga]);

  const totalPages = current?.pageUrls?.length || current?.pages || 0;
  const perView = prefs.mode === 'double' ? 2 : 1;
  const totalViews = Math.max(1, Math.ceil(totalPages / perView));

  useEffect(() => {
    prefsHydratedForRef.current = user?.id ?? null;
    setPrefs(getReaderPrefs(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (prefsHydratedForRef.current !== user.id) return;
    saveReaderPrefs(user.id, prefs);
  }, [prefs, user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const atLast = params.get('at') === 'last';

    setPendingAtLast(atLast);
    setPageIndex(0);
    setScrollPercent(0);
    markedRef.current = false;
    if (contentRef.current) contentRef.current.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id, chapterNum]);

  useEffect(() => {
    if (!pendingAtLast) return;
    if (totalViews > 1) {
      setPageIndex(totalViews - 1);
    }
    setPendingAtLast(false);
  }, [pendingAtLast, totalViews]);

  useEffect(() => {
    if (prefs.mode !== 'scroll' && prefs.mode !== 'webtoon') return;
    if (!current) return;
    if (totalPages === 0) return;
    const el = contentRef.current;
    if (!el) return;
    const check = () => {
      if (!el) return;
      if (el.scrollHeight > 0 && el.scrollHeight <= el.clientHeight + 4) {
        setScrollPercent(100);
      }
    };
    const raf = requestAnimationFrame(check);
    const timer = window.setTimeout(check, 400);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [chapterNum, prefs.mode, totalPages, current]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const goToChapter = useCallback(
    (number: number, landing: 'first' | 'last' = 'first') =>
      navigate(`/manga/${id}/read/${number}${landing === 'last' ? '?at=last' : ''}`),
    [id, navigate],
  );

  const handleSelectChapter = (number: number) => {
    setShowChapterList(false);
    if (number === chapterNum) {
      setPageIndex(0);
      setScrollPercent(0);
      if (contentRef.current) contentRef.current.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      goToChapter(number);
    }
  };

  const goPrev = useCallback(() => {
    if (prefs.mode === 'scroll' || prefs.mode === 'webtoon') {
      if (prevChapter) goToChapter(prevChapter.number, 'last');
      return;
    }
    setPageIndex((i) => {
      if (i > 0) return i - 1;
      if (prevChapter) goToChapter(prevChapter.number, 'last');
      return i;
    });
  }, [prefs.mode, prevChapter, goToChapter]);

  const goNext = useCallback(() => {
    if (prefs.mode === 'scroll' || prefs.mode === 'webtoon') {
      if (nextChapter) goToChapter(nextChapter.number);
      return;
    }
    setPageIndex((i) => {
      const last = totalViews - 1;
      if (i < last) return i + 1;
      if (nextChapter) goToChapter(nextChapter.number);
      return i;
    });
  }, [prefs.mode, totalViews, nextChapter, goToChapter]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/let-go');
      return;
    }
    if (!manga) return;
    const next = await toggleMangaLike(manga.id, user.id);
    setLiked(next);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (showChapterList || showSettings) {
        if (e.key === 'Escape') {
          setShowChapterList(false);
          setShowSettings(false);
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        if (prefs.mode === 'scroll' || prefs.mode === 'webtoon') return;
        if (prefs.direction === 'rtl') goNext(); else goPrev();
      }
      if (e.key === 'ArrowRight') {
        if (prefs.mode === 'scroll' || prefs.mode === 'webtoon') return;
        if (prefs.direction === 'rtl') goPrev(); else goNext();
      }
      if (e.key === 'Escape') navigate(`/manga/${id}`);
      if (e.key === 'f' || e.key === 'F') void toggleFullscreen();
      if (e.key === ' ' && prefs.mode !== 'scroll' && prefs.mode !== 'webtoon') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [id, navigate, goNext, goPrev, prefs.mode, prefs.direction, showChapterList, showSettings]);

  useEffect(() => {
    if (!user || !manga || !current) return;
    if (markedRef.current) return;

    const markComplete = async () => {
      if (markedRef.current) return;
      try {
        await markChapterAsRead(user.id, manga.id, current.number, chapters.length);
        markedRef.current = true;
      } catch {
        /* keep markedRef false so the effect can retry */
      }
    };

    if (prefs.mode === 'scroll' || prefs.mode === 'webtoon') {
      if (scrollPercent >= 90) void markComplete();
      return;
    }

    if (pageIndex >= totalViews - 1) {
      const timer = window.setTimeout(() => { void markComplete(); }, 1500);
      return () => window.clearTimeout(timer);
    }
  }, [user, manga, current, chapters.length, scrollPercent, pageIndex, totalViews, prefs.mode]);

  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) {
      setScrollPercent(100);
      return;
    }
    setScrollPercent(Math.min(100, (el.scrollTop / max) * 100));
  }, []);

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefs.mode === 'scroll' || prefs.mode === 'webtoon') return;
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a')) return;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;

      if (ratio < 0.3) {
        if (prefs.direction === 'rtl') goNext(); else goPrev();
        return;
      }
      if (ratio > 0.7) {
        if (prefs.direction === 'rtl') goPrev(); else goNext();
        return;
      }
      setChromeHidden((v) => !v);
    },
    [prefs.mode, prefs.direction, goNext, goPrev],
  );

  const updatePrefs = (patch: Partial<ReaderPrefs>) =>
    setPrefs((p) => ({ ...p, ...patch }));

  const handleToggleAudio = () => {
    const next = !audioOnly;
    setAudioOnly(next);
    setAudioOnlyMode(next);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark)' }}>
        <div className="loader-ring" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  if (!manga || !current) {
    return (
      <div className="reader-empty">
        <h1>{t.common.notAvailable}</h1>
        <Link to="/home" className="btn btn-primary">
          <ArrowLeft size={16} /> {t.common.back}
        </Link>
      </div>
    );
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const progressPercent =
    prefs.mode === 'scroll' || prefs.mode === 'webtoon'
      ? scrollPercent
      : totalViews > 0 ? ((pageIndex + 1) / totalViews) * 100 : 0;

  const visiblePages =
    prefs.mode === 'scroll' || prefs.mode === 'webtoon'
      ? pages
      : pages.slice(pageIndex * perView, pageIndex * perView + perView);

  const pageLabel =
    prefs.mode === 'scroll'
      ? `${t.reader.page} ${pages.length} · ${t.reader.scroll}`
      : prefs.mode === 'webtoon'
        ? `${t.reader.webtoon} · ${pages.length} ${t.reader.pages}`
        : prefs.mode === 'single'
          ? `${t.reader.page} ${pageIndex + 1} / ${totalViews}`
          : `${t.reader.spread} ${pageIndex + 1} / ${totalViews}`;

  return (
    <div className={`reader-shell ${chromeHidden ? 'chromeless' : ''}`}>
      <Cursor />
      <div className="reader-brightness" style={{ opacity: 1 - prefs.brightness }} />

      <header className="reader-chrome reader-topbar">
        <button
          type="button"
          className="reader-icon-btn"
          onClick={() => navigate(`/manga/${manga.id}`)}
          aria-label={t.common.close}
        >
          <X size={16} />
        </button>
        <div className="reader-header-info">
          <span className="reader-manga-title">{manga.title}</span>
          <span className="reader-chapter-label">
            {t.common.chapterShort} {current.number} — {current.title}
          </span>
        </div>
        <div className="reader-header-actions">
          {audioAvailable && (
            <button
              type="button"
              className={`reader-icon-btn ${audioOnly ? 'active' : ''}`}
              onClick={handleToggleAudio}
              aria-label={t.reader.audioMode}
            >
              <Headphones size={16} />
            </button>
          )}
          <button
            type="button"
            className={`reader-icon-btn ${liked ? 'active' : ''}`}
            onClick={handleLike}
            aria-label={liked ? t.mangaDetail.liked : t.mangaDetail.like}
          >
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            className={`reader-icon-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings((v) => !v)}
            aria-label={t.reader.settings}
          >
            <Settings size={16} />
          </button>
          <button
            type="button"
            className="reader-icon-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? t.common.collapse : t.common.readMore}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            type="button"
            className={`reader-icon-btn ${showChapterList ? 'active' : ''}`}
            onClick={() => setShowChapterList((v) => !v)}
            aria-label={t.reader.chapters}
          >
            <List size={16} />
          </button>
        </div>
      </header>

      <div className="reader-progress-track">
        <div className="reader-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <main
        ref={contentRef}
        className={`reader-content mode-${prefs.mode}`}
        onScroll={prefs.mode === 'scroll' || prefs.mode === 'webtoon' ? handleScroll : undefined}
        onClick={handleContentClick}
      >
        {audioOnly && audioAvailable ? (
          <AudioPlayer
            mangaId={manga.id}
            chapterNumber={current.number}
            chapterTitle={current.title}
            onClose={() => { setAudioOnly(false); setAudioOnlyMode(false); }}
          />
        ) : (
          <>
            <div className={`reader-pages mode-${prefs.mode}`}>
              {prefs.mode === 'webtoon'
                ? visiblePages.map((p) => (
                  <WebtoonStrip
                    key={p}
                    mangaTitle={manga.title}
                    coverIcon={manga.cover}
                    chapterNumber={current.number}
                    chapterTitle={current.title}
                    pageNumber={p}
                    totalPages={totalPages}
                    showPageNumbers={prefs.showPageNumbers}
                  />
                ))
                : visiblePages.map((p) => (
                  <MangaPage
                    key={p}
                    mangaId={manga.id}
                    mangaTitle={manga.title}
                    coverIcon={manga.cover}
                    chapterNumber={current.number}
                    chapterTitle={current.title}
                    pageNumber={p}
                    totalPages={totalPages}
                    fit={prefs.fit}
                    showPageNumbers={prefs.showPageNumbers}
                    pageUrl={current.pageUrls?.[p - 1]}
                  />
                ))}

              {(prefs.mode === 'scroll' || prefs.mode === 'webtoon') && (
                <div className="reader-end-marker">
                  <span>{t.reader.endOfChapter} {current.number}</span>
                </div>
              )}
            </div>

            {prefs.mode !== 'scroll' && prefs.mode !== 'webtoon' && (
              <div className="reader-page-label">{pageLabel}</div>
            )}
          </>
        )}

        <ChapterComments mangaId={manga.id} chapterNumber={current.number} />
      </main>

      <footer className="reader-chrome reader-bottom">
        <button
          type="button"
          className="reader-nav-btn"
          onClick={goPrev}
          disabled={
            prefs.mode === 'scroll' || prefs.mode === 'webtoon'
              ? false
              : pageIndex === 0 && !prevChapter
          }
        >
          <ChevronLeft size={16} />
          <span>
            {prefs.mode === 'scroll' || prefs.mode === 'webtoon'
              ? prevChapter ? `${t.common.chapterShort} ${prevChapter.number}` : t.reader.firstChapter
              : pageIndex > 0 ? t.common.previous
                : prevChapter ? `${t.common.chapterShort} ${prevChapter.number}` : t.reader.firstChapter}
          </span>
        </button>

        <button type="button" className="reader-nav-btn center" onClick={() => setShowChapterList(true)}>
          <BookOpen size={14} />
          <span>{t.reader.chapters}</span>
        </button>

        <button
          type="button"
          className="reader-nav-btn primary"
          onClick={goNext}
          disabled={
            prefs.mode === 'scroll' || prefs.mode === 'webtoon'
              ? false
              : pageIndex >= totalViews - 1 && !nextChapter
          }
        >
          <span>
            {prefs.mode === 'scroll' || prefs.mode === 'webtoon'
              ? nextChapter ? `${t.common.chapterShort} ${nextChapter.number}` : t.reader.lastChapter
              : pageIndex < totalViews - 1
                ? t.common.next
                : nextChapter ? `${t.common.chapterShort} ${nextChapter.number}` : t.reader.lastChapter}
          </span>
          <ChevronRight size={16} />
        </button>
      </footer>

      {showSettings && (
        <aside className="reader-settings">
          <header className="reader-settings-header">
            <h3>{t.reader.settings}</h3>
            <button type="button" className="reader-icon-btn" onClick={() => setShowSettings(false)}>
              <X size={14} />
            </button>
          </header>

          <div className="reader-settings-body">
            <div className="reader-settings-group">
              <span className="reader-settings-label">{t.reader.mode}</span>
              <div className="reader-settings-row">
                {(Object.keys(MODE_ICONS) as ReadingMode[]).map((mode) => {
                  const Icon = MODE_ICONS[mode];
                  return (
                    <button
                      key={mode}
                      type="button"
                      className={`reader-settings-btn ${prefs.mode === mode ? 'active' : ''}`}
                      onClick={() => updatePrefs({ mode })}
                    >
                      <Icon size={14} />
                      <span>
                        {mode === 'scroll'
                          ? t.reader.scroll
                          : mode === 'single'
                            ? t.reader.single
                            : mode === 'double'
                              ? t.reader.double
                              : t.reader.webtoon}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="reader-settings-group">
              <span className="reader-settings-label">{t.reader.fit}</span>
              <div className="reader-settings-row">
                {(['width', 'height', 'original'] as FitMode[]).map((fit) => (
                  <button
                    key={fit}
                    type="button"
                    className={`reader-settings-btn ${prefs.fit === fit ? 'active' : ''}`}
                    onClick={() => updatePrefs({ fit })}
                  >
                    <span>
                      {fit === 'width'
                        ? t.reader.fitWidth
                        : fit === 'height'
                          ? t.reader.fitHeight
                          : t.reader.fitOriginal}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="reader-settings-group">
              <span className="reader-settings-label">{t.reader.direction}</span>
              <div className="reader-settings-row">
                <button
                  type="button"
                  className={`reader-settings-btn ${prefs.direction === 'ltr' ? 'active' : ''}`}
                  onClick={() => updatePrefs({ direction: 'ltr' })}
                >
                  {t.reader.ltr}
                </button>
                <button
                  type="button"
                  className={`reader-settings-btn ${prefs.direction === 'rtl' ? 'active' : ''}`}
                  onClick={() => updatePrefs({ direction: 'rtl' })}
                >
                  {t.reader.rtl}
                </button>
              </div>
            </div>

            <div className="reader-settings-group">
              <span className="reader-settings-label">
                {prefs.brightness < 0.7 ? <SunDim size={12} /> : <Sun size={12} />}{' '}
                {t.reader.brightness} · {Math.round(prefs.brightness * 100)}%
              </span>
              <input
                type="range"
                min={0.3}
                max={1}
                step={0.05}
                value={prefs.brightness}
                onChange={(e) => updatePrefs({ brightness: Number(e.target.value) })}
                className="reader-settings-slider"
              />
            </div>

            <div className="reader-settings-group">
              <label className="reader-settings-toggle">
                <input
                  type="checkbox"
                  checked={prefs.showPageNumbers}
                  onChange={(e) => updatePrefs({ showPageNumbers: e.target.checked })}
                />
                <span>{t.reader.pageNumbers}</span>
              </label>
            </div>

            <button
              type="button"
              className="reader-settings-reset"
              onClick={() => setPrefs(getReaderPrefs(user?.id))}
            >
              <RotateCcw size={12} /> {t.reader.resetDefaults}
            </button>
          </div>
        </aside>
      )}

      {showChapterList && (
        <aside className="reader-chapters-drawer">
          <header className="reader-settings-header">
            <h3>{t.reader.chapters}</h3>
            <button
              type="button"
              className="reader-icon-btn"
              onClick={() => setShowChapterList(false)}
              aria-label={t.common.close}
            >
              <X size={14} />
            </button>
          </header>

          <ul className="reader-chapters-list">
            {chapters.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`reader-chapter-item ${c.number === current.number ? 'active' : ''}`}
                  onClick={() => handleSelectChapter(c.number)}
                >
                  <span className="reader-chapter-num">
                    {t.common.chapterShort} {c.number}
                  </span>
                  <span className="reader-chapter-name">{c.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}