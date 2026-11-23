import { supabase } from '../lib/supabase';

export type TeamRole =
  | 'writer'
  | 'artist'
  | 'colorist'
  | 'letterer'
  | 'translator'
  | 'editor';

export type ChapterWorkflow = 'draft' | 'review' | 'published';

export interface TeamMember {
  userId: string;
  userName: string;
  role: TeamRole;
  joinedAt: string;
  permissions: {
    canEditScript: boolean;
    canEditArt: boolean;
    canPublish: boolean;
  };
}

export interface SeriesTeam {
  id: string;
  seriesId: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: string;
}

export interface VersionSnapshot {
  id: string;
  seriesId: string;
  chapterId: string;
  number: number;
  timestamp: string;
  authorId: string;
  authorName: string;
  workflow: ChapterWorkflow;
  title: string;
  summary: string;
  note?: string;
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  writer: 'Writer',
  artist: 'Artist',
  colorist: 'Colorist',
  letterer: 'Letterer',
  translator: 'Translator',
  editor: 'Editor',
};

export const ROLE_PERMISSIONS: Record<TeamRole, TeamMember['permissions']> = {
  writer: { canEditScript: true, canEditArt: false, canPublish: false },
  artist: { canEditScript: false, canEditArt: true, canPublish: false },
  colorist: { canEditScript: false, canEditArt: true, canPublish: false },
  letterer: { canEditScript: false, canEditArt: true, canPublish: false },
  translator: { canEditScript: true, canEditArt: false, canPublish: false },
  editor: { canEditScript: true, canEditArt: true, canPublish: true },
};

export async function getTeam(seriesId: string): Promise<SeriesTeam | null> {
  const { data: team, error } = await supabase
    .from('teams')
    .select('*, team_members(*)')
    .eq('series_id', seriesId)
    .maybeSingle();

  if (error || !team) return null;

  return {
    id: team.id,
    seriesId: team.series_id,
    ownerId: team.owner_id,
    createdAt: team.created_at,
    members: (team.team_members || []).map((m: any) => ({
      userId: m.user_id,
      userName: m.user_name,
      role: m.role as TeamRole,
      joinedAt: m.joined_at,
      permissions: ROLE_PERMISSIONS[m.role as TeamRole],
    })),
  };
}

export async function ensureTeam(seriesId: string, ownerId: string): Promise<SeriesTeam> {
  const existing = await getTeam(seriesId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('teams')
    .insert({ series_id: seriesId, owner_id: ownerId })
    .select()
    .single();

  if (error || !data) throw new Error('Could not create team');

  return {
    id: data.id,
    seriesId: data.series_id,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    members: [],
  };
}

export async function addTeamMember(
  seriesId: string,
  ownerId: string,
  member: { userId: string; userName: string; role: TeamRole },
): Promise<{ success: boolean; message: string }> {
  const team = await ensureTeam(seriesId, ownerId);

  const { error } = await supabase.from('team_members').insert({
    team_id: team.id,
    user_id: member.userId,
    user_name: member.userName,
    role: member.role,
    joined_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === '23505') return { success: false, message: 'Member already in team' };
    return { success: false, message: error.message };
  }

  return {
    success: true,
    message: `${member.userName} added as ${ROLE_LABELS[member.role]}`,
  };
}

export async function removeTeamMember(seriesId: string, userId: string): Promise<boolean> {
  const team = await getTeam(seriesId);
  if (!team) return false;

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', team.id)
    .eq('user_id', userId);

  return !error;
}

export async function updateMemberRole(
  seriesId: string,
  userId: string,
  role: TeamRole,
): Promise<boolean> {
  const team = await getTeam(seriesId);
  if (!team) return false;

  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', team.id)
    .eq('user_id', userId);

  return !error;
}

export async function recordVersion(
  snapshot: Omit<VersionSnapshot, 'id' | 'timestamp'>,
): Promise<VersionSnapshot | null> {
  const { data, error } = await supabase
    .from('series_versions')
    .insert({
      series_id: snapshot.seriesId,
      chapter_id: snapshot.chapterId,
      title: snapshot.title,
      summary: snapshot.summary,
      workflow: snapshot.workflow,
      author_id: snapshot.authorId,
      author_name: snapshot.authorName,
      ...(snapshot.note ? { note: snapshot.note } : {}),
    })
    .select()
    .single();

  if (error || !data) return null;
  return { ...snapshot, id: data.id, timestamp: data.timestamp };
}

export async function getVersionsForSeries(seriesId: string): Promise<VersionSnapshot[]> {
  const { data } = await supabase
    .from('series_versions')
    .select('*')
    .eq('series_id', seriesId)
    .order('timestamp', { ascending: false });

  if (!data) return [];

  return data.map((d: any, index: number) => ({
    id: d.id,
    seriesId: d.series_id,
    chapterId: d.chapter_id,
    number: data.length - index,
    timestamp: d.timestamp,
    authorId: d.author_id,
    authorName: d.author_name,
    workflow: d.workflow as ChapterWorkflow,
    title: d.title,
    summary: d.summary,
    note: d.note ?? undefined,
  }));
}