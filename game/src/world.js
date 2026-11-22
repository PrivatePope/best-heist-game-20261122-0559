// The simulation: a thief, three patrolling guards, two sweeping cameras, one Sunstone and
// an alarm meter. Guards and cameras see through a cone only when nothing solid stands
// between them and the thief; being seen fills the alarm, hiding lets it drain. A guard that
// touches the thief, or a full alarm meter, ends the night.
import { ALARM, CAMERA, GUARD, STEP, THIEF, TOOLS, SMOKE_RADIUS, WORLD } from './config.js';
import { buildLevel, solidRects } from './level.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** True when segment (ax,ay)-(bx,by) crosses the rectangle. */
export function segmentHitsRect(ax, ay, bx, by, rect) {
  const dx = bx - ax;
  const dy = by - ay;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (ax < rect.x || ax > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - ax) / dx;
    let t2 = (rect.x + rect.w - ax) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (ay < rect.y || ay > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - ay) / dy;
    let t2 = (rect.y + rect.h - ay) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

function lineOfSight(ax, ay, bx, by, solids) {
  for (const rect of solids) {
    if (segmentHitsRect(ax, ay, bx, by, rect)) return false;
  }
  return true;
}

function inCone(ox, oy, angle, range, halfAngle, tx, ty) {
  const d = dist(ox, oy, tx, ty);
  if (d > range) return false;
  let diff = Math.atan2(ty - oy, tx - ox) - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return Math.abs(diff) <= halfAngle;
}

/** Push a circle out of every solid rectangle it overlaps. */
function collideCircle(state, solids, x, y, radius) {
  for (const rect of solids) {
    const cx = clamp(x, rect.x, rect.x + rect.w);
    const cy = clamp(y, rect.y, rect.y + rect.h);
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 === 0) {
        y = rect.y - radius;
      } else {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * radius;
        y = cy + (dy / d) * radius;
      }
    }
  }
  x = clamp(x, 26 + radius, WORLD.width - 26 - radius);
  y = clamp(y, 26 + radius, WORLD.height - 26 - radius);
  return { x, y };
}

