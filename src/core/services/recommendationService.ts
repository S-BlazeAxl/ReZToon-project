import { getAllMangas, type Manga } from './mangaService';
import { getLibrary, getContinueReading, type LibraryEntry } from './libraryService';
import { getFollowedMangaIds, getFollowedCreatorIds } from './followService';

interface Weights {
  genreMatch: number;
  authorMatch: number;
  tagMatch: number;
  ratingBoost: number;
  recencyBoost: number;
  followBoost: number;
}

const WEIGHTS: Weights = {
  genreMatch: 3,
  authorMatch: 4,
  tagMatch: 2,
  ratingBoost: 1.5,
  recencyBoost: 1.2,
  followBoost: 5,
};

export interface Recommendation {
  manga: Manga;
  score: number;
  reason: string;
  reasonKind: 'genre' | 'author' | 'like' | 'trend' | 'follow';
  basedOn?: string;
}

function scoreManga(
  manga: Manga,
  userGenres: Set<string>,
  userAuthors: Set<string>,
  userTags: Set<string>,
  followedMangaIds: Set<string>,
  followedCreatorIds: Set<string>,
  excludedIds: Set<string>,
): { score: number; reason: string; reasonKind: Recommendation['reasonKind'] } | null {
  if (excludedIds.has(manga.id)) return null;

  let score = 0;
  let reason = '';
  let reasonKind: Recommendation['reasonKind'] = 'genre';

  if (followedMangaIds.has(manga.id)) {
    score += WEIGHTS.followBoost;
    reason = 'You follow this manga';
    reasonKind = 'follow';
  }
  if (followedCreatorIds.has(manga.authorId)) {
    score += WEIGHTS.followBoost;
    reason = `New from ${manga.author}`;
    reasonKind = 'follow';
  }
  if (userGenres.has(manga.genre)) {
    score += WEIGHTS.genreMatch;
    if (!reason) { reason = `More ${manga.genre} for you`; reasonKind = 'genre'; }
  }
  if (userAuthors.has(manga.authorId)) {
    score += WEIGHTS.authorMatch;
    if (!reason) { reason = `Because you liked ${manga.author}`; reasonKind = 'author'; }
  }
  if (userTags.has(manga.tag)) score += WEIGHTS.tagMatch;

  score += manga.rating * WEIGHTS.ratingBoost;

  const lastChapter = manga.chapters?.[manga.chapters.length - 1];
  if (lastChapter) {
    const days = (Date.now() - new Date(lastChapter.publishedAt).getTime()) / 86_400_000;
    if (days < 30) score += WEIGHTS.recencyBoost * (30 - days) / 30;
  }

  if (score <= 0) return null;
  if (!reason) { reason = 'Recommended for you'; reasonKind = 'trend'; }
  return { score, reason, reasonKind };
}

export async function getRecommendations(userId: string, limit = 12): Promise<Recommendation[]> {
  if (!userId) return [];
  const [mangas, library, followedMangaArr, followedCreatorsArr] = await Promise.all([
    getAllMangas(),
    getLibrary(userId),
    getFollowedMangaIds(userId),
    getFollowedCreatorIds(userId),
  ]);
  const followedManga = new Set(followedMangaArr);
  const followedCreators = new Set(followedCreatorsArr);

  const userGenres = new Set<string>();
  const userAuthors = new Set<string>();
  const userTags = new Set<string>();
  const excludedIds = new Set<string>(library.map((e) => e.mangaId));

  for (const entry of library) {
    const manga = mangas.find((m) => m.id === entry.mangaId);
    if (!manga) continue;
    userGenres.add(manga.genre);
    userTags.add(manga.tag);
    if (entry.status === 'completed' || entry.chaptersRead.length >= 2) {
      userAuthors.add(manga.authorId);
    }
  }

  const results: Recommendation[] = [];
  for (const manga of mangas) {
    const scored = scoreManga(
      manga, userGenres, userAuthors, userTags,
      followedManga, followedCreators, excludedIds,
    );
    if (!scored) continue;
    results.push({ manga, score: scored.score, reason: scored.reason, reasonKind: scored.reasonKind });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function getBecauseYouRead(userId: string, limit = 8): Promise<Recommendation[]> {
  if (!userId) return [];
  const [library, mangas] = await Promise.all([getLibrary(userId), getAllMangas()]);
  const lastRead = library.find((e) => e.lastReadAt);
  if (!lastRead) return getRecommendations(userId, limit);

  const source = mangas.find((m) => m.id === lastRead.mangaId);
  if (!source) return getRecommendations(userId, limit);

  const excludedIds = new Set(library.map((e) => e.mangaId));
  excludedIds.add(source.id);

  return mangas
    .filter((m) => !excludedIds.has(m.id))
    .map((m) => {
      let score = 0;
      if (m.genre === source.genre) score += 5;
      if (m.authorId === source.authorId) score += 4;
      if (m.tag === source.tag) score += 2;
      score += m.rating;
      return { manga: m, score };
    })
    .filter((x) => x.score > 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      manga: s.manga,
      score: s.score,
      reason: `Because you read ${source.title}`,
      reasonKind: 'genre' as const,
      basedOn: source.title,
    }));
}

export async function getTrendingInFavoriteGenres(userId: string, limit = 8): Promise<Recommendation[]> {
  if (!userId) return [];
  const [library, mangas] = await Promise.all([getLibrary(userId), getAllMangas()]);

  const genreCounts = new Map<string, number>();
  for (const entry of library) {
    const manga = mangas.find((m) => m.id === entry.mangaId);
    if (!manga) continue;
    genreCounts.set(manga.genre, (genreCounts.get(manga.genre) ?? 0) + 1);
  }

  const favoriteGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!favoriteGenre) return [];

  const excludedIds = new Set(library.map((e) => e.mangaId));
  return mangas
    .filter((m) => m.genre === favoriteGenre && !excludedIds.has(m.id))
    .sort((a, b) => b.reads - a.reads)
    .slice(0, limit)
    .map((m) => ({
      manga: m,
      score: m.reads,
      reason: `Trending in ${favoriteGenre}`,
      reasonKind: 'trend' as const,
    }));
}

export async function getContinueReadingList(
  userId: string,
): Promise<{ manga: Manga; entry: LibraryEntry }[]> {
  if (!userId) return [];
  const [entries, mangas] = await Promise.all([getContinueReading(userId), getAllMangas()]);
  return entries
    .map((entry) => {
      const manga = mangas.find((m) => m.id === entry.mangaId);
      return manga ? { manga, entry } : null;
    })
    .filter((x): x is { manga: Manga; entry: LibraryEntry } => x !== null);
}