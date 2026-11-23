import type { Notification } from '../services/messageService';
import type { Locale } from './format';

export interface NotificationPart {
  text: string;
  /** Acteur / cible : affichés en gras comme sur Facebook. */
  strong?: boolean;
}

export interface FormattedNotification {
  parts: NotificationPart[];
  plain: string;
}

const LABELS: Record<Locale, Record<string, string>> = {
  en: {},
  fr: {
    reader: 'lecteur', creator: 'créateur', both: 'lecteur et créateur', supervisor: 'superviseur',
    owner: 'propriétaire', admin: 'administrateur', member: 'membre',
    ongoing: 'en cours', completed: 'terminé', hiatus: 'en pause',
    resolved: 'traité', rejected: 'rejeté',
    writer: 'scénariste', artist: 'dessinateur', colorist: 'coloriste', letterer: 'lettreur',
    translator: 'traducteur', editor: 'éditeur',
  },
};

/** Traduit un rôle / statut technique ; à défaut, le met simplement en forme. */
export function labelFor(locale: Locale, key: string): string {
  if (!key) return '';
  return LABELS[locale]?.[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

const STRONG_TOKENS = new Set(['actor', 'entity']);

/**
 * Construit le texte localisé d'une notification à partir de ses données structurées.
 * - Variante `<event>_many` quand plusieurs actions sont regroupées ("A et 3 autres ...").
 * - Repli sur le texte anglais stocké (anciennes notifications, évènements inconnus).
 */
export function formatNotification(
  n: Notification,
  templates: Record<string, string>,
  locale: Locale,
): FormattedNotification {
  const manyKey = n.event ? `${n.event}_many` : '';
  const template =
    (n.count > 1 && manyKey ? templates[manyKey] : undefined) ?? (n.event ? templates[n.event] : undefined);

  if (!template) {
    const text = n.message || n.title;
    return { parts: [{ text }], plain: text };
  }

  const meta = n.meta ?? {};
  const values: Record<string, string> = {
    actor: n.actorName || templates.someone || 'Someone',
    entity: n.entityTitle || '',
    count: String(n.count),
    others: String(Math.max(0, n.count - 1)),
    chapter: meta.chapter !== undefined ? String(meta.chapter) : '',
    rating: meta.rating !== undefined ? String(meta.rating) : '',
    role: labelFor(locale, String(meta.role ?? '')),
    status: labelFor(locale, String(meta.status ?? '')),
  };

  const parts: NotificationPart[] = [];
  for (const chunk of template.split(/(\{[a-z]+\})/)) {
    if (!chunk) continue;
    const token = /^\{([a-z]+)\}$/.exec(chunk)?.[1];
    if (token && token in values) {
      parts.push({ text: values[token], strong: STRONG_TOKENS.has(token) });
    } else {
      parts.push({ text: chunk });
    }
  }
  return { parts, plain: parts.map((p) => p.text).join('') };
}
