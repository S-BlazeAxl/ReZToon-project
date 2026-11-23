import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import MessagesSquareIcon from '../ui/MessagesSquareIcon';
import MessagingShell from '../../features/messaging/MessagingShell';
import { getUnreadCount } from '../../core/services/messageService';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { useRealtimeMessaging } from '../../core/hooks/useRealtimeMessaging';
import { useT } from '../../config/i18n';
import '../../styles/panel-style.css';
import '../../styles/message-style.css';

const REALTIME_TABLES = ['messages'] as const;

interface MessagesPanelProps {
  /** true sur la page /messages : l'icône reste unique, active, et ne rouvre pas un second panneau. */
  currentPage?: boolean;
}

export default function MessagesPanel({ currentPage = false }: MessagesPanelProps = {}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const user = useCurrentUser();

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;

    const fetchUnread = async () => {
      try {
        const count = await getUnreadCount(user.id);
        if (!cancelled) setUnread(count);
      } catch {
      }
    };

    void fetchUnread();
    return () => { cancelled = true; };
  }, [user]);

  useRealtimeMessaging({
    userId: user?.id,
    tables: REALTIME_TABLES,
    onChange: () => {
      if (!user) return;
      void getUnreadCount(user.id).then(setUnread).catch(() => {});
    },
    debounceMs: 200,
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (maximized) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, maximized]);

  useEffect(() => {
    if (!(open && maximized)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, maximized]);

  if (!user) return null;

  if (currentPage) {
    return (
      <Link to="/messages" className="header-icon-btn active" aria-current="page" aria-label={t.messaging.messages}>
        <MessagesSquareIcon size={18} />
        {unread > 0 && (
          <span className="header-icon-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`header-icon-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={t.messaging.messages}
      >
        <MessagesSquareIcon size={18} />
        {unread > 0 && (
          <span className="header-icon-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open &&
        createPortal(
          <div className={`panel-anchor ${maximized ? 'panel-anchor-maximized' : ''}`}>
            <div
              className={`panel panel-mail panel-opaque messaging-panel ${
                maximized ? 'messaging-panel-maximized' : ''
              }`}
              ref={panelRef}
            >
              <div className="messaging-panel-close">
                <button
                  type="button"
                  className="panel-icon-btn"
                  onClick={() => setMaximized((v) => !v)}
                  title={maximized ? t.common.collapse : t.common.readMore}
                  aria-label={maximized ? t.common.collapse : t.common.readMore}
                >
                  {maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  type="button"
                  className="panel-icon-btn"
                  onClick={() => setOpen(false)}
                  title={t.common.close}
                  aria-label={t.common.close}
                >
                  <X size={16} />
                </button>
              </div>
              <MessagingShell mode="panel" />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}