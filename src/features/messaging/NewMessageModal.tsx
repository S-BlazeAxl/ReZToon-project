import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Users, Plus, PenSquare, Loader2 } from 'lucide-react';
import { useMessagingContext } from './MessagingContext';
import { searchContacts, type Contact } from '../../core/services/contactService';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { useT } from '../../config/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewMessageModal({ open, onClose }: Props) {
  const user = useCurrentUser();
  const m = useMessagingContext();
  const t = useT();

  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) {
      setContacts([]);
      return;
    }

    const q = query.trim();
    if (!q) {
      setContacts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchContacts(q, user.id);
        if (!cancelled) setContacts(results.slice(0, 20));
      } catch (err) {
        console.error("Failed to search contacts:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, user]);

  if (!open || !user) return null;

  const startWith = (id: string) => {
    m.startConversation(id);
    setQuery('');
    onClose();
  };

  return createPortal(
    <div
      className="message-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setQuery('');
          onClose();
        }
      }}
    >
      <div className="message-modal">
        <header className="message-modal-header">
          <div className="message-modal-title">
            <PenSquare size={16} />
            <h3>{t.messaging.newMessage}</h3>
          </div>
          <button
            type="button"
            className="message-icon-btn"
            onClick={() => {
              setQuery('');
              onClose();
            }}
            aria-label={t.common.close}
          >
            <X size={14} />
          </button>
        </header>

        <div className="message-modal-search">
          <Search size={14} />
          <input
            type="text"
            placeholder={t.messaging.searchContacts}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="message-modal-body">
          {loading ? (
            <div className="message-empty">
              <Loader2 size={28} className="spin" style={{ color: 'var(--primary)' }} />
              <p>{t.messaging.searching}</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="message-empty">
              <Users size={28} />
              <p>{t.messaging.noContacts}</p>
              <span>{query ? t.messaging.tryAnotherName : t.messaging.searchSomeone}</span>
            </div>
          ) : (
            <ul className="message-contact-list">
              {contacts.map((c: Contact) => (
                <li
                  key={c.id}
                  className="message-contact-item"
                  onClick={() => startWith(c.id)}
                >
                  <div className="message-contact-avatar">
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span>{c.name.charAt(0).toUpperCase()}</span>
                    )}
                    {c.online && <span className="message-conv-online" />}
                  </div>
                  <div className="message-contact-info">
                    <div className="message-contact-top">
                      <strong>{c.name}</strong>
                      <span className={`message-contact-role role-${c.role}`}>
                        {c.role === 'creator' || c.role === 'both' ? t.common.roleCreator : t.common.roleReader}
                      </span>
                    </div>
                    <span className="message-contact-sub">
                      @{c.username} · {c.genre} · {c.country}
                    </span>
                    <p className="message-contact-bio">{c.bio}</p>
                  </div>
                  <span className="message-contact-action">
                    <Plus size={14} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}