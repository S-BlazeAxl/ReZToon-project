import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, BookOpen, Heart, MessageCircle, UserPlus, Info,
  Check, Trash2, X,
} from 'lucide-react';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import {
  getNotifications, markAllAsRead, markAsRead, clearNotifications,
} from '../../core/services/messageService';
import { useRealtimeMessaging } from '../../core/hooks/useRealtimeMessaging';
import type { Notification, NotificationType } from '../../core/services/messageService';
import { formatRelativeTime } from '../../core/utils/format';
import { useT } from '../../config/i18n';
import '../../styles/panel-style.css';

const REALTIME_TABLES = ['notifications'] as const;

const ICON_MAP: Partial<Record<NotificationType, typeof Bell>> = {
  release: BookOpen,
  follow: UserPlus,
  comment: MessageCircle,
  like: Heart,
  system: Info,
};

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const user = useCurrentUser();
  const t = useT();
  const [items, setItems] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    let cancelled = false;

    const fetchNotifications = async () => {
      const data = await getNotifications(user.id);
      if (!cancelled) setItems(data);
    };

    void fetchNotifications();

    return () => { cancelled = true; };
  }, [user]);

  useRealtimeMessaging({
    userId: user?.id,
    tables: REALTIME_TABLES,
    onChange: () => {
      if (!user) return;
      void getNotifications(user.id).then(setItems).catch(() => { });
    },
    debounceMs: 200,
  });

  useEffect(() => {
    if (!user || !open) return;
    void getNotifications(user.id).then(setItems);
  }, [user, open]);

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

  if (!user) return null;

  const unread = items.filter((n) => !n.read).length;

  const handleItemClick = async (id: string) => {
    await markAsRead(user.id, id);
    const data = await getNotifications(user.id);
    setItems(data);
  };

  const handleMarkAll = async () => {
    await markAllAsRead(user.id);
    const data = await getNotifications(user.id);
    setItems(data);
  };

  const handleClear = async () => {
    await clearNotifications(user.id);
    setItems([]);
  };

  return (
    <>
      <button
        className={`header-icon-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="header-icon-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="panel-anchor">
            <div className="panel panel-opaque" ref={panelRef}>
              <header className="panel-header">
                <div className="panel-header-title">
                  <Bell size={16} />
                  <h3>Notifications</h3>
                  {unread > 0 && (
                    <span className="panel-header-count">{unread} new</span>
                  )}
                </div>
                <div className="panel-header-actions">
                  {items.length > 0 && (
                    <>
                      <button
                        className="panel-icon-btn"
                        onClick={handleMarkAll}
                        title="Mark all as read"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        className="panel-icon-btn danger"
                        onClick={handleClear}
                        title="Clear all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
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
                {items.length === 0 ? (
                  <div className="panel-empty">
                    <Bell size={32} />
                    <p>No notifications</p>
                    <span>You're all caught up.</span>
                  </div>
                ) : (
                  <ul className="notif-list">
                    {items.map((n) => {
                      const Icon = ICON_MAP[n.type] ?? Info;
                      return (
                        <li
                          key={n.id}
                          className={`notif-item ${n.read ? '' : 'unread'}`}
                          onClick={() => handleItemClick(n.id)}
                        >
                          <div className={`notif-icon ${n.type}`}>
                            <Icon size={14} />
                          </div>
                          <div className="notif-content">
                            <strong>{n.title}</strong>
                            <p>{n.message}</p>
                            <span className="notif-date">{formatRelativeTime(n.date)}</span>
                          </div>
                          {!n.read && <span className="notif-dot" />}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}