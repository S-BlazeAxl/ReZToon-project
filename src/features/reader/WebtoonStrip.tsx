import { getIcon } from '../../shared/ui/Icon';

interface Props {
  mangaTitle: string;
  coverIcon: string;
  chapterNumber: number;
  chapterTitle: string;
  pageNumber: number;
  totalPages: number;
  showPageNumbers: boolean;
}

const PANEL_LAYOUTS = [
  [{ h: 380, icon: 'Feather' }, { h: 220, icon: 'Moon' }],
  [{ h: 260, icon: 'Flame' }, { h: 320, icon: 'Shield' }],
  [{ h: 420, icon: 'Compass' }, { h: 180, icon: 'Sparkles' }],
  [{ h: 200, icon: 'Heart' }, { h: 200, icon: 'Music' }, { h: 240, icon: 'Rocket' }],
];

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export default function WebtoonStrip({
  mangaTitle,
  coverIcon,
  chapterNumber,
  chapterTitle,
  pageNumber,
  totalPages,
  showPageNumbers,
}: Props) {
  const seed = hashString(`${mangaTitle}|${chapterNumber}|${pageNumber}`);
  const layout = PANEL_LAYOUTS[seed % PANEL_LAYOUTS.length];
  const CaptionIcon = getIcon(coverIcon);

  return (
    <article className="webtoon-strip" data-page={pageNumber}>
      <header className="webtoon-strip-header">
        <span className="webtoon-strip-brand">{mangaTitle}</span>
        <span className="webtoon-strip-chapter">
          Ch. {chapterNumber} · {chapterTitle}
        </span>
      </header>

      <div className="webtoon-strip-body">
        {layout.map((panel, i) => {
          const Icon = getIcon(panel.icon);
          return (
            <div
              key={i}
              className={`webtoon-panel accent-${['primary', 'terracotta', 'savanna', 'clay'][i % 4]}`}
              style={{ minHeight: panel.h }}
            >
              <div className="webtoon-panel-art">
                <Icon size={64} />
              </div>
              {i === 0 && (
                <div className="webtoon-bubble webtoon-bubble-left">
                  <span />
                  <span />
                </div>
              )}
              {i === 1 && (
                <div className="webtoon-bubble webtoon-bubble-right">
                  <span />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <footer className="webtoon-strip-footer">
        <span className="webtoon-strip-sigil">
          <CaptionIcon size={11} />
        </span>
        {showPageNumbers && (
          <span className="webtoon-strip-number">
            {pageNumber} <em>/</em> {totalPages}
          </span>
        )}
      </footer>
    </article>
  );
}