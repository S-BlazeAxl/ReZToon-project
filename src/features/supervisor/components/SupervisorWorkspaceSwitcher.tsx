import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Home, Layers, X, Check, Mail } from 'lucide-react';
import { useT } from '../../../config/i18n';

interface Workspace {
  id: string;
  label: string;
  description: string;
  icon: typeof Shield;
  to: string;
  accent: string;
}

export default function SupervisorWorkspaceSwitcher() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const WORKSPACES: Workspace[] = [
    {
      id: 'console',
      label: t.supervisor.consoleTitle,
      description: `${t.supervisor.consoleDesc}`,
      icon: Shield,
      to: '/supervisor',
      accent: '#60a5fa',
    },
    {
      id: 'feedback',
      label: t.supervisor.feedbackTitle,
      description: t.supervisor.feedbackSubtitle,
      icon: Mail,
      to: '/supervisor/feedback',
      accent: '#f5b042',
    },
    {
      id: 'reader-home',
      label: t.supervisor.readerHomeTitle,
      description: t.supervisor.readerHomeDesc,
      icon: Home,
      to: '/home',
      accent: '#f5b042',
    },
  ];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isActive = (to: string) => {
    if (to === '/supervisor') return location.pathname.startsWith('/supervisor');
    return location.pathname === to;
  };

  return (
    <div className="workspace-switcher">
      <button
        type="button"
        className={`header-icon-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={t.supervisor.workspaces}
        title={t.supervisor.switchWorkspace}
      >
        <Layers size={18} />
      </button>

      {open &&
        createPortal(
          <div className="panel-anchor">
            <div className="panel workspace-panel" ref={panelRef}>
              <header className="panel-header">
                <div className="panel-header-title">
                  <Layers size={16} />
                  <h3>{t.supervisor.workspaces}</h3>
                  <span className="panel-header-count">{t.supervisor.fullAccess}</span>
                </div>
                <div className="panel-header-actions">
                  <button
                    type="button"
                    className="panel-icon-btn"
                    onClick={() => setOpen(false)}
                    aria-label={t.common.close}
                  >
                    <X size={14} />
                  </button>
                </div>
              </header>

              <div className="panel-body">
                <p className="workspace-intro">
                  {t.supervisor.workspacesIntro}
                </p>

                <ul className="workspace-list">
                  {WORKSPACES.map((w) => {
                    const Icon = w.icon;
                    const active = isActive(w.to);
                    return (
                      <li key={w.id}>
                        <button
                          type="button"
                          className={`workspace-item ${active ? 'active' : ''}`}
                          onClick={() => {
                            navigate(w.to);
                            setOpen(false);
                          }}
                          style={
                            active
                              ? { borderColor: `${w.accent}80` }
                              : undefined
                          }
                        >
                          <span
                            className="workspace-item-icon"
                            style={{
                              background: `${w.accent}20`,
                              color: w.accent,
                              borderColor: `${w.accent}50`,
                            }}
                          >
                            <Icon size={16} />
                          </span>
                          <span className="workspace-item-info">
                            <strong>{w.label}</strong>
                            <span>{w.description}</span>
                          </span>
                          {active && (
                            <span
                              className="workspace-item-check"
                              style={{ color: w.accent }}
                            >
                              <Check size={14} />
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}