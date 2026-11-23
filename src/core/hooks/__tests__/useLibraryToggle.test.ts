import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

describe('useLibraryToggle', () => {
  let useLibraryToggle: typeof import('../useLibraryToggle').useLibraryToggle;
  let getLibrary: ReturnType<typeof vi.fn>;
  let addToLibrary: ReturnType<typeof vi.fn>;
  let userRef: { current: any };
  let tRef: { current: any };

  beforeEach(async () => {
    vi.resetModules();

    getLibrary = vi.fn().mockResolvedValue([]);
    addToLibrary = vi.fn().mockResolvedValue(true);
    userRef = { current: { id: 'user-1', name: 'Test', email: 't@t.com', role: 'reader' } };
    tRef = {
      current: {
        common: { notAvailable: 'Not available', errUnexpected: 'Unexpected error' },
        home: { inList: 'In list', addToList: 'Added' },
      },
    };

    vi.doMock('../../services/libraryService', () => ({
      addToLibrary,
      getLibrary,
      removeFromLibrary: vi.fn(),
    }));
    vi.doMock('../../hooks/useCurrentUser', () => ({
      useCurrentUser: () => userRef.current,
    }));
    vi.doMock('../../../config/i18n', () => ({
      useT: () => tRef.current,
    }));

    const mod = await import('../useLibraryToggle');
    useLibraryToggle = mod.useLibraryToggle;
  });

  it('returns "guest" and calls onGuestAttempt when not authenticated', async () => {
    userRef.current = null;
    const onGuestAttempt = vi.fn();
    const { result } = renderHook(() => useLibraryToggle({ onGuestAttempt }));

    let r: any;
    await act(async () => {
      r = await result.current.addToLib('fb-1', 'manga-1');
    });

    expect(r).toBe('guest');
    expect(onGuestAttempt).toHaveBeenCalledTimes(1);
    expect(addToLibrary).not.toHaveBeenCalled();
  });

  it('returns "unavailable" when mangaId is null', async () => {
    const { result } = renderHook(() => useLibraryToggle());
    await waitFor(() => expect(result.current.user).toBeTruthy());

    let r: any;
    await act(async () => {
      r = await result.current.addToLib('fb-1', null);
    });

    expect(r).toBe('unavailable');
    expect(result.current.feedback).toEqual({ id: 'fb-1', text: 'Not available' });
  });

  it('returns "already" when manga already in cache', async () => {
    getLibrary.mockResolvedValue([
      { mangaId: 'manga-1', status: 'wishlist', currentChapter: 1, lastReadAt: null, addedAt: '', chaptersRead: [] },
    ]);

    const { result } = renderHook(() => useLibraryToggle());
    await waitFor(() => expect(result.current.isInLibrary('manga-1')).toBe(true));

    let r: any;
    await act(async () => {
      r = await result.current.addToLib('fb-1', 'manga-1');
    });

    expect(r).toBe('already');
    expect(addToLibrary).not.toHaveBeenCalled();
    expect(result.current.feedback).toEqual({ id: 'fb-1', text: 'In list' });
  });

  it('returns "added" and updates state on success', async () => {
    const { result } = renderHook(() => useLibraryToggle());
    await waitFor(() => expect(result.current.user).toBeTruthy());

    let r: any;
    await act(async () => {
      r = await result.current.addToLib('fb-1', 'manga-1');
    });

    expect(r).toBe('added');
    expect(addToLibrary).toHaveBeenCalledWith('user-1', 'manga-1', 'wishlist');
    expect(result.current.isInLibrary('manga-1')).toBe(true);
    expect(result.current.feedback).toEqual({ id: 'fb-1', text: 'Added' });
  });

  it('rolls back state and returns "failed" when addToLibrary returns false', async () => {
    addToLibrary.mockResolvedValue(false);

    const { result } = renderHook(() => useLibraryToggle());
    await waitFor(() => expect(result.current.user).toBeTruthy());

    let r: any;
    await act(async () => {
      r = await result.current.addToLib('fb-1', 'manga-1');
    });

    expect(r).toBe('failed');
    expect(result.current.isInLibrary('manga-1')).toBe(false);
    expect(result.current.feedback).toEqual({ id: 'fb-1', text: 'Unexpected error' });
  });

  it('shares a single getLibrary call across concurrent hook mounts', async () => {
    const { result: a } = renderHook(() => useLibraryToggle());
    const { result: b } = renderHook(() => useLibraryToggle());

    await waitFor(() => {
      expect(a.current.user).toBeTruthy();
      expect(b.current.user).toBeTruthy();
    });

    expect(getLibrary).toHaveBeenCalledTimes(1);
  });
});