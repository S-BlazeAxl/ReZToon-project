import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Trophy, FileText, Flame, Moon, Heart,
  Compass, Music, PawPrint, Users, PenTool,
  Plus, Sparkles, Loader2,
} from 'lucide-react';
import type { User } from '../../core/services/userService';
import type { CommunityGroup } from '../../core/services/communityService';
import { getIcon } from '../../shared/ui/Icon';
import { useGroups } from '../../core/hooks/useGroups';
import CreateGroupModal from './CreateGroupModal';
import { useT } from '../../config/i18n';

const GROUP_ICON_MAP: Record<string, typeof Flame> = {
  Flame, Moon, Heart, Compass, Music, PawPrint,
};

interface Props {
  user: User | null;
  activeTab: 'feed' | 'rankings';
  onTabChange: (tab: 'feed' | 'rankings') => void;
  postCount: number;
  likeCount: number;
  groups: CommunityGroup[];
}

export default function CommunityLeftRail({
  user,
  activeTab,
  onTabChange,
  postCount,
  likeCount,
  groups,
}: Props) {
  const navigate = useNavigate();
  const t = useT();
  const { myGroups, suggested, join, loading } = useGroups();
  const [createOpen, setCreateOpen] = useState(false);

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';
  
  const roleLabel = user?.role === 'both'
    ? t.supervisor.roleBoth
    : user?.role === 'creator'
      ? t.common.roleCreator
      : user?.role === 'supervisor'
        ? t.common.roleSupervisor
        : t.common.roleReader;

  const isCreator = user?.role === 'creator' || user?.role === 'both';

  const openGroupChat = (groupId: string) => {
    sessionStorage.setItem('reztoon_open_group', groupId);
    navigate('/messages');
  };

  return (
    <aside className="community-left-rail">
      <div className="rail-card profile-card">
        <div className="rail-profile-header">
          <div className="rail-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
            {user?.photo && user.photo.trim() !== '' ? (
              <img
                src={user.photo}
                alt={user.name}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span>{initial}</span>
            )}
            {isCreator && (
              <span className="rail-avatar-badge">
                <PenTool size={9} />
              </span>
            )}
          </div>
          <strong className="rail-name">{user?.name ?? 'Guest'}</strong>
          <span className="rail-username">
            {user?.username ? `@${user.username}` : user?.email ?? 'Sign in to join'}
          </span>
          <span className={`rail-role role-${user?.role ?? 'reader'}`}>{roleLabel}</span>
        </div>

        <div className="rail-stats">
          <div className="rail-stat">
            <strong>{postCount}</strong>
            <span>{t.community.post}</span>
          </div>
          <div className="rail-stat">
            <strong>{likeCount}</strong>
            <span>{t.common.likes}</span>
          </div>
        </div>
      </div>

      <nav className="rail-card rail-nav">
        <button
          type="button"
          className={`rail-nav-item ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => onTabChange('feed')}
        >
          <LayoutDashboard size={16} />
          <span>{t.community.feed}</span>
        </button>
        <button
          type="button"
          className={`rail-nav-item ${activeTab === 'rankings' ? 'active' : ''}`}
          onClick={() => onTabChange('rankings')}
        >
          <Trophy size={16} />
          <span>{t.community.rankings}</span>
        </button>
        {isCreator && (
          <Link to="/creator/series" className="rail-nav-item">
            <FileText size={16} />
            <span>{t.creator.mySeries}</span>
          </Link>
        )}
      </nav>

      <div className="rail-card rail-groups">
        <div className="rail-card-header">
          <Users size={14} />
          <span>{t.community.myGroups}</span>
          <button
            type="button"
            className="rail-group-create-btn"
            onClick={() => setCreateOpen(true)}
            title={t.supervisor.noGroupYetCreate}
            aria-label={t.supervisor.noGroupYetCreate}
          >
            <Plus size={12} />
          </button>
        </div>

        {loading ? (
          <div className="rail-empty" style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : myGroups.length === 0 ? (
          <div className="rail-empty">
            {t.community.noGroupsYet}
          </div>
        ) : (
          <ul className="rail-group-list">
            {myGroups.map((g) => {
              const GroupIcon = GROUP_ICON_MAP[g.icon] ?? getIcon(g.icon);
              return (
                <li
                  key={g.id}
                  className="rail-group-item"
                  onClick={() => openGroupChat(g.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openGroupChat(g.id);
                    }
                  }}
                >
                  <span
                    className="rail-group-icon"
                    style={{ background: `${g.color}25`, color: g.color }}
                  >
                    <GroupIcon size={14} />
                  </span>
                  <div className="rail-group-info">
                    <strong>{g.name}</strong>
                    <span>
                      {g.members.length} {t.community.members}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && suggested.length > 0 && (
          <>
            <div className="rail-card-header" style={{ marginTop: 14 }}>
              <Sparkles size={12} />
              <span>{t.community.suggested}</span>
            </div>
            <ul className="rail-group-list">
              {suggested.slice(0, 3).map((g) => {
                const GroupIcon = GROUP_ICON_MAP[g.icon] ?? getIcon(g.icon);
                return (
                  <li key={g.id} className="rail-group-item">
                    <span
                      className="rail-group-icon"
                      style={{ background: `${g.color}25`, color: g.color }}
                    >
                      <GroupIcon size={14} />
                    </span>
                    <div className="rail-group-info">
                      <strong>{g.name}</strong>
                      <span>
                        {g.members.length} {t.community.members} · {g.genre}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="rail-group-join-btn"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await join(g.id);
                        if (ok) openGroupChat(g.id);
                      }}
                    >
                      {t.community.join}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {groups.length > 0 && (
        <div className="rail-card">
          <div className="rail-card-header">
            <Users size={14} />
            <span>{t.community.popularCommunities}</span>
          </div>
          <ul className="rail-group-list">
            {groups.map((g) => {
              const Icon = GROUP_ICON_MAP[g.icon] ?? getIcon(g.icon);
              return (
                <li key={g.id} className="rail-group-item">
                  <span className="rail-group-icon">
                    <Icon size={14} />
                  </span>
                  <div className="rail-group-info">
                    <strong>{g.name}</strong>
                    <span>{g.members.toLocaleString()} {t.community.members}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rail-card rail-mini-footer">
        <span>ReZToon Community</span>
        <span>© 2026 · African Manga</span>
      </div>

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(groupId: string) => openGroupChat(groupId)}
      />
    </aside>
  );
}