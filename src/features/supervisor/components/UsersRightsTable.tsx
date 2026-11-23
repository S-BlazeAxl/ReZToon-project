import { UserCheck, UserX, UserMinus, ShieldAlert, Trash2, Lock } from 'lucide-react';
import type { Permission, User } from '../../../core/services/userService';
import { useT } from '../../../config/i18n';

interface Props {
  users: User[];
  onTogglePermission: (userId: string, permission: Permission) => void;
  onSetRole: (userId: string, role: User['role']) => void;
  onToggleActive: (userId: string, currentStatus: boolean) => void;
  onBan: (userId: string) => void;
  onDelete: (userId: string) => void;
  currentUserId?: string;
}

export default function UsersRightsTable({
  users,
  onTogglePermission,
  onSetRole,
  onToggleActive,
  onBan,
  onDelete,
  currentUserId,
}: Props) {
  const t = useT();

  const ALL_PERMISSIONS: { id: Permission; label: string; description: string }[] = [
    {
      id: 'moderate_content',
      label: t.supervisor.permModerateContent,
      description: t.supervisor.permModerateContentDesc,
    },
    {
      id: 'manage_users',
      label: t.supervisor.permManageUsers,
      description: t.supervisor.permManageUsersDesc,
    },
    {
      id: 'manage_reports',
      label: t.supervisor.permManageReports,
      description: t.supervisor.permManageReportsDesc,
    },
  ];

  return (
    <div className="supervisor-table">
      <div
        className="supervisor-table-head"
        style={{ gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 1.5fr 1.5fr' }}
      >
        <span>{t.supervisor.name}</span>
        <span>{t.supervisor.email}</span>
        <span>{t.supervisor.role}</span>
        <span>{t.supervisor.status}</span>
        <span>{t.supervisor.rights}</span>
        <span>{t.supervisor.actions}</span>
      </div>

      {users.map((u) => {
        const isBanned = u.banUntil && new Date(u.banUntil) > new Date();
        const isSelf = currentUserId === u.id;
        const isSupervisor = u.role === 'supervisor';
        const isPeerSupervisor = isSupervisor && !isSelf;

        return (
          <div
            key={u.id}
            className="supervisor-table-row"
            style={{ gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 1.5fr 1.5fr' }}
          >
            <span className="supervisor-target">{u.name}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{u.email}</span>
            <span>
              <select
                className="creator-select"
                value={u.role ?? 'reader'}
                onChange={(e) => onSetRole(u.id, e.target.value as User['role'])}
                disabled={u.isDeleted || isSelf || isPeerSupervisor}
              >
                <option value="reader">{t.common.roleReader}</option>
                <option value="creator">{t.common.roleCreator}</option>
                <option value="both">{t.supervisor.roleBoth}</option>
                <option value="supervisor">{t.common.roleSupervisor}</option>
              </select>
            </span>
            <span>
              {u.isDeleted ? (
                <span style={{ color: '#ff6b61', fontWeight: 800 }}>{t.supervisor.deleted}</span>
              ) : isBanned ? (
                <span style={{ color: '#f5b042', fontWeight: 800 }}>{t.supervisor.banned}</span>
              ) : u.isActive === false ? (
                <span style={{ color: '#a78bfa', fontWeight: 800 }}>{t.supervisor.inactive}</span>
              ) : (
                <span style={{ color: '#4ade80', fontWeight: 800 }}>{t.supervisor.active}</span>
              )}
            </span>
            <span className="supervisor-actions">
              {isSupervisor ? (
                <span
                  className="supervisor-action-btn approve"
                  title={t.supervisor.fullAccess}
                  style={{ cursor: 'default' }}
                >
                  <Lock size={14} />
                </span>
              ) : (
                ALL_PERMISSIONS.map((p) => {
                  const active = (u.permissions ?? []).includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`supervisor-action-btn ${active ? 'approve' : ''}`}
                      onClick={() => onTogglePermission(u.id, p.id)}
                      title={`${active ? t.supervisor.revoke : t.supervisor.grant}: ${p.description}`}
                      disabled={u.isDeleted}
                    >
                      {active ? <UserCheck size={14} /> : <UserX size={14} />}
                    </button>
                  );
                })
              )}
            </span>
            <span className="supervisor-actions" style={{ gap: '6px' }}>
              <button
                type="button"
                className="supervisor-action-btn"
                onClick={() => onToggleActive(u.id, u.isActive ?? true)}
                title={
                  u.isActive === false
                    ? t.supervisor.activateAccount
                    : t.supervisor.deactivateAccount
                }
                disabled={u.isDeleted || isSelf || isPeerSupervisor}
              >
                <UserMinus size={14} />
              </button>

              <button
                type="button"
                className="supervisor-action-btn"
                style={{ color: '#f5b042' }}
                onClick={() => onBan(u.id)}
                title={t.supervisor.banWithPenalty}
                disabled={u.isDeleted || isSelf || isPeerSupervisor}
              >
                <ShieldAlert size={14} />
              </button>

              <button
                type="button"
                className="supervisor-action-btn reject"
                onClick={() => onDelete(u.id)}
                title={t.supervisor.permanentlyDelete}
                disabled={u.isDeleted || isSelf || isPeerSupervisor}
              >
                <Trash2 size={14} />
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}