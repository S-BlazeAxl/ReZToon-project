import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Send, Trash2, CheckCircle2, Play, BookOpen, X,
  PenTool, Star, Eye, Bookmark, BookmarkCheck, Sparkles,
} from 'lucide-react';
import { toggleLike, addComment, deleteComment, votePoll, deletePost } from '../../core/services/communityService';
import type { CommunityPost as Post } from '../../core/services/communityService';
import type { User } from '../../core/services/userService';
import { getMangaById, type Manga } from '../../core/services/mangaService';
import { getIcon } from '../../shared/ui/Icon';
import FollowButton from '../../shared/ui/FollowButton';
import { useLibraryToggle } from '../../core/hooks/useLibraryToggle';
import { formatNumber, formatRelativeTime } from '../../core/utils/format';
import { useT, useI18n } from '../../config/i18n';

function isCreatorRole(role?: string): boolean {
  return role === 'creator' || role === 'both';
}

interface Props {
  post: Post;
  user: User | null;
  usersMap: Record<string, User>;
  onChanged: () => void;
  onOpenProfile: (authorId: string, authorName: string) => void;
}

export default function CommunityPost({
  post,
  user,
  usersMap,
  onChanged,
  onOpenProfile,
}: Props) {
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useI18n();
  const { isInLibrary, addToLib, feedback } = useLibraryToggle<string>({
    onGuestAttempt: () => navigate('/let-go'),
  });
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [linkedManga, setLinkedManga] = useState<Manga | null>(null);

  const liked = user ? post.likes.includes(user.id) : false;
  const isOwner = user?.id === post.authorId;

  const authorPhoto = usersMap[post.authorId]?.photo;
  const authorRole = usersMap[post.authorId]?.role;
  const authorIsCreator = post.auto === true || isCreatorRole(authorRole);

  const inList = isInLibrary(post.mangaId ?? null);
  const isFeedback = feedback?.id === post.id;

  const TYPE_LABEL: Record<Post['type'], string> = {
    release: t.community.newRelease,
    publication: t.community.article,
    poll: t.community.poll,
    poster: t.community.poster,
  };

  useEffect(() => {
    let cancelled = false;
    if (post.mangaId) {
      getMangaById(post.mangaId).then((m) => {
        if (!cancelled) setLinkedManga(m);
      });
    }
    return () => { cancelled = true; };
  }, [post.mangaId]);

  const userVote = post.pollOptions?.find(
    (o) => (user ? o.votes.includes(user.id) : false),
  );
  const totalVotes = post.pollOptions
    ? post.pollOptions.reduce((s, o) => s + o.votes.length, 0)
    : 0;
  const voteCountLabel = totalVotes === 1 ? t.community.vote : t.community.votes;

  const handleLike = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await toggleLike(post.id, user.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await votePoll(post.id, optionId, user.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const handleComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !draft.trim() || busy) return;
    setBusy(true);
    try {
      await addComment(post.id, {
        authorId: user.id,
        authorName: user.name,
        text: draft,
      });
      setDraft('');
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || busy) return;
    if (!window.confirm(t.comments.deleteConfirm)) return;
    setBusy(true);
    try {
      await deleteComment(post.id, commentId, user.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!user || busy) return;
    if (!window.confirm(t.community.deletePostConfirm)) return;
    setBusy(true);
    try {
      await deletePost(post.id, user.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const handleReadChapter = () => {
    if (!post.mangaId) return;
    const chapterToRead = post.chapterNumber ?? 1;
    navigate(`/manga/${post.mangaId}/read/${chapterToRead}`);
  };

  const handleOpenManga = () => {
    if (post.mangaId) navigate(`/manga/${post.mangaId}`);
  };

  const handleAddToList = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.mangaId) return;
    await addToLib(post.id, post.mangaId);
  };

  const showMangaCard =
    Boolean(post.mangaId) && (post.type === 'release' || post.type === 'publication');
  const isAutoPost = post.auto === true;

  return (
    <article className={`community-post type-${post.type} ${isAutoPost ? 'auto' : ''}`}>
      {isAutoPost && (
        <div className="post-auto-banner">
          <Sparkles size={12} />
          <span>{t.community.autoPublished}</span>
        </div>
      )}

      <header className="post-head">
        <button
          type="button"
          className="post-avatar post-avatar-btn"
          onClick={() => onOpenProfile(post.authorId, post.authorName)}
          aria-label={post.authorName}
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          {authorPhoto && authorPhoto.trim() !== '' ? (
            <img
              src={authorPhoto}
              alt={post.authorName}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <span className="post-avatar-letter">
              {post.authorName.charAt(0).toUpperCase()}
            </span>
          )}
          {user?.id === post.authorId && isCreatorRole(user.role) && (
            <span className="post-avatar-ring" aria-hidden="true" />
          )}
        </button>

        <div className="post-author">
          <div className="post-author-line">
            <button
              type="button"
              className="post-author-name"
              onClick={() => onOpenProfile(post.authorId, post.authorName)}
            >
              {post.authorName}
            </button>
            {authorIsCreator && (
              <span className="post-author-role">
                <PenTool size={9} /> {t.common.roleCreator}
              </span>
            )}
          </div>
          <span>{formatRelativeTime(post.createdAt, lang)}</span>
        </div>

        {authorIsCreator && !isOwner && user && (
          <div className="post-follow-btn">
            <FollowButton targetId={post.authorId} type="creator" size="sm" variant="outline" />
          </div>
        )}
        <span className={`post-type-badge badge-${post.type}`}>{TYPE_LABEL[post.type]}</span>
        {isOwner && (
          <button
            type="button"
            className="post-delete"
            onClick={handleDelete}
            disabled={busy}
            aria-label={t.common.delete}
          >
            <Trash2 size={13} />
          </button>
        )}
      </header>

      <div className="post-body">
        <h3 className="post-title">{post.title}</h3>
        <p className="post-content">{post.content}</p>

        {post.image && (
          <div className="post-image">
            <img src={post.image} alt={post.title} />
          </div>
        )}

        {showMangaCard && post.mangaId && (
          <div className="post-manga-card">
            <div
              className="post-manga-cover"
              onClick={handleOpenManga}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenManga();
                }
              }}
            >
              {(() => {
                const Icon = getIcon(linkedManga?.cover ?? '');
                return <Icon size={30} />;
              })()}
              {linkedManga && (
                <span className={`post-manga-status status-${linkedManga.status}`}>
                  {linkedManga.status}
                </span>
              )}
            </div>
            <div className="post-manga-info" onClick={handleOpenManga} role="button">
              <div className="post-manga-title-row">
                <strong>{linkedManga?.title ?? post.seriesTitle ?? post.title}</strong>
                {(linkedManga?.genre || post.genre) && (
                  <span className="post-manga-genre">
                    {linkedManga?.genre ?? post.genre}
                  </span>
                )}
              </div>
              {linkedManga?.subtitle && (
                <span className="post-manga-sub">{linkedManga.subtitle}</span>
              )}
              <div className="post-manga-metrics">
                <span>
                  <BookOpen size={10} />{' '}
                  {post.chapterNumber
                    ? `${t.common.chapterShort} ${post.chapterNumber}`
                    : `${linkedManga?.chapters?.length || 0} ${t.common.chapterShort}`}
                </span>
                {linkedManga && (
                  <>
                    <span>
                      <Eye size={10} /> {formatNumber(linkedManga.reads)}
                    </span>
                    <span>
                      <Star size={10} fill="currentColor" />{' '}
                      {linkedManga.rating.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="post-manga-actions">
              <button
                type="button"
                className="post-manga-read"
                onClick={handleReadChapter}
              >
                <Play size={12} fill="currentColor" /> {t.common.read}
              </button>
              <button
                type="button"
                className={`post-manga-list ${inList ? 'added' : ''}`}
                onClick={handleAddToList}
                aria-label={inList ? t.home.inList : t.home.addToList}
              >
                {inList ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}{' '}
                {inList ? t.home.inList : t.home.addToList}
              </button>
              {!isOwner && user && post.mangaId && (
                <FollowButton
                  targetId={post.mangaId}
                  type="manga"
                  size="sm"
                  variant="outline"
                />
              )}
            </div>
          </div>
        )}

        {isFeedback && <div className="post-manga-feedback">{feedback?.text}</div>}

        {(post.genre || (post.seriesTitle && !linkedManga)) && (
          <div className="post-tags">
            {post.genre && <span className="post-tag">{post.genre}</span>}
            {post.seriesTitle && !linkedManga && (
              <span className="post-tag alt">
                {post.seriesTitle}
                {post.chapterNumber ? ` · ${t.common.chapterShort} ${post.chapterNumber}` : ''}
              </span>
            )}
          </div>
        )}

        {post.pollOptions && (
          <div className="post-poll">
            {post.pollOptions.map((opt) => {
              const pct =
                totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
              const chosen = userVote?.id === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`poll-option ${chosen ? 'chosen' : ''}`}
                  onClick={() => handleVote(opt.id)}
                  disabled={!user || busy}
                >
                  <span className="poll-fill" style={{ width: `${pct}%` }} />
                  <span className="poll-label">
                    {chosen && <CheckCircle2 size={12} />}
                    {opt.label}
                  </span>
                  <span className="poll-pct">{pct}%</span>
                </button>
              );
            })}
            <span className="poll-total">
              {totalVotes} {voteCountLabel}
            </span>
          </div>
        )}
      </div>

      <footer className="post-actions">
        <button
          type="button"
          className={`post-action ${liked ? 'active' : ''}`}
          onClick={handleLike}
          disabled={!user || busy}
        >
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} /> {post.likes.length}
        </button>
        <button
          type="button"
          className="post-action"
          onClick={() => setShowComments((v) => !v)}
        >
          <MessageCircle size={15} /> {post.comments.length}
        </button>
      </footer>

      {showComments && (
        <div className="post-comments">
          {post.comments.length === 0 ? (
            <span className="post-comments-empty">
              {t.community.noCommentsYet}
            </span>
          ) : (
            post.comments.map((c) => {
              const canDelete =
                user && (c.authorId === user.id || post.authorId === user.id);
              const commentAuthorPhoto = usersMap[c.authorId]?.photo;
              return (
                <div key={c.id} className="post-comment">
                  <button
                    type="button"
                    className="comment-avatar"
                    onClick={() => onOpenProfile(c.authorId, c.authorName)}
                    aria-label={c.authorName}
                    style={{ position: 'relative', overflow: 'hidden' }}
                  >
                    {commentAuthorPhoto && commentAuthorPhoto.trim() !== '' ? (
                      <img
                        src={commentAuthorPhoto}
                        alt={c.authorName}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      c.authorName.charAt(0).toUpperCase()
                    )}
                  </button>
                  <div className="comment-body">
                    <div className="comment-head">
                      <button
                        type="button"
                        className="comment-author"
                        onClick={() => onOpenProfile(c.authorId, c.authorName)}
                      >
                        {c.authorName}
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          className="comment-delete"
                          onClick={() => handleDeleteComment(c.id)}
                          disabled={busy}
                          aria-label={t.common.delete}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                    <p>{c.text}</p>
                    <span>{formatRelativeTime(c.createdAt, lang)}</span>
                  </div>
                </div>
              );
            })
          )}
          {user && (
            <form className="comment-form" onSubmit={handleComment}>
              <input
                type="text"
                placeholder={t.community.writeComment}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={busy}
              />
              <button type="submit" disabled={!draft.trim() || busy} aria-label={t.messaging.send}>
                <Send size={14} />
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}