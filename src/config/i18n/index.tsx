import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en } from './locales/en';
import { fr } from './locales/fr';
import type { Lang, TranslationSchema } from './types';

const STORAGE_KEY = 'reztoon_lang';

const DICTS: Record<Lang, TranslationSchema> = { en, fr };

const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  fr: 'Français',
};

const LANG_FLAGS: Record<Lang, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
};

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TranslationSchema;
  available: Lang[];
  labels: Record<Lang, string>;
  flags: Record<Lang, string>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectDefaultLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && stored in DICTS) return stored;
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith('fr')) return 'fr';
  } catch {
    /* ignore */
  }
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectDefaultLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: DICTS[lang],
      available: Object.keys(DICTS) as Lang[],
      labels: LANG_LABELS,
      flags: LANG_FLAGS,
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

export function useT(): TranslationSchema {
  return useI18n().t;
}

export function useLocale(): 'fr-FR' | 'en-GB' {
  const { lang } = useI18n();
  return lang === 'fr' ? 'fr-FR' : 'en-GB';
}

export type { Lang };