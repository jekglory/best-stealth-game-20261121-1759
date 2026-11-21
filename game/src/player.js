// The thief: movement, stance, pebbles and pickups. Position is in tiles,
// centred on the player (x, y are the middle of the tile the player is on).
import { PEBBLES_PER_LEVEL, SNEAK_SPEED, SPRINT_SPEED, WALK_SPEED } from './config.js';
import { isWalkable } from './levels.js';

// The thief's current speed in tiles per second, by stance.
export function playerSpeed(player) {
  if (player.sneaking) return SNEAK_SPEED;
  if (player.sprinting) return SPRINT_SPEED;
  return WALK_SPEED;
}

export function makePlayer(start) {
  return {
    x: start.x + 0.5,
    y: start.y + 0.5,
    facing: 0,
    sneaking: false,
    sprinting: false,
    moving: false,
    pebbles: PEBBLES_PER_LEVEL,
    stepPhase: 0,
  };
}

// Move the player one tick from held keys. Walls stop movement axis by axis,
// so the player slides along a wall instead of sticking to it.
export function updatePlayer(player, dt, keys, grid) {
  let mx = 0;
  let my = 0;
  if (keys.left) mx -= 1;
  if (keys.right) mx += 1;
  if (keys.up) my -= 1;
  if (keys.down) my += 1;
  player.sneaking = !!keys.sneak;
  player.sprinting = !!keys.sprint && !player.sneaking;
  player.moving = mx !== 0 || my !== 0;
  if (!player.moving) return;
  const len = Math.hypot(mx, my);
  mx /= len;
  my /= len;
  const speed = playerSpeed(player);
  const nx = player.x + mx * speed * dt;
  if (isWalkable(grid, Math.floor(nx), Math.floor(player.y))) player.x = nx;
  const ny = player.y + my * speed * dt;
  if (isWalkable(grid, Math.floor(player.x), Math.floor(ny))) player.y = ny;
  player.facing = Math.atan2(my, mx);
  player.stepPhase += speed * dt;
}

// The tile the player is standing on, for shadow and bush checks.
export function playerTile(player, grid) {
  const x = Math.floor(player.x);
  const y = Math.floor(player.y);
  return grid[y]?.[x] ?? '#';
}

// Pick up intel on the player's tile. Returns the intel item, or null.
export function tryPickup(player, intel) {
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  for (const item of intel) {
    if (!item.taken && item.x === px && item.y === py) {
      item.taken = true;
      return item;
    }
  }
  return null;
}

// Is the player standing on the exit tile?
export function onExit(player, exit) {
  return Math.floor(player.x) === exit.x && Math.floor(player.y) === exit.y;
}
