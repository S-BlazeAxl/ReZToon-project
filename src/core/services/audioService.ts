import { supabase } from '../lib/supabase';

export interface Narrator {
  id: string;
  name: string;
  language: string;
  style: string;
}

export interface AudioChapter {
  id: string;
  mangaId: string;
  chapterNumber: number;
  narratorId: string;
  title: string;
  duration: number;
  language: string;
  hasSubtitles: boolean;
  audioUrl: string | null;
}

function mapAudioRow(d: any): AudioChapter {
  return {
    id: d.id,
    mangaId: d.manga_id,
    chapterNumber: d.chapter_number,
    narratorId: d.narrator_id,
    title: d.title,
    duration: d.duration,
    language: d.language,
    hasSubtitles: d.has_subtitles,
    audioUrl: d.audio_url ?? null,
  };
}

export async function getNarrators(): Promise<Narrator[]> {
  const { data } = await supabase.from('narrators').select('*');
  return (data ?? []) as Narrator[];
}

export async function getNarrator(id: string): Promise<Narrator | null> {
  const { data } = await supabase
    .from('narrators')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as Narrator) ?? null;
}

export async function getAudioChapter(
  mangaId: string,
  chapterNumber: number,
): Promise<AudioChapter | null> {
  const { data } = await supabase
    .from('audio_chapters')
    .select('*')
    .eq('manga_id', mangaId)
    .eq('chapter_number', chapterNumber)
    .maybeSingle();
  return data ? mapAudioRow(data) : null;
}

export async function getAllAudioForManga(mangaId: string): Promise<AudioChapter[]> {
  const { data } = await supabase
    .from('audio_chapters')
    .select('*')
    .eq('manga_id', mangaId);
  return (data ?? []).map(mapAudioRow);
}

export async function hasAudioForChapter(
  mangaId: string,
  chapterNumber: number,
): Promise<boolean> {
  const audio = await getAudioChapter(mangaId, chapterNumber);
  return audio !== null;
}

const PROGRESS_KEY = 'reztoon_audio_progress';
const AUDIO_ONLY_KEY = 'reztoon_audio_only';

export function getAudioProgress(audioId: string): number {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return 0;
    const db = JSON.parse(raw);
    return db[audioId] ?? 0;
  } catch {
    return 0;
  }
}

export function saveAudioProgress(audioId: string, seconds: number): void {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const db = raw ? JSON.parse(raw) : {};
    db[audioId] = Math.max(0, Math.floor(seconds));
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(db));
  } catch {
  }
}

export function clearAudioProgress(audioId: string): void {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return;
    const db = JSON.parse(raw);
    delete db[audioId];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(db));
  } catch {
  }
}

export function getAudioOnlyMode(): boolean {
  try {
    return localStorage.getItem(AUDIO_ONLY_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAudioOnlyMode(v: boolean): void {
  try {
    localStorage.setItem(AUDIO_ONLY_KEY, v ? '1' : '0');
  } catch {
  }
}