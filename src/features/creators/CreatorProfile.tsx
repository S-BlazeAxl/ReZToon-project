import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Users, Home as HomeIcon, Trophy, ArrowLeft, MapPin, PenTool, Eye, Heart,
  ExternalLink, BookOpen, Sparkles,
} from 'lucide-react';

import ParticlesCanvas from '../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../shared/effects/FloatingShapes';
import ProfileAvatar from '../../shared/layout/ProfileAvatar';
import SearchPanel from '../../shared/panels/SearchPanel';
import CreatorPanel from '../../shared/panels/CreatorPanel';
import NotificationsPanel from '../../shared/panels/NotificationsPanel';
import MessagesPanel from '../../shared/panels/MessagesPanel';
import LanguageSwitcher from '../../shared/ui/LanguageSwitcher';
import LiteModeToggle from '../../shared/ui/LiteModeToggle';
import FollowButton from '../../shared/ui/FollowButton';
import { getIcon } from '../../shared/ui/Icon';
import MobileHeader from '../../shared/layout/mobile/MobileHeader';

import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { useIsMobile } from '../../core/hooks/useIsMobile';
import { getPublicProfile, type SuggestedCreator } from '../../core/services/creatorService';
import { getFooter } from '../../core/services/catalogueService';
import { formatNumber } from '../../core/utils/format';
import { useT } from '../../config/i18n';

import '../../styles/home-style.css';
import '../../styles/profile-style.css';
import '../../styles/panel-style.css';
import '../../styles/pwa-style.css';
import '../../styles/creator-profile-style.css';

const FOOTER = getFooter();

function isImageUrl(value?: string | null): value is string {
  return !!value && /^(https?:\/\/|data:image\/|blob:|\/)/i.test(value.trim());
}

