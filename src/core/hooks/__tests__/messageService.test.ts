import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabase', () => ({
  supabase: { from: fromMock, rpc: rpcMock },
}));

vi.mock('../../services/userService', () => ({
  getUsersByIds: vi.fn().mockResolvedValue([]),
}));

import {
  getUnreadNotificationCount,
  markGroupAsRead,
  deleteConversations,
  toggleArchive,
} from '../../services/messageService';

function buildChain(result: { data?: any; error?: any; count?: number | null }) {
  const chain: any = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'order', 'limit', 'not'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return chain;
}

describe('messageService', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
  });

  describe('getUnreadNotificationCount', () => {
    it('returns the count from the database', async () => {
      const chain = buildChain({ count: 5, error: null });
      fromMock.mockReturnValue(chain);

      const count = await getUnreadNotificationCount('u1');
      
      expect(count).toBe(5);
      expect(fromMock).toHaveBeenCalledWith('notifications');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(chain.eq).toHaveBeenCalledWith('read', false);
    });

    it('returns 0 on error', async () => {
      const chain = buildChain({ count: null, error: { message: 'Error' } });
      fromMock.mockReturnValue(chain);

      const count = await getUnreadNotificationCount('u1');
      expect(count).toBe(0);
    });
  });

  describe('markGroupAsRead', () => {
    it('uses RPC if available', async () => {
      rpcMock.mockResolvedValue({ error: null });
      
      await markGroupAsRead('u1', 'g1');

      expect(rpcMock).toHaveBeenCalledWith('mark_group_read', { uid: 'u1', gid: 'g1' });
      expect(fromMock).not.toHaveBeenCalled();
    });

    it('falls back to manual update if RPC fails', async () => {
      rpcMock.mockResolvedValue({ error: { message: 'RPC not found' } });
      
      const fetchChain = buildChain({
        data: [
          { id: 'm1', read_by: [] },
          { id: 'm2', read_by: ['u1'] }
        ],
        error: null
      });
      const updateChain = buildChain({ data: null, error: null });

      fromMock
        .mockReturnValueOnce(fetchChain)
        .mockReturnValueOnce(updateChain);

      await markGroupAsRead('u1', 'g1');

      expect(fromMock).toHaveBeenCalledWith('messages');
      expect(updateChain.update).toHaveBeenCalledTimes(1);
      expect(updateChain.update).toHaveBeenCalledWith({ read_by: ['u1'] });
      expect(updateChain.eq).toHaveBeenCalledWith('id', 'm1');
    });
  });

  describe('deleteConversations', () => {
    it('updates hidden_at for multiple conversations', async () => {
      const chain = buildChain({ data: null, error: null });
      fromMock.mockReturnValue(chain);

      const count = await deleteConversations('u1', ['u2', 'u3']);

      expect(count).toBe(2);
      expect(fromMock).toHaveBeenCalledWith('conversation_meta');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ hidden_at: expect.any(String) }));
      expect(chain.in).toHaveBeenCalledWith('other_id', ['u2', 'u3']);
    });

    it('does nothing if array is empty', async () => {
      const count = await deleteConversations('u1', []);
      expect(count).toBe(0);
      expect(fromMock).not.toHaveBeenCalled();
    });
  });

  describe('toggleArchive', () => {
    it('toggles archive status and updates labels', async () => {
      // 1. ensureMeta -> select() pour trouver les métadonnées existantes
      const metaChain = buildChain({
        data: {
          id: 'meta1',
          starred: false,
          archived: false,
          muted: false,
          pinned: false,
          spam: false,
          labels: ['inbox'],
          pinned_message_ids: [],
          read_message_ids: [],
          created_at: '2024-01-01'
        },
        error: null
      });
      
      // 2. updateMeta -> select('id') pour vérifier si la méta existe
      const updateMetaSelectChain = buildChain({
        data: { id: 'meta1' }, 
        error: null
      });
      
      // 3. updateMeta -> update() pour appliquer les changements
      const updateMetaUpdateChain = buildChain({ data: null, error: null });

      fromMock
        .mockReturnValueOnce(metaChain)
        .mockReturnValueOnce(updateMetaSelectChain)
        .mockReturnValueOnce(updateMetaUpdateChain);

      await toggleArchive('u1', 'u2');

      expect(updateMetaUpdateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          archived: true,
          labels: ['archive']
        })
      );
    });
  });
});