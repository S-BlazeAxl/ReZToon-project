import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Home as HomeIcon, Radio, Trophy, Sparkles } from 'lucide-react';
import ParticlesCanvas from '../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../shared/effects/FloatingShapes';
import ProfileAvatar from '../../shared/layout/ProfileAvatar';
import SearchPanel from '../../shared/panels/SearchPanel';
import CreatorPanel from '../../shared/panels/CreatorPanel';
import NotificationsPanel from '../../shared/panels/NotificationsPanel';
import MessagesPanel from '../../shared/panels/MessagesPanel';
import LanguageSwitcher from '../../shared/ui/LanguageSwitcher';
import LiteModeToggle from '../../shared/ui/LiteModeToggle';
import CommunityLeftRail from './CommunityLeftRail';
import CommunityRightRail from './CommunityRightRail';
import CommunityComposer from './CommunityComposer';
import CommunityPost from './CommunityPost';
import UserProfileModal from './UserProfileModal';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { useIsMobile } from '../../core/hooks/useIsMobile';
import MobileHeader from '../../shared/layout/mobile/MobileHeader';
import {
  getCommunityPosts,
  getCommunityMeta,
  getRankings,
  getUserStats,
  getCommunityUserProfile,
  RANKING_PERIODS,
} from '../../core/services/communityService';
import type {
  CommunityPost as Post,
  RankingPeriod,
  RankingCategory,
  CommunityUserProfile,
  CommunityMeta,
  AuthorRanking,
} from '../../core/services/communityService';
import { getUsersByIds, type User } from '../../core/services/userService';
import { getFooter } from '../../core/services/catalogueService';
import { useGenres } from '../../core/hooks/useGenres';
import { useT } from '../../config/i18n';
import '../../styles/home-style.css';
import '../../styles/profile-style.css';
import '../../styles/panel-style.css';
import '../../styles/community-style.css';
import '../../styles/pwa-style.css';
import '../../styles/follow-style.css';

const FOOTER = getFooter();

type AuthorFilter = 'all' | 'mine';

