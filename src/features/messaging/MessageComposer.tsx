import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Paperclip, Sparkles, Send, X, BookOpen, ImagePlus, Smile,
  Mic, Trash2, Volume2, Loader2
} from 'lucide-react';
import { useMessagingContext } from './MessagingContext';
import { getAllMangas, type Manga } from '../../core/services/mangaService';
import { getIcon } from '../../shared/ui/Icon';
import EmojiPicker from './EmojiPicker';
import { useVoiceRecorder } from '../../core/hooks/useVoiceRecorder';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { supabase } from '../../core/lib/supabase';
import { useT } from '../../config/i18n';
import type { Message, MessageAttachment } from '../../core/services/messageService';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_IMAGES = 4;
const MAX_VOICE_SECONDS = 60;
const CHAT_MEDIA_BUCKET = 'chat-media';

function newAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface Props {
  replyTo: Message | null;
  onCancelReply: () => void;
}

export default function MessageComposer({ replyTo, onCancelReply }: Props) {
  const m = useMessagingContext();
  const user = useCurrentUser();
  const t = useT();
  const [draft, setDraft] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [pending, setPending] = useState<MessageAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mangas, setMangas] = useState<Manga[]>([]);
  const multiFileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const finalizingRef = useRef(false);

  const recorder = useVoiceRecorder();
  const conv = m.activeConversation;

  const QUICK_REPLIES = [
    t.composer.quickReplies.nextChapter,
    t.composer.quickReplies.loved,
    t.composer.quickReplies.congrats,
    t.composer.quickReplies.collab,
    t.composer.quickReplies.checkOut,
    t.composer.quickReplies.thanks,
  ];

  const waveHeights = useMemo(
    () => Array.from({ length: 24 }).map(() => Math.random()),
    [],
  );

  useEffect(() => {
    if (!showAttach) return;
    let cancelled = false;
    getAllMangas().then((data) => { if (!cancelled) setMangas(data); });
    return () => { cancelled = true; };
  }, [showAttach]);

  const finalizeVoice = async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    try {
      const result = await recorder.stop();
      if (!result) return;
      setPending((prev) => [...prev, {
        id: newAttachmentId(),
        type: 'voice',
        audioData: result.audioData,
        audioMimeType: result.mimeType,
        duration: result.duration,
        imageSize: result.size,
      }]);
      recorder.reset();
    } finally {
      finalizingRef.current = false;
    }
  };

  useEffect(() => {
    if (recorder.status === 'recording' && recorder.duration >= MAX_VOICE_SECONDS) {
      void finalizeVoice();
    }
  }, [recorder.status, recorder.duration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || uploading) return;
    if (!draft.trim() && pending.length === 0) return;

    setSending(true);
    setError(null);

    try {
      await m.send(draft, {
        replyToId: replyTo?.id,
        attachments: pending.length > 0 ? pending : undefined,
      });
      setDraft('');
      setPending([]);
      setShowQuick(false);
      setShowEmoji(false);
      onCancelReply();
    } catch (err) {
      console.error('[MessageComposer] send failed:', err);
      setError(t.composer.sendFailed);
    } finally {
      setSending(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (!input) { setDraft((d) => d + emoji); return; }
    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + emoji.length;
      input.setSelectionRange(pos, pos);
    });
  };

  const handleImages = async (files: FileList) => {
    if (!user) return;
    const list = Array.from(files);
    const currentImageCount = pending.filter((p) => p.type === 'image').length;
    const room = MAX_IMAGES - currentImageCount;
    if (room <= 0) {
      setError(t.messaging.maxImages.replace('{{count}}', String(MAX_IMAGES)));
      return;
    }

    setUploading(true);
    setError(null);
    const newAttachments: MessageAttachment[] = [];

    for (const file of list.slice(0, room)) {
      if (!file.type.startsWith('image/')) {
        setError(t.messaging.onlyImages);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError(t.messaging.imageSizeLimit);
        continue;
      }

      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${user.id}/chat-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(CHAT_MEDIA_BUCKET)
          .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(CHAT_MEDIA_BUCKET)
          .getPublicUrl(path);

        newAttachments.push({
          id: newAttachmentId(),
          type: 'image',
          imageData: publicUrl,
          imageName: file.name,
          imageSize: file.size,
        });
      } catch (err) {
        console.error('[Upload] Failed:', err);
        setError(t.composer.sendFailed);
      }
    }

    setPending((prev) => [...prev, ...newAttachments]);
    setUploading(false);
  };

  const startVoice = async () => { setError(null); await recorder.start(); };

  const cancelVoice = () => { recorder.cancel(); recorder.reset(); };

  const handleAttachManga = (mangaId: string) => {
    setPending((prev) => [...prev, { id: newAttachmentId(), type: 'manga', mangaId }]);
    setShowAttach(false);
  };

  const removePending = (id: string) => setPending((prev) => prev.filter((p) => p.id !== id));

  const replyText = (replyTo?.text ?? '').slice(0, 60);
  const isRecording = recorder.status === 'recording';
  const isRequesting = recorder.status === 'requesting';
  const hasDraft = draft.trim() || pending.length > 0;

  const isReplyingToMe = replyTo?.senderId === user?.id;
  const replyTargetName = isReplyingToMe
    ? t.composer.yourself
    : (m.activeType === 'group' ? replyTo?.senderName : conv?.userName);

  return (
    <div className="message-composer-wrapper">
      {error && <div className="form-message error" style={{ margin: '10px 24px 0' }}>{error}</div>}

      {replyTo && (
        <div className="message-reply-bar">
          <span className="message-reply-bar-icon" aria-hidden>↩</span>
          <div>
            <strong>{t.composer.replyingTo} {replyTargetName}</strong>
            <p>{replyText || `📎 ${t.messaging.attachment}`}</p>
          </div>
          <button type="button" onClick={onCancelReply} aria-label={t.common.cancel}><X size={12} /></button>
        </div>
      )}

      {pending.length > 0 && (
        <div className="message-pending-strip">
          {pending.map((p) => (
            <div key={p.id} className={`message-pending-item type-${p.type}`}>
              {p.type === 'image' && p.imageData && <img src={p.imageData} alt={p.imageName ?? ''} />}
              {p.type === 'voice' && (
                <span className="message-pending-voice">
                  <Volume2 size={12} /><span>{p.duration ?? 0}s</span>
                </span>
              )}
              {p.type === 'manga' && (
                <span className="message-pending-manga">
                  <BookOpen size={12} />
                  <span>{mangas.find((mg) => mg.id === p.mangaId)?.title?.slice(0, 14) ?? t.messaging.group}</span>
                </span>
              )}
              <button type="button" className="message-pending-remove" onClick={() => removePending(p.id)}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isRecording || isRequesting ? (
        <div className="message-voice-recording">
          <button type="button" className="message-voice-cancel" onClick={cancelVoice}><Trash2 size={14} /></button>
          <div className="message-voice-visual">
            <span className="message-voice-dot" />
            <span className="message-voice-time">
              {String(Math.floor(recorder.duration / 60)).padStart(2, '0')}:
              {String(recorder.duration % 60).padStart(2, '0')}
            </span>
            <div className="message-voice-wave" aria-hidden>
              {Array.from({ length: 24 }).map((_, i) => {
                const h = Math.max(4, Math.min(28, recorder.level * 40 + waveHeights[i] * 12));
                return <span key={i} style={{ height: `${h}px`, animationDelay: `${i * 0.02}s` }} />;
              })}
            </div>
            {isRequesting && <span className="message-voice-hint">{t.composer.microPermission}</span>}
          </div>
          <button
            type="button"
            className="message-voice-send"
            onClick={finalizeVoice}
            disabled={isRequesting || recorder.duration < 1}
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <>
          {showQuick && (
            <div className="message-quick-replies">
              {QUICK_REPLIES.map((q) => (
                <button key={q} type="button" onClick={() => { setDraft(q); setShowQuick(false); }}>{q}</button>
              ))}
            </div>
          )}

          {showAttach && (
            <div className="message-attach-picker">
              <div className="message-attach-head">
                <BookOpen size={12} /><span>{t.messaging.attachManga}</span>
                <button type="button" onClick={() => setShowAttach(false)} aria-label={t.common.close}><X size={11} /></button>
              </div>
              <ul className="message-attach-list">
                {mangas.slice(0, 20).map((mg) => {
                  const Icon = getIcon(mg.cover);
                  return (
                    <li key={mg.id} className="message-attach-item" onClick={() => handleAttachManga(mg.id)}>
                      <span className="message-attach-cover"><Icon size={18} /></span>
                      <div className="message-attach-info">
                        <strong>{mg.title}</strong>
                        <span>{mg.author} · {mg.genre}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {showEmoji && (
            <EmojiPicker userId={user?.id} onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
          )}

          <form className="message-composer" onSubmit={handleSubmit}>
            <input
              ref={multiFileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) handleImages(e.target.files);
                e.target.value = '';
              }}
            />
            <button type="button" className="message-composer-icon"
              onClick={() => { setShowEmoji((v) => !v); setShowAttach(false); setShowQuick(false); }}
              aria-label={t.messaging.emoji}>
              <Smile size={16} />
            </button>
            <button type="button" className="message-composer-icon"
              onClick={() => { setShowAttach((v) => !v); setShowEmoji(false); setShowQuick(false); }}
              aria-label={t.messaging.attachments}>
              <Paperclip size={16} />
            </button>
            <button type="button" className="message-composer-icon" onClick={() => multiFileRef.current?.click()} aria-label={t.messaging.image}>
              {uploading ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />}
            </button>
            <button type="button" className="message-composer-icon"
              onClick={() => { setShowQuick((v) => !v); setShowEmoji(false); setShowAttach(false); }}
              aria-label={t.messaging.reply}>
              <Sparkles size={16} />
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder={t.messaging.writeMessage}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
            />
            {hasDraft ? (
              <button type="submit" className="message-send-btn" disabled={sending || uploading} aria-label={t.messaging.send}>
                {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
              </button>
            ) : (
              <button type="button" className="message-voice-btn" onClick={startVoice} disabled={sending || uploading} aria-label={t.messaging.voice}>
                <Mic size={18} />
              </button>
            )}
          </form>
        </>
      )}
    </div>
  );
}