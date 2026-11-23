import { useCallback, useEffect, useState } from 'react';
import { useNetworkInfo } from './useNetworkInfo';

const STORAGE_KEY = 'reztoon_lite_mode';
const AUTO_KEY = 'reztoon_lite_mode_auto';

export interface LiteConfig {
  enabled: boolean;
  imageQuality: number;
  maxImageWidth: number;
  preloadPages: number;
  videoAutoplay: boolean;
  soundAutoPlay: boolean;
  reduceAnimations: boolean;
}

export interface NetworkProfile {
  id: string;
  label: string;
  imageQuality: number;
  maxImageWidth: number;
  preloadPages: number;
}

const DEFAULT_CONFIG: LiteConfig = {
  enabled: false,
  imageQuality: 0.6,
  maxImageWidth: 800,
  preloadPages: 2,
  videoAutoplay: false,
  soundAutoPlay: false,
  reduceAnimations: true,
};

const NETWORK_PROFILES: NetworkProfile[] = [
  { id: 'slow-2g', label: 'Very slow (2G)', imageQuality: 0.4, maxImageWidth: 480, preloadPages: 1 },
  { id: '2g', label: 'Slow (2G)', imageQuality: 0.5, maxImageWidth: 640, preloadPages: 1 },
  { id: '3g', label: 'Medium (3G)', imageQuality: 0.7, maxImageWidth: 1024, preloadPages: 2 },
  { id: '4g', label: 'Fast (4G)', imageQuality: 1, maxImageWidth: 1600, preloadPages: 3 },
];

export interface UseLiteModeResult {
  enabled: boolean;
  auto: boolean;
  config: LiteConfig;
  profile: NetworkProfile | null;
  network: ReturnType<typeof useNetworkInfo>;
  estimatedDataKB: number;
  toggle: (next?: boolean) => void;
  setAuto: (next: boolean) => void;
}

export function useLiteMode(): UseLiteModeResult {
  const network = useNetworkInfo();

  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? false : stored === '1';
    } catch {
      return false;
    }
  });

  const [auto, setAutoState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(AUTO_KEY);
      return stored === null ? true : stored === '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [enabled]);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_KEY, auto ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [auto]);

  useEffect(() => {
    if (!auto) return;
    const slow =
      network.saveData ||
      network.effectiveType === 'slow-2g' ||
      network.effectiveType === '2g' ||
      (network.downlink > 0 && network.downlink < 1) ||
      network.rtt > 800;

    if (slow) setEnabled(true);
  }, [auto, network]);

  const profile = NETWORK_PROFILES.find((p) => p.id === network.effectiveType) ?? null;

  const effectiveConfig: LiteConfig = enabled
    ? {
        ...DEFAULT_CONFIG,
        imageQuality: profile?.imageQuality ?? DEFAULT_CONFIG.imageQuality,
        maxImageWidth: profile?.maxImageWidth ?? DEFAULT_CONFIG.maxImageWidth,
        preloadPages: profile?.preloadPages ?? DEFAULT_CONFIG.preloadPages,
      }
    : {
        ...DEFAULT_CONFIG,
        imageQuality: 1,
        maxImageWidth: 2000,
        preloadPages: 3,
        videoAutoplay: true,
        reduceAnimations: false,
      };

  const estimatedDataKB = estimateChapterData(
    effectiveConfig.imageQuality,
    effectiveConfig.preloadPages,
  );

  const toggle = useCallback((next?: boolean) => {
    setEnabled((v) => (next !== undefined ? next : !v));
  }, []);

  const setAuto = useCallback((next: boolean) => {
    setAutoState(next);
  }, []);

  return {
    enabled,
    auto,
    config: effectiveConfig,
    profile,
    network,
    estimatedDataKB,
    toggle,
    setAuto,
  };
}

function estimateChapterData(quality: number, preload: number): number {
  const perPage = 180 * quality;
  const pages = 20 + preload;
  return Math.round(perPage * pages);
}

export function formatDataSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}