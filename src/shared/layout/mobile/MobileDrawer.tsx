import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Trophy, ChevronRight, LogOut, X
} from 'lucide-react';
import { useT, useI18n } from '../../../config/i18n';
import { useCurrentUser, notifyUserChange } from '../../../core/hooks/useCurrentUser';
import { logoutCurrentUser } from '../../../core/services/userService';
import SearchPanel from '../../panels/SearchPanel';
import CreatorPanel from '../../panels/CreatorPanel';
import NotificationsPanel from '../../panels/NotificationsPanel';
import MessagesPanel from '../../panels/MessagesPanel';
import LanguageSwitcher from '../../ui/LanguageSwitcher';
import LiteModeToggle from '../../ui/LiteModeToggle';
import ProfileModal from '../ProfileModal';

interface Props {
  open: boolean;
  onClose: () => void;
  hasCreatorAccess: boolean;
  isSupervisor: boolean;
}

export default function MobileDrawer({ open, onClose, hasCreatorAccess, isSupervisor }: Props) {
  const t = useT();
  const { lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleLogout = async () => {
    await logoutCurrentUser();
    onClose();
    navigate('/');
  };

  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>, closeDrawer = true) => {
    const target = e.target as HTMLElement;
    
    if (
      target.closest('.panel-anchor') || 
      target.closest('.language-switcher-menu') || 
      target.closest('.lite-toggle-panel')
    ) {
      return;
    }

    const btn = e.currentTarget.querySelector('.header-icon-btn') as HTMLButtonElement;
    if (btn) {
      btn.click();
      if (closeDrawer) {
        onClose();
      }
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className={`mobile-drawer-overlay ${open ? 'open' : ''}`} onClick={onClose}>
        <aside className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
          
          <div className="mobile-drawer-header">
            <Link to="/home" className="mobile-logo" onClick={onClose}>
              ReZ<span className="accent">Toon</span>
            </Link>
            <button type="button" className="mobile-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="mobile-drawer-content">
            <div className="mobile-menu-section">
              <span className="mobile-section-title">{t.nav.menu || 'Menu'}</span>
              <Link to="/home" className={`mobile-menu-item ${isActive('/home') ? 'active' : ''}`}>
                <Home size={18} /> <span>{t.common.home}</span>
              </Link>
              <Link to="/community" className={`mobile-menu-item ${isActive('/community') ? 'active' : ''}`}>
                <Users size={18} /> <span>{t.common.community}</span>
              </Link>
              <Link to="/awards" className={`mobile-menu-item ${isActive('/awards') ? 'active' : ''}`}>
                <Trophy size={18} /> <span>{t.awards.title}</span>
              </Link>
            </div>

            <div className="mobile-divider" />

            <div className="mobile-menu-section">
              <span className="mobile-section-title">{t.nav.tools || 'Tools'}</span>
              
              <div className="mobile-tool-row" onClick={(e) => handleRowClick(e, true)}>
                <div className="mobile-tool-trigger">
                  <SearchPanel />
                </div>
                <span>{t.common.search}</span>
                <ChevronRight size={16} className="mobile-chevron" />
              </div>

              {hasCreatorAccess && (
                <div className="mobile-tool-row" onClick={(e) => handleRowClick(e, true)}>
                  <div className="mobile-tool-trigger">
                    <CreatorPanel />
                  </div>
                  <span>{t.creator.studio}</span>
                  <ChevronRight size={16} className="mobile-chevron" />
                </div>
              )}

              {!isSupervisor && (
                <>
                  <div className="mobile-tool-row" onClick={(e) => handleRowClick(e, true)}>
                    <div className="mobile-tool-trigger">
                      <NotificationsPanel />
                    </div>
                    <span>{t.messaging.notifications}</span>
                    <ChevronRight size={16} className="mobile-chevron" />
                  </div>
                  <div className="mobile-tool-row" onClick={(e) => handleRowClick(e, true)}>
                    <div className="mobile-tool-trigger">
                      <MessagesPanel />
                    </div>
                    <span>{t.messaging.messages}</span>
                    <ChevronRight size={16} className="mobile-chevron" />
                  </div>
                </>
              )}
            </div>

            <div className="mobile-divider" />

            <div className="mobile-menu-section">
              <span className="mobile-section-title">{t.nav.settings || 'Settings'}</span>
              
              <div className="mobile-tool-row" onClick={(e) => handleRowClick(e, false)}>
                <div className="mobile-tool-trigger">
                  <LiteModeToggle />
                </div>
                <span>{t.liteMode.title}</span>
                <span className="mobile-tool-value">~{lang === 'fr' ? 'Léger' : 'Lite'}</span>
              </div>

              <div className="mobile-tool-row" onClick={(e) => handleRowClick(e, false)}>
                <div className="mobile-tool-trigger">
                  <LanguageSwitcher />
                </div>
                <span>{t.nav.language}</span>
                <span className="mobile-tool-value">{lang.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="mobile-drawer-footer">
            {user ? (
              <div className="mobile-profile-footer">
                <div 
                  className="mobile-profile-info" 
                  onClick={() => { 
                    setProfileOpen(true); 
                    onClose(); 
                  }}
                >
                  <div className="mobile-avatar">
                    {user.photo ? <img src={user.photo} alt={user.name} /> : user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="mobile-profile-text">
                    <strong>{user.name}</strong>
                    <span>@{user.username || user.email.split('@')[0]}</span>
                  </div>
                </div>
                <button type="button" className="mobile-logout-btn" onClick={handleLogout}>
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link to="/let-go" className="mobile-login-btn" onClick={onClose}>
                {t.auth.signIn}
              </Link>
            )}
          </div>
        </aside>
      </div>

      {user && (
        <ProfileModal
          isOpen={profileOpen}
          user={user}
          onClose={() => setProfileOpen(false)}
          onUserChange={() => notifyUserChange()}
        />
      )}
    </>
  );
}