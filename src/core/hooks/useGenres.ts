import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  ensureGenresLoaded,
  getGenresSnapshot,
  subscribeGenres,
  type Genre,
} from '../services/genreService';
import { useI18n } from '../../config/i18n';

interface Options {
  /** Inclure les genres désactivés (réservé aux écrans d'administration). */
  includeInactive?: boolean;
}

/**
 * Source unique des genres pour toute l'application.
 * Les genres viennent de la table `genres` (gérée par le supervisor),
 * avec repli sur les 6 genres principaux.
 */
export function useGenres({ includeInactive = false }: Options = {}) {
  const snapshot = useSyncExternalStore(subscribeGenres, getGenresSnapshot, getGenresSnapshot);
  const { lang } = useI18n();

  useEffect(() => {
    void ensureGenresLoaded();
  }, []);

  const genres: Genre[] = useMemo(
    () => (includeInactive ? snapshot.genres : snapshot.genres.filter((g) => g.isActive)),
    [snapshot.genres, includeInactive],
  );
  const names = useMemo(() => genres.map((g) => g.name), [genres]);

  const getGenre = useCallback(
    (name: string | null | undefined): Genre | undefined =>
      name ? snapshot.genres.find((g) => g.name === name) : undefined,
    [snapshot.genres],
  );

  /** Description du genre dans la langue courante (repli sur l'autre langue). */
  const describe = useCallback(
    (name: string | null | undefined): string => {
      const g = getGenre(name);
      if (!g) return '';
      return (lang === 'fr' ? g.descriptionFr || g.descriptionEn : g.descriptionEn || g.descriptionFr) ?? '';
    },
    [getGenre, lang],
  );

  return {
    genres,
    names,
    loading: snapshot.loading,
    fromDb: snapshot.fromDb,
    getGenre,
    describe,
  };
}
