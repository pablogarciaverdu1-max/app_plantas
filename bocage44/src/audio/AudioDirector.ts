import * as THREE from 'three';
import { SPEED_OF_SOUND } from '../weapons/Ballistics';

/**
 * Positional sound with Web Audio. Sounds are synthesised (filtered noise and
 * envelopes) until recorded CC0 samples arrive in the sound phase. A distant shot
 * is heard distance / 343 m/s after it is fired.
 */
export class AudioDirector {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noise!: AudioBuffer;
  private readonly listenerPos = new THREE.Vector3();

  /** Must be called from a user gesture (browser autoplay rules). */
  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
    } catch {
      return; // no audio available: the game still runs
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    // Gentle limiter so close gunfire does not clip.
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 8;
    this.master.connect(comp).connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setListener(camera: THREE.Camera): void {
    camera.getWorldPosition(this.listenerPos);
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const f = new THREE.Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
    const u = new THREE.Vector3(0, 1, 0).transformDirection(camera.matrixWorld);
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setValueAtTime(this.listenerPos.x, t);
      l.positionY.setValueAtTime(this.listenerPos.y, t);
      l.positionZ.setValueAtTime(this.listenerPos.z, t);
      l.forwardX.setValueAtTime(f.x, t);
      l.forwardY.setValueAtTime(f.y, t);
      l.forwardZ.setValueAtTime(f.z, t);
      l.upX.setValueAtTime(u.x, t);
      l.upY.setValueAtTime(u.y, t);
      l.upZ.setValueAtTime(u.z, t);
    }
  }

  /** A gunshot at `pos`. Near shots are sharp; far ones are dull, late and rolling. */
  gunshot(pos: THREE.Vector3, weaponId: string, own = false): void {
    if (!this.ctx) return;
    const d = own ? 0 : pos.distanceTo(this.listenerPos);
    const when = this.ctx.currentTime + d / SPEED_OF_SOUND;
    const rifle = weaponId === 'm1_garand' || weaponId === 'kar98k' || weaponId === 'mg42';
    const loud = rifle ? 1 : 0.6;
    const gain = loud / (1 + d / 12);
    const out = this.spatial(pos, own);
    // Blast: broadband noise, duller with distance.
    const cutoff = Math.max(700, 9000 / (1 + d / 60));
    this.noiseBurst(out, when, own ? 0.09 : 0.06 + Math.min(0.3, d / 600), gain, 120, cutoff);
    // Body: low thump.
    this.tone(out, when, rifle ? 55 : 80, 0.18, gain * 0.9, 'sine');
    // Echo rolling back off the hedgerows and houses.
    this.noiseBurst(out, when + 0.08 + d / 2000, 0.6 + Math.min(1.2, d / 250), gain * 0.25, 100, Math.min(1800, cutoff));
  }

  /** Supersonic crack of a bullet passing close: sharp and immediate. */
  crack(pos: THREE.Vector3): void {
    if (!this.ctx) return;
    const out = this.spatial(pos, false);
    this.noiseBurst(out, this.ctx.currentTime, 0.012, 0.9, 2500, 12000);
  }

  /** Subsonic whizz (pistol and SMG rounds). */
  whizz(pos: THREE.Vector3): void {
    if (!this.ctx) return;
    const out = this.spatial(pos, false);
    this.noiseBurst(out, this.ctx.currentTime, 0.09, 0.25, 900, 3000);
  }

  /** Bullet striking the ground, stone or wood nearby. */
  impact(pos: THREE.Vector3, hard: boolean): void {
    if (!this.ctx) return;
    const d = pos.distanceTo(this.listenerPos);
    if (d > 60) return;
    const out = this.spatial(pos, false);
    this.noiseBurst(out, this.ctx.currentTime + d / SPEED_OF_SOUND, hard ? 0.03 : 0.05, 0.35 / (1 + d / 6), hard ? 1500 : 200, hard ? 9000 : 1500);
  }

  /** The Garand's empty en-bloc clip ringing out. */
  clipPing(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    for (const [f, g] of [[2650, 0.18], [3930, 0.1], [5410, 0.05]] as const) this.tone(this.master, t, f, 0.7, g, 'sine');
  }

  mechanical(kind: 'dry' | 'reload' | 'bolt'): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (kind === 'dry') this.noiseBurst(this.master, t, 0.01, 0.2, 2000, 8000);
    if (kind === 'reload') {
      this.noiseBurst(this.master, t + 0.3, 0.03, 0.25, 800, 5000);
      this.noiseBurst(this.master, t + 0.9, 0.04, 0.3, 600, 4000);
    }
    if (kind === 'bolt') this.noiseBurst(this.master, t + 0.25, 0.05, 0.15, 700, 4000);
  }

  hurt(): void {
    if (!this.ctx) return;
    this.tone(this.master, this.ctx.currentTime, 45, 0.35, 0.8, 'sine');
  }

  /** Short shouted alarm (stand-in for recorded German voices). */
  shout(pos: THREE.Vector3): void {
    if (!this.ctx) return;
    const d = pos.distanceTo(this.listenerPos);
    const out = this.spatial(pos, false);
    const t = this.ctx.currentTime + d / SPEED_OF_SOUND;
    const g = 0.3 / (1 + d / 15);
    // Two voiced syllables: a buzzy tone through a vowel-like band-pass.
    for (const [start, f] of [[0, 190], [0.22, 160]] as const) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t + start);
      osc.frequency.linearRampToValueAtTime(f * 0.85, t + start + 0.18);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 1.5;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0, t + start);
      env.gain.linearRampToValueAtTime(g, t + start + 0.03);
      env.gain.exponentialRampToValueAtTime(0.001, t + start + 0.2);
      osc.connect(bp).connect(env).connect(out);
      osc.start(t + start);
      osc.stop(t + start + 0.25);
    }
  }

  private spatial(pos: THREE.Vector3, own: boolean): AudioNode {
    const ctx = this.ctx!;
    if (own) return this.master;
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'linear';
    p.rolloffFactor = 0; // distance loudness is handled per sound
    p.positionX.value = pos.x;
    p.positionY.value = pos.y;
    p.positionZ.value = pos.z;
    p.connect(this.master);
    return p;
  }

  private noiseBurst(out: AudioNode, when: number, dur: number, gain: number, low: number, high: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = low;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = high;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, when);
    env.gain.exponentialRampToValueAtTime(0.0005, when + dur);
    src.connect(hp).connect(lp).connect(env).connect(out);
    src.start(when, Math.random() * 1.5);
    src.stop(when + dur + 0.05);
  }

  private tone(out: AudioNode, when: number, freq: number, dur: number, gain: number, type: OscillatorType): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, when + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, when);
    env.gain.exponentialRampToValueAtTime(0.0005, when + dur);
    osc.connect(env).connect(out);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }
}
