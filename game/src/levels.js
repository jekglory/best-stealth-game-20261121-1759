// Level maps for LAMPLIGHT — A Quiet Heist. Each level is a grid of tiles:
//   # wall (solid, blocks sight)   . floor
//   C crate (solid, blocks sight)  D display case (solid, blocks sight)
//   S shadow floor (dark, harder to spot)   B bush (hides the player)
//   I intel pickup   X exit   P player start
// Guards patrol waypoint lists in tile coordinates. Every patrol segment is
// drawn along a single open row or column, so no guard ever walks into a wall.
export const LEVELS = [
  {
    name: 'The Marble Hall',
    sub: 'Level 1 — learn the ropes',
    map: [
      '##############################',
      '#............##..............#',
      '#..C....I....##.....D........#',
      '#............##..............#',
      '#..######....##....######....#',
      '#............##..............#',
      '#..I....C....##.....C....I...#',
      '#............##..............#',
      '###.############.#########.###',
      '#............................#',
      '#..B......S......C......D....#',
      '#............................#',
      '#..######....##....######....#',
      '#............................#',
      '#..P......................X..#',
      '#............................#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 1], [12, 1]], speed: 1.5 },
      { waypoints: [[26, 2], [26, 7]], speed: 1.6 },
      { waypoints: [[6, 14], [22, 14]], speed: 1.7 },
    ],
  },
  {
    name: 'The East Wing',
    sub: 'Level 2 — more eyes, tighter halls',
    map: [
      '##############################',
      '#..I........##........C......#',
      '#...........##...............#',
      '#..D....C...##...######......#',
      '#...........##...............#',
      '#.....S...........C.....I....#',
      '#...........##...............#',
      '####.########.########.#######',
      '#............................#',
      '#..C.....B......##.....D.....#',
      '#............................#',
      '#..######....####....####....#',
      '#............................#',
      '#..I.....C.......S.......C...#',
      '#............................#',
      '#..P......................X..#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 1], [11, 1]], speed: 1.6 },
      { waypoints: [[24, 2], [24, 6]], speed: 1.7 },
      { waypoints: [[3, 10], [26, 10]], speed: 1.8 },
      { waypoints: [[20, 13], [20, 15]], speed: 1.7 },
    ],
  },
  {
    name: 'The Vault Floor',
    sub: 'Level 3 — five guards, no mercy',
    map: [
      '##############################',
      '#..C....I.....##......D......#',
      '#............##..............#',
      '#..######....##....######....#',
      '#............##..............#',
      '#..I....C.........C.....I....#',
      '#............##..............#',
      '###.##########.###########.###',
      '#............................#',
      '#..D.....S......C.....B......#',
      '#............................#',
      '#..####.....#####....####....#',
      '#............................#',
      '#..C...........S.........D...#',
      '#............................#',
      '#..P......................X..#',
      '##############################',
    ],
    guards: [
      { waypoints: [[5, 1], [12, 1]], speed: 1.7 },
      { waypoints: [[26, 2], [26, 6]], speed: 1.8 },
      { waypoints: [[3, 10], [26, 10]], speed: 1.9 },
      { waypoints: [[12, 13], [12, 15]], speed: 1.8 },
      { waypoints: [[5, 8], [5, 10]], speed: 1.9 },
    ],
  },
];

// Tiles that block movement and line of sight.
export const SOLID = new Set(['#', 'C', 'D']);
// Tiles that hide the player from guards.
export const HIDING = new Set(['B']);
// Tiles that darken the player and slow detection.
export const SHADOW = new Set(['S']);

// Parse a level map into a grid plus the positions of its special tiles.
export function parseLevel(level) {
  const grid = level.map.map((row) => row.split(''));
  const intel = [];
  let playerStart = null;
  let exit = null;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const t = grid[y][x];
      if (t === 'I') intel.push({ x, y, taken: false });
      if (t === 'P') playerStart = { x, y };
      if (t === 'X') exit = { x, y };
    }
  }
  return { grid, intel, playerStart, exit };
}

// The tile at (x, y); anything outside the map counts as a wall.
export function tileAt(grid, x, y) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return '#';
  return grid[y][x];
}

// Whether a tile can be walked on.
export function isWalkable(grid, x, y) {
  return !SOLID.has(tileAt(grid, x, y));
}

// Whether a tile blocks a guard's line of sight.
export function blocksSight(grid, x, y) {
  return SOLID.has(tileAt(grid, x, y));
}

// Breadth-first search over walkable tiles. Returns a list of tile steps
// from start to goal (excluding start), or null when no path exists.
export function findPath(grid, start, goal) {
  const key = (x, y) => `${x},${y}`;
  const prev = new Map();
  const queue = [start];
  prev.set(key(start.x, start.y), null);
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === goal.x && cur.y === goal.y) {
      const path = [];
      let node = cur;
      while (node && !(node.x === start.x && node.y === start.y)) {
        path.unshift(node);
        node = prev.get(key(node.x, node.y));
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!isWalkable(grid, nx, ny)) continue;
      if (prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), cur);
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

// Check a level is sound: rows equal length, known tiles only, one player
// start, one exit, three intel, every patrol segment clear of solids, and a
// walkable path from the player to every intel and to the exit.
export function validateLevel(level) {
  const problems = [];
  const width = level.map[0].length;
  const known = new Set(['#', '.', 'C', 'D', 'S', 'B', 'I', 'X', 'P']);
  level.map.forEach((row, y) => {
    if (row.length !== width) problems.push(`row ${y} is ${row.length} wide, expected ${width}`);
    for (let x = 0; x < row.length; x++) {
      if (!known.has(row[x])) problems.push(`row ${y} col ${x}: unknown tile '${row[x]}'`);
    }
  });
  const { grid, intel, playerStart, exit } = parseLevel(level);
  if (!playerStart) problems.push('no player start P');
  if (!exit) problems.push('no exit X');
  if (intel.length !== 3) problems.push(`expected 3 intel, found ${intel.length}`);
  level.guards.forEach((g, gi) => {
    g.waypoints.forEach((wp, wi) => {
      if (!isWalkable(grid, wp[0], wp[1])) problems.push(`guard ${gi} waypoint ${wi} (${wp}) is solid`);
    });
    for (let i = 0; i < g.waypoints.length - 1; i++) {
      const [x0, y0] = g.waypoints[i];
      const [x1, y1] = g.waypoints[i + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(x0 + ((x1 - x0) * s) / steps);
        const y = Math.round(y0 + ((y1 - y0) * s) / steps);
        if (!isWalkable(grid, x, y)) problems.push(`guard ${gi} patrol segment ${i} crosses solid at (${x},${y})`);
      }
    }
  });
  if (playerStart) {
    for (const target of [...intel, exit]) {
      if (target && !findPath(grid, playerStart, target)) {
        problems.push(`no walkable path from player to (${target.x},${target.y})`);
      }
    }
  }
  return problems;
}
