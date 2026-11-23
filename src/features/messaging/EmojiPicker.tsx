import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useT } from '../../config/i18n';

const EMOJI_CATEGORIES: { id: string; label: string; emojis: string[] }[] = [
  {
    id: 'smileys',
    label: 'Smileys',
    emojis: ['😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤔','😅','😭','😡','🤯','🥳','😴','🤗','🤩','😇','🙃'],
  },
  {
    id: 'gestures',
    label: 'Gestures',
    emojis: ['👍','👎','👏','🙌','🤝','💪','✌️','🤞','👋','🙏','👌','🤙','✋','👊','🫶','🤟'],
  },
  {
    id: 'hearts',
    label: 'Hearts',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💖','💘','💝','💞','💓','💗','💕'],
  },
  {
    id: 'animals',
    label: 'Animals',
    emojis: ['🐶','🐱','🦁','🐯','🐼','🦊','🐸','🐵','🦅','🐉','🐢','🦋','🐝','🦄','🐺','🐮'],
  },
  {
    id: 'objects',
    label: 'Objects',
    emojis: ['🔥','⭐','✨','💫','🎉','🎊','🎈','📚','✏️','🎨','🏆','⚔️','🎯','🎮','🎬','🎤'],
  },
];

const RECENTS_KEY = 'reztoon_emoji_recents';

interface Props {
  userId?: string;
  onPick: (emoji: string) => void;
  onClose?: () => void;
}

export default function EmojiPicker({ userId, onPick, onClose }: Props) {
  const t = useT();
  const [activeTab, setActiveTab] = useState(EMOJI_CATEGORIES[0].id);
  const [search, setSearch] = useState('');
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const key = userId ? `${RECENTS_KEY}_${userId}` : RECENTS_KEY;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handlePick = (emoji: string) => {
    const next = [emoji, ...recents.filter((x) => x !== emoji)].slice(0, 16);
    setRecents(next);
    try {
      const key = userId ? `${RECENTS_KEY}_${userId}` : RECENTS_KEY;
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    onPick(emoji);
  };

  const visibleEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return EMOJI_CATEGORIES.flatMap((c) =>
        c.label.toLowerCase().includes(q) ? c.emojis : [],
      );
    }
    return EMOJI_CATEGORIES.find((c) => c.id === activeTab)?.emojis ?? [];
  }, [activeTab, search]);

  return (
    <div className="emoji-picker" ref={rootRef}>
      <header className="emoji-picker-head">
        <div className="emoji-picker-search">
          <Search size={12} />
          <input
            type="text"
            placeholder={t.messaging.searchEmoji}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {onClose && (
          <button
            type="button"
            className="emoji-picker-close"
            onClick={onClose}
            aria-label={t.common.close}
          >
            <X size={13} />
          </button>
        )}
      </header>

      {!search.trim() && recents.length > 0 && (
        <>
          <div className="emoji-picker-label">{t.messaging.recents}</div>
          <div className="emoji-picker-grid">
            {recents.map((e) => (
              <button
                key={`r-${e}`}
                type="button"
                className="emoji-picker-btn"
                onClick={() => handlePick(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}

      {!search.trim() && (
        <nav className="emoji-picker-tabs" role="tablist">
          {EMOJI_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={activeTab === c.id}
              className={`emoji-picker-tab ${activeTab === c.id ? 'active' : ''}`}
              onClick={() => setActiveTab(c.id)}
              title={c.label}
            >
              {c.emojis[0]}
            </button>
          ))}
        </nav>
      )}

      <div className="emoji-picker-grid">
        {visibleEmojis.length === 0 ? (
          <span className="emoji-picker-empty">{t.messaging.noEmojiFound}</span>
        ) : (
          visibleEmojis.map((e) => (
            <button
              key={e}
              type="button"
              className="emoji-picker-btn"
              onClick={() => handlePick(e)}
            >
              {e}
            </button>
          ))
        )}
      </div>
    </div>
  );
}