import { useMemo } from 'react';
import { getIcon } from '../../shared/ui/Icon';

export interface MangaPageProps {
  mangaId: string;
  mangaTitle: string;
  coverIcon: string;
  chapterNumber: number;
  chapterTitle: string;
  pageNumber: number;
  totalPages: number;
  fit: 'width' | 'height' | 'original';
  showPageNumbers: boolean;
  pageUrl?: string;
}

interface PanelDef {
  gridArea: string;
  icon: string;
  accent: string;
}

const LAYOUTS: PanelDef[][] = [
  [
    { gridArea: '1 / 1 / 3 / 2', icon: 'Feather', accent: 'primary' },
    { gridArea: '1 / 2 / 2 / 3', icon: 'Moon', accent: 'terracotta' },
    { gridArea: '2 / 2 / 3 / 3', icon: 'Flame', accent: 'savanna' },
  ],
  [
    { gridArea: '1 / 1 / 2 / 3', icon: 'Shield', accent: 'terracotta' },
    { gridArea: '2 / 1 / 3 / 2', icon: 'Sparkles', accent: 'primary' },
    { gridArea: '2 / 2 / 3 / 3', icon: 'Compass', accent: 'clay' },
  ],
  [
    { gridArea: '1 / 1 / 2 / 2', icon: 'Heart', accent: 'primary' },
    { gridArea: '1 / 2 / 2 / 3', icon: 'Music', accent: 'savanna' },
    { gridArea: '2 / 1 / 3 / 3', icon: 'BookOpen', accent: 'terracotta' },
  ],
  [
    { gridArea: '1 / 1 / 2 / 2', icon: 'Activity', accent: 'clay' },
    { gridArea: '1 / 2 / 2 / 3', icon: 'Rocket', accent: 'primary' },
    { gridArea: '2 / 1 / 3 / 2', icon: 'PawPrint', accent: 'savanna' },
    { gridArea: '2 / 2 / 3 / 3', icon: 'Eye', accent: 'terracotta' },
  ],
  [
    { gridArea: '1 / 1 / 3 / 3', icon: 'Sparkles', accent: 'primary' },
  ],
];

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pickLayout(mangaId: string, chapterNumber: number, pageNumber: number): PanelDef[] {
  const seed = hashString(`${mangaId}|${chapterNumber}|${pageNumber}`);
  return LAYOUTS[seed % LAYOUTS.length];
}

export default function MangaPage({
  mangaId, mangaTitle, coverIcon, chapterNumber, chapterTitle,
  pageNumber, totalPages, fit, showPageNumbers, pageUrl,
}: MangaPageProps) {
  const panels = useMemo(() => pickLayout(mangaId, chapterNumber, pageNumber), [mangaId, chapterNumber, pageNumber]);
  const CaptionIcon = useMemo(() => getIcon(coverIcon), [coverIcon]);

  if (pageUrl) {
    return (
      <article className={`reader-page fit-${fit} has-image`} data-page={pageNumber} aria-label={`Page ${pageNumber} of ${totalPages}`}>
        <img
          src={pageUrl}
          alt={`${mangaTitle} — Chapter ${chapterNumber}, Page ${pageNumber}`}
          className="reader-page-image"
          loading="lazy"
        />
        {showPageNumbers && (
          <span className="reader-page-floating-num">{pageNumber} / {totalPages}</span>
        )}
      </article>
    );
  }

  return (
    <article className={`reader-page fit-${fit}`} data-page={pageNumber} aria-label={`Page ${pageNumber} of ${totalPages}`}>
      <div className="reader-page-sheet">
        <div className="reader-page-header">
          <span className="reader-page-brand">{mangaTitle}</span>
          <span className="reader-page-chapter">Ch. {chapterNumber} · {chapterTitle}</span>
        </div>

        <div className="reader-page-grid">
          {panels.map((panel, i) => {
            const Icon = getIcon(panel.icon);
            return (
              <div key={i} className={`reader-panel accent-${panel.accent}`} style={{ gridArea: panel.gridArea }}>
                <div className="reader-panel-tone" />
                <div className="reader-panel-art"><Icon size={42} /></div>
                {i === 0 && <div className="reader-bubble reader-bubble-left"><span /><span /></div>}
                {i === 1 && <div className="reader-bubble reader-bubble-right"><span /></div>}
              </div>
            );
          })}
        </div>

        <div className="reader-page-footer">
          <span className="reader-page-sigil"><CaptionIcon size={11} /></span>
          {showPageNumbers && <span className="reader-page-number">{pageNumber} <em>/</em> {totalPages}</span>}
        </div>
      </div>
    </article>
  );
}