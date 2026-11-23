import { Link, Outlet } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useT } from '../../../config/i18n';
import CreatorMobileNav from './CreatorMobileNav';
import '../../../styles/mobile/creator-mobile.css';

export default function CreatorMobileLayout() {
  const t = useT();

  return (
    <div className="creator-mobile-shell">
      <div className="creator-mobile-header">
        <Link to="/home" className="creator-mobile-back-link">
          <ChevronLeft size={20} />
          <span className="creator-mobile-logo">
            ReZ<span className="accent">Toon</span>
          </span>
        </Link>
        <span className="creator-mobile-title">{t.creator.studio}</span>
      </div>

      <CreatorMobileNav />

      <main className="creator-mobile-main">
        <Outlet />
      </main>
    </div>
  );
}