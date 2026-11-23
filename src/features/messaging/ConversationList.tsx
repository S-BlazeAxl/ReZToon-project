import { useEffect, useState } from 'react';
import {
  Search, X, Inbox, Star, BellOff, Archive, CheckSquare, Square,
  Volume2, VolumeX, Users,
} from 'lucide-react';
import { useMessagingContext } from './MessagingContext';
import { formatRelativeTime } from '../../core/utils/format';
import { useT, useI18n } from '../../config/i18n';

interface UnifiedItem {
  id: string;
  type: 'dm' | 'group';
  name: string;
  photo?: string;
  online: boolean;
  lastMessage: string;
  lastDate: string;
  unread: number;
  pinned: boolean;
  muted: boolean;
  starred: boolean;
  memberCount?: number;
  groupColor?: string;
}

export default function ConversationList() {
  const m = useMessagingContext();
  const t = useT();
  const { lang } = useI18n();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, [m.activeLabel]);

  const dmItems: UnifiedItem[] = (Array.isArray(m.visibleConversations) ? m.visibleConversations : []).map((c) => ({
    id: c.userId, type: 'dm', name: c.userName, photo: c.userPhoto, online: Boolean(c.online),
    lastMessage: c.lastMessage, lastDate: c.lastDate, unread: c.unread,
    pinned: c.pinned, muted: c.muted, starred: c.starred,
  }));

  const groupItems: UnifiedItem[] = (Array.isArray(m.groupConversations) ? m.groupConversations : [])
    .filter((g) => m.activeLabel === 'archive' ? g.archived : !g.archived)
    .map((g) => ({
      id: g.groupId, type: 'group', name: g.groupName, online: false,
      lastMessage: g.lastMessage || t.messaging.newConversation, lastDate: g.lastDate,
      unread: g.unread, pinned: g.pinned, muted: g.muted, starred: g.starred,
      memberCount: g.memberCount, groupColor: g.groupColor,
    }));

  const list: UnifiedItem[] = [...dmItems, ...groupItems].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
  });

  const allSelected = list.length > 0 && list.every((c) => selected.has(itemKey(c)));

  function itemKey(c: UnifiedItem): string {
    return `${c.type}:${c.id}`;
  }

  const toggleOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(list.map((c) => itemKey(c))));
  };

  const confirmArchive = async () => {
    if (selected.size === 0) return;
    const dmIds: string[] = [];
    const groupIds: string[] = [];
    for (const key of selected) {
      const [type, id] = key.split(':');
      if (type === 'dm') dmIds.push(id);
      else if (type === 'group') groupIds.push(id);
    }

    const breakdown = [
      dmIds.length > 0 ? t.messaging.archiveBreakdownDm.replace('{{n}}', String(dmIds.length)) : '',
      groupIds.length > 0 ? t.messaging.archiveBreakdownGroup.replace('{{n}}', String(groupIds.length)) : '',
    ].filter(Boolean).join(' · ');

    const ok = window.confirm(
      t.messaging.archiveConfirm
        .replace('{{n}}', String(selected.size))
        .replace('{{breakdown}}', breakdown)
    );
    if (!ok) return;

    if (dmIds.length > 0) await m.archiveConversations(dmIds);
    for (const groupId of groupIds) m.toggleGroupArchive(groupId);

    setSelected(new Set());
    setSelectMode(false);
  };

  const handleItemClick = (item: UnifiedItem) => {
    if (selectMode) { toggleOne(itemKey(item)); return; }
    if (item.type === 'group') m.selectGroup(item.id);
    else m.selectConversation(item.id);
  };

  const isActiveItem = (item: UnifiedItem): boolean => {
    if (item.type === 'group') return m.activeType === 'group' && m.activeId === item.id;
    return m.activeType === 'dm' && m.activeId === item.id;
  };

  return (
    <div className="message-list">
      <div className="message-search">
        <Search size={14} />
        <input
          type="text"
          placeholder={t.messaging.searchConversations}
          value={m.query}
          onChange={(e) => m.setQuery(e.target.value)}
        />
        {m.query && (
          <button type="button" className="message-search-clear" onClick={() => m.setQuery('')} aria-label={t.messaging.clear}>
            <X size={11} />
          </button>
        )}
      </div>

      <div className="message-list-toolbar">
        {!selectMode ? (
          <>
            <button type="button" className="message-toolbar-btn" onClick={() => { setSelectMode(true); setSelected(new Set()); }} disabled={list.length === 0}>
              <CheckSquare size={13} /><span>{t.messaging.select}</span>
            </button>
            <button type="button" className="message-toolbar-btn icon-only" onClick={() => m.setSoundEnabled(!m.soundEnabled)} title={m.soundEnabled ? t.messaging.mute : t.messaging.unmute}>
              {m.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="message-toolbar-btn" onClick={toggleAll} disabled={list.length === 0}>
              {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
              <span>{allSelected ? t.messaging.none : t.messaging.all}</span>
            </button>
            <span className="message-toolbar-count">{selected.size} {t.messaging.selected}</span>
            <button type="button" className="message-toolbar-btn" onClick={confirmArchive} disabled={selected.size === 0}>
              <Archive size={13} /><span>{t.messaging.archive}</span>
            </button>
            <button type="button" className="message-toolbar-btn" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>
              <X size={13} /><span>{t.common.cancel}</span>
            </button>
          </>
        )}
      </div>

      {list.length === 0 ? (
        <div className="message-empty">
          <Inbox size={28} />
          <p>{t.messaging.noConversations}</p>
          <span>{m.query ? t.messaging.tryAnotherSearch : t.messaging.inboxEmpty}</span>
        </div>
      ) : (
        <ul className="message-conv-list">
          {list.map((c) => {
            const key = itemKey(c);
            const isSelected = selected.has(key);
            const active = isActiveItem(c);

            return (
              <li
                key={key}
                className={[
                  'message-conv-item',
                  c.unread > 0 ? 'unread' : '',
                  c.pinned ? 'pinned' : '',
                  active ? 'active' : '',
                  selectMode ? 'select-mode' : '',
                  isSelected ? 'selected' : '',
                  c.type === 'group' ? 'is-group' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleItemClick(c)}
              >
                {selectMode && (
                  <span className="message-conv-checkbox">
                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </span>
                )}

                <div className="message-conv-avatar-wrap">
                  <div className={`message-conv-avatar ${c.type === 'group' ? 'avatar-group' : ''}`} style={c.type === 'group' ? { background: c.groupColor ?? '#f5b042' } : undefined}>
                    {c.type === 'group' ? <Users size={18} /> : c.photo ? <img src={c.photo} alt={c.name} /> : (c.name || '?').charAt(0).toUpperCase()}
                  </div>
                  {c.type === 'dm' && c.online && <span className="message-conv-online" />}
                </div>

                <div className="message-conv-content">
                  <div className="message-conv-top">
                    <strong style={{ fontWeight: c.unread > 0 ? 900 : 700 }}>
                      {c.name}
                      {c.type === 'group' && (
                        <span className="message-conv-group-badge"><Users size={9} /> {c.memberCount}</span>
                      )}
                    </strong>
                    <span className="message-conv-date" style={{ color: c.unread > 0 ? 'var(--primary)' : undefined, fontWeight: c.unread > 0 ? 700 : 500 }}>
                      {formatRelativeTime(c.lastDate, lang)}
                    </span>
                  </div>
                  <p className="message-conv-preview" style={{ color: c.unread > 0 ? '#fff' : undefined }}>
                    {c.muted && <BellOff size={10} />}
                    {c.lastMessage || <em>{t.messaging.newConversation}</em>}
                  </p>
                </div>

                <div className="message-conv-right">
                  {c.starred && <Star size={12} fill="currentColor" className="message-conv-star" />}
                  {c.unread > 0 && <span className="message-conv-badge">{c.unread}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}