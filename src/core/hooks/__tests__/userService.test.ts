import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '../../services/userService';

const fromMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
    auth: authMock,
  },
}));

import { hasPermission, getCurrentUser, banUser } from '../../services/userService';

function buildChain(result: { data?: any; error?: any }) {
  const chain: any = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return chain;
}

describe('userService', () => {
  beforeEach(() => {
    fromMock.mockReset();
    authMock.getSession.mockReset();
    authMock.signOut.mockReset();
  });

  describe('hasPermission', () => {
    it('returns false for null user', () => {
      expect(hasPermission(null, 'manage_users')).toBe(false);
    });

    it('returns true for supervisor regardless of permission', () => {
      const user = { role: 'supervisor', permissions: [] } as unknown as User;
      expect(hasPermission(user, 'manage_users')).toBe(true);
    });

    it('returns true if permission is in user.permissions', () => {
      const user = { role: 'reader', permissions: ['manage_users'] } as unknown as User;
      expect(hasPermission(user, 'manage_users')).toBe(true);
    });

    it('returns false if permission is missing', () => {
      const user = { role: 'reader', permissions: ['moderate_content'] } as unknown as User;
      expect(hasPermission(user, 'manage_users')).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('returns null if no session', async () => {
      authMock.getSession.mockResolvedValue({ data: { session: null }, error: null });
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it('returns mapped user if session and profile exist', async () => {
      authMock.getSession.mockResolvedValue({
        data: { session: { user: { id: 'u1', email: 'test@test.com' } } },
        error: null,
      });

      const profileChain = buildChain({
        data: { id: 'u1', name: 'Test User', role: 'reader', is_deleted: false },
        error: null,
      });
      fromMock.mockReturnValue(profileChain);

      const user = await getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.id).toBe('u1');
      expect(user?.name).toBe('Test User');
      expect(user?.email).toBe('test@test.com');
    });
  });

  describe('banUser', () => {
    it('updates profile with ban_until and is_active false', async () => {
      const updateChain = buildChain({ data: null, error: null });
      fromMock.mockReturnValue(updateChain);

      const res = await banUser('u1', 7);

      expect(res.success).toBe(true);
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
        }),
      );
      expect(updateChain.update.mock.calls[0][0].ban_until).toBeDefined();
    });
  });
});