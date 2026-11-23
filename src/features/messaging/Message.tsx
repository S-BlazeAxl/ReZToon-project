import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Home as HomeIcon, Trophy } from 'lucide-react';

import ParticlesCanvas from '../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../shared/effects/FloatingShapes';
import ProfileAvatar from '../../shared/layout/ProfileAvatar';
import SearchPanel from '../../shared/panels/SearchPanel';
import CreatorPanel from '../../shared/panels/CreatorPanel';
import NotificationsPanel from '../../shared/panels/NotificationsPanel';
import MessagesPanel from '../../shared/panels/MessagesPanel';
import LanguageSwitcher from '../../shared/ui/LanguageSwitcher';
import LiteModeToggle from '../../shared/ui/LiteModeToggle';
import MessagingShell from '../../features/messaging/MessagingShell';

import { useCurrentUserWithLoading } from '../../core/hooks/useCurrentUser';
import { getFooter } from '../../core/services/catalogueService';
import { useT } from '../../config/i18n';

import '../../styles/home-style.css';
import '../../styles/profile-style.css';
import '../../styles/panel-style.css';
import '../../styles/message-style.css';
import '../../styles/pwa-style.css';

const FOOTER = getFooter();

export default function Message() {
  const navigate = useNavigate();
  const { user, loading } = useCurrentUserWithLoading();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/let-go', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  if (loading || !user) return null;

  const isCreator = user.role === 'creator' || user.role === 'both';
  const isSupervisor = user.role === 'supervisor';
  const hasCreatorAccess = isCreator || isSupervisor;

  return (
    <>
      <div className="home-bg">
        <ParticlesCanvas />
        <FloatingShapes />
        <div className="bg-overlay" />
      </div>

      <header className={`home-header ${menuOpen ? 'menu-open' : ''}`}>
        <div className="container header-container">
          <div className="header-brand-group">
            <Link to="/home" className="logo" onClick={() => setMenuOpen(false)}>
              {FOOTER.brand}
            </Link>

            <Link
              to="/home"
              className="header-icon-btn"
              onClick={() => setMenuOpen(false)}
              aria-label={t.common.home}
            >
              <HomeIcon size={18} />
            </Link>

            <Link
              to="/community"
              className="header-icon-btn"
              onClick={() => setMenuOpen(false)}
              aria-label={t.common.community}
            >
              <Users size={18} />
            </Link>

            <Link
              to="/awards"
              className="header-icon-btn"
              onClick={() => setMenuOpen(false)}
              aria-label={t.awards.title}
            >
              <Trophy size={18} />
            </Link>
          </div>

          <button
            className={`nav-toggle ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t.nav.menu}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>

          <div className={`header-actions ${menuOpen ? 'open' : ''}`}>
            <SearchPanel />
            {hasCreatorAccess && <CreatorPanel />}
            <LiteModeToggle />
            <LanguageSwitcher />
            {!isSupervisor && <NotificationsPanel />}
            {!isSupervisor && <MessagesPanel currentPage />}
            <ProfileAvatar />
          </div>
        </div>
      </header>

      {/* Le header est fixe : ce conteneur donne à la messagerie une hauteur définie sous le header. */}
      <div className="message-page-shell">
        <MessagingShell mode="page" />
      </div>
    </>
  );
}