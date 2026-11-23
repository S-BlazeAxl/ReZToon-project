import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BookOpen, Heart, MessageCircle, UserPlus, Info, Mail, Users, Star, Trophy,
  Check, Trash2, X,
  type LucideIcon,
} from 'lucide-react';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import {
  getNotifications, getUnreadNotificationCount,
  markAllAsRead, markAsRead, clearNotifications,
} from '../../core/services/messageService';
import { useRealtimeMessaging } from '../../core/hooks/useRealtimeMessaging';
import type { Notification, NotificationType } from '../../core/services/messageService';
import { formatNotification } from '../../core/utils/notificationText';
import { formatRelativeTime } from '../../core/utils/format';
import { useT, useI18n } from '../../config/i18n';
import '../../styles/panel-style.css';

const REALTIME_TABLES = ['notifications'] as const;
const TOAST_MS = 6000;

const ICON_MAP: Record<NotificationType, LucideIcon> = {
  release: BookOpen,
  follow: UserPlus,
  comment: MessageCircle,
  like: Heart,
  system: Info,
  message: Mail,
  group: Users,
  review: Star,
  award: Trophy,
};

type Filter = 'all' | 'unread';

function isImageUrl(value?: string | null): value is string {
  return !!value && /^(https?:\/\/|data:image\/|blob:|\/)/i.test(value.trim());
}

