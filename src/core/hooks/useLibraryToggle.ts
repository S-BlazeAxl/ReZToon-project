import { useCallback, useEffect, useState } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { addToLibrary, getLibrary } from '../services/libraryService';
import { useT } from '../../config/i18n';

const LIBRARY_EVENT = 'reztoon:library-change';

export function notifyLibraryChange(): void {
  window.dispatchEvent(new Event(LIBRARY_EVENT));
}

interface LibraryCache {
  userId: string;
  ids: Set<string>;
}

interface InFlight {
  userId: string;
  promise: Promise<Set<string>>;
}

let libraryCache: LibraryCache | null = null;
let inFlight: InFlight | null = null;

interface Options {
  feedbackDuration?: number;
  onGuestAttempt?: () => void;
}

export type AddResult = 'guest' | 'unavailable' | 'already' | 'added' | 'failed';

export function useLibraryToggle<T = string>(options: Options = {}) {
  const { feedbackDuration = 2200, onGuestAttempt } = options;
  const user = useCurrentUser();
  const t = useT();
  const [libraryIds, setLibraryIds] = useState<Set<string>>(
    libraryCache && libraryCache.userId === user?.id
      ? new Set(libraryCache.ids)
      : new Set(),
  );
  const [feedback, setFeedback] = useState<{ id: T; text: string } | null>(null);

  useEffect(() => {
    if (!user) {
      libraryCache = null;
      inFlight = null;
      setLibraryIds(new Set());
      return;
    }

    if (libraryCache && libraryCache.userId === user.id) {
      setLibraryIds(new Set(libraryCache.ids));
      return;
    }

    if (inFlight && inFlight.userId === user.id) {
      inFlight.promise.then((ids) => {
        if (libraryCache?.userId === user.id) {
          setLibraryIds(new Set(ids));
        }
      });
      return;
    }

    let cancelled = false;
    const userId = user.id;
    const promise = getLibrary(userId)
      .then((entries) => {
        const ids = new Set(entries.map((e) => e.mangaId));
        libraryCache = { userId, ids };
        inFlight = null;
        return ids;
      })
      .catch(() => {
        inFlight = null;
        return new Set<string>();
      });

    inFlight = { userId, promise };

    promise.then((ids) => {
      if (!cancelled && libraryCache?.userId === userId) {
        setLibraryIds(new Set(ids));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const handler = () => {
      if (libraryCache && user && libraryCache.userId === user.id) {
        setLibraryIds(new Set(libraryCache.ids));
      }
    };
    window.addEventListener(LIBRARY_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(LIBRARY_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, [user]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), feedbackDuration);
    return () => window.clearTimeout(timer);
  }, [feedback, feedbackDuration]);

  const addToLib = useCallback(
    async (feedbackId: T, mangaId: string | null): Promise<AddResult> => {
      if (!user) {
        if (onGuestAttempt) onGuestAttempt();
        return 'guest';
      }
      if (!mangaId) {
        setFeedback({ id: feedbackId, text: t.common.notAvailable });
        return 'unavailable';
      }
      if (libraryCache && libraryCache.userId === user.id && libraryCache.ids.has(mangaId)) {
        setFeedback({ id: feedbackId, text: t.home.inList });
        return 'already';
      }

      setLibraryIds((prev) => {
        const next = new Set(prev);
        next.add(mangaId);
        return next;
      });

      const ok = await addToLibrary(user.id, mangaId, 'wishlist');

      if (!ok) {
        setLibraryIds((prev) => {
          const next = new Set(prev);
          next.delete(mangaId);
          return next;
        });
        setFeedback({ id: feedbackId, text: t.common.errUnexpected });
        return 'failed';
      }

      if (libraryCache && libraryCache.userId === user.id) {
        libraryCache.ids.add(mangaId);
      } else {
        libraryCache = { userId: user.id, ids: new Set([mangaId]) };
      }
      setFeedback({ id: feedbackId, text: t.home.addToList });
      notifyLibraryChange();
      return 'added';
    },
    [user, onGuestAttempt, t],
  );

  const isInLibrary = useCallback(
    (mangaId: string | null) =>
      Boolean(user && mangaId && libraryIds.has(mangaId)),
    [user, libraryIds],
  );

  return {
    user,
    isInLibrary,
    addToLib,
    feedback,
    setFeedback,
  };
}