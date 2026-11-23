import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, Sparkles, Shield, Flag, Calendar, 
  Heart, MessageCircle, Crown, AlertTriangle, Search, Mail, Globe, Bell,
  Brush, Activity, ArrowRight, Zap, UserCheck, Palette,
} from 'lucide-react';

import ParticlesCanvas from '../../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../../shared/effects/FloatingShapes';
import { useCurrentUserWithLoading } from '../../../core/hooks/useCurrentUser';
import { getUsers } from '../../../core/services/userService';
import type { User, UserRole } from '../../../core/services/userService';
import { getReports } from '../../../core/services/reportService';
import type { Report } from '../../../core/services/reportService';
import { getCommunityPosts } from '../../../core/services/communityService';
import type { CommunityPost } from '../../../core/services/communityService';
import { getAllSeries } from '../../../core/services/contentService';
import type { Series } from '../../../core/services/contentService';
import { getAllMangas } from '../../../core/services/mangaService';
import type { Manga } from '../../../core/services/mangaService';
import { getEvents } from '../../../core/services/eventService';
import type { CommunityEvent } from '../../../core/services/eventService';

import { SupervisorHeader, SupervisorToast } from '../components';
import SupervisorAnalyticsDashboard from '../components/SupervisorAnalyticsDashboard';
import { useT } from '../../../config/i18n';
import { useGenres } from '../../../core/hooks/useGenres';

import '../../../styles/home-style.css';
import '../../../styles/profile-style.css';
import '../../../styles/panel-style.css';
import '../../../styles/supervisor-style.css';
import '../../../styles/supervisor-dashboard-style.css';

interface RoleMeta {
  id: UserRole;
  icon: typeof BookOpen;
  simpleLabelKey: string;
  techLabelKey: string;
  color: string;
  bg: string;
}

