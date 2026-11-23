import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('useRealtimeMessaging', () => {
  let useRealtimeMessaging: typeof import('../useRealtimeMessaging').useRealtimeMessaging;
  let channelMock: ReturnType<typeof vi.fn>;
  let removeChannelMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();

    channelMock = vi.fn();
    removeChannelMock = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../lib/supabase', () => ({
      supabase: {
        channel: channelMock,
        removeChannel: removeChannelMock,
      },
    }));

    const mod = await import('../useRealtimeMessaging');
    useRealtimeMessaging = mod.useRealtimeMessaging;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeChannel() {
    return {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
  }

  it('creates exactly one channel on mount', () => {
    channelMock.mockImplementation(makeChannel);

    renderHook(() =>
      useRealtimeMessaging({
        userId: 'user-1',
        tables: ['messages'] as const,
        onChange: vi.fn(),
      }),
    );

    expect(channelMock).toHaveBeenCalledTimes(1);
  });

  it('creates no channel when userId is null', () => {
    channelMock.mockImplementation(makeChannel);

    renderHook(() =>
      useRealtimeMessaging({
        userId: null,
        tables: ['messages'] as const,
        onChange: vi.fn(),
      }),
    );

    expect(channelMock).not.toHaveBeenCalled();
  });

  it('shares one channel between two hooks with the same (userId, tables)', () => {
    channelMock.mockImplementation(makeChannel);

    const a = renderHook(() =>
      useRealtimeMessaging({
        userId: 'user-1',
        tables: ['messages'] as const,
        onChange: vi.fn(),
      }),
    );
    const b = renderHook(() =>
      useRealtimeMessaging({
        userId: 'user-1',
        tables: ['messages'] as const,
        onChange: vi.fn(),
      }),
    );

    expect(channelMock).toHaveBeenCalledTimes(1);
    a.unmount();
    b.unmount();
  });

  it('creates separate channels for different tables', () => {
    channelMock.mockImplementation(makeChannel);

    renderHook(() =>
      useRealtimeMessaging({
        userId: 'user-1',
        tables: ['messages'] as const,
        onChange: vi.fn(),
      }),
    );
    renderHook(() =>
      useRealtimeMessaging({
        userId: 'user-1',
        tables: ['notifications'] as const,
        onChange: vi.fn(),
      }),
    );

    expect(channelMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the channel alive during the 500ms grace period, then removes it', () => {
    channelMock.mockImplementation(makeChannel);

    const { unmount } = renderHook(() =>
      useRealtimeMessaging({
        userId: 'user-1',
        tables: ['messages'] as const,
        onChange: vi.fn(),
      }),
    );

    unmount();
    expect(removeChannelMock).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(400); });
    expect(removeChannelMock).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(200); });
    expect(removeChannelMock).toHaveBeenCalledTimes(1);
  });

  it('reuses the channel when a new subscriber appears within the grace period', () => {
    channelMock.mockImplementation(makeChannel);

    const first = renderHook(() =>
      useRealtimeMessaging({
        userId: 'user-1',
        tables: ['messages'] as const,
        onChange: vi.fn(),
      }),
    );
    first.unmount();

    act(() => { vi.advanceTimersByTime(200); });

    renderHook(() =>
      useRealtimeMessaging({
        userId: 'user-1',
        tables: ['messages'] as const,
        onChange: vi.fn(),
      }),
    );

    act(() => { vi.advanceTimersByTime(600); });

    expect(channelMock).toHaveBeenCalledTimes(1);
    expect(removeChannelMock).not.toHaveBeenCalled();
  });

  it('debounces onChange calls', () => {
    channelMock.mockImplementation(makeChannel);
    const onChange = vi.fn();

    renderHook(() =>
      useRealtimeMessaging({
        userId: 'user-1',
        tables: ['messages'] as const,
        onChange,
        debounceMs: 150,
      }),
    );

    const channelInstance = channelMock.mock.results[0].value;
    const insertCall = channelInstance.on.mock.calls.find(
      (call: any) => call[1]?.table === 'messages' && call[1]?.event === '*',
    );
    const insertHandler = insertCall?.[2] as ((payload: any) => void) | undefined;

    expect(insertHandler).toBeTypeOf('function');

    act(() => {
      insertHandler!({ eventType: 'INSERT', new: { id: '1', sender_id: 'user-1' }, old: null });
      insertHandler!({ eventType: 'INSERT', new: { id: '2', sender_id: 'user-1' }, old: null });
      insertHandler!({ eventType: 'INSERT', new: { id: '3', sender_id: 'user-1' }, old: null });
    });

    expect(onChange).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(150); });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});