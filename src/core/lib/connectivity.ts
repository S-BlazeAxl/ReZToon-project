const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Vrai si l'erreur vient du réseau (DNS, hors-ligne, timeout, CORS bloqué...)
 * et non d'un refus du serveur. supabase-js renvoie `AuthRetryableFetchError`
 * (status 0) pour `ERR_NAME_NOT_RESOLVED` / `Failed to fetch`.
 */
export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; message?: string; status?: number };
  const msg = (e.message ?? '').toLowerCase();
  return (
    e.name === 'AuthRetryableFetchError' ||
    e.status === 0 ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('aborted')
  );
}

/**
 * `navigator.onLine` ne détecte pas un DNS en panne, un VPN/pare-feu ou un
 * serveur injoignable : on contacte donc réellement le backend.
 * N'importe quelle réponse HTTP prouve que DNS + TLS + réseau fonctionnent.
 */
export async function checkBackendReachable(timeoutMs = 6000): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  if (!SUPABASE_URL) return true;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      headers: SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : undefined,
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}
