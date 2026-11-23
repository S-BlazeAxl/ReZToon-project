
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL. Check your .env.local file.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    // Reconnexion progressive du WebSocket (1s, 2s, 5s, 10s…) au lieu d'une rafale de tentatives
    // quand le réseau change ou tombe (« WebSocket is closed before the connection is established »).
    reconnectAfterMs: (tries: number) => [1000, 2000, 5000, 10000][tries - 1] ?? 15000,
    heartbeatIntervalMs: 25000,
  },
});
