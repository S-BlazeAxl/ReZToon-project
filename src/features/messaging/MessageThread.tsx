import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, MoreVertical, Star, Pin, BellOff, Bell, BookOpen, Users,
  Archive, AlertTriangle, ChevronDown, X, Trash2, MessagesSquare, Info
} from 'lucide-react';
import { useMessagingContext } from './MessagingContext';
import { formatRelative } from '../../core/hooks/useMessaging';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import GroupInfoModal from '../community/GroupInfoModal';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import { useT, useI18n } from '../../config/i18n';
import type { Message } from '../../core/services/messageService';

export default function MessageThread() {
  const m = useMessagingContext();
  const user = useCurrentUser();
  const t = useT();
  const { lang } = useI18n();
  
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';

  const [showMenu, setShowMenu] = useState(false);
  const [showPinned, setShowPinned] = useState(true);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isGroup = m.activeType === 'group';
  const conv = m.activeConversation;
  const group = m.activeGroup;

  const messagesById = useMemo(() => {
    const map = new Map<string, Message>();
    m.messages.forEach((msg) => map.set(msg.id, msg));
    return map;
  }, [m.messages]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [m.messages.length, m.activeId, m.activeType]);

  useEffect(() => {
    setReplyTo(null); setShowMenu(false); setShowGroupInfo(false);
  }, [m.activeId, m.activeType]);

  if (!conv && !group) return null;

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const scrollToMessage = (id: string) => {
    const el = document.querySelector(`[data-msg-id="${id}"]`);
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const labels = conv && Array.isArray(conv.labels) ? conv.labels : [];
  const pinned = Array.isArray(m.pinnedMessages) ? m.pinnedMessages : [];
  const grouped = Array.isArray(m.groupedMessages) ? m.groupedMessages : [];

  const headerTitle = isGroup ? group?.name ?? t.messaging.group : conv?.userName ?? '';
  
  const headerSubtitle = isGroup && group
    ? `${group.members.length} ${t.messaging.members} · ${group.genre}`
    : conv?.online ? t.messaging.online
      : conv ? `${t.messaging.lastSeen} ${formatRelative(conv.lastDate, locale)}` : '';

  return (
    <>
      <header className="message-thread-header">
        <button 
          type="button" 
          className="message-thread-back" 
          onClick={m.closeConversation} 
          aria-label={t.messaging.backToConversations}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="message-thread-avatar-wrap">
          <div
            className={`message-thread-avatar ${isGroup ? 'avatar-group' : ''}`}
            style={isGroup && group ? { background: group.color } : undefined}
          >
            {isGroup ? <Users size={20} />
              : conv?.userPhoto ? <img src={conv.userPhoto} alt={conv.userName} />
                : (conv?.userName ?? '?').charAt(0).toUpperCase()}
          </div>
          {!isGroup && conv?.online && <span className="message-conv-online" />}
        </div>

        <div className="message-thread-info">
          <h4>{headerTitle}</h4>
          <span className="message-thread-status">
            {!isGroup && conv?.online
              ? <span className="message-online">● {t.messaging.online}</span>
              : headerSubtitle}
          </span>
        </div>

        <div className="thread-actions">
          {isGroup && group && (
            <button 
              type="button" 
              className="message-icon-btn" 
              onClick={() => setShowGroupInfo(true)}
              aria-label={t.messaging.groupInfo}
            >
              <Info size={16} />
            </button>
          )}
          <button 
            type="button" 
            className="message-icon-btn" 
            onClick={() => setShowMenu((v) => !v)}
            aria-label={t.messaging.moreOptions}
          >
            <MoreVertical size={16} />
          </button>
        </div>

        {showMenu && (
          <div className="message-thread-menu">
            {!isGroup && conv && (
              <>
                <button type="button" onClick={() => { m.starActive(); setShowMenu(false); }}>
                  <Star size={13} /> {conv.starred ? t.messaging.unstar : t.messaging.star}
                </button>
                <button type="button" onClick={() => { m.pinActive(); setShowMenu(false); }}>
                  <Pin size={13} /> {conv.pinned ? t.messaging.unpin : t.messaging.pin}
                </button>
                <button type="button" onClick={() => { m.muteActive(); setShowMenu(false); }}>
                  {conv.muted ? <Bell size={13} /> : <BellOff size={13} />}
                  {conv.muted ? t.messaging.unmute : t.messaging.mute}
                </button>
                <div className="message-thread-menu-sep" />
                <button type="button" onClick={() => m.labelActive('trade')}>
                  <BookOpen size={13} /> {labels.includes('trade') ? t.messaging.removeTrade : t.messaging.markTrade}
                </button>
                <button type="button" onClick={() => m.labelActive('collab')}>
                  <Users size={13} /> {labels.includes('collab') ? t.messaging.removeCollab : t.messaging.markCollab}
                </button>
                <div className="message-thread-menu-sep" />
                <button type="button" onClick={() => { m.archiveActive(); setShowMenu(false); }}>
                  <Archive size={13} /> {conv.archived ? t.messaging.unarchive : t.messaging.archive}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    if (window.confirm(t.messaging.deleteConversationWith.replace('{{name}}', conv.userName))) {
                      m.removeConversation(conv.userId);
                    }
                    setShowMenu(false);
                  }}
                >
                  <Trash2 size={13} /> {t.messaging.deleteConversation}
                </button>
                <button type="button" className="danger" onClick={() => { m.spamActive(); setShowMenu(false); }}>
                  <AlertTriangle size={13} /> {conv.spam ? t.messaging.notSpam : t.messaging.reportSpam}
                </button>
              </>
            )}
            {isGroup && group && (
              <>
                <button type="button" onClick={() => { m.toggleGroupStar(group.id); setShowMenu(false); }}>
                  <Star size={13} /> {t.messaging.starGroup}
                </button>
                <button type="button" onClick={() => { m.toggleGroupPin(group.id); setShowMenu(false); }}>
                  <Pin size={13} /> {t.messaging.pinGroup}
                </button>
                <button type="button" onClick={() => { m.toggleGroupMute(group.id); setShowMenu(false); }}>
                  <BellOff size={13} /> {t.messaging.muteGroup}
                </button>
                <div className="message-thread-menu-sep" />
                <button type="button" onClick={() => { m.toggleGroupArchive(group.id); setShowMenu(false); }}>
                  <Archive size={13} /> {t.messaging.archiveGroup}
                </button>
                <button type="button" onClick={() => { setShowGroupInfo(true); setShowMenu(false); }}>
                  <Info size={13} /> {t.messaging.groupInfo}
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {pinned.length > 0 && (
        <div className={`message-pinned ${showPinned ? 'open' : 'closed'}`}>
          <button type="button" className="message-pinned-toggle" onClick={() => setShowPinned((v) => !v)}>
            <Pin size={12} />
            <span>{pinned.length} {t.messaging.pinnedMessages}</span>
            <ChevronDown size={12} className={`message-pinned-chevron ${showPinned ? 'up' : ''}`} />
          </button>
          {showPinned && (
            <ul className="message-pinned-list">
              {pinned.map((pm) => (
                <li key={pm.id} className="message-pinned-item" onClick={() => scrollToMessage(pm.id)}>
                  <div className="message-pinned-info">
                    <strong>
                      {isGroup ? pm.senderName ?? t.messaging.member
                        : pm.senderId === m.activeId ? conv?.userName ?? t.messaging.member : t.messaging.you}
                    </strong>
                    <p>{(pm.text ?? '').slice(0, 100) || `📎 ${t.messaging.attachment}`}</p>
                  </div>
                  <button
                    type="button"
                    className="message-pinned-unpin"
                    onClick={(e) => { e.stopPropagation(); m.pinMessage(pm.id); }}
                    aria-label={t.messaging.unpin}
                  >
                    <X size={11} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="message-thread-messages" ref={scrollRef}>
        {grouped.map((group) => {
          const localizedDay =
            group.day === 'Today' ? t.messaging.today
              : group.day === 'Yesterday' ? t.messaging.yesterday
                : group.day;

          return (
            <div key={group.day} className="message-day">
              <div className="message-day-sep"><span>{localizedDay}</span></div>
              {group.items.map((msg) => {
                const isMine = user ? msg.senderId === user.id : false;
                return (
                  <div key={msg.id} data-msg-id={msg.id}>
                    <MessageBubble
                      message={msg}
                      isMine={isMine}
                      isGroup={isGroup}
                      otherName={isGroup ? msg.senderName ?? t.messaging.member : conv?.userName ?? ''}
                      otherUserId={msg.senderId}
                      isPinned={pinned.some((p) => p.id === msg.id)}
                      isExpanded={expanded.has(msg.id)}
                      isReadByUser={m.isRead(msg.id)}
                      replyPreview={msg.replyToId ? messagesById.get(msg.replyToId) ?? null : null}
                      onToggleExpand={() => toggleExpand(msg.id)}
                      onReply={() => setReplyTo(msg)}
                      onDelete={() => {
                        if (window.confirm(t.messaging.deleteMessage)) m.removeMessage(msg.id);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      <MessageComposer replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />

      {isGroup && group && showGroupInfo && (
        <GroupInfoModal group={group} onClose={() => setShowGroupInfo(false)} />
      )}
    </>
  );
}

export function EmptyThread() {
  const m = useMessagingContext();
  const t = useT();
  const convs = Array.isArray(m.conversations) ? m.conversations : [];
  const groups = Array.isArray(m.groupConversations) ? m.groupConversations : [];
  const total = convs.length + groups.length;

  return (
    <div className="message-thread-placeholder">
      <MessagesSquare size={48} />
      <h3>{t.messaging.yourMessages}</h3>
      <p>{t.messaging.selectConv}</p>
      <span className="message-thread-placeholder-hint">
        {total} {t.messaging.conversations}
      </span>
    </div>
  );
}