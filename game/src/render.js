// Render: everything drawn on the canvas — the museum floor, cover, guards
// with their vision cones, the thief, and the HUD with its screens.
import { COLS, GUARD_VIEW_HALF_ANGLE, GUARD_VIEW_RANGE, ROWS, TILE, VIEW_H, VIEW_W } from './config.js';
import { SCREEN } from './world.js';

const FLOOR_A = '#2b2620';
const FLOOR_B = '#332d25';
const WALL = '#17130f';
const WALL_TOP = '#4a4034';
const CRATE = '#7a5a33';
const CASE = '#3d5a6b';
const SHADOW = '#1d1a2e';
const BUSH = '#2e4a26';
const GOLD = '#e8b64c';
const GREEN = '#57d977';
const RED = '#e5484d';
const INK = '#f2ead8';

function drawTile(ctx, x, y, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
}

// Draw one guard's vision cone as a translucent wedge on the floor.
function drawCone(ctx, guard, range, halfAngle) {
  const gx = guard.x * TILE;
  const gy = guard.y * TILE;
  const r = range * TILE;
  const alert = guard.state === 2;
  const suspicious = guard.state === 1;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.arc(gx, gy, r, guard.facing - halfAngle, guard.facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = alert
    ? 'rgba(229,72,77,0.34)'
    : suspicious
      ? 'rgba(232,182,76,0.30)'
      : 'rgba(232,182,76,0.20)';
  ctx.fill();
  ctx.strokeStyle = alert ? 'rgba(229,72,77,0.55)' : 'rgba(232,182,76,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// The level: floor, shadows, bushes, walls, crates, cases, intel and exit.
function drawLevel(ctx, world) {
  const grid = world.grid;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = grid[y][x];
      drawTile(ctx, x, y, (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B);
      if (t === 'S') {
        drawTile(ctx, x, y, SHADOW);
      } else if (t === 'B') {
        drawTile(ctx, x, y, BUSH);
        ctx.fillStyle = '#3f6b31';
        ctx.beginPath();
        ctx.arc(x * TILE + 10, y * TILE + 12, 7, 0, Math.PI * 2);
        ctx.arc(x * TILE + 22, y * TILE + 20, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (t === '#') {
        drawTile(ctx, x, y, WALL);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(x * TILE, y * TILE, TILE, 5);
      } else if (t === 'C') {
        drawTile(ctx, x, y, CRATE);
        ctx.strokeStyle = '#5d4423';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x * TILE + 3, y * TILE + 3);
        ctx.lineTo(x * TILE + TILE - 3, y * TILE + TILE - 3);
        ctx.moveTo(x * TILE + TILE - 3, y * TILE + 3);
        ctx.lineTo(x * TILE + 3, y * TILE + TILE - 3);
        ctx.stroke();
      } else if (t === 'D') {
        drawTile(ctx, x, y, CASE);
        ctx.fillStyle = '#6b93a8';
        ctx.fillRect(x * TILE + 5, y * TILE + 5, TILE - 10, TILE - 10);
        ctx.fillStyle = '#d8e8f2';
        ctx.fillRect(x * TILE + 11, y * TILE + 11, 4, 4);
        ctx.fillRect(x * TILE + 18, y * TILE + 18, 4, 4);
      }
    }
  }
  // Intel files glow gold until collected.
  for (const item of world.intel) {
    if (item.taken) continue;
    const cx = item.x * TILE + TILE / 2;
    const cy = item.y * TILE + TILE / 2;
    const pulse = 0.6 + 0.3 * Math.sin(world.time * 4 + item.x);
    ctx.fillStyle = `rgba(232,182,76,${pulse})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1408';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('i', cx, cy + 0.5);
  }
  // The exit: a green doorway on the floor.
  const ex = world.exit;
  ctx.fillStyle = 'rgba(87,217,119,0.25)';
  ctx.fillRect(ex.x * TILE, ex.y * TILE, TILE, TILE);
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 3;
  ctx.strokeRect(ex.x * TILE + 2, ex.y * TILE + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = GREEN;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', ex.x * TILE + TILE / 2, ex.y * TILE + TILE / 2);
  // Landed pebbles ring quietly on the floor.
  for (const pb of world.pebbles) {
    ctx.fillStyle = '#c8c0b0';
    ctx.beginPath();
    ctx.arc(pb.x * TILE, pb.y * TILE, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,192,176,0.5)';
    ctx.beginPath();
    ctx.arc(pb.x * TILE, pb.y * TILE, 12, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Guards: cones first (under the figures), then the figures themselves.
function drawGuards(ctx, world) {
  for (const g of world.guards) {
    drawCone(ctx, g, GUARD_VIEW_RANGE, GUARD_VIEW_HALF_ANGLE);
  }
  for (const g of world.guards) {
    const gx = g.x * TILE;
    const gy = g.y * TILE;
    const alert = g.state === 2;
    const suspicious = g.state === 1;
    ctx.fillStyle = alert ? RED : suspicious ? GOLD : '#8a94a6';
    ctx.beginPath();
    ctx.arc(gx, gy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0e0c0a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // The guard's facing torch: a short bright line.
    ctx.strokeStyle = alert ? '#ff8a8e' : '#ffe9a8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + Math.cos(g.facing) * 16, gy + Math.sin(g.facing) * 16);
    ctx.stroke();
    // Suspicion meter above the guard's head.
    if (g.suspicion > 0.03) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(gx - 13, gy - 24, 26, 5);
      ctx.fillStyle = alert ? RED : GOLD;
      ctx.fillRect(gx - 12, gy - 23, 24 * Math.min(1, g.suspicion), 3);
    }
    if (alert) {
      ctx.fillStyle = RED;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', gx, gy - 28);
    }
  }
}

// The thief: a small hooded figure with a lamp glow.
function drawPlayer(ctx, world) {
  const p = world.player;
  const px = p.x * TILE;
  const py = p.y * TILE;
  const glow = ctx.createRadialGradient(px, py, 4, px, py, 46);
  glow.addColorStop(0, 'rgba(232,182,76,0.28)');
  glow.addColorStop(1, 'rgba(232,182,76,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(px, py, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.sneaking ? '#6b7fa6' : '#3f6fb5';
  ctx.beginPath();
  ctx.arc(px, py, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0e0c0a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(px + Math.cos(p.facing) * 5, py + Math.sin(p.facing) * 5, 4, 0, Math.PI * 2);
  ctx.fill();
  // A flying pebble arcs through the air.
  if (world.flying) {
    const f = world.flying;
    const x = (f.x0 + (f.x1 - f.x0) * f.t) * TILE;
    const y = (f.y0 + (f.y1 - f.y0) * f.t) * TILE - Math.sin(f.t * Math.PI) * 26;
    ctx.fillStyle = '#e8e2d4';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The HUD bar: level, intel, lives, pebbles, score and the detection banner.
function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(10,8,6,0.92)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = INK;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LAMPLIGHT — ${world.levelName}`, 12, 18);
  ctx.fillText(`Intel ${world.intelGot}/3`, 330, 18);
  ctx.fillText(`Lives ${'♥'.repeat(Math.max(0, world.lives))}`, 450, 18);
  ctx.fillText(`Pebbles ${world.player.pebbles}`, 560, 18);
  ctx.textAlign = 'right';
  // After a level clear the level score is already folded into the total,
  // so showing both would double-count it on the win screen.
  const shownScore =
    world.screen === SCREEN.LEVEL_CLEAR || world.screen === SCREEN.WIN ? world.score : world.score + world.levelScore;
  ctx.fillText(`Score ${shownScore}`, VIEW_W - 12, 18);
  // Alarm banner when any guard is chasing.
  if (world.guards.some((g) => g.state === 2)) {
    ctx.fillStyle = RED;
    ctx.fillRect(VIEW_W / 2 - 90, 44, 180, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED — RUN!', VIEW_W / 2, 60);
  } else if (world.message && world.time < world.messageUntil) {
    ctx.fillStyle = 'rgba(10,8,6,0.8)';
    const w = ctx.measureText(world.message).width + 24;
    ctx.fillRect(VIEW_W / 2 - w / 2, 44, w, 26);
    ctx.fillStyle = GOLD;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, VIEW_W / 2, 58);
  }
}

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(8,6,4,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function panelText(ctx, lines, title) {
  ctx.fillStyle = 'rgba(8,6,4,0.85)';
  ctx.fillRect(VIEW_W / 2 - 320, VIEW_H / 2 - 150, 640, 300);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(VIEW_W / 2 - 320, VIEW_H / 2 - 150, 640, 300);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 104);
  ctx.fillStyle = INK;
  ctx.font = '16px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 58 + i * 26);
  });
}

