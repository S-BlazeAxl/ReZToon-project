import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  PenTool, X, BookPlus, Library, BarChart3,
  Feather, Sparkles, LayoutDashboard,
} from 'lucide-react';
import { useT } from '../../config/i18n';
import '../../styles/panel-style.css';

export default function CreatorPanel() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  const actions = [
    { id: 'dashboard', label: t.creator.dashboard, desc: t.creator.overviewActivity, icon: LayoutDashboard, to: '/creator' },
    { id: 'new', label: t.creator.newChapter, desc: t.creator.uploadPublish, icon: BookPlus, to: '/creator/new' },
    { id: 'series', label: t.creator.mySeries, desc: t.creator.manageOngoing, icon: Library, to: '/creator/series' },
    { id: 'analytics', label: t.creator.analytics, desc: t.creator.trackReadership, icon: BarChart3, to: '/creator/analytics' },
  ] as const;

  const handleClick = (to: string) => {
    navigate(to);
    setOpen(false);
  };

  return (
    <>
      <button
        className={`header-icon-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={t.creator.studio}
      >
        <PenTool size={18} />
      </button>

      {open &&
        createPortal(
          <div className="panel-anchor">
            <div className="panel panel-opaque" ref={panelRef}>
              <header className="panel-header">
                <div className="panel-header-title">
                  <PenTool size={16} />
                  <h3>{t.creator.studio}</h3>
                  <span className="panel-header-count">Beta</span>
                </div>
                <div className="panel-header-actions">
                  <button
                    className="panel-icon-btn"
                    onClick={() => setOpen(false)}
                    title={t.common.close}
                  >
                    <X size={14} />
                  </button>
                </div>
              </header>

              <div className="panel-body">
                <div className="creator-welcome">
                  <Sparkles size={18} />
                  <div>
                    <strong>{t.creator.welcome}</strong>
                    <span>{t.creator.welcomeDesc}</span>
                  </div>
                </div>

                <ul className="creator-actions">
                  {actions.map((a) => {
                    const Icon = a.icon;
                    return (
                      <li
                        key={a.id}
                        className="creator-action"
                        onClick={() => handleClick(a.to)}
                      >
                        <div className="creator-action-icon">
                          <Icon size={16} />
                        </div>
                        <div className="creator-action-info">
                          <strong>{a.label}</strong>
                          <span>{a.desc}</span>
                        </div>
                        <Feather size={12} className="creator-action-hint" />
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}