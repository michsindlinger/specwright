/**
 * Short chime for the "agent finished" bell.
 *
 * Synthesized via Web Audio instead of an audio file: no asset to ship, no
 * network fetch, ~200 bytes of code instead of a binary in the repo.
 *
 * Browsers block audio until the page has seen a user gesture. We never force
 * one — if the AudioContext cannot start, the chime is silently skipped and the
 * badge alone carries the notification. In practice the user has clicked or
 * typed in the terminal long before the first agent finishes.
 */

const STORAGE_KEY = 'cloud-terminal-bell-sound';

/** Two-note chime (A5 → D6), quiet and short enough not to become annoying. */
const NOTES: ReadonlyArray<{ freq: number; start: number; duration: number }> = [
  { freq: 880.0, start: 0, duration: 0.12 },
  { freq: 1174.7, start: 0.1, duration: 0.18 },
];
const PEAK_GAIN = 0.12;

let ctx: AudioContext | null = null;

/**
 * Pure: maps a stored preference to the effective setting. Unset (never
 * touched) means enabled — the sound is the point of the feature.
 */
export function parseSoundPreference(raw: string | null): boolean {
  return raw !== 'off';
}

export function isBellSoundEnabled(): boolean {
  try {
    return parseSoundPreference(localStorage.getItem(STORAGE_KEY));
  } catch {
    return true; // storage blocked (private window) — default to audible
  }
}

export function setBellSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // storage blocked — the setting just does not survive a reload
  }
}

function audioContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx ??= new Ctor();
    // Autoplay policy parks the context until a gesture has happened; resuming
    // is a no-op once it is running.
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Plays the chime unless the user muted it. `force` bypasses the setting — used
 * to preview the sound the moment it is switched back on.
 */
export function playAgentDoneChime(force = false): void {
  if (!force && !isBellSoundEnabled()) return;
  const audio = audioContext();
  if (!audio || audio.state !== 'running') return;

  const now = audio.currentTime;
  for (const note of NOTES) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = note.freq;
    const t0 = now + note.start;
    const t1 = t0 + note.duration;
    // Ramped envelope: a hard start/stop on a sine produces an audible click.
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }
}
