import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  user: null as any,
  getAllGroups: vi.fn(),
  getUserGroups: vi.fn(),
  getSuggestedGroups: vi.fn(),
  createGroup: vi.fn(),
  joinGroup: vi.fn(),
}));

vi.mock('../../hooks/useCurrentUser', () => ({
  useCurrentUser: () => mocks.user,
}));

vi.mock('../../services/groupService', () => ({
  getAllGroups: mocks.getAllGroups,
  getUserGroups: mocks.getUserGroups,
  getSuggestedGroups: mocks.getSuggestedGroups,
  createGroup: mocks.createGroup,
  joinGroup: mocks.joinGroup,
  updateGroup: vi.fn(),
  leaveGroup: vi.fn(),
  deleteGroup: vi.fn(),
  updateMemberRole: vi.fn(),
  kickMember: vi.fn(),
}));

import { useGroups } from '../useGroups';

const USER = { id: 'u1', name: 'Test', email: 't@t.com', role: 'reader' };
const MOCK_GROUP = { id: 'g1', name: 'Group 1', members: [] };

describe('useGroups', () => {
  beforeEach(() => {
    mocks.user = USER;
    mocks.getAllGroups.mockReset().mockResolvedValue([MOCK_GROUP]);
    mocks.getUserGroups.mockReset().mockResolvedValue([MOCK_GROUP]);
    mocks.getSuggestedGroups.mockReset().mockResolvedValue([]);
    mocks.createGroup.mockReset();
    mocks.joinGroup.mockReset();
  });

  it('loads groups on mount', async () => {
    const { result } = renderHook(() => useGroups());
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    expect(result.current.allGroups).toHaveLength(1);
    expect(result.current.myGroups).toHaveLength(1);
    expect(mocks.getAllGroups).toHaveBeenCalledTimes(1);
  });

  it('does not load if loadOnMount is false', () => {
    renderHook(() => useGroups({ loadOnMount: false }));
    expect(mocks.getAllGroups).not.toHaveBeenCalled();
  });

  it('create calls dbCreateGroup and triggers refresh', async () => {
    mocks.createGroup.mockResolvedValue({ success: true, group: { id: 'g2' } });
    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ name: 'New Group' } as any);
    });

    expect(mocks.createGroup).toHaveBeenCalledTimes(1);
    // The event should trigger a refetch
    await waitFor(() => expect(mocks.getAllGroups).toHaveBeenCalledTimes(2));
  });

  it('join calls dbJoinGroup', async () => {
    mocks.joinGroup.mockResolvedValue(true);
    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success;
    await act(async () => {
      success = await result.current.join('g1');
    });

    expect(success).toBe(true);
    expect(mocks.joinGroup).toHaveBeenCalledWith('g1', expect.objectContaining({ id: 'u1' }));
  });
});