export default function Community() {
  const isMobile = useIsMobile();
  const user = useCurrentUser();
  const t = useT();
  const { names: genreNames } = useGenres();
  const [tab, setTab] = useState<'feed' | 'rankings'>('feed');
  const [feedFilter, setFeedFilter] = useState<'all' | Post['type']>('all');
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [openProfile, setOpenProfile] = useState<CommunityUserProfile | null>(null);

  const [period, setPeriod] = useState<RankingPeriod>('week');
  const [category, setCategory] = useState<RankingCategory>('all');

  const [posts, setPosts] = useState<Post[]>([]);
  const [meta, setMeta] = useState<CommunityMeta>({
    groups: [], events: [], trending: [], suggestedCreators: [],
  });
  const [stats, setStats] = useState({ posts: 0, likes: 0 });
  const [topAuthors, setTopAuthors] = useState<AuthorRanking[]>([]);
  const [rankings, setRankings] = useState<AuthorRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});

  const FEED_FILTERS: { id: 'all' | Post['type']; label: string }[] = [
    { id: 'all', label: t.communityFeed.feedFilters.all },
    { id: 'release', label: t.communityFeed.feedFilters.release },
    { id: 'publication', label: t.communityFeed.feedFilters.publication },
    { id: 'poster', label: t.communityFeed.feedFilters.poster },
    { id: 'poll', label: t.communityFeed.feedFilters.poll },
  ];

  useEffect(() => {
    document.body.style.overflow = openProfile ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [openProfile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await getCommunityPosts();
        if (cancelled) return;
        setPosts(p);

        const [m, s, ta] = await Promise.all([
          getCommunityMeta(p),
          user ? getUserStats(user.id, p) : Promise.resolve({ posts: 0, likes: 0 }),
          getRankings('week', 'all', p),
        ]);

        if (cancelled) return;
        setMeta(m);
        setStats(s);
        setTopAuthors(ta.slice(0, 5));

        const authorIds = new Set<string>();
        p.forEach(post => authorIds.add(post.authorId));
        p.forEach(post => post.comments.forEach(c => authorIds.add(c.authorId)));

        if (authorIds.size > 0) {
          const allUsers = await getUsersByIds(Array.from(authorIds));
          if (!cancelled) {
            const map: Record<string, User> = {};
            allUsers.forEach((u) => { map[u.id] = u; });
            setUsersMap(map);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, refreshKey]);

  useEffect(() => {
    if (tab !== 'rankings') return;
    let cancelled = false;
    setRankingsLoading(true);
    (async () => {
      const r = await getRankings(period, category, posts);
      if (!cancelled) {
        setRankings(r);
        setRankingsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, period, category, refreshKey, posts]);

  const isCreator = user?.role === 'creator' || user?.role === 'both';
  const isSupervisor = user?.role === 'supervisor';
  const hasCreatorAccess = isCreator || isSupervisor;

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (feedFilter !== 'all') list = list.filter((p) => p.type === feedFilter);
    if (authorFilter === 'mine' && user) list = list.filter((p) => p.authorId === user.id);
    return list;
  }, [posts, feedFilter, authorFilter, user]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleOpenProfile = async (authorId: string, authorName: string) => {
    const profile = await getCommunityUserProfile(authorId, authorName, posts, usersMap);
    setOpenProfile(profile);
  };

  const handleOpenPost = (postId: string) => {
    setTab('feed');
    setAuthorFilter('all');
    setFeedFilter('all');
    window.setTimeout(() => {
      const el = document.querySelector(`[data-post-id="${postId}"]`);
      if (el && 'scrollIntoView' in el) {
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

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
              <Link to="/home" className="logo">
                {FOOTER.brand}
              </Link>
              <nav className="desktop-only-nav" aria-label="Navigation">
                <Link to="/home" className="header-icon-btn" aria-label={t.common.home}>
                  <HomeIcon size={18} />
                </Link>
                <Link to="/community" className="header-icon-btn active" aria-label={t.common.community} aria-current="page">
                  <Users size={18} />
                </Link>
                <Link to="/awards" className="header-icon-btn" aria-label={t.awards.title}>
                  <Trophy size={18} />
                </Link>
              </nav>
            </div>
            <div className="header-actions">
              <SearchPanel />
              {hasCreatorAccess && <CreatorPanel />}
              <LiteModeToggle />
              <LanguageSwitcher />
              {!isSupervisor && <NotificationsPanel />}
              {!isSupervisor && <MessagesPanel />}
              <ProfileAvatar />
            </div>
          </div>
        </header>
      )}

      <main className="community-layout" style={{ marginTop: isMobile ? 'var(--header-height-mobile)' : 0 }}>
        <CommunityLeftRail
          user={user}
          activeTab={tab}
          onTabChange={setTab}
          postCount={stats.posts}
          likeCount={stats.likes}
          groups={meta.groups}
        />

        <section className="community-center">
          {loading ? (
            <div className="community-empty">
              <Sparkles size={28} className="spin" />
              <p>{t.common.loading}</p>
            </div>
          ) : tab === 'feed' ? (
            <>
              <CommunityComposer user={user} onCreated={refresh} />
              <div className="feed-filters">
                {FEED_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`feed-chip ${feedFilter === f.id ? 'active' : ''}`}
                    onClick={() => setFeedFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
                {user && (
                  <button
                    type="button"
                    className={`feed-chip ${authorFilter === 'mine' ? 'active' : ''}`}
                    onClick={() => setAuthorFilter((v) => (v === 'mine' ? 'all' : 'mine'))}
                  >
                    {t.common.mine}
                  </button>
                )}
              </div>

              <div className="community-feed">
                {filteredPosts.length === 0 ? (
                  <div className="community-empty">
                    <Sparkles size={28} />
                    <p>{t.community.noPosts}</p>
                    <span>{t.common.tryAnother}</span>
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <div key={post.id} data-post-id={post.id}>
                      <CommunityPost
                        post={post}
                        user={user}
                        usersMap={usersMap}
                        onChanged={refresh}
                        onOpenProfile={handleOpenProfile}
                      />
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <section className="community-rankings">
              <div className="rankings-controls">
                <div className="rankings-group">
                  <span className="rankings-label">{t.communityFeed.period}</span>
                  <div className="rankings-chips">
                    {RANKING_PERIODS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`rank-chip ${period === p.id ? 'active' : ''}`}
                        onClick={() => setPeriod(p.id)}
                      >
                        {t.communityFeed.periods[p.id]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rankings-group">
                  <span className="rankings-label">{t.communityFeed.category}</span>
                  <div className="rankings-chips">
                    {['all', ...genreNames].map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`rank-chip ${category === c ? 'active' : ''}`}
                        onClick={() => setCategory(c)}
                      >
                        {c === 'all' ? t.communityFeed.feedFilters.all : c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {rankingsLoading ? (
                <div className="community-empty">
                  <Sparkles size={28} className="spin" />
                  <p>{t.common.loading}</p>
                </div>
              ) : rankings.length === 0 ? (
                <div className="community-empty">
                  <Trophy size={28} />
                  <p>{t.communityFeed.noRankings}</p>
                  <span>{t.communityFeed.tryAnotherPeriod}</span>
                </div>
              ) : (
                <ol className="rankings-list">
                  {rankings.map((r, i) => {
                    const medal = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                    const authorPhoto = usersMap[r.authorId]?.photo;
                    return (
                      <li key={r.authorId} className={`ranking-item ${medal}`}>
                        <span className="ranking-position">#{i + 1}</span>
                        <button
                          type="button"
                          className="ranking-avatar"
                          onClick={() => handleOpenProfile(r.authorId, r.authorName)}
                        >
                          {authorPhoto ? (
                            <img
                              src={authorPhoto}
                              alt={r.authorName}
                              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            r.authorName.charAt(0).toUpperCase()
                          )}
                        </button>
                        <div className="ranking-info">
                          <button
                            type="button"
                            className="ranking-name"
                            onClick={() => handleOpenProfile(r.authorId, r.authorName)}
                          >
                            {r.authorName}
                          </button>
                          <span>
                            {r.works} work{r.works > 1 ? 's' : ''} · {r.likes} {t.common.likes.toLowerCase()} · {r.comments} comments
                          </span>
                        </div>
                        <span className="ranking-score">
                          <Radio size={11} /> {r.score}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}
        </section>

        <CommunityRightRail meta={meta} topAuthors={topAuthors} user={user} />
      </main>

      {openProfile && (
        <UserProfileModal
          profile={openProfile}
          onClose={() => setOpenProfile(null)}
          onOpenPost={handleOpenPost}
        />
      )}
    </>
  );
}