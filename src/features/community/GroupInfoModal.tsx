import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Crown, Shield, User as UserIcon, Trash2, LogOut, UserMinus, UserCheck } from 'lucide-react';
import { useGroups } from '../../core/hooks/useGroups';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { useMessagingContext } from '../../features/messaging/MessagingContext';
import { getGroupById } from '../../core/services/groupService';
import { getIcon } from '../../shared/ui/Icon';
import { useT } from '../../config/i18n';
import type { Group } from '../../core/services/groupService';

interface Props { group: Group; onClose: () => void }

export default function GroupInfoModal({ group: initialGroup, onClose }: Props) {
  const user = useCurrentUser();
  const t = useT();
  const { kick, promote, demote, leave, remove } = useGroups({ loadOnMount: false });
  const m = useMessagingContext();
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = useState<Group>(initialGroup);

  const refreshGroup = useCallback(async () => {
    const fresh = await getGroupById(initialGroup.id);
    if (fresh) setGroup(fresh);
  }, [initialGroup.id]);

  useEffect(() => {
    let cancelled = false;
    getGroupById(initialGroup.id).then((fresh) => {
      if (!cancelled && fresh) setGroup(fresh);
    });
    return () => { cancelled = true; };
  }, [initialGroup.id]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!user) return null;

  const isOwner = group.ownerId === user.id;
  const myRole = group.members.find((mem) => mem.userId === user.id)?.role;

  const handleAction = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await refreshGroup();
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = () => {
    if (!window.confirm(t.groups.leaveConfirm)) return;
    handleAction(async () => {
      await leave(group.id);
      m.closeConversation();
      onClose();
    });
  };

  const handleDelete = () => {
    if (!window.confirm(t.groups.deleteConfirm)) return;
    handleAction(async () => {
      await remove(group.id);
      m.closeConversation();
      onClose();
    });
  };

  const handlePromote = (memberId: string) => handleAction(() => promote(group.id, memberId));
  const handleDemote = (memberId: string) => handleAction(() => demote(group.id, memberId));
  const handleKick = (memberId: string, name: string) => {
    if (window.confirm(`${t.groups.kickConfirm} ${name}?`)) {
      handleAction(() => kick(group.id, memberId));
    }
  };

  const GroupIcon = getIcon(group.icon);

  return createPortal(
    <div className="group-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="group-modal group-info-modal">
        <header className="group-modal-header">
          <div className="group-modal-title">
            <span className="group-info-icon"
              style={{ background: `${group.color}25`, borderColor: `${group.color}60`, color: group.color }}>
              <GroupIcon size={18} />
            </span>
            <div>
              <h2>{group.name}</h2>
              <span className="group-info-members">
                {group.members.length} {t.groups.members} · {group.genre}
              </span>
            </div>
          </div>
          <button type="button" className="group-modal-close" onClick={onClose} disabled={busy}><X size={16} /></button>
        </header>

        {group.description && <p className="group-info-desc">{group.description}</p>}

        <section className="group-info-section">
          <h3>{t.groups.members}</h3>
          <ul className="group-members-list">
            {group.members.map((mem) => {
              const roleIcon =
                mem.role === 'owner' ? <Crown size={12} />
                : mem.role === 'admin' ? <Shield size={12} />
                : <UserIcon size={12} />;
              const isMe = mem.userId === user.id;

              return (
                <li key={mem.userId} className="group-member-row">
                  <span className="group-member-avatar" style={{ background: group.color }}>
                    {mem.userName.charAt(0).toUpperCase()}
                  </span>
                  <div className="group-member-info">
                    <strong>{mem.userName} {isMe && <em>{t.groups.you}</em>}</strong>
                    <span className="group-member-role">{roleIcon} {mem.role}</span>
                  </div>
                  {isOwner && !isMe && mem.role !== 'owner' && (
                    <div className="group-member-actions">
                      {mem.role === 'member' ? (
                        <button type="button" className="group-member-btn" disabled={busy}
                          onClick={() => handlePromote(mem.userId)} title={t.groups.promote}>
                          <UserCheck size={12} />
                        </button>
                      ) : (
                        <button type="button" className="group-member-btn" disabled={busy}
                          onClick={() => handleDemote(mem.userId)} title={t.groups.demote}>
                          <UserMinus size={12} />
                        </button>
                      )}
                      <button type="button" className="group-member-btn danger" disabled={busy}
                        onClick={() => handleKick(mem.userId, mem.userName)} title={t.groups.kick}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="group-info-actions">
          {myRole !== 'owner' && (
            <button type="button" className="group-action-btn danger" onClick={handleLeave} disabled={busy}>
              <LogOut size={14} /> {t.groups.leave}
            </button>
          )}
          {isOwner && (
            <button type="button" className="group-action-btn danger" onClick={handleDelete} disabled={busy}>
              <Trash2 size={14} /> {t.groups.delete}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}