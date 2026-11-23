// src/core/utils/soundNotification.ts

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Joue un petit "ping" Ã  deux tons (Web Audio, aucun asset externe).
 */
export function playNotificationSound(volume = 0.35): void {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  master.connect(ctx.destination);

  const notes: { freq: number; start: number; dur: number }[] = [
    { freq: 784, start: 0, dur: 0.14 },
    { freq: 1046, start: 0.09, dur: 0.22 },
  ];

  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = n.freq;

    const t0 = now + n.start;
    const t1 = t0 + n.dur;

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.9, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t1);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }
}

/** DÃ©bloque l'AudioContext au premier clic utilisateur (autoplay policy). */
export function primeAudioContext(): void {
  getCtx();
}