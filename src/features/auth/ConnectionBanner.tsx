import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, ServerOff, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionState } from '../../core/hooks/useConnectionStatus';
import { useT } from '../../config/i18n';

interface Props {
  state: ConnectionState;
  onRetry: () => void;
}

/** Bannière de l'état de connexion pour la page d'authentification. */
export default function ConnectionBanner({ state, onRetry }: Props) {
  const t = useT();
  const [restored, setRestored] = useState(false);
  const wasDownRef = useRef(false);

  useEffect(() => {
    if (state === 'offline' || state === 'unreachable') {
      wasDownRef.current = true;
      setRestored(false);
      return;
    }
    if (state === 'online' && wasDownRef.current) {
      wasDownRef.current = false;
      setRestored(true);
      const id = window.setTimeout(() => setRestored(false), 3500);
      return () => window.clearTimeout(id);
    }
  }, [state]);

  if (restored) {
    return (
      <div className="connection-banner restored" role="status">
        <Wifi size={16} />
        <span>{t.auth.backOnline}</span>
      </div>
    );
  }

  if (state === 'offline' || state === 'unreachable') {
    const offline = state === 'offline';
    return (
      <div className="connection-banner blocked" role="alert">
        {offline ? <WifiOff size={16} /> : <ServerOff size={16} />}
        <div className="connection-banner-text">
          <strong>{offline ? t.auth.offlineTitle : t.auth.unreachableTitle}</strong>
          <span>{offline ? t.auth.offlineDesc : t.auth.unreachableDesc}</span>
        </div>
        <button type="button" className="connection-retry" onClick={onRetry}>
          <RefreshCw size={13} /> {t.auth.retry}
        </button>
      </div>
    );
  }

  if (state === 'checking') {
    return (
      <div className="connection-banner checking" role="status">
        <Loader2 size={16} className="connection-spin" />
        <span>{t.auth.checkingConnection}</span>
      </div>
    );
  }

  return null;
}
