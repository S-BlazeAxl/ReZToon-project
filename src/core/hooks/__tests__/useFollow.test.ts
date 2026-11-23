import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  user: null as any,
  isFollowing: vi.fn(),
  toggleFollow: vi.fn(),
}));

vi.mock('../../hooks/useCurrentUser', () => ({
  useCurrentUser: () => mocks.user,
}));

vi.mock('../../services/followService', () => ({
  isFollowing: mocks.isFollowing,
  toggleFollow: mocks.toggleFollow,
}));

import { useFollow } from '../useFollow';

const USER = { id: 'user-1', name: 'Test', email: 't@t.com', role: 'reader' };

describe('useFollow', () => {
  beforeEach(() => {
    mocks.user = USER;
    mocks.isFollowing.mockReset();
    mocks.toggleFollow.mockReset();
    mocks.isFollowing.mockResolvedValue(false);
  });

  it('starts not following when db says false', async () => {
    const { result } = renderHook(() => useFollow('target-1', 'creator'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.following).toBe(false);
    expect(result.current.canFollow).toBe(true);
    expect(mocks.isFollowing).toHaveBeenCalledWith('user-1', 'target-1', 'creator');
  });

  it('starts following when db says true', async () => {
    mocks.isFollowing.mockResolvedValue(true);
    const { result } = renderHook(() => useFollow('target-1', 'creator'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.following).toBe(true);
  });

  it('canFollow is false when not authenticated', () => {
    mocks.user = null;
    const { result } = renderHook(() => useFollow('target-1', 'creator'));
    expect(result.current.canFollow).toBe(false);
    expect(mocks.isFollowing).not.toHaveBeenCalled();
  });

  it('toggle flips state on success', async () => {
    mocks.toggleFollow.mockResolvedValue(true);
    const { result } = renderHook(() => useFollow('target-1', 'creator'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simule la mise à jour de la DB pour le re-fetch déclenché par notifyFollowChange()
    mocks.isFollowing.mockResolvedValue(true);

    let next: boolean | undefined;
    await act(async () => {
      next = await result.current.toggle();
    });

    expect(next).toBe(true);
    expect(result.current.following).toBe(true);
    expect(mocks.toggleFollow).toHaveBeenCalledTimes(1);
  });

  it('toggle rolls back state on failure', async () => {
    mocks.toggleFollow.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useFollow('target-1', 'creator'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let next: boolean | undefined;
    await act(async () => {
      next = await result.current.toggle();
    });

    expect(next).toBe(false);
    expect(result.current.following).toBe(false);
  });

  it('toggle is a no-op when already busy', async () => {
    let resolveToggle: (v: boolean) => void = () => {};
    mocks.toggleFollow.mockImplementation(
      () => new Promise<boolean>((res) => { resolveToggle = res; }),
    );

    const { result } = renderHook(() => useFollow('target-1', 'creator'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let firstCall: Promise<boolean> | undefined;
    act(() => {
      firstCall = result.current.toggle();
    });

    let secondResult: boolean | undefined;
    await act(async () => {
      secondResult = await result.current.toggle();
    });

    expect(mocks.toggleFollow).toHaveBeenCalledTimes(1);
    expect(secondResult).toBe(true);

    await act(async () => {
      resolveToggle(true);
      await firstCall;
    });
  });

  it('refreshes on external FOLLOW_EVENT', async () => {
    const { result } = renderHook(() => useFollow('target-1', 'creator'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.isFollowing).toHaveBeenCalledTimes(1);

    mocks.isFollowing.mockResolvedValue(true);
    act(() => {
      window.dispatchEvent(new Event('reztoon:follow-change'));
    });

    await waitFor(() => {
      expect(mocks.isFollowing).toHaveBeenCalledTimes(2);
    });
  });
});