export function createWorld(random) {
  const level = buildLevel(random);
  const solids = solidRects(level);
  const state = {
    level,
    solids,
    time: 0,
    thief: { x: level.entry.x, y: level.entry.y, angle: -Math.PI / 2, moving: false, sneaking: false },
    guards: level.guards.map((g, i) => ({
      name: g.name,
      waypoints: g.waypoints,
      pause: g.pause,
      x: g.waypoints[0].x,
      y: g.waypoints[0].y,
      target: 1,
      angle: 0,
      waiting: 0.4 + i * 0.5,
      mode: 'patrol',
      investigate: null,
      alertTimer: 0,
      lastSeen: null,
    })),
    cameras: level.cameras.map((c) => ({ ...c, angle: c.baseAngle })),
    alarm: 0,
    lootTaken: false,
    lootSparkle: 0,
    smokeLeft: TOOLS.smoke,
    dartsLeft: TOOLS.dart,
    smokes: [],
    darts: [],
    outcome: null,
    spottedNow: false,
    seenBy: null,
  };
  return {
    state,
    reset() {
      const fresh = createWorld(random);
      Object.assign(state, fresh.state);
      state.guards = fresh.state.guards;
      state.cameras = fresh.state.cameras;
    },
    step(dt, input) {
      if (state.outcome) return EVENT_NONE;
      state.time += dt;
      let events = EVENT_NONE;
      const thief = state.thief;

      // Smoke: a fresh cloud hides the thief while it lasts.
      if (input.smoke && state.smokeLeft > 0 && !state.smokes.some((s) => s.t > TOOLS.smokeSeconds - 0.5)) {
        state.smokeLeft -= 1;
        state.smokes.push({ x: thief.x, y: thief.y, t: TOOLS.smokeSeconds });
      }
      for (const smoke of state.smokes) smoke.t -= dt;
      state.smokes = state.smokes.filter((s) => s.t > 0);
      const hidden = state.smokes.some((s) => dist(thief.x, thief.y, s.x, s.y) < SMOKE_RADIUS);

      // Noise dart: thrown at a point, it pulls the nearest guard over to look.
      if (input.dart && state.dartsLeft > 0) {
        state.dartsLeft -= 1;
        state.darts.push({ x: input.dart.x, y: input.dart.y, t: 0.35 });
        let best = null;
        let bestDist = 420;
        for (const guard of state.guards) {
          const d = dist(guard.x, guard.y, input.dart.x, input.dart.y);
          if (d < bestDist) {
            bestDist = d;
            best = guard;
          }
        }
        if (best) {
          best.mode = 'investigate';
          best.investigate = { x: input.dart.x, y: input.dart.y };
          best.alertTimer = 5;
        }
      }
      for (const dart of state.darts) dart.t -= dt;
      state.darts = state.darts.filter((d) => d.t > 0);

      // Thief movement, axis by axis so walls slide instead of sticking.
      const speed = input.sneak ? THIEF.sneakSpeed : THIEF.walkSpeed;
      const len = Math.hypot(input.dx, input.dy) || 1;
      const mx = (input.dx / len) * speed * dt;
      const my = (input.dy / len) * speed * dt;
      thief.moving = input.dx !== 0 || input.dy !== 0;
      thief.sneaking = !!input.sneak;
      if (thief.moving) thief.angle = Math.atan2(my, mx);
      let moved = collideCircle(state, solids, thief.x + mx, thief.y, THIEF.radius);
      moved = collideCircle(state, solids, moved.x, thief.y + my, THIEF.radius);
      thief.x = moved.x;
      thief.y = moved.y;

      // The Sunstone: take it by getting close, then the exit door opens.
      if (!state.lootTaken && dist(thief.x, thief.y, level.loot.x, level.loot.y) < THIEF.grabRadius) {
        state.lootTaken = true;
        state.lootSparkle = 1;
        events |= EVENT_LOOT;
      }
      if (state.lootSparkle > 0) state.lootSparkle = Math.max(0, state.lootSparkle - dt * 0.8);

      // Cameras sweep back and forth over their arc.
      for (const camera of state.cameras) {
        camera.angle =
          camera.baseAngle + Math.sin(state.time * CAMERA.sweepSpeed + camera.phase) * camera.sweep;
      }

      // Seeing: guards and cameras fill the alarm when the thief stands in a lit cone.
      let seen = false;
      let seenBy = null;
      const sneak = thief.sneaking ? ALARM.sneakFactor : 1;
      if (!hidden) {
        for (const guard of state.guards) {
          if (inCone(guard.x, guard.y, guard.angle, GUARD.coneRange, GUARD.coneHalfAngle, thief.x, thief.y) &&
              lineOfSight(guard.x, guard.y, thief.x, thief.y, solids)) {
            seen = true;
            seenBy = `Guard ${guard.name}`;
            state.alarm += ALARM.guardPerSecond * sneak * dt;
            guard.lastSeen = { x: thief.x, y: thief.y };
            guard.alertTimer = 2.5;
            if (guard.mode === 'patrol') guard.mode = 'chase';
          }
        }
        for (const camera of state.cameras) {
          if (inCone(camera.x, camera.y, camera.angle, CAMERA.coneRange, CAMERA.coneHalfAngle, thief.x, thief.y) &&
              lineOfSight(camera.x, camera.y, thief.x, thief.y, solids)) {
            seen = true;
            seenBy = seenBy ?? 'Camera';
            state.alarm += ALARM.cameraPerSecond * sneak * dt;
          }
        }
      }
      state.spottedNow = seen;
      state.seenBy = seenBy;
      if (seen) events |= EVENT_SPOTTED;
      if (!seen) state.alarm = Math.max(0, state.alarm - ALARM.decayPerSecond * dt);
      state.alarm = Math.min(ALARM.max, state.alarm);

      // Guards patrol their route, pause at each post, chase a sighting, then give up.
      for (const guard of state.guards) {
        if (guard.mode === 'chase' && guard.lastSeen) {
          guard.angle = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
          const d = dist(guard.x, guard.y, guard.lastSeen.x, guard.lastSeen.y);
          if (d > 12) {
            const stepLen = (GUARD.chaseSpeed * dt) / d;
            const nx = guard.x + (guard.lastSeen.x - guard.x) * stepLen;
            const ny = guard.y + (guard.lastSeen.y - guard.y) * stepLen;
            const fixed = collideCircle(state, solids, nx, ny, GUARD.radius);
            guard.x = fixed.x;
            guard.y = fixed.y;
          }
          guard.alertTimer -= dt;
          if (guard.alertTimer <= 0) {
            guard.mode = 'patrol';
            guard.lastSeen = null;
          }
        } else if (guard.mode === 'investigate' && guard.investigate) {
          const target = guard.investigate;
          guard.angle = Math.atan2(target.y - guard.y, target.x - guard.x);
          const d = dist(guard.x, guard.y, target.x, target.y);
          if (d > 14) {
            const stepLen = (GUARD.patrolSpeed * 1.4 * dt) / d;
            const fixed = collideCircle(state, solids, guard.x + (target.x - guard.x) * stepLen, guard.y + (target.y - guard.y) * stepLen, GUARD.radius);
            guard.x = fixed.x;
            guard.y = fixed.y;
          } else {
            guard.waiting = 1.5;
            guard.mode = 'patrol';
            guard.investigate = null;
          }
          guard.alertTimer -= dt;
          if (guard.alertTimer <= 0) {
            guard.mode = 'patrol';
            guard.investigate = null;
          }
        } else {
          if (guard.waiting > 0) {
            guard.waiting -= dt;
            const next = guard.waypoints[guard.target];
            guard.angle = Math.atan2(next.y - guard.y, next.x - guard.x);
          } else {
            const next = guard.waypoints[guard.target];
            guard.angle = Math.atan2(next.y - guard.y, next.x - guard.x);
            const d = dist(guard.x, guard.y, next.x, next.y);
            const stepLen = (GUARD.patrolSpeed * dt) / d;
            const fixed = collideCircle(state, solids, guard.x + (next.x - guard.x) * stepLen, guard.y + (next.y - guard.y) * stepLen, GUARD.radius);
            guard.x = fixed.x;
            guard.y = fixed.y;
            if (dist(guard.x, guard.y, next.x, next.y) < 8) {
              guard.target = (guard.target + 1) % guard.waypoints.length;
              guard.waiting = guard.pause;
            }
          }
        }
        // Caught: a guard closes in on the thief.
        if (dist(guard.x, guard.y, thief.x, thief.y) < GUARD.touchRadius) {
          state.outcome = 'caught';
          state.alarm = ALARM.max;
          return events | EVENT_CAUGHT;
        }
      }

      if (state.alarm >= ALARM.max) {
        state.outcome = 'caught';
        return events | EVENT_CAUGHT;
      }

      // The getaway: stone in hand, reach the service door.
      if (state.lootTaken) {
        const exit = level.exit;
        if (thief.x > exit.x && thief.x < exit.x + exit.w && thief.y > exit.y - 20 && thief.y < exit.y + exit.h + 20) {
          state.outcome = 'escaped';
          return events | EVENT_WIN;
        }
      }
      return events;
    },
  };
}

export { STEP };
