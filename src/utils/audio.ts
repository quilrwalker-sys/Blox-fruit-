// Procedural Web Audio API sound synthesizer for responsive action feedback

class SoundFX {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private bgmAudio: HTMLAudioElement | null = null;
  private mihawkBgmAudio: HTMLAudioElement | null = null;
  private isMihawkMusicActive: boolean = false;
  private bgmVolume: number = 0.14; // Low background music volume (~14%)

  constructor() {
    // AudioContext and BGM will be initialized on first user gesture
  }

  private initBgm() {
    if (!this.bgmAudio && typeof window !== 'undefined') {
      this.bgmAudio = new Audio('/assets/aistudio/before_the_final_strike_7b964aa7.mp3');
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = this.bgmVolume;
    }
    if (!this.mihawkBgmAudio && typeof window !== 'undefined') {
      this.mihawkBgmAudio = new Audio('/assets/aistudio/the_sovereign_s_edge_192e5636.mp3');
      this.mihawkBgmAudio.loop = true;
      this.mihawkBgmAudio.volume = this.bgmVolume;
    }
  }

  public startBgm() {
    if (!this.enabled) return;
    this.initBgm();
    if (this.isMihawkMusicActive) {
      if (this.bgmAudio && !this.bgmAudio.paused) {
        this.bgmAudio.pause();
      }
      if (this.mihawkBgmAudio && this.mihawkBgmAudio.paused) {
        this.mihawkBgmAudio.volume = this.bgmVolume;
        this.mihawkBgmAudio.play().catch(() => {});
      }
    } else {
      if (this.mihawkBgmAudio && !this.mihawkBgmAudio.paused) {
        this.mihawkBgmAudio.pause();
      }
      if (this.bgmAudio && this.bgmAudio.paused) {
        this.bgmAudio.volume = this.bgmVolume;
        this.bgmAudio.play().catch(() => {
          // Ignore autoplay restrictions until user interacts
        });
      }
    }
  }

  public startMihawkMusic() {
    this.isMihawkMusicActive = true;
    this.initBgm();
    if (this.bgmAudio && !this.bgmAudio.paused) {
      this.bgmAudio.pause();
    }
    if (this.mihawkBgmAudio) {
      this.mihawkBgmAudio.currentTime = 0;
      this.mihawkBgmAudio.volume = this.bgmVolume;
      if (this.enabled) {
        this.mihawkBgmAudio.play().catch(() => {});
      }
    }
  }

  public stopMihawkMusic() {
    if (!this.isMihawkMusicActive) return;
    this.isMihawkMusicActive = false;
    if (this.mihawkBgmAudio) {
      this.mihawkBgmAudio.pause();
      this.mihawkBgmAudio.currentTime = 0;
    }
    this.startBgm();
  }

