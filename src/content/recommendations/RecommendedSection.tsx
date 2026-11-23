import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Sparkles, TrendingUp, Star, Eye, Heart, Play,
} from 'lucide-react';
import { getIcon } from '../../shared/ui/Icon';
import { useHorizontalScroll } from '../../core/hooks/useHorizontalScroll';
import type { Recommendation } from '../../core/services/recommendationService';
import { formatNumber } from '../../core/utils/format';
import { useT } from '../../config/i18n';

interface Props {
  title: string;
  subtitle?: string;
  tag?: string;
  recommendations: Recommendation[];
  tagIcon?: 'sparkles' | 'trending' | 'heart';
}

export default function RecommendedSection({
  title,
  subtitle,
  tag = 'For You',
  recommendations,
  tagIcon = 'sparkles',
}: Props) {
  const navigate = useNavigate();
  const t = useT();

  const {
    trackRef,
    canPrev,
    canNext,
    isDragging,
    scrollByAmount,
    dragHandlers,
  } = useHorizontalScroll('.rec-card', {
    gap: 16,
    resetKey: recommendations.length,
  });

  if (recommendations.length === 0) return null;

  const IconComp =
    tagIcon === 'trending' ? TrendingUp : tagIcon === 'heart' ? Heart : Sparkles;

  return (
    <section className="rec-section" aria-label={title}>
      <header className="annonces-header">
        <div className="annonces-heading">
          <span className="annonces-tag">
            <IconComp size={12} /> {tag}
          </span>
          <h2 className="annonces-title">{title}</h2>
          {subtitle && <p className="annonces-subtitle">{subtitle}</p>}
        </div>

        <div className="annonces-nav">
          <button
            type="button"
            className="annonces-arrow"
            onClick={() => scrollByAmount(-1)}
            disabled={!canPrev}
            aria-label={t.common.previous}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="annonces-arrow"
            onClick={() => scrollByAmount(1)}
            disabled={!canNext}
            aria-label={t.common.next}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div
        ref={trackRef}
        className={`annonces-track rec-track ${isDragging ? 'dragging' : ''}`}
        {...dragHandlers}
      >
        {recommendations.map((rec) => {
          const Icon = getIcon(rec.manga.cover);
          return (
            <article
              key={rec.manga.id}
              className="rec-card"
              onClick={() => navigate(`/manga/${rec.manga.id}`)}
            >
              <div className="rec-reason">
                <Sparkles size={10} />
                <span>{rec.reason}</span>
              </div>

              <div className="rec-cover">
                <Icon size={44} />
                <span className={`rec-status status-${rec.manga.status}`}>
                  {rec.manga.status}
                </span>
              </div>

              <div className="rec-body">
                <h3 className="rec-title" title={rec.manga.title}>
                  {rec.manga.title}
                </h3>
                <span className="rec-genre">{rec.manga.genre}</span>

                <div className="rec-metrics">
                  <span>
                    <Star size={10} fill="currentColor" />
                    {rec.manga.rating.toFixed(1)}
                  </span>
                  <span>
                    <Eye size={10} />
                    {formatNumber(rec.manga.reads)}
                  </span>
                  <span>
                    <Heart size={10} />
                    {formatNumber(rec.manga.likes)}
                  </span>
                </div>

                <Link
                  to={`/manga/${rec.manga.id}/read/1`}
                  className="rec-read"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Play size={11} fill="currentColor" />
                  {t.common.read}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}