// Full frame: the level, the actors, the HUD, then any screen overlay.
export function render(ctx, world) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#0e0c0a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (world.screen === SCREEN.TITLE) {
    drawLevel(ctx, world);
    drawGuards(ctx, world);
    drawPlayer(ctx, world);
    dimScreen(ctx);
    panelText(
      ctx,
      [
        'A quiet heist in the museum at night.',
        'Collect 3 intel files, then reach the green EXIT unseen.',
        'WASD / arrows move · Shift sneak · Space sprint',
        'Click to toss a pebble and distract a guard · E picks up intel',
        'Stay out of the yellow cones — red means you were spotted.',
        '',
        'Press Space or click to begin.',
      ],
      'LAMPLIGHT',
    );
    return;
  }
  drawLevel(ctx, world);
  drawGuards(ctx, world);
  drawPlayer(ctx, world);
  drawHud(ctx, world);
  if (world.screen === SCREEN.PAUSED) {
    dimScreen(ctx);
    panelText(ctx, ['The gallery waits. Breathe.', '', 'Press P to keep sneaking.'], 'PAUSED');
  } else if (world.screen === SCREEN.LEVEL_CLEAR) {
    dimScreen(ctx);
    const c = world.lastClear || { timeBonus: 0, ghostBonus: 0, levelScore: 0 };
    panelText(
      ctx,
      [
        `${world.levelName} cleared — unseen enough.`,
        `Time bonus +${c.timeBonus} · Ghost bonus +${c.ghostBonus}`,
        `Level score ${c.levelScore} · Total score ${world.score}`,
        '',
        'Press Space for the next gallery.',
      ],
      'CLEAN GETAWAY',
    );
  } else if (world.screen === SCREEN.WIN) {
    dimScreen(ctx);
    panelText(
      ctx,
      [
        'Every gallery emptied. Every guard outwitted.',
        `Final score ${world.score}`,
        world.ghost ? 'Ghost bonus earned on the final gallery.' : 'Spotted once or twice — but the loot is yours.',
        '',
        'Press Space to play again.',
      ],
      'THE QUIET HEIST',
    );
  } else if (world.screen === SCREEN.LOSE) {
    dimScreen(ctx);
    panelText(
      ctx,
      ['The museum keeps its secrets tonight.', `Score ${world.score}`, '', 'Press Space to try again.'],
      'CAUGHT OUT',
    );
  }
}