  public setBgmVolume(vol: number) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
    if (this.mihawkBgmAudio) {
      this.mihawkBgmAudio.volume = this.bgmVolume;
    }
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.startBgm();
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) {
      if (this.bgmAudio && !this.bgmAudio.paused) {
        this.bgmAudio.pause();
      }
      if (this.mihawkBgmAudio && !this.mihawkBgmAudio.paused) {
        this.mihawkBgmAudio.pause();
      }
    } else {
      this.startBgm();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Punch hit sound
  public punch() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Sword slash sound
  public slash() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Elemental Fire Explosion / Burst
  public fireBoom() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Low frequency rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Ice crackle
  public iceFreeze() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(1400, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Laser / Light Beam
  public lightBeam() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Dash / Soru whoosh
  public dash() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Level Up fanfare
  public levelUp() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [330, 392, 493, 659]; // E4, G4, B4, E5
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  // Quest Completed sound
  public questComplete() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  // Buso Haki metallic clink
  public hakiToggle() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.18);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Explosive anime Haki activation burst (Heavy bass rumble + metallic impact + lightning crackle)
  public hakiActivationBurst() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Heavy sub-bass rumble
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(160, now);
    bassOsc.frequency.exponentialRampToValueAtTime(32, now + 0.45);
    bassGain.gain.setValueAtTime(0.42, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    bassOsc.connect(bassGain);
    bassGain.connect(this.ctx.destination);
    bassOsc.start(now);
    bassOsc.stop(now + 0.45);

    // 2. High metallic impact resonance
    const clinkOsc = this.ctx.createOscillator();
    const clinkGain = this.ctx.createGain();
    clinkOsc.type = 'triangle';
    clinkOsc.frequency.setValueAtTime(920, now);
    clinkOsc.frequency.exponentialRampToValueAtTime(420, now + 0.3);
    clinkGain.gain.setValueAtTime(0.35, now);
    clinkGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    clinkOsc.connect(clinkGain);
    clinkGain.connect(this.ctx.destination);
    clinkOsc.start(now);
    clinkOsc.stop(now + 0.3);

    // 3. Electric lightning crackles
    [0.02, 0.07, 0.13].forEach((delay, i) => {
      const zapOsc = this.ctx!.createOscillator();
      const zapGain = this.ctx!.createGain();
      zapOsc.type = 'square';
      zapOsc.frequency.setValueAtTime(1400 + i * 350, now + delay);
      zapOsc.frequency.exponentialRampToValueAtTime(220, now + delay + 0.09);
      zapGain.gain.setValueAtTime(0.22, now + delay);
      zapGain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.09);
      zapOsc.connect(zapGain);
      zapGain.connect(this.ctx!.destination);
      zapOsc.start(now + delay);
      zapOsc.stop(now + delay + 0.09);
    });
  }

  // Fruit Spin tick
  public spinTick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Mythical / Legendary win fanfare
  public legendaryWin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 523, 659, 784, 880, 1046];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  // Island Invasion Alert Siren / War Horn
  public invasionAlert() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Siren tone 1
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(320, now);
    osc1.frequency.exponentialRampToValueAtTime(640, now + 0.35);
    osc1.frequency.exponentialRampToValueAtTime(320, now + 0.7);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.85);

    // Deep war horn rumble
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(110, now);
    osc2.frequency.linearRampToValueAtTime(165, now + 0.4);
    osc2.frequency.linearRampToValueAtTime(95, now + 0.85);
    gain2.gain.setValueAtTime(0.35, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.85);
  }

  // General click / interface blip
  public click() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  // Treasure Chest Opening Symphony (Lock pop + Lid open + Shimmering Chimes + Coin Cascade)
  public chestOpen(tier: 'bronze' | 'silver' | 'gold' | 'diamond' = 'gold') {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Metallic padlock pop & unlatch
    const lockOsc = this.ctx.createOscillator();
    const lockGain = this.ctx.createGain();
    lockOsc.type = 'triangle';
    lockOsc.frequency.setValueAtTime(680, now);
    lockOsc.frequency.exponentialRampToValueAtTime(1180, now + 0.09);
    lockGain.gain.setValueAtTime(0.28, now);
    lockGain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
    lockOsc.connect(lockGain);
    lockGain.connect(this.ctx.destination);
    lockOsc.start(now);
    lockOsc.stop(now + 0.11);

    // 2. Magical treasure arpeggio based on chest tier
    const chordMap: Record<'bronze' | 'silver' | 'gold' | 'diamond', number[]> = {
      bronze: [392, 493.88, 587.33, 783.99], // G4 major
      silver: [440, 554.37, 659.25, 880, 1108.73], // A4 major
      gold: [523.25, 659.25, 783.99, 1046.5, 1318.5], // C5 major
      diamond: [587.33, 739.99, 880, 1174.66, 1479.98, 1760], // D5 major crystalline
    };
    const notes = chordMap[tier];

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + 0.16 + idx * 0.065;

      osc.type = tier === 'diamond' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.26, startTime);
      gain.gain.exponentialRampToValueAtTime(0.008, startTime + 0.42);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.42);
    });

    // 3. Sparkling coin cascade jingles
    const coinCount = tier === 'diamond' ? 7 : tier === 'gold' ? 5 : 4;
    for (let c = 0; c < coinCount; c++) {
      const coinOsc = this.ctx.createOscillator();
      const coinGain = this.ctx.createGain();
      const cTime = now + 0.32 + c * 0.055;
      coinOsc.type = 'sine';
      coinOsc.frequency.setValueAtTime(1600 + (c % 3) * 320, cTime);
      coinOsc.frequency.exponentialRampToValueAtTime(2400 + (c % 2) * 400, cTime + 0.05);
      coinGain.gain.setValueAtTime(0.14, cTime);
      coinGain.gain.exponentialRampToValueAtTime(0.005, cTime + 0.07);
      coinOsc.connect(coinGain);
      coinGain.connect(this.ctx.destination);
      coinOsc.start(cTime);
      coinOsc.stop(cTime + 0.07);
    }
  }
}

export const sound = new SoundFX();
