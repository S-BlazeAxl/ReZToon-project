import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageSquare } from 'lucide-react';
import ProfileAvatar from '../../../shared/layout/ProfileAvatar';
import SupervisorWorkspaceSwitcher from './SupervisorWorkspaceSwitcher';
import { useCurrentUser } from '../../../core/hooks/useCurrentUser';
import {
  getUnreadCount,
  getUnreadNotificationCount,
} from '../../../core/services/messageService';
import { useRealtimeMessaging } from '../../../core/hooks/useRealtimeMessaging';

type ActiveKey =
  | 'home'
  | 'notifications'
  | 'messages'
  | 'reports'
  | 'search'
  | 'users'
  | 'events'
  | 'feedback';

interface Props {
  active?: ActiveKey;
}

const REALTIME_TABLES = ['messages', 'notifications'] as const;

export default function SupervisorHeader({ active = 'home' }: Props) {
  const user = useCurrentUser();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const [msgCount, notifCount] = await Promise.all([
          getUnreadCount(user.id),
          getUnreadNotificationCount(user.id),
        ]);
        if (!cancelled) {
          setUnreadMessages(msgCount);
          setUnreadNotifications(notifCount);
        }
      } catch {
        /* silent */
      }
    };

    void refresh();
    return () => { cancelled = true; };
  }, [user]);

  useRealtimeMessaging({
    userId: user?.id,
    tables: REALTIME_TABLES,
    onChange: () => {
      if (!user) return;
      void Promise.all([
        getUnreadCount(user.id),
        getUnreadNotificationCount(user.id),
      ])
        .then(([msgCount, notifCount]) => {
          setUnreadMessages(msgCount);
          setUnreadNotifications(notifCount);
        })
        .catch(() => { });
    },
    debounceMs: 200,
  });

  return (
    <header className="home-header">
      <div className="container header-container">
        <Link to="/supervisor" className="logo">
          ReZToon
        </Link>

        <div className="header-actions">
          <SupervisorWorkspaceSwitcher />

          <Link
            to="/supervisor/notifications"
            className={`header-icon-btn ${active === 'notifications' ? 'active' : ''}`}
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span className="header-icon-badge">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>

          <Link
            to="/supervisor/messages"
            className={`header-icon-btn ${active === 'messages' ? 'active' : ''}`}
            aria-label="Messages"
            title="Messages"
          >
            <MessageSquare size={18} />
            {unreadMessages > 0 && (
              <span className="header-icon-badge">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </Link>

          <ProfileAvatar />
        </div>
      </div>
    </header>
  );
}