import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabase', () => ({ supabase: { rpc: rpcMock } }));

import { averageScore, getFeaturedRanking, rankByAverage } from '../../services/rankingService';

const manga = (id: string, reads: number, likes: number): any => ({ id, reads, likes });

describe('rankingService', () => {
  beforeEach(() => rpcMock.mockReset());

  it('averages views and likes', () => {
    expect(averageScore(100, 50)).toBe(75);
    expect(averageScore(3, 0)).toBe(1.5);
  });

  it('ranks the fallback by (reads + likes) / 2 and keeps the top 5', () => {
    const list = [
      manga('a', 10, 10), manga('b', 1000, 0), manga('c', 400, 400), manga('d', 5, 5),
      manga('e', 50, 70), manga('f', 1, 1), manga('g', 300, 100),
    ];
    const ranked = rankByAverage(list, 5);
    expect(ranked.map((r) => r.mangaId)).toEqual(['c', 'b', 'g', 'e', 'a']);
    expect(ranked[0]).toMatchObject({ rank: 1, score: 400, hasActivity: false });
  });

  it('maps the RPC rows', async () => {
    rpcMock.mockResolvedValue({
      data: [{
        r_pos: 1, r_manga_id: 'm1', r_views: 12, r_likes: 8, r_score: '30.0',
        r_appearances: 3, r_has_activity: true, r_period_start: '2026-11-01', r_period_end: '2026-12-01',
      }],
      error: null,
    });
    const res = await getFeaturedRanking('month');
    expect(rpcMock).toHaveBeenCalledWith('get_featured_ranking', { p_period: 'month', p_limit: 5 });
    expect(res.source).toBe('server');
    expect(res.entries[0]).toMatchObject({ mangaId: 'm1', rank: 1, views: 12, likes: 8, score: 30, appearances: 3, hasActivity: true });
  });

  it('falls back when the function is missing', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'not found' } });
    const res = await getFeaturedRanking('week', 5, [manga('x', 4, 2)]);
    expect(res.source).toBe('fallback');
    expect(res.entries[0].mangaId).toBe('x');
  });
});