const ROLES: RoleMeta[] = [
  { id: 'reader', icon: BookOpen, simpleLabelKey: 'peopleOnPlatform', techLabelKey: 'roleReader', color: '#f5b042', bg: 'rgba(245, 176, 66, 0.12)' },
  { id: 'creator', icon: Brush, simpleLabelKey: 'mangaStories', techLabelKey: 'roleCreator', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)' },
  { id: 'both', icon: Sparkles, simpleLabelKey: 'roleBoth', techLabelKey: 'roleBoth', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' },
  { id: 'supervisor', icon: Crown, simpleLabelKey: 'helpers', techLabelKey: 'roleSupervisor', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
];

function roleMeta(role?: UserRole): RoleMeta {
  return ROLES.find((r) => r.id === role) ?? ROLES[0];
}

export default function SupervisorHome() {
  const { user, loading: authLoading } = useCurrentUserWithLoading();
  const navigate = useNavigate();
  const t = useT();
  const { genres: allGenres } = useGenres({ includeInactive: true });

  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/let-go', { replace: true });
    } else if (user.role !== 'supervisor') {
      navigate('/home', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user?.role !== 'supervisor') return;
    let cancelled = false;
    
    (async () => {
      setLoading(true);
      try {
        const [u, r, p, m, s, e] = await Promise.all([
          getUsers(), 
          getReports(), 
          getCommunityPosts(), 
          getAllMangas(), 
          getAllSeries(), 
          getEvents(),
        ]);
        if (!cancelled) {
          setUsers(u); 
          setReports(r); 
          setPosts(p); 
          setMangas(m); 
          setSeries(s); 
          setEvents(e);
        }
      } catch (err) {
        console.error('Failed to load supervisor data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(() => {
    const total = users.length;
    const readers = users.filter((u) => (u.role ?? 'reader') === 'reader').length;
    const creators = users.filter((u) => u.role === 'creator').length;
    const both = users.filter((u) => u.role === 'both').length;
    const supervisors = users.filter((u) => u.role === 'supervisor').length;
    const moderators = users.filter((u) => (u.permissions ?? []).includes('moderate_content')).length;
    const userManagers = users.filter((u) => (u.permissions ?? []).includes('manage_users')).length;
    const openReports = reports.filter((r) => r.status === 'open').length;
    const highPriority = reports.filter((r) => r.severity === 'high' && r.status === 'open').length;
    const totalLikes = posts.reduce((s, p) => s + (p.likes?.length ?? 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments?.length ?? 0), 0);

    return {
      total, readers, creators, both, supervisors, moderators, userManagers,
      openReports, highPriority, posts: posts.length, mangas: mangas.length, series: series.length,
      events: events.length, totalLikes, totalComments,
    };
  }, [users, reports, posts, mangas, series, events]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && (u.role ?? 'reader') !== roleFilter) return false;
      if (q) {
        const hay = [u.name, u.email, u.username ?? '', u.country ?? ''].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter]);

  const roleCounts = useMemo<Record<UserRole, number>>(
    () => ({ reader: stats.readers, creator: stats.creators, both: stats.both, supervisor: stats.supervisors }),
    [stats],
  );

  const getTechLabel = (key: string) => {
    return (t.common as any)[key] || (t.supervisor as any)[key] || key;
  };

  const getSimpleLabel = (key: string) => {
    return (t.supervisor as any)[key] || key;
  };

  if (authLoading || !user || user.role !== 'supervisor') return null;

  return (
    <>
      <div className="home-bg">
        <ParticlesCanvas />
        <FloatingShapes />
        <div className="bg-overlay" />
      </div>

      <SupervisorHeader active="home" />

      <main className="supervisor-home">
        <section className="sup-hero">
          <div className="sup-hero-bg" aria-hidden />
          <div className="sup-hero-inner">
            <div className="sup-hero-left">
              <span className="sup-hero-badge"><Shield size={14} /> {t.supervisor.console}</span>
              <h1 className="sup-hero-title">{t.supervisor.hello} <span className="sup-hero-name">{user.name}</span>!</h1>
              <p className="sup-hero-sub">{t.supervisor.hereIsEverything}</p>
              <div className="sup-hero-actions">
                <Link to="/supervisor/users" className="sup-hero-btn primary"><Users size={16} /> {t.supervisor.seeAllUsers}</Link>
                <Link to="/supervisor/reports" className="sup-hero-btn outline"><Flag size={16} /> {t.supervisor.seeReports}</Link>
              </div>
            </div>

            <div className="sup-hero-right">
              <div className="sup-hero-big">
                <div className="sup-hero-big-icon"><Users size={36} strokeWidth={2.2} /></div>
                <strong className="sup-hero-big-value">{loading ? '...' : stats.total}</strong>
                <span className="sup-hero-big-label">{t.supervisor.peopleOnPlatform}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="sup-block">
          <SupervisorAnalyticsDashboard />
        </section>

        <section className="sup-block">
          <header className="sup-block-head">
            <h2 className="sup-block-title"><span className="sup-block-icon-wrap"><Users size={22} /></span>{t.supervisor.whoIsOn}</h2>
            <p className="sup-block-sub">{t.supervisor.fourKinds}</p>
          </header>

          <div className="sup-roles-grid">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const count = roleCounts[role.id];
              const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <button key={role.id} type="button" className="sup-role-card" style={{ background: role.bg, borderColor: `${role.color}55` }} onClick={() => { setRoleFilter(role.id); setSearch(''); }}>
                  <div className="sup-role-icon-frame" style={{ background: `${role.color}22`, borderColor: `${role.color}55`, color: role.color }}><Icon size={26} strokeWidth={2.2} /></div>
                  <div className="sup-role-info">
                    <span className="sup-role-simple" style={{ color: role.color }}>{getSimpleLabel(role.simpleLabelKey)}</span>
                    <span className="sup-role-tech">{getTechLabel(role.techLabelKey)}</span>
                  </div>
                  <div className="sup-role-right">
                    <strong className="sup-role-count">{count}</strong>
                    <span className="sup-role-percent">{percent.toFixed(0)}%</span>
                  </div>
                  <span className="sup-role-bar" style={{ background: `linear-gradient(90deg, ${role.color}, ${role.color}66)`, width: `${Math.max(percent, 3)}%` }} aria-hidden />
                  <Icon size={54} className="sup-role-bg-icon" style={{ color: role.color }} aria-hidden />
                </button>
              );
            })}
          </div>
        </section>

        <section className="sup-block">
          <header className="sup-block-head">
            <h2 className="sup-block-title"><span className="sup-block-icon-wrap"><Activity size={22} /></span>{t.supervisor.whatsHappening}</h2>
            <p className="sup-block-sub">{t.supervisor.numbersUnderstand}</p>
          </header>

          <div className="sup-pulse-grid">
            <PulseCard icon={BookOpen} color="#f5b042" label={t.supervisor.mangaStories} value={stats.mangas} sub={`${stats.series} ${t.common.series}`} />
            <PulseCard icon={MessageCircle} color="#4ade80" label={t.supervisor.messagesCommunity} value={stats.posts} sub={`${stats.totalComments} ${t.common.comments}`} />
            <PulseCard icon={Heart} color="#f472b6" label={t.supervisor.likesGiven} value={stats.totalLikes} sub={t.rightRail.communityStars} />
            <PulseCard icon={Calendar} color="#a78bfa" label={t.supervisor.eventsPlanned} value={stats.events} sub={t.supervisor.festivalsMeetups} />
            <PulseCard icon={Flag} color="#22d3ee" label={t.supervisor.reportsToFix} value={stats.openReports} sub={stats.highPriority > 0 ? `${stats.highPriority} ${t.supervisor.requiresImmediate}` : t.supervisor.allClear} alert={stats.highPriority > 0} />
            <PulseCard icon={Shield} color="#60a5fa" label={t.supervisor.helpers} value={stats.supervisors + stats.moderators + stats.userManagers} sub={`${stats.supervisors} ${t.common.roleSupervisor}`} />
          </div>
        </section>

        {stats.highPriority > 0 && (
          <section className="sup-alert">
            <div className="sup-alert-icon"><AlertTriangle size={26} /></div>
            <div className="sup-alert-body">
              <strong>{stats.highPriority} {t.supervisor.urgentReports}</strong>
              <span>{t.supervisor.someoneDoingWrong}</span>
            </div>
            <Link to="/supervisor/reports" className="sup-alert-btn">{t.supervisor.fixNow} <ArrowRight size={15} /></Link>
          </section>
        )}

        <section className="sup-block">
          <header className="sup-block-head">
            <h2 className="sup-block-title"><span className="sup-block-icon-wrap"><UserCheck size={22} /></span>{t.supervisor.everyoneOn} ({filteredUsers.length})</h2>
            <p className="sup-block-sub">{t.supervisor.eachPersonBadge}</p>
          </header>

          <div className="sup-search-row">
            <div className="sup-search">
              <Search size={16} />
              <input type="text" placeholder={t.supervisor.findSomeone} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="sup-filter-row">
              <button type="button" className={`sup-filter-chip ${roleFilter === 'all' ? 'active' : ''}`} onClick={() => setRoleFilter('all')}>
                <Users size={13} /><span>{t.communityFeed.feedFilters.all} ({users.length})</span>
              </button>
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = roleFilter === r.id;
                return (
                  <button key={r.id} type="button" className={`sup-filter-chip ${active ? 'active' : ''}`} style={active ? { background: r.color, borderColor: r.color, color: '#0d0d1a' } : undefined} onClick={() => setRoleFilter(r.id)}>
                    <Icon size={13} /><span>{getTechLabel(r.techLabelKey)} ({roleCounts[r.id]})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="sup-empty"><Users size={32} /><p>{t.supervisor.loadingUsers}</p></div>
          ) : filteredUsers.length === 0 ? (
            <div className="sup-empty"><Users size={32} /><p>{t.supervisor.noMatchSearch}</p><span>{t.supervisor.tryAnotherName}</span></div>
          ) : (
            <ul className="sup-user-list">
              {filteredUsers.slice(0, 5).map((u) => {
                const meta = roleMeta(u.role);
                const RoleIcon = meta.icon;
                const initials = (u.name || '?').charAt(0).toUpperCase();
                
                return (
                  <li key={u.id} className="sup-user-row" style={{ borderLeftColor: meta.color }}>
                    <div className="sup-user-avatar" style={{ background: meta.color }}>{initials}</div>
                    <div className="sup-user-info">
                      <div className="sup-user-name-row">
                        <strong className="sup-user-name">{u.name}</strong>
                        <span className="sup-user-role-badge" style={{ background: `${meta.color}22`, borderColor: `${meta.color}66`, color: meta.color }}><RoleIcon size={12} />{getTechLabel(meta.techLabelKey)}</span>
                      </div>
                      <div className="sup-user-contact">
                        <Mail size={11} /><span>{u.email}</span>
                        {u.username && (<><span className="dot">·</span><span>@{u.username}</span></>)}
                        {u.country && (<><span className="dot">·</span><Globe size={11} /><span>{u.country}</span></>)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="sup-list-foot">
            <span>{t.supervisor.showing} <strong>{Math.min(filteredUsers.length, 5)}</strong> {t.supervisor.of} <strong>{users.length}</strong> {t.supervisor.people}</span>
            <Link to="/supervisor/users" className="sup-list-more">{t.supervisor.fullManagement} <ArrowRight size={13} /></Link>
          </div>
        </section>

        <section className="sup-block">
          <header className="sup-block-head">
            <h2 className="sup-block-title"><span className="sup-block-icon-wrap"><Zap size={22} /></span>{t.supervisor.thingsYouCanDo}</h2>
          </header>

          <div className="sup-quick-grid">
            <Link to="/supervisor/users" className="sup-quick-card">
              <div className="sup-quick-icon"><Users size={22} /></div>
              <div className="sup-quick-info"><strong>{t.supervisor.managePeople}</strong><span>{users.length} {t.supervisor.accountsCount} · {stats.supervisors} {t.supervisor.bossesCount}</span></div>
              <ArrowRight size={16} className="sup-quick-arrow" />
            </Link>

            <Link to="/supervisor/reports" className="sup-quick-card">
              <div className="sup-quick-icon"><Flag size={22} /></div>
              <div className="sup-quick-info"><strong>{t.supervisor.seeReports}</strong><span>{stats.openReports} {t.supervisor.openCount} · {stats.highPriority} {t.supervisor.urgentCount}</span></div>
              <ArrowRight size={16} className="sup-quick-arrow" />
            </Link>

            <Link to="/supervisor/events" className="sup-quick-card">
              <div className="sup-quick-icon"><Calendar size={22} /></div>
              <div className="sup-quick-info"><strong>{t.supervisor.makeEvents}</strong><span>{stats.events} {t.supervisor.alreadyPlanned}</span></div>
              <ArrowRight size={16} className="sup-quick-arrow" />
            </Link>

            <Link to="/supervisor/genres" className="sup-quick-card">
              <div className="sup-quick-icon"><Palette size={22} /></div>
              <div className="sup-quick-info"><strong>{t.genresAdmin.homeCardTitle}</strong><span>{t.genresAdmin.homeCardSub.replace('{{n}}', String(allGenres.length))}</span></div>
              <ArrowRight size={16} className="sup-quick-arrow" />
            </Link>

            <Link to="/supervisor/search" className="sup-quick-card">
              <div className="sup-quick-icon"><Search size={22} /></div>
              <div className="sup-quick-info"><strong>{t.supervisor.searchEverything}</strong><span>{t.supervisor.mangaUsersReports}</span></div>
              <ArrowRight size={16} className="sup-quick-arrow" />
            </Link>

            <Link to="/supervisor/notifications" className="sup-quick-card">
              <div className="sup-quick-icon"><Bell size={22} /></div>
              <div className="sup-quick-info"><strong>{t.messaging.notifications}</strong><span>{t.supervisor.whatsNew}</span></div>
              <ArrowRight size={16} className="sup-quick-arrow" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="container footer-container">
          <div className="footer-bottom"><p className="copyright">{t.supervisor.copyright}</p></div>
        </div>
      </footer>

      {toast && <SupervisorToast message={toast} />}
    </>
  );
}

interface PulseCardProps {
  icon: typeof BookOpen;
  color: string;
  label: string;
  value: number;
  sub: string;
  alert?: boolean;
}

function PulseCard({ icon: Icon, color, label, value, sub, alert }: PulseCardProps) {
  return (
    <div className={`sup-pulse-card ${alert ? 'alert' : ''}`} style={{ '--pulse-color': color } as React.CSSProperties}>
      <div className="sup-pulse-icon" style={{ background: `${color}18`, borderColor: `${color}44`, color }}><Icon size={22} strokeWidth={2.2} /></div>
      <div className="sup-pulse-body">
        <span className="sup-pulse-value" style={{ color }}>{value.toLocaleString()}</span>
        <span className="sup-pulse-label">{label}</span>
        <span className="sup-pulse-sub">{sub}</span>
      </div>
    </div>
  );
}