// موتور موسیقی بی‌کلام بازی (WebAudio، بدون فایل صوتی و بدون وابستگی)
// ۵ قطعه‌ی سینمایی/حماسی که به‌ترتیب تصادفی پشت‌سرهم پخش می‌شوند (هر قطعه ~۲ تا ۲/۵ دقیقه)
// و بین قطعه‌ها کراس‌فید دارند. هر قطعه با اضافه شدن لایه‌ها (پد، بیس، آرپژ، ملودی، طبل) در طول زمان تکامل پیدا می‌کند.

export type Quality = 'm' | 'M' | 'sus2' | 'm7' | 'M7';

const QUALITY: Record<Quality, number[]> = {
  m: [0, 3, 7],
  M: [0, 4, 7],
  sus2: [0, 2, 7],
  m7: [0, 3, 7, 10],
  M7: [0, 4, 7, 11],
};

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

export interface MusicTrack {
  id: string;
  name: string;
  bpm: number;
  root: number; // نت پایه (MIDI)
  scale: number[];
  chords: { r: number; q: Quality }[];
  barsPerChord: number;
  loops: number;
  drums: 'none' | 'soft' | 'march' | 'war';
  drumsFrom: number;
  melody: 'bell' | 'strings' | 'pluck';
  melodyFrom: number;
  arp: boolean;
  arpFrom: number;
  bassFrom: number;
  bassPulse: boolean;
  bright: number; // روشنی صدای پد (۰ تا ۱)
}

export const TRACKS: MusicTrack[] = [
  {
    id: 'dawn',
    name: 'طلوع امپراتوری',
    bpm: 66,
    root: 50, // D
    scale: SCALES.minor,
    chords: [{ r: 0, q: 'm' }, { r: -4, q: 'M' }, { r: 3, q: 'M' }, { r: -2, q: 'M' }],
    barsPerChord: 2,
    loops: 5,
    drums: 'soft',
    drumsFrom: 3,
    melody: 'strings',
    melodyFrom: 2,
    arp: true,
    arpFrom: 2,
    bassFrom: 1,
    bassPulse: false,
    bright: 0.5,
  },
  {
    id: 'iron',
    name: 'مرز آهنین',
    bpm: 84,
    root: 45, // A
    scale: SCALES.minor,
    chords: [{ r: 0, q: 'm' }, { r: 5, q: 'm' }, { r: -4, q: 'M' }, { r: 7, q: 'm' }],
    barsPerChord: 2,
    loops: 6,
    drums: 'war',
    drumsFrom: 2,
    melody: 'strings',
    melodyFrom: 3,
    arp: true,
    arpFrom: 1,
    bassFrom: 1,
    bassPulse: true,
    bright: 0.7,
  },
  {
    id: 'siege',
    name: 'محاصره‌ی خاموش',
    bpm: 54,
    root: 52, // E
    scale: SCALES.phrygian,
    chords: [{ r: 0, q: 'm7' }, { r: 1, q: 'M' }, { r: 0, q: 'm' }, { r: -2, q: 'M' }],
    barsPerChord: 2,
    loops: 4,
    drums: 'none',
    drumsFrom: 99,
    melody: 'bell',
    melodyFrom: 1,
    arp: false,
    arpFrom: 99,
    bassFrom: 0,
    bassPulse: false,
    bright: 0.25,
  },
  {
    id: 'victory',
    name: 'راهپیمایی پیروزی',
    bpm: 92,
    root: 55, // G
    scale: SCALES.major,
    chords: [{ r: 0, q: 'M' }, { r: 5, q: 'M' }, { r: -3, q: 'm' }, { r: 7, q: 'M' }],
    barsPerChord: 2,
    loops: 7,
    drums: 'march',
    drumsFrom: 2,
    melody: 'bell',
    melodyFrom: 2,
    arp: true,
    arpFrom: 1,
    bassFrom: 1,
    bassPulse: false,
    bright: 0.8,
  },
  {
    id: 'horizon',
    name: 'افق سرد',
    bpm: 60,
    root: 48, // C
    scale: SCALES.minor,
    chords: [{ r: 0, q: 'm' }, { r: -2, q: 'M' }, { r: -4, q: 'M' }, { r: -2, q: 'M' }],
    barsPerChord: 2,
    loops: 5,
    drums: 'soft',
    drumsFrom: 3,
    melody: 'pluck',
    melodyFrom: 2,
    arp: true,
    arpFrom: 2,
    bassFrom: 1,
    bassPulse: false,
    bright: 0.35,
  },
];

