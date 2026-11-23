import { Pin, X } from 'lucide-react';

interface Props {
  count?: number;
  onClear?: () => void;
}

export default function PinnedBanner({ count = 0, onClear }: Props) {
  if (count === 0) return null;
  return (
    <div className="message-pinned-banner">
      <Pin size={12} />
      <span>
        {count} pinned message{count > 1 ? 's' : ''}
      </span>
      {onClear && (
        <button type="button" onClick={onClear} aria-label="Clear pinned">
          <X size={12} />
        </button>
      )}
    </div>
  );
}