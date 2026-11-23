import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { useCurrentUser } from '../../../core/hooks/useCurrentUser';

const APP_ROUTES = [
  '/home',
  '/community',
  '/messages',
  '/awards',
  '/library',
  '/creator',
  '/manga',
];

function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default function SupervisorFloatingBadge() {
  const user = useCurrentUser();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'supervisor') {
      setVisible(false);
      return;
    }

    const onSupervisorRoute = location.pathname.startsWith('/supervisor');
    const onAppRoute = isAppRoute(location.pathname);

    setVisible(onAppRoute && !onSupervisorRoute);
  }, [user, location.pathname]);

  if (!visible) return null;

  return (
    <Link to="/supervisor" className="supervisor-floating-badge">
      <Shield size={12} />
      <span>Supervisor mode</span>
      <ArrowLeft size={12} />
    </Link>
  );
}