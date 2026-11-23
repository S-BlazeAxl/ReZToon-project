import { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import MobileDrawer from './MobileDrawer';
import { useT } from '../../../config/i18n';

interface Props {
  hasCreatorAccess?: boolean;
  isSupervisor?: boolean;
}

export default function MobileHeader({ hasCreatorAccess = false, isSupervisor = false }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useT();
  const location = useLocation();

  const handleClose = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    handleClose();
  }, [location.pathname, handleClose]);

  return (
    <>
      <header className="mobile-header">
        <div className="mobile-header-inner">
          <Link to="/home" className="mobile-logo">
            ReZ<span className="accent">Toon</span>
          </Link>
          <button
            type="button"
            className={`mobile-menu-btn ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(true)}
            aria-label={t.nav.menu}
          >
            <Menu size={26} />
          </button>
        </div>
      </header>

      <MobileDrawer
        open={menuOpen}
        onClose={handleClose}
        hasCreatorAccess={hasCreatorAccess}
        isSupervisor={isSupervisor}
      />
    </>
  );
}