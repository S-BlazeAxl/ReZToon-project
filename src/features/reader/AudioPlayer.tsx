import { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, MessageSquare, Mic,
} from 'lucide-react';
import {
  getAudioChapter,
  getNarrator,
  getAudioProgress,
  saveAudioProgress,
  type AudioChapter,
  type Narrator,
} from '../../core/services/audioService';
import { formatAudioTime } from '../../core/utils/format';
import { useT } from '../../config/i18n';

interface Props {
  mangaId: string;
  chapterNumber: number;
  chapterTitle: string;
  onClose?: () => void;
}

export default function AudioPlayer({
  mangaId,
  chapterNumber,
  chapterTitle,
  onClose,
}: Props) {
  const t = useT();
  const [audio, setAudio] = useState<AudioChapter | null>(null);
  const [narrator, setNarrator] = useState<Narrator | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const a = await getAudioChapter(mangaId, chapterNumber);
      if (cancelled) return;
      setAudio(a);
      if (a) {
        const n = await getNarrator(a.narratorId);
        if (!cancelled) setNarrator(n);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [mangaId, chapterNumber]);

  useEffect(() => {
    if (!audio) return;
    const saved = getAudioProgress(audio.id);
    setCurrent(saved);
    const el = audioRef.current;
    if (!el) return;

    if (saved <= 0) return;

    const apply = () => {
      if (saved > 0) {
        try { el.currentTime = saved; } catch { }
      }
    };

    if (el.readyState >= 1) {
      apply();
    } else {
      el.addEventListener('loadedmetadata', apply, { once: true });
    }

    return () => {
      el.removeEventListener('loadedmetadata', apply);
    };
  }, [audio]);

  useEffect(() => {
    if (!audio) return;
    const interval = window.setInterval(() => {
      if (audioRef.current) {
        saveAudioProgress(audio.id, audioRef.current.currentTime);
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [audio]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  if (loading) {
    return (
      <div className="audio-player">
        <div className="loader-ring" />
      </div>
    );
  }

  if (!audio) {
    return (
      <div className="audio-player audio-empty">
        <Mic size={24} />
        <p>{t.audio.noAudio}</p>
        <span>{t.audio.checkBackSoon}</span>
      </div>
    );
  }

  if (!audio.audioUrl) {
    return (
      <div className="audio-player audio-empty">
        <Mic size={24} />
        <p>{t.audio.preparing}</p>
        <span>{t.audio.willBeAvailable}</span>
      </div>
    );
  }

  const handleToggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrent(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const handleSkip = (delta: number) => {
    const el = audioRef.current;
    if (!el) return;
    const time = Math.max(
      0,
      Math.min(el.duration || audio.duration, el.currentTime + delta),
    );
    el.currentTime = time;
    setCurrent(time);
  };

  const progressPct =
    audio.duration > 0 ? (current / audio.duration) * 100 : 0;

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={audio.audioUrl}
        preload="metadata"
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
          if (audio) saveAudioProgress(audio.id, 0);
        }}
      />

      <div className="audio-player-head">
        <div className="audio-player-cover">
          <Mic size={20} />
        </div>
        <div className="audio-player-info">
          <strong>{chapterTitle}</strong>
          <span>
            {narrator?.name ?? t.audio.narrator} · {audio.language}
            {audio.hasSubtitles && ` · ${t.audio.subtitles}`}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            className="audio-player-close"
            onClick={onClose}
            aria-label={t.common.close}
          >
            ×
          </button>
        )}
      </div>

      <div className="audio-player-progress-wrap">
        <input
          type="range"
          className="audio-player-progress"
          min={0}
          max={audio.duration}
          value={current}
          onChange={handleSeek}
          style={{
            background: `linear-gradient(90deg, var(--primary) ${progressPct}%, rgba(255,255,255,0.1) ${progressPct}%)`,
          }}
        />
        <div className="audio-player-times">
          <span>{formatAudioTime(current)}</span>
          <span>{formatAudioTime(audio.duration)}</span>
        </div>
      </div>

      <div className="audio-player-controls">
        <button
          type="button"
          className="audio-player-btn-ghost"
          onClick={() => handleSkip(-15)}
          aria-label={t.audio.rewind}
        >
          <SkipBack size={18} />
        </button>
        <button
          type="button"
          className="audio-player-btn-main"
          onClick={handleToggle}
          aria-label={playing ? t.audio.pause : t.audio.play}
        >
          {playing ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" />
          )}
        </button>
        <button
          type="button"
          className="audio-player-btn-ghost"
          onClick={() => handleSkip(15)}
          aria-label={t.audio.forward}
        >
          <SkipForward size={18} />
        </button>
      </div>

      <div className="audio-player-extra">
        <button
          type="button"
          className={`audio-player-rate ${rate !== 1 ? 'active' : ''}`}
          onClick={() => {
            const rates = [1, 1.25, 1.5, 2, 0.75];
            const idx = rates.indexOf(rate);
            setRate(rates[(idx + 1) % rates.length]);
          }}
          aria-label={`${t.audio.playbackSpeed} ${rate}x`}
        >
          {rate}×
        </button>

        <button
          type="button"
          className={`audio-player-mute ${muted ? 'active' : ''}`}
          onClick={() => setMuted((v) => !v)}
          aria-label={muted ? t.audio.unmute : t.audio.mute}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <input
          type="range"
          className="audio-player-volume"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            setMuted(Number(e.target.value) === 0);
          }}
          aria-label={t.audio.volume}
        />

        {audio.hasSubtitles && (
          <button
            type="button"
            className={`audio-player-transcript ${showTranscript ? 'active' : ''}`}
            onClick={() => setShowTranscript((v) => !v)}
            aria-label={t.audio.toggleTranscript}
          >
            <MessageSquare size={14} />
          </button>
        )}
      </div>

      {showTranscript && audio.hasSubtitles && (
        <div className="audio-player-transcript-panel">
          <p>[Ambience — distant drums]</p>
          <p>
            "In the beginning, the baobab was only a seed carried by the wind..."
          </p>
          <p>[Griot voice — kora in background]</p>
          <p>
            "Listen, my child, to the story my fathers passed down to me..."
          </p>
          <span className="audio-player-transcript-hint">
            {t.audio.syncedSubtitles}
          </span>
        </div>
      )}
    </div>
  );
}