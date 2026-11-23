import { useEffect, useState } from 'react';
import { useCurrentUser } from './useCurrentUser';
import {
  getRecommendations,
  getBecauseYouRead,
  getTrendingInFavoriteGenres,
  getContinueReadingList,
  type Recommendation,
} from '../services/recommendationService';
import type { Manga } from '../services/mangaService';
import type { LibraryEntry } from '../services/libraryService';

export function useRecommendations() {
  const user = useCurrentUser();
  const userId = user?.id;

  const [forYou, setForYou] = useState<Recommendation[]>([]);
  const [becauseYouRead, setBecauseYouRead] = useState<Recommendation[]>([]);
  const [trendingInGenre, setTrendingInGenre] = useState<Recommendation[]>([]);
  const [continueReading, setContinueReading] = useState<{ manga: Manga; entry: LibraryEntry }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setForYou([]);
      setBecauseYouRead([]);
      setTrendingInGenre([]);
      setContinueReading([]);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    async function fetchRecommendations() {
      try {
        const [fy, byr, tig, cr] = await Promise.all([
          getRecommendations(userId!, 12),
          getBecauseYouRead(userId!, 8),
          getTrendingInFavoriteGenres(userId!, 8),
          getContinueReadingList(userId!),
        ]);

        if (!isCancelled) {
          setForYou(fy);
          setBecauseYouRead(byr);
          setTrendingInGenre(tig);
          setContinueReading(cr);
        }
      } catch (err) {
        console.error('[useRecommendations] failed to load:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchRecommendations();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  return { forYou, becauseYouRead, trendingInGenre, continueReading, loading };
}