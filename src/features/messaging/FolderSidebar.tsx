import { Inbox, Star, BookOpen, Users, Archive, AlertTriangle, PenSquare } from 'lucide-react';
import { useMessagingContext } from './MessagingContext';
import { MESSAGE_LABELS, type MessageLabel } from '../../core/hooks/useMessaging';
import { useT } from '../../config/i18n';

const ICONS: Record<string, typeof Inbox> = {
  Inbox, Star, BookOpen, Users, Archive, AlertTriangle,
};

interface Props {
  onCompose: () => void;
}

export default function FolderSidebar({ onCompose }: Props) {
  const m = useMessagingContext();
  const t = useT();

  const folderLabel = (id: MessageLabel): string => {
    switch (id) {
      case 'inbox': return t.messaging.folderInbox;
      case 'starred': return t.messaging.folderStarred;
      case 'trade': return t.messaging.folderTrade;
      case 'collab': return t.messaging.folderCollab;
      case 'archive': return t.messaging.folderArchive;
      case 'spam': return t.messaging.folderSpam;
      default: return id;
    }
  };

  return (
    <div className="message-folders">
      <div className="message-folders-head">
        <Inbox size={18} />
        <h2>{t.messaging.messages}</h2>
        {m.totalUnread > 0 && <span className="message-folders-badge">{m.totalUnread}</span>}
      </div>

      <button type="button" className="message-new-btn" onClick={onCompose}>
        <PenSquare size={15} /> {t.messaging.newMessage}
      </button>

      <nav className="message-folder-list">
        {MESSAGE_LABELS.map((label) => {
          const Icon = ICONS[label.icon] ?? Inbox;
          const active = m.activeLabel === label.id;
          const count = m.labelCounts[label.id];
          return (
            <button
              key={label.id}
              type="button"
              className={`message-folder-item ${active ? 'active' : ''}`}
              onClick={() => {
                m.setActiveLabel(label.id);
                m.closeConversation();
              }}
            >
              <Icon size={14} />
              <span>{folderLabel(label.id)}</span>
              {count > 0 && <span className="message-folder-count">{count}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}