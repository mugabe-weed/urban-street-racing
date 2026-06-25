/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;

  // Engine Synthesizer Nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  // Tire Screech Synthesizer Nodes
  private screechOsc: OscillatorNode | null = null;
  private screechGain: GainNode | null = null;

  // Nitro Sound Nodes
  private nitroNoise: AudioWorkletNode | ScriptProcessorNode | null = null;
  private nitroFilter: BiquadFilterNode | null = null;
  private nitroGain: GainNode | null = null;

  // Siren Nodes
  private sirenOsc1: OscillatorNode | null = null;
  private sirenOsc2: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenSweepTimer: any = null;

  private isMuted: boolean = false;

  constructor() {
    // Lazy initialized on first user interaction to comply with browser safety
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.masterVolume.connect(this.ctx.destination);

      this.setupEngine();
      this.setupScreech();
      this.setupNitro();
      this.setupSiren();
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterVolume && this.ctx) {
      this.masterVolume.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  private setupEngine() {
    if (!this.ctx || !this.masterVolume) return;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc1.type = "sawtooth";
    this.engineOsc2.type = "triangle";

    // Setup frequencies (low idle speed)
    this.engineOsc1.frequency.setValueAtTime(60, this.ctx.currentTime);
    this.engineOsc2.frequency.setValueAtTime(30, this.ctx.currentTime);

    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Idle initially silent

    this.engineOsc1.connect(this.engineGain);
    this.engineOsc2.connect(this.engineGain);
    this.engineGain.connect(this.masterVolume);

    this.engineOsc1.start(0);
    this.engineOsc2.start(0);
  }

  private setupScreech() {
    if (!this.ctx || !this.masterVolume) return;

    this.screechOsc = this.ctx.createOscillator();
    this.screechGain = this.ctx.createGain();

    this.screechOsc.type = "triangle";
    this.screechOsc.frequency.setValueAtTime(800, this.ctx.currentTime);

    // Apply distortion or high pass behavior
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.screechOsc.connect(this.screechGain);
    this.screechGain.connect(this.masterVolume);
    this.screechOsc.start(0);
  }

  private setupNitro() {
    if (!this.ctx || !this.masterVolume) return;

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.nitroFilter = this.ctx.createBiquadFilter();
    this.nitroFilter.type = "bandpass";
    this.nitroFilter.frequency.setValueAtTime(300, this.ctx.currentTime);
    this.nitroFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    // Generate procedural noise
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    noiseSource.connect(this.nitroFilter);
    this.nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterVolume);
    noiseSource.start(0);
  }

  private setupSiren() {
    if (!this.ctx || !this.masterVolume) return;

    this.sirenOsc1 = this.ctx.createOscillator();
    this.sirenOsc2 = this.ctx.createOscillator();
    this.sirenGain = this.ctx.createGain();

    this.sirenOsc1.type = "sine";
    this.sirenOsc2.type = "square";

    this.sirenOsc1.frequency.setValueAtTime(600, this.ctx.currentTime);
    this.sirenOsc2.frequency.setValueAtTime(605, this.ctx.currentTime);

    this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.sirenOsc1.connect(this.sirenGain);
    this.sirenOsc2.connect(this.sirenGain);
    this.sirenGain.connect(this.masterVolume);

    this.sirenOsc1.start(0);
    this.sirenOsc2.start(0);
  }

  // INTERFACE METHODS FOR REALTIME CONTROLS

  public updateEngineSound(rpm: number, throttle: boolean) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    // RPM runs 0 to 1
    const baseFreq = 50 + rpm * 180;
    const gainValue = throttle ? 0.08 + rpm * 0.12 : 0.04 + rpm * 0.04;

    if (this.engineOsc1 && this.engineOsc2 && this.engineGain) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, this.ctx.currentTime, 0.05);
      this.engineGain.gain.setTargetAtTime(gainValue, this.ctx.currentTime, 0.1);
    }
  }

  public setScreech(isScreeching: boolean, intensity: number = 1) {
    this.initContext();
    if (!this.ctx || !this.screechGain || this.isMuted) return;

    const targetGain = isScreeching ? 0.04 * intensity : 0;
    this.screechGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.03);

    if (isScreeching && this.screechOsc) {
      const pitch = 700 + Math.random() * 200;
      this.screechOsc.frequency.setTargetAtTime(pitch, this.ctx.currentTime, 0.05);
    }
  }

  public setNitro(isActive: boolean) {
    this.initContext();
    if (!this.ctx || !this.nitroGain || this.isMuted) return;

    const targetGain = isActive ? 0.08 : 0;
    this.nitroGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
  }

  public setPoliceSiren(isActive: boolean) {
    this.initContext();
    if (!this.ctx || !this.sirenGain || this.isMuted) return;

    const targetGain = isActive ? 0.03 : 0;
    this.sirenGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.2);

    if (isActive && !this.sirenSweepTimer) {
      let toggle = false;
      this.sirenSweepTimer = setInterval(() => {
        if (!this.ctx || this.isMuted) return;
        const targetFreq = toggle ? 800 : 500;
        toggle = !toggle;
        if (this.sirenOsc1 && this.sirenOsc2) {
          this.sirenOsc1.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
          this.sirenOsc2.frequency.setTargetAtTime(targetFreq + 5, this.ctx.currentTime, 0.2);
        }
      }, 500);
    } else if (!isActive && this.sirenSweepTimer) {
      clearInterval(this.sirenSweepTimer);
      this.sirenSweepTimer = null;
    }
  }

  public playCrash() {
    this.initContext();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    // Procedural crash sound using white noise burst
    const bufferSize = 0.5 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2); // Exponential decay
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);

    noiseSource.start(0);
  }

  public playBeep(highPitch: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(highPitch ? 880 : 440, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start(0);
    osc.stop(this.ctx.currentTime + 0.15);
  }

  public stopAll() {
    if (this.engineGain) this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    if (this.screechGain) this.screechGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    if (this.nitroGain) this.nitroGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    if (this.sirenGain) this.sirenGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    if (this.sirenSweepTimer) {
      clearInterval(this.sirenSweepTimer);
      this.sirenSweepTimer = null;
    }
  }
}

export const audio = new AudioManager();
