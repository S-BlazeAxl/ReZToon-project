import { useEffect, useState } from 'react';
import { Users, UserPlus, Crown, Edit3, Trash2, Shield } from 'lucide-react';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import {
  getTeam,
  ensureTeam,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  ROLE_LABELS,
  type TeamRole,
  type SeriesTeam,
} from '../../core/services/collaborationService';
import { getUsers, type User } from '../../core/services/userService';
import { useT } from '../../config/i18n';

interface Props {
  seriesId: string;
  ownerId: string;
}

const ALL_ROLES: TeamRole[] = [
  'writer',
  'artist',
  'colorist',
  'letterer',
  'translator',
  'editor',
];

export default function TeamPanel({ seriesId, ownerId }: Props) {
  const user = useCurrentUser();
  const t = useT();
  const [tick, setTick] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState<SeriesTeam | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [ownerName, setOwnerName] = useState<string>(t.team.owner);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!seriesId) {
      setTeam(null);
      setTeamLoading(false);
      return;
    }

    let cancelled = false;
    setTeamLoading(true);

    (async () => {
      try {
        const existing = await getTeam(seriesId);
        if (cancelled) return;
        const resolved = existing ?? (await ensureTeam(seriesId, ownerId));
        if (!cancelled) setTeam(resolved);
      } catch (err) {
        console.error('[TeamPanel] failed to load team:', err);
        if (!cancelled) setTeam(null);
      } finally {
        if (!cancelled) setTeamLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seriesId, ownerId, tick]);

  useEffect(() => {
    if (!showAdd || !team) {
      setAvailableUsers([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const all = await getUsers();
      if (cancelled) return;

      const existingIds = new Set(team.members.map((m) => m.userId));
      existingIds.add(team.ownerId);
      const q = search.trim().toLowerCase();

      const filtered = all
        .filter((u) => !existingIds.has(u.id))
        .filter((u) =>
          !q
            ? true
            : u.name.toLowerCase().includes(q) ||
              (u.username ?? '').toLowerCase().includes(q),
        )
        .slice(0, 8);

      setAvailableUsers(filtered);
    })();

    return () => {
      cancelled = true;
    };
  }, [showAdd, team, search]);

  useEffect(() => {
    if (!team?.ownerId) return;
    let cancelled = false;

    (async () => {
      const all = await getUsers();
      if (cancelled) return;
      const owner = all.find((u) => u.id === team.ownerId);
      setOwnerName(owner?.name ?? t.team.owner);
    })();

    return () => {
      cancelled = true;
    };
  }, [team?.ownerId, t.team.owner]);

  const refresh = () => setTick((v) => v + 1);

  if (!user) return null;

  if (teamLoading) {
    return (
      <section className="team-panel">
        <header className="team-panel-header">
          <div className="team-panel-title">
            <Users size={16} />
            <h3>{t.team.title}</h3>
          </div>
        </header>
        <div className="team-loading">{t.team.loading}</div>
      </section>
    );
  }

  if (!team) return null;

  const isOwner = user.id === ownerId;

  const handleAdd = async (
    targetUserId: string,
    targetUserName: string,
    role: TeamRole,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await addTeamMember(seriesId, ownerId, {
        userId: targetUserId,
        userName: targetUserName,
        role,
      });
      if (result.success) {
        setShowAdd(false);
        setSearch('');
        refresh();
      } else {
        console.warn('[TeamPanel] add failed:', result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (busy) return;
    if (!window.confirm(t.team.removeConfirm)) return;
    setBusy(true);
    try {
      await removeTeamMember(seriesId, userId);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (userId: string, role: TeamRole) => {
    if (busy) return;
    setBusy(true);
    try {
      await updateMemberRole(seriesId, userId, role);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="team-panel">
      <header className="team-panel-header">
        <div className="team-panel-title">
          <Users size={16} />
          <h3>{t.team.title}</h3>
          <span className="team-panel-count">{team.members.length + 1}</span>
        </div>

        {isOwner && (
          <button
            type="button"
            className="team-add-btn"
            onClick={() => setShowAdd((v) => !v)}
            disabled={busy}
          >
            <UserPlus size={13} /> {t.team.add}
          </button>
        )}
      </header>

      {showAdd && (
        <div className="team-add-panel">
          <input
            type="text"
            placeholder={t.team.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {availableUsers.length === 0 ? (
            <p className="team-add-empty">{t.team.empty}</p>
          ) : (
            <ul className="team-add-list">
              {availableUsers.map((u) => (
                <li key={u.id} className="team-add-item">
                  <span className="team-add-avatar">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="team-add-info">
                    <strong>{u.name}</strong>
                    <span>@{u.username ?? u.email}</span>
                  </div>
                  <select
                    className="team-add-role"
                    onChange={(e) =>
                      handleAdd(u.id, u.name, e.target.value as TeamRole)
                    }
                    defaultValue=""
                    disabled={busy}
                  >
                    <option value="" disabled>
                      {t.team.role}
                    </option>
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ul className="team-members">
        <li className="team-member owner">
          <span className="team-member-avatar">
            {ownerName.charAt(0).toUpperCase()}
          </span>
          <div className="team-member-info">
            <strong>{ownerName}</strong>
            <span className="team-member-role">
              <Crown size={10} /> {t.team.owner}
            </span>
          </div>
        </li>

        {team.members.map((member) => {
          const role = member.role;
          return (
            <li key={member.userId} className="team-member">
              <span className="team-member-avatar">
                {member.userName.charAt(0).toUpperCase()}
              </span>
              <div className="team-member-info">
                <strong>{member.userName}</strong>
                {isOwner ? (
                  <select
                    className="team-member-role-select"
                    value={role}
                    onChange={(e) =>
                      handleRoleChange(member.userId, e.target.value as TeamRole)
                    }
                    disabled={busy}
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="team-member-role">
                    <Shield size={10} /> {ROLE_LABELS[role]}
                  </span>
                )}
              </div>
              {isOwner && (
                <button
                  type="button"
                  className="team-member-remove"
                  onClick={() => handleRemove(member.userId)}
                  disabled={busy}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="team-legend">
        <p>{t.team.permissions}</p>
        <ul>
          <li>
            <Edit3 size={10} /> {t.team.editor}
          </li>
          <li>{t.team.writer}</li>
          <li>{t.team.artist}</li>
        </ul>
      </div>
    </section>
  );
}