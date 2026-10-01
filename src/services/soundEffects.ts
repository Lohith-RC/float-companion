/**
 * FloatCompanion Procedural Sound Engine
 * Uses Web Audio API for zero-dependency, ultra-low latency acoustic cues.
 */

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };
      window.addEventListener('click', unlockAudio, { once: true, passive: true });
      window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Pleasant ascending futuristic chime (Sprint start, ready)
   */
  public playChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // F4 -> C5
    osc1.frequency.setValueAtTime(349.23, now);
    osc1.frequency.exponentialRampToValueAtTime(523.25, now + 0.15);

    osc2.frequency.setValueAtTime(698.46, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.25);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.05);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  /**
   * Distraction warning alert (Descending minor alarm)
   */
  public playAlert() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.18); // A3

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);

    // Second pulse
    setTimeout(() => {
      try {
        const c = this.getContext();
        if (!c) return;
        const t = c.currentTime;
        const o2 = c.createOscillator();
        const g2 = c.createGain();
        o2.type = 'sawtooth';
        o2.frequency.setValueAtTime(440, t);
        o2.frequency.exponentialRampToValueAtTime(220, t + 0.18);
        g2.gain.setValueAtTime(0.2, t);
        g2.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        o2.connect(g2);
        g2.connect(c.destination);
        o2.start(t);
        o2.stop(t + 0.25);
      } catch {
        // AudioContext suspended or unavailable
      }
    }, 180);
  }

  /**
   * Success fanfare (Sprint completed)
   */
  public playSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  /**
   * Subtle click
   */
  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const sounds = new SoundEngine();