/** N'autorise que les liens http(s) : jamais de `javascript:` issu d'un profil. */
function safeExternalUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function hueFrom(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function ProfileAvatarBig({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (isImageUrl(src) && !failed) {
    return <img src={src} alt="" onError={() => setFailed(true)} />;
  }
  return <span>{name.trim().charAt(0).toUpperCase() || '?'}</span>;
}

export default function CreatorProfile() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const p = t.creatorProfile;
  const user = useCurrentUser();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<SuggestedCreator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicProfile(id)
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch((err) => { console.error('Failed to load profile:', err); if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const isSupervisor = user?.role === 'supervisor';
  const hasCreatorAccess = user?.role === 'creator' || user?.role === 'both' || isSupervisor;
  const isOwn = Boolean(user && profile && user.id === profile.id);
  const isCreator = profile?.role === 'creator' || profile?.role === 'both';
  const portfolio = safeExternalUrl(profile?.portfolioUrl);
  const roleLabel = profile?.role === 'supervisor' ? p.roleSupervisor : isCreator ? p.roleCreator : p.roleReader;

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/home'));

  return (
    <>
      <div className="home-bg">
        <ParticlesCanvas />
        <FloatingShapes />
        <div className="bg-overlay" />
      </div>

      {isMobile ? (
        <MobileHeader hasCreatorAccess={hasCreatorAccess} isSupervisor={isSupervisor} />
      ) : (
        <header className={`home-header ${menuOpen ? 'menu-open' : ''}`}>
          <div className="container header-container">
            <div className="header-brand-group">
              <Link to="/home" className="logo" onClick={() => setMenuOpen(false)}>{FOOTER.brand}</Link>
              <Link to="/home" className="header-icon-btn" aria-label={t.common.home}><HomeIcon size={18} /></Link>
              <Link to="/community" className="header-icon-btn" aria-label={t.common.community}><Users size={18} /></Link>
              <Link to="/awards" className="header-icon-btn" aria-label={t.awards.title}><Trophy size={18} /></Link>
            </div>
            <button className={`nav-toggle ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen((v) => !v)} type="button"
              aria-label={t.nav.menu}><span /><span /><span /></button>
            <div className={`header-actions ${menuOpen ? 'open' : ''}`}>
              <SearchPanel />
              {hasCreatorAccess && <CreatorPanel />}
              <LiteModeToggle />
              <LanguageSwitcher />
              {user && !isSupervisor && <NotificationsPanel />}
              {user && !isSupervisor && <MessagesPanel />}
              <ProfileAvatar />
            </div>
          </div>
        </header>
      )}

      <main className="creator-profile-main" style={{ marginTop: isMobile ? 'var(--header-height-mobile)' : 0 }}>
        <button type="button" className="creator-profile-back" onClick={goBack}>
          <ArrowLeft size={16} /> {p.back}
        </button>

        {loading ? (
          <div className="creator-profile-state">{p.loading}</div>
        ) : !profile ? (
          <div className="creator-profile-state">
            <h1>{p.notFound}</h1>
            <p>{p.notFoundDesc}</p>
            <Link to="/home" className="creator-btn view">{p.backHome}</Link>
          </div>
        ) : (
          <>
            <section className="creator-profile-hero" style={{ '--hue': hueFrom(profile.id) } as React.CSSProperties}>
              <div className="creator-profile-banner" aria-hidden="true" />
              <div className="creator-profile-hero-body">
                <div className="creator-profile-avatar"><ProfileAvatarBig src={profile.avatar} name={profile.name} /></div>

                <div className="creator-profile-identity">
                  <div className="creator-profile-badges">
                    <span className="creator-profile-role">{roleLabel}</span>
                    {profile.country && (
                      <span className="creator-profile-country"><MapPin size={12} /> {profile.country}</span>
                    )}
                  </div>
                  <h1>{profile.name}</h1>
                  {profile.username && <span className="creator-profile-username">@{profile.username}</span>}
                </div>

                <div className="creator-profile-cta">
                  {isOwn ? (
                    <span className="creator-profile-you"><Sparkles size={13} /> {p.you}</span>
                  ) : (
                    <FollowButton targetId={profile.id} type="creator" size="lg" variant="solid"
                      labels={{ on: t.common.following, off: t.common.follow }} />
                  )}
                </div>
              </div>

              <ul className="creator-profile-stats">
                <li><PenTool size={15} /><strong>{formatNumber(profile.works.length)}</strong><span>{p.worksStat}</span></li>
                <li><Users size={15} /><strong>{formatNumber(profile.followers)}</strong><span>{p.followers}</span></li>
                <li><Eye size={15} /><strong>{formatNumber(profile.totalReads)}</strong><span>{p.reads}</span></li>
                <li><Heart size={15} /><strong>{formatNumber(profile.totalLikes)}</strong><span>{p.likes}</span></li>
              </ul>
            </section>

            <section className="creator-profile-card">
              <h2>{p.about}</h2>
              <p className={profile.bio ? '' : 'muted'}>{profile.bio || p.noBio}</p>

              <dl className="creator-profile-facts">
                {profile.penName && (<><dt>{p.penName}</dt><dd>{profile.penName}</dd></>)}
                {profile.specialization && (<><dt>{p.specialization}</dt><dd>{profile.specialization}</dd></>)}
                {portfolio && (
                  <>
                    <dt>{p.portfolio}</dt>
                    <dd>
                      <a href={portfolio} target="_blank" rel="noopener noreferrer nofollow">
                        {portfolio.replace(/^https?:\/\//, '')} <ExternalLink size={12} />
                      </a>
                    </dd>
                  </>
                )}
              </dl>

              {(profile.genres?.length ?? 0) > 0 && (
                <div className="creator-profile-genres" aria-label={p.genres}>
                  {profile.genres!.map((g) => <span key={g} className="creator-genre-chip">{g}</span>)}
                </div>
              )}
            </section>

            <section className="creator-profile-card">
              <h2>{p.works}</h2>
              {profile.works.length === 0 ? (
                <p className="muted">{p.noWorks}</p>
              ) : (
                <div className="creator-profile-works">
                  {profile.works.map((w) => {
                    const Icon = getIcon(w.cover ?? '');
                    return (
                      <Link key={w.id} to={`/manga/${w.id}`} className="creator-profile-work">
                        <div className="creator-profile-work-cover">
                          {isImageUrl(w.cover) ? <img src={w.cover} alt="" loading="lazy" /> : <Icon size={30} />}
                          {w.status && <span className={`following-card-status status-${w.status}`}>{w.status}</span>}
                        </div>
                        <strong>{w.title}</strong>
                        <span className="creator-profile-work-meta">
                          <BookOpen size={11} /> {w.genre}
                        </span>
                        <span className="creator-profile-work-meta">
                          <Eye size={11} /> {formatNumber(w.reads)} · <Heart size={11} /> {formatNumber(w.likes)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
