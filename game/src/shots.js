// The screenshot scenes behind ?shot=title|play|alert|win. Each one plays the real rules
// forward from a fresh world for a fixed time, steered by a pathfinder that reads the room
// and the cones before it moves, so every frame is what a real game looks like and the
// same seed always gives the same frame.
import { GUARD, CAMERA, STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_WIN, segmentHitsRect } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const TITLE_SECONDS = 5;
const PLAY_SECONDS = 24;
const ALERT_SECONDS = 20;
const WIN_LIMIT_SECONDS = 150;
const CELL = 32;
const COLS = 1280 / CELL;
const ROWS = 800 / CELL;

/** True when the thief at (x,y) stands in a lit cone with a clear line of sight. */
function inAnyCone(state, x, y) {
  const solids = state.solids;
  for (const guard of state.guards) {
    const dx = x - guard.x;
    const dy = y - guard.y;
    if (Math.hypot(dx, dy) > GUARD.coneRange) continue;
    let diff = Math.atan2(dy, dx) - guard.angle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > GUARD.coneHalfAngle) continue;
    let blocked = false;
    for (const rect of solids) if (segmentHitsRect(guard.x, guard.y, x, y, rect)) { blocked = true; break; }
    if (!blocked) return true;
  }
  for (const camera of state.cameras) {
    const dx = x - camera.x;
    const dy = y - camera.y;
    if (Math.hypot(dx, dy) > CAMERA.coneRange) continue;
    let diff = Math.atan2(dy, dx) - camera.angle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > CAMERA.coneHalfAngle) continue;
    let blocked = false;
    for (const rect of solids) if (segmentHitsRect(camera.x, camera.y, x, y, rect)) { blocked = true; break; }
    if (!blocked) return true;
  }
  return false;
}

function cellBlocked(state, cx, cy) {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  for (const rect of state.solids) {
    if (x > rect.x - 16 && x < rect.x + rect.w + 16 && y > rect.y - 16 && y < rect.y + rect.h + 16) return true;
  }
  return false;
}

function cellCost(state, cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  let cost = 1;
  if (inAnyCone(state, x, y)) cost += 25;
  for (const guard of state.guards) {
    if (Math.hypot(guard.x - x, guard.y - y) < 60) cost += 8;
  }
  return cost;
}

/**
 * A shortest path over the room's grid from (fromX,fromY) to (toX,toY), priced to avoid
 * lit cones and crowding guards. Replanned often, so a sweeping cone reroutes the thief.
 */
function findPath(state, fromX, fromY, toX, toY) {
  const startX = Math.floor(fromX / CELL);
  const startY = Math.floor(fromY / CELL);
  const goalX = Math.floor(toX / CELL);
  const goalY = Math.floor(toY / CELL);
  const key = (x, y) => y * COLS + x;
  const dist = new Map([[key(startX, startY), 0]]);
  const prev = new Map();
  const open = [[0, startX, startY]];
  const closed = new Set();
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i][0] < open[best][0]) best = i;
    const [cost, cx, cy] = open.splice(best, 1)[0];
    const k = key(cx, cy);
    if (closed.has(k)) continue;
    closed.add(k);
    if (cx === goalX && cy === goalY) {
      const path = [];
      let cur = k;
      while (cur !== key(startX, startY)) {
        const px = cur % COLS;
        const py = Math.floor(cur / COLS);
        path.unshift({ x: px * CELL + CELL / 2, y: py * CELL + CELL / 2 });
        cur = prev.get(cur);
      }
      path.push({ x: toX, y: toY });
      return path;
    }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (cellBlocked(state, nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (cellBlocked(state, cx + dx, cy) || cellBlocked(state, cx, cy + dy))) continue;
      const nk = key(nx, ny);
      const next = cost + cellCost(state, nx, ny) * (dx !== 0 && dy !== 0 ? 1.4 : 1);
      if (next < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, next);
        prev.set(nk, k);
        open.push([next, nx, ny]);
      }
    }
  }
  return null;
}

function idleInput() {
  return { dx: 0, dy: 0, sneak: false, smoke: false, dart: null };
}

