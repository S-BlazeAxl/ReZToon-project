import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthUser } from '../../core/providers/AuthUserProvider';
import type { UserRole } from '../../core/services/userService';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuthUser();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark)' }}>
        <div className="loader-ring" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/let-go" state={{ from: location }} replace />;
  }

  if (user.isDeleted === true) {
    return <Navigate to="/let-go" replace />;
  }

  if (user.isActive === false) {
    return <Navigate to="/home" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = user.role;
    const hasAccess = role ? allowedRoles.includes(role) : false;
    const isBothAllowed = role === 'both' && allowedRoles.includes('creator');

    if (!hasAccess && !isBothAllowed) {
      return <Navigate to="/home" replace />;
    }
  }

  return <Outlet />;
}