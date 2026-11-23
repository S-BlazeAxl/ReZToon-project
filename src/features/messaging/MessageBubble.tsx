import { useEffect, useRef, useState } from 'react';
import {
  Reply, Pin, Trash2, Smile, Eye, EyeOff, Check, CheckCheck,
  Pencil, Check as CheckIcon, X, Play, Pause,
} from 'lucide-react';
import { useMessagingContext } from './MessagingContext';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { formatTime } from '../../core/hooks/useMessaging';
import { getMangaById, type Manga } from '../../core/services/mangaService';
import { getIcon } from '../../shared/ui/Icon';
import MediaViewer, { type MediaItem } from './MediaViewer';
import { useT, useI18n } from '../../config/i18n';
import type { Message, MessageAttachment } from '../../core/services/messageService';

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '😮', '🙏', '👍'];
const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const;

interface Props {
  message: Message;
  isMine: boolean;
  isGroup?: boolean;
  otherName: string;
  otherUserId: string;
  isPinned: boolean;
  isExpanded: boolean;
  isReadByUser: boolean;
  replyPreview: Message | null;
  onToggleExpand: () => void;
  onReply: () => void;
  onDelete: () => void;
}

export default function MessageBubble({
  message,
  isMine,
  isGroup = false,
  otherName,
  isPinned,
  isExpanded,
  isReadByUser,
  replyPreview,
  onToggleExpand,
  onReply,
  onDelete,
}: Props) {
  const m = useMessagingContext();
  const user = useCurrentUser();
  const t = useT();
  const { lang } = useI18n();
  const [showEmoji, setShowEmoji] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text ?? '');
  const [locallyRead, setLocallyRead] = useState(isReadByUser);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocallyRead(isReadByUser);
  }, [isReadByUser]);

  const safeText = typeof message.text === 'string' ? message.text : '';
  const safeReactions = Array.isArray(message.reactions) ? message.reactions : [];
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];

  const images = attachments.filter((a) => a.type === 'image' && a.imageData);
  const voices = attachments.filter((a) => a.type === 'voice' && a.audioData);
  const mangas = attachments.filter((a) => a.type === 'manga' && a.mangaId);

  const mediaItems: MediaItem[] = images.map((img) => ({
    id: img.id,
    url: img.imageData as string,
    type: 'image'
  }));

  const isLong = safeText.length > 120;
  const displayText =
    isLong && !isExpanded ? safeText.slice(0, 120).trimEnd() + '…' : safeText;

  const handleClick = () => {
    if (window.getSelection()?.toString()) return;
    if (!locallyRead) {
      m.markRead(message.id);
      setLocallyRead(true);
    }
  };

  const submitEdit = () => {
    const next = draft.trim();
    if (!next || next === safeText) {
      setEditing(false);
      return;
    }
    void m.edit(message.id, next);
    setEditing(false);
  };

  const replySenderName = replyPreview?.senderId === user?.id
    ? t.messaging.you
    : (replyPreview?.senderName || otherName);

  return (
    <div className={`message-row ${isMine ? 'mine' : 'theirs'} ${isPinned ? 'pinned' : ''}`}>
      {isPinned && (
        <span className="message-pinned-flag">
          <Pin size={9} /> {t.messaging.pin}
        </span>
      )}

      {isGroup && !isMine && (
        <span className="message-sender-name">
          {message.senderName ?? otherName}
        </span>
      )}

      <div
        className={`message-bubble ${isMine ? 'mine' : 'theirs'} ${isExpanded ? 'expanded' : ''}`}
        onClick={handleClick}
      >
        {replyPreview && (
          <div className="message-quoted">
            <strong>{replySenderName}</strong>
            <p>
              {(replyPreview.text ?? '').slice(0, 80) ||
                (replyPreview.attachments?.[0]?.type === 'voice'
                  ? `🎙️ ${t.messaging.voice}`
                  : `📎 ${t.messaging.attachment}`)}
            </p>
          </div>
        )}

        {images.length > 0 && (
          <div className={`message-gallery count-${Math.min(images.length, 4)}`}>
            {images.slice(0, 4).map((a, i) => (
              <button
                key={a.id}
                type="button"
                className="message-gallery-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIndex(i);
                }}
                aria-label={a.imageName ?? `${t.messaging.image} ${i + 1}`}
              >
                <img src={a.imageData} alt={a.imageName ?? `${t.messaging.image} ${i + 1}`} />
                {i === 3 && images.length > 4 && (
                  <span className="message-gallery-more">+{images.length - 4}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {voices.map((v) => (
          <VoicePlayer key={v.id} attachment={v} isMine={isMine} />
        ))}

        {mangas.map((a) => (
          <MangaAttachment key={a.id} attachment={a} />
        ))}

        {editing ? (
          <div className="message-edit" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitEdit();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
            />
            <button type="button" onClick={submitEdit} aria-label={t.common.save}>
              <CheckIcon size={12} />
            </button>
            <button type="button" onClick={() => setEditing(false)} aria-label={t.common.cancel}>
              <X size={12} />
            </button>
          </div>
        ) : (
          safeText.trim() && (
            <>
              <p className="message-text">{displayText}</p>
              {isLong && (
                <button
                  type="button"
                  className="message-expand-hint"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand();
                  }}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <><EyeOff size={10} /> {t.messaging.collapse}</>
                  ) : (
                    <><Eye size={10} /> {t.messaging.readMore}</>
                  )}
                </button>
              )}
            </>
          )
        )}

        <span className="message-time">
          {message.edited && <span className="message-edited">{t.messaging.edited} · </span>}
          {formatTime(message.date, lang === 'fr' ? 'fr-FR' : 'en-GB')}
          {isMine && (
            <span className="message-status-icon">
              {message.read || locallyRead ? (
                <CheckCheck size={11} className="message-read" />
              ) : message.delivered ? (
                <CheckCheck size={11} />
              ) : (
                <Check size={11} />
              )}
            </span>
          )}
        </span>

        {safeReactions.length > 0 && (
          <div className="message-reactions" onClick={(e) => e.stopPropagation()}>
            {safeReactions.map((r, i) => (
              <button
                key={i}
                type="button"
                className="message-reaction"
                title={r.userName}
                aria-label={`${r.emoji} — ${r.userName}`}
                onClick={() => m.react(message.id, r.emoji)}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="message-hover-actions">
        <button
          type="button"
          className="message-action-btn"
          onClick={(e) => { e.stopPropagation(); setShowEmoji((v) => !v); }}
          aria-label={t.messaging.emoji}
        >
          <Smile size={12} />
        </button>
        <button
          type="button"
          className="message-action-btn"
          onClick={(e) => { e.stopPropagation(); onReply(); }}
          aria-label={t.messaging.reply}
        >
          <Reply size={12} />
        </button>
        <button
          type="button"
          className={`message-action-btn ${isPinned ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); m.pinMessage(message.id); }}
          aria-label={isPinned ? t.messaging.unpin : t.messaging.pin}
        >
          <Pin size={12} />
        </button>
        {isLong && (
          <button
            type="button"
            className="message-action-btn"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            aria-label={isExpanded ? t.messaging.collapse : t.messaging.readMore}
          >
            {isExpanded ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
        {isMine && attachments.length === 0 && (
          <button
            type="button"
            className="message-action-btn"
            onClick={(e) => { e.stopPropagation(); setDraft(safeText); setEditing(true); }}
            aria-label={t.messaging.edit}
          >
            <Pencil size={12} />
          </button>
        )}
        {isMine && (
          <button
            type="button"
            className="message-action-btn danger"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label={t.messaging.delete}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {showEmoji && (
        <div className="message-emoji-pop">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={(e) => { e.stopPropagation(); m.react(message.id, emoji); setShowEmoji(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {viewerIndex !== null && (
        <MediaViewer
          media={mediaItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}

function VoicePlayer({ attachment, isMine }: { attachment: MessageAttachment; isMine: boolean }) {
  const t = useT();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const duration = attachment.duration ?? 0;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setCurrent(el.currentTime);
      setProgress(el.duration > 0 ? (el.currentTime / el.duration) * 100 : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause(); else void el.play();
  };

  const cycleRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = PLAYBACK_RATES.indexOf(rate as (typeof PLAYBACK_RATES)[number]);
    setRate(PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length]);
  };

  const fmt = (s: number) => {
    const sec = Math.floor(s);
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  };

  return (
    <div className={`voice-player ${isMine ? 'mine' : 'theirs'}`}>
      <audio ref={audioRef} src={attachment.audioData} preload="metadata" />
      <button
        type="button"
        className={`voice-player-btn ${playing ? 'playing' : ''}`}
        onClick={toggle}
        aria-label={playing ? t.messaging.pause : t.messaging.play}
      >
        {playing ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
      </button>
      <div className="voice-player-body">
        <div className="voice-player-bars">
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className={progress >= (i / 30) * 100 ? 'played' : ''}
              style={{ height: `${4 + ((i * 7) % 14)}px` }}
            />
          ))}
        </div>
        <div className="voice-player-meta">
          <span>{fmt(playing || current > 0 ? current : duration)}</span>
          {duration > 0 && <span className="voice-player-total">/ {fmt(duration)}</span>}
          <button
            type="button"
            className="voice-player-rate"
            onClick={cycleRate}
            aria-label={`${t.messaging.speed} ${rate}x`}
          >
            {rate}×
          </button>
        </div>
      </div>
    </div>
  );
}

function MangaAttachment({ attachment }: { attachment: MessageAttachment }) {
  const [manga, setManga] = useState<Manga | null>(null);

  useEffect(() => {
    if (!attachment.mangaId) return;
    let cancelled = false;
    getMangaById(attachment.mangaId).then((mg) => {
      if (!cancelled) setManga(mg);
    });
    return () => {
      cancelled = true;
    };
  }, [attachment.mangaId]);

  if (!manga) return null;
  const Icon = getIcon(manga.cover);

  return (
    <div className="message-manga-attach">
      <div className="message-manga-cover">
        <Icon size={22} />
      </div>
      <div className="message-manga-info">
        <strong>{manga.title}</strong>
        <span>{manga.author} · {manga.genre}</span>
      </div>
    </div>
  );
}