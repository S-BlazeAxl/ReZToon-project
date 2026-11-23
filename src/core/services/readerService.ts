export type ReadingMode = 'scroll' | 'single' | 'double' | 'webtoon';
export type FitMode = 'width' | 'height' | 'original';

export interface ReaderPrefs {
  mode: ReadingMode;
  fit: FitMode;
  brightness: number;
  direction: 'ltr' | 'rtl';
  showPageNumbers: boolean;
}

const PREFS_PREFIX = 'reztoon_reader_prefs_';

const DEFAULTS: ReaderPrefs = {
  mode: 'scroll',
  fit: 'width',
  brightness: 1,
  direction: 'ltr',
  showPageNumbers: true,
};

export function getReaderPrefs(userId?: string): ReaderPrefs {
  if (!userId) return { ...DEFAULTS };
  const raw = localStorage.getItem(PREFS_PREFIX + userId);
  if (!raw) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(raw) as Partial<ReaderPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveReaderPrefs(
  userId: string,
  prefs: Partial<ReaderPrefs>,
): ReaderPrefs {
  const next = { ...getReaderPrefs(userId), ...prefs };
  localStorage.setItem(PREFS_PREFIX + userId, JSON.stringify(next));
  return next;
}

export function resetReaderPrefs(userId: string): ReaderPrefs {
  localStorage.removeItem(PREFS_PREFIX + userId);
  return { ...DEFAULTS };
}