import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Plus, AlertTriangle } from 'lucide-react';
import type { Genre, GenreInput } from '../../../core/services/genreService';
import { useT } from '../../../config/i18n';

interface Props {
  open: boolean;
  initial?: Genre | null;
  onClose: () => void;
  /** Retourne un message d'erreur, ou null si tout s'est bien passé. */
  onSave: (input: GenreInput) => Promise<string | null>;
}

function countSentences(text: string): number {
  return text
    .split(/[.!?…]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export default function GenreEditorModal({ open, initial, onClose, onSave }: Props) {
  const t = useT();
  const g = t.genresAdmin;

  const [name, setName] = useState('');
  const [equivalent, setEquivalent] = useState('');
  const [tag, setTag] = useState('');
  const [accent, setAccent] = useState('#f5b042');
  const [descFr, setDescFr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setEquivalent(initial?.equivalent ?? '');
    setTag(initial?.tag ?? '');
    setAccent(initial?.accentColor ?? '#f5b042');
    setDescFr(initial?.descriptionFr ?? '');
    setDescEn(initial?.descriptionEn ?? '');
    setIsActive(initial?.isActive ?? true);
    setError(null);
    setBusy(false);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const renaming = !!initial && name.trim() !== initial.name;
  const frCount = countSentences(descFr);
  const enCount = countSentences(descEn);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const err = await onSave({
      name,
      equivalent,
      tag: tag || equivalent,
      accentColor: accent,
      descriptionFr: descFr,
      descriptionEn: descEn,
      isActive,
    });
    if (err) {
      setError(err);
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="gen-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form className="gen-modal" onSubmit={submit} role="dialog" aria-modal="true">
        <header className="gen-modal-head">
          <h2>{initial ? g.editorEditTitle : g.editorNewTitle}</h2>
          <button type="button" className="gen-close" onClick={onClose} disabled={busy} aria-label={t.common.cancel}>
            <X size={15} />
          </button>
        </header>

        <div className="gen-modal-body">
          {error && <div className="gen-error" role="alert">{g.failed} {error}</div>}

          <div className="gen-row">
            <div className="gen-field">
              <label htmlFor="gen-name">{g.fieldName}</label>
              <input
                id="gen-name"
                type="text"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                disabled={busy}
              />
            </div>
            <div className="gen-field">
              <label htmlFor="gen-eq">{g.fieldEquivalent}</label>
              <input
                id="gen-eq"
                type="text"
                value={equivalent}
                maxLength={60}
                placeholder="Shōnen, Seinen…"
                onChange={(e) => setEquivalent(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="gen-field">
              <label htmlFor="gen-color">{g.fieldAccent}</label>
              <input
                id="gen-color"
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <p className="gen-hint">{g.fieldNameHint}</p>

          {renaming && (
            <div className="gen-warn">
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{g.renameWarning}</span>
            </div>
          )}

          <div className="gen-field">
            <label htmlFor="gen-tag">{g.fieldTag}</label>
            <input
              id="gen-tag"
              type="text"
              value={tag}
              maxLength={40}
              onChange={(e) => setTag(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="gen-field">
            <label htmlFor="gen-fr">
              {g.fieldDescFr}
              <em className={frCount === 7 ? 'ok' : ''}>{g.sentenceCount.replace('{{n}}', String(frCount))}</em>
            </label>
            <textarea id="gen-fr" value={descFr} onChange={(e) => setDescFr(e.target.value)} disabled={busy} />
          </div>

          <div className="gen-field">
            <label htmlFor="gen-en">
              {g.fieldDescEn}
              <em className={enCount === 7 ? 'ok' : ''}>{g.sentenceCount.replace('{{n}}', String(enCount))}</em>
            </label>
            <textarea id="gen-en" value={descEn} onChange={(e) => setDescEn(e.target.value)} disabled={busy} />
            <p className="gen-hint">{g.sevenSentences}</p>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={busy}
            />
            {g.active}
          </label>
        </div>

        <footer className="gen-modal-foot">
          <button type="button" className="supervisor-page-action" onClick={onClose} disabled={busy}>
            {g.cancel}
          </button>
          <button type="submit" className="supervisor-page-action" disabled={busy || !name.trim()}>
            {initial ? <Save size={14} /> : <Plus size={14} />}
            {busy ? g.saving : initial ? g.save : g.create}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
