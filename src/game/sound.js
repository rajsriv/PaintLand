// Procedural Web Audio API sound & ambient music engine
// Generates nature sounds, bird chirps, sea breeze, and light instrumental background music procedurally.

let ctx = null;
let isMuted = false;
let ambienceStarted = false;
let currentSeason = 0; // 0=Spring, 1=Summer, 2=Autumn, 3=Winter

// Master audio nodes
let sfxGainNode = null;
let ambientMasterGainNode = null;
let breezeGainNode = null;
let musicGainNode = null;
let delayNodeL = null;
let delayNodeR = null;

// Active timers
let birdTimer = null;
let musicTimer = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      ctx = new AudioContext();
      setupMasterNodes();
    }
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function setupMasterNodes() {
  if (!ctx) return;

  // Master SFX Gain
  sfxGainNode = ctx.createGain();
  sfxGainNode.gain.setValueAtTime(1.0, ctx.currentTime);
  sfxGainNode.connect(ctx.destination);

  // Master Ambient Gain (Sea breeze, birds, light music)
  ambientMasterGainNode = ctx.createGain();
  ambientMasterGainNode.gain.setValueAtTime(isMuted ? 0 : 0.7, ctx.currentTime);
  ambientMasterGainNode.connect(ctx.destination);

  // Lightweight Feed-Forward Stereo Delay for Dreamy Kalimba (Zero Cyclic Loops)
  try {
    delayNodeL = ctx.createDelay();
    delayNodeR = ctx.createDelay();
    delayNodeL.delayTime.value = 0.32;
    delayNodeR.delayTime.value = 0.52;

    const gainL = ctx.createGain();
    const gainR = ctx.createGain();
    gainL.gain.value = 0.32;
    gainR.gain.value = 0.22;

    const filterL = ctx.createBiquadFilter();
    const filterR = ctx.createBiquadFilter();
    filterL.type = 'lowpass';
    filterL.frequency.value = 1400;
    filterR.type = 'lowpass';
    filterR.frequency.value = 1200;

    delayNodeL.connect(filterL);
    filterL.connect(gainL);

    delayNodeR.connect(filterR);
    filterR.connect(gainR);

    // Pan delays left and right if stereo panner supported
    if (ctx.createStereoPanner) {
      const pannerL = ctx.createStereoPanner();
      const pannerR = ctx.createStereoPanner();
      pannerL.pan.value = -0.4;
      pannerR.pan.value = 0.4;
      gainL.connect(pannerL);
      gainR.connect(pannerR);
      pannerL.connect(ambientMasterGainNode);
      pannerR.connect(ambientMasterGainNode);
    } else {
      gainL.connect(ambientMasterGainNode);
      gainR.connect(ambientMasterGainNode);
    }
  } catch {
    // Fallback if delay fails
  }
}

// -------------------------------------------------------------
// 1. Procedural Sea Breeze & Ocean Waves
// -------------------------------------------------------------
function startSeaBreeze() {
  if (!ctx || breezeGainNode) return;

  try {
    // Generate 1.5 seconds of smooth Brownian noise (super fast, low memory)
    const bufferSize = Math.floor(ctx.sampleRate * 1.5);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 2.5; // normalize volume
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Fixed bandpass filter for ocean wind
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380, ctx.currentTime);
    filter.Q.setValueAtTime(0.7, ctx.currentTime);

    // Volume swell LFO (modulating gain, zero filter recomputation cost)
    breezeGainNode = ctx.createGain();
    breezeGainNode.gain.setValueAtTime(0.045, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.11, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.022, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(breezeGainNode.gain);

    noiseSource.connect(filter);
    filter.connect(breezeGainNode);
    breezeGainNode.connect(ambientMasterGainNode);

    noiseSource.start();
    lfo.start();
  } catch {
    // Continue even if audio nodes fail
  }
}

