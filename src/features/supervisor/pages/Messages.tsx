import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import ParticlesCanvas from '../../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../../shared/effects/FloatingShapes';
import { SupervisorHeader } from '../components';
import MessagingShell from '../../../features/messaging/MessagingShell';
import { useCurrentUserWithLoading } from '../../../core/hooks/useCurrentUser';

import '../../../styles/home-style.css';
import '../../../styles/profile-style.css';
import '../../../styles/panel-style.css';
import '../../../styles/message-style.css';
import '../../../styles/supervisor-style.css';
import '../../../styles/supervisor-messages-style.css';

export default function SupervisorMessages() {
  const { user, loading: authLoading } = useCurrentUserWithLoading();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/let-go', { replace: true });
      return;
    }
    if (user.role !== 'supervisor') {
      navigate('/supervisor', { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user || user.role !== 'supervisor') return null;

  return (
    <>
      <div className="home-bg">
        <ParticlesCanvas />
        <FloatingShapes />
        <div className="bg-overlay" />
      </div>

      <SupervisorHeader active="messages" />

      <div className="supervisor-messages-shell">
        <MessagingShell mode="page" />
      </div>
    </>
  );
}