import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '../../config/i18n';

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
}

interface Props {
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function MediaViewer({ media, initialIndex, onClose }: Props) {
  const t = useT();
  const [index, setIndex] = useState<number>(initialIndex);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((prev: number) => (prev + 1) % media.length);
      if (e.key === 'ArrowLeft') setIndex((prev: number) => (prev - 1 + media.length) % media.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [media.length, onClose]);

  if (!media || media.length === 0) return null;

  const currentMedia = media[index];

  return createPortal(
    <div className="media-viewer-overlay" onClick={onClose}>
      <button
        type="button"
        className="media-viewer-close"
        onClick={onClose}
        aria-label={t.common.close}
      >
        <X size={24} />
      </button>

      {media.length > 1 && (
        <>
          <button
            type="button"
            className="media-viewer-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((prev: number) => (prev - 1 + media.length) % media.length);
            }}
            aria-label={t.common.previous}
          >
            <ChevronLeft size={32} />
          </button>
          <button
            type="button"
            className="media-viewer-nav next"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((prev: number) => (prev + 1) % media.length);
            }}
            aria-label={t.common.next}
          >
            <ChevronRight size={32} />
          </button>
          <div className="media-viewer-counter">
            {index + 1} / {media.length}
          </div>
        </>
      )}

      <div className="media-viewer-content" onClick={(e) => e.stopPropagation()}>
        {currentMedia.type === 'image' ? (
          <img src={currentMedia.url} alt="" />
        ) : (
          <video src={currentMedia.url} controls autoPlay />
        )}
      </div>
    </div>,
    document.body
  );
}