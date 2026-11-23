import { useEffect, useState } from 'react';
import { Zap, Wifi, WifiOff, Gauge, X, Check } from 'lucide-react';
import { useLiteMode, formatDataSize } from '../../core/hooks/useLiteMode';
import { useT } from '../../config/i18n';

export default function LiteModeToggle() {
  const [open, setOpen] = useState(false);
  const lite = useLiteMode();
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lite-toggle">
      <button
        type="button"
        className={`header-icon-btn ${lite.enabled ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={t.liteMode.title}
        title={t.liteMode.title}
      >
        <Zap size={18} />
        {lite.enabled && <span className="lite-toggle-dot" />}
      </button>

      {open && (
        <>
          <div className="lite-toggle-overlay" onClick={() => setOpen(false)} />
          <div className="lite-toggle-panel">
            <header className="lite-toggle-header">
              <div>
                <Zap size={16} />
                <h3>{t.liteMode.title}</h3>
              </div>
              <button
                type="button"
                className="panel-icon-btn"
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
              >
                <X size={13} />
              </button>
            </header>

            <div className="lite-toggle-body">
              <div className="lite-toggle-row">
                <label className="lite-toggle-switch">
                  <input
                    type="checkbox"
                    checked={lite.enabled}
                    onChange={(e) => lite.toggle(e.target.checked)}
                  />
                  <span className="lite-toggle-slider" />
                </label>
                <div className="lite-toggle-text">
                  <strong>{t.liteMode.enable}</strong>
                  <span>{t.liteMode.enableDesc}</span>
                </div>
              </div>

              <div className="lite-toggle-row">
                <label className="lite-toggle-switch">
                  <input
                    type="checkbox"
                    checked={lite.auto}
                    onChange={(e) => lite.setAuto(e.target.checked)}
                  />
                  <span className="lite-toggle-slider" />
                </label>
                <div className="lite-toggle-text">
                  <strong>{t.liteMode.auto}</strong>
                  <span>{t.liteMode.autoDesc}</span>
                </div>
              </div>

              <div className="lite-toggle-status">
                <div className="lite-toggle-status-row">
                  {lite.network.online ? <Wifi size={13} /> : <WifiOff size={13} />}
                  <span>{lite.network.online ? t.liteMode.online : t.liteMode.offline}</span>
                </div>
                <div className="lite-toggle-status-row">
                  <Gauge size={13} />
                  <span>
                    {lite.network.supported
                      ? `${lite.network.effectiveType.toUpperCase()} · ${lite.network.downlink.toFixed(1)} Mbps · ${lite.network.rtt}ms`
                      : t.liteMode.networkUnmeasurable}
                  </span>
                </div>
                {lite.network.saveData && (
                  <div className="lite-toggle-status-row alert">
                    <Check size={13} />
                    <span>{t.liteMode.saveData}</span>
                  </div>
                )}
              </div>

              <div className="lite-toggle-estimate">
                <span>{t.liteMode.estimate}</span>
                <strong>~{formatDataSize(lite.estimatedDataKB)}</strong>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}