// Guards: patrol waypoints, vision cones, and the suspicion state machine.
// States: 0 patrol, 1 suspicious (walk to the last seen spot), 2 alert (chase),
// 3 search (sweep the area, then give up and return to patrol).
import {
  ALERT_AT,
  BUSH_SPOT_MULT,
  CATCH_RANGE,
  GUARD_CHASE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_SEARCH_SPEED,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_VIEW_RANGE,
  SEARCH_SECONDS,
  SHADOW_SPOT_MULT,
  SPOT_DECAY,
  SPOT_RATE_CLOSE,
  SPOT_RATE_FAR,
  SPOT_RATE_MID,
  SNEAK_SPOT_MULT,
  SPRINT_SPOT_MULT,
  SUSPICIOUS_AT,
  WAYPOINT_PAUSE,
} from './config.js';
import { blocksSight, findPath, isWalkable } from './levels.js';

export const GUARD_STATE = { PATROL: 0, SUSPICIOUS: 1, ALERT: 2, SEARCH: 3 };

// Walk the tiles a straight line passes through (Bresenham) and report
// whether any solid tile blocks the line between two points.
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  let cx = Math.floor(x0);
  let cy = Math.floor(y0);
  const tx = Math.floor(x1);
  const ty = Math.floor(y1);
  const dx = Math.abs(tx - cx);
  const dy = Math.abs(ty - cy);
  const sx = cx < tx ? 1 : -1;
  const sy = cy < ty ? 1 : -1;
  let err = dx - dy;
  for (let guard = 0; guard < 200; guard++) {
    if (cx === tx && cy === ty) return true;
    if (blocksSight(grid, cx, cy) && !(cx === Math.floor(x0) && cy === Math.floor(y0))) return false;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
  return true;
}

// Can this guard see the player right now? The player must be inside the
// vision cone, within range, in line of sight, and not fully hidden in a bush.
export function guardCanSee(guard, player, grid) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VIEW_RANGE) return { seen: false, dist };
  if (dist > 0.01) {
    const angle = Math.atan2(dy, dx);
    let diff = angle - guard.facing;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > GUARD_VIEW_HALF_ANGLE) return { seen: false, dist };
  }
  if (!hasLineOfSight(grid, guard.x, guard.y, player.x, player.y)) return { seen: false, dist };
  const tile = grid[Math.floor(player.y)]?.[Math.floor(player.x)];
  if (tile === 'B' && dist > 1.2) return { seen: false, dist };
  return { seen: true, dist };
}

// How fast suspicion rises for a seen player, given distance and stance.
export function spotRateFor(dist, player, grid) {
  let rate = dist < 2 ? SPOT_RATE_CLOSE : dist < 3.6 ? SPOT_RATE_MID : SPOT_RATE_FAR;
  if (player.sneaking) rate *= SNEAK_SPOT_MULT;
  if (player.sprinting) rate *= SPRINT_SPOT_MULT;
  const tile = grid[Math.floor(player.y)]?.[Math.floor(player.x)];
  if (tile === 'S') rate *= SHADOW_SPOT_MULT;
  if (tile === 'B') rate *= BUSH_SPOT_MULT;
  return rate;
}

export function makeGuard(def, index) {
  const [wx, wy] = def.waypoints[0];
  return {
    id: index,
    x: wx + 0.5,
    y: wy + 0.5,
    facing: 0,
    state: GUARD_STATE.PATROL,
    suspicion: 0,
    waypointIndex: 0,
    waypoints: def.waypoints,
    speed: def.speed ?? GUARD_PATROL_SPEED,
    pauseLeft: 0,
    lastSeen: null,
    searchLeft: 0,
    path: null,
    pathIndex: 0,
    heardAt: null,
  };
}

// Move toward a point at a given speed, sliding along walls instead of
// walking through them. Returns true when arrived.
function moveToward(guard, tx, ty, speed, dt, grid) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.05) return true;
  const step = Math.min(dist, speed * dt);
  const mx = (dx / dist) * step;
  const my = (dy / dist) * step;
  const nx = guard.x + mx;
  if (isWalkable(grid, Math.floor(nx), Math.floor(guard.y))) guard.x = nx;
  const ny = guard.y + my;
  if (isWalkable(grid, Math.floor(guard.x), Math.floor(ny))) guard.y = ny;
  guard.facing = Math.atan2(dy, dx);
  return Math.hypot(tx - guard.x, ty - guard.y) < 0.05;
}

// Follow a BFS path of tiles, one waypoint at a time.
function followPath(guard, dt, speed, grid) {
  if (!guard.path || guard.pathIndex >= guard.path.length) return true;
  const next = guard.path[guard.pathIndex];
  if (moveToward(guard, next.x + 0.5, next.y + 0.5, speed, dt, grid)) guard.pathIndex++;
  return guard.pathIndex >= guard.path.length;
}

