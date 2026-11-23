
import { useEffect } from 'react';

export const MESSAGING_SYNC_EVENT = 'reztoon:messaging-sync';
const BC_NAME = 'reztoon_messaging';

export function broadcastMessagingSync(): void {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(BC_NAME);
      bc.postMessage({ type: 'sync', at: Date.now() });
      bc.close();
    }
  } catch {

  }
  window.dispatchEvent(new Event(MESSAGING_SYNC_EVENT));
}

export function useCrossTabSync(callback: () => void): void {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (
        e.key === 'reztoon_messages' ||
        e.key === 'reztoon_conv_meta' ||
        e.key === 'reztoon_notifications' ||
        e.key === 'reztoon_session'
      ) {
        callback();
      }
    };
    window.addEventListener('storage', onStorage);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel(BC_NAME);
        bc.onmessage = () => callback();
      }
    } catch {

    }

    const onCustom = () => callback();
    window.addEventListener(MESSAGING_SYNC_EVENT, onCustom);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(MESSAGING_SYNC_EVENT, onCustom);
      bc?.close();
    };
  }, [callback]);
}