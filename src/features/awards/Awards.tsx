import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Home as HomeIcon, Trophy, Calendar, Sparkles, Check,
  Vote as VoteIcon, Star, Eye, Heart, Crown, TrendingUp, Clock,
  Award as AwardIcon, Flame, X,
} from 'lucide-react';

import ParticlesCanvas from '../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../shared/effects/FloatingShapes';
import ProfileAvatar from '../../shared/layout/ProfileAvatar';
import SearchPanel from '../../shared/panels/SearchPanel';
import CreatorPanel from '../../shared/panels/CreatorPanel';
import LanguageSwitcher from '../../shared/ui/LanguageSwitcher';
import LiteModeToggle from '../../shared/ui/LiteModeToggle';
import { getIcon } from '../../shared/ui/Icon';

import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { useAwards } from '../../core/hooks/useAwards';
import { getFooter } from '../../core/services/catalogueService';
import { formatNumber } from '../../core/utils/format';
import type { AwardNomination } from '../../core/services/awardsService';
import { useT } from '../../config/i18n';
import { useIsMobile } from '../../core/hooks/useIsMobile';
import MobileHeader from '../../shared/layout/mobile/MobileHeader';

import '../../styles/home-style.css';
import '../../styles/profile-style.css';
import '../../styles/panel-style.css';
import '../../styles/pwa-style.css';
import '../../styles/awards-style.css';