export const barSeconds = (t: MusicTrack) => (4 * 60) / t.bpm;
export const totalBars = (t: MusicTrack) => t.chords.length * t.barsPerChord * t.loops;

// ───────────── ابزارهای صوتی ─────────────

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoise(ctx: BaseAudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// پاسخ ضربه‌ی ریورب (سالن بزرگ) که با نویز نمایی ساخته می‌شود
export function makeImpulse(ctx: BaseAudioContext, seconds = 3.4, decay = 2.6): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export interface MusicChain {
  dry: GainNode; // ورودی صدای خشک
  rev: GainNode; // ورودی ریورب
  master: GainNode; // کنترل صدا
  noise: AudioBuffer;
}

// زنجیره‌ی خروجی: (خشک + ریورب) → کمپرسور → صدای کل → خروجی
export function createMusicChain(ctx: BaseAudioContext, destination: AudioNode): MusicChain {
  const dry = ctx.createGain();
  const rev = ctx.createGain();
  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulse(ctx);
  const revOut = ctx.createGain();
  revOut.gain.value = 0.5;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 18;
  comp.ratio.value = 3;
  comp.attack.value = 0.02;
  comp.release.value = 0.4;
  const master = ctx.createGain();
  master.gain.value = 0.5;

  dry.connect(comp);
  rev.connect(convolver);
  convolver.connect(revOut);
  revOut.connect(comp);
  comp.connect(master);
  master.connect(destination);
  return { dry, rev, master, noise: makeNoise(ctx) };
}

export interface TrackEnv {
  ctx: BaseAudioContext;
  out: GainNode; // باس صدای همین قطعه (برای فید)
  rev: GainNode; // ارسال به ریورب (همراه با فید)
  noise: AudioBuffer;
}

export function createTrackEnv(ctx: BaseAudioContext, chain: MusicChain): TrackEnv {
  const out = ctx.createGain();
  const rev = ctx.createGain();
  out.connect(chain.dry);
  rev.connect(chain.rev);
  return { ctx, out, rev, noise: chain.noise };
}

// هر نت: مسیر خشک + ارسال به ریورب
function route(e: TrackEnv, node: AudioNode, wet: number, dry = 1) {
  const d = e.ctx.createGain();
  d.gain.value = dry;
  node.connect(d);
  d.connect(e.out);
  if (wet > 0) {
    const w = e.ctx.createGain();
    w.gain.value = wet;
    node.connect(w);
    w.connect(e.rev);
  }
}

// ───────────── سازها ─────────────

function padVoice(e: TrackEnv, midi: number, t: number, dur: number, vol: number, bright: number) {
  const ctx = e.ctx;
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 450 + bright * 1500;
  f.Q.value = 0.7;
  const attack = Math.min(1.8, dur * 0.4);
  const release = 2.4;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.linearRampToValueAtTime(vol, t + dur);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + release);

  const freq = mtof(midi);
  [-8, 8].forEach((det) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = det;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + release + 0.1);
  });
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = freq / 2;
  const subG = ctx.createGain();
  subG.gain.value = 0.5;
  sub.connect(subG);
  subG.connect(f);
  sub.start(t);
  sub.stop(t + dur + release + 0.1);

  f.connect(g);
  route(e, g, 0.55);
}

