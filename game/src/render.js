// The look of the night: marble floor, crimson rugs, gold trim, and cones of lamplight that
// sweep the room. Safe cover reads dark, danger reads warm yellow-red, and the Sunstone glows.
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const GOLD = '#d4a437';
const GOLD_DIM = '#8a6d2b';

function conePath(ctx, x, y, angle, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfAngle, hot) {
  const gradient = ctx.createRadialGradient(x, y, 10, x, y, range);
  if (hot) {
    gradient.addColorStop(0, 'rgba(255, 60, 40, 0.42)');
    gradient.addColorStop(1, 'rgba(255, 60, 40, 0.05)');
  } else {
    gradient.addColorStop(0, 'rgba(255, 214, 90, 0.30)');
    gradient.addColorStop(1, 'rgba(255, 214, 90, 0.04)');
  }
  conePath(ctx, x, y, angle, range, halfAngle);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = hot ? 'rgba(255, 80, 60, 0.55)' : 'rgba(255, 214, 90, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const W = 1280;
  const H = 800;

  function drawFloor(level) {
    ctx.fillStyle = '#1b1b26';
    ctx.fillRect(0, 0, W, H);
    const tile = 64;
    for (let ty = 0; ty < H / tile; ty += 1) {
      for (let tx = 0; tx < W / tile; tx += 1) {
        const even = (tx + ty) % 2 === 0;
        ctx.fillStyle = even ? '#20202e' : '#1d1d2a';
        ctx.fillRect(tx * tile + 1, ty * tile + 1, tile - 2, tile - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(tx * tile + 1, ty * tile + 1, tile - 2, 6);
      }
    }
    for (const rug of level.rugs) {
      ctx.fillStyle = '#5d1f2b';
      ctx.fillRect(rug.x, rug.y, rug.w, rug.h);
      ctx.strokeStyle = GOLD_DIM;
      ctx.lineWidth = 4;
      ctx.strokeRect(rug.x + 8, rug.y + 8, rug.w - 16, rug.h - 16);
      ctx.strokeStyle = 'rgba(212,164,55,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rug.x + 16, rug.y + 16, rug.w - 32, rug.h - 32);
    }
  }

  function drawWalls(level) {
    for (const wall of level.walls) {
      ctx.fillStyle = '#2e2a3d';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(wall.x, wall.y + wall.h - 6, wall.w, 6);
      ctx.fillStyle = GOLD_DIM;
      if (wall.h >= wall.w) ctx.fillRect(wall.x + wall.w - 3, wall.y, 3, wall.h);
      else ctx.fillRect(wall.x, wall.y + wall.h - 3, wall.w, 3);
    }
    for (const c of level.cases) {
      ctx.fillStyle = '#101018';
      roundRect(ctx, c.x, c.y, c.w, c.h, 6);
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(180,220,255,0.14)';
      roundRect(ctx, c.x + 6, c.y + 6, c.w - 12, c.h - 12, 4);
      ctx.fill();
      ctx.fillStyle = '#cfc4a0';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2 + 4);
    }
  }

  function drawExit(level, open) {
    const exit = level.exit;
    ctx.fillStyle = open ? '#1f7a3a' : '#6e1f1f';
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.strokeStyle = open ? '#5ee88a' : '#c05050';
    ctx.lineWidth = 2;
    ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT — GO!' : 'EXIT (LOCKED)', exit.x + exit.w / 2, exit.y - 8);
    if (open) {
      ctx.fillStyle = `rgba(94,232,138,${0.25 + 0.2 * Math.sin(Date.now() / 200)})`;
      ctx.fillRect(exit.x - 6, exit.y - 40, exit.w + 12, 40);
    }
  }

  function drawLoot(state) {
    const level = state.level;
    const loot = level.loot;
    if (state.lootTaken) {
      ctx.fillStyle = '#3a2f14';
      roundRect(ctx, loot.x - 26, loot.y - 20, 52, 40, 6);
      ctx.fill();
      ctx.strokeStyle = GOLD_DIM;
      ctx.stroke();
      return;
    }
    const pulse = 0.7 + 0.3 * Math.sin(state.time * 3);
    const glow = ctx.createRadialGradient(loot.x, loot.y, 4, loot.x, loot.y, 70);
    glow.addColorStop(0, `rgba(255, 220, 90, ${0.55 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 220, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(loot.x - 70, loot.y - 70, 140, 140);
    ctx.fillStyle = '#3a2f14';
    roundRect(ctx, loot.x - 26, loot.y - 6, 52, 26, 6);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    // The Sunstone: a faceted diamond that spins in the lamplight.
    ctx.save();
    ctx.translate(loot.x, loot.y - 14);
    ctx.rotate(Math.sin(state.time * 1.4) * 0.25);
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 3; i += 1) {
      const a = state.time * 2 + (i * Math.PI * 2) / 3;
      const sx = loot.x + Math.cos(a) * 30;
      const sy = loot.y - 14 + Math.sin(a) * 22;
      ctx.fillStyle = `rgba(255, 240, 160, ${0.5 + 0.5 * Math.sin(state.time * 4 + i)})`;
      ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE SUNSTONE', loot.x, loot.y + 44);
  }

  function drawGuard(guard, state) {
    const hot = guard.mode !== 'patrol';
    drawCone(ctx, guard.x, guard.y, guard.angle, 235, 0.56, hot);
    ctx.fillStyle = '#2c3a5e';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hot ? '#ff5040' : '#7fa0e0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#d8c9a0';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.angle) * 5, guard.y + Math.sin(guard.angle) * 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7fa0e0';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.name, guard.x, guard.y - 22);
    if (guard.mode === 'chase') {
      ctx.fillStyle = '#ff5040';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('!', guard.x, guard.y - 34);
    }
  }

  function drawCamera(camera, state) {
    const hot = state.spottedNow && state.seenBy === 'Camera';
    drawCone(ctx, camera.x, camera.y, camera.angle, 265, 0.42, hot);
    ctx.fillStyle = '#3a3a44';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hot ? '#ff5040' : '#e0b050';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = hot ? '#ff5040' : '#ff4040';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawThief(state) {
    const thief = state.thief;
    for (const smoke of state.smokes) {
      const gradient = ctx.createRadialGradient(smoke.x, smoke.y, 10, smoke.x, smoke.y, 95);
      gradient.addColorStop(0, 'rgba(200,200,210,0.5)');
      gradient.addColorStop(1, 'rgba(200,200,210,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(smoke.x, smoke.y, 95, 0, Math.PI * 2);
      ctx.fill();
    }
    const bob = thief.moving ? Math.sin(state.time * 14) * 1.5 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(thief.x, thief.y + 12, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a2d6b';
    ctx.beginPath();
    ctx.arc(thief.x, thief.y + bob, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2e1a44';
    ctx.beginPath();
    ctx.arc(thief.x + Math.cos(thief.angle) * 4, thief.y + Math.sin(thief.angle) * 4 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(thief.x + Math.cos(thief.angle) * 8, thief.y + Math.sin(thief.angle) * 8 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (thief.sneaking) {
      ctx.fillStyle = '#cfc4a0';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('sneaking', thief.x, thief.y - 22);
    }
  }

  function drawAlarm(state) {
    const alarm = state.alarm;
    const barW = 320;
    const x = W / 2 - barW / 2;
    const y = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, x - 10, y - 6, barW + 20, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#e8e0c8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', x, y + 14);
    ctx.fillStyle = '#332222';
    roundRect(ctx, x + 64, y, barW - 64, 16, 8);
    ctx.fill();
    const ratio = alarm / 100;
    const colour = ratio < 0.4 ? '#e0b050' : ratio < 0.75 ? '#e07830' : '#ff4030';
    ctx.fillStyle = colour;
    if (ratio > 0) {
      roundRect(ctx, x + 64, y, (barW - 64) * ratio, 16, 8);
      ctx.fill();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 64, y, barW - 64, 16, 8);
    ctx.stroke();
    if (state.spottedNow) {
      const pulse = 0.6 + 0.4 * Math.sin(state.time * 10);
      ctx.fillStyle = `rgba(255,64,48,${pulse})`;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`SPOTTED — ${state.seenBy ?? ''}!`, W / 2, y + 52);
    }
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, 12, H - 52, 430, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#e8e0c8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    const lootText = state.lootTaken ? 'SUNSTONE: STOLEN ✓' : 'SUNSTONE: not taken';
    ctx.fillText(lootText, 24, H - 27);
    ctx.fillStyle = '#9fb4e0';
    ctx.fillText(`Smoke ${state.smokeLeft}  •  Darts ${state.dartsLeft}`, 240, H - 27);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, W - 252, H - 52, 240, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#e8e0c8';
    ctx.textAlign = 'right';
    const minutes = Math.floor(state.time / 60);
    const seconds = Math.floor(state.time % 60).toString().padStart(2, '0');
    ctx.fillText(`${minutes}:${seconds}   Best $${best.toLocaleString()}`, W - 24, H - 27);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(232,224,200,0.75)';
    ctx.font = '12px sans-serif';
    ctx.fillText('WASD move · Shift sneak · Space smoke · Click: noise dart · P pause', 24, 30);
  }

  function overlay(title, lines, colour) {
    ctx.fillStyle = 'rgba(6,6,14,0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = colour;
    ctx.font = 'bold 52px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, H / 2 - 90);
    ctx.fillStyle = '#e8e0c8';
    ctx.font = '19px Georgia, serif';
    lines.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 - 30 + i * 32));
  }

  return {
    draw(state, screen, best) {
      const level = state.level;
      ctx.clearRect(0, 0, W, H);
      drawFloor(level);
      drawWalls(level);
      drawExit(level, state.lootTaken);
      drawLoot(state);
      for (const camera of state.cameras) drawCamera(camera, state);
      for (const guard of state.guards) drawGuard(guard, state);
      drawThief(state);
      for (const dart of state.darts) {
        ctx.fillStyle = '#ff9040';
        ctx.beginPath();
        ctx.arc(dart.x, dart.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,144,64,0.6)';
        ctx.beginPath();
        ctx.arc(dart.x, dart.y, 12 + (0.35 - dart.t) * 40, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawAlarm(state);
      drawHud(state, best);
      if (screen === SCREEN_TITLE) {
        overlay('THE GILDED VAULT', [
          'Midnight. One thief — Mara Vane. One prize — the Sunstone.',
          'Slip past Brann, Okafor and Ivers. Dodge the cameras. Mind the cones.',
          'Steal the Sunstone, then reach the service door before the alarm fills.',
          '',
          'WASD / arrows — move    Shift — sneak    Space — smoke pellet',
          'Click — throw a noise dart    P — pause',
          '',
          'Press Enter or click to begin the heist.',
        ], GOLD);
      } else if (screen === SCREEN_PAUSED) {
        overlay('PAUSED', ['The gallery waits. Press P to keep moving.'], '#9fb4e0');
      } else if (screen === SCREEN_OVER) {
        overlay('CAUGHT!', [
          'The alarm screamed, the guards closed in, and Mara Vane',
          'spent the night in a cell instead of a getaway car.',
          '',
          'Press Enter to try the vault again.',
        ], '#ff5040');
      } else if (screen === SCREEN_WIN) {
        overlay('CLEAN GETAWAY!', [
          `The Sunstone is yours — $50,000 of starlight, lifted without a trace.`,
          'Mara Vane vanishes into the night. The vault never knew she was there.',
          '',
          'Press Enter to run it again.',
        ], GOLD);
      }
    },
  };
}
