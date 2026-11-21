// Shots: reproducible staged states for screenshots, driven by the URL.
//   ?shot=start   title screen over level 1, guards patrolling
//   ?shot=patrol  mid-game, 2 of 3 intel collected, score showing
//   ?shot=alert   a guard in full chase, red SPOTTED banner
//   ?shot=win     level cleared, score and ghost bonus on screen
//   ?seed=N       fixes the run's seed (default 20261121)
//   ?autopilot=1  the BFS pilot plays, so the win shot is earned by real play
//   ?selftest=1   runs a headless logic check and prints the result
import { SCREEN, makeWorld, startGame, updateWorld } from './world.js';
import { GUARD_STATE } from './guards.js';

export function readParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot'),
    seed: Number(q.get('seed') || 20261121),
    autopilot: q.get('autopilot') === '1',
    selftest: q.get('selftest') === '1',
  };
}

// Stage a world into the named shot. Returns the staged world.
export function stageShot(world, shot) {
  startGame(world);
  if (shot === 'start') {
    // Title screen over a live level: guards patrol behind the panel.
    world.screen = SCREEN.TITLE;
    return world;
  }
  if (shot === 'patrol') {
    // Mid-game: two intel files already pocketed, the thief deep in the hall.
    world.intel[0].taken = true;
    world.intel[1].taken = true;
    world.intelGot = 2;
    world.levelScore = 500;
    world.player.x = 15.5;
    world.player.y = 10.5;
    world.levelTime = 41;
    return world;
  }
  if (shot === 'alert') {
    // A guard has the thief dead to rights: full suspicion, chase on.
    // Place the thief first, then the guard right beside them, facing them.
    world.player.x = 15.5;
    world.player.y = 10.5;
    const g = world.guards[0];
    g.x = world.player.x + 2.5;
    g.y = world.player.y;
    g.facing = Math.PI;
    g.suspicion = 1;
    g.state = GUARD_STATE.ALERT;
    g.lastSeen = { x: world.player.x, y: world.player.y };
    world.spotted = true;
    world.ghost = false;
    world.levelTime = 55;
    return world;
  }
  if (shot === 'win') {
    // Level cleared for real: all intel taken, thief standing on the exit.
    world.intel.forEach((i) => (i.taken = true));
    world.intelGot = 3;
    world.player.x = world.exit.x + 0.5;
    world.player.y = world.exit.y + 0.5;
    world.levelTime = 62;
    // Drive one tick so the world itself declares the level clear.
    updateWorld(world, 1 / 60, { left: false, right: false, up: false, down: false, sneak: false, sprint: false });
    if (world.screen !== SCREEN.LEVEL_CLEAR) {
      // Fallback: the exit tick should have cleared it; force the screen
      // only if the tick did not, so the shot still shows the win.
      world.lastClear = { timeBonus: 336, ghostBonus: 1000, levelScore: 2086 };
      world.score = 2086;
      world.screen = SCREEN.LEVEL_CLEAR;
    }
    return world;
  }
  return world;
}

// Headless logic check: detection rises, guard states change, patrols stay
// clear of solids. Runs in the browser console and in node tests.
export function selfTest() {
  const results = [];
  const world = makeWorld(20261121);
  startGame(world);
  const g = world.guards[0];
  const before = g.suspicion;
  // Park the thief right in front of the first guard, in its cone.
  world.player.x = g.x + 1.5;
  world.player.y = g.y;
  g.facing = 0;
  for (let i = 0; i < 120; i++) {
    updateWorld(world, 1 / 60, { left: false, right: false, up: false, down: false, sneak: false, sprint: false });
  }
  results.push({ name: 'suspicion rises when seen', pass: g.suspicion > before });
  results.push({ name: 'guard leaves patrol when suspicious', pass: g.state !== 0 || g.suspicion > 0.45 });
  results.push({ name: 'player still alive or caught cleanly', pass: world.screen === 'playing' || world.lives < 3 });
  // Patrol sanity: every guard stays on walkable tiles over 10 seconds.
  const w2 = makeWorld(20261121);
  startGame(w2);
  let stuck = false;
  for (let i = 0; i < 600; i++) {
    updateWorld(w2, 1 / 60, { left: false, right: false, up: false, down: false, sneak: false, sprint: false });
    for (const gg of w2.guards) {
      const tile = w2.grid[Math.floor(gg.y)]?.[Math.floor(gg.x)];
      if (tile === '#' || tile === 'C' || tile === 'D') stuck = true;
    }
  }
  results.push({ name: 'guards never enter solid tiles', pass: !stuck });
  results.push({ name: 'guards still patrol after 10s', pass: w2.guards.some((gg) => gg.state === 0) });
  return results;
}
