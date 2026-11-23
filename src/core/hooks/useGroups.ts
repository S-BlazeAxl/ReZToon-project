import { useCallback, useEffect, useState } from 'react';
import { useCurrentUser } from './useCurrentUser';
import {
  getAllGroups,
  getUserGroups,
  getSuggestedGroups,
  createGroup as dbCreateGroup,
  updateGroup as dbUpdateGroup,
  deleteGroup as dbDeleteGroup,
  joinGroup as dbJoinGroup,
  leaveGroup as dbLeaveGroup,
  updateMemberRole as dbUpdateMemberRole,
  kickMember as dbKickMember,
  type Group,
  type CreateGroupInput,
} from '../services/groupService';

const GROUP_EVENT = 'reztoon:group-change';

export function notifyGroupChange(): void {
  window.dispatchEvent(new Event(GROUP_EVENT));
}

export function useGroups(options: { loadOnMount?: boolean } = {}) {
  const { loadOnMount = true } = options;
  const user = useCurrentUser();
  const userId = user?.id;

  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [suggested, setSuggested] = useState<Group[]>([]);
  const [loading, setLoading] = useState(loadOnMount);

  const loadGroups = useCallback(async () => {
    if (!userId) {
      setMyGroups([]);
      setAllGroups([]);
      setSuggested([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [all, my, sug] = await Promise.all([
        getAllGroups(),
        getUserGroups(userId),
        getSuggestedGroups(userId),
      ]);
      setAllGroups(all);
      setMyGroups(my);
      setSuggested(sug);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!loadOnMount) return;
    
    void loadGroups();
    const handler = () => void loadGroups();
    window.addEventListener(GROUP_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(GROUP_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, [loadOnMount, loadGroups]);

  const create = useCallback(
    async (input: CreateGroupInput) => {
      if (!user) return { success: false, message: 'You must be signed in.' };
      const result = await dbCreateGroup(
        { id: user.id, name: user.name, avatar: user.photo },
        input,
      );
      if (result.success) notifyGroupChange();
      return result;
    },
    [user],
  );

  const update = useCallback(
    async (groupId: string, patch: Parameters<typeof dbUpdateGroup>[2]) => {
      if (!user) return null;
      const result = await dbUpdateGroup(groupId, user.id, patch);
      if (result) notifyGroupChange();
      return result;
    },
    [user],
  );

  const join = useCallback(
    async (groupId: string) => {
      if (!user) return false;
      const ok = await dbJoinGroup(groupId, { id: user.id, name: user.name, avatar: user.photo });
      if (ok) notifyGroupChange();
      return ok;
    },
    [user],
  );

  const leave = useCallback(
    async (groupId: string) => {
      if (!user) return false;
      const ok = await dbLeaveGroup(groupId, user.id);
      if (ok) notifyGroupChange();
      return ok;
    },
    [user],
  );

  const remove = useCallback(
    async (groupId: string) => {
      if (!user) return false;
      const ok = await dbDeleteGroup(groupId, user.id);
      if (ok) notifyGroupChange();
      return ok;
    },
    [user],
  );

  const promote = useCallback(
    async (groupId: string, memberId: string) => {
      if (!user) return false;
      const ok = await dbUpdateMemberRole(groupId, user.id, memberId, 'admin');
      if (ok) notifyGroupChange();
      return ok;
    },
    [user],
  );

  const demote = useCallback(
    async (groupId: string, memberId: string) => {
      if (!user) return false;
      const ok = await dbUpdateMemberRole(groupId, user.id, memberId, 'member');
      if (ok) notifyGroupChange();
      return ok;
    },
    [user],
  );

  const kick = useCallback(
    async (groupId: string, memberId: string) => {
      if (!user) return false;
      const ok = await dbKickMember(groupId, user.id, memberId);
      if (ok) notifyGroupChange();
      return ok;
    },
    [user],
  );

  return {
    myGroups,
    allGroups,
    suggested,
    loading,
    create,
    update,
    join,
    leave,
    remove,
    promote,
    demote,
    kick,
    refresh: loadGroups,
  };
}