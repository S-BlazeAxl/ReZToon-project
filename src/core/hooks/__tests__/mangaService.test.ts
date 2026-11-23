import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabase', () => ({
  supabase: { from: fromMock, rpc: rpcMock },
}));

import {
  getAllMangas,
  getMangaById,
  clearMangaCache,
  toggleMangaLike,
} from '../../services/mangaService';

function buildChain(result: { data?: any; error?: any }) {
  const chain: any = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return chain;
}

const MOCK_DB_MANGA = {
  id: 'm1',
  title: 'Test Manga',
  subtitle: 'Sub',
  author_id: 'a1',
  author_name: 'Author',
  cover: 'icon',
  genre: 'Mankia',
  tag: 'tag',
  status: 'ongoing',
  description: 'desc',
  rating: 4.5,
  rating_count: 10,
  reads: 100,
  likes: 50,
  chapters: [],
};

describe('mangaService', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
    clearMangaCache();
  });

  describe('getAllMangas (Caching)', () => {
    it('fetches from DB on first call and caches result', async () => {
      const chain = buildChain({ data: [MOCK_DB_MANGA], error: null });
      fromMock.mockReturnValue(chain);

      const result1 = await getAllMangas();
      expect(result1).toHaveLength(1);
      expect(fromMock).toHaveBeenCalledTimes(1);

      const result2 = await getAllMangas();
      expect(result2).toHaveLength(1);
      expect(fromMock).toHaveBeenCalledTimes(1);
    });

    it('forces a refetch after clearMangaCache is called', async () => {
      const chain = buildChain({ data: [MOCK_DB_MANGA], error: null });
      fromMock.mockReturnValue(chain);

      await getAllMangas();
      clearMangaCache();
      
      const result = await getAllMangas();
      expect(result).toHaveLength(1);
      expect(fromMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('getMangaById', () => {
    it('returns mapped manga with chapters', async () => {
      const chain = buildChain({
        data: {
          ...MOCK_DB_MANGA,
          chapters: [
            { id: 'c1', number: 1, title: 'Ch 1', pages: 10, published_at: '2024-01-01', page_urls: [] },
          ],
        },
        error: null,
      });
      fromMock.mockReturnValue(chain);

      const manga = await getMangaById('m1');
      expect(manga).not.toBeNull();
      expect(manga?.id).toBe('m1');
      expect(manga?.chapters).toHaveLength(1);
      expect(manga?.chapters?.[0].number).toBe(1);
    });

    it('returns null if not found', async () => {
      const chain = buildChain({ data: null, error: null });
      fromMock.mockReturnValue(chain);

      const manga = await getMangaById('unknown');
      expect(manga).toBeNull();
    });
  });

  describe('toggleMangaLike', () => {
    it('likes a manga if not already liked', async () => {
      const checkChain = buildChain({ data: null, error: null });
      const insertChain = buildChain({ data: null, error: null });

      fromMock
        .mockReturnValueOnce(checkChain)
        .mockReturnValueOnce(insertChain);

      rpcMock.mockResolvedValue({ error: null });

      const isLiked = await toggleMangaLike('m1', 'u1');

      expect(isLiked).toBe(true);
      expect(checkChain.select).toHaveBeenCalled();
      expect(insertChain.insert).toHaveBeenCalled();
      expect(rpcMock).toHaveBeenCalledWith('increment_manga_likes', { p_manga_id: 'm1' });
    });

    it('unlikes a manga if already liked', async () => {
      const checkChain = buildChain({ data: { id: 'like1' }, error: null });
      const deleteChain = buildChain({ data: null, error: null });

      fromMock
        .mockReturnValueOnce(checkChain)
        .mockReturnValueOnce(deleteChain);

      rpcMock.mockResolvedValue({ error: null });

      const isLiked = await toggleMangaLike('m1', 'u1');

      expect(isLiked).toBe(false);
      expect(deleteChain.delete).toHaveBeenCalled();
      expect(rpcMock).toHaveBeenCalledWith('decrement_manga_likes', { p_manga_id: 'm1' });
    });
  });
});