// World: the whole game state and its tick. Screens: title, playing, paused,
// level-clear, win (all levels done), lose (out of lives). Pure logic — no
// DOM here, so a node test can drive it headlessly.
import {
  GHOST_BONUS,
  INTEL_PER_LEVEL,
  LEVEL_PAR_SECONDS,
  PEBBLE_FLY_TIME,
  PEBBLE_MARK_SECONDS,
  PEBBLE_NOISE_RADIUS,
  PICKUP_SCORE,
  START_LIVES,
  TIME_BONUS_PER_SECOND,
} from './config.js';
import { guardsHearPebble, makeGuard, updateGuard } from './guards.js';
import { LEVELS, findPath, parseLevel } from './levels.js';
import { makePlayer, onExit, tryPickup, updatePlayer } from './player.js';
import { makeRng } from './random.js';

export const SCREEN = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_CLEAR: 'level-clear',
  WIN: 'win',
  LOSE: 'lose',
};

export function makeWorld(seed = 1337) {
  const world = {
    seed,
    rng: makeRng(seed),
    screen: SCREEN.TITLE,
    levelIndex: 0,
    lives: START_LIVES,
    score: 0,
    levelScore: 0,
    levelTime: 0,
    intelGot: 0,
    spotted: false, // true once any guard raised the alarm this level
    ghost: true, // stays true while no guard ever spotted the player
    message: '',
    messageUntil: 0,
    time: 0,
    player: null,
    guards: [],
    grid: null,
    intel: [],
    exit: null,
    pebbles: [],
    flying: null, // a pebble in the air: {x0,y0,x1,y1,t}
    levelName: LEVELS[0].name,
    levelSub: LEVELS[0].sub,
    lastClear: null, // { timeBonus, ghostBonus, levelScore } of the last clear
  };
  loadLevel(world, 0);
  return world;
}

export function loadLevel(world, index) {
  const def = LEVELS[index];
  const { grid, intel, playerStart, exit } = parseLevel(def);
  world.levelIndex = index;
  world.grid = grid;
  world.intel = intel;
  world.exit = exit;
  world.player = makePlayer(playerStart);
  world.guards = def.guards.map((g, i) => makeGuard(g, i));
  world.levelTime = 0;
  world.intelGot = 0;
  world.spotted = false;
  world.ghost = true;
  world.pebbles = [];
  world.flying = null;
  world.levelName = def.name;
  world.levelSub = def.sub;
  world.levelScore = 0;
}

// Start a fresh run from level 1.
export function startGame(world) {
  world.lives = START_LIVES;
  world.score = 0;
  loadLevel(world, 0);
  world.screen = SCREEN.PLAYING;
}

// Restart the current level after being caught, costing one life.
export function restartLevel(world) {
  world.lives -= 1;
  if (world.lives <= 0) {
    world.screen = SCREEN.LOSE;
    return;
  }
  loadLevel(world, world.levelIndex);
  world.screen = SCREEN.PLAYING;
  flashMessage(world, 'Caught! A life is lost — the gallery resets.');
}

// A short banner message shown above the HUD.
export function flashMessage(world, text) {
  world.message = text;
  world.messageUntil = world.time + 2.6;
}

// Toss a pebble toward a tile. It flies, lands, and nearby guards investigate.
export function tossPebble(world, tx, ty) {
  const p = world.player;
  if (world.screen !== SCREEN.PLAYING) return false;
  if (p.pebbles <= 0) {
    flashMessage(world, 'No pebbles left — move quietly instead.');
    return false;
  }
  if (world.flying) return false;
  p.pebbles -= 1;
  world.flying = { x0: p.x, y0: p.y, x1: tx + 0.5, y1: ty + 0.5, t: 0 };
  return true;
}

// The autopilot: a BFS route to the nearest remaining intel, then the exit.
// Danger tiles (inside a guard's cone) cost extra, so the route prefers cover.
export function autopilotKeys(world) {
  const keys = { left: false, right: false, up: false, down: false, sneak: false, sprint: false };
  if (world.screen !== SCREEN.PLAYING) return keys;
  const grid = world.grid;
  const p = world.player;
  const start = { x: Math.floor(p.x), y: Math.floor(p.y) };
  let target = null;
  const remaining = world.intel.filter((i) => !i.taken);
  if (remaining.length > 0) {
    remaining.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    target = remaining[0];
  } else {
    target = world.exit;
  }
  const path = findPath(grid, start, target);
  if (!path || path.length === 0) return keys;
  const next = path[0];
  const cx = next.x + 0.5;
  const cy = next.y + 0.5;
  const dx = cx - p.x;
  const dy = cy - p.y;
  if (dx < -0.08) keys.left = true;
  if (dx > 0.08) keys.right = true;
  if (dy < -0.08) keys.up = true;
  if (dy > 0.08) keys.down = true;
  // Sneak when a guard is close, so the route stays quiet.
  const nearGuard = world.guards.some((g) => Math.hypot(g.x - p.x, g.y - p.y) < 3.2);
  keys.sneak = nearGuard;
  return keys;
}

// One tick of the game. Keys are the held-key state (or the autopilot's).
export function updateWorld(world, dt, keys) {
  world.time += dt;
  if (world.screen !== SCREEN.PLAYING) return;
  world.levelTime += dt;
  const p = world.player;

  if (world.flying) {
    const f = world.flying;
    f.t += dt / PEBBLE_FLY_TIME;
    if (f.t >= 1) {
    world.pebbles.push({ x: f.x1, y: f.y1, until: world.time + PEBBLE_MARK_SECONDS });
      guardsHearPebble(world.guards, f.x1, f.y1, PEBBLE_NOISE_RADIUS);
      flashMessage(world, 'Clink! A guard heard that.');
      world.flying = null;
    }
  }
  world.pebbles = world.pebbles.filter((pb) => pb.until > world.time);

  updatePlayer(p, dt, keys, world.grid);
  const got = tryPickup(p, world.intel);
  if (got) {
    world.intelGot += 1;
    world.levelScore += PICKUP_SCORE;
    flashMessage(world, `Intel ${world.intelGot}/${INTEL_PER_LEVEL} secured — ${INTEL_PER_LEVEL - world.intelGot} to go.`);
    if (world.intelGot >= INTEL_PER_LEVEL) {
      flashMessage(world, 'All intel secured — reach the green EXIT, unseen!');
    }
  }

  let caught = false;
  for (const g of world.guards) {
    if (g.state === 2) world.spotted = true;
    if (updateGuard(g, dt, p, world.grid) === 'caught') caught = true;
    if (g.state === 2) {
      world.spotted = true;
      world.ghost = false;
    }
  }
  if (caught) {
    restartLevel(world);
    return;
  }

  if (world.intelGot >= INTEL_PER_LEVEL && onExit(p, world.exit)) {
    const timeBonus = Math.max(0, Math.round((LEVEL_PAR_SECONDS - world.levelTime) * TIME_BONUS_PER_SECOND));
    const ghostBonus = world.ghost ? GHOST_BONUS : 0;
    world.levelScore += timeBonus + ghostBonus;
    world.score += world.levelScore;
    world.lastClear = { timeBonus, ghostBonus, levelScore: world.levelScore };
    if (world.levelIndex + 1 >= LEVELS.length) {
      world.screen = SCREEN.WIN;
    } else {
      world.screen = SCREEN.LEVEL_CLEAR;
    }
  }
}

// Advance to the next level after a level-clear screen.
export function nextLevel(world) {
  loadLevel(world, world.levelIndex + 1);
  world.screen = SCREEN.PLAYING;
}
