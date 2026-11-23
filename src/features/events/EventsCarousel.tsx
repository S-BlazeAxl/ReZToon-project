import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import EventCard from './EventCard';
import { useParticles } from '../../core/hooks/useParticles';
import { getEvents, type CommunityEvent } from '../../core/services/eventService';
import { useT } from '../../config/i18n';

interface Props {
  autoPlayMs?: number;
}

export default function EventsCarousel({ autoPlayMs = 5000 }: Props) {
  const t = useT();
  const sectionRef = useRef<HTMLDivElement>(null);
  const particlesRef = useParticles(80);
  const timerRef = useRef<number | null>(null);
  const currentRef = useRef(0);

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const data = await getEvents();
      if (!cancelled) {
        setEvents(data);
        setLoading(false);
      }
    };
    void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = events.length;

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      const wrapped = ((next % total) + total) % total;
      setPrevIndex(currentRef.current);
      setCurrent(wrapped);
    },
    [total],
  );

  const next = useCallback(() => goTo(currentRef.current + 1), [goTo]);
  const prev = useCallback(() => goTo(currentRef.current - 1), [goTo]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [total]);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (paused || total <= 1 || !isVisible) return;

    timerRef.current = window.setInterval(() => {
      goTo(currentRef.current + 1);
    }, autoPlayMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [paused, total, isVisible, autoPlayMs, goTo]);

  useEffect(() => {
    if (prevIndex === null) return;
    const timer = window.setTimeout(() => setPrevIndex(null), 1200);
    return () => window.clearTimeout(timer);
  }, [prevIndex, current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  const activeEvent = useMemo(() => events[current] ?? null, [events, current]);

  if (loading) return null;
  if (total === 0 || !activeEvent) return null;

  return (
    <section className="events-section" aria-label="Community events" id="events">
      <header className="annonces-header events-header">
        <div className="annonces-heading">
          <span className="annonces-tag events-tag">
            <Sparkles size={12} /> {t.events.title}
          </span>
          <h2 className="annonces-title">{t.events.allEvents}</h2>
          <p className="annonces-subtitle">
            {t.events.tryAnother}
          </p>
        </div>

        {total > 1 && (
          <div className="annonces-nav">
            <button
              type="button"
              className="annonces-arrow"
              onClick={prev}
              aria-label={t.common.previous}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="annonces-arrow"
              onClick={next}
              aria-label={t.common.next}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </header>

      <div
        ref={sectionRef}
        className={`events-hero ${isVisible ? 'is-visible' : ''}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="events-hero-track">
          {events.map((event, i) => {
            const isActive = i === current;
            const isPrev = i === prevIndex;
            return (
              <div
                key={event.id}
                className={`event-slide ${isActive ? 'active' : ''} ${isPrev ? 'leaving' : ''}`}
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
                style={{ pointerEvents: isActive ? 'auto' : 'none' }}
              >
                <EventCard event={event} />
              </div>
            );
          })}
        </div>

        <div className="events-particles-layer" aria-hidden="true">
          <canvas ref={particlesRef} className="events-particles-canvas" />
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              className="featured-nav featured-nav-prev"
              onClick={prev}
              aria-label={t.common.previous}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="featured-nav featured-nav-next"
              onClick={next}
              aria-label={t.common.next}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}