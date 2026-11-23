import { useEffect, useState } from 'react';

interface NetworkInformation extends EventTarget {
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  readonly downlink: number;
  readonly rtt: number;
  readonly saveData: boolean;
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkInformation;
}

export interface NetworkState {
  supported: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  online: boolean;
}

export function useNetworkInfo(): NetworkState {
  const [state, setState] = useState<NetworkState>(() => readNetwork());

  useEffect(() => {
    const nav = navigator as NavigatorWithConnection;
    const conn = nav.connection;
    const update = () => setState(readNetwork());

    if (conn) {
      conn.addEventListener('change', update);
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    return () => {
      if (conn) {
        conn.removeEventListener('change', update);
      }
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return state;
}

function readNetwork(): NetworkState {
  if (typeof navigator === 'undefined') {
    return {
      supported: false,
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
      online: true,
    };
  }

  const nav = navigator as NavigatorWithConnection;
  const conn = nav.connection;

  return {
    supported: Boolean(conn),
    effectiveType: conn?.effectiveType ?? '4g',
    downlink: conn?.downlink ?? 10,
    rtt: conn?.rtt ?? 50,
    saveData: conn?.saveData ?? false,
    online: navigator.onLine,
  };
}