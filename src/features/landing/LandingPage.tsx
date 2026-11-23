import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, PlayCircle, ArrowRight, Sparkles, Send } from 'lucide-react';
import Loader from '../../shared/ui/Loader';
import Navbar from '../../shared/layout/Navbar';
import ParticlesCanvas from '../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../shared/effects/FloatingShapes';
import ScrollTopButton from '../../shared/ui/ScrollTopButton';
import GenreModal from '../../shared/ui/GenreModal';
import FadeUp from '../../shared/effects/FadeUp';
import { getIcon } from '../../shared/ui/Icon';
import { submitContactMessage } from '../../core/services/feedbackService';
import { 
    getLandingConfig, 
    getRealPlatformStats 
} from '../../core/services/configService';
import { useGenres } from '../../core/hooks/useGenres';
import type { ModalData, LandingData, StatItem, CatalogueCardData, GenreDescription } from '../../config/types';
import { useT } from '../../config/i18n';

function StatCounter({ target, label, visible }: { target: number; label: string; visible: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let current = 0;
    const increment = Math.ceil(target / 80) || 1;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setValue(target); clearInterval(timer); }
      else { setValue(current); }
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target]);

  return (
    <div className="stat-item">
      <span className="stat-number">{value.toLocaleString()}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default function LandingPage() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [loaderHidden, setLoaderHidden] = useState(false);
  const [landing, setLanding] = useState<LandingData | null>(null);
  // Les genres viennent de la table `genres` (gérée par le supervisor).
  const { genres: liveGenres, describe } = useGenres();
  const defaultGenreDesc = t.landing.genreDefaultDesc;
  const catalogue = useMemo<CatalogueCardData[]>(
    () => liveGenres.map((g) => ({
      genre: g.name,
      tag: ({
        mankia: t.landing.genreTagMankia,
        yorman: t.landing.genreTagYorman,
        lovers: t.landing.genreTagLovers,
        mountete: t.landing.genreTagMountete,
        mandrea: t.landing.genreTagMandrea,
        contes: t.landing.genreTagContes,
      } as Record<string, string>)[g.id] || g.tag || g.equivalent,
    })),
    [liveGenres, t.landing],
  );
  const genres = useMemo<Record<string, GenreDescription>>(
    () => Object.fromEntries(
      liveGenres.map((g) => [g.name, { title: g.name.toUpperCase(), desc: describe(g.name) }]),
    ),
    [liveGenres, describe],
  );
  const [stats, setStats] = useState<StatItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<ModalData>({ title: '', description: '' });
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const activeGenre = catalogue.some((c) => c.genre === selectedGenre) ? selectedGenre : (catalogue[0]?.genre ?? '');
  const setActiveGenre = setSelectedGenre;
  const [contactStatus, setContactStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const heroStatsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [l, s] = await Promise.all([
          getLandingConfig(), 
          getRealPlatformStats(),
        ]);
        if (!cancelled) {
          setLanding(l);
          setStats(s);
        }
      } catch (err) {
        console.error("Failed to load landing config:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTimeout(() => setLoaderHidden(true), 600);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const hero = document.querySelector<HTMLElement>('.hero');
        if (hero) hero.style.backgroundPositionY = window.pageYOffset * 0.3 + 'px';
      });
    };
    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const el = heroStatsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStatsVisible(true); observer.disconnect(); }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    if (!contactStatus) return;
    const timer = setTimeout(() => setContactStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [contactStatus]);

  const openGenre = (genre: string) => {
    const data = genres[genre] || { title: genre.toUpperCase(), desc: defaultGenreDesc };
    setModalData({ title: data.title, description: data.desc });
    setModalOpen(true);
  };

  const handleContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const form = e.currentTarget;
    const name = (form.querySelector<HTMLInputElement>('input[name="name"]')?.value ?? '').trim();
    const email = (form.querySelector<HTMLInputElement>('input[name="email"]')?.value ?? '').trim();
    const subject = (form.querySelector<HTMLInputElement>('input[name="subject"]')?.value ?? '').trim();
    const message = (form.querySelector<HTMLTextAreaElement>('textarea[name="message"]')?.value ?? '').trim();

    if (!name || !email || !subject || !message) {
      setContactStatus({ type: 'error', text: t.landing.errFillFields }); return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setContactStatus({ type: 'error', text: t.landing.errEmailInvalid }); return;
    }

    setSubmitting(true);
    try {
      await submitContactMessage({ name, email, subject, message });
      // Les superviseurs sont notifiés par un trigger SQL sur contact_messages.
      setContactStatus({ type: 'success', text: t.landing.msgSuccess.replace('{{name}}', name) });
      form.reset();
    } catch (err) {
      setContactStatus({ type: 'error', text: t.landing.errSendFailed });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <><Loader hidden={false} /><div style={{ minHeight: '100vh', background: 'var(--dark)' }} /></>;
  }

  if (!landing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--dark)', color: '#fff' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{t.landing.configError}</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>{t.landing.configErrorDesc}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ marginTop: '2rem' }}>{t.landing.reload}</button>
      </div>
    );
  }

  const activeGenreData = activeGenre ? (genres[activeGenre] || { title: activeGenre, desc: defaultGenreDesc }) : null;
  const activeGenreMeta = catalogue.find((c) => c.genre === activeGenre);

  return (
    <>
      <Loader hidden={loaderHidden} />
      <Navbar brand={landing.brand} navLinks={landing.nav} />
      <section className="parallax hero" id="hero">
        <div className="overlay" />
        <ParticlesCanvas />
        <FloatingShapes />
        <div className="content hero-content">
          <span className="badge">{landing.hero.badge}</span>
          <h3 className="hero-title">
            {landing.hero.titleLineOne}<br />
            <span className="highlight">{landing.hero.titleHighlight}</span>
          </h3>
          <p className="hero-sub">{landing.hero.subtitle}</p>
          <div className="hero-actions">
            <a href="#catalogue" className="btn btn-primary btn-glow" id="exploreBtn">
              <Compass size={18} /> {landing.hero.primaryCta}
              <span className="btn-glow-ring" />
            </a>
            <a href="#about" className="btn btn-outline">
              <PlayCircle size={18} /> {landing.hero.secondaryCta}
            </a>
          </div>
          <div className="hero-stats" ref={heroStatsRef}>
            {stats.map((s) => <StatCounter key={s.label} target={s.target} label={s.label} visible={statsVisible} />)}
          </div>
        </div>
        <div className="scroll-indicator"><span /><span /><span /></div>
      </section>

      <section className="section about" id="about">
        <div className="container about-container">
          <div className="about-grid">
            <FadeUp className="about-content">
              <span className="section-tag">{landing.about.tag}</span>
              <h2>{landing.about.title}</h2>
              {landing.about.paragraphs.map((p: string, i: number) => <p key={i}>{p}</p>)}
              <div className="about-features">
                {landing.about.features.map((f: { icon: string; label: string }) => {
                  const IconCmp = getIcon(f.icon);
                  return <div key={f.label} className="about-feature"><IconCmp size={18} /><span>{f.label}</span></div>;
                })}
              </div>
            </FadeUp>
            <div className="about-visual">
              <div className="about-orb">
                <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
                <img src="/Images/4.png" alt="ReZToon illustration" className="orb-image animate-float" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section catalogue" id="catalogue">
        <div className="container about-container">
          <div className="genres-grid">
            <FadeUp className="genres-content">
              <span className="section-tag">{t.landing.catalogueTag}</span>
              <h2>{t.landing.catalogueTitle}</h2>
              <p className="genres-intro">{t.landing.catalogueSubtitle}</p>
              <div className="genres-list" role="tablist" aria-label="African manga genres">
                {catalogue.map((c: CatalogueCardData, i: number) => {
                  const isActive = activeGenre === c.genre;
                  return (
                    <button key={c.genre} type="button" role="tab" aria-selected={isActive}
                      className={`genre-item ${isActive ? 'active' : ''}`} onClick={() => setActiveGenre(c.genre)}>
                      <span className="genre-item-index">{String(i + 1).padStart(2, '0')}</span>
                      <span className="genre-item-body"><strong>{c.genre}</strong><span>{c.tag}</span></span>
                      <ArrowRight size={16} className="genre-item-arrow" />
                    </button>
                  );
                })}
              </div>
              <div className="genres-hint"><Sparkles size={14} /><span>{t.landing.selectUniverse}</span></div>
            </FadeUp>

            <FadeUp className="genres-visual">
              <div className="genre-display">
                <div className="genre-display-glow" />
                <div className="genre-display-head">
                  <span className="genre-display-tag">{activeGenreMeta?.tag ?? 'Genre'}</span>
                  <span className="genre-display-count">
                    {String(catalogue.findIndex((c: CatalogueCardData) => c.genre === activeGenre) + 1).padStart(2, '0')}
                    <em>/</em>
                    {String(catalogue.length).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="genre-display-title">{activeGenreData?.title ?? activeGenre}</h3>
                <p className="genre-display-desc">{activeGenreData?.desc ?? defaultGenreDesc}</p>
                <button type="button" className="btn btn-primary genre-display-cta" onClick={() => openGenre(activeGenre)}>
                  <Compass size={16} /> {t.landing.explore} {activeGenre}<span className="btn-glow-ring" />
                </button>
                <div className="genre-display-orbs" aria-hidden="true">
                  <span className="genre-orb genre-orb-1" /><span className="genre-orb genre-orb-2" /><span className="genre-orb genre-orb-3" />
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      <section className="section newsletter" id="newsletter">
        <div className="container">
          <div className="newsletter-card glass">
            <FadeUp className="newsletter-content">
              <span className="section-tag">{t.landing.contactTag}</span>
              <h2>{t.landing.contactTitle}</h2>
              <p>{t.landing.contactSubtitle}</p>
              {contactStatus && <div className={`form-message ${contactStatus.type}`} role="alert">{contactStatus.text}</div>}
              <form className="newsletter-form" id="newsletterForm" onSubmit={handleContact}>
                <div className="newsletter-row">
                  <div className="form-group"><input type="text" name="name" placeholder={t.landing.fullName} autoComplete="name" required disabled={submitting} /></div>
                  <div className="form-group"><input type="email" name="email" placeholder={t.landing.emailAddress} autoComplete="email" required disabled={submitting} /></div>
                </div>
                <div className="form-group"><input type="text" name="subject" placeholder={t.landing.subject} maxLength={120} required disabled={submitting} /></div>
                <div className="form-group"><textarea name="message" placeholder={t.landing.yourMessage} rows={6} maxLength={800} required disabled={submitting} /></div>
                <button type="submit" className="btn btn-primary newsletter-submit" disabled={submitting}>
                  {submitting ? t.landing.sending : t.landing.sendMessage} <Send size={16} />
                </button>
              </form>
            </FadeUp>
            <FadeUp className="newsletter-illustration">
              <img src="/Images/5.png" alt="ReZComics illustration" className="orb-image-1 animate-float" />
            </FadeUp>
          </div>
        </div>
      </section>

      <GenreModal isOpen={modalOpen} data={modalData} onClose={() => setModalOpen(false)} />
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="logo">{landing.brand}</Link>
              <p>{landing.hero.subtitle}</p>
            </div>
            <div className="footer-links">
              <h4>{t.landing.navigation}</h4>
              <ul>{landing.nav.map((n: { href: string; label: string }) => <li key={n.href}><a href={n.href}>{n.label}</a></li>)}</ul>
            </div>
          </div>
          <div className="footer-bottom"><p>{landing.copyright}</p></div>
        </div>
      </footer>
      <ScrollTopButton />
    </>
  );
}