function bassNote(e: TrackEnv, midi: number, t: number, dur: number, vol: number, release = 1.2) {
  const ctx = e.ctx;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.25);
  g.gain.linearRampToValueAtTime(vol * 0.9, t + Math.max(0.3, dur));
  g.gain.linearRampToValueAtTime(0.0001, t + dur + release);
  const freq = mtof(midi);
  const o1 = ctx.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = freq;
  const o2 = ctx.createOscillator();
  o2.type = 'triangle';
  o2.frequency.value = freq;
  const g2 = ctx.createGain();
  g2.gain.value = 0.3;
  o1.connect(g);
  o2.connect(g2);
  g2.connect(g);
  o1.start(t);
  o2.start(t);
  o1.stop(t + dur + release + 0.1);
  o2.stop(t + dur + release + 0.1);
  route(e, g, 0.08);
}

function pluck(e: TrackEnv, midi: number, t: number, vol: number, decay = 0.9) {
  const ctx = e.ctx;
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(3200, t);
  f.frequency.exponentialRampToValueAtTime(700, t + decay);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = mtof(midi);
  o.connect(f);
  f.connect(g);
  o.start(t);
  o.stop(t + decay + 0.1);
  route(e, g, 0.6);
}

function bell(e: TrackEnv, midi: number, t: number, vol: number, decay = 2.6) {
  const ctx = e.ctx;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  const f0 = mtof(midi);
  [
    [1, 1],
    [2.01, 0.35],
    [3.98, 0.12],
  ].forEach(([mult, amp]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f0 * mult;
    const ga = ctx.createGain();
    ga.gain.value = amp;
    o.connect(ga);
    ga.connect(g);
    o.start(t);
    o.stop(t + decay + 0.1);
  });
  route(e, g, 0.75);
}

function strings(e: TrackEnv, midi: number, t: number, dur: number, vol: number) {
  const ctx = e.ctx;
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1700;
  f.Q.value = 0.5;
  const attack = Math.min(0.5, dur * 0.4);
  const release = 1.4;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.linearRampToValueAtTime(vol * 0.85, t + dur);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + release);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 6; // سنت
  lfo.connect(lfoG);
  const freq = mtof(midi);
  [-6, 6].forEach((det) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = det;
    lfoG.connect(o.detune);
    o.connect(f);
    o.start(t);
    o.stop(t + dur + release + 0.1);
  });
  lfo.start(t);
  lfo.stop(t + dur + release + 0.1);
  f.connect(g);
  route(e, g, 0.55);
}

