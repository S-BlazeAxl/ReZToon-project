import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../config/i18n';

interface NavbarProps {
  brand: string;
  navLinks: { href: string; label: string }[];
}

export default function Navbar({ brand, navLinks }: NavbarProps) {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('hero');
  const ticking = useRef(false);

  useEffect(() => {
    const ids = navLinks.map((l) => l.href.replace('#', '')).filter(Boolean);
    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 50);

          let current = '';
          for (const id of ids) {
            const el = document.getElementById(id);
            if (!el) continue;
            const top = el.getBoundingClientRect().top + window.scrollY - 120;
            if (window.scrollY >= top) current = id;
          }
          setActive(current);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [navLinks]);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
      <div className="container nav-container">
        <Link to="/" className="logo">
          {brand}
        </Link>
        <ul className={`nav-links ${open ? 'open' : ''}`} id="navLinks">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={active === link.href.slice(1) ? 'active' : ''}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
          <li className="nav-cta">
            <Link to="/let-go" onClick={() => setOpen(false)}>
              {t.nav.letsGo}
            </Link>
          </li>
        </ul>
        <button
          type="button"
          className={`nav-toggle ${open ? 'open' : ''}`}
          id="navToggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="navLinks"
          aria-label={t.nav.menu}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}