import { useCallback, useEffect, useRef, useState } from 'react';
import { checkBackendReachable } from '../lib/connectivity';

export type ConnectionState = 'checking' | 'online' | 'offline' | 'unreachable';

const RETRY_MS = 8000;

/**
 * - offline     : le navigateur n'a pas de réseau (navigator.onLine === false)
 * - unreachable : réseau présent mais le serveur ne répond pas (DNS, VPN, panne)
 * - online      : le backend répond
 * Se re-vérifie automatiquement (événement `online` + toutes les 8 s tant que ça échoue).
 */
export function useConnectionStatus() {
  const [state, setState] = useState<ConnectionState>(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'checking',
  );
  const mountedRef = useRef(true);
  const inflightRef = useRef<Promise<boolean> | null>(null);

  const recheck = useCallback((): Promise<boolean> => {
    if (inflightRef.current) return inflightRef.current;

    if (navigator.onLine === false) {
      setState('offline');
      return Promise.resolve(false);
    }

    setState((prev) => (prev === 'online' ? prev : 'checking'));
    const promise = checkBackendReachable().then((ok) => {
      if (mountedRef.current) setState(ok ? 'online' : 'unreachable');
      return ok;
    }).finally(() => {
      inflightRef.current = null;
    });
    inflightRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void recheck();

    const onOnline = () => { void recheck(); };
    const onOffline = () => { if (mountedRef.current) setState('offline'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [recheck]);

  // Nouvelle tentative automatique tant que le serveur est injoignable.
  useEffect(() => {
    if (state !== 'unreachable') return;
    const id = window.setTimeout(() => { void recheck(); }, RETRY_MS);
    return () => window.clearTimeout(id);
  }, [state, recheck]);

  return {
    state,
    isOnline: state === 'online',
    isBlocked: state === 'offline' || state === 'unreachable',
    recheck,
  };
}
