import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import type { Genre, GenreUsage } from '../../../core/services/genreService';
import { useT } from '../../../config/i18n';

interface Props {
  genre: Genre | null;
  usage?: GenreUsage;
  /** Autres genres disponibles comme remplaçants. */
  others: Genre[];
  onClose: () => void;
  /** Retourne un message d'erreur, ou null si tout s'est bien passé. */
  onConfirm: (reassignTo?: string) => Promise<string | null>;
}

export default function GenreDeleteModal({ genre, usage, others, onClose, onConfirm }: Props) {
  const t = useT();
  const g = t.genresAdmin;
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = usage ? usage.series + usage.groups + usage.posts + usage.characters : 0;
  const used = total > 0;

  useEffect(() => {
    setTarget('');
    setError(null);
    setBusy(false);
  }, [genre]);

  useEffect(() => {
    if (!genre) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [genre, busy, onClose]);

  if (!genre) return null;

  const confirm = async () => {
    if (used && !target) {
      setError(g.deleteNeedsReassign);
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onConfirm(used ? target : undefined);
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
      <div className="gen-modal narrow" role="alertdialog" aria-modal="true">
        <header className="gen-modal-head">
          <h2>{g.deleteTitle}</h2>
          <button type="button" className="gen-close" onClick={onClose} disabled={busy} aria-label={t.common.cancel}>
            <X size={15} />
          </button>
        </header>

        <div className="gen-modal-body">
          {error && <div className="gen-error" role="alert">{error}</div>}

          <p className="gen-text">
            {used
              ? g.deleteUsedText.replace('{{name}}', genre.name).replace('{{n}}', String(total))
              : g.deleteUnusedText.replace('{{name}}', genre.name)}
          </p>

          {used && (
            <div className="gen-field">
              <label htmlFor="gen-reassign">{g.deleteReassignLabel}</label>
              <select
                id="gen-reassign"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={busy}
              >
                <option value="">{g.deleteReassignPlaceholder}</option>
                {others.map((o) => (
                  <option key={o.id} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <footer className="gen-modal-foot">
          <button type="button" className="supervisor-page-action" onClick={onClose} disabled={busy}>
            {g.cancel}
          </button>
          <button type="button" className="supervisor-page-action danger" onClick={confirm} disabled={busy}>
            <Trash2 size={14} /> {g.deleteConfirm}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