/** Drive the thief toward `target` for up to `seconds`, replanning around the cones. */
function drive(world, target, seconds) {
  const state = world.state;
  let path = null;
  let pathIndex = 0;
  let replanIn = 0;
  for (let i = 0; i < seconds / STEP; i += 1) {
    if (state.outcome) return 0;
    replanIn -= 1;
    if (!path || pathIndex >= path.length || replanIn <= 0) {
      path = findPath(state, state.thief.x, state.thief.y, target.x, target.y);
      pathIndex = 0;
      replanIn = 30;
    }
    if (!path) return 0;
    const point = path[pathIndex];
    const dx = point.x - state.thief.x;
    const dy = point.y - state.thief.y;
    const d = Math.hypot(dx, dy);
    if (d < 10) {
      pathIndex += 1;
      continue;
    }
    const input = {
      dx: dx / d,
      dy: dy / d,
      sneak: inAnyCone(state, state.thief.x, state.thief.y),
      smoke: false,
      dart: null,
    };
    const events = world.step(STEP, input);
    if (events & EVENT_CAUGHT) return events;
    if (events & EVENT_WIN) return events;
    if (pathIndex >= path.length) return 0;
  }
  return 0;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best loot
 * to show. Scenes: title (the gallery at rest), play (mid-heist, cones sweeping),
 * alert (caught in a camera cone, alarm climbing), win (stone stolen, clean getaway).
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'alert' && name !== 'win') {
    for (let i = 0; i < TITLE_SECONDS / STEP; i += 1) world.step(STEP, idleInput());
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'alert') {
    // Walk into the second camera's cone, high in the vault alcove where no guard
    // patrols, and stand in the light until the alarm climbs, backing off when a guard
    // closes in, so the frame shows a live SPOTTED moment.
    const spot = { x: 1000, y: 100 };
    drive(world, spot, 30);
    for (let i = 0; i < ALERT_SECONDS / STEP; i += 1) {
      if (state.outcome) break;
      let nearGuard = null;
      for (const guard of state.guards) {
        if (Math.hypot(guard.x - state.thief.x, guard.y - state.thief.y) < 85) nearGuard = guard;
      }
      let input;
      if (nearGuard) {
        const d = Math.hypot(state.thief.x - nearGuard.x, state.thief.y - nearGuard.y) || 1;
        input = {
          dx: (state.thief.x - nearGuard.x) / d,
          dy: (state.thief.y - nearGuard.y) / d,
          sneak: false, smoke: false, dart: null,
        };
      } else if (Math.hypot(spot.x - state.thief.x, spot.y - state.thief.y) > 12) {
        drive(world, spot, 1);
        continue;
      } else {
        input = idleInput();
      }
      const events = world.step(STEP, input);
      if (events & EVENT_CAUGHT) return { screen: SCREEN_OVER, best: 0 };
      if (state.alarm >= 55 && state.spottedNow) break;
    }
    for (let i = 0; i < 3 / STEP && !state.spottedNow && !state.outcome; i += 1) {
      world.step(STEP, idleInput());
    }
    return { screen: state.outcome === 'caught' ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    drive(world, state.level.loot, WIN_LIMIT_SECONDS);
    if (state.outcome === 'caught') return { screen: SCREEN_OVER, best: 0 };
    if (state.lootTaken) {
      drive(world, { x: state.level.exit.x + 45, y: state.level.exit.y + 10 }, WIN_LIMIT_SECONDS);
    }
    return { screen: state.outcome === 'escaped' ? SCREEN_WIN : SCREEN_PLAY, best: state.lootTaken ? 50000 : 0 };
  }
  // Mid-heist: cross to the middle of the gallery, so the frame shows the thief en route
  // with the Sunstone still glowing on its pedestal, cones sweeping all around.
  drive(world, { x: 700, y: 380 }, PLAY_SECONDS);
  return { screen: state.outcome === 'caught' ? SCREEN_OVER : SCREEN_PLAY, best: state.lootTaken ? 50000 : 0 };
}
