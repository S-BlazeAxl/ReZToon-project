import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUser, type User } from '../services/userService';
import { isNetworkError } from '../lib/connectivity';

export const USER_CHANGE_EVENT = 'reztoon:user-change';

export function notifyUserChange(): void {
  window.dispatchEvent(new Event(USER_CHANGE_EVENT));
}

interface AuthUserContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthUserContext = createContext<AuthUserContextValue | null>(null);

export function AuthUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const userRef = useRef<User | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);

  const applyUser = useCallback((next: User | null) => {
    userRef.current = next;
    setUser(next);
  }, []);

  const refresh = useCallback(async () => {
    if (inflightRef.current) return inflightRef.current;

    const promise = (async () => {
      try {
        const u = await getCurrentUser();
        if (isMountedRef.current) {
          applyUser(u);
          setLoading(false);
        }
      } catch (err) {
        if (isNetworkError(err)) {
          // Hors-ligne / DNS : on garde l'utilisateur actuel au lieu de le déconnecter.
          console.warn('[AuthUserProvider] refresh skipped (network unavailable).');
          if (isMountedRef.current) setLoading(false);
        } else {
          console.error('[AuthUserProvider] refresh failed:', err);
          if (isMountedRef.current) {
            applyUser(null);
            setLoading(false);
          }
        }
      } finally {
        inflightRef.current = null;
      }
    })();

    inflightRef.current = promise;
    return promise;
  }, [applyUser]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void refresh();
    }, 50);
  }, [refresh]);

  useEffect(() => {
    isMountedRef.current = true;
    void refresh();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return;

        if (event === 'SIGNED_OUT') {
          applyUser(null);
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          if (!session) {
            applyUser(null);
            setLoading(false);
          }
          return;
        }

        if (event === 'SIGNED_IN') {
          if (!session) {
            applyUser(null);
            setLoading(false);
            return;
          }
          if (session.user.id !== userRef.current?.id) {
            await refresh();
          }
        }
      },
    );

    const onUserChange = () => scheduleRefresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('sb-') && e.key.endsWith('-auth-token')) {
        scheduleRefresh();
      }
    };

    // Hors-ligne : on suspend le rafraîchissement du token (sinon spam de
    // `ERR_NAME_NOT_RESOLVED` sur /auth/v1/token) puis on le relance au retour du réseau.
    const onOffline = () => { void supabase.auth.stopAutoRefresh(); };
    const onOnline = () => {
      void supabase.auth.startAutoRefresh();
      scheduleRefresh();
    };
    if (navigator.onLine === false) onOffline();

    window.addEventListener(USER_CHANGE_EVENT, onUserChange);
    window.addEventListener('storage', onStorage);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
      authListener.subscription.unsubscribe();
      window.removeEventListener(USER_CHANGE_EVENT, onUserChange);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [refresh, scheduleRefresh, applyUser]);

  useEffect(() => {
    const currentUserId = userRef.current?.id;
    if (!currentUserId) return;

    const channel = supabase
      .channel(`profile-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${currentUserId}`,
        },
        (payload) => {
          const newProfile = payload.new as any;
          const banned =
            newProfile.ban_until && new Date(newProfile.ban_until) > new Date();
          const blocked =
            newProfile.is_active === false ||
            newProfile.is_deleted === true ||
            banned;

          if (blocked) {
            void supabase.auth.signOut().then(() => applyUser(null));
          } else {
            void refresh();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, applyUser, refresh]);

  return (
    <AuthUserContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthUserContext.Provider>
  );
}

export function useAuthUser(): AuthUserContextValue {
  const ctx = useContext(AuthUserContext);
  if (!ctx) throw new Error('useAuthUser must be used inside <AuthUserProvider>');
  return ctx;
}