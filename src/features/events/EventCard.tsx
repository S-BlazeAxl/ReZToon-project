import { useMemo } from 'react';
import { Play, Bookmark } from 'lucide-react';
import type { CommunityEvent, EventDesign } from '../../core/services/eventService';
import { DEFAULT_EVENT_DESIGN } from '../../core/services/eventService';
import { useT } from '../../config/i18n';

interface Props {
  event: CommunityEvent;
  onCtaClick?: (type: 'primary' | 'secondary') => void;
}

export default function EventCard({ event, onCtaClick }: Props) {
  const t = useT();
  const d: EventDesign = { ...DEFAULT_EVENT_DESIGN, ...(event.design ?? {}) };
  const accent = d.accentColor;

  const titleLineOne = useMemo(() => {
    if (!d.titleHighlight) return event.title;
    if (!event.title.endsWith(d.titleHighlight)) return event.title;
    return event.title.slice(0, event.title.length - d.titleHighlight.length).trim();
  }, [event.title, d.titleHighlight]);

  const hasHighlight = Boolean(d.titleHighlight);

  const metaItems = (d.metaItems ?? '')
    .split('·')
    .map((m) => m.trim())
    .filter(Boolean);

  const stats = Array.isArray(d.stats) && d.stats.length > 0
    ? d.stats
    : [
      { value: '—', label: t.events.attendeesDefault || 'ATTENDEES' },
      { value: '—', label: t.events.ratingDefault || 'RATING' },
      { value: '—', label: t.events.editionDefault || 'EDITION' },
    ];

  return (
    <article className="event-slide-content">
      {d.image && (
        <div
          className="event-slide-bg"
          style={{ backgroundImage: `url(${d.image})` }}
        />
      )}

      <div
        className={`event-slide-overlay overlay-${d.imageOverlay}`}
        style={{ opacity: d.overlayIntensity }}
      />

      <div className="container event-container">
        <div className="event-content">
          {d.badgeText && (
            <span className="event-badge" style={{ color: accent }}>
              {d.badgeText}
            </span>
          )}

          <h1 className="event-title">
            {titleLineOne}
            {hasHighlight && (
              <>
                <br />
                <span className="highlight" style={{ color: accent }}>
                  {d.titleHighlight}
                </span>
              </>
            )}
          </h1>

          {(metaItems.length > 0 || d.ageBadge || d.rating) && (
            <div className="event-meta">
              {d.ageBadge && <span className="age-badge">{d.ageBadge}</span>}
              {metaItems.map((m, i) => (
                <span key={i} className="meta-item">
                  {m}
                </span>
              ))}
              {d.rating && (
                <span className="meta-item rating">★ {d.rating}</span>
              )}
            </div>
          )}

          {event.description && d.showDescription && (
            <p className="event-desc">{event.description}</p>
          )}

          <div className="event-actions">
            <button
              type="button"
              className="btn btn-primary event-cta-primary"
              style={{ background: accent, color: '#0d0d1a' }}
              onClick={() => onCtaClick ? onCtaClick('primary') : alert('Registration link coming soon!')}
            >
              <Play size={14} fill="currentColor" />
              {d.primaryCta || t.events.primaryCtaDefault || 'Register'}
            </button>
            <button 
              type="button" 
              className="btn btn-outline event-cta-secondary"
              onClick={() => onCtaClick ? onCtaClick('secondary') : alert('More details coming soon!')}
            >
              <Bookmark size={14} />
              {d.secondaryCta || t.events.secondaryCtaDefault || 'Learn more'}
            </button>
          </div>

          <div className="event-stats">
            {stats.slice(0, 4).map((s, i) => (
              <div key={i} className="event-stat">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}