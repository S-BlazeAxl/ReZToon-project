import { describe, it, expect } from 'vitest';
import { formatNotification, labelFor } from '../../utils/notificationText';
import type { Notification } from '../../services/messageService';

const templates: Record<string, string> = {
  someone: 'Someone',
  manga_liked: '{actor} liked {entity}',
  manga_liked_many: '{actor} and {others} others liked {entity}',
  chapter_released: 'Chapter {chapter} of {entity} is out',
  team_invited: '{actor} added you as {role}',
};

const base: Notification = {
  id: '1', userId: 'u', type: 'like', title: 'New like', message: 'fallback text', date: new Date().toISOString(),
  read: false, event: 'manga_liked', actorId: 'a', actorName: 'Aya', actorPhoto: null, link: '/manga/1',
  entityType: 'manga', entityId: '1', entityTitle: 'Akan Rebirth', count: 1, meta: {},
};

describe('formatNotification', () => {
  it('renders a single action with bold actor and entity', () => {
    const r = formatNotification(base, templates, 'en');
    expect(r.plain).toBe('Aya liked Akan Rebirth');
    expect(r.parts.filter((p) => p.strong).map((p) => p.text)).toEqual(['Aya', 'Akan Rebirth']);
  });

  it('uses the grouped variant when several people acted', () => {
    const r = formatNotification({ ...base, count: 4 }, templates, 'en');
    expect(r.plain).toBe('Aya and 3 others liked Akan Rebirth');
  });

  it('fills meta values and translates roles', () => {
    expect(formatNotification({ ...base, event: 'chapter_released', meta: { chapter: 12 } }, templates, 'en').plain)
      .toBe('Chapter 12 of Akan Rebirth is out');
    expect(formatNotification({ ...base, event: 'team_invited', meta: { role: 'colorist' } }, templates, 'en').plain)
      .toBe('Aya added you as Colorist');
    expect(labelFor('fr', 'colorist')).toBe('coloriste');
  });

  it('falls back to the stored text for legacy or unknown events', () => {
    expect(formatNotification({ ...base, event: null }, templates, 'en').plain).toBe('fallback text');
    expect(formatNotification({ ...base, event: 'unknown_event' }, templates, 'en').plain).toBe('fallback text');
  });
});