// -------------------------------------------------------------
// 2. Procedural Nature Bird Songs & Forest Chirps
// -------------------------------------------------------------
function triggerBirdChirp() {
  if (!ctx || isMuted || ctx.state !== 'running') {
    scheduleNextBird();
    return;
  }

  // Winter has fewer birds; Spring & Summer have lively songs
  if (currentSeason === 3 && Math.random() < 0.6) {
    scheduleNextBird();
    return;
  }

  const t = ctx.currentTime;
  const style = Math.floor(Math.random() * 3); // 0 = double chirp, 1 = warble trill, 2 = sweet forest whistle

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, t);

    // Panning in stereo space
    let panner = null;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.random() * 1.4 - 0.7, t);
    }

    if (style === 0) {
      // Double chirp ("tweet-tweet")
      osc.type = 'sine';
      const baseF = 2800 + Math.random() * 800;
      osc.frequency.setValueAtTime(baseF, t);
      osc.frequency.exponentialRampToValueAtTime(baseF + 900, t + 0.05);
      osc.frequency.setValueAtTime(baseF + 200, t + 0.09);
      osc.frequency.exponentialRampToValueAtTime(baseF + 1200, t + 0.15);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.10);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      if (panner) {
        gain.connect(panner);
        panner.connect(ambientMasterGainNode);
      } else {
        gain.connect(ambientMasterGainNode);
      }
      osc.start(t);
      osc.stop(t + 0.17);
    } else if (style === 1) {
      // Gentle forest warble
      osc.type = 'sine';
      const baseF = 3200 + Math.random() * 600;
      osc.frequency.setValueAtTime(baseF, t);
      osc.frequency.linearRampToValueAtTime(baseF - 400, t + 0.2);

      // Fast subtle vibrato
      const vibrato = ctx.createOscillator();
      const vibGain = ctx.createGain();
      vibrato.frequency.setValueAtTime(26, t);
      vibGain.gain.setValueAtTime(250, t);
      vibrato.connect(vibGain);
      vibGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      vibrato.start(t);
      vibrato.stop(t + 0.22);
      osc.connect(filter);
      filter.connect(gain);
      if (panner) {
        gain.connect(panner);
        panner.connect(ambientMasterGainNode);
      } else {
        gain.connect(ambientMasterGainNode);
      }
      osc.start(t);
      osc.stop(t + 0.22);
    } else {
      // Long melodious whistle
      osc.type = 'triangle';
      const baseF = 2600 + Math.random() * 600;
      osc.frequency.setValueAtTime(baseF, t);
      osc.frequency.exponentialRampToValueAtTime(baseF + 600, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(baseF - 200, t + 0.22);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.035, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      if (panner) {
        gain.connect(panner);
        panner.connect(ambientMasterGainNode);
      } else {
        gain.connect(ambientMasterGainNode);
      }
      osc.start(t);
      osc.stop(t + 0.25);
    }
  } catch {
    // Ignore sound glitch
  }

  scheduleNextBird();
}

function scheduleNextBird() {
  if (birdTimer) clearTimeout(birdTimer);
  // Interval between 3.5s and 8.5s
  const delay = Math.random() * 5000 + 3500;
  birdTimer = setTimeout(triggerBirdChirp, delay);
}

// -------------------------------------------------------------
// 3. Very Light Background Instrumental (Meditative Island Kalimba / Piano)
// -------------------------------------------------------------
// Beautiful serene pentatonic note frequencies (Hz): D-G-A-B-D-E-G-A
const PEACEFUL_NOTES = [
  196.00, // G3
  220.00, // A3
  246.94, // B3
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  493.88, // B4
  587.33, // D5
  659.25, // E5
  783.99  // G5
];

// Melodic motifs / sequences for organic peaceful phrasing
let noteIndex = 0;
let phraseProgress = 0;

function playLightInstrumentalNote() {
  if (!ctx || isMuted || ctx.state !== 'running') {
    scheduleNextMusicNote();
    return;
  }

  const t = ctx.currentTime;

  try {
    // Choose note following a soothing wandering melodic pattern
    if (Math.random() < 0.25 || phraseProgress >= 6) {
      phraseProgress = 0;
      noteIndex = Math.floor(Math.random() * 5) + 2; // reset to mid-register
    } else {
      const step = Math.random() < 0.5 ? 1 : Math.random() < 0.75 ? -1 : 2;
      noteIndex = Math.max(0, Math.min(PEACEFUL_NOTES.length - 1, noteIndex + step));
      phraseProgress++;
    }

    const freq = PEACEFUL_NOTES[noteIndex];
    // Occasional gentle dyad harmony (5th or octave)
    const playHarmonic = Math.random() < 0.28;
    const harmonicFreq = noteIndex + 4 < PEACEFUL_NOTES.length ? PEACEFUL_NOTES[noteIndex + 4] : null;

    playSingleKalimbaNote(freq, t, 0.038);
    if (playHarmonic && harmonicFreq) {
      playSingleKalimbaNote(harmonicFreq, t + 0.05, 0.024);
    }
  } catch {
    // Ignore audio errors
  }

  scheduleNextMusicNote();
}

