/**
 * File: sound.ts
 * Purpose: Web Audio API Programmatic Synthesizer.
 * Why it exists: Synthesizes high-fidelity, Vercel-style chimes and alarm frequencies directly
 *                in the browser, avoiding bulky network assets and loading delays.
 */

let isMutedGlobal = false;

// Initialise mute setting from localStorage
if (typeof window !== 'undefined') {
  isMutedGlobal = localStorage.getItem('flowpulse:muted') === 'true';
}

export const setMuted = (muted: boolean) => {
  isMutedGlobal = muted;
  localStorage.setItem('flowpulse:muted', muted ? 'true' : 'false');
};

export const getMuted = (): boolean => {
  return isMutedGlobal;
};

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  return AudioCtx ? new AudioCtx() : null;
};

export const playSynthesizedSound = (type: 'click' | 'success' | 'notification' | 'emergency' | 'alert') => {
  if (isMutedGlobal) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case 'click':
      // Soft, high-frequency clean click pop
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;

    case 'alert':
    case 'notification':
      // Elegant high-pitched double chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1046.5, now + 0.08); // C6
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case 'success':
      // Warm, ascending arpeggio chord
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.12); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.18); // C6
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
      break;

    case 'emergency':
      // Low, pulsing dual-frequency warning tone (siren style)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now); // E4
      osc.frequency.linearRampToValueAtTime(440, now + 0.15); // A4
      osc.frequency.linearRampToValueAtTime(330, now + 0.3);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
      break;
  }
};