// Plan a walkable path to a tile, or fall back to walking straight at it.
function planPath(guard, grid, tx, ty) {
  const start = { x: Math.floor(guard.x), y: Math.floor(guard.y) };
  const goal = { x: Math.floor(tx), y: Math.floor(ty) };
  const path = findPath(grid, start, goal);
  guard.path = path;
  guard.pathIndex = 0;
  return path !== null;
}

// One guard, one tick. Returns 'caught' when the guard touches the player.
export function updateGuard(guard, dt, player, grid) {
  const { seen, dist } = guardCanSee(guard, player, grid);
  if (seen) {
    guard.suspicion += spotRateFor(dist, player, grid) * dt;
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.suspicion >= ALERT_AT) {
      guard.suspicion = ALERT_AT;
      guard.state = GUARD_STATE.ALERT;
    } else if (guard.suspicion >= SUSPICIOUS_AT && guard.state === GUARD_STATE.PATROL) {
      guard.state = GUARD_STATE.SUSPICIOUS;
      planPath(guard, grid, player.x, player.y);
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - SPOT_DECAY * dt);
    if (guard.state === GUARD_STATE.SUSPICIOUS && guard.suspicion < SUSPICIOUS_AT * 0.5) {
      guard.state = GUARD_STATE.SEARCH;
      guard.searchLeft = SEARCH_SECONDS;
    }
  }

  if (guard.heardAt) {
    if (guard.state === GUARD_STATE.PATROL) {
      guard.state = GUARD_STATE.SUSPICIOUS;
      planPath(guard, grid, guard.heardAt.x, guard.heardAt.y);
    }
    guard.heardAt = null;
  }

  if (guard.state === GUARD_STATE.PATROL) {
    // A guard walking back to its route follows the planned path first,
    // so it never cuts a corner through a wall.
    if (guard.path && guard.pathIndex < guard.path.length) {
      if (followPath(guard, dt, guard.speed, grid)) guard.path = null;
    } else if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
    } else {
      const wp = guard.waypoints[guard.waypointIndex];
      if (moveToward(guard, wp[0] + 0.5, wp[1] + 0.5, guard.speed, dt, grid)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseLeft = WAYPOINT_PAUSE;
      }
    }
  } else if (guard.state === GUARD_STATE.SUSPICIOUS) {
    if (followPath(guard, dt, GUARD_PATROL_SPEED + 0.4, grid)) {
      guard.state = GUARD_STATE.SEARCH;
      guard.searchLeft = SEARCH_SECONDS;
    }
  } else if (guard.state === GUARD_STATE.ALERT) {
    if (seen) {
      guard.lastSeen = { x: player.x, y: player.y };
      moveToward(guard, player.x, player.y, GUARD_CHASE_SPEED, dt, grid);
    } else if (guard.lastSeen) {
      if (moveToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD_CHASE_SPEED, dt, grid)) {
        guard.state = GUARD_STATE.SEARCH;
        guard.searchLeft = SEARCH_SECONDS;
      }
    } else {
      guard.state = GUARD_STATE.SEARCH;
      guard.searchLeft = SEARCH_SECONDS;
    }
    if (guard.suspicion < SUSPICIOUS_AT && !seen) {
      guard.state = GUARD_STATE.SEARCH;
      guard.searchLeft = SEARCH_SECONDS;
    }
  } else if (guard.state === GUARD_STATE.SEARCH) {
    guard.searchLeft -= dt;
    guard.facing += dt * 1.5;
    if (guard.searchLeft <= 0) {
      guard.state = GUARD_STATE.PATROL;
      guard.suspicion = 0;
      guard.path = null;
      // Walk back to the nearest patrol waypoint instead of cutting corners.
      let best = 0;
      let bestDist = Infinity;
      guard.waypoints.forEach((wp, i) => {
        const d = Math.hypot(wp[0] + 0.5 - guard.x, wp[1] + 0.5 - guard.y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      guard.waypointIndex = best;
      planPath(guard, grid, guard.waypoints[best][0] + 0.5, guard.waypoints[best][1] + 0.5);
    }
  }

  const touch = Math.hypot(player.x - guard.x, player.y - guard.y);
  if (touch < CATCH_RANGE) return 'caught';
  return null;
}

// A pebble lands: every guard in earshot turns to investigate the noise.
export function guardsHearPebble(guards, x, y, radius) {
  for (const g of guards) {
    if (Math.hypot(g.x - x, g.y - y) <= radius) {
      g.heardAt = { x, y };
    }
  }
}
