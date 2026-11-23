import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  user: null as any,
  getEdition: vi.fn(),
  getCategories: vi.fn(),
  getEditionStatus: vi.fn(),
  getPastEditions: vi.fn(),
  getCategoryLeaderboard: vi.fn(),
  getTotalVotes: vi.fn(),
  getTrendingNominees: vi.fn(),
  getUserVoteForCategory: vi.fn(),
  castVote: vi.fn(),
}));

vi.mock('../../hooks/useCurrentUser', () => ({
  useCurrentUser: () => mocks.user,
}));

vi.mock('../../../config/i18n', () => ({
  useT: () => ({
    awards: {
      signInToVote: 'Sign in to vote',
      noCategorySelected: 'No category selected',
    },
  }),
}));

vi.mock('../../services/awardsService', () => ({
  getEdition: mocks.getEdition,
  getCategories: mocks.getCategories,
  getEditionStatus: mocks.getEditionStatus,
  getPastEditions: mocks.getPastEditions,
  getCategoryLeaderboard: mocks.getCategoryLeaderboard,
  getTotalVotes: mocks.getTotalVotes,
  getTrendingNominees: mocks.getTrendingNominees,
  getUserVoteForCategory: mocks.getUserVoteForCategory,
  castVote: mocks.castVote,
}));

import { useAwards } from '../useAwards';

const MOCK_EDITION = {
  year: 2024,
  name: 'Awards 2024',
  endDate: new Date(Date.now() + 86400000).toISOString(), // 1 jour à partir de maintenant
};
const MOCK_CAT = { id: 'c1', label: 'Best Action' };

type VoteResponse = { success: boolean; message: string };

describe('useAwards', () => {
  beforeEach(() => {
    // shouldAdvanceTime: true permet à waitFor de fonctionner
    vi.useFakeTimers({ shouldAdvanceTime: true });
    
    mocks.user = { id: 'u1', name: 'Test' };
    
    mocks.getEdition.mockResolvedValue(MOCK_EDITION);
    mocks.getCategories.mockResolvedValue([MOCK_CAT]);
    mocks.getEditionStatus.mockResolvedValue('open');
    mocks.getPastEditions.mockResolvedValue([]);
    mocks.getCategoryLeaderboard.mockResolvedValue([]);
    mocks.getTotalVotes.mockResolvedValue(100);
    mocks.getTrendingNominees.mockResolvedValue([]);
    mocks.getUserVoteForCategory.mockResolvedValue(null);
    mocks.castVote.mockResolvedValue({ success: true, message: 'Voted' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads data and sets active category', async () => {
    const { result } = renderHook(() => useAwards());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.edition).toEqual(MOCK_EDITION);
    expect(result.current.activeCategory).toBe('c1');
    expect(result.current.totalVotes).toBe(100);
  });

  it('countdown ticks down based on endDate', async () => {
    const { result } = renderHook(() => useAwards());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.countdown.isOver).toBe(false);
    
    const initialSeconds = result.current.countdown.seconds;

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.countdown.seconds).toBe((initialSeconds - 1 + 60) % 60);
  });

  it('vote calls castVote and refreshes', async () => {
    const { result } = renderHook(() => useAwards());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: VoteResponse | undefined;
    await act(async () => {
      res = await result.current.vote('nominee-1');
    });

    expect(res).toEqual({ success: true, message: 'Voted' });
    expect(mocks.castVote).toHaveBeenCalledWith('u1', 'nominee-1', 'c1');
  });

  it('vote fails if not logged in', async () => {
    mocks.user = null;
    const { result } = renderHook(() => useAwards());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: VoteResponse | undefined;
    await act(async () => {
      res = await result.current.vote('nominee-1');
    });

    expect(res?.success).toBe(false);
    expect(mocks.castVote).not.toHaveBeenCalled();
  });
});