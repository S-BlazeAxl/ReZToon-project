import { useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck, Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { useFollow } from '../../core/hooks/useFollow';
import { useT } from '../../config/i18n';
import type { FollowTargetType } from '../../core/services/followService';

interface Props {
  targetId: string;
  type: FollowTargetType;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'icon';
  labels?: { on: string; off: string };
}

export default function FollowButton({
  targetId,
  type,
  size = 'md',
  variant = 'solid',
  labels,
}: Props) {
  const t = useT();
  const navigate = useNavigate();
  const { following, toggle, canFollow, loading } = useFollow(targetId, type);

  const onLabel = labels?.on ?? (type === 'creator' ? t.common.following : t.mangaDetail.inLibrary);
  const offLabel = labels?.off ?? (type === 'creator' ? t.common.follow : t.mangaDetail.library);

  const Icon = loading
    ? Loader2
    : following
      ? type === 'creator'
        ? UserCheck
        : BookmarkCheck
      : type === 'creator'
        ? UserPlus
        : Bookmark;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canFollow) {
      navigate('/let-go');
      return;
    }
    void toggle();
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={`follow-btn-icon ${following ? 'following' : ''}`}
        onClick={handleClick}
        disabled={loading}
        aria-label={following ? onLabel : offLabel}
        title={following ? onLabel : offLabel}
      >
        <Icon size={16} className={loading ? 'spin' : ''} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`follow-btn follow-btn-${size} follow-btn-${variant} ${following ? 'following' : ''}`}
      onClick={handleClick}
      disabled={loading}
    >
      <Icon size={size === 'sm' ? 12 : 14} className={loading ? 'spin' : ''} />
      <span>{following ? onLabel : offLabel}</span>
    </button>
  );
}