function timpani(e: TrackEnv, t: number, vol: number, pitch = 72) {
  const ctx = e.ctx;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(pitch * 2, t);
  o.frequency.exponentialRampToValueAtTime(pitch, t + 0.2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  o.connect(g);
  o.start(t);
  o.stop(t + 1.6);

  const n = ctx.createBufferSource();
  n.buffer = e.noise;
  const nf = ctx.createBiquadFilter();
  nf.type = 'lowpass';
  nf.frequency.value = 260;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vol * 0.9, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  n.connect(nf);
  nf.connect(ng);
  n.start(t, Math.random() * 1.5, 0.2);
  route(e, g, 0.3);
  route(e, ng, 0.2);
}

function snare(e: TrackEnv, t: number, vol: number) {
  const ctx = e.ctx;
  const n = ctx.createBufferSource();
  n.buffer = e.noise;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1400;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3200;
  bp.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  n.connect(hp);
  hp.connect(bp);
  bp.connect(g);
  n.start(t, Math.random() * 1.5, 0.15);
  route(e, g, 0.25);
}

// ریزر (صدای بالارونده‌ی نویز) در آخرین میزان هر دور برای گذار سینمایی
function riser(e: TrackEnv, t: number, dur: number, vol: number) {
  const ctx = e.ctx;
  const n = ctx.createBufferSource();
  n.buffer = e.noise;
  n.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(350, t);
  bp.frequency.exponentialRampToValueAtTime(3600, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.92);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
  n.connect(bp);
  bp.connect(g);
  n.start(t);
  n.stop(t + dur + 0.3);
  route(e, g, 0.5);
}

// ───────────── زمان‌بندی هر میزان ─────────────

export interface BarState {
  rng: () => number;
  lastMelody: number;
}

export function newBarState(seed: number): BarState {
  return { rng: mulberry32(seed), lastMelody: 0 };
}

const MELODY_TEMPLATES: [number, number][][] = [
  [[0, 4], [4, 4]],
  [[0, 3], [3, 1], [4, 4]],
  [[0, 8]],
  [[2, 2], [4, 2], [6, 2]],
  [[0, 2], [2, 2], [4, 4]],
  [[0, 6], [6, 2]],
];

const ARP_PATTERNS: number[][] = [
  [0, 1, 2, 1, 0, 1, 2, 1],
  [0, 2, 1, 2, 0, 2, 1, 2],
  [0, 1, 2, 3, 2, 1, 0, 1],
];

export function scheduleBar(e: TrackEnv, track: MusicTrack, barNo: number, t0: number, st: BarState) {
  const rng = st.rng;
  const beat = 60 / track.bpm;
  const barLen = 4 * beat;
  const barsPerLoop = track.chords.length * track.barsPerChord;
  const loop = Math.floor(barNo / barsPerLoop);
  const barInLoop = barNo % barsPerLoop;
  const chordIdx = Math.floor(barInLoop / track.barsPerChord);
  const barInChord = barInLoop % track.barsPerChord;
  const chord = track.chords[chordIdx];
  const chordRoot = track.root + chord.r;
  const tones = QUALITY[chord.q].map((i) => chordRoot + i);
  const lastLoop = loop === track.loops - 1;
  const firstLoop = loop === 0;
  const chordDur = track.barsPerChord * barLen;

  // ۱) پد: همیشه
  if (barInChord === 0) {
    const padNotes = [tones[0], tones[1], tones[2], tones[0] + 12, (tones[3] ?? tones[1]) + 12];
    const padVol = (lastLoop ? 0.8 : 1) * (firstLoop ? 0.9 : 1) * 0.026;
    padNotes.forEach((n, i) => padVoice(e, n, t0 + i * 0.03, chordDur, padVol, track.bright));
  }

  // ۲) بیس
  if (loop >= track.bassFrom && barInChord === 0) {
    bassNote(e, tones[0] - 12, t0, chordDur - 0.2, lastLoop ? 0.11 : 0.15);
  }
  if (track.bassPulse && loop >= track.bassFrom + 1 && !lastLoop) {
    for (let i = 0; i < 8; i++) {
      const accent = i % 4 === 0 ? 1 : 0.55;
      bassNote(e, tones[0] - (i % 2 === 0 ? 12 : 24), t0 + (i * beat) / 2, beat * 0.3, 0.07 * accent, 0.25);
    }
  }

  // ۳) آرپژ
  if (track.arp && loop >= track.arpFrom && !lastLoop) {
    const pattern = ARP_PATTERNS[(chordIdx + loop) % ARP_PATTERNS.length];
    for (let i = 0; i < 8; i++) {
      if (rng() < 0.18) continue; // کمی خلوت
      const idx = pattern[i] % tones.length;
      const n = tones[idx] + 12 + (i % 4 === 3 && rng() < 0.4 ? 12 : 0);
      pluck(e, n, t0 + (i * beat) / 2, i % 2 === 0 ? 0.05 : 0.03, 0.8);
    }
  }

  // ۴) ملودی
  if (loop >= track.melodyFrom && !lastLoop && rng() > 0.2) {
    const tpl = MELODY_TEMPLATES[Math.floor(rng() * MELODY_TEMPLATES.length)];
    const lo = track.root + 12;
    const hi = track.root + 29;
    const scaleNotes: number[] = [];
    for (let o = 0; o < 4; o++) track.scale.forEach((s) => scaleNotes.push(track.root + 12 * o + s));
    const pool = scaleNotes.filter((n) => n >= lo && n <= hi);
    const chordPool = pool.filter((n) => tones.some((tn) => (n - tn) % 12 === 0));
    tpl.forEach(([startEighth, lenEighths]) => {
      let note: number;
      if (rng() < 0.62 && chordPool.length) {
        const sorted = chordPool.slice().sort((a, b) => Math.abs(a - st.lastMelody) - Math.abs(b - st.lastMelody));
        note = sorted[Math.min(sorted.length - 1, Math.floor(rng() * 3))];
      } else {
        const sorted = pool.slice().sort((a, b) => Math.abs(a - st.lastMelody) - Math.abs(b - st.lastMelody));
        note = sorted[Math.min(sorted.length - 1, 1 + Math.floor(rng() * 2))];
      }
      if (!st.lastMelody) note = chordPool[Math.floor(chordPool.length / 2)] ?? pool[0];
      st.lastMelody = note;
      const t = t0 + (startEighth * beat) / 2;
      const dur = (lenEighths * beat) / 2;
      if (track.melody === 'strings') strings(e, note, t, dur, 0.034);
      else if (track.melody === 'bell') bell(e, note, t, 0.07, 2.8);
      else pluck(e, note, t, 0.085, 1.4);
    });
  }

  // ۵) طبل
  if (track.drums !== 'none' && loop >= track.drumsFrom && !lastLoop) {
    if (track.drums === 'soft') {
      if (barInChord === 0) timpani(e, t0, 0.5, 64);
      if (barInChord === 1) timpani(e, t0 + 2 * beat, 0.28, 72);
    } else if (track.drums === 'march') {
      timpani(e, t0, 0.5, 70);
      timpani(e, t0 + 2 * beat, 0.4, 70);
      snare(e, t0 + beat, 0.13);
      snare(e, t0 + 3 * beat, 0.13);
      if (barInChord === 1) snare(e, t0 + 3.5 * beat, 0.08);
    } else {
      // war: ضرب‌های سنگین و نامتقارن
      timpani(e, t0, 0.62, 58);
      timpani(e, t0 + 1.5 * beat, 0.34, 66);
      timpani(e, t0 + 2 * beat, 0.5, 58);
      timpani(e, t0 + 3.5 * beat, 0.3, 74);
      if (barInChord === 1) {
        for (let i = 0; i < 4; i++) snare(e, t0 + 3 * beat + (i * beat) / 4, 0.05 + i * 0.015);
      }
    }
  }

  // ۶) ریزر در آخرین میزان هر دورِ میانی
  if (loop >= 1 && !lastLoop && barInLoop === barsPerLoop - 1) {
    riser(e, t0, barLen, 0.045);
  }
}

// ───────────── موتور زمان‌واقعی ─────────────

export interface MusicState {
  playing: boolean;
  volume: number;
  trackName: string | null;
  trackIndex: number;
}

const LOOKAHEAD = 6; // ثانیه
const FADE = 3; // ثانیه (کراس‌فید بین قطعه‌ها)

interface Running {
  index: number;
  track: MusicTrack;
  env: TrackEnv;
  st: BarState;
  bar: number;
  nextTime: number;
  endTime: number;
}

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private chain: MusicChain | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private cur: Running | null = null;
  private order: number[] = [];
  private lastIndex = -1;
  private volume = 0.4;
  private playing = false;
  private listeners = new Set<() => void>();

  getState(): MusicState {
    return {
      playing: this.playing,
      volume: this.volume,
      trackName: this.cur ? this.cur.track.name : null,
      trackIndex: this.cur ? this.cur.index : -1,
    };
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private emit() {
    this.listeners.forEach((cb) => cb());
  }

  private masterLevel() {
    return Math.pow(this.volume, 1.7) * 0.9;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.chain) {
      this.chain.master.gain.setTargetAtTime(this.masterLevel(), this.ctx.currentTime, 0.05);
    }
    this.emit();
  }

  private pickNext(): number {
    if (this.order.length === 0) {
      const idx = TRACKS.map((_, i) => i).sort(() => Math.random() - 0.5);
      // قطعه‌ی اول دور جدید نباید با آخرین قطعه‌ی پخش‌شده یکی باشد
      if (idx[0] === this.lastIndex && idx.length > 1) idx.push(idx.shift() as number);
      this.order = idx;
    }
    const next = this.order.shift() as number;
    this.lastIndex = next;
    return next;
  }

  private startTrack(startAt: number) {
    if (!this.ctx || !this.chain) return;
    const index = this.pickNext();
    const track = TRACKS[index];
    const env = createTrackEnv(this.ctx, this.chain);
    // ورود نرم
    env.out.gain.setValueAtTime(0.0001, startAt);
    env.out.gain.linearRampToValueAtTime(1, startAt + FADE);
    env.rev.gain.setValueAtTime(0.0001, startAt);
    env.rev.gain.linearRampToValueAtTime(1, startAt + FADE);
    this.cur = {
      index,
      track,
      env,
      st: newBarState(Math.floor(Math.random() * 1e9)),
      bar: 0,
      nextTime: startAt,
      endTime: startAt,
    };
    this.emit();
  }

  private tick = () => {
    if (!this.ctx || !this.playing) return;
    let guard = 0;
    while (this.cur && this.cur.nextTime < this.ctx.currentTime + LOOKAHEAD && guard++ < 64) {
      const c = this.cur;
      if (c.bar >= totalBars(c.track)) {
        // پایان قطعه: خروج نرم و شروع قطعه‌ی بعد با هم‌پوشانی
        const fadeStart = Math.max(this.ctx.currentTime + 0.05, c.endTime - FADE);
        c.env.out.gain.setValueAtTime(1, fadeStart);
        c.env.out.gain.linearRampToValueAtTime(0.0001, c.endTime);
        c.env.rev.gain.setValueAtTime(1, fadeStart);
        c.env.rev.gain.linearRampToValueAtTime(0.0001, c.endTime);
        this.startTrack(Math.max(this.ctx.currentTime + 0.1, c.endTime - FADE));
        continue;
      }
      scheduleBar(c.env, c.track, c.bar, c.nextTime, c.st);
      c.bar += 1;
      c.nextTime += barSeconds(c.track);
      c.endTime = c.nextTime;
    }
  };

  // باید از داخل یک رویداد کاربر (کلیک/کلید) صدا زده شود (محدودیت مرورگرها برای پخش خودکار)
  async play() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.chain = createMusicChain(this.ctx, this.ctx.destination);
      this.chain.master.gain.value = 0.0001;
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.playing = true;
    if (this.chain) this.chain.master.gain.setTargetAtTime(this.masterLevel(), this.ctx.currentTime, 0.25);
    if (!this.cur) this.startTrack(this.ctx.currentTime + 0.15);
    if (!this.timer) this.timer = setInterval(this.tick, 400);
    this.tick();
    this.emit();
  }

  pause() {
    if (!this.ctx || !this.chain) return;
    this.playing = false;
    this.chain.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.12);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const ctx = this.ctx;
    setTimeout(() => {
      if (!this.playing && ctx.state === 'running') ctx.suspend();
    }, 500);
    this.emit();
  }

  toggle() {
    if (this.playing) this.pause();
    else void this.play();
  }

  // رفتن به قطعه‌ی بعد
  next() {
    if (!this.ctx || !this.playing || !this.cur) return;
    const now = this.ctx.currentTime;
    const old = this.cur;
    old.env.out.gain.cancelScheduledValues(now);
    old.env.out.gain.setValueAtTime(Math.max(0.0001, old.env.out.gain.value), now);
    old.env.out.gain.linearRampToValueAtTime(0.0001, now + 1.5);
    old.env.rev.gain.cancelScheduledValues(now);
    old.env.rev.gain.setValueAtTime(Math.max(0.0001, old.env.rev.gain.value), now);
    old.env.rev.gain.linearRampToValueAtTime(0.0001, now + 1.5);
    this.startTrack(now + 0.4);
    this.tick();
  }
}

let singleton: MusicEngine | null = null;
// یک نمونه‌ی مشترک برای کل برنامه (با عوض شدن صفحه‌ها موسیقی قطع نمی‌شود)
export function getMusicEngine(): MusicEngine {
  if (!singleton) singleton = new MusicEngine();
  return singleton;
}
