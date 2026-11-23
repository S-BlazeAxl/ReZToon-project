import { useState } from 'react';
import { MessagingProvider, useMessagingContext } from './MessagingContext';
import FolderSidebar from './FolderSidebar';
import ConversationList from './ConversationList';
import MessageThread, { EmptyThread } from './MessageThread';
import NewMessageModal from './NewMessageModal';
import MessagingErrorBoundary from './ErrorBoundary';
import { useT } from '../../config/i18n';
import '../../styles/message-style.css';

interface ShellProps {
  mode: 'page' | 'panel';
}

export default function MessagingShell({ mode }: ShellProps) {
  const t = useT();
  return (
    <MessagingErrorBoundary fallbackMessage={t.messaging.messagingFailed}>
      <MessagingProvider>
        <ShellInner mode={mode} />
      </MessagingProvider>
    </MessagingErrorBoundary>
  );
}

function ShellInner({ mode }: ShellProps) {
  const m = useMessagingContext();
  const [composeOpen, setComposeOpen] = useState(false);

  const wrapperClass = `message-page ${mode === 'panel' ? 'message-page--panel' : ''}`;

  return (
    <>
      <main className={wrapperClass}>
        <aside className="message-grid message-grid-folders">
          <FolderSidebar onCompose={() => setComposeOpen(true)} />
        </aside>

        <section className={`message-grid message-grid-list ${m.activeId ? 'has-active' : ''}`}>
          <ConversationList />
        </section>

        <section className={`message-grid message-grid-thread ${m.activeId ? 'open' : ''}`}>
          <div className="message-thread">
            {m.activeId ? <MessageThread /> : <EmptyThread />}
          </div>
        </section>
      </main>

      <NewMessageModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </>
  );
}