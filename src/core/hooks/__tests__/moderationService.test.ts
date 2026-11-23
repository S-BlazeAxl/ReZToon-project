import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Report } from '../../services/reportService';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabase', () => ({
  supabase: { from: fromMock },
}));

import { resolveReportWithAction } from '../../services/moderationService';

function buildChain(result: { data?: any; error?: any }) {
  const chain: any = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return chain;
}

const baseReport: Report = {
  id: 'r1',
  type: 'comment',
  targetId: 'target-1',
  targetLabel: 'Some label',
  reporterId: 'reporter-1',
  reporterName: 'Reporter',
  reason: 'spam',
  severity: 'high',
  status: 'open',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('moderationService.resolveReportWithAction', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('resolves a chapter comment (found in chapter_comments)', async () => {
    const commentChain = buildChain({ data: [{ id: 'target-1' }], error: null });
    const reportChain = buildChain({ data: null, error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'chapter_comments') return commentChain;
      if (table === 'post_comments') return buildChain({ data: [], error: null });
      if (table === 'reports') return reportChain;
      return buildChain({ data: null, error: null });
    });

    const res = await resolveReportWithAction(baseReport, 'resolve', 'mod-1');

    expect(res.success).toBe(true);
    expect(commentChain.delete).toHaveBeenCalled();
    expect(reportChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'resolved',
        resolved_by: 'mod-1',
      }),
    );
  });

  it('resolves a post comment (falls through to post_comments)', async () => {
    const chapterChain = buildChain({ data: [], error: null });
    const postChain = buildChain({ data: [{ id: 'target-1' }], error: null });
    const reportChain = buildChain({ data: null, error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'chapter_comments') return chapterChain;
      if (table === 'post_comments') return postChain;
      if (table === 'reports') return reportChain;
      return buildChain({ data: null, error: null });
    });

    const res = await resolveReportWithAction(baseReport, 'resolve', 'mod-1');

    expect(res.success).toBe(true);
    expect(chapterChain.delete).toHaveBeenCalled();
    expect(postChain.delete).toHaveBeenCalled();
  });

  it('fails when the comment is not found in either table', async () => {
    const emptyChain = buildChain({ data: [], error: null });
    fromMock.mockReturnValue(emptyChain);

    const res = await resolveReportWithAction(baseReport, 'resolve', 'mod-1');

    expect(res.success).toBe(false);
    expect(res.message).toMatch(/not found/i);
  });

  it('bans a user when the report type is user', async () => {
    const profileChain = buildChain({ data: null, error: null });
    const reportChain = buildChain({ data: null, error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return profileChain;
      if (table === 'reports') return reportChain;
      return buildChain({ data: null, error: null });
    });

    const userReport: Report = { ...baseReport, type: 'user' };
    const res = await resolveReportWithAction(userReport, 'resolve', 'mod-1');

    expect(res.success).toBe(true);
    expect(profileChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false }),
    );
  });

  it('unpublishes a chapter when the report type is chapter', async () => {
    const chapterChain = buildChain({ data: null, error: null });
    const reportChain = buildChain({ data: null, error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'chapters') return chapterChain;
      if (table === 'reports') return reportChain;
      return buildChain({ data: null, error: null });
    });

    const chapterReport: Report = { ...baseReport, type: 'chapter' };
    const res = await resolveReportWithAction(chapterReport, 'resolve', 'mod-1');

    expect(res.success).toBe(true);
    expect(chapterChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft', published_at: null }),
    );
  });

  it('suspends a series when the report type is series', async () => {
    const mangaChain = buildChain({ data: null, error: null });
    const reportChain = buildChain({ data: null, error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'mangas') return mangaChain;
      if (table === 'reports') return reportChain;
      return buildChain({ data: null, error: null });
    });

    const seriesReport: Report = { ...baseReport, type: 'series' };
    const res = await resolveReportWithAction(seriesReport, 'resolve', 'mod-1');

    expect(res.success).toBe(true);
    expect(mangaChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'hiatus' }),
    );
  });

  it('does NOT take destructive action when the action is reject', async () => {
    const reportChain = buildChain({ data: null, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === 'reports') return reportChain;
      return buildChain({ data: null, error: null });
    });

    const res = await resolveReportWithAction(baseReport, 'reject', 'mod-1');

    expect(res.success).toBe(true);
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('reports');
    expect(reportChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' }),
    );
  });

  it('surfaces an error when the report update fails', async () => {
    const commentChain = buildChain({ data: [{ id: 'target-1' }], error: null });
    const reportChain = buildChain({ data: null, error: { message: 'DB is down' } });

    fromMock.mockImplementation((table: string) => {
      if (table === 'chapter_comments') return commentChain;
      if (table === 'post_comments') return buildChain({ data: [], error: null });
      if (table === 'reports') return reportChain;
      return buildChain({ data: null, error: null });
    });

    const res = await resolveReportWithAction(baseReport, 'resolve', 'mod-1');

    expect(res.success).toBe(false);
    expect(res.message).toContain('DB is down');
  });
});