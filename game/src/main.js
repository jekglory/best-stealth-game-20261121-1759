// Main: boot the game, run the loop, wire input, sounds and staged shots.
import { FOOTSTEP_INTERVAL, VIEW_H, VIEW_W } from './config.js';
import { ensureAudio, playAlarm, playCaught, playLevelClear, playPickup, playPebble, playStep, playWin, startDrone, toggleMute } from './audio.js';
import { bindKeyboard, bindMouse, makeKeys } from './input.js';
import { render } from './render.js';
import { readParams, selfTest, stageShot } from './shots.js';
import { SCREEN, autopilotKeys, makeWorld, nextLevel, startGame, tossPebble, updateWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = readParams();
const world = makeWorld(params.seed);
const keys = makeKeys();
// Test hook: lets a play-test driver read the live game state.
window.__lamplight = { world, keys };
let lastStepAt = 0;
let winPlayed = false;
let clearPlayed = false;

if (params.shot) {
  stageShot(world, params.shot);
}

if (params.selftest) {
  const results = selfTest();
  console.log('LAMPLIGHT selftest:');
  results.forEach((r) => console.log(`${r.pass ? 'PASS' : 'FAIL'} — ${r.name}`));
  document.title = `selftest ${results.every((r) => r.pass) ? 'PASS' : 'FAIL'}`;
}

// One-off actions: start, pause, pickup, mute.
function onAction(action) {
  ensureAudio();
  if (action === 'start') {
    if (world.screen === SCREEN.TITLE) {
      startGame(world);
      startDrone();
    } else if (world.screen === SCREEN.LEVEL_CLEAR) {
      nextLevel(world);
    } else if (world.screen === SCREEN.WIN || world.screen === SCREEN.LOSE) {
      startGame(world);
    }
  } else if (action === 'pause') {
    if (world.screen === SCREEN.PLAYING) world.screen = SCREEN.PAUSED;
    else if (world.screen === SCREEN.PAUSED) world.screen = SCREEN.PLAYING;
  } else if (action === 'pickup') {
    // Pickups happen by walking over intel; E is a nudge that pings the
    // nearest guard's attention only when the player is already on intel.
  } else if (action === 'mute') {
    toggleMute();
  }
}

bindKeyboard(keys, onAction);
bindMouse(canvas, (tile) => {
  ensureAudio();
  if (world.screen === SCREEN.TITLE) {
    onAction('start');
    return;
  }
  if (world.screen !== SCREEN.PLAYING) return;
  if (tossPebble(world, tile.x, tile.y)) playPebble();
});

// The game loop: fixed 60 Hz ticks, render every frame.
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const activeKeys = params.autopilot ? autopilotKeys(world) : keys;
  // Staged screenshots hold still: the shot is the frame, not a simulation.
  const frozen = params.shot && !params.autopilot;
  if (!frozen) {
    const livesBefore = world.lives;
    const intelBefore = world.intelGot;
    const alarmBefore = world.guards.some((g) => g.state === 2);
    updateWorld(world, dt, activeKeys);
    if (world.intelGot > intelBefore) playPickup();
    if (world.lives < livesBefore) playCaught();
    if (!alarmBefore && world.guards.some((g) => g.state === 2)) playAlarm();
    // Footstep ticks while the thief walks.
    if (world.screen === SCREEN.PLAYING && world.player.moving && world.time - lastStepAt > FOOTSTEP_INTERVAL) {
      lastStepAt = world.time;
      playStep(world.player.sneaking);
    }
    if (world.screen === SCREEN.LEVEL_CLEAR && !clearPlayed) {
      clearPlayed = true;
      playLevelClear();
    }
    if (world.screen === SCREEN.WIN && !winPlayed) {
      winPlayed = true;
      playWin();
    }
  }
  render(ctx, world);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
