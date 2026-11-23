import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../../core/hooks/usePWAInstall';
import { useT } from '../../config/i18n';

export default function PWAInstallBanner() {
  const { canInstall, prompt, dismiss, wasDismissedRecently } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const t = useT();

  useEffect(() => {
    if (!canInstall || wasDismissedRecently()) return;
    const timer = window.setTimeout(() => setVisible(true), 15000);
    return () => window.clearTimeout(timer);
  }, [canInstall, wasDismissedRecently]);

  if (!visible || !canInstall) return null;

  const handleInstall = async () => {
    const ok = await prompt();
    if (!ok) setVisible(false);
  };

  const handleDismiss = () => {
    dismiss();
    setVisible(false);
  };

  return (
    <div className="pwa-install-banner" role="dialog" aria-label={t.pwa.installTitle}>
      <div className="pwa-install-icon">
        <Download size={20} />
      </div>
      <div className="pwa-install-text">
        <strong>{t.pwa.installTitle}</strong>
        <span>{t.pwa.installDesc}</span>
      </div>
      <button
        type="button"
        className="pwa-install-cta"
        onClick={handleInstall}
      >
        {t.pwa.installCta}
      </button>
      <button
        type="button"
        className="pwa-install-close"
        onClick={handleDismiss}
        aria-label={t.common.close}
      >
        <X size={14} />
      </button>
    </div>
  );
}