export * from './userService';
export * from './mangaService';
export * from './catalogueService';
export * from './contentService';
export * from './communityService';
export * from './messageService';
export * from './followService';
export * from './libraryService';
export * from './reviewService';
export * from './chapterCommentService';

export type {
  CreatorWork,
  SuggestedCreator as CreatorSuggestedCreator,
} from './creatorService';
export {
  getAllCreators,
  getCreatorById,
  getCreatorsByIds,
  getSuggestedCreatorsForUser,
  getFollows,
  getFollowingBooks,
} from './creatorService';

export type {
  EventTemplate,
  EventBgType,
  EventCategory,
  EventStat,
  EventDesign,
  CommunityEvent as EventCommunityEvent,
} from './eventService';
export {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  DEFAULT_EVENT_DESIGN,
  EVENT_BG_PRESETS,
  EVENT_ACCENT_COLORS,
  EVENT_TEXT_COLORS,
  EVENT_ICONS,
  getEvents,
  getEventsByCategory,
  getUpcomingEvents,
  getFeaturedEvents,
  getEventById,
  addEvent,
  updateEvent,
  deleteEvent,
} from './eventService';

export * from './awardsService';

export type {
  CharacterRole,
  MangaCharacter,
} from './characterService';
export {
  ROLE_LABELS as CHARACTER_ROLE_LABELS,
  ROLE_COLORS,
  getAllCharacters,
  getCharactersBySeries,
  getGenresFromCharacters,
  getCharactersByGenre,
  getCharactersByRole,
  getCharacterById,
} from './characterService';

export * from './contactService';
export * from './audioService';
export * from './readerService';
export * from './recommendationService';
export * from './reportService';

export type {
  TeamRole,
  ChapterWorkflow,
  TeamMember,
  SeriesTeam,
  VersionSnapshot,
} from './collaborationService';
export {
  ROLE_LABELS as TEAM_ROLE_LABELS,
  ROLE_PERMISSIONS,
  getTeam,
  ensureTeam,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  recordVersion,
  getVersionsForSeries,
} from './collaborationService';

export * from './weeklyService';

export * from './genreService';

export * from './feedbackService';
