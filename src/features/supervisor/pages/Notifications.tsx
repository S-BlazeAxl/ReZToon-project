import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell, BookOpen, Heart, MessageCircle, UserPlus, Info, Check, Trash2,
} from 'lucide-react';
import ParticlesCanvas from '../../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../../shared/effects/FloatingShapes';
import { SupervisorHeader, SupervisorPageShell } from '../components';
import { useCurrentUserWithLoading } from '../../../core/hooks/useCurrentUser';
import {
  getNotifications, markAllAsRead, markAsRead, clearNotifications,
} from '../../../core/services/messageService';
import { useRealtimeMessaging } from '../../../core/hooks/useRealtimeMessaging';
import type { Notification, NotificationType } from '../../../core/services/messageService';
import { formatRelativeTime } from '../../../core/utils/format';
import '../../../styles/home-style.css';
import '../../../styles/profile-style.css';
import '../../../styles/panel-style.css';
import '../../../styles/supervisor-style.css';
import '../../../styles/supervisor-pages-style.css';
import { useT, useI18n } from '../../../config/i18n';

const REALTIME_TABLES = ['notifications'] as const;

const ICON_MAP: Partial<Record<NotificationType, typeof Bell>> = {
  release: BookOpen,
  follow: UserPlus,
  comment: MessageCircle,
  like: Heart,
  system: Info,
};

export default function SupervisorNotifications() {
  const t = useT();
  const { lang } = useI18n();
  const { user, loading: authLoading } = useCurrentUserWithLoading();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');

  const FILTERS: { id: 'all' | 'unread' | NotificationType; label: string }[] = [
    { id: 'all', label: t.communityFeed.feedFilters.all },
    { id: 'unread', label: 'Unread' },
    { id: 'system', label: 'System' },
    { id: 'release', label: 'Release' },
    { id: 'follow', label: 'Follow' },
    { id: 'comment', label: 'Comment' },
    { id: 'like', label: 'Like' },
  ];

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const data = await getNotifications(user.id);
    setItems(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtimeMessaging({
    userId: user?.id,
    tables: REALTIME_TABLES,
    onChange: () => { void refresh(); },
    debounceMs: 200,
  });

  const visible = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'unread') return items.filter((n) => !n.read);
    return items.filter((n) => n.type === filter);
  }, [items, filter]);

  const unreadCount = items.filter((n) => !n.read).length;

  const handleClick = async (id: string) => {
    if (!user) return;
    await markAsRead(user.id, id);
    await refresh();
  };

  const handleMarkAll = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    await refresh();
  };

  const handleClear = async () => {
    if (!user) return;
    if (!window.confirm('Clear all notifications?')) return;
    await clearNotifications(user.id);
    await refresh();
  };

  if (authLoading || !user) return null;

  return (
    <>
      <div className="home-bg">
        <ParticlesCanvas />
        <FloatingShapes />
        <div className="bg-overlay" />
      </div>

      <SupervisorHeader active="notifications" />

      <SupervisorPageShell
        tag="Console"
        tagIcon={<Bell size={12} />}
        title={t.messaging.notifications}
        subtitle={`${items.length} total · ${unreadCount} unread`}
        actions={
          <>
            <button
              type="button"
              className="supervisor-page-action"
              onClick={handleMarkAll}
              disabled={unreadCount === 0}
            >
              <Check size={14} /> Mark all as read
            </button>
            <button
              type="button"
              className="supervisor-page-action danger"
              onClick={handleClear}
              disabled={items.length === 0}
            >
              <Trash2 size={14} /> Clear all
            </button>
          </>
        }
      >
        <div className="supervisor-chips">
          {FILTERS.map((f) => {
            const count =
              f.id === 'all'
                ? items.length
                : f.id === 'unread'
                  ? unreadCount
                  : items.filter((n) => n.type === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                className={`supervisor-chip ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                <span>{f.label}</span>
                <span className="supervisor-chip-count">{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="supervisor-empty">
            <Bell size={32} />
            <p>Loading notifications…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="supervisor-empty">
            <Bell size={32} />
            <p>{t.messaging.noNotifications}</p>
            <span>{t.messaging.allCaughtUp}</span>
          </div>
        ) : (
          <ul className="supervisor-notif-list">
            {visible.map((n) => {
              const Icon = ICON_MAP[n.type] ?? Info;
              return (
                <li
                  key={n.id}
                  className={`supervisor-notif ${n.read ? '' : 'unread'}`}
                  onClick={() => handleClick(n.id)}
                >
                  <div className={`supervisor-notif-icon type-${n.type}`}>
                    <Icon size={16} />
                  </div>
                  <div className="supervisor-notif-content">
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                  </div>
                  <span className="supervisor-notif-date">{formatRelativeTime(n.date, lang)}</span>
                  {!n.read && <span className="supervisor-notif-dot" />}
                </li>
              );
            })}
          </ul>
        )}
      </SupervisorPageShell>
    </>
  );
}