function NotificationAvatar({ n }: { n: Notification }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [n.actorPhoto]);
  const Icon = ICON_MAP[n.type] ?? Info;

  return (
    <div className={`notif-avatar ${n.actorName || n.actorPhoto ? '' : 'notif-avatar--icon'} ${n.type}`}>
      {isImageUrl(n.actorPhoto) && !failed ? (
        <img src={n.actorPhoto} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : n.actorName ? (
        <span>{n.actorName.trim().charAt(0).toUpperCase() || '?'}</span>
      ) : (
        <Icon size={18} />
      )}
      <span className={`notif-avatar-badge ${n.type}`}><Icon size={11} /></span>
    </div>
  );
}

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState<Notification | null>(null);
  const user = useCurrentUser();
  const userId = user?.id ?? null;
  const t = useT();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // id -> count déjà vu : détecte une nouvelle notification OU une notification regroupée qui grossit.
  const seenRef = useRef<Map<string, number>>(new Map());
  const initializedRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  const templates = t.notificationCenter.events as unknown as Record<string, string>;

  const detectNew = useCallback((list: Notification[]) => {
    const seen = seenRef.current;
    let newest: Notification | null = null;
    for (const n of list) {
      const prev = seen.get(n.id);
      if (initializedRef.current && !n.read && (prev === undefined || prev < n.count)) {
        if (!newest || new Date(n.date) > new Date(newest.date)) newest = n;
      }
      seen.set(n.id, n.count);
    }
    initializedRef.current = true;

    if (newest && !openRef.current) {
      setToast(newest);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), TOAST_MS);
    }
  }, []);

  const reload = useCallback(async () => {
    if (!userId) return;
    const [data, count] = await Promise.all([
      getNotifications(userId),
      getUnreadNotificationCount(userId),
    ]);
    setItems(data);
    setUnreadCount(count);
    detectNew(data);
  }, [userId, detectNew]);

  useEffect(() => {
    seenRef.current = new Map();
    initializedRef.current = false;
    setToast(null);
    if (!userId) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    void reload().catch(() => {});
  }, [userId, reload]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  useRealtimeMessaging({
    userId,
    tables: REALTIME_TABLES,
    onChange: () => { void reload().catch(() => {}); },
    debounceMs: 200,
  });

  useEffect(() => {
    if (open) {
      setToast(null);
      void reload().catch(() => {});
    }
  }, [open, reload]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
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

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.read) : items),
    [items, filter],
  );
  const unreadItems = useMemo(() => visible.filter((n) => !n.read), [visible]);
  const readItems = useMemo(() => visible.filter((n) => n.read), [visible]);

  if (!user) return null;

  const openNotification = async (n: Notification) => {
    setToast(null);
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      void markAsRead(user.id, n.id);
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllAsRead(user.id);
  };

  const handleClear = async () => {
    setItems([]);
    setUnreadCount(0);
    seenRef.current = new Map();
    await clearNotifications(user.id);
  };

  const renderItem = (n: Notification) => {
    const { parts } = formatNotification(n, templates, lang);
    return (
      <li key={n.id} className={`notif-item notif-item--rich ${n.read ? '' : 'unread'}`}>
        <button type="button" className="notif-item-btn" onClick={() => void openNotification(n)}>
          <NotificationAvatar n={n} />
          <div className="notif-content">
            <p className="notif-text">
              {parts.map((p, i) => (p.strong ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}
            </p>
            <span className="notif-date">{formatRelativeTime(n.date, lang)}</span>
          </div>
          {!n.read && <span className="notif-dot" aria-hidden="true" />}
        </button>
      </li>
    );
  };

  const nc = t.notificationCenter;

  return (
    <>
      <button
        type="button"
        className={`header-icon-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={t.messaging.notifications}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="header-icon-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {toast && !open &&
        createPortal(
          <button type="button" className="notif-toast" onClick={() => void openNotification(toast)} aria-live="polite">
            <NotificationAvatar n={toast} />
            <div className="notif-toast-body">
              <span className="notif-toast-label">{nc.toastLabel}</span>
              <p className="notif-text">
                {formatNotification(toast, templates, lang).parts.map((p, i) =>
                  p.strong ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>)}
              </p>
            </div>
            <span
              className="notif-toast-close"
              role="button"
              tabIndex={0}
              aria-label={t.common.close}
              onClick={(e) => { e.stopPropagation(); setToast(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setToast(null); } }}
            >
              <X size={14} />
            </span>
          </button>,
          document.body,
        )}

      {open &&
        createPortal(
          <div className="panel-anchor">
            <div className="panel panel-opaque notif-panel" ref={panelRef}>
              <header className="panel-header">
                <div className="panel-header-title">
                  <Bell size={16} />
                  <h3>{t.messaging.notifications}</h3>
                  {unreadCount > 0 && (
                    <span className="panel-header-count">{unreadCount} {t.messaging.newNotifications}</span>
                  )}
                </div>
                <div className="panel-header-actions">
                  {items.length > 0 && (
                    <>
                      <button type="button" className="panel-icon-btn" onClick={handleMarkAll}
                        title={t.messaging.markAllRead} aria-label={t.messaging.markAllRead}>
                        <Check size={14} />
                      </button>
                      <button type="button" className="panel-icon-btn danger" onClick={handleClear}
                        title={t.messaging.clearAll} aria-label={t.messaging.clearAll}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  <button type="button" className="panel-icon-btn" onClick={() => setOpen(false)}
                    title={t.common.close} aria-label={t.common.close}>
                    <X size={14} />
                  </button>
                </div>
              </header>

              <div className="notif-tabs" role="tablist">
                {(['all', 'unread'] as const).map((id) => (
                  <button key={id} type="button" role="tab" aria-selected={filter === id}
                    className={`notif-tab ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
                    {id === 'all' ? nc.filterAll : nc.filterUnread}
                  </button>
                ))}
              </div>

              <div className="panel-body">
                {visible.length === 0 ? (
                  <div className="panel-empty">
                    <Bell size={32} />
                    <p>{t.messaging.noNotifications}</p>
                    <span>{t.messaging.allCaughtUp}</span>
                  </div>
                ) : (
                  <>
                    {unreadItems.length > 0 && (
                      <>
                        <h4 className="notif-section-title">{nc.sectionNew}</h4>
                        <ul className="notif-list">{unreadItems.map(renderItem)}</ul>
                      </>
                    )}
                    {readItems.length > 0 && (
                      <>
                        <h4 className="notif-section-title">{nc.sectionEarlier}</h4>
                        <ul className="notif-list">{readItems.map(renderItem)}</ul>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
