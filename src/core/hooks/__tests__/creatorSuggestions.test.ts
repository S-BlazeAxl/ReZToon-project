import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../services/followService', () => ({ getFollowedCreatorIds: vi.fn() }));

import { rankSuggestedCreators, mapProfileToCreator, type SuggestedCreator } from '../../services/creatorService';

const make = (id: string, genres: string[], followers = 0, reads = 0): SuggestedCreator =>
  mapProfileToCreator(
    { id, name: id, favorite_genres: genres },
    { followers, works: reads ? [{ id: `w-${id}`, title: 't', genre: genres[0] ?? 'Manga', reads, likes: 0, chapters: 0 }] : [] },
  );

describe('rankSuggestedCreators', () => {
  it('puts creators sharing the most favorite genres first', () => {
    const list = [
      make('none', ['Romance'], 500, 9000),
      make('one', ['Fantasy'], 1),
      make('two', ['Fantasy', 'Action'], 0),
    ];
    const ranked = rankSuggestedCreators(list, ['fantasy', 'ACTION']);
    expect(ranked.map((c) => c.id)).toEqual(['two', 'one', 'none']);
    expect(ranked[0].matchedGenres).toEqual(['Fantasy', 'Action']);
    expect(ranked[0].rank).toBe(1);
  });

  it('falls back to popularity without favorite genres', () => {
    const ranked = rankSuggestedCreators([make('a', [], 1), make('b', [], 300, 5000)], []);
    expect(ranked[0].id).toBe('b');
    expect(ranked[0].matchedGenres).toEqual([]);
  });

  it('shows the matching genre as the main genre', () => {
    const c = make('x', ['Romance', 'Fantasy']);
    const [ranked] = rankSuggestedCreators([c], ['Fantasy']);
    expect(ranked.genre).toBe('Fantasy');
  });
});