const FOOTER = getFooter();

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function Awards() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [detail, setDetail] = useState<AwardNomination | null>(null);
  const [showPast, setShowPast] = useState(false);

  const {
    loading, edition, status, categories, activeCategory, setActiveCategory,
    leaderboard, totalVotes, trending, pastEditions, userVote, countdown, vote,
  } = useAwards();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 900) setMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || detail ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen, detail]);

  const isCreator = user?.role === 'creator' || user?.role === 'both';
  const isSupervisor = user?.role === 'supervisor';
  const hasCreatorAccess = isCreator || isSupervisor;

  const activeCatMeta = useMemo(() => categories.find((c) => c.id === activeCategory), [categories, activeCategory]);
  const podium = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const rest = useMemo(() => leaderboard.slice(3), [leaderboard]);

  const handleVote = async (nomineeId: string) => {
    if (!user) { navigate('/let-go'); return; }
    const result = await vote(nomineeId);
    setToast(result.message);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark)' }}>
        <div className="loader-ring" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
      </div>
    );
  }

  if (!edition || categories.length === 0) {
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
          <header className="home-header">
            <div className="container header-container">
              <div className="header-brand-group">
                <Link to="/home" className="logo">{FOOTER.brand}</Link>
                <div className="desktop-only-nav">
                  <Link to="/home" className="header-icon-btn"><HomeIcon size={18} /></Link>
                  <Link to="/community" className="header-icon-btn"><Users size={18} /></Link>
                  <Link to="/awards" className="header-icon-btn active"><Trophy size={18} /></Link>
                </div>
              </div>
            </div>
          </header>
        )}
        <div style={{ position: 'relative', zIndex: 2, minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 20px', marginTop: isMobile ? 'var(--header-height-mobile)' : 0 }}>
          <Trophy size={64} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: 20 }} />
          <h1 style={{ fontSize: '2rem', color: '#fff', fontWeight: 900, marginBottom: 10 }}>{t.awards.noAwardsActive}</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: 400, marginBottom: 30 }}>
            {t.awards.noAwardsDesc}
          </p>
          <Link to="/home" className="btn btn-primary">{t.awards.backHome}</Link>
        </div>
      </>
    );
  }

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
              <div className="desktop-only-nav">
                <Link to="/home" className="header-icon-btn" onClick={() => setMenuOpen(false)}><HomeIcon size={18} /></Link>
                <Link to="/community" className="header-icon-btn" onClick={() => setMenuOpen(false)}><Users size={18} /></Link>
                <Link to="/awards" className="header-icon-btn active" onClick={() => setMenuOpen(false)}><Trophy size={18} /></Link>
              </div>
            </div>
            <button className={`nav-toggle ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen((v) => !v)}><span /><span /><span /></button>
            <div className={`header-actions ${menuOpen ? 'open' : ''}`}>
              <div className="mobile-only-nav">
                <Link to="/home" className="header-icon-btn" onClick={() => setMenuOpen(false)}>
                  <HomeIcon size={18} /> <span>{t.common.home}</span>
                </Link>
                <Link to="/community" className="header-icon-btn" onClick={() => setMenuOpen(false)}>
                  <Users size={18} /> <span>{t.common.community}</span>
                </Link>
                <Link to="/awards" className="header-icon-btn active" onClick={() => setMenuOpen(false)}>
                  <Trophy size={18} /> <span>{t.awards.title}</span>
                </Link>
              </div>
              <SearchPanel />
              {hasCreatorAccess && <CreatorPanel />}
              <LiteModeToggle />
              <LanguageSwitcher />
              <ProfileAvatar />
            </div>
          </div>
        </header>
      )}

      <main className="awards-main" style={{ marginTop: isMobile ? 'var(--header-height-mobile)' : 0 }}>
        <section className="awards-hero">
          <div className="awards-hero-glow" aria-hidden="true" />
          <div className="awards-hero-noise" aria-hidden="true" />
          <div className="awards-hero-inner">
            <div className="awards-hero-left">
              <span className="awards-hero-tag">
                <Trophy size={14} /> {edition.name} {edition.year}
              </span>
              <h1 className="awards-hero-title">{edition.theme}</h1>
              <p className="awards-hero-sub">
                {edition.totalNominees} {t.awards.nominees}. {categories.length} categories.
              </p>
              <div className="awards-hero-ctas">
                <a href="#categories" className="awards-cta-primary">
                  <VoteIcon size={16} /> {t.awards.voteNow}
                </a>
                <button type="button" className="awards-cta-outline" onClick={() => setShowPast((v) => !v)}>
                  <AwardIcon size={16} /> {t.awards.pastWinners}
                </button>
              </div>
            </div>
            <div className="awards-hero-right">
              <div className="awards-countdown">
                <span className="awards-countdown-label"><Clock size={12} /> {t.awards.votingClosesIn}</span>
                {countdown.isOver ? (
                  <div className="awards-countdown-over"><Check size={18} /> {t.awards.votingClosed}</div>
                ) : (
                  <div className="awards-countdown-timer">
                    <div className="awards-countdown-unit"><strong>{pad(countdown.days)}</strong><span>{t.awards.days}</span></div>
                    <div className="awards-countdown-unit"><strong>{pad(countdown.hours)}</strong><span>{t.awards.hours}</span></div>
                    <div className="awards-countdown-unit"><strong>{pad(countdown.minutes)}</strong><span>{t.awards.min}</span></div>
                    <div className="awards-countdown-unit"><strong>{pad(countdown.seconds)}</strong><span>{t.awards.sec}</span></div>
                  </div>
                )}
              </div>
              <div className="awards-hero-stats">
                <div className="awards-hero-stat"><strong>{formatNumber(totalVotes)}</strong><span>{t.awards.totalVotes}</span></div>
                <div className="awards-hero-stat"><strong>{edition.totalNominees}</strong><span>{t.awards.nominees}</span></div>
                <div className="awards-hero-stat"><strong>{edition.ceremonyDate}</strong><span>{t.awards.ceremony}</span></div>
              </div>
              <div className={`awards-status awards-status-${status}`}>
                {status === 'open' && <><Sparkles size={12} /> {t.awards.votingOpen}</>}
                {status === 'upcoming' && <><Calendar size={12} /> {t.awards.opens} {edition.startDate.slice(0, 10)}</>}
                {status === 'closed' && <><Check size={12} /> {t.awards.votingClosed}</>}
              </div>
            </div>
          </div>
        </section>

        {trending.length > 0 && (
          <section className="awards-trending">
            <header className="awards-section-head">
              <h2><TrendingUp size={16} /> {t.awards.leading}</h2>
              <span className="awards-section-sub">{t.awards.topNominees}</span>
            </header>
            <div className="awards-trending-track">
              {trending.map((nom, i) => {
                const Icon = getIcon(nom.cover);
                const cat = categories.find((c) => c.id === nom.categoryId);
                return (
                  <button key={nom.id} type="button" className="awards-trending-card" onClick={() => { setActiveCategory(nom.categoryId); document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' }); }}>
                    <span className="awards-trending-rank">{i === 0 ? <Crown size={11} /> : `#${i + 1}`}</span>
                    <div className="awards-trending-cover" style={{ borderColor: `${cat?.color ?? '#f5b042'}60` }}><Icon size={26} /></div>
                    <div className="awards-trending-info">
                      <strong>{nom.mangaTitle}</strong>
                      <span>{cat?.label}</span>
                      <span className="awards-trending-votes">{formatNumber(nom.votes)} {t.awards.votes}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="awards-categories-nav" id="categories">
          <div className="awards-categories-scroll">
            {categories.map((cat) => {
              const Icon = getIcon(cat.icon);
              const isActive = cat.id === activeCategory;
              return (
                <button key={cat.id} type="button" className={`awards-cat-tab ${isActive ? 'active' : ''}`} style={{ borderColor: isActive ? cat.color : undefined, color: isActive ? cat.color : undefined }} onClick={() => setActiveCategory(cat.id)}>
                  <span className="awards-cat-icon" style={{ background: `${cat.color}20`, color: cat.color, borderColor: `${cat.color}60` }}><Icon size={14} /></span>
                  <span className="awards-cat-label">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {activeCatMeta && (
          <section className="awards-category-block">
            <header className="awards-cat-header" style={{ borderColor: `${activeCatMeta.color}40` }}>
              <div className="awards-cat-header-left">
                <span className="awards-cat-header-icon" style={{ background: `${activeCatMeta.color}20`, color: activeCatMeta.color, borderColor: `${activeCatMeta.color}60` }}>
                  {(() => { const Icon = getIcon(activeCatMeta.icon); return <Icon size={22} />; })()}
                </span>
                <div>
                  <h2 style={{ color: activeCatMeta.color }}>{activeCatMeta.label}</h2>
                  <p>{activeCatMeta.description}</p>
                </div>
              </div>
              <span className="awards-cat-header-count">{formatNumber(leaderboard.reduce((s, n) => s + n.votes, 0))} {t.awards.votes}</span>
            </header>

            {leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                <p>{t.awards.noNominees}</p>
              </div>
            ) : (
              <>
                <div className="awards-podium">
                  {podium.map((nom) => {
                    const Icon = getIcon(nom.cover);
                    const isMyVote = userVote === nom.id;
                    const medal = nom.rank === 1 ? 'gold' : nom.rank === 2 ? 'silver' : 'bronze';
                    return (
                      <article key={nom.id} className={`awards-podium-item rank-${medal} ${isMyVote ? 'my-vote' : ''}`} style={{ borderColor: isMyVote ? activeCatMeta.color : undefined }}>
                        <span className={`awards-podium-rank ${medal}`}>{nom.rank === 1 ? <Crown size={14} /> : `#${nom.rank}`}</span>
                        {isMyVote && <span className="awards-voted-pill" style={{ background: activeCatMeta.color }}><Check size={10} /> {t.awards.yourVote}</span>}
                        <div className="awards-podium-cover" style={{ background: `linear-gradient(145deg, ${activeCatMeta.color}20, ${activeCatMeta.color}08)`, color: activeCatMeta.color }}><Icon size={56} /></div>
                        <div className="awards-podium-body">
                          <h3>{nom.mangaTitle}</h3>
                          <span className="awards-podium-sub">{nom.mangaSubtitle}</span>
                          <div className="awards-podium-author"><span className="awards-podium-author-avatar">{nom.authorName.charAt(0)}</span><span>{nom.authorName}</span></div>
                          <div className="awards-podium-metrics">
                            <span><Star size={10} fill="currentColor" /> {nom.rating.toFixed(1)}</span>
                            <span><Eye size={10} /> {formatNumber(nom.reads)}</span>
                            <span><Heart size={10} /> {formatNumber(nom.likes)}</span>
                          </div>
                          <div className="awards-vote-bar"><div className="awards-vote-fill" style={{ width: `${nom.percent}%`, background: activeCatMeta.color }} /></div>
                          <div className="awards-podium-foot">
                            <span className="awards-podium-votes">{formatNumber(nom.votes)} {t.awards.votes} · {nom.percent.toFixed(1)}%</span>
                            <button type="button" className={`awards-vote-btn ${isMyVote ? 'voted' : ''}`} onClick={() => handleVote(nom.id)} disabled={status !== 'open' || isMyVote} style={!isMyVote && status === 'open' ? { background: activeCatMeta.color, color: '#0d0d1a' } : undefined}>
                              {isMyVote ? <Check size={12} /> : <VoteIcon size={12} />}
                              {isMyVote ? t.awards.yourVote : t.awards.voteNow}
                            </button>
                          </div>
                          <button type="button" className="awards-podium-detail" onClick={() => setDetail(nom)}>{t.awards.viewDetails}</button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="awards-rest">
                  <div className="awards-rest-head"><span>{t.awards.runnersUp}</span><span>{rest.length} {t.awards.nominees}</span></div>
                  <ul className="awards-rest-list">
                    {rest.map((nom) => {
                      const Icon = getIcon(nom.cover);
                      const isMyVote = userVote === nom.id;
                      return (
                        <li key={nom.id} className={`awards-rest-item ${isMyVote ? 'my-vote' : ''}`}>
                          <span className="awards-rest-rank">#{nom.rank}</span>
                          <div className="awards-rest-cover"><Icon size={22} /></div>
                          <div className="awards-rest-info">
                            <strong>{nom.mangaTitle}</strong>
                            <span>{nom.authorName} · {nom.genre}</span>
                            <div className="awards-vote-bar small"><div className="awards-vote-fill" style={{ width: `${nom.percent}%`, background: activeCatMeta.color }} /></div>
                          </div>
                          <div className="awards-rest-votes">{formatNumber(nom.votes)}<span>{nom.percent.toFixed(1)}%</span></div>
                          <button type="button" className={`awards-rest-vote ${isMyVote ? 'voted' : ''}`} onClick={() => handleVote(nom.id)} disabled={status !== 'open' || isMyVote}>
                            {isMyVote ? <Check size={12} /> : <VoteIcon size={12} />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </section>
        )}

        {showPast && pastEditions.length > 0 && (
          <section className="awards-past">
            <header className="awards-section-head"><h2><AwardIcon size={16} /> {t.awards.hallOfFame}</h2></header>
            {pastEditions.map((past) => (
              <div key={past.year} className="awards-past-edition">
                <div className="awards-past-header"><span className="awards-past-year">{past.year}</span><span className="awards-past-theme">"{past.theme}"</span></div>
                <ul className="awards-past-list">
                  {past.winners.map((w, i) => {
                    const cat = categories.find((c) => c.id === w.categoryId);
                    return (
                      <li key={`${past.year}-${i}`} className="awards-past-item">
                        <span className="awards-past-cat">{cat?.label ?? t.awards.award}</span>
                        <strong>{w.mangaTitle}</strong>
                        <span className="awards-past-author">{t.awards.by} {w.authorName}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        )}
      </main>

      {detail && (
        <div className="awards-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="awards-modal">
            <button type="button" className="awards-modal-close" onClick={() => setDetail(null)}><X size={16} /></button>
            {(() => {
              const Icon = getIcon(detail.cover);
              const cat = categories.find((c) => c.id === detail.categoryId);
              return (
                <>
                  <div className="awards-modal-cover" style={{ background: `linear-gradient(145deg, ${cat?.color ?? '#f5b042'}22, ${cat?.color ?? '#f5b042'}08)`, color: cat?.color ?? '#f5b042' }}>
                    <Icon size={84} />
                    <span className="awards-modal-rank">{t.awards.rank} #{detail.rank}</span>
                  </div>
                  <div className="awards-modal-body">
                    <span className="awards-modal-cat" style={{ color: cat?.color }}>{cat?.label}</span>
                    <h2>{detail.mangaTitle}</h2>
                    <p className="awards-modal-sub">{detail.mangaSubtitle}</p>
                    <div className="awards-modal-author"><span className="awards-modal-author-avatar">{detail.authorName.charAt(0)}</span><div><strong>{detail.authorName}</strong><span>{t.awards.creator}</span></div></div>
                    <div className="awards-modal-stats">
                      <div><Star size={14} fill="currentColor" /><strong>{detail.rating.toFixed(1)}</strong><span>{t.awards.rating}</span></div>
                      <div><Eye size={14} /><strong>{formatNumber(detail.reads)}</strong><span>{t.awards.reads}</span></div>
                      <div><Heart size={14} /><strong>{formatNumber(detail.likes)}</strong><span>{t.awards.likes}</span></div>
                      <div><VoteIcon size={14} /><strong>{formatNumber(detail.votes)}</strong><span>{t.awards.votes}</span></div>
                    </div>
                    <div className="awards-modal-tag"><Flame size={11} /> {detail.tag} · {detail.genre}</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {toast && <div className="awards-toast">{toast}</div>}
    </>
  );
}