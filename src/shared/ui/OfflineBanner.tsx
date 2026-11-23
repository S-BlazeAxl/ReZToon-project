import { WifiOff } from 'lucide-react';
import { useNetworkInfo } from '../../core/hooks/useNetworkInfo';
import { useT } from '../../config/i18n';

export default function OfflineBanner() {
  const { online } = useNetworkInfo();
  const t = useT();
  
  if (online) return null;
  
  return (
    <div className="offline-banner" role="status">
      <WifiOff size={14} />
      <span>{t.pwa.offline}</span>
    </div>
  );
}