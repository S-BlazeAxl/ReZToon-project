import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'stopped'
  | 'denied'
  | 'error';

export interface VoiceResult {
  audioData: string;
  mimeType: string;
  duration: number;
  size: number;
}

interface UseVoiceRecorderReturn {
  status: RecorderStatus;
  duration: number;
  level: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<VoiceResult | null>;
  cancel: () => void;
  reset: () => void;
}

const STOP_TIMEOUT_MS = 5000;

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(timerRef.current);

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const pickMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return '';
  };

  const start = useCallback(async () => {
    if (mediaRecorderRef.current || streamRef.current) return;

    setError(null);
    cancelledRef.current = false;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone is not supported by this browser.');
      setStatus('error');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('MediaRecorder is not supported by this browser.');
      setStatus('error');
      return;
    }

    try {
      setStatus('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new Ctx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setLevel(Math.min(1, (sum / dataArray.length) / 128));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.start(100);

      startedAtRef.current = Date.now();
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 200);

      setStatus('recording');
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setError('Microphone access denied.');
        setStatus('denied');
      } else {
        setError(e?.message ?? 'Unknown microphone error.');
        setStatus('error');
      }
      cleanup();
    }
  }, [cleanup]);

  const stop = useCallback(async (): Promise<VoiceResult | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      cleanup();
      setStatus('idle');
      return null;
    }

    return new Promise<VoiceResult | null>((resolve) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        setStatus('error');
        setError('Recording stop timed out.');
        resolve(null);
      }, STOP_TIMEOUT_MS);

      recorder.onstop = () => {
        window.clearTimeout(timeout);

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const finalDuration = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );

        cleanup();
        setStatus('stopped');
        setLevel(0);

        if (cancelledRef.current) {
          chunksRef.current = [];
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const result: VoiceResult = {
            audioData: reader.result as string,
            mimeType: blob.type,
            duration: finalDuration,
            size: blob.size,
          };
          chunksRef.current = [];
          resolve(result);
        };
        reader.onerror = () => {
          setError('Failed to read audio file.');
          resolve(null);
        };
        reader.readAsDataURL(blob);
      };

      try {
        recorder.stop();
      } catch {
        window.clearTimeout(timeout);
        cleanup();
        setStatus('idle');
        resolve(null);
      }
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    cleanup();
    setStatus('idle');
    setDuration(0);
    setLevel(0);
    setError(null);
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setDuration(0);
    setLevel(0);
    setError(null);
  }, [cleanup]);

  return { status, duration, level, error, start, stop, cancel, reset };
}