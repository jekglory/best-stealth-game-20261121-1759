// Sound: tiny WebAudio synth only — no audio files, no network. Footsteps,
// a pebble clink, a pickup chime, an alarm sting and a soft night drone.
let audioCtx = null;
let droneNodes = null;
let muted = false;

export function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC();
  return audioCtx;
}

function tone(freq, dur, type, gainValue, when = 0) {
  if (!audioCtx || muted) return;
  const t0 = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainValue, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playStep(sneaking) {
  tone(sneaking ? 90 : 140, 0.07, 'sine', sneaking ? 0.02 : 0.05);
}

export function playPebble() {
  tone(1900, 0.12, 'triangle', 0.08);
  tone(2400, 0.1, 'triangle', 0.05, 0.07);
}

export function playPickup() {
  tone(660, 0.12, 'sine', 0.1);
  tone(880, 0.16, 'sine', 0.1, 0.09);
  tone(1320, 0.2, 'sine', 0.07, 0.18);
}

export function playAlarm() {
  tone(220, 0.35, 'sawtooth', 0.09);
  tone(330, 0.35, 'sawtooth', 0.09, 0.16);
}

export function playCaught() {
  tone(180, 0.5, 'sawtooth', 0.1);
  tone(120, 0.7, 'sawtooth', 0.1, 0.2);
}

export function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'sine', 0.09, i * 0.12));
}

// A short two-note chime when a gallery is cleared.
export function playLevelClear() {
  tone(784, 0.18, 'sine', 0.09);
  tone(1047, 0.28, 'sine', 0.09, 0.14);
}

// A low night drone that hums under the game once audio is unlocked.
// Two detuned sines give it a slow, uneasy beating.
export function startDrone() {
  if (!audioCtx || droneNodes || muted) return;
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 55;
  osc2.type = 'sine';
  osc2.frequency.value = 55.5;
  gain.gain.value = 0.025;
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc2.start();
  droneNodes = { osc, osc2, gain };
}

export function toggleMute() {
  muted = !muted;
  if (droneNodes) droneNodes.gain.gain.value = muted ? 0 : 0.025;
  return muted;
}
