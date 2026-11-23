export type Locale = 'en' | 'fr';

export function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) {
    const k = n / 1_000;
    if (Math.round(k * 10) / 10 >= 1_000) {
      return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    return `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(n);
}

export function formatRelativeTime(
  iso: string | Date | undefined | null,
  locale: Locale = 'en',
): string {
  if (!iso) return '';
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(date.getTime())) return '';

  const diff = Date.now() - date.getTime();
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  const week = Math.round(day / 7);
  const month = Math.round(day / 30);
  const year = Math.round(day / 365);

  if (sec < 60) return locale === 'fr' ? "à l'instant" : 'just now';
  if (min < 60) return locale === 'fr' ? `il y a ${min}min` : `${min}m ago`;
  if (hr < 24) return locale === 'fr' ? `il y a ${hr}h` : `${hr}h ago`;
  if (day < 7) return locale === 'fr' ? `il y a ${day}j` : `${day}d ago`;
  if (week < 4) return locale === 'fr' ? `il y a ${week}sem` : `${week}w ago`;
  if (month < 12) return locale === 'fr' ? `il y a ${month}mois` : `${month}mo ago`;
  return locale === 'fr' ? `il y a ${year}an(s)` : `${year}y ago`;
}

export function formatDateShort(
  iso: string | Date | undefined | null,
  locale: Locale = 'en',
): string {
  if (!iso) return '';
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(
  iso: string | Date | undefined | null,
  locale: Locale = 'en',
): string {
  if (!iso) return '';
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

export function formatAudioTime(seconds: number | undefined | null): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}