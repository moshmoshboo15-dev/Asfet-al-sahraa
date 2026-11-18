import type { AudioSettings } from '@shared/types';

export type SurfaceType = 'mud' | 'wood' | 'concrete' | 'metal' | 'puddle';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private ambientStarted = false;
  private musicStarted = false;
  private ambientTimer: number | null = null;
  private musicTimer: number | null = null;
  private settings: AudioSettings;
  private inCombat = false;

  constructor(initialSettings: AudioSettings) {
    this.settings = { ...initialSettings };
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.effectsGain = this.ctx.createGain();
      this.voiceGain = this.ctx.createGain();
      this.ambientGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.effectsGain.connect(this.masterGain);
      this.voiceGain.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this.createNoiseBuffer(2.5);
      this.applySettings(this.settings);
      this.startAmbientLoop();
      this.startMenuMusicLoop();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setInCombat(active: boolean): void {
    this.inCombat = active;
    if (!this.ctx || !this.musicGain || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    const musicTarget = active ? (this.settings.music / 100) * 0.16 : (this.settings.music / 100) * 0.42;
    const ambTarget = active ? (this.settings.ambient / 100) * 0.52 : (this.settings.ambient / 100) * 0.25;
    this.musicGain.gain.setTargetAtTime(musicTarget, now, 0.35);
    this.ambientGain.gain.setTargetAtTime(ambTarget, now, 0.35);
  }

  public applySettings(settings: AudioSettings): void {
    this.settings = { ...settings };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(settings.master / 100, now, 0.04);
    if (this.musicGain) {
      const factor = this.inCombat ? 0.16 : 0.42;
      this.musicGain.gain.setTargetAtTime((settings.music / 100) * factor, now, 0.08);
    }
    if (this.effectsGain) this.effectsGain.gain.setTargetAtTime((settings.effects / 100) * 0.9, now, 0.04);
    if (this.voiceGain) this.voiceGain.gain.setTargetAtTime((settings.voice / 100) * 0.85, now, 0.04);
    if (this.ambientGain) {
      const factor = this.inCombat ? 0.52 : 0.25;
      this.ambientGain.gain.setTargetAtTime((settings.ambient / 100) * factor, now, 0.08);
    }
  }

  private createNoiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playRifleShot(): void {
    this.unlock();
    if (!this.ctx || !this.effectsGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // 1. Sharp supersonic crack transient
    const crack = ctx.createBufferSource();
    crack.buffer = this.noiseBuffer;
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.setValueAtTime(1950, t);
    crackFilter.Q.value = 0.85;
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(1.15, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    crack.connect(crackFilter).connect(crackGain).connect(this.effectsGain);
    crack.start(t);
    crack.stop(t + 0.12);

    // 2. Chamber punch (low-mid thump)
    const punchOsc = ctx.createOscillator();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(165, t);
    punchOsc.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    const punchGain = ctx.createGain();
    punchGain.gain.setValueAtTime(0.85, t);
    punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    punchOsc.connect(punchGain).connect(this.effectsGain);
    punchOsc.start(t);
    punchOsc.stop(t + 0.15);

    // 3. Distant trench valley echo tail
    const tail = ctx.createBufferSource();
    tail.buffer = this.noiseBuffer;
    const tailFilter = ctx.createBiquadFilter();
    tailFilter.type = 'lowpass';
    tailFilter.frequency.setValueAtTime(1100, t + 0.03);
    tailFilter.frequency.exponentialRampToValueAtTime(240, t + 0.95);
    const tailGain = ctx.createGain();
    tailGain.gain.setValueAtTime(0.001, t);
    tailGain.gain.linearRampToValueAtTime(0.36, t + 0.045);
    tailGain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
    tail.connect(tailFilter).connect(tailGain).connect(this.effectsGain);
    tail.start(t);
    tail.stop(t + 0.98);
  }

  public playBoltCycle(): void {
    if (!this.ctx || !this.effectsGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Lift & unlock click
    this.playMetallicClick(t + 0.02, 2400, 0.24, 0.045);
    // Pull bolt back scrape
    this.playMechanicalSlide(t + 0.14, 1450, 0.16, 0.09);
    // Brass shell casing ring
    this.playMetallicClick(t + 0.34, 4100, 0.15, 0.08);
    // Push bolt forward & lock
    this.playMechanicalSlide(t + 0.48, 1750, 0.18, 0.08);
    this.playMetallicClick(t + 0.62, 2100, 0.28, 0.05);
  }

  public playReloadStart(): void {
    if (!this.ctx || !this.effectsGain) return;
    const t = this.ctx.currentTime;
    this.playMetallicClick(t + 0.05, 2200, 0.26, 0.05);
    this.playMechanicalSlide(t + 0.18, 1300, 0.18, 0.11);
  }

  public playReloadInsert(): void {
    if (!this.ctx || !this.effectsGain) return;
    const t = this.ctx.currentTime;
    this.playMetallicClick(t, 2850, 0.24, 0.045);
    this.playMetallicClick(t + 0.11, 3050, 0.2, 0.045);
    this.playMetallicClick(t + 0.22, 3250, 0.22, 0.045);
  }

  public playReloadFinish(): void {
    if (!this.ctx || !this.effectsGain) return;
    const t = this.ctx.currentTime;
    this.playMechanicalSlide(t + 0.02, 1650, 0.22, 0.09);
    this.playMetallicClick(t + 0.14, 1950, 0.32, 0.06);
  }

  public playDryFire(): void {
    this.unlock();
    if (!this.ctx || !this.effectsGain) return;
    this.playMetallicClick(this.ctx.currentTime, 3400, 0.22, 0.03);
  }

  public playFootstep(surface: SurfaceType): void {
    if (!this.ctx || !this.effectsGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (surface === 'wood') {
      // Hollow duckboard thud
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(280 + Math.random() * 60, t);
      filter.Q.value = 1.6;
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    } else if (surface === 'puddle') {
      // Splashy wet step
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600 + Math.random() * 400, t);
      filter.Q.value = 0.7;
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    } else if (surface === 'concrete') {
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(600, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    } else {
      // Heavy squelching mud
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520 + Math.random() * 140, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    }

    src.connect(filter).connect(gain).connect(this.effectsGain);
    src.start(t, Math.random() * 1.2, 0.16);
  }

  public playImpact(surface: SurfaceType, critical = false): void {
    if (!this.ctx || !this.effectsGain) return;
    const t = this.ctx.currentTime;
    if (surface === 'metal') {
      this.playMetallicClick(t, critical ? 3900 : 2800, 0.3, 0.14);
      this.playMetallicClick(t + 0.025, critical ? 5100 : 3500, 0.18, 0.12);
    } else if (surface === 'wood') {
      this.playMetallicClick(t, 760, 0.25, 0.08);
    } else {
      this.playMetallicClick(t, 420, 0.16, 0.07);
    }
  }

  public playUiClick(): void {
    this.unlock();
    if (!this.ctx || !this.effectsGain) return;
    this.playMetallicClick(this.ctx.currentTime, 1850, 0.12, 0.025);
  }

  private playMetallicClick(time: number, freq: number, vol: number, dur: number): void {
    if (!this.ctx || !this.effectsGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, time + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(g).connect(this.effectsGain);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  private playMechanicalSlide(time: number, freq: number, vol: number, dur: number): void {
    if (!this.ctx || !this.effectsGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, time);
    filter.Q.value = 3.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(vol, time + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(filter).connect(g).connect(this.effectsGain);
    src.start(time, Math.random() * 0.8, dur + 0.02);
  }

  private startAmbientLoop(): void {
    if (this.ambientStarted || !this.ctx || !this.ambientGain || !this.noiseBuffer) return;
    this.ambientStarted = true;

    // Continuous cold battlefield wind bed
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = this.noiseBuffer;
    windSrc.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 280;
    windFilter.Q.value = 0.65;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain).connect(windFilter.frequency);
    lfo.start();

    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.22;
    windSrc.connect(windFilter).connect(windGain).connect(this.ambientGain);
    windSrc.start();

    // Distant artillery rumbles every few seconds
    const scheduleRumble = () => {
      if (!this.ctx || !this.ambientGain || !this.noiseBuffer) return;
      const t = this.ctx.currentTime;
      const rumble = this.ctx.createBufferSource();
      rumble.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(140, t);
      lp.frequency.exponentialRampToValueAtTime(55, t + 1.4);
      const rg = this.ctx.createGain();
      rg.gain.setValueAtTime(0.001, t);
      rg.gain.linearRampToValueAtTime(0.28, t + 0.14);
      rg.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      rumble.connect(lp).connect(rg).connect(this.ambientGain);
      rumble.start(t, Math.random() * 0.5, 1.55);

      this.ambientTimer = window.setTimeout(scheduleRumble, 3400 + Math.random() * 5200);
    };
    this.ambientTimer = window.setTimeout(scheduleRumble, 1200);
  }

  private startMenuMusicLoop(): void {
    if (this.musicStarted || !this.ctx || !this.musicGain) return;
    this.musicStarted = true;

    // Somber WW1 D-minor cello/horn drone chord progression
    const chords = [
      [73.42, 110.0, 174.61], // Dm
      [65.41, 98.0, 155.56],  // Cm/G-like dark turn
      [58.27, 87.31, 146.83], // Bbmaj
      [55.0, 82.41, 138.59],  // A
    ];
    let step = 0;

    const playBar = () => {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      const notes = chords[step % chords.length];
      step++;

      for (const freq of notes) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(340, t);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.06, t + 1.1);
        g.gain.setValueAtTime(0.05, t + 3.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 4.4);

        osc.connect(lp).connect(g).connect(this.musicGain);
        osc.start(t);
        osc.stop(t + 4.5);
      }

      this.musicTimer = window.setTimeout(playBar, 4200);
    };

    playBar();
  }

  public dispose(): void {
    if (this.ambientTimer !== null) clearTimeout(this.ambientTimer);
    if (this.musicTimer !== null) clearTimeout(this.musicTimer);
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
