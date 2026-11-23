import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Users, Heart, MessageCircle, PenTool, MapPin, Globe,
  BookOpen, ArrowRight, Sparkles, Shield,
} from 'lucide-react';
import type { CommunityUserProfile } from '../../core/services/communityService';
import { formatNumber, formatRelativeTime } from '../../core/utils/format';
import { useT, useI18n } from '../../config/i18n';

interface Props {
  profile: CommunityUserProfile;
  onClose: () => void;
  onOpenPost?: (postId: string) => void;
}

export default function UserProfileModal({ profile, onClose, onOpenPost }: Props) {
  const t = useT();
  const { lang } = useI18n();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    
    // Fix body overflow
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    // Auto-focus close button for accessibility
    closeBtnRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const initial = profile.name.charAt(0).toUpperCase();
  const isCreator = profile.role === 'creator' || profile.role === 'both';
  const roleLabel =
    profile.role === 'both'
      ? t.supervisor.roleBoth
      : profile.role === 'creator'
        ? t.common.roleCreator
        : profile.role === 'supervisor'
          ? t.common.roleSupervisor
          : t.common.roleReader;

  const typeLabel = (type: string): string => {
    switch (type) {
      case 'release': return t.community.newRelease;
      case 'publication': return t.community.article;
      case 'poll': return t.community.poll;
      case 'poster': return t.community.poster;
      default: return type;
    }
  };

  return (
    <div
      className="user-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="user-modal" role="dialog" aria-modal="true" aria-label={profile.name}>
        <button
          type="button"
          className="user-modal-close"
          onClick={onClose}
          aria-label={t.common.close}
          ref={closeBtnRef}
        >
          <X size={16} />
        </button>

        <header className="user-modal-header">
          <div className={`user-modal-avatar ${isCreator ? 'is-creator' : ''}`}>
            {profile.photo ? (
              <img src={profile.photo} alt={profile.name} />
            ) : (
              <span>{initial}</span>
            )}
            {isCreator && (
              <span className="user-modal-avatar-badge">
                <PenTool size={10} />
              </span>
            )}
          </div>

          <div className="user-modal-title">
            <h2>{profile.name}</h2>
            <span className="user-modal-username">
              {profile.username ? `@${profile.username}` : t.community.communityMember}
            </span>
            <div className="user-modal-badges">
              {profile.role && (
                <span className={`user-modal-role role-${profile.role}`}>
                  {profile.role === 'supervisor' && <Shield size={9} />}
                  {isCreator && <PenTool size={9} />}
                  {roleLabel}
                </span>
              )}
              {profile.country && (
                <span className="user-modal-country">
                  <Globe size={10} />
                  {profile.country}
                </span>
              )}
              {profile.residence && (
                <span className="user-modal-country">
                  <MapPin size={10} />
                  {profile.residence}
                </span>
              )}
            </div>
          </div>
        </header>

        {profile.bio && (
          <p className="user-modal-bio">{profile.bio}</p>
        )}

        <div className="user-modal-stats">
          <div className="user-modal-stat">
            <Users size={14} />
            <strong>{profile.postCount}</strong>
            <span>{t.common.postCount}</span>
          </div>
          <div className="user-modal-stat">
            <Heart size={14} />
            <strong>{formatNumber(profile.likeCount)}</strong>
            <span>{t.common.likes}</span>
          </div>
          <div className="user-modal-stat">
            <MessageCircle size={14} />
            <strong>{formatNumber(profile.commentCount)}</strong>
            <span>{t.common.comments}</span>
          </div>
        </div>

        <section className="user-modal-section">
          <div className="user-modal-section-head">
            <Sparkles size={14} />
            <h3>{t.community.recentActivity}</h3>
            <span className="user-modal-section-count">
              {profile.recentPosts.length}
            </span>
          </div>

          {profile.recentPosts.length === 0 ? (
            <p className="user-modal-empty">{t.community.noPostsYet}</p>
          ) : (
            <ul className="user-modal-posts">
              {profile.recentPosts.map((p) => (
                <li
                  key={p.id}
                  className="user-modal-post"
                  role={onOpenPost ? 'button' : undefined}
                  tabIndex={onOpenPost ? 0 : -1}
                  onClick={() => {
                    if (onOpenPost) {
                      onOpenPost(p.id);
                      onClose();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (onOpenPost && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onOpenPost(p.id);
                      onClose();
                    }
                  }}
                >
                  <span className={`user-modal-post-badge badge-${p.type}`}>
                    {typeLabel(p.type)}
                  </span>
                  <div className="user-modal-post-info">
                    <strong>{p.title}</strong>
                    <span>{formatRelativeTime(p.createdAt, lang)}</span>
                  </div>
                  <div className="user-modal-post-metrics">
                    <span>
                      <Heart size={10} />
                      {p.likes.length}
                    </span>
                    <span>
                      <MessageCircle size={10} />
                      {p.comments.length}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isCreator && (
          <Link to="/creator/series" className="user-modal-creator-cta">
            <BookOpen size={14} />
            <span>{t.community.viewCreatorStudio}</span>
            <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </div>
  );
}