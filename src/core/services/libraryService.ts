import { supabase } from '../lib/supabase';
import { clearMangaCache } from './mangaService';

export type LibraryStatus = 'reading' | 'wishlist' | 'completed';

export interface LibraryEntry {
  mangaId: string;
  status: LibraryStatus;
  currentChapter: number;
  lastReadAt: string | null;
  addedAt: string;
  chaptersRead: number[];
}

const CACHE_TTL_MS = 30_000;

let libraryCache: { userId: string; data: LibraryEntry[]; expiresAt: number } | null = null;
let inFlightLibrary: { userId: string; promise: Promise<LibraryEntry[]> } | null = null;

export function clearLibraryCache(): void {
  libraryCache = null;
  inFlightLibrary = null;
}

export async function getLibrary(userId: string): Promise<LibraryEntry[]> {
  if (!userId) return [];

  if (libraryCache && libraryCache.userId === userId && Date.now() < libraryCache.expiresAt) {
    return libraryCache.data;
  }

  if (inFlightLibrary && inFlightLibrary.userId === userId) {
    return inFlightLibrary.promise;
  }

  const promise = (async () => {
    const { data, error } = await supabase
      .from('library_entries')
      .select('*')
      .eq('user_id', userId)
      .order('last_read_at', { ascending: false, nullsFirst: false })
      .order('added_at', { ascending: false });

    if (error || !data) return [];

    const entries = data.map((row) => ({
      mangaId: row.manga_id,
      status: row.status as LibraryStatus,
      currentChapter: row.current_chapter,
      lastReadAt: row.last_read_at,
      addedAt: row.added_at,
      chaptersRead: Array.isArray(row.chapters_read) ? row.chapters_read : [],
    }));

    libraryCache = { userId, data: entries, expiresAt: Date.now() + CACHE_TTL_MS };
    return entries;
  })();

  inFlightLibrary = { userId, promise };

  try {
    return await promise;
  } finally {
    if (inFlightLibrary?.promise === promise) {
      inFlightLibrary = null;
    }
  }
}

export async function getLibraryByStatus(
  userId: string,
  status: LibraryStatus,
): Promise<LibraryEntry[]> {
  const library = await getLibrary(userId);
  return library.filter((e) => e.status === status);
}

export async function getLibraryEntry(
  userId: string,
  mangaId: string,
): Promise<LibraryEntry | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('library_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('manga_id', mangaId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    mangaId: data.manga_id,
    status: data.status as LibraryStatus,
    currentChapter: data.current_chapter,
    lastReadAt: data.last_read_at,
    addedAt: data.added_at,
    chaptersRead: Array.isArray(data.chapters_read) ? data.chapters_read : [],
  };
}

export async function isInLibrary(userId: string, mangaId: string): Promise<boolean> {
  const entry = await getLibraryEntry(userId, mangaId);
  return entry !== null;
}

export async function addToLibrary(
  userId: string,
  mangaId: string,
  status: LibraryStatus = 'wishlist',
): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    const existing = await getLibraryEntry(userId, mangaId);

    if (existing) {
      const { error } = await supabase
        .from('library_entries')
        .update({ status })
        .eq('user_id', userId)
        .eq('manga_id', mangaId);

      if (error) {
        console.error('[library] addToLibrary update failed:', error.message);
        return false;
      }
      clearLibraryCache();
      return true;
    }

    const { error } = await supabase.from('library_entries').insert({
      user_id: userId,
      manga_id: mangaId,
      status,
      current_chapter: 1,
      chapters_read: [],
      added_at: now,
    });

    if (error) {
      console.error('[library] addToLibrary insert failed:', error.message);
      return false;
    }
    clearLibraryCache();
    return true;
  } catch (err) {
    console.error('[library] addToLibrary threw:', err);
    return false;
  }
}

export async function removeFromLibrary(userId: string, mangaId: string): Promise<boolean> {
  const { error } = await supabase
    .from('library_entries')
    .delete()
    .eq('user_id', userId)
    .eq('manga_id', mangaId);

  if (!error) clearLibraryCache();
  return !error;
}

export async function setLibraryStatus(
  userId: string,
  mangaId: string,
  status: LibraryStatus,
): Promise<void> {
  const { error } = await supabase
    .from('library_entries')
    .update({ status })
    .eq('user_id', userId)
    .eq('manga_id', mangaId);
    
  if (!error) clearLibraryCache();
}

export async function markChapterAsRead(
  userId: string,
  mangaId: string,
  chapterNumber: number,
  totalChapters: number,
): Promise<void> {
  const entry = await getLibraryEntry(userId, mangaId);
  const now = new Date().toISOString();
  const isFirstRead = !entry || !entry.chaptersRead.includes(chapterNumber);

  if (!entry) {
    const { error } = await supabase.from('library_entries').insert({
      user_id: userId,
      manga_id: mangaId,
      status: 'reading',
      current_chapter: chapterNumber,
      chapters_read: [chapterNumber],
      last_read_at: now,
      added_at: now,
    });

    if (error) {
      console.error('[library] markChapterAsRead insert failed:', error.message);
      return;
    }
    clearLibraryCache();
  } else {
    const chaptersRead = entry.chaptersRead.includes(chapterNumber)
      ? entry.chaptersRead
      : [...entry.chaptersRead, chapterNumber].sort((a, b) => a - b);

    const newStatus: LibraryStatus =
      totalChapters > 0 && chaptersRead.length >= totalChapters ? 'completed' : 'reading';

    const { error } = await supabase
      .from('library_entries')
      .update({
        chapters_read: chaptersRead,
        current_chapter: Math.max(entry.currentChapter, chapterNumber),
        last_read_at: now,
        status: newStatus,
      })
      .eq('user_id', userId)
      .eq('manga_id', mangaId);

    if (error) {
      console.error('[library] markChapterAsRead update failed:', error.message);
      return;
    }
    clearLibraryCache();
  }

  if (isFirstRead) {
    const { error: rpcError } = await supabase.rpc('increment_manga_reads', {
      p_manga_id: mangaId,
    });

    if (rpcError) {
      console.error('[library] increment_manga_reads failed:', rpcError.message);
    }
    clearMangaCache();
  }
}

export async function getContinueReading(userId: string): Promise<LibraryEntry[]> {
  const library = await getLibrary(userId);
  return library.filter((e) => e.status === 'reading' && e.lastReadAt).slice(0, 6);
}