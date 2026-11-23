import { Link } from 'react-router-dom';
import { BookOpen, Play } from 'lucide-react';
import { getIcon } from '../../shared/ui/Icon';
import type { Manga } from '../../core/services/mangaService';
import type { LibraryEntry } from '../../core/services/libraryService';
import { useT } from '../../config/i18n';

interface Props {
  items: { manga: Manga; entry: LibraryEntry }[];
}

export default function ContinueReadingSection({ items }: Props) {
  const t = useT();

  if (items.length === 0) return null;

  return (
    <section className="continue-reading" aria-label={t.library.reading}>
      <header className="continue-header">
        <div>
          <span className="continue-tag">
            <BookOpen size={12} /> {t.library.reading}
          </span>
          <h2 className="continue-title">{t.mangaDetail.continueReading}</h2>
        </div>
      </header>

      <ul className="continue-list">
        {items.slice(0, 6).map(({ manga, entry }) => {
          const Icon = getIcon(manga.cover);
          const total = manga.chapters?.length || 1;
          const chaptersReadCount = entry.chaptersRead?.length || 0;
          const percent = Math.min(
            100,
            Math.round((chaptersReadCount / total) * 100),
          );
          const target = Math.min(
            Math.max(1, entry.currentChapter || 1),
            total,
          );

          return (
            <li key={manga.id} className="continue-item">
              <Link to={`/manga/${manga.id}`} className="continue-cover">
                <Icon size={32} />
              </Link>
              <div className="continue-info">
                <Link to={`/manga/${manga.id}`} className="continue-name">
                  {manga.title}
                </Link>
                <span className="continue-meta">
                  {t.common.chapterShort} {target} / {total} · {percent}%
                </span>
                <div className="continue-bar">
                  <div
                    className="continue-bar-fill"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <Link
                to={`/manga/${manga.id}/read/${target}`}
                className="continue-play"
                aria-label={`Continue ${manga.title}`}
              >
                <Play size={14} fill="currentColor" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}