import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Image as ImageIcon, Plus, X, Send, BookOpen, Mic, Link as LinkIcon, Check, Loader2 } from 'lucide-react';
import { createPost } from '../../core/services/communityService';
import { useGenres } from '../../core/hooks/useGenres';
import type { CommunityPost, PostType } from '../../core/services/communityService';
import type { User } from '../../core/services/userService';
import { getAllMangas, type Manga } from '../../core/services/mangaService';
import { getIcon } from '../../shared/ui/Icon';
import { supabase } from '../../core/lib/supabase';
import { useT } from '../../config/i18n';

const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024;

interface Props {
  user: User | null;
  onCreated: (post: CommunityPost) => void;
}

export default function CommunityComposer({ user, onCreated }: Props) {
  const { names: genreNames } = useGenres();
  const navigate = useNavigate();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [postType, setPostType] = useState<PostType>('release');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [genre, setGenre] = useState('');
  const [mangaId, setMangaId] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [image, setImage] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loadingMangas, setLoadingMangas] = useState(false);

  const POST_TYPES: { id: PostType; label: string; icon: typeof BookOpen }[] = [
    { id: 'release', label: t.community.newRelease, icon: BookOpen },
    { id: 'publication', label: t.community.article, icon: Mic },
    { id: 'poll', label: t.community.poll, icon: BarChart3 },
    { id: 'poster', label: t.community.poster, icon: ImageIcon },
  ];

  useEffect(() => {
    if (!open) return;
    let isCancelled = false;
    async function fetchMangas() {
      setLoadingMangas(true);
      const data = await getAllMangas();
      if (!isCancelled) { setMangas(data); setLoadingMangas(false); }
    }
    fetchMangas();
    return () => { isCancelled = true; };
  }, [open]);

  const ownMangas = useMemo(() => {
    if (!user) return [];
    return mangas.filter((m) => m.authorId === user.id);
  }, [user, mangas]);

  const selectedManga = useMemo(() => mangas.find((m) => m.id === mangaId) ?? null, [mangas, mangaId]);

  const suggestedMangas = useMemo(() => {
    let pool = ownMangas.length > 0 ? ownMangas : mangas;
    if (genre) {
      const filtered = pool.filter((m) => m.genre === genre);
      if (filtered.length > 0) pool = filtered;
    }
    return pool.slice(0, 40);
  }, [ownMangas, mangas, genre]);

  const reset = () => {
    setPostType('release'); setTitle(''); setContent(''); setGenre(''); setMangaId(''); setChapterNumber(''); setImage(''); setPollOptions(['', '']); setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { setError(t.messaging.onlyImages); return; }
    if (file.size > MAX_IMAGE_SIZE) { setError(t.messaging.imageSizeLimit); return; }

    setUploadingImage(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/poster-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('community-media')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('community-media')
        .getPublicUrl(path);

      setImage(publicUrl);
    } catch (err) {
      setError(t.composerForm.failedUpload);
      console.error(err);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || submitting) { setError(t.composerForm.signInToPublish); return; }
    if (!title.trim() || !content.trim()) { setError(t.composerForm.titleRequired); return; }
    if (postType === 'release' && !mangaId) { setError(t.composerForm.linkRequired); return; }

    let finalPoll: { id: string; label: string; votes: string[] }[] | undefined;
    if (postType === 'poll') {
      const cleaned = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (cleaned.length < 2) { setError(t.composerForm.pollMinOptions); return; }
      finalPoll = cleaned.map((label, i) => ({ id: `o-${Date.now()}-${i}`, label, votes: [] }));
    }

    setSubmitting(true);
    try {
      const post = await createPost({ id: user.id, name: user.name }, {
        type: postType, title: title.trim(), content: content.trim(), image: image || undefined, genre: genre || selectedManga?.genre || undefined,
        mangaId: mangaId || undefined, seriesTitle: selectedManga?.title || undefined, chapterNumber: chapterNumber ? Number(chapterNumber) : undefined, pollOptions: finalPoll,
      });
      onCreated(post);
      reset();
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || t.composerForm.failedCreate);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div className="community-composer">
        <button
          type="button"
          className="composer-trigger"
          onClick={() => {
            if (!user) {
              navigate('/let-go');
              return;
            }
            setOpen(true);
          }}
        >
          <div className="composer-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
            {user?.photo && user.photo.trim() !== '' ? (
              <img src={user.photo} alt={user.name} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <span>{user?.name?.charAt(0).toUpperCase() ?? '?'}</span>
            )}
          </div>
          <span className="composer-placeholder">{t.community.addPost}</span>
          <Plus size={16} />
        </button>
        {error && <div className="form-message error">{error}</div>}
      </div>
    );
  }

  return (
    <form className="community-composer composer-form" onSubmit={handleSubmit}>
      <div className="composer-types">
        {POST_TYPES.map((type) => {
          const Icon = type.icon; return (
            <button key={type.id} type="button" className={`composer-type ${postType === type.id ? 'active' : ''}`} onClick={() => setPostType(type.id)} disabled={submitting}><Icon size={14} /> {type.label}</button>
          );
        })}
        <button type="button" className="composer-close" onClick={() => { setOpen(false); reset(); }} aria-label={t.common.close} disabled={submitting}><X size={14} /></button>
      </div>

      {error && <div className="form-message error">{error}</div>}

      <input type="text" placeholder={t.composerForm.postTitlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="composer-input" disabled={submitting} />
      <textarea placeholder={t.community.writeSomething} value={content} onChange={(e) => setContent(e.target.value)} maxLength={800} rows={3} className="composer-textarea" disabled={submitting} />

      <div className="composer-row">
        <select value={genre} onChange={(e) => setGenre(e.target.value)} className="composer-select" disabled={submitting}>
          <option value="">{t.composerForm.genreOptional}</option>
          {genreNames.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        {(postType === 'release' || postType === 'publication') && (
          <input type="number" min={1} placeholder={t.composerForm.chapterNo} value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} className="composer-input compact" disabled={submitting} />
        )}
      </div>

      {(postType === 'release' || postType === 'publication') && (
        <div className="composer-manga-picker">
          <span className="composer-manga-label"><LinkIcon size={12} /> {t.composerForm.linkSeries}</span>
          {loadingMangas ? (
            <div style={{ padding: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{t.composerForm.loadingSeries}</div>
          ) : selectedManga ? (
            <div className="composer-manga-selected">
              <span className="composer-manga-cover">{(() => { const Icon = getIcon(selectedManga.cover); return <Icon size={18} />; })()}</span>
              <div className="composer-manga-info">
                <strong>{selectedManga.title}</strong>
                <span>{selectedManga.author} · {selectedManga.genre} · {selectedManga.chapters?.length || 0} ch.</span>
              </div>
              <button type="button" className="composer-manga-clear" onClick={() => setMangaId('')} aria-label={t.composerForm.unlink} disabled={submitting}><X size={12} /></button>
            </div>
          ) : (
            <>
              <select value={mangaId} onChange={(e) => { const id = e.target.value; setMangaId(id); const found = mangas.find((m) => m.id === id); if (found && !genre) setGenre(found.genre); }} className="composer-select" disabled={submitting}>
                <option value="">{t.composerForm.selectSeries}</option>
                {suggestedMangas.map((m) => <option key={m.id} value={m.id}>{m.title} — {m.genre}</option>)}
              </select>
              {ownMangas.length > 0 && <span className="composer-manga-hint"><Check size={11} /> {t.composerForm.yourSeriesFirst}</span>}
            </>
          )}
        </div>
      )}

      {postType === 'poll' && (
        <div className="composer-poll">
          <span className="composer-poll-label"><BarChart3 size={12} /> {t.composerForm.pollOptions}</span>
          {pollOptions.map((opt, i) => (
            <div key={i} className="composer-poll-row">
              <input type="text" placeholder={t.composerForm.optionN.replace('{{n}}', String(i + 1))} value={opt} onChange={(e) => { const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next); }} className="composer-input" disabled={submitting} />
              {pollOptions.length > 2 && <button type="button" className="composer-poll-remove" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} disabled={submitting}><X size={12} /></button>}
            </div>
          ))}
          {pollOptions.length < 4 && <button type="button" className="composer-poll-add" onClick={() => setPollOptions([...pollOptions, ''])} disabled={submitting}><Plus size={12} /> {t.composerForm.addOption}</button>}
        </div>
      )}

      {postType === 'poster' && (
        <>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImage} hidden disabled={submitting || uploadingImage} />
          <button type="button" className="composer-image-btn" onClick={() => fileInputRef.current?.click()} disabled={submitting || uploadingImage}>
            {uploadingImage ? <Loader2 size={14} className="spin" /> : <ImageIcon size={14} />}
            {uploadingImage ? t.composerForm.uploading : image ? t.composerForm.changePoster : t.composerForm.addPoster}
          </button>
          {image && (
            <div className="composer-image-preview">
              <img src={image} alt="Preview" />
              <button type="button" onClick={() => { setImage(''); if (fileInputRef.current) fileInputRef.current.value = ''; }} disabled={submitting}><X size={12} /></button>
            </div>
          )}
        </>
      )}

      <div className="composer-actions">
        <button type="button" className="btn btn-outline" onClick={() => { setOpen(false); reset(); }} disabled={submitting}>{t.common.cancel}</button>
        <button type="submit" className="btn btn-primary" disabled={submitting || uploadingImage}>
          {submitting ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
          {submitting ? t.composerForm.publishing : t.composerForm.publish}
        </button>
      </div>
    </form>
  );
}