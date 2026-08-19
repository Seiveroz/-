/* ============================================================
   جنگ سلسله — موسیقی پس‌زمینه (تولید زنده با Web Audio)
   موسیقی حماسی/کهن به‌صورت رویه‌ای ساخته می‌شود تا بدون
   نیاز به فایل صوتی، در حالت آفلاین (exe) هم کار کند.
   ============================================================ */

const MUSIC_KEY = 'jang-selseleh-music';

const Music = {
  ctx: null,
  master: null,
  musicBus: null,
  started: false,
  playing: false,
  enabled: true,      // ترجیح کاربر (روشن/خاموش)
  schedulerId: null,
  nextTime: 0,
  step: 0,
  droneOscs: [],
  droneGain: null,

  /* ---------- آماده‌سازی ---------- */
  ensure() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
    } catch (e) { return false; }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.55;
    this.musicBus.connect(this.master);
    return true;
  },

  loadPref() {
    try {
      const v = localStorage.getItem(MUSIC_KEY);
      if (v === 'off') this.enabled = false;
      else this.enabled = true;
    } catch (e) {}
  },
  savePref() {
    try { localStorage.setItem(MUSIC_KEY, this.enabled ? 'on' : 'off'); } catch (e) {}
  },

  /* ---------- شروع / توقف ---------- */
  tryAutostart() {
    this.loadPref();
    if (this.enabled) this.start();
  },

  start() {
    if (!this.ensure()) return;
    if (this.playing) return;
    this.started = true;
    this.playing = true;
    this.enabled = true;
    if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume();
    this.startDrone();
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.12;
    if (!this.schedulerId) this.schedulerId = setInterval(() => this.schedule(), 180);
    this.savePref();
    updateMusicButton();
  },

  stop() {
    this.playing = false;
    this.enabled = false;
    if (this.schedulerId) { clearInterval(this.schedulerId); this.schedulerId = null; }
    this.stopDrone();
    if (this.ctx && this.ctx.suspend) this.ctx.suspend();
    this.savePref();
    updateMusicButton();
  },

  toggle() {
    this.loadPref();
    if (this.playing) this.stop();
    else { this.enabled = true; this.start(); }
  },

  /* ---------- درام (زمینه پیوسته) ---------- */
  startDrone() {
    this.stopDrone();
    if (!this.ctx) return;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.0;
    this.droneGain.gain.linearRampToValueAtTime(0.045, this.ctx.currentTime + 2.5);
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 260;
    filt.Q.value = 0.4;
    filt.connect(this.droneGain);
    this.droneGain.connect(this.musicBus);
    for (const det of [-4, 3]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 73.42; /* D2 */
      o.detune.value = det;
      o.connect(filt);
      o.start();
      this.droneOscs.push(o);
    }
  },
  setDroneFreq(freq) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.droneOscs.forEach((o) => {
      o.frequency.setTargetAtTime(freq, t, 0.25);
    });
  },
  stopDrone() {
    if (!this.ctx) return;
    if (this.droneGain) {
      try { this.droneGain.gain.cancelScheduledValues(this.ctx.currentTime); } catch (e) {}
      this.droneGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);
      const g = this.droneGain;
      setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 1400);
      this.droneGain = null;
    }
    this.droneOscs.forEach(o => { try { o.stop(); } catch (e) {} });
    this.droneOscs = [];
  },

  /* ---------- برنامه‌ریزی گام‌ها ---------- */
  schedule() {
    if (!this.ctx || !this.playing) return;
    while (this.nextTime < this.ctx.currentTime + 0.6) {
      this.playStep(this.step, this.nextTime);
      this.step++;
      this.nextTime += STEP_DUR;
    }
  },

  playStep(step, t) {
    const bar = Math.floor(step / 16) % CHORDS.length;
    const beatInBar = step % 16;      // 0..15
    const chord = CHORDS[bar];

    /* تغییر درام در شروع هر میزان */
    if (beatInBar === 0) this.setDroneFreq(chord.root);

    /* باس در ضرب ۱ و ۳ */
    if (beatInBar === 0 || beatInBar === 8) {
      this.pluck(midiFreq(chord.root - 12), t, 0.34, 1.6, 'sine');
    }
    /* هارپ/آرپژ (چنگ) هر نت‌چنگ */
    if (beatInBar % 2 === 0) {
      const tone = chord.tones[(beatInBar / 2) % chord.tones.length];
      this.pluck(midiFreq(tone), t + 0.005, 0.11, 1.1, 'triangle');
    }
    /* ملودی پراکنده */
    if (beatInBar % 4 === 3 && Math.random() < 0.55) {
      const pool = chord.melody;
      const note = pool[Math.floor(Math.random() * pool.length)];
      this.pluck(midiFreq(note), t + 0.01, 0.15, 1.3, 'triangle');
    }
    /* طبل قاب نرم در ضرب‌های ۲ و ۴ */
    if (beatInBar === 4 || beatInBar === 12) {
      this.drum(t + 0.005, 0.09);
    }
    /* جرینگه‌ی زنگوله گاه‌به‌گاه */
    if (beatInBar === 6 && Math.random() < 0.3) {
      this.shimmer(t, 0.05);
    }
  },

  /* ---------- صداهای پایه ---------- */
  pluck(freq, time, vel, dur, type) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = type || 'triangle';
    osc.frequency.value = freq;
    if (type === 'triangle') {
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = freq;
      osc2.detune.value = 5;
      const g2 = this.ctx.createGain();
      g2.gain.value = 0.5;
      osc2.connect(g2);
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(freq * 5, time);
      filt.frequency.exponentialRampToValueAtTime(freq * 1.8, time + dur);
      g2.connect(filt);
      osc.connect(filt);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(vel, time + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      filt.connect(g).connect(this.musicBus);
      osc.start(time); osc.stop(time + dur + 0.05);
      osc2.start(time); osc2.stop(time + dur + 0.05);
      return;
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g).connect(this.musicBus);
    osc.start(time); osc.stop(time + dur + 0.05);
  },

  drum(time, vel) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(48, time + 0.16);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
    o.connect(g).connect(this.musicBus);
    o.start(time); o.stop(time + 0.35);
  },

  shimmer(time, vel) {
    if (!this.ctx) return;
    const dur = 0.4;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vel, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(hp).connect(g).connect(this.musicBus);
    src.start(time);
  },
};

/* ---------- تئوری موسیقی ---------- */
function midiFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

const STEP_DUR = 60 / 76 / 4;  /* ۷۶ ضرب در دقیقه، نت‌چنگ */

/* پروگرسیون: رِ مینور → سی‌بمل → فا → دو  (حال‌وهوای کهن/حماسی) */
const CHORDS = [
  { root: 38, tones: [50, 53, 57], melody: [62, 64, 65, 67, 69, 70] },  /* Dm */
  { root: 46, tones: [46, 50, 53], melody: [58, 60, 62, 65] },          /* Bb */
  { root: 41, tones: [41, 45, 48], melody: [53, 55, 57, 60, 62] },      /* F */
  { root: 48, tones: [48, 52, 55], melody: [60, 62, 64, 67, 69] },      /* C */
];