function playSingleKalimbaNote(freq, startTime, velocity) {
  if (!ctx) return;

  // Primary warm bell oscillator (sine + soft overtone)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, startTime);

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(freq * 2, startTime); // gentle harmonic chime overtone

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(currentSeason === 3 ? 1800 : 1200, startTime); // brighter in winter

  // Soft attack (35ms), peaceful long decay (2.4s)
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(velocity, startTime + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.4);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);

  // Send dry signal directly to master
  gain.connect(ambientMasterGainNode);

  // Send wet signal through stereo delay for spacious dreamy ambiance
  if (delayNodeL && delayNodeR) {
    if (Math.random() < 0.5) {
      gain.connect(delayNodeL);
    } else {
      gain.connect(delayNodeR);
    }
  }

  osc1.onended = () => {
    try {
      osc1.disconnect();
      osc2.disconnect();
      filter.disconnect();
      gain.disconnect();
    } catch {}
  };

  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(startTime + 2.5);
  osc2.stop(startTime + 2.5);
}

function scheduleNextMusicNote() {
  if (musicTimer) clearTimeout(musicTimer);
  // Relaxed tempo: one note/phrase every 2.0s to 3.8s
  const interval = Math.random() * 1800 + 2000;
  musicTimer = setTimeout(playLightInstrumentalNote, interval);
}

// -------------------------------------------------------------
// Auto-start ambient audio on first user gesture
// -------------------------------------------------------------
function ensureAmbienceStarted() {
  if (ambienceStarted) return;
  const ac = getContext();
  if (!ac) return;

  ambienceStarted = true;
  startSeaBreeze();
  scheduleNextBird();
  scheduleNextMusicNote();
}

// Attach window listeners to unlock audio context on initial interaction
if (typeof window !== 'undefined') {
  const unlockEvents = ['pointerdown', 'keydown', 'touchstart'];
  const handleUserUnlock = () => {
    ensureAmbienceStarted();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    unlockEvents.forEach((evt) => window.removeEventListener(evt, handleUserUnlock));
  };
  unlockEvents.forEach((evt) => window.addEventListener(evt, handleUserUnlock, { passive: true }));
}

// -------------------------------------------------------------
// Sound Engine Export
// -------------------------------------------------------------
export const sound = {
  get isMuted() {
    return isMuted;
  },

  toggleMute() {
    isMuted = !isMuted;
    this.updateAmbientVolume();
    return isMuted;
  },

  setMuted(val) {
    isMuted = !!val;
    this.updateAmbientVolume();
  },

  updateAmbientVolume() {
    if (!ctx || !ambientMasterGainNode) return;
    const t = ctx.currentTime;
    ambientMasterGainNode.gain.cancelScheduledValues(t);
    if (isMuted) {
      ambientMasterGainNode.gain.linearRampToValueAtTime(0.0001, t + 0.3);
    } else {
      ambientMasterGainNode.gain.linearRampToValueAtTime(0.7, t + 0.5);
      ensureAmbienceStarted();
    }
  },

  setSeason(seasonId) {
    currentSeason = seasonId;
  },

  startAmbience() {
    ensureAmbienceStarted();
  },

  play(type) {
    if (isMuted) return;
    const ac = getContext();
    if (!ac) return;
    ensureAmbienceStarted();

    const t = ac.currentTime;
    const dest = sfxGainNode || ac.destination;

    try {
      if (type === 'pop' || type === 1) {
        // Land/Grass pop
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(480, t + 0.08);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.08);
      } else if (type === 'water' || type === 0 || type === 6) {
        // Water splash / drop
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.12);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.12);
      } else if (type === 'build' || type === 5) {
        // House placement wood knock
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.09);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.09);
      } else if (type === 'road' || type === 3) {
        // Road pebble click
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.exponentialRampToValueAtTime(240, t + 0.05);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.05);
      } else if (type === 'field' || type === 4) {
        // Field warm chime
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(660, t + 0.1);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.1);
      } else if (type === 'rock' || type === 2) {
        // Rock heavy thud
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.12);
      } else if (type === 'undo') {
        // Whoosh
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.15);
      } else if (type === 'click') {
        // Subtle interface tick
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.04);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.04);
      } else if (type === 'season') {
        // Season arpeggio
        [440, 554, 659].forEach((freq, idx) => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.05);
          gain.gain.setValueAtTime(0.12, t + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.15);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(t + idx * 0.05);
          osc.stop(t + idx * 0.05 + 0.15);
        });
      }
    } catch {
      // Audio context might be restricted before interaction
    }
  }
};
