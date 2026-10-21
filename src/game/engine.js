import { W, H, U, DAY_CYCLE_MS, WALL, HOUSE_WALL_PALETTES, ROOF_TINTS, K, hash } from './constants';

export const at = (grid, x, y) => {
  const v = grid.get(K(x, y));
  if (!v) return 0;
  if (typeof v === 'object') return v.type || 0;
  return v % 10;
};

export const getTier = (grid, x, y) => {
  const v = grid.get(K(x, y));
  if (!v) return 0;
  if (typeof v === 'object') return v.h || 0;
  return Math.floor(v / 10);
};

export const ht = (grid, x, y) => {
  const t = at(grid, x, y);
  if (t === 0) return 0.3;
  if (t === 6) return 1.0 + getTier(grid, x, y) * 0.75;
  return 1.0 + getTier(grid, x, y) * 0.75;
};

export const cnt = (grid, x, y, targetType, d8 = false) => {
  let count = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      if ((!i && !j) || (!d8 && i && j)) continue;
      if (at(grid, x + i, y + j) === targetType) count++;
    }
  }
  return count;
};

export function toRotated(x, y, rot = 0) {
  const r = ((rot % 4) + 4) % 4;
  if (r === 1) return [-y, x];
  if (r === 2) return [-x, -y];
  if (r === 3) return [y, -x];
  return [x, y];
}

export function fromRotated(rx, ry, rot = 0) {
  const r = ((rot % 4) + 4) % 4;
  if (r === 1) return [ry, -rx];
  if (r === 2) return [-rx, -ry];
  if (r === 3) return [-ry, rx];
  return [rx, ry];
}

export const P = (ox, oy, x, y, z, rot = 0) => {
  const [rx, ry] = toRotated(x, y, rot);
  return [
    ox + (rx - ry) * (W / 2),
    oy + (rx + ry) * (H / 2) - z * U
  ];
};

export const walk = (grid, x, y) => {
  const t = at(grid, x, y);
  return t === 1 || t === 3 || t === 4;
};

export const kind = (grid, x, y) => {
  if (cnt(grid, x, y, 5, true) >= 6) return 'castle';
  if (cnt(grid, x, y, 3) >= 4) return 'church';
  if (cnt(grid, x, y, 4) >= 3) return 'mill';
  return 'house';
};

export function poly(ctx, points, fillColor, strokeColor = fillColor, lineWidth = 0.8) {
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  points.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function prism(ctx, ox, oy, x, y, z, c, light = null, rot = 0) {
  const [sx, sy] = P(ox, oy, x, y, z, rot);
  const h = z * U;
  poly(ctx, [[sx - W / 2, sy], [sx, sy + H / 2], [sx, sy + H / 2 + h], [sx - W / 2, sy + h]], c[1]);
  poly(ctx, [[sx + W / 2, sy], [sx, sy + H / 2], [sx, sy + H / 2 + h], [sx + W / 2, sy + h]], c[2]);
  poly(ctx, [[sx, sy - H / 2], [sx + W / 2, sy], [sx, sy + H / 2], [sx - W / 2, sy]], c[0]);
  if (!c[3]) {
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx - W / 2, sy);
    ctx.lineTo(sx, sy - H / 2);
    ctx.lineTo(sx + W / 2, sy);
    ctx.stroke();
  }
}

export function box(ctx, sx, sy, hw, h, c, light = null) {
  const hh = hw / 2;
  poly(ctx, [[sx - hw, sy], [sx, sy + hh], [sx, sy + hh - h], [sx - hw, sy - h]], c[1]);
  poly(ctx, [[sx + hw, sy], [sx, sy + hh], [sx, sy + hh - h], [sx + hw, sy - h]], c[2]);
  poly(ctx, [[sx, sy - hh - h], [sx + hw, sy - h], [sx, sy + hh - h], [sx - hw, sy - h]], c[0]);

  if (light) {
    const dotLeft = -light.lightDirX * 0.7 - light.lightDirY * 0.35;
    const dotRight = light.lightDirX * 0.7 - light.lightDirY * 0.35;

    if (dotLeft > 0) {
      poly(ctx, [[sx - hw, sy], [sx, sy + hh], [sx, sy + hh - h], [sx - hw, sy - h]], `rgba(255, 248, 220, ${dotLeft * 0.16})`);
    } else {
      poly(ctx, [[sx - hw, sy], [sx, sy + hh], [sx, sy + hh - h], [sx - hw, sy - h]], `rgba(20, 16, 40, ${(-dotLeft) * 0.22})`);
    }

    if (dotRight > 0) {
      poly(ctx, [[sx + hw, sy], [sx, sy + hh], [sx, sy + hh - h], [sx + hw, sy - h]], `rgba(255, 248, 220, ${dotRight * 0.16})`);
    } else {
      poly(ctx, [[sx + hw, sy], [sx, sy + hh], [sx, sy + hh - h], [sx + hw, sy - h]], `rgba(20, 16, 40, ${(-dotRight) * 0.22})`);
    }

    if (light.alt > 0) {
      poly(ctx, [[sx, sy - hh - h], [sx + hw, sy - h], [sx, sy + hh - h], [sx - hw, sy - h]], `rgba(255, 252, 230, ${light.alt * 0.12})`);
    }
  }
}

export function roof(ctx, sx, sy, hw, k, c, light = null) {
  const hh = hw / 2;
  const a = [sx, sy - k];
  poly(ctx, [[sx - hw, sy], [sx, sy - hh], a], c[1]);
  poly(ctx, [[sx + hw, sy], [sx, sy - hh], a], c[1]);
  poly(ctx, [[sx - hw, sy], [sx, sy + hh], a], c[0]);
  poly(ctx, [[sx + hw, sy], [sx, sy + hh], a], c[1]);

  if (light) {
    const dotLeft = -light.lightDirX * 0.75 - light.lightDirY * 0.45;
    const dotRight = light.lightDirX * 0.75 - light.lightDirY * 0.45;

    if (dotLeft > 0) {
      poly(ctx, [[sx - hw, sy], [sx, sy + hh], a], `rgba(255, 246, 210, ${dotLeft * 0.18})`);
    } else {
      poly(ctx, [[sx - hw, sy], [sx, sy + hh], a], `rgba(16, 12, 36, ${(-dotLeft) * 0.22})`);
    }

    if (dotRight > 0) {
      poly(ctx, [[sx + hw, sy], [sx, sy + hh], a], `rgba(255, 246, 210, ${dotRight * 0.18})`);
    } else {
      poly(ctx, [[sx + hw, sy], [sx, sy + hh], a], `rgba(16, 12, 36, ${(-dotRight) * 0.22})`);
    }
  }
}

export const isWater = (t) => t === 0 || t === 6;

export const countWaterNeighbors = (grid, x, y, d8 = false) => {
  let count = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      if ((!i && !j) || (!d8 && i && j)) continue;
      if (isWater(at(grid, x + i, y + j))) count++;
    }
  }
  return count;
};

export const sandy = (grid, x, y) => countWaterNeighbors(grid, x, y) > 0 || countWaterNeighbors(grid, x, y, true) >= 3;

export const mat = (grid, x, y) => {
  const t = at(grid, x, y);
  return t === 0 || t === 6 ? 'w' : t === 2 ? 'r' : t === 3 ? 'd' : t === 4 ? 'f' : sandy(grid, x, y) ? 's' : 'g';
};

export const sandC = (seasonId) =>
  seasonId === 2
    ? ['#eef3f7', '#d4dee8', '#bcc9d6']
    : ['#ecdca8', '#d6c28a', '#bfa972'];

export const soil = (seasonId) => (seasonId === 2 ? '#aeb7bf' : '#8c6a46');

export const tcol = (m, p, S, seasonId) =>
  m === 'g'
    ? [p.g[0], p.g[1]]
    : m === 's'
    ? [S[0], S[1]]
    : m === 'd'
    ? [p.rd, S[1]]
    : m === 'f'
    ? [soil(seasonId), '#6e4f31']
    : [p.r[0], p.r[1]];

export function crops(ctx, x, y, sx, sy, t, seasonId) {
  const L2 = (u, v) => [sx + (u - v) * (W / 2), sy + (u + v) * (H / 2)];
  ctx.strokeStyle = 'rgba(40,25,10,.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const v = -0.375 + k * 0.25;
    const a = L2(-0.5, v);
    const b = L2(0.5, v);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();

  const st =
    seasonId === 2
      ? ['#8fae9a', '#dfe6ea']
      : seasonId === 1
      ? ['#c9a13a', '#f0c75e']
      : seasonId === 3
      ? ['#bd7f32', '#f3b469']
      : ['#6fae3f', '#e6c453'];

  for (let k = 0; k < 4; k++) {
    const v = -0.375 + k * 0.25;
    for (let j = 0; j < 5; j++) {
      const u = -0.4 + j * 0.2;
      const [px, py] = L2(u, v);
      const ph = t / 450 + (x + u) * 1.1 + (y + v) * 0.8;
      const sw = Math.sin(ph) * 2.4 + Math.sin(ph * 2.3) * 0.6;
      const h = 9 + hash(x * 5 + j, y * 3 + k) * 3;

      ctx.strokeStyle = st[0];
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + sw * 0.3, py - h * 0.55, px + sw, py - h);
      ctx.moveTo(px, py - 2);
      ctx.quadraticCurveTo(px - 3 + sw * 0.2, py - 5, px - 4 + sw * 0.4, py - 8);
      ctx.moveTo(px, py - 3);
      ctx.quadraticCurveTo(px + 3 + sw * 0.2, py - 6, px + 4 + sw * 0.4, py - 9);
      ctx.stroke();

      ctx.fillStyle = st[1];
      ctx.beginPath();
      ctx.ellipse(px + sw, py - h - 1.5, 1.4, 3, sw * 0.08, 0, 7);
      ctx.fill();
    }
  }
}

export function bleed(ctx, grid, x, y, sx, sy, m, p, seasonId, rot = 0) {
  const S = sandC(seasonId);
  const T = [sx, sy - H / 2];
  const R = [sx + W / 2, sy];
  const B = [sx, sy + H / 2];
  const Lf = [sx - W / 2, sy];
  const E = [
    [T, R, ...fromRotated(0, -1, rot)],
    [R, B, ...fromRotated(1, 0, rot)],
    [B, Lf, ...fromRotated(0, 1, rot)],
    [Lf, T, ...fromRotated(-1, 0, rot)]
  ];

  for (const [a, b, dx, dy] of E) {
    const nm = mat(grid, x + dx, y + dy);
    if (nm === m || nm === 'w') continue;
    const col =
      nm === 'g'
        ? p.g[0]
        : nm === 's'
        ? S[0]
        : nm === 'd'
        ? p.rd
        : nm === 'f'
        ? soil(seasonId)
        : p.r[0];

    for (let i = 0; i < 4; i++) {
      const f = 0.2 + (0.6 * i) / 3 + (hash(x * 7 + i, y * 3 + dx) - 0.5) * 0.06;
      const r = 4 + hash(x + i, y * 5 + dy) * 2.5;
      const qx = a[0] + (b[0] - a[0]) * f + (sx - (a[0] + b[0]) / 2) * 0.1;
      const qy = a[1] + (b[1] - a[1]) * f + (sy - (a[1] + b[1]) / 2) * 0.1;

      ctx.fillStyle = col;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(qx, qy, r * 1.5, r * 0.8, 0, 0, 7);
      ctx.fill();

      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(qx, qy, r * 0.9, r * 0.5, 0, 0, 7);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawChimney(ctx, chx, chy, chw, chh, t, x, y, nt, light = null) {
  // Brick stack with directional shading
  box(ctx, chx, chy, chw, chh, ['#af6950', '#93543d', '#79412e'], light);

  // Natural drifting, expanding, soft smoke puffs
  const smokePuffs = 4;
  for (let i = 0; i < smokePuffs; i++) {
    const prog = (t / 1600 + (x * 4.3 + y * 6.7) + i / smokePuffs) % 1;
    const rise = Math.pow(prog, 0.85) * 22;
    const sway = Math.sin(t / 420 + i * 1.8 + x * 2) * 2 + prog * 7;
    const radius = 1.6 + prog * 3.4;
    // Bell curve fade: soft emergence, full puff in air, smooth dissipation
    const fade = Math.sin(prog * Math.PI);
    const alpha = fade * 0.45;

    ctx.fillStyle =
      nt > 0.4
        ? `rgba(205, 215, 240, ${alpha * 0.8})`
        : `rgba(255, 255, 255, ${alpha})`;

    ctx.beginPath();
    ctx.arc(chx + sway, chy - chh - rise, radius, 0, 7);
    ctx.fill();
  }
}

export function getLightParams(t) {
  // 5-minute (300,000ms) complete celestial revolution across the sky
  const cycle = (t / DAY_CYCLE_MS) * Math.PI * 2;
  const alt = Math.sin(cycle);
  const sunAzimuth = cycle + 0.8;
  const shadowAngle = sunAzimuth + Math.PI;

  const sunElevation = Math.max(0.16, Math.abs(alt));
  // Longer multi-block reach (up to 2.6x height units) when the light is oblique
  const shadowLen = Math.min(2.6, Math.max(0.48, 0.72 / (sunElevation * 0.82 + 0.24)));

  const dx = Math.cos(shadowAngle) * shadowLen;
  const dy = Math.sin(shadowAngle) * shadowLen * 0.55;

  const lightDirX = Math.cos(sunAzimuth);
  const lightDirY = Math.sin(sunAzimuth) * 0.55;

  const nt = Math.max(0, Math.min(1.0, -alt * 1.25));
  const shadowAlpha = alt > 0 ? 0.13 + alt * 0.16 : 0.075;

  return {
    dx,
    dy,
    lightDirX,
    lightDirY,
    shadowLen,
    shadowAlpha,
    alt,
    nt,
    cycle
  };
}

export function castShadow(ctx, sx, sy, hw, hh, height, light, shape = 'box') {
  if (!light) return;
  const { dx, dy, shadowAlpha } = light;
  const topX = sx + dx * height;
  const topY = sy + dy * height;

  // Natural physics: softer penumbra gradient as shadow extends across multiple blocks
  const grad = ctx.createLinearGradient(sx, sy, topX, topY);
  grad.addColorStop(0, `rgba(14, 12, 32, ${shadowAlpha * 1.3})`);
  grad.addColorStop(0.65, `rgba(16, 14, 34, ${shadowAlpha * 0.9})`);
  grad.addColorStop(1, `rgba(22, 18, 42, ${shadowAlpha * 0.35})`);

  ctx.fillStyle = grad;
  ctx.beginPath();

  if (shape === 'box') {
    ctx.moveTo(sx - hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(topX + hw * 0.45, topY);
    ctx.lineTo(topX - hw * 0.45, topY);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(topX, topY, Math.max(hw * 0.45, 3), Math.max(hh * 0.45, 2), 0, 0, 7);
    ctx.fill();
  } else if (shape === 'spire') {
    ctx.moveTo(sx - hw, sy);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(topX, topY);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'tree') {
    ctx.ellipse(sx, sy, hw * 0.5, hh * 0.5, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx - hw * 0.4, sy);
    ctx.lineTo(sx + hw * 0.4, sy);
    ctx.lineTo(topX + hw * 0.7, topY);
    ctx.lineTo(topX - hw * 0.7, topY);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(topX, topY, hw * 0.95, hh * 0.95, 0, 0, 7);
    ctx.fill();
  } else {
    // Small agents, boats, villagers
    ctx.ellipse(topX, topY, hw, hh, 0, 0, 7);
    ctx.fill();
  }
}

export function buildingShadow(ctx, grid, ox, oy, x, y, t, light, camRot = 0) {
  if (!light) return;
  const [sx, sy] = P(ox, oy, x, y, ht(grid, x, y), camRot);
  const k = kind(grid, x, y);

  if (k === 'house') {
    const shape = Math.floor(hash(x * 13 + 7, y * 19 + 11) * 3);
    const rot = (Math.floor(hash(x * 29 + 3, y * 37 + 5) * 4) + camRot) % 4;
    const hasChimney = hash(x * 17 + 3, y * 23 + 5) > 0.42;

    if (shape === 0) {
      // 1-Block House shadow
      const h = rot === 2 ? 26 : 20;
      castShadow(ctx, sx, sy, 11, 5.5, h, light, 'box');
      if (hasChimney) {
        const chx = rot === 1 || rot === 3 ? sx - 5 : sx + 5;
        castShadow(ctx, chx, sy - (rot === 2 ? 15 : 9), 2.5, 1.3, h + 8, light, 'spire');
      }
    } else if (shape === 1) {
      // 2-Block House shadow (wings)
      if (rot === 0) {
        castShadow(ctx, sx - 6, sy - 3, 7, 3.5, 16, light, 'box');
        castShadow(ctx, sx + 4, sy + 2, 9, 4.5, 24, light, 'box');
        if (hasChimney) castShadow(ctx, sx + 6, sy - 9, 2.4, 1.2, 31, light, 'spire');
      } else if (rot === 1) {
        castShadow(ctx, sx + 6, sy - 3, 7, 3.5, 16, light, 'box');
        castShadow(ctx, sx - 4, sy + 2, 9, 4.5, 24, light, 'box');
        if (hasChimney) castShadow(ctx, sx - 6, sy - 9, 2.4, 1.2, 31, light, 'spire');
      } else if (rot === 2) {
        castShadow(ctx, sx, sy - 2.5, 11, 5.5, 24, light, 'box');
        castShadow(ctx, sx + 3.5, sy + 4.5, 6, 3, 14, light, 'box');
        if (hasChimney) castShadow(ctx, sx - 5, sy - 12, 2.4, 1.2, 30, light, 'spire');
      } else {
        castShadow(ctx, sx - 5, sy - 1, 7.5, 3.8, 19, light, 'box');
        castShadow(ctx, sx + 4.5, sy + 1.5, 8.5, 4.2, 25, light, 'box');
        if (hasChimney) castShadow(ctx, sx + 6, sy - 10, 2.4, 1.2, 31, light, 'spire');
      }
    } else {
      // 3-Block L-shapes & T-shapes shadow
      if (rot === 0) {
        castShadow(ctx, sx + 2, sy - 4, 8.5, 4.2, 25, light, 'box');
        castShadow(ctx, sx - 6.5, sy - 2, 7, 3.5, 18, light, 'box');
        castShadow(ctx, sx + 5, sy + 3.5, 7, 3.5, 19, light, 'box');
      } else if (rot === 1) {
        castShadow(ctx, sx - 2, sy - 4, 8.5, 4.2, 25, light, 'box');
        castShadow(ctx, sx + 6.5, sy - 2, 7, 3.5, 18, light, 'box');
        castShadow(ctx, sx - 5, sy + 3.5, 7, 3.5, 19, light, 'box');
      } else if (rot === 2) {
        castShadow(ctx, sx, sy + 1, 9, 4.5, 27, light, 'box');
        castShadow(ctx, sx - 7, sy - 2, 6.5, 3.2, 17, light, 'box');
        castShadow(ctx, sx + 7, sy - 2, 6.5, 3.2, 17, light, 'box');
      } else {
        castShadow(ctx, sx + 4, sy - 3, 7.5, 3.8, 20, light, 'box');
        castShadow(ctx, sx - 4, sy - 0.5, 8.5, 4.2, 24, light, 'box');
        castShadow(ctx, sx - 1, sy + 4.5, 6.5, 3.2, 15, light, 'box');
      }
      if (hasChimney) castShadow(ctx, sx, sy - 12, 2.4, 1.2, 32, light, 'spire');
    }
  } else if (k === 'church') {
    castShadow(ctx, sx, sy, 12, 6, 24, light, 'box');
    castShadow(ctx, sx, sy - 13, 6, 3, 50, light, 'spire');
  } else if (k === 'mill') {
    castShadow(ctx, sx, sy, 10, 5, 24, light, 'box');
    const sa = t / 700;
    const hx = sx + light.dx * 20;
    const hy = sy - 17 + light.dy * 20;
    ctx.strokeStyle = `rgba(16, 12, 34, ${light.shadowAlpha * 0.75})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const b = sa + (i * Math.PI) / 2;
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + Math.cos(b) * 16, hy + Math.sin(b) * 16 * 0.7);
    }
    ctx.stroke();
  } else {
    // Castle
    castShadow(ctx, sx, sy, 17, 8.5, 32, light, 'box');
    castShadow(ctx, sx, sy - 16, 9, 4.5, 44, light, 'spire');
    castShadow(ctx, sx - 14, sy + 4, 7, 3.5, 42, light, 'spire');
    castShadow(ctx, sx + 14, sy + 4, 7, 3.5, 42, light, 'spire');
  }
}

export function getHouseLightState(x, y, t, nt, light) {
  const DAY_MS = DAY_CYCLE_MS;
  const dayNumber = Math.floor(t / DAY_MS);
  const tDay = ((t % DAY_MS) + DAY_MS) % DAY_MS;

  // Dusk begins when sun dips below horizon: tDay ~148,000ms (~2m 28s)
  // Evening turn-on time staggered per house over ~10 seconds, varying every single day!
  const turnOnStagger = (hash(x * 73 + y * 151 + 31, dayNumber * 223 + 47) - 0.5) * 10000;
  const turnOnTime = (DAY_MS * 0.493) + turnOnStagger;

  // Morning dawn turn-off time (around tDay ~297,000ms / 0ms)
  const turnOffStagger = (hash(x * 47 + y * 89 + 13, dayNumber * 131 + 29) - 0.5) * 8000;
  const turnOffTime = (DAY_MS * 0.991) + turnOffStagger;

  let isNightWindow = false;
  let timeSinceTurnOn = 0;

  if (tDay >= turnOnTime) {
    isNightWindow = true;
    timeSinceTurnOn = tDay - turnOnTime;
  } else if (tDay < (turnOffTime - DAY_MS)) {
    isNightWindow = true;
    timeSinceTurnOn = (tDay + DAY_MS) - turnOnTime;
  }

  if (!isNightWindow) {
    return {
      isOn: false,
      intensity: 0,
      isFlickeringToday: false,
      color: '#8fd0ea',
      dayNumber
    };
  }

  // Daily habit roll: switches day by day so houses do not stick to the same behavior
  const dailyRoll = hash(x * 137 + y * 281 + 41, dayNumber * 313 + 67);
  const isFlickeringToday = dailyRoll < 0.52; // ~52% houses flicker today, ~48% turn on instantly

  let intensity = 0;

  if (!isFlickeringToday) {
    // INSTANT TURN-ON
    // Crisp rapid rise into full bright lamplight
    if (timeSinceTurnOn < 70) {
      intensity = timeSinceTurnOn / 70;
    } else {
      const subtleBreath = Math.sin(t * 0.003 + x * 7 + y * 13) * 0.04;
      intensity = Math.min(1, 0.94 + subtleBreath);
    }
  } else {
    // FLICKERING TURN-ON
    // Multi-phase organic light-up sequence over ~2.8 seconds
    const ft = timeSinceTurnOn / 1000; // in seconds
    const flickerFlavor = hash(x * 83 + y * 197, dayNumber * 109 + 53);
    const housePhase = flickerFlavor * 12;

    if (ft < 0.32) {
      // Stage 1: Initial strike / ignition spark
      const spark = Math.sin((ft / 0.32) * Math.PI);
      intensity = spark * (0.65 + 0.3 * flickerFlavor);
    } else if (ft < 0.72) {
      // Stage 2: Sputter & brief dark pause / ember
      const sputter = Math.max(0, Math.sin(ft * 42 + housePhase) * 0.2);
      intensity = 0.03 + sputter;
    } else if (ft < 1.48) {
      // Stage 3: Double-flicker catch! Rapid flutter as ignition catches
      const f1 = Math.sin(ft * 30 + housePhase);
      const f2 = Math.cos(ft * 52 + housePhase * 1.6);
      const catchGlow = Math.max(0, f1 * 0.55 + f2 * 0.45);
      intensity = 0.22 + catchGlow * 0.68;
    } else if (ft < 2.5) {
      // Stage 4: Flutter settling down to steady burn
      const settleProgress = (ft - 1.48) / (2.5 - 1.48);
      const ripple = Math.sin(ft * 18 + housePhase) * (1 - settleProgress) * 0.24;
      intensity = 0.76 + settleProgress * 0.2 + ripple;
    } else {
      // Stage 5: Fully stabilized steady warm glow with gentle living lamp draft
      const candleDraft = Math.sin(t * 0.004 + x * 3.1) * 0.05 + Math.cos(t * 0.007 + y * 4.3) * 0.03;
      intensity = Math.min(1, Math.max(0.85, 0.93 + candleDraft));
    }
  }

  // Smooth morning fade out as dawn breaks
  const msUntilOff = turnOffTime - (tDay < turnOnTime ? tDay + DAY_MS : tDay);
  if (msUntilOff > 0 && msUntilOff < 2500) {
    intensity *= Math.max(0, msUntilOff / 2500);
  }

  intensity = Math.max(0, Math.min(1, intensity));

  // Dynamic window color: from daytime sky-blue to warm golden lamplight
  const rVal = Math.round(143 + (255 - 143) * intensity);
  const gVal = Math.round(208 + (224 - 208) * intensity);
  const bVal = Math.round(234 + (115 - 234) * intensity);
  const windowColor = `rgb(${rVal},${gVal},${bVal})`;

  return {
    isOn: intensity > 0.02,
    intensity,
    isFlickeringToday,
    color: windowColor,
    dayNumber,
    timeSinceTurnOn
  };
}

export function drawHouseGroundLight(ctx, sx, sy, intensity, rot, shape) {
  if (intensity <= 0.01) return;

  // 1. Isometric Ground Illumination Pool
  // Warm golden amber radial gradient illuminating the terrain around the house
  ctx.save();
  ctx.translate(sx, sy + 2.5);
  ctx.scale(1, 0.52);

  const groundRad = 28;
  const poolGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, groundRad);
  poolGrad.addColorStop(0, `rgba(255, 215, 110, ${intensity * 0.44})`);
  poolGrad.addColorStop(0.35, `rgba(255, 175, 60, ${intensity * 0.25})`);
  poolGrad.addColorStop(0.72, `rgba(245, 135, 35, ${intensity * 0.08})`);
  poolGrad.addColorStop(1, 'rgba(235, 115, 20, 0)');

  ctx.fillStyle = poolGrad;
  ctx.beginPath();
  ctx.arc(0, 0, groundRad, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Doorway Light Spill Beam (Directional projection onto path/ground)
  ctx.save();
  const isLeftFacingDoor =
    (shape === 0 && (rot === 1 || rot === 3)) ||
    (shape === 1 && rot === 1) ||
    (shape === 2 && rot === 1);

  if (isLeftFacingDoor) {
    // Door on South-West wall: beam projects down-left
    const doorX = sx - 5.5;
    const doorY = sy + 3.2;
    const beamGrad = ctx.createLinearGradient(doorX, doorY, doorX - 14, doorY + 7);
    beamGrad.addColorStop(0, `rgba(255, 230, 130, ${intensity * 0.52})`);
    beamGrad.addColorStop(0.4, `rgba(255, 180, 65, ${intensity * 0.26})`);
    beamGrad.addColorStop(1, 'rgba(255, 140, 30, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(doorX + 2, doorY);
    ctx.lineTo(doorX - 2, doorY - 1);
    ctx.lineTo(doorX - 17, doorY + 6.5);
    ctx.lineTo(doorX - 9, doorY + 11);
    ctx.closePath();
    ctx.fill();
  } else {
    // Door on South-East wall: beam projects down-right
    const doorX = sx + 5.5;
    const doorY = sy + 3.2;
    const beamGrad = ctx.createLinearGradient(doorX, doorY, doorX + 14, doorY + 7);
    beamGrad.addColorStop(0, `rgba(255, 230, 130, ${intensity * 0.52})`);
    beamGrad.addColorStop(0.4, `rgba(255, 180, 65, ${intensity * 0.26})`);
    beamGrad.addColorStop(1, 'rgba(255, 140, 30, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(doorX - 2, doorY);
    ctx.lineTo(doorX + 2, doorY - 1);
    ctx.lineTo(doorX + 17, doorY + 6.5);
    ctx.lineTo(doorX + 9, doorY + 11);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawHouseWindow(ctx, pts, winColor, intensity) {
  poly(ctx, pts, winColor);
  if (intensity > 0.18) {
    // Luminous inner glass glow
    ctx.fillStyle = `rgba(255, 255, 230, ${intensity * 0.38})`;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();

    // Subtle windowpane mullion divider
    ctx.strokeStyle = `rgba(60, 40, 25, ${0.4 + (1 - intensity) * 0.35})`;
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    const mx1 = (pts[0][0] + pts[1][0]) / 2;
    const my1 = (pts[0][1] + pts[1][1]) / 2;
    const mx2 = (pts[2][0] + pts[3][0]) / 2;
    const my2 = (pts[2][1] + pts[3][1]) / 2;
    ctx.moveTo(mx1, my1);
    ctx.lineTo(mx2, my2);
    ctx.stroke();
  }
}

export function drawDoorWithLantern(ctx, pts, doorCol, intensity, rot) {
  poly(ctx, pts, doorCol);
  if (intensity > 0.12) {
    const tx = (pts[2][0] + pts[3][0]) / 2;
    const ty = (pts[2][1] + pts[3][1]) / 2;
    ctx.fillStyle = '#2d2218';
    ctx.beginPath();
    ctx.arc(tx, ty - 1.2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 235, 140, ${intensity * 0.9})`;
    ctx.beginPath();
    ctx.arc(tx, ty - 1.2, 1.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 210, 80, ${intensity * 0.35})`;
    ctx.beginPath();
    ctx.arc(tx, ty - 1.2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Cozy, subtle architectural house lighting seen from high aerial/sky view.
 * Softly merges into the nocturnal darkness with ultra-smooth radial falloff and no harsh clipping lines.
 */
export function drawHouseArchitecturalLight(ctx, grid, ox, oy, x, y, hz, camRot, houseLight, isCutout = true) {
  if (!houseLight || houseLight.intensity <= 0.04) return;

  const intens = houseLight.intensity;
  const [sx, sy] = P(ox, oy, x, y, hz, camRot);
  const rot = (Math.floor(hash(x * 29 + 3, y * 37 + 5) * 4) + camRot) % 4;

  const isDoorRight = (rot === 0 || rot === 2);
  const frontOffsetX = isDoorRight ? 2.5 : -2.5;

  // Natural radius: cozy village cottage lantern reach from the sky, softly merging with darkness
  const reach = 34;

  ctx.save();
  ctx.translate(sx + frontOffsetX * 0.5, sy + 3.5);
  ctx.scale(1, 0.52);

  const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, reach);

  // Soft, gradual decay that merges seamlessly into the nocturnal darkness:
  // When isCutout = true: gently relieves night darkness (~0.36 max), keeping deep night atmosphere intact
  // When isCutout = false: adds a delicate warm amber breath of light that blends into the blue darkness
  const maxCutout = Math.min(0.38, intens * 0.40);
  const maxWarmth = intens * 0.12;

  if (isCutout) {
    grad.addColorStop(0.00, `rgba(0, 0, 0, ${maxCutout})`);
    grad.addColorStop(0.25, `rgba(0, 0, 0, ${maxCutout * 0.72})`);
    grad.addColorStop(0.55, `rgba(0, 0, 0, ${maxCutout * 0.38})`);
    grad.addColorStop(0.80, `rgba(0, 0, 0, ${maxCutout * 0.12})`);
    grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
  } else {
    grad.addColorStop(0.00, `rgba(255, 205, 95, ${maxWarmth})`);
    grad.addColorStop(0.25, `rgba(250, 170, 60, ${maxWarmth * 0.70})`);
    grad.addColorStop(0.55, `rgba(240, 130, 35, ${maxWarmth * 0.35})`);
    grad.addColorStop(0.80, `rgba(230, 95, 20, ${maxWarmth * 0.10})`);
    grad.addColorStop(1.00, 'rgba(220, 80, 10, 0)');
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, reach, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Real-time Point-Light Shadows cast by trees and entities in proximity of lit houses at night.
 * Rendered in Pass 2 (Ground & Shadows pass) so shadows stretch across the terrain away from glowing windows.
 */
export function drawHouseProximityShadows(ctx, grid, ox, oy, t, nt, light, camRot, visibleTiles, villagers = [], boats = []) {
  if (nt <= 0.05 || !visibleTiles) return;

  // 1. Collect all currently lit houses and their physical architectural occlusion properties
  const litHouses = [];
  for (let i = 0; i < visibleTiles.length; i++) {
    const [x, y] = visibleTiles[i];
    if (at(grid, x, y) === 5 && kind(grid, x, y) === 'house') {
      const houseLight = getHouseLightState(x, y, t, nt, light);
      if (houseLight.intensity > 0.06) {
        const [hsx, hsy] = P(ox, oy, x, y, ht(grid, x, y), camRot);
        const houseTier = getTier(grid, x, y);
        const [bnwX, bnwY] = fromRotated(-1, 0, camRot);
        const [bneX, bneY] = fromRotated(0, -1, camRot);
        const tileNW = at(grid, x + bnwX, y + bnwY);
        const tileNE = at(grid, x + bneX, y + bneY);
        const isRearBlocked = (
          tileNW === 2 || tileNE === 2 || tileNW === 3 || tileNE === 3 || tileNW === 5 || tileNE === 5 ||
          getTier(grid, x + bnwX, y + bnwY) > houseTier || getTier(grid, x + bneX, y + bneY) > houseTier
        );
        litHouses.push({
          x,
          y,
          hsx,
          hsy,
          intens: houseLight.intensity,
          isRearBlocked,
          tier: houseTier
        });
      }
    }
  }

  if (litHouses.length === 0) return;

  // 2. Physical ray-tracing line-of-sight test between light source and entity
  const hasLineOfSight = (x0, y0, x1, y1) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps <= 1) return true;
    for (let s = 1; s < steps; s++) {
      const ix = Math.round(x0 + (dx * s) / steps);
      const iy = Math.round(y0 + (dy * s) / steps);
      if (ix === x1 && iy === y1) break;
      const t = at(grid, ix, iy);
      if (t === 2 || t === 5) return false;
    }
    return true;
  };

  ctx.save();

  // 3. Helper to cast a shape-fitted shadow matching the sun's shadow logic
  const castPointShapeShadow = (baseX, baseY, hw, hh, height, house, gDist, shape) => {
    const sdx = baseX - house.hsx;
    const sdy = baseY - (house.hsy - 3);
    const sDist = Math.hypot(sdx, sdy) || 1;
    const dirX = sdx / sDist;
    const dirY = sdy / sDist;

    const distRatio = Math.min(1.0, gDist / 3.4);
    const falloff = 1 - distRatio;
    const intensityFade = falloff * falloff * (3 - 2 * falloff);
    const sAlpha = Math.min(0.20, intensityFade * house.intens * 0.25);
    if (sAlpha < 0.015) return;

    const lenScale = 0.55 + falloff * 0.35;
    const pLight = {
      dx: dirX * lenScale,
      dy: dirY * lenScale,
      shadowAlpha: sAlpha
    };

    castShadow(ctx, baseX, baseY, hw, hh, height, pLight, shape);
  };

  // 4. Trace light and cast shape-fitting shadows for visible terrain entities
  for (let i = 0; i < visibleTiles.length; i++) {
    const [tx, ty] = visibleTiles[i];
    const tyVal = at(grid, tx, ty);
    if (tyVal === 0) continue; // Water tiles have no casters

    const forest = getForestParams(grid, tx, ty);
    const isMountain = (tyVal === 2);
    const isStructure = (tyVal === 5);

    if (!forest && !isMountain && !isStructure) continue;

    for (let h = 0; h < litHouses.length; h++) {
      const house = litHouses[h];
      if (house.x === tx && house.y === ty) continue; // House cannot cast shadow onto itself

      const gdx = tx - house.x;
      const gdy = ty - house.y;
      const gDist = Math.hypot(gdx, gdy);
      if (gDist < 0.3 || gDist > 3.4) continue;

      // Tier check: higher cliff face blocks low ground lantern light
      if (getTier(grid, tx, ty) > house.tier + 1) continue;

      // House body self-occlusion: if rear of house is blocked, no light reaches behind
      const [rx, ry] = toRotated(tx - house.x, ty - house.y, camRot);
      if (house.isRearBlocked && (rx + ry < 0)) continue;

      // Ray-path obstacle check: intervening buildings/mountains occlude light
      if (!hasLineOfSight(house.x, house.y, tx, ty)) continue;

      const z = ht(grid, tx, ty);
      const [tsx, tsy] = P(ox, oy, tx, ty, z, camRot);

      if (isMountain) {
        const { peakHeight } = getMountainParams(grid, tx, ty);
        castPointShapeShadow(tsx, tsy, W / 2 - 2, H / 2 - 1, peakHeight * 0.75, house, gDist, 'spire');
      } else if (forest) {
        const { feature, hT } = forest;
        if (feature === 'grove3') {
          castPointShapeShadow(tsx - 6, tsy + 1, 6.5, 3.2, 23, house, gDist, 'tree');
          castPointShapeShadow(tsx + 7, tsy + 3, 5.5, 2.8, 18, house, gDist, 'tree');
          castPointShapeShadow(tsx + 1, tsy - 6, 6.0, 3.0, 21, house, gDist, 'tree');
        } else if (feature === 'twin') {
          castPointShapeShadow(tsx - 4, tsy + 2, 7.0, 3.5, 23, house, gDist, 'tree');
          castPointShapeShadow(tsx + 6, tsy - 2, 5.5, 2.8, 16, house, gDist, 'tree');
        } else if (feature === 'stump') {
          const px = tsx + (hT - 0.5) * 8;
          const py = tsy + (hash(ty, tx) - 0.5) * 5;
          castPointShapeShadow(px, py + 1, 4.5, 2.5, 5, house, gDist, 'agent');
        } else if (feature === 'fallen_log') {
          const x0 = tsx - 4 + (hT - 0.5) * 6;
          const y0 = tsy + 2 + (hash(ty, tx) - 0.5) * 4;
          const logDx = (hash(tx * 11, ty * 13) > 0.5 ? 1 : -1) * (28 + hT * 10);
          const logDy = (hash(tx * 7, ty * 19) > 0.5 ? 1 : 0.4) * (14 + hT * 5);
          const x1 = x0 + logDx;
          const y1 = y0 + logDy;

          const sdx = tsx - house.hsx;
          const sdy = tsy - (house.hsy - 3);
          const sDist = Math.hypot(sdx, sdy) || 1;
          const dirX = sdx / sDist;
          const dirY = sdy / sDist;

          const distRatio = Math.min(1.0, gDist / 3.4);
          const falloff = 1 - distRatio;
          const sAlpha = Math.min(0.20, falloff * falloff * (3 - 2 * falloff) * house.intens * 0.25);
          if (sAlpha >= 0.015) {
            const lenScale = 0.55 + falloff * 0.35;
            const top0X = x0 + dirX * lenScale * 4;
            const top0Y = y0 + dirY * lenScale * 4;
            const top1X = x1 + dirX * lenScale * 4;
            const top1Y = y1 + dirY * lenScale * 4;
            poly(ctx, [[x0, y0], [x1, y1], [top1X, top1Y], [top0X, top0Y]], `rgba(14, 12, 32, ${sAlpha * 0.75})`);
          }
        } else {
          // Solitary specimen tree
          const px = tsx + (hT - 0.5) * 4;
          const py = tsy + (hash(tx, ty) - 0.5) * 3;
          castPointShapeShadow(px, py + 1, 8.5, 4.2, 27, house, gDist, 'tree');
        }
      } else if (isStructure) {
        const sdx = tsx - house.hsx;
        const sdy = tsy - (house.hsy - 3);
        const sDist = Math.hypot(sdx, sdy) || 1;
        const dirX = sdx / sDist;
        const dirY = sdy / sDist;
        const distRatio = Math.min(1.0, gDist / 3.4);
        const falloff = 1 - distRatio;
        const sAlpha = Math.min(0.20, falloff * falloff * (3 - 2 * falloff) * house.intens * 0.25);
        if (sAlpha >= 0.015) {
          const lenScale = 0.55 + falloff * 0.35;
          const pLight = {
            dx: dirX * lenScale,
            dy: dirY * lenScale,
            shadowAlpha: sAlpha
          };
          buildingShadow(ctx, grid, ox, oy, tx, ty, t, pLight, camRot);
        }
      }
    }
  }

  // 5. Cast shape-fitting agent shadows for villagers in proximity to lit houses
  if (villagers && villagers.length) {
    for (let vi = 0; vi < villagers.length; vi++) {
      const v = villagers[vi];
      const f = v.p;
      const vx = v.ax + (v.tx - v.ax) * f;
      const vy = v.ay + (v.ty - v.ay) * f;

      for (let h = 0; h < litHouses.length; h++) {
        const house = litHouses[h];
        const gDist = Math.hypot(vx - house.x, vy - house.y);
        if (gDist < 0.25 || gDist > 3.2) continue;

        const [rx, ry] = toRotated(vx - house.x, vy - house.y, camRot);
        if (house.isRearBlocked && (rx + ry < 0)) continue;
        if (!hasLineOfSight(house.x, house.y, Math.round(vx), Math.round(vy))) continue;

        const [px, py0] = P(ox, oy, vx, vy, ht(grid, Math.round(vx), Math.round(vy)), camRot);
        castPointShapeShadow(px, py0 + 1, 1.8, 0.9, 4, house, gDist, 'agent');
      }
    }
  }

  // 6. Cast shape-fitting agent shadows for boats in proximity to lit coastal houses
  if (boats && boats.length) {
    for (let bi = 0; bi < boats.length; bi++) {
      const b = boats[bi];
      const f = b.p;
      const bx = b.ax + (b.tx - b.ax) * f;
      const by = b.ay + (b.ty - b.ay) * f;

      for (let h = 0; h < litHouses.length; h++) {
        const house = litHouses[h];
        const gDist = Math.hypot(bx - house.x, by - house.y);
        if (gDist < 0.25 || gDist > 3.2) continue;

        const [rx, ry] = toRotated(bx - house.x, by - house.y, camRot);
        if (house.isRearBlocked && (rx + ry < 0)) continue;
        if (!hasLineOfSight(house.x, house.y, Math.round(bx), Math.round(by))) continue;

        const [px, py0] = P(ox, oy, bx, by, 0.3, camRot);
        castPointShapeShadow(px, py0 + 1, 6.0, 2.5, 3, house, gDist, 'agent');
      }
    }
  }

  ctx.restore();
}

/**
 * Atmospheric lantern glow & subtle light scattering for night houses & boats.
 * Uses screen composite blending clipped to physical visibility ray-path with ultra-smooth falloff.
 */
export function drawNightHouseBlooms(ctx, grid, ox, oy, t, nt, light, camRot, visibleTiles, boats = []) {
  if (nt <= 0.01) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // 1. Subtle warm ambient air glow around lit houses, matching physical architectural light fields
  if (visibleTiles) {
    for (let i = 0; i < visibleTiles.length; i++) {
      const [x, y] = visibleTiles[i];
      if (at(grid, x, y) !== 5 || kind(grid, x, y) !== 'house') continue;

      const houseLight = getHouseLightState(x, y, t, nt, light);
      if (houseLight.intensity <= 0.05) continue;

      drawHouseArchitecturalLight(ctx, grid, ox, oy, x, y, ht(grid, x, y), camRot, houseLight, false);
    }
  }

  // 2. Boat lantern warm glow on water surface
  if (boats && boats.length) {
    for (let bi = 0; bi < boats.length; bi++) {
      const b = boats[bi];
      if (!b.hasLantern) continue;
      const f = b.p;
      const ex = b.ax + (b.tx - b.ax) * f;
      const ey = b.ay + (b.ty - b.ay) * f;
      const [px, py0] = P(ox, oy, ex, ey, 0.3, camRot);
      const bob = Math.sin(t / 680 + b.ax * 2.8 + b.ay * 1.9) * 1.8;
      const lx = px + 10.5;
      const ly = py0 + bob - 1.5;

      const glow = ctx.createRadialGradient(lx, ly, 1, lx, ly, 16);
      glow.addColorStop(0, `rgba(255, 225, 120, ${0.18 * Math.min(1, nt * 1.2)})`);
      glow.addColorStop(0.45, `rgba(255, 165, 45, ${0.07 * Math.min(1, nt * 1.2)})`);
      glow.addColorStop(1, 'rgba(255, 130, 25, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, ly, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function building(ctx, grid, ox, oy, x, y, t, p, nt, light, camRot = 0) {
  const [sx, sy] = P(ox, oy, x, y, ht(grid, x, y), camRot);
  const k = kind(grid, x, y);
  const defaultWindowColor = nt > 0.3 ? '#ffd36b' : '#8fd0ea';

  if (k === 'house') {
    // Variations in house design, blocks, rotations, colors and chimneys
    const shape = Math.floor(hash(x * 13 + 7, y * 19 + 11) * 3); // 0 = 1-block, 1 = 2-block, 2 = 3-block (L-shape)
    const rot = (Math.floor(hash(x * 29 + 3, y * 37 + 5) * 4) + camRot) % 4; // 0, 1, 2, 3 rotations/facings
    const wallPal = HOUSE_WALL_PALETTES[Math.floor(hash(x * 11 + 5, y * 23 + 9) * HOUSE_WALL_PALETTES.length)];
    const roofTintIdx = Math.floor(hash(x * 31 + 7, y * 17 + 13) * ROOF_TINTS.length);
    const baseRoof = ROOF_TINTS[roofTintIdx] || p.roof;
    const roofCol = p.n === 'Winter' && roofTintIdx !== 0 ? ['#8fa4c2', '#7288a6'] : baseRoof;
    const doorCol = hash(x * 5, y * 9) > 0.5 ? '#7a5238' : '#5c3e2b';
    const hasChimney = hash(x * 17 + 3, y * 23 + 5) > 0.42;

    const houseLight = getHouseLightState(x, y, t, nt, light);
    const windowColor = houseLight.color;

    // Cast illumination on the surrounding ground and doorway threshold
    if (houseLight.intensity > 0.01) {
      drawHouseGroundLight(ctx, sx, sy, houseLight.intensity, rot, shape);
    }

    if (shape === 0) {
      // ----------------- 1-BLOCK HOUSES -----------------
      if (rot === 0) {
        // Facing South-East (door right, window left)
        box(ctx, sx, sy, 10, 9, wallPal, light);
        drawHouseWindow(ctx, [[sx - 7.5, sy - 1.2], [sx - 3.5, sy + 0.8], [sx - 3.5, sy - 3.2], [sx - 7.5, sy - 5.2]], windowColor, houseLight.intensity);
        drawDoorWithLantern(ctx, [[sx + 3, sy + 3.8], [sx + 6.5, sy + 2], [sx + 6.5, sy - 3.5], [sx + 3, sy - 1.8]], doorCol, houseLight.intensity, rot);
        roof(ctx, sx, sy - 9, 12, 9, roofCol, light);
        if (hasChimney) drawChimney(ctx, sx + 5, sy - 14, 2.4, 6.5, t, x, y, nt, light);
      } else if (rot === 1) {
        // Facing South-West (door left, window right)
        box(ctx, sx, sy, 10, 9, wallPal, light);
        drawDoorWithLantern(ctx, [[sx - 6.5, sy + 2], [sx - 3, sy + 3.8], [sx - 3, sy - 1.8], [sx - 6.5, sy - 3.5]], doorCol, houseLight.intensity, rot);
        drawHouseWindow(ctx, [[sx + 3.5, sy + 0.8], [sx + 7.5, sy - 1.2], [sx + 7.5, sy - 5.2], [sx + 3.5, sy - 3.2]], windowColor, houseLight.intensity);
        roof(ctx, sx, sy - 9, 12, 9, roofCol, light);
        if (hasChimney) drawChimney(ctx, sx - 5, sy - 14, 2.4, 6.5, t, x, y, nt, light);
      } else if (rot === 2) {
        // Tall 2-Story Townhouse
        box(ctx, sx, sy, 9, 15, wallPal, light);
        drawDoorWithLantern(ctx, [[sx + 2.5, sy + 3.8], [sx + 6, sy + 2], [sx + 6, sy - 3.5], [sx + 2.5, sy - 1.8]], doorCol, houseLight.intensity, rot);
        drawHouseWindow(ctx, [[sx - 6.5, sy - 1], [sx - 3, sy + 0.8], [sx - 3, sy - 3], [sx - 6.5, sy - 4.8]], windowColor, houseLight.intensity);
        drawHouseWindow(ctx, [[sx - 6.5, sy - 7.5], [sx - 3, sy - 5.8], [sx - 3, sy - 9.5], [sx - 6.5, sy - 11.2]], windowColor, houseLight.intensity);
        drawHouseWindow(ctx, [[sx + 2.5, sy - 5.8], [sx + 6, sy - 7.5], [sx + 6, sy - 11.2], [sx + 2.5, sy - 9.5]], windowColor, houseLight.intensity);
        roof(ctx, sx, sy - 15, 10.5, 11, roofCol, light);
        if (hasChimney) drawChimney(ctx, sx + 4, sy - 21, 2.3, 6, t, x, y, nt, light);
      } else {
        // Compact Rustic Cottage with broad roof
        box(ctx, sx, sy, 11, 7.5, wallPal, light);
        drawDoorWithLantern(ctx, [[sx - 4, sy + 3.2], [sx - 0.5, sy + 4.8], [sx - 0.5, sy - 0.2], [sx - 4, sy - 1.8]], doorCol, houseLight.intensity, rot);
        drawHouseWindow(ctx, [[sx + 3, sy + 2], [sx + 6.5, sy + 0.2], [sx + 6.5, sy - 3.8], [sx + 3, sy - 2]], windowColor, houseLight.intensity);
        roof(ctx, sx, sy - 7.5, 13, 7.5, roofCol, light);
        if (hasChimney) drawChimney(ctx, sx - 4, sy - 12, 2.4, 6, t, x, y, nt, light);
      }
    } else if (shape === 1) {
      // ----------------- 2-BLOCK HOUSES (Extended Wing / Dual Section) -----------------
      if (rot === 0) {
        // Main hall right + lower side workshop left
        box(ctx, sx - 6, sy - 3, 6, 7, wallPal, light);
        roof(ctx, sx - 6, sy - 10, 7.5, 5, roofCol, light);
        drawHouseWindow(ctx, [[sx - 9, sy - 4.5], [sx - 6.5, sy - 3.2], [sx - 6.5, sy - 6.5], [sx - 9, sy - 7.8]], windowColor, houseLight.intensity);

        box(ctx, sx + 4, sy + 2, 8, 11, wallPal, light);
        roof(ctx, sx + 4, sy - 9, 9.5, 8.5, roofCol, light);
        drawDoorWithLantern(ctx, [[sx + 5.5, sy + 5], [sx + 8.5, sy + 3.5], [sx + 8.5, sy - 2], [sx + 5.5, sy - 0.5]], doorCol, houseLight.intensity, rot);
        drawHouseWindow(ctx, [[sx + 1, sy + 1.5], [sx + 3.5, sy + 2.8], [sx + 3.5, sy - 1], [sx + 1, sy - 2.2]], windowColor, houseLight.intensity);
        if (hasChimney) drawChimney(ctx, sx + 6, sy - 14, 2.3, 6.5, t, x, y, nt, light);
      } else if (rot === 1) {
        // Main hall left + side wing right
        box(ctx, sx + 6, sy - 3, 6, 7, wallPal, light);
        roof(ctx, sx + 6, sy - 10, 7.5, 5, roofCol, light);
        drawHouseWindow(ctx, [[sx + 6.5, sy - 3.2], [sx + 9, sy - 4.5], [sx + 9, sy - 7.8], [sx + 6.5, sy - 6.5]], windowColor, houseLight.intensity);

        box(ctx, sx - 4, sy + 2, 8, 11, wallPal, light);
        roof(ctx, sx - 4, sy - 9, 9.5, 8.5, roofCol, light);
        drawDoorWithLantern(ctx, [[sx - 8.5, sy + 3.5], [sx - 5.5, sy + 5], [sx - 5.5, sy - 0.5], [sx - 8.5, sy - 2]], doorCol, houseLight.intensity, rot);
        drawHouseWindow(ctx, [[sx - 3.5, sy + 2.8], [sx - 1, sy + 1.5], [sx - 1, sy - 2.2], [sx - 3.5, sy - 1]], windowColor, houseLight.intensity);
        if (hasChimney) drawChimney(ctx, sx - 6, sy - 14, 2.3, 6.5, t, x, y, nt, light);
      } else if (rot === 2) {
        // Main body + front projecting gabled porch
        box(ctx, sx, sy - 2.5, 10, 11, wallPal, light);
        roof(ctx, sx, sy - 13.5, 11.5, 8.5, roofCol, light);
        drawHouseWindow(ctx, [[sx - 7.5, sy - 3], [sx - 3.5, sy - 1], [sx - 3.5, sy - 5], [sx - 7.5, sy - 7]], windowColor, houseLight.intensity);

        box(ctx, sx + 3.5, sy + 4.5, 5, 6, wallPal, light);
        roof(ctx, sx + 3.5, sy - 1.5, 6, 4.5, roofCol, light);
        drawDoorWithLantern(ctx, [[sx + 4.5, sy + 6.5], [sx + 7, sy + 5.2], [sx + 7, sy + 0.8], [sx + 4.5, sy + 2]], doorCol, houseLight.intensity, rot);
        if (hasChimney) drawChimney(ctx, sx - 5, sy - 17, 2.4, 6.5, t, x, y, nt, light);
      } else {
        // Stepped twin cottages (left low, right tall)
        box(ctx, sx - 5, sy - 1, 6.5, 8.5, wallPal, light);
        roof(ctx, sx - 5, sy - 9.5, 7.5, 6.5, roofCol, light);
        drawHouseWindow(ctx, [[sx - 8.5, sy - 2], [sx - 5.5, sy - 0.5], [sx - 5.5, sy - 4.5], [sx - 8.5, sy - 6]], windowColor, houseLight.intensity);

        box(ctx, sx + 4.5, sy + 1.5, 7.5, 12, wallPal, light);
        roof(ctx, sx + 4.5, sy - 10.5, 8.5, 8, roofCol, light);
        drawDoorWithLantern(ctx, [[sx + 5.5, sy + 4.5], [sx + 8.5, sy + 3], [sx + 8.5, sy - 2.5], [sx + 5.5, sy - 1]], doorCol, houseLight.intensity, rot);
        drawHouseWindow(ctx, [[sx + 2, sy + 1], [sx + 4, sy + 2], [sx + 4, sy - 2], [sx + 2, sy - 3]], windowColor, houseLight.intensity);
        if (hasChimney) drawChimney(ctx, sx + 6, sy - 16, 2.3, 6, t, x, y, nt, light);
      }
    } else {
      // ----------------- 3-BLOCK HOUSES (L-Shaped Manors & Courtyard Estates) -----------------
      if (rot === 0) {
        // L-shaped manor (corner rear-right, wings extending forward and left)
        box(ctx, sx + 2, sy - 4, 7.5, 12, wallPal, light);
        roof(ctx, sx + 2, sy - 16, 8.5, 7.5, roofCol, light);

        box(ctx, sx - 6.5, sy - 2, 6, 8, wallPal, light);
        roof(ctx, sx - 6.5, sy - 10, 7, 6, roofCol, light);
        drawHouseWindow(ctx, [[sx - 9.5, sy - 3.5], [sx - 7, sy - 2.2], [sx - 7, sy - 6.2], [sx - 9.5, sy - 7.5]], windowColor, houseLight.intensity);

        box(ctx, sx + 5, sy + 3.5, 6, 8.5, wallPal, light);
        roof(ctx, sx + 5, sy - 5, 7, 6, roofCol, light);
        drawDoorWithLantern(ctx, [[sx + 6, sy + 5.5], [sx + 8.5, sy + 4.2], [sx + 8.5, sy - 0.5], [sx + 6, sy + 0.8]], doorCol, houseLight.intensity, rot);
        drawHouseWindow(ctx, [[sx + 2, sy + 2], [sx + 4.5, sy + 3.2], [sx + 4.5, sy - 0.8], [sx + 2, sy - 2]], windowColor, houseLight.intensity);
        if (hasChimney) drawChimney(ctx, sx + 3.5, sy - 19, 2.3, 6.5, t, x, y, nt, light);
      } else if (rot === 1) {
        // L-shaped manor (corner rear-left, wings extending forward and right)
        box(ctx, sx - 2, sy - 4, 7.5, 12, wallPal, light);
        roof(ctx, sx - 2, sy - 16, 8.5, 7.5, roofCol, light);

        box(ctx, sx + 6.5, sy - 2, 6, 8, wallPal, light);
        roof(ctx, sx + 6.5, sy - 10, 7, 6, roofCol, light);
        drawHouseWindow(ctx, [[sx + 7, sy - 2.2], [sx + 9.5, sy - 3.5], [sx + 9.5, sy - 7.5], [sx + 7, sy - 6.2]], windowColor, houseLight.intensity);

        box(ctx, sx - 5, sy + 3.5, 6, 8.5, wallPal, light);
        roof(ctx, sx - 5, sy - 5, 7, 6, roofCol, light);
        drawDoorWithLantern(ctx, [[sx - 8.5, sy + 4.2], [sx - 6, sy + 5.5], [sx - 6, sy + 0.8], [sx - 8.5, sy - 0.5]], doorCol, houseLight.intensity, rot);
        drawHouseWindow(ctx, [[sx - 4.5, sy + 3.2], [sx - 2, sy + 2], [sx - 2, sy - 2], [sx - 4.5, sy - 0.8]], windowColor, houseLight.intensity);
        if (hasChimney) drawChimney(ctx, sx - 3.5, sy - 19, 2.3, 6.5, t, x, y, nt, light);
      } else if (rot === 2) {
        // T-shaped / Cross-Wing Manor
        box(ctx, sx - 7, sy - 2, 5.5, 7.5, wallPal, light);
        roof(ctx, sx - 7, sy - 9.5, 6.5, 5.5, roofCol, light);
        drawHouseWindow(ctx, [[sx - 9.5, sy - 3.2], [sx - 7.5, sy - 2.2], [sx - 7.5, sy - 5.5], [sx - 9.5, sy - 6.5]], windowColor, houseLight.intensity);

        box(ctx, sx + 7, sy - 2, 5.5, 7.5, wallPal, light);
        roof(ctx, sx + 7, sy - 9.5, 6.5, 5.5, roofCol, light);
        drawHouseWindow(ctx, [[sx + 7.5, sy - 2.2], [sx + 9.5, sy - 3.2], [sx + 9.5, sy - 6.5], [sx + 7.5, sy - 5.5]], windowColor, houseLight.intensity);

        box(ctx, sx, sy + 1, 8, 14, wallPal, light);
        roof(ctx, sx, sy - 13, 9.5, 9, roofCol, light);
        drawDoorWithLantern(ctx, [[sx + 2, sy + 4.5], [sx + 5.5, sy + 2.8], [sx + 5.5, sy - 2.5], [sx + 2, sy - 0.8]], doorCol, houseLight.intensity, rot);
        drawHouseWindow(ctx, [[sx - 5.5, sy - 0.5], [sx - 2, sy + 1.2], [sx - 2, sy - 2.8], [sx - 5.5, sy - 4.5]], windowColor, houseLight.intensity);
        drawHouseWindow(ctx, [[sx - 5.5, sy - 6.5], [sx - 2, sy - 4.8], [sx - 2, sy - 8.8], [sx - 5.5, sy - 10.5]], windowColor, houseLight.intensity);
        if (hasChimney) drawChimney(ctx, sx + 4, sy - 18, 2.3, 6.5, t, x, y, nt, light);
      } else {
        // L-shaped Courtyard with Porch Wing
        box(ctx, sx + 4, sy - 3, 6.5, 9, wallPal, light);
        roof(ctx, sx + 4, sy - 12, 7.5, 6.5, roofCol, light);

        box(ctx, sx - 4, sy - 0.5, 7.5, 11, wallPal, light);
        roof(ctx, sx - 4, sy - 11.5, 8.5, 8, roofCol, light);
        drawHouseWindow(ctx, [[sx - 8, sy + 1.5], [sx - 5, sy + 3], [sx - 5, sy - 2.5], [sx - 8, sy - 4]], windowColor, houseLight.intensity);

        box(ctx, sx - 1, sy + 4.5, 5.5, 6.5, wallPal, light);
        roof(ctx, sx - 1, sy - 2, 6.5, 5, roofCol, light);
        drawDoorWithLantern(ctx, [[sx + 0.5, sy + 6.5], [sx + 3, sy + 5.2], [sx + 3, sy + 0.8], [sx + 0.5, sy + 2]], doorCol, houseLight.intensity, rot);
        if (hasChimney) drawChimney(ctx, sx - 5, sy - 16, 2.3, 6.5, t, x, y, nt, light);
      }
    }
  } else if (k === 'church') {
    box(ctx, sx, sy, 10, 13, WALL, light);
    roof(ctx, sx, sy - 13, 11, 8, p.roof, light);
    box(ctx, sx, sy - 13, 5, 10, WALL, light);
    roof(ctx, sx, sy - 23, 6, 14, p.roof, light);
    poly(ctx, [[sx + 3, sy + 3.5], [sx + 7, sy + 1.5], [sx + 7, sy - 5.5], [sx + 3, sy - 3.5]], '#6b4a32');
    poly(ctx, [[sx - 7, sy - 2], [sx - 3, sy], [sx - 3, sy - 7], [sx - 7, sy - 9]], windowColor);
    ctx.strokeStyle = '#f2d36b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 37);
    ctx.lineTo(sx, sy - 45);
    ctx.moveTo(sx - 3, sy - 41);
    ctx.lineTo(sx + 3, sy - 41);
    ctx.stroke();
  } else if (k === 'mill') {
    box(ctx, sx, sy, 9, 14, WALL, light);
    poly(ctx, [[sx + 2, sy + 4], [sx + 6, sy + 2], [sx + 6, sy - 3], [sx + 2, sy - 1]], '#7a5238');
    roof(ctx, sx, sy - 14, 10, 7, p.roof, light);
    const a = t / 700;
    const hx = sx;
    const hy = sy - 17;
    ctx.strokeStyle = '#fff8e8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const b = a + (i * Math.PI) / 2;
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + Math.cos(b) * 15, hy + Math.sin(b) * 15 * 0.8);
    }
    ctx.stroke();
    ctx.fillStyle = '#7a5238';
    ctx.beginPath();
    ctx.arc(hx, hy, 2.5, 0, 7);
    ctx.fill();
  } else {
    // Castle
    box(ctx, sx, sy, 15, 16, WALL, light);
    poly(ctx, [[sx + 2, sy + 6.5], [sx + 6, sy + 4.5], [sx + 6, sy - 4.5], [sx + 2, sy - 2.5]], '#5a3b28');
    poly(ctx, [[sx - 6, sy - 1.5], [sx - 2, sy + 0.5], [sx - 2, sy - 5.5], [sx - 6, sy - 7.5]], windowColor);
    box(ctx, sx, sy - 16, 8, 10, WALL, light);
    roof(ctx, sx, sy - 26, 9, 14, p.roof, light);
    box(ctx, sx - 14, sy + 4, 6, 22, WALL, light);
    roof(ctx, sx - 14, sy - 18 + 4, 7, 13, p.roof, light);
    box(ctx, sx + 14, sy + 4, 6, 22, WALL, light);
    roof(ctx, sx + 14, sy - 18 + 4, 7, 13, p.roof, light);
    ctx.strokeStyle = '#8a3524';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 40);
    ctx.lineTo(sx, sy - 50);
    ctx.stroke();
    poly(ctx, [[sx, sy - 50], [sx + 8, sy - 47], [sx, sy - 44]], '#e5484d');
  }
}

export function getTerrainCorners(grid, ox, oy, x, y) {
  const getZ = (gx, gy) => {
    const t = at(grid, gx, gy);
    if (t === 0) return 0.55; // waterline reference
    if (t === 6) return 1.0 + getTier(grid, gx, gy) * 0.75;
    return 1.0 + getTier(grid, gx, gy) * 0.75;
  };

  const zC = getZ(x, y);

  // 4 corner heights shared with adjacent tiles for seamless C0 continuity
  const zT = (zC + getZ(x, y - 1) + getZ(x - 1, y) + getZ(x - 1, y - 1)) / 4;
  const zR = (zC + getZ(x + 1, y) + getZ(x, y - 1) + getZ(x + 1, y - 1)) / 4;
  const zB = (zC + getZ(x + 1, y) + getZ(x, y + 1) + getZ(x + 1, y + 1)) / 4;
  const zL = (zC + getZ(x - 1, y) + getZ(x, y + 1) + getZ(x - 1, y + 1)) / 4;

  const sx0 = ox + (x - y) * (W / 2);
  const sy0 = oy + (x + y) * (H / 2);

  const pTop = [sx0, sy0 - H / 2 - zT * U];
  const pRight = [sx0 + W / 2, sy0 - zR * U];
  const pBottom = [sx0, sy0 + H / 2 - zB * U];
  const pLeft = [sx0 - W / 2, sy0 - zL * U];

  return { pTop, pRight, pBottom, pLeft, zC, zT, zR, zB, zL, sx0, sy0 };
}

export function dpath(ctx, V, fl, dy = 0) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const v = V[i];
    const a = V[(i + 3) % 4];
    const b = V[(i + 1) % 4];
    if (fl[i]) {
      const k = 0.4;
      const p1 = [v[0] + (a[0] - v[0]) * k, v[1] + (a[1] - v[1]) * k + dy];
      const p2 = [v[0] + (b[0] - v[0]) * k, v[1] + (b[1] - v[1]) * k + dy];
      i ? ctx.lineTo(p1[0], p1[1]) : ctx.moveTo(p1[0], p1[1]);
      ctx.quadraticCurveTo(v[0], v[1] + dy, p2[0], p2[1]);
    } else {
      i ? ctx.lineTo(v[0], v[1] + dy) : ctx.moveTo(v[0], v[1] + dy);
    }
  }
  ctx.closePath();
}

export function rprism(ctx, grid, ox, oy, x, y, z, c, light = null, rot = 0) {
  const curType = at(grid, x, y);
  const ld = (a, b) => {
    const [rx, ry] = fromRotated(a, b, rot);
    const t = at(grid, x + rx, y + ry);
    if (curType === 6) {
      return t !== 0; // Water cliff walls only against open ocean
    }
    return t !== 0 && t !== 6; // Land forms curves against both ocean and water
  };
  const fl = [
    !ld(-1, 0) && !ld(0, -1) && !ld(-1, -1),
    !ld(0, -1) && !ld(1, 0) && !ld(1, -1),
    !ld(1, 0) && !ld(0, 1) && !ld(1, 1),
    !ld(0, 1) && !ld(-1, 0) && !ld(-1, 1)
  ];
  if (!fl.some(Boolean)) return prism(ctx, ox, oy, x, y, z, c, light, rot);
  const [sx, sy] = P(ox, oy, x, y, z, rot);
  const h = z * U;
  const V = [
    [sx, sy - H / 2],
    [sx + W / 2, sy],
    [sx, sy + H / 2],
    [sx - W / 2, sy]
  ];
  const gd = ctx.createLinearGradient(sx - 0.5, 0, sx + 0.5, 0);
  gd.addColorStop(0, c[1]);
  gd.addColorStop(1, c[2]);
  ctx.fillStyle = gd;
  for (let d = h; d >= 1; d -= 2) {
    dpath(ctx, V, fl, d);
    ctx.fill();
  }
  dpath(ctx, V, fl, 0);
  ctx.fillStyle = c[0];
  ctx.fill();
}

export const renderCurvedTerrain = (ctx, grid, ox, oy, x, y, c, light = null, rot = 0) => {
  const z = ht(grid, x, y);
  return rprism(ctx, grid, ox, oy, x, y, z, c, light, rot);
};

export function getAtmosphericFogColor(t, p, nt = 0, light = null) {
  // Continuous celestial cycle parameter (5-minute full revolution)
  const cycle = light ? light.cycle : (t / DAY_CYCLE_MS) * Math.PI * 2;
  const alt = light ? light.alt : Math.sin(cycle);

  // 1. Smooth Sunset weight (continuous bell curve over sunset transition)
  const isDescending = Math.cos(cycle) < 0;
  let sunsetWeight = 0;
  if (p && p.id === 3) {
    sunsetWeight = 1.0;
  } else if (isDescending && alt > -0.15 && alt < 0.35) {
    const norm = (0.35 - alt) / 0.50;
    sunsetWeight = Math.sin(norm * Math.PI);
  }

  // 2. Smooth Sunrise/Dawn weight (continuous bell curve over dawn transition)
  const isAscending = Math.cos(cycle) > 0;
  let dawnWeight = 0;
  if (isAscending && alt > -0.15 && alt < 0.28) {
    const norm = (alt + 0.15) / 0.43;
    dawnWeight = Math.sin(norm * Math.PI) * 0.7;
  }

  // 3. Smooth Night weight (continuous transition as altitude drops negative)
  const nightWeight = Math.max(0, Math.min(1, (-alt + 0.05) / 0.65));

  // 4. Winter palette weight
  const winterWeight = p && p.id === 2 ? 1.0 : 0.0;

  // Daytime base: soft cerulean sea mist
  let r = 212, g = 238, b = 250;

  // Smooth winter tint
  if (winterWeight > 0) {
    r = r * (1 - winterWeight) + 230 * winterWeight;
    g = g * (1 - winterWeight) + 244 * winterWeight;
    b = b * (1 - winterWeight) + 255 * winterWeight;
  }

  // Smooth sunset transition (warm golden-peach coral)
  if (sunsetWeight > 0) {
    r = r * (1 - sunsetWeight) + 255 * sunsetWeight;
    g = g * (1 - sunsetWeight) + 192 * sunsetWeight;
    b = b * (1 - sunsetWeight) + 155 * sunsetWeight;
  }

  // Smooth dawn transition (rosy amber morning twilight)
  if (dawnWeight > 0) {
    r = r * (1 - dawnWeight) + 255 * dawnWeight;
    g = g * (1 - dawnWeight) + 208 * dawnWeight;
    b = b * (1 - dawnWeight) + 218 * dawnWeight;
  }

  // Smooth night transition (deep moonlit oceanic night)
  if (nightWeight > 0) {
    r = r * (1 - nightWeight) + 6 * nightWeight;
    g = g * (1 - nightWeight) + 10 * nightWeight;
    b = b * (1 - nightWeight) + 30 * nightWeight;
  }

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    sunsetWeight,
    dawnWeight,
    nightWeight,
    winterWeight
  };
}

export function getRegionFogFactor(sy, oy) {
  // Northern region depth: distance north of the island baseline
  // Invariant to camera panning/zooming because sy and oy translate identically
  const depthPx = oy - sy;
  if (depthPx <= 20) return 0;
  const progress = Math.min(1, (depthPx - 20) / 420);
  // Smoothstep interpolation (3p^2 - 2p^3)
  return progress * progress * (3 - 2 * progress);
}

export function tileGround(ctx, grid, ox, oy, x, y, t, p, seasonId, light = null, rot = 0) {
  const ty = at(grid, x, y);
  const z = ht(grid, x, y);
  const [sx, sy] = P(ox, oy, x, y, z, rot);
  const G = p.g;
  const ntVal = light ? (light.nt || 0) : 0;
  const fogFactor = getRegionFogFactor(sy, oy);
  const fogCol = getAtmosphericFogColor(t, p, ntVal, light);
  const mix = (c1, c2, f) => Math.round(c1 * (1 - f) + c2 * f);
  const fTint = fogFactor * 0.85;

  if (ty === 0 || ty === 6) {
    const isPlacedWater = ty === 6;
    const isOcean = ty === 0;
    const dp = isOcean && cnt(grid, x, y, 0, true) === 8;
    if (dp) return;
    const n = 8 - countWaterNeighbors(grid, x, y, true);
    const isSunsetSeason = p.id === 3;
    const sunsetWeight = Math.max(isSunsetSeason ? 1.0 : 0, fogCol.sunsetWeight || 0);
    const isSunset = sunsetWeight > 0.08;
    const isWinter = p.id === 2;
    const foamExt = (1 - fogFactor * 0.82);

    const V = [
      [sx, sy - H / 2],
      [sx + W / 2, sy],
      [sx, sy + H / 2],
      [sx - W / 2, sy]
    ];

    // 1. Water Surface Fill (for placed water or elevated/inland channels)
    if (isPlacedWater) {
      const curTier = getTier(grid, x, y);
      const ld = (a, b) => {
        const [rx, ry] = fromRotated(a, b, rot);
        const nt = at(grid, x + rx, y + ry);
        if (nt === 6) {
          return getTier(grid, x + rx, y + ry) === curTier;
        }
        return nt > 0;
      };
      const fl = [
        !ld(-1, 0) && !ld(0, -1) && !ld(-1, -1),
        !ld(0, -1) && !ld(1, 0) && !ld(1, -1),
        !ld(1, 0) && !ld(0, 1) && !ld(1, 1),
        !ld(0, 1) && !ld(-1, 0) && !ld(-1, 1)
      ];

      dpath(ctx, V, fl, 0);
      const grad = ctx.createLinearGradient(sx, sy - H / 2, sx, sy + H / 2);
      if (isSunset) {
        grad.addColorStop(0, `rgba(${mix(mix(75, 255, sunsetWeight * 0.65), fogCol.r, fTint)}, ${mix(mix(190, 160, sunsetWeight * 0.5), fogCol.g, fTint)}, ${mix(mix(210, 140, sunsetWeight * 0.6), fogCol.b, fTint)}, 0.94)`);
        grad.addColorStop(1, `rgba(${mix(mix(45, 230, sunsetWeight * 0.7), fogCol.r, fTint)}, ${mix(mix(150, 120, sunsetWeight * 0.6), fogCol.g, fTint)}, ${mix(mix(180, 100, sunsetWeight * 0.65), fogCol.b, fTint)}, 0.97)`);
      } else if (isWinter) {
        grad.addColorStop(0, `rgba(${mix(130, fogCol.r, fTint)}, ${mix(195, fogCol.g, fTint)}, ${mix(230, fogCol.b, fTint)}, 0.94)`);
        grad.addColorStop(1, `rgba(${mix(90, fogCol.r, fTint)}, ${mix(155, fogCol.g, fTint)}, ${mix(200, fogCol.b, fTint)}, 0.97)`);
      } else {
        grad.addColorStop(0, `rgba(${mix(70, fogCol.r, fTint)}, ${mix(200, fogCol.g, fTint)}, ${mix(220, fogCol.b, fTint)}, 0.94)`);
        grad.addColorStop(1, `rgba(${mix(40, fogCol.r, fTint)}, ${mix(150, fogCol.g, fTint)}, ${mix(180, fogCol.b, fTint)}, 0.97)`);
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // Smooth hairline antialiasing to guarantee seamless joins between adjacent water tiles
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // 2. Lush Shallow-Water Turquoise Glow / Lagoon Shelf (Naturally attenuated & tinted in regional fog)
    const rad = ctx.createRadialGradient(sx, sy, 2, sx, sy, W * 0.65);
    const alphaBase = Math.min(0.32, 0.045 * Math.max(1, n)) * (1 - ntVal * 0.6) * (1 - fogFactor * 0.88);
    if (isSunset) {
      rad.addColorStop(0, `rgba(${mix(mix(75, 255, sunsetWeight * 0.65), fogCol.r, fTint)}, ${mix(mix(225, 185, sunsetWeight * 0.55), fogCol.g, fTint)}, ${mix(mix(215, 140, sunsetWeight * 0.65), fogCol.b, fTint)}, ${alphaBase * (1 + sunsetWeight * 0.15)})`);
      rad.addColorStop(0.5, `rgba(${mix(mix(50, 230, sunsetWeight * 0.6), fogCol.r, fTint)}, ${mix(mix(185, 145, sunsetWeight * 0.5), fogCol.g, fTint)}, ${mix(mix(205, 155, sunsetWeight * 0.5), fogCol.b, fTint)}, ${alphaBase * 0.75})`);
      rad.addColorStop(0.85, `rgba(${mix(mix(30, 250, sunsetWeight * 0.8), fogCol.r, fTint)}, ${mix(mix(160, 125, sunsetWeight * 0.6), fogCol.g, fTint)}, ${mix(mix(180, 85, sunsetWeight * 0.7), fogCol.b, fTint)}, ${alphaBase * 0.28})`);
    } else if (isWinter) {
      rad.addColorStop(0, `rgba(${mix(145, fogCol.r, fTint)}, ${mix(230, fogCol.g, fTint)}, ${mix(255, fogCol.b, fTint)}, ${alphaBase * 1.05})`);
      rad.addColorStop(0.5, `rgba(${mix(100, fogCol.r, fTint)}, ${mix(195, fogCol.g, fTint)}, ${mix(240, fogCol.b, fTint)}, ${alphaBase * 0.65})`);
    } else {
      rad.addColorStop(0, `rgba(${mix(75, fogCol.r, fTint)}, ${mix(245, fogCol.g, fTint)}, ${mix(230, fogCol.b, fTint)}, ${alphaBase * 1.15})`);
      rad.addColorStop(0.55, `rgba(${mix(45, fogCol.r, fTint)}, ${mix(205, fogCol.g, fTint)}, ${mix(215, fogCol.b, fTint)}, ${alphaBase * 0.7})`);
    }
    rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, W * 0.65, H * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Animated Refractive Caustics Networks in Shallow / Placed Waters
    if (n >= 1 || isPlacedWater) {
      const cp = t / 850 + (x * 1.4 + y * 1.9);
      const c1x = Math.sin(cp) * 4;
      const c1y = Math.cos(cp * 1.1) * 2.2;
      const cAlpha = (0.16 + 0.10 * Math.sin(cp * 1.6)) * (1 - ntVal * 0.75) * (1 - fogFactor * 0.90);

      ctx.strokeStyle = isSunset 
        ? `rgba(${mix(255, fogCol.r, fTint)}, ${mix(mix(240, 210, sunsetWeight), fogCol.g, fTint)}, ${mix(mix(200, 140, sunsetWeight), fogCol.b, fTint)}, ${cAlpha * (1 + sunsetWeight * 0.25)})` 
        : `rgba(${mix(180, fogCol.r, fTint)}, ${mix(255, fogCol.g, fTint)}, ${mix(245, fogCol.b, fTint)}, ${cAlpha})`;
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.moveTo(sx - 10 + c1x, sy - 2 + c1y * 0.5);
      ctx.quadraticCurveTo(sx + c1y, sy + 3 + c1x * 0.5, sx + 9 - c1x, sy - 1 - c1y * 0.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(sx + c1y * 0.8, sy + c1x * 0.4, 5.5 + Math.sin(cp) * 1.8, 2.8 + Math.sin(cp) * 0.9, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Dynamic Breathing Shore Surf along Land Edges (Surge & Receding Foam)
    const EDGES = [
      { rx: -1, ry: 0, pA: [sx, sy - H / 2], pB: [sx - W / 2, sy] },
      { rx: 0, ry: -1, pA: [sx, sy - H / 2], pB: [sx + W / 2, sy] },
      { rx: 1, ry: 0, pA: [sx + W / 2, sy], pB: [sx, sy + H / 2] },
      { rx: 0, ry: 1, pA: [sx - W / 2, sy], pB: [sx, sy + H / 2] }
    ];

    for (let ei = 0; ei < 4; ei++) {
      const edge = EDGES[ei];
      const [nx, ny] = fromRotated(edge.rx, edge.ry, rot);
      const nbrType = at(grid, x + nx, y + ny);
      if (nbrType <= 0 || nbrType === 6) continue;

      const pA = edge.pA;
      const pB = edge.pB;
      const midX = (pA[0] + pB[0]) / 2;
      const midY = (pA[1] + pB[1]) / 2;
      const dirX = midX - sx;
      const dirY = midY - sy;
      const len = Math.hypot(dirX, dirY) || 1;
      const normX = dirX / len;
      const normY = dirY / len;

      // Breathing tidal cycle: in-and-out rhythm
      const surfCycle = ((t / 1250 + (x * 0.67 + y * 0.83 + ei * 0.2)) % 1 + 1) % 1;
      const surge = Math.sin(surfCycle * Math.PI); // 0 -> 1 -> 0
      const isReceding = surfCycle > 0.48;

      // Wave apex pushes up towards the shore edge
      const push = surge * 3.6;
      const apexX = midX + normX * push;
      const apexY = midY + normY * push;

      // Layer A: Wide translucent wash underlay
      ctx.beginPath();
      ctx.moveTo(pA[0], pA[1]);
      ctx.quadraticCurveTo(apexX, apexY, pB[0], pB[1]);
      ctx.strokeStyle = `rgba(${mix(255, fogCol.r, fTint)}, ${mix(255, fogCol.g, fTint)}, ${mix(255, fogCol.b, fTint)}, ${(0.20 + 0.12 * surge) * foamExt})`;
      ctx.lineWidth = 4.8 + surge * 2.2;
      ctx.stroke();

      // Layer B: Crisp bright surging surf crest
      ctx.beginPath();
      ctx.moveTo(pA[0], pA[1]);
      ctx.quadraticCurveTo(apexX, apexY, pB[0], pB[1]);
      const bAlpha = (0.72 + 0.25 * surge - ntVal * 0.3) * foamExt;
      ctx.strokeStyle = isSunset 
        ? `rgba(${mix(255, fogCol.r, fTint)}, ${mix(mix(255, 235, sunsetWeight), fogCol.g, fTint)}, ${mix(mix(255, 185, sunsetWeight), fogCol.b, fTint)}, ${bAlpha})`
        : `rgba(${mix(255, fogCol.r, fTint)}, ${mix(255, fogCol.g, fTint)}, ${mix(255, fogCol.b, fTint)}, ${bAlpha})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Layer C: Receding lacy foam backwash ribbon
      if (isReceding) {
        const recedeProgress = (surfCycle - 0.48) / 0.52; // 0 to 1
        const backwashDist = push - recedeProgress * 5.2; // recedes back
        const backwashAlpha = (1 - recedeProgress) * 0.48 * (1 - ntVal * 0.5) * foamExt;
        const bApexX = midX + normX * backwashDist;
        const bApexY = midY + normY * backwashDist;

        ctx.save();
        ctx.setLineDash([3, 2.5]);
        ctx.beginPath();
        ctx.moveTo(pA[0] + normX * backwashDist * 0.35, pA[1] + normY * backwashDist * 0.35);
        ctx.quadraticCurveTo(bApexX, bApexY, pB[0] + normX * backwashDist * 0.35, pB[1] + normY * backwashDist * 0.35);
        ctx.strokeStyle = `rgba(${mix(255, fogCol.r, fTint)}, ${mix(255, fogCol.g, fTint)}, ${mix(255, fogCol.b, fTint)}, ${backwashAlpha})`;
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.restore();
      }

      // Layer D: Delicate seafoam micro-bubbles on shore edge
      ctx.fillStyle = `rgba(${mix(255, fogCol.r, fTint)}, ${mix(255, fogCol.g, fTint)}, ${mix(255, fogCol.b, fTint)}, ${(0.35 + 0.35 * surge) * foamExt})`;
      ctx.beginPath();
      ctx.arc(midX + normX * (push * 0.4) - 3.5, midY + normY * (push * 0.4), 1.2, 0, Math.PI * 2);
      ctx.arc(midX + normX * (push * 0.4) + 3.5, midY + normY * (push * 0.4), 1.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Inward cove curved fillets in corners where two land tiles meet around water
    const S = sandC(seasonId);
    const PR = [
      [[-1, 0], [0, -1]],
      [[0, -1], [1, 0]],
      [[1, 0], [0, 1]],
      [[0, 1], [-1, 0]]
    ];

    for (let i = 0; i < 4; i++) {
      const pr = PR[i];
      const [r1x, r1y] = fromRotated(pr[0][0], pr[0][1], rot);
      const [r2x, r2y] = fromRotated(pr[1][0], pr[1][1], rot);
      const t1 = at(grid, x + r1x, y + r1y);
      const t2 = at(grid, x + r2x, y + r2y);
      if (t1 <= 0 || t1 === 6 || t2 <= 0 || t2 === 6) continue;

      const v = V[i];
      const a = V[(i + 3) % 4];
      const b = V[(i + 1) % 4];
      const p1 = [v[0] + (a[0] - v[0]) * 0.4, v[1] + (a[1] - v[1]) * 0.4];
      const p2 = [v[0] + (b[0] - v[0]) * 0.4, v[1] + (b[1] - v[1]) * 0.4];

      const m0 = mat(grid, x + r1x, y + r1y);
      const tc = tcol(m0, p, S, seasonId);

      const z1 = ht(grid, x + r1x, y + r1y);
      const z2 = ht(grid, x + r2x, y + r2y);
      const landZ = Math.max(z1, z2);
      const dh = Math.max(0, (landZ - z) * U);

      const fp = (dy) => {
        ctx.beginPath();
        ctx.moveTo(v[0], v[1] + dy);
        ctx.lineTo(p1[0], p1[1] + dy);
        ctx.quadraticCurveTo(v[0], v[1] + dy, p2[0], p2[1] + dy);
        ctx.closePath();
      };

      if (dh > 0.5) {
        ctx.fillStyle = tc[1];
        for (let d = 0; d >= -dh; d -= 2) {
          fp(d);
          ctx.fill();
        }
        fp(-dh);
        ctx.fillStyle = tc[0];
        ctx.fill();
      } else {
        fp(0);
        ctx.fillStyle = tc[0];
        ctx.fill();
      }

      // Gentle cove water foam accent inside the corner
      ctx.strokeStyle = `rgba(${mix(255, fogCol.r, fTint)}, ${mix(255, fogCol.g, fTint)}, ${mix(255, fogCol.b, fTint)}, ${(0.45 + 0.25 * Math.sin(t / 600 + i)) * foamExt})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(v[0] + (sx - v[0]) * 0.28, v[1] + (sy - v[1]) * 0.28, 3.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 6. Waterfalls & Cliff Cascades (when water reaches front-facing cliff edges or lower water)
    // Edge 2: South-East (V[1] to V[2]) [rx: 1, ry: 0]
    const [n2x, n2y] = fromRotated(1, 0, rot);
    const n2Type = at(grid, x + n2x, y + n2y);
    const n2Z = ht(grid, x + n2x, y + n2y);
    if ((n2Type === 0 || n2Type === 6) && n2Z < z - 0.1) {
      drawWaterfallFace(ctx, V[1], V[2], z, n2Z, t, p, isSunset, sunsetWeight, ntVal, fogFactor, fogCol, fTint, mix, x, y, 2);
    }

    // Edge 3: South-West (V[3] to V[2]) [rx: 0, ry: 1]
    const [n3x, n3y] = fromRotated(0, 1, rot);
    const n3Type = at(grid, x + n3x, y + n3y);
    const n3Z = ht(grid, x + n3x, y + n3y);
    if ((n3Type === 0 || n3Type === 6) && n3Z < z - 0.1) {
      drawWaterfallFace(ctx, V[3], V[2], z, n3Z, t, p, isSunset, sunsetWeight, ntVal, fogFactor, fogCol, fTint, mix, x, y, 3);
    }

    // Edge 0 (V[0] to V[3]) and Edge 1 (V[0] to V[1]): crest foam if pouring over cliff
    const [n0x, n0y] = fromRotated(-1, 0, rot);
    const n0Type = at(grid, x + n0x, y + n0y);
    const n0Z = ht(grid, x + n0x, y + n0y);
    if ((n0Type === 0 || n0Type === 6) && n0Z < z - 0.1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(V[0][0], V[0][1]);
      ctx.lineTo(V[3][0], V[3][1]);
      ctx.stroke();
    }

    const [n1x, n1y] = fromRotated(0, -1, rot);
    const n1Type = at(grid, x + n1x, y + n1y);
    const n1Z = ht(grid, x + n1x, y + n1y);
    if ((n1Type === 0 || n1Type === 6) && n1Z < z - 0.1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(V[0][0], V[0][1]);
      ctx.lineTo(V[1][0], V[1][1]);
      ctx.stroke();
    }

    // 7. Stylized Specular Sun Glint on Water
    const glintPhase = Math.sin(t / 500 + x * 2.7 + y * 3.3);
    if (glintPhase > 0.45) {
      const gAlpha = Math.pow((glintPhase - 0.45) / 0.55, 2) * (1 - ntVal * 0.6) * (1 - fogFactor * 0.92);
      const gSize = 1.8;
      const gx = sx + (hash(x, y) - 0.5) * 14;
      const gy = sy + (hash(y, x) - 0.5) * 8;

      ctx.strokeStyle = isSunset 
        ? `rgba(${mix(255, fogCol.r, fTint)}, ${mix(mix(245, 195, sunsetWeight), fogCol.g, fTint)}, ${mix(mix(210, 110, sunsetWeight), fogCol.b, fTint)}, ${gAlpha * (0.9 + sunsetWeight * 0.35)})` 
        : `rgba(${mix(255, fogCol.r, fTint)}, ${mix(255, fogCol.g, fTint)}, ${mix(255, fogCol.b, fTint)}, ${gAlpha * 0.85})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx - gSize * 1.6, gy);
      ctx.lineTo(gx + gSize * 1.6, gy);
      ctx.moveTo(gx, gy - gSize);
      ctx.lineTo(gx, gy + gSize);
      ctx.stroke();

      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(gx, gy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    return;
  }

  if (ty === 2) {
    // Mountain ground footprint
    const rockBase = [p.r[0], p.r[1], p.r[2], false, 'rock'];
    rprism(ctx, grid, ox, oy, x, y, z, rockBase, light, rot);
    return;
  }

  const sh = (ty === 1 || ty === 5) && sandy(grid, x, y);
  const S0 = sandC(seasonId);
  rprism(
    ctx,
    grid,
    ox,
    oy,
    x,
    y,
    z,
    [ty === 3 ? p.rd : sh ? S0[0] : G[0], sh ? S0[1] : G[1], sh ? S0[2] : G[2]],
    light,
    rot
  );

  const m0 = mat(grid, x, y);
  if (ty !== 2 && m0 !== 'g') bleed(ctx, grid, x, y, sx, sy, m0, p, seasonId, rot);

  if (ty === 3) {
    ctx.fillStyle = '#00000022';
    for (let i = 0; i < 5; i++) {
      const a = hash(x * 3 + i, y) - 0.5;
      const b = hash(y * 5 + i, x) - 0.5;
      ctx.beginPath();
      ctx.ellipse(sx + a * 30, sy + b * 12, 2.6, 1.4, 0, 0, 7);
      ctx.fill();
    }
  }
}

export function drawWaterfallFace(ctx, pA, pB, z, lowerZ, t, p, isSunset, sunsetWeight, ntVal, fogFactor, fogCol, fTint, mix, x, y, sideIndex) {
  const dh = (z - lowerZ) * U;
  if (dh <= 0.5) return;

  const pA_bot = [pA[0], pA[1] + dh];
  const pB_bot = [pB[0], pB[1] + dh];

  // 1. Shaded wet bedrock backdrop behind the falls
  ctx.fillStyle = isSunset ? '#2e262c' : '#232b30';
  ctx.beginPath();
  ctx.moveTo(pA[0], pA[1]);
  ctx.lineTo(pB[0], pB[1]);
  ctx.lineTo(pB_bot[0], pB_bot[1]);
  ctx.lineTo(pA_bot[0], pA_bot[1]);
  ctx.closePath();
  ctx.fill();

  // 2. Cascading translucent water sheet with vertical gradient
  const fGrad = ctx.createLinearGradient(0, pA[1], 0, pA[1] + dh);
  if (isSunset) {
    fGrad.addColorStop(0, `rgba(${mix(120, 255, sunsetWeight * 0.6)}, ${mix(210, 180, sunsetWeight * 0.5)}, ${mix(235, 140, sunsetWeight * 0.6)}, 0.88)`);
    fGrad.addColorStop(0.45, `rgba(${mix(180, 255, sunsetWeight * 0.8)}, ${mix(235, 210, sunsetWeight * 0.6)}, ${mix(255, 160, sunsetWeight * 0.7)}, 0.85)`);
    fGrad.addColorStop(1, 'rgba(255, 250, 245, 0.96)');
  } else {
    fGrad.addColorStop(0, `rgba(${mix(85, fogCol.r, fTint)}, ${mix(215, fogCol.g, fTint)}, ${mix(240, fogCol.b, fTint)}, 0.88)`);
    fGrad.addColorStop(0.45, `rgba(${mix(150, fogCol.r, fTint)}, ${mix(235, fogCol.g, fTint)}, ${mix(255, fogCol.b, fTint)}, 0.85)`);
    fGrad.addColorStop(1, 'rgba(255, 255, 255, 0.96)');
  }
  ctx.fillStyle = fGrad;
  ctx.beginPath();
  ctx.moveTo(pA[0], pA[1]);
  ctx.lineTo(pB[0], pB[1]);
  ctx.lineTo(pB_bot[0], pB_bot[1]);
  ctx.lineTo(pA_bot[0], pA_bot[1]);
  ctx.closePath();
  ctx.fill();

  // 3. Fast animated vertical cascading water torrent ribbons
  ctx.save();
  for (let s = 1; s <= 5; s++) {
    const u = s / 6;
    const xTop = pA[0] + (pB[0] - pA[0]) * u;
    const yTop = pA[1] + (pB[1] - pA[1]) * u;
    const xBot = pA_bot[0] + (pB_bot[0] - pA_bot[0]) * u;
    const yBot = pA_bot[1] + (pB_bot[1] - pA_bot[1]) * u;

    const streamCycle = ((t / 260 + u * 1.9 + x * 0.7 + y * 1.1 + sideIndex * 0.3) % 1);
    const segLen = dh * 0.45;
    const startY = yTop + streamCycle * (dh - segLen * 0.5);
    const endY = Math.min(yBot, startY + segLen);
    const startX = xTop + (xBot - xTop) * ((startY - yTop) / dh);
    const endX = xTop + (xBot - xTop) * ((endY - yTop) / dh);

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.72 + 0.25 * Math.sin(t / 150 + s)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Waterfall Lip / Crest foam rolling over the upper edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 2.0;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pA[0], pA[1]);
  ctx.lineTo(pB[0], pB[1]);
  ctx.stroke();

  // 5. Impact Splash, Mist & Foam Pool where falls hit lower water block or ocean
  const midX = (pA_bot[0] + pB_bot[0]) / 2;
  const midY = (pA_bot[1] + pB_bot[1]) / 2;
  const edgeLen = Math.hypot(pB[0] - pA[0], pB[1] - pA[1]);

  // Expanding foam ripple rings on the lower water surface
  const rippleCycle = (t / 380 + x * 0.5 + y * 0.8 + sideIndex) % 1;
  ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - rippleCycle) * 0.75})`;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(midX, midY, edgeLen * 0.42 + rippleCycle * 6, edgeLen * 0.21 + rippleCycle * 3, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Plunging boil / foam crest along impact base
  const boilPulse = Math.sin(t / 180 + x * 3) * 1.2;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.beginPath();
  ctx.ellipse(midX, midY - 0.5, edgeLen * 0.38 + boilPulse, 2.8 + boilPulse * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Light floating spray mist droplets
  for (let m = 0; m < 3; m++) {
    const mistAngle = t / 200 + m * 2.1 + x;
    const mDist = 3 + m * 2.5;
    const mx = midX + Math.cos(mistAngle) * mDist;
    const my = midY - 2.5 - Math.sin(t / 250 + m) * 3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(mx, my, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawWaterTileGround(ctx, grid, ox, oy, x, y, z, t, p, seasonId, light = null, rot = 0) {
  tileGround(ctx, grid, ox, oy, x, y, t, p, seasonId, light, rot);
}

export function getMountainParams(grid, x, y) {
  const rn = cnt(grid, x, y, 2, true);
  const hVal = hash(x * 19 + 7, y * 31 + 11);
  const mTier = getTier(grid, x, y);

  // Direct orthogonal mountain neighbors for ridge connectivity
  const nN = at(grid, x, y - 1) === 2;
  const nS = at(grid, x, y + 1) === 2;
  const nW = at(grid, x - 1, y) === 2;
  const nE = at(grid, x + 1, y) === 2;

  // Diagonals
  const nNW = at(grid, x - 1, y - 1) === 2;
  const nNE = at(grid, x + 1, y - 1) === 2;
  const nSW = at(grid, x - 1, y + 1) === 2;
  const nSE = at(grid, x + 1, y + 1) === 2;

  // Detect if part of a 2x2 (4-tile) Mega Massif
  let is2x2 = false;
  let anchor = [x, y];
  const blocks = [
    [0, 0],   // tile is top-left
    [-1, 0],  // tile is top-right
    [0, -1],  // tile is bottom-left
    [-1, -1]  // tile is bottom-right
  ];
  for (const [bx, by] of blocks) {
    const ax = x + bx;
    const ay = y + by;
    if (
      at(grid, ax, ay) === 2 &&
      at(grid, ax + 1, ay) === 2 &&
      at(grid, ax, ay + 1) === 2 &&
      at(grid, ax + 1, ay + 1) === 2
    ) {
      is2x2 = true;
      anchor = [ax, ay];
      break;
    }
  }

  // Determine cluster scale: 1, 2, 3, or 4
  let clusterScale = 1;
  if (is2x2) {
    clusterScale = 4;
  } else if (rn >= 3) {
    clusterScale = 3;
  } else if (rn >= 1) {
    clusterScale = 2;
  } else {
    clusterScale = 1;
  }

  // Determine if this tile is the dominant apex (summit) of its immediate cluster
  const myScore = mTier * 100 + hVal * 10;
  let isApex = true;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (at(grid, x + dx, y + dy) === 2) {
        const otherScore = getTier(grid, x + dx, y + dy) * 100 + hash((x + dx) * 19 + 7, (y + dy) * 31 + 11) * 10;
        if (otherScore > myScore) {
          isApex = false;
          break;
        }
      }
    }
    if (!isApex) break;
  }

  const peakBoost = (mTier || 0) * 18;
  let peakHeight;
  if (clusterScale === 4) {
    // 4-tile Mega Massif
    peakHeight = isApex ? 92 + hVal * 14 + peakBoost : 68 + hVal * 10 + peakBoost;
  } else if (clusterScale === 3) {
    // 3-tile Mountain Range
    peakHeight = isApex ? 72 + hVal * 10 + peakBoost : 52 + hVal * 8 + peakBoost;
  } else if (clusterScale === 2) {
    // 2-tile Mountain Ridge
    peakHeight = isApex ? 56 + hVal * 8 + peakBoost : 44 + hVal * 6 + peakBoost;
  } else {
    // 1-tile Solitary Alpine Peak
    peakHeight = 40 + hVal * 8 + peakBoost;
  }

  return {
    rn,
    hVal,
    nN,
    nS,
    nW,
    nE,
    nNW,
    nNE,
    nSW,
    nSE,
    mTier,
    clusterScale,
    is2x2,
    anchor,
    isApex,
    peakHeight
  };
}

export function getForestParams(grid, x, y) {
  const ty = at(grid, x, y);
  if (ty !== 1) return null;
  if (sandy(grid, x, y)) return null;

  // Multi-scale coherent cellular noise creates natural forest groves and open meadows
  const fVal =
    hash(x * 7 + 3, y * 11 + 5) * 0.45 +
    hash(Math.floor(x / 2) * 13, Math.floor(y / 2) * 17) * 0.35 +
    hash(Math.floor(x / 4) * 31, Math.floor(y / 4) * 23) * 0.2;

  const gn = cnt(grid, x, y, 1, true);
  if (fVal < 0.52 || gn < 2) return null;

  const hT = hash(x * 37 + 13, y * 43 + 19);
  const hSp = hash(x * 53 + 7, y * 67 + 23);

  // Species:
  // 0: Conifer / Alpine Pine
  // 1: Broadleaf Oak / Beech
  // 2: Slender White Birch / Aspen
  // 3: Blossom / Fruit Tree
  const species = Math.floor(hSp * 4);

  // Features:
  // 'fallen_log': fallen mossy trunk spanning 2+ blocks (~9%)
  // 'stump': lumberjack cut stump with growth rings & axe/mushrooms (~9%)
  // 'grove3': dense copse of 3 trees (~26%)
  // 'twin': pair of parent + sapling trees (~30%)
  // 'single': grand solitary specimen tree (~26%)
  let feature;
  if (hT < 0.09) feature = 'fallen_log';
  else if (hT < 0.18) feature = 'stump';
  else if (hT < 0.44) feature = 'grove3';
  else if (hT < 0.74) feature = 'twin';
  else feature = 'single';

  return { feature, species, hT, hSp, fVal };
}

// ----------------- WIND WEATHER SYSTEM WITH EVENT RARITIES -----------------
export const WIND_RARITIES = [
  { id: 'still', name: 'Dead Calm', icon: '🍃', weight: 0.38, desc: 'Completely motionless, peaceful stillness' },
  { id: 'gentle', name: 'Gentle Breeze', icon: '🌾', weight: 0.42, desc: 'Slow, lazy, very slight sway' },
  { id: 'brisk', name: 'Brisk Wind', icon: '💨', weight: 0.13, desc: 'Rolling waves & swaying trees' },
  { id: 'gale', name: 'Storm Gale', icon: '⛈️', weight: 0.05, desc: 'Deep bends & gusting squall' },
  { id: 'tornado', name: 'Tornado Vortex', icon: '🌪️', weight: 0.02, desc: 'Rare swirling cyclone with flying debris' }
];

let activeWindOverride = null; // null for auto-procedural, or specific id

export function setWindOverride(mode) {
  activeWindOverride = mode;
  if (typeof window !== 'undefined') {
    window.__windMode = mode;
  }
}

export function getWindOverride() {
  return activeWindOverride;
}

// Evaluate current weather state with smooth interpolation
export function getWindState(t) {
  if (activeWindOverride) {
    const cur = WIND_RARITIES.find((r) => r.id === activeWindOverride) || WIND_RARITIES[1];
    return {
      id: cur.id,
      name: cur.name,
      icon: cur.icon,
      weight: cur.weight,
      blend: 1.0,
      curType: cur.id,
      nextType: cur.id,
      isTornado: cur.id === 'tornado',
      tornadoIntensity: cur.id === 'tornado' ? 1.0 : 0
    };
  }

  // Auto weather timeline: each weather phase lasts ~16 seconds
  const slotDuration = 16000;
  const slotIdx = Math.floor(t / slotDuration);
  const slotProgress = (t % slotDuration) / slotDuration;

  const getSlotType = (idx) => {
    const roll = hash(idx * 79 + 17, idx * 131 + 43);
    let accum = 0;
    for (const r of WIND_RARITIES) {
      accum += r.weight;
      if (roll <= accum) return r;
    }
    return WIND_RARITIES[1];
  };

  const curSlot = getSlotType(slotIdx);
  const nextSlot = getSlotType(slotIdx + 1);

  // Smooth blending transition during the last 20% of the slot
  const blendZone = 0.8;
  let blend = 0;
  if (slotProgress > blendZone) {
    const p = (slotProgress - blendZone) / (1 - blendZone);
    blend = p * p * (3 - 2 * p); // smoothstep
  }

  const isTorn = curSlot.id === 'tornado' || nextSlot.id === 'tornado';
  const tornIntensity =
    (curSlot.id === 'tornado' ? 1 - blend : 0) +
    (nextSlot.id === 'tornado' ? blend : 0);

  return {
    id: blend > 0.5 ? nextSlot.id : curSlot.id,
    name: blend > 0.5 ? nextSlot.name : curSlot.name,
    icon: blend > 0.5 ? nextSlot.icon : curSlot.icon,
    curType: curSlot.id,
    nextType: nextSlot.id,
    blend,
    isTornado: isTorn && tornIntensity > 0.05,
    tornadoIntensity: tornIntensity
  };
}

// Compute tree deflection and leaf flutter from current wind state
export function getTreeWind(t, px, py, height, seed = 0) {
  const state = getWindState(t);

  const computeSwayForType = (typeId) => {
    if (typeId === 'still') {
      // Dead calm: essentially 0 movement
      return {
        swayX: 0,
        swayY: 0,
        flutter: 0,
        leafDrop: 0
      };
    }

    if (typeId === 'gentle') {
      // Very slow, gentle, peaceful sway (~11 second cycle)
      const slowPhase = t * 0.00055 + px * 0.006 + py * 0.004 + seed * 6.28;
      const swayX = Math.sin(slowPhase) * 1.1 * (height / 22);
      const swayY = Math.abs(swayX) * 0.08;
      const flutter = Math.sin(t * 0.003 + seed * 9) * 0.15;
      return { swayX, swayY, flutter, leafDrop: 0.1 };
    }

    if (typeId === 'brisk') {
      // Rolling wind gusts, medium speed (~6 second cycle)
      const slowPhase = t * 0.0011 + px * 0.01 + py * 0.008 + seed * 6.28;
      const gustFront = Math.pow(Math.max(0, Math.sin(t * 0.0006 - px * 0.012 + py * 0.007)), 2);
      const swayX = (Math.sin(slowPhase) * 2.2 + gustFront * 3.2) * (height / 22);
      const swayY = Math.abs(swayX) * 0.12;
      const flutter = Math.sin(t * 0.008 + seed * 12) * 0.5;
      return { swayX, swayY, flutter, leafDrop: 0.5 };
    }

    if (typeId === 'gale') {
      // Strong storm gale
      const gustPhase = t * 0.0018 + px * 0.015 + py * 0.01;
      const galeSurge = Math.pow(Math.max(0, Math.sin(t * 0.0009 - px * 0.01 + py * 0.005)), 1.8) * 5.5;
      const swayX = (Math.sin(gustPhase) * 3.5 + galeSurge) * (height / 22);
      const swayY = Math.abs(swayX) * 0.16;
      const flutter = Math.sin(t * 0.014 + seed * 15) * 1.1;
      return { swayX, swayY, flutter, leafDrop: 0.85 };
    }

    // TORNADO / WHIRLING VORTEX:
    const vortexX = Math.sin(t * 0.00035) * 170;
    const vortexY = Math.cos(t * 0.00028) * 110;
    const vdx = px - vortexX;
    const vdy = py - vortexY;
    const dist = Math.hypot(vdx, vdy) || 1;
    const R = 240;

    let swayX = 0;
    let swayY = 0;
    let flutter = 0;

    if (dist < R) {
      // Counter-clockwise rotational swirl tangent (-vdy, vdx) + inward suction
      const tangentX = -vdy / dist;
      const tangentY = vdx / dist;
      const inwardX = -vdx / dist;
      const inwardY = -vdy / dist;

      const factor = Math.pow(1 - dist / R, 1.4) * 14.0 * (height / 22);
      const fastSpin = Math.sin(t * 0.02 + seed * 8) * 2.2;

      swayX = (tangentX * 0.85 + inwardX * 0.25) * factor + fastSpin;
      swayY = (tangentY * 0.85 + inwardY * 0.25) * factor * 0.5;
      flutter = Math.sin(t * 0.028 + seed * 17) * 2.2;
    } else {
      swayX = Math.sin(t * 0.0025 + px * 0.01) * 3.5 * (height / 22);
      swayY = Math.abs(swayX) * 0.14;
      flutter = Math.sin(t * 0.012) * 0.9;
    }

    return { swayX, swayY, flutter, leafDrop: 1.0 };
  };

  const cur = computeSwayForType(state.curType);
  const next = computeSwayForType(state.nextType);
  const b = state.blend;

  return {
    swayX: cur.swayX * (1 - b) + next.swayX * b,
    swayY: cur.swayY * (1 - b) + next.swayY * b,
    flutter: cur.flutter * (1 - b) + next.flutter * b,
    leafDrop: cur.leafDrop * (1 - b) + next.leafDrop * b,
    isTornado: state.isTornado,
    tornadoIntensity: state.tornadoIntensity || 0,
    state
  };
}

// Visual cartoon tornado whirlwind funnel with swirling dust & orbiting leaves
export function drawTornado(ctx, ox, oy, t) {
  const state = getWindState(t);
  const intensity = state.tornadoIntensity;
  if (!intensity || intensity < 0.02) return;

  const vx = ox + Math.sin(t * 0.00035) * 170;
  const vy = oy + Math.cos(t * 0.00028) * 110;

  ctx.save();
  // 1. Ground dust shadow / touchdown imprint
  ctx.fillStyle = `rgba(50, 42, 34, ${0.28 * intensity})`;
  ctx.beginPath();
  ctx.ellipse(vx, vy, 32, 14, 0, 0, 7);
  ctx.fill();

  // 2. Swirling conical funnel rings
  const layers = 8;
  for (let i = 0; i < layers; i++) {
    const u = i / layers;
    const ringY = vy - u * 95;
    const ringW = 10 + u * 48;
    const ringH = ringW * 0.42;

    const rot = t * 0.015 * (1 + u * 0.5) + i * 0.7;
    const offsetX = Math.sin(rot) * (u * 8);

    ctx.strokeStyle = `rgba(240, 245, 255, ${(0.34 - u * 0.18) * intensity})`;
    ctx.lineWidth = 2.4 + u * 2.2;
    ctx.beginPath();
    ctx.ellipse(vx + offsetX, ringY, ringW, ringH, Math.sin(rot * 0.5) * 0.2, 0, 7);
    ctx.stroke();

    ctx.fillStyle = `rgba(220, 215, 205, ${(0.14 - u * 0.07) * intensity})`;
    ctx.fill();
  }

  // 3. Whirling debris & flying leaves orbiting the funnel
  const debrisCount = 14;
  for (let d = 0; d < debrisCount; d++) {
    const orbitSpeed = t * 0.01 + d * 0.75;
    const orbitDist = 18 + ((d * 11) % 46);
    const orbitY = vy - 10 - ((d * 9 + t * 0.04) % 95);
    const lx = vx + Math.cos(orbitSpeed) * orbitDist;
    const ly = orbitY + Math.sin(orbitSpeed) * (orbitDist * 0.38);

    ctx.fillStyle = d % 3 === 0 ? '#488a2c' : d % 3 === 1 ? '#d67c29' : '#fff';
    ctx.beginPath();
    ctx.ellipse(lx, ly, 2.2, 1.2, orbitSpeed, 0, 7);
    ctx.fill();
  }

  ctx.restore();
}

export function drawTree(ctx, px, py, species, height, seasonId, p, light, t = 0, seed = 0) {
  // 1. Wind & Weather Engine with Event Rarities
  const wind = getTreeWind(t, px, py, height, seed);
  const crownSwayX = wind.swayX;
  const crownSwayY = wind.swayY;
  const rustle = wind.flutter;
  const isTornado = wind.isTornado;

  const dotLeft = light ? -light.lightDirX * 0.75 - light.lightDirY * 0.45 : 0;
  const dotRight = light ? light.lightDirX * 0.75 - light.lightDirY * 0.45 : 0;

  if (species === 0) {
    // ----------------- CONIFER / ALPINE PINE -----------------
    ctx.fillStyle = '#4c3220';
    ctx.fillRect(px - 1.5, py - 4, 3, 5);

    // 3 tiered boughs, swaying progressively upwards
    const s1 = crownSwayX * 0.35;
    const s2 = crownSwayX * 0.68;
    const s3 = crownSwayX * 0.95;
    const sApex = crownSwayX * 1.18;

    const t1 = py - 4;
    const t2 = py - height * 0.44 + crownSwayY * 0.5;
    const t3 = py - height * 0.73 + crownSwayY * 0.8;
    const apexY = py - height + crownSwayY * 1.1;

    const pineCol =
      seasonId === 2
        ? ['#345c47', '#254434']
        : seasonId === 1
        ? ['#c27027', '#9e541b']
        : p.tree;

    // Helper to draw a needle-fringed pine bough tier
    const drawPineTier = (cx, cy, apexX, apexY, halfW, tierH, col, colDark) => {
      const steps = 6;
      ctx.fillStyle = colDark;
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(cx + halfW, cy);
      for (let i = steps; i >= 0; i--) {
        const u = i / steps;
        const x = cx - halfW + u * (halfW * 2);
        const y = cy + (i % 2 === 1 ? 1.8 : 0);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Top sunlit facet / upper needles
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(cx - halfW, cy);
      ctx.lineTo(cx + halfW * 0.2, cy - 1);
      ctx.closePath();
      ctx.fill();

      if (light) {
        if (dotLeft > 0) {
          ctx.fillStyle = `rgba(255, 246, 210, ${dotLeft * 0.18})`;
          ctx.beginPath();
          ctx.moveTo(apexX, apexY);
          ctx.lineTo(cx - halfW, cy);
          ctx.lineTo(apexX, cy);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(16, 12, 36, ${(-dotLeft) * 0.2})`;
          ctx.beginPath();
          ctx.moveTo(apexX, apexY);
          ctx.lineTo(cx + halfW, cy);
          ctx.lineTo(apexX, cy);
          ctx.closePath();
          ctx.fill();
        }
      }
    };

    // Tier 1 (bottom bough)
    drawPineTier(px + s1, t1, px + s2, t1 - 12, 10, 12, pineCol[0], pineCol[1]);
    // Tier 2 (middle bough)
    drawPineTier(px + s2, t2, px + s3, t2 - 11, 8, 11, pineCol[0], pineCol[1]);
    // Tier 3 (top bough)
    drawPineTier(px + s3, t3, px + sApex, apexY, 6, apexY - t3, pineCol[0], pineCol[1]);

    // Pinecone details dangling under tier 2
    ctx.fillStyle = '#382214';
    ctx.beginPath();
    ctx.ellipse(px + s2 - 4, t2 + 1.2, 1.3, 2, 0.2, 0, 7);
    ctx.ellipse(px + s2 + 3.5, t2 + 1.5, 1.2, 1.8, -0.2, 0, 7);
    ctx.fill();

    // Winter snow caps on each bough
    if (seasonId === 2) {
      ctx.fillStyle = '#eaf2f8';
      ctx.beginPath();
      ctx.moveTo(px + sApex, apexY);
      ctx.lineTo(px + s3 - 5, t3 - 1);
      ctx.lineTo(px + s3 + 5, t3 - 1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(px + s2, t2 - 2, 6, 2, 0, 0, 7);
      ctx.ellipse(px + s1, t1 - 2, 7.5, 2.2, 0, 0, 7);
      ctx.fill();
    }
  } else if (species === 1) {
    // ----------------- BROADLEAF OAK / BEECH -----------------
    const crownX = px + crownSwayX;
    const crownY = py - height + crownSwayY;

    // Curved branching trunk & limbs
    ctx.fillStyle = '#563a26';
    ctx.fillRect(px - 1.8, py - 6, 3.6, 7);
    ctx.strokeStyle = '#563a26';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px - 0.5, py - 5);
    ctx.lineTo(crownX - 4, crownY + 8);
    ctx.moveTo(px + 0.5, py - 5);
    ctx.lineTo(crownX + 4.5, crownY + 7);
    ctx.stroke();

    const oakCol =
      seasonId === 2
        ? ['#5c6b73', '#46535a', '#74838c']
        : seasonId === 1
        ? ['#d96e24', '#b85316', '#f28e38']
        : ['#529e3a', '#3c7929', '#6cbd48'];

    // Multi-layered scalloped leaf cushions
    ctx.fillStyle = oakCol[1];
    ctx.beginPath();
    ctx.ellipse(crownX - 5.5, crownY + 4, 6.5, 5.5, -0.15, 0, 7);
    ctx.ellipse(crownX + 5.5, crownY + 4, 6.5, 5.5, 0.15, 0, 7);
    ctx.ellipse(crownX, crownY + 5.5, 7, 5, 0, 0, 7);
    ctx.fill();

    ctx.fillStyle = oakCol[0];
    ctx.beginPath();
    ctx.ellipse(crownX - 4.5, crownY + 1, 6, 5.8, -0.1, 0, 7);
    ctx.ellipse(crownX + 4.5, crownY + 1, 6, 5.8, 0.1, 0, 7);
    ctx.ellipse(crownX, crownY - 1, 7.5, 7, 0, 0, 7);
    ctx.fill();

    ctx.fillStyle = oakCol[2];
    ctx.beginPath();
    ctx.ellipse(crownX - 2.5, crownY - 2.5, 5, 4.2, -0.2, 0, 7);
    ctx.ellipse(crownX + 2, crownY - 3, 4.5, 3.8, 0.2, 0, 7);
    ctx.fill();

    // Small fluttering leaf scallops along the canopy edge (trembling with breeze)
    ctx.fillStyle = oakCol[0];
    const leafOffsets = [
      [-9, 3, 2.2, 1.8],
      [9, 2.5, 2.4, 1.9],
      [-7.5, -3, 2.5, 2],
      [7.5, -3.5, 2.3, 1.8],
      [0, -7.5, 2.8, 2.2]
    ];
    for (let i = 0; i < leafOffsets.length; i++) {
      const [lx, ly, rx, ry] = leafOffsets[i];
      const flutterOffset = Math.sin(t * 0.008 + i * 1.7) * 0.8;
      ctx.beginPath();
      ctx.ellipse(crownX + lx + flutterOffset, crownY + ly, rx, ry, 0, 0, 7);
      ctx.fill();
    }

    if (light) {
      if (dotLeft > 0) {
        ctx.fillStyle = `rgba(255, 248, 215, ${dotLeft * 0.22})`;
        ctx.beginPath();
        ctx.ellipse(crownX - 3, crownY - 2.5, 5.5, 4.8, -0.2, 0, 7);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(16, 14, 38, ${(-dotLeft) * 0.22})`;
        ctx.beginPath();
        ctx.ellipse(crownX + 3.5, crownY + 3, 5.5, 4.8, 0.2, 0, 7);
        ctx.fill();
      }
    }

    if (seasonId === 2) {
      ctx.fillStyle = '#ffffffcc';
      ctx.beginPath();
      ctx.ellipse(crownX, crownY - 4, 6, 2.8, 0, 0, 7);
      ctx.ellipse(crownX - 4, crownY + 1, 3.5, 1.8, 0, 0, 7);
      ctx.fill();
    }
  } else if (species === 2) {
    // ----------------- SLENDER WHITE BIRCH / ASPEN -----------------
    const midTrunkX = px + crownSwayX * 0.25;
    ctx.strokeStyle = '#f5f2eb';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(midTrunkX, py - height * 0.45, px + crownSwayX * 0.6, py - height * 0.65);
    ctx.stroke();

    ctx.fillStyle = '#2d2722';
    ctx.fillRect(px - 1.2, py - 3, 2.2, 0.9);
    ctx.fillRect(midTrunkX - 1, py - 7, 2, 0.9);
    ctx.fillRect(midTrunkX - 0.5, py - 11, 2, 0.8);

    const crownX = px + crownSwayX;
    const crownY = py - height + crownSwayY;

    const birchCol =
      seasonId === 2
        ? ['#7a8f99', '#5f737d', '#96abb5']
        : seasonId === 1
        ? ['#f0ca35', '#c79d16', '#fae05c']
        : ['#7bc94b', '#5ea832', '#97e366'];

    ctx.fillStyle = birchCol[1];
    ctx.beginPath();
    ctx.ellipse(crownX, crownY + 3, 5.8, 8.5, 0, 0, 7);
    ctx.fill();

    ctx.fillStyle = birchCol[0];
    ctx.beginPath();
    ctx.ellipse(crownX - 0.5, crownY - 1, 5.2, 7.5, -0.08, 0, 7);
    ctx.fill();

    ctx.fillStyle = birchCol[2];
    ctx.beginPath();
    ctx.ellipse(crownX - 1.2, crownY - 3, 4, 5.5, -0.1, 0, 7);
    ctx.fill();

    // "Quaking Aspen" leaf flecks: tiny leaves around the periphery trembling rapidly
    const quakingLeaves = [
      [-5.5, 2], [5.5, 1], [-4.5, -4], [4.5, -5],
      [-2, -8], [2.5, -7.5], [-6, -1], [5.8, 4]
    ];
    ctx.fillStyle = birchCol[2];
    for (let i = 0; i < quakingLeaves.length; i++) {
      const [qx, qy] = quakingLeaves[i];
      const leafFlutter = Math.sin(t * 0.012 + i * 2.1 + seed * 5) * 1.3;
      ctx.beginPath();
      ctx.ellipse(crownX + qx + leafFlutter, crownY + qy, 1.6, 2.1, leafFlutter * 0.3, 0, 7);
      ctx.fill();
    }

    if (light && dotLeft > 0) {
      ctx.fillStyle = `rgba(255, 250, 220, ${dotLeft * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(crownX - 1.5, crownY - 2, 3.8, 5.5, 0, 0, 7);
      ctx.fill();
    }
  } else {
    // ----------------- BLOSSOM / FRUIT TREE (APPLE / CHERRY) -----------------
    const crownX = px + crownSwayX;
    const crownY = py - height + crownSwayY;

    ctx.fillStyle = '#593d2a';
    ctx.fillRect(px - 1.5, py - 5, 3, 6);
    ctx.strokeStyle = '#593d2a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(px, py - 4);
    ctx.lineTo(crownX - 3.5, crownY + 6);
    ctx.moveTo(px, py - 4);
    ctx.lineTo(crownX + 3.5, crownY + 6);
    ctx.stroke();

    const fruitCol =
      seasonId === 2
        ? ['#5c6e64', '#46564e']
        : seasonId === 1
        ? ['#c95828', '#a84318']
        : ['#58a644', '#3d782e'];

    ctx.fillStyle = fruitCol[1];
    ctx.beginPath();
    ctx.ellipse(crownX - 3.5, crownY + 2.5, 5.5, 4.8, 0, 0, 7);
    ctx.ellipse(crownX + 3.5, crownY + 2.5, 5.5, 4.8, 0, 0, 7);
    ctx.ellipse(crownX, crownY + 3.5, 6.5, 5, 0, 0, 7);
    ctx.fill();

    ctx.fillStyle = fruitCol[0];
    ctx.beginPath();
    ctx.ellipse(crownX, crownY - 0.5, 7, 6.2, 0, 0, 7);
    ctx.fill();

    ctx.fillStyle = fruitCol[0];
    const scallopPoints = [
      [-6.5, 1], [6.5, 0.5], [-4, -5.5], [4, -5.5], [0, -6.5]
    ];
    for (let i = 0; i < scallopPoints.length; i++) {
      const [sx, sy] = scallopPoints[i];
      const fl = Math.sin(t * 0.008 + i * 1.9) * 0.7;
      ctx.beginPath();
      ctx.arc(crownX + sx + fl, crownY + sy, 2.2, 0, 7);
      ctx.fill();
    }

    if (light && dotLeft > 0) {
      ctx.fillStyle = `rgba(255, 248, 220, ${dotLeft * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(crownX - 2, crownY - 2, 4.8, 4.2, 0, 0, 7);
      ctx.fill();
    }

    if (seasonId === 0) {
      // SPRING: Delicately scattered blossoms in natural, organic, non-circular patterns
      // Reduced count: 3 subtle, asymmetric blossom sprays across the canopy
      const blossomSprays = [
        { ox: -3.2, oy: -2.6, count: 3 },
        { ox: 2.6, oy: -1.2, count: 2 },
        { ox: -0.8, oy: 2.0, count: 3 }
      ];

      for (let s = 0; s < blossomSprays.length; s++) {
        const spray = blossomSprays[s];
        const fl = rustle * 0.4;
        const sprayBaseX = crownX + spray.ox + fl;
        const sprayBaseY = crownY + spray.oy;

        // Individual organic petals scattered asymmetrically (no concentric circles)
        for (let p = 0; p < spray.count; p++) {
          const r1 = hash(Math.floor(seed * 100) + s * 13 + p * 7, 31) - 0.5;
          const r2 = hash(Math.floor(seed * 100) + s * 19 + p * 11, 47) - 0.5;

          // Asymmetric spray offset along natural branch lines
          const px = sprayBaseX + r1 * 4.4;
          const py = sprayBaseY + r2 * 3.2;
          const petalRadius = 1.0 + hash(s * 7 + p, 53) * 0.45;

          // Soft organic petal shape (subtle angled ellipse rather than harsh geometric circle)
          const angle = (r1 + r2) * Math.PI;
          ctx.fillStyle = p % 2 === 0 ? '#ffc4d3' : '#ffd9e4';
          ctx.beginPath();
          ctx.ellipse(px, py, petalRadius * 1.25, petalRadius * 0.85, angle, 0, 7);
          ctx.fill();

          // Occasional tiny delicate stamen dot on focal petal
          if (p === 0) {
            ctx.fillStyle = '#db3269';
            ctx.beginPath();
            ctx.arc(px + 0.3, py - 0.2, 0.65, 0, 7);
            ctx.fill();
          }
        }
      }
    } else if (seasonId === 1) {
      // AUTUMN: Ripe red apples with specular shine & stems
      const apples = [
        [crownX - 3.5, crownY - 1.5],
        [crownX + 3.5, crownY - 2],
        [crownX + 1.2, crownY + 2.5],
        [crownX - 2, crownY + 2]
      ];
      for (const [ax, ay] of apples) {
        ctx.strokeStyle = '#422818';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(ax, ay - 1.5);
        ctx.lineTo(ax + 0.8, ay - 3);
        ctx.stroke();

        ctx.fillStyle = '#e02f24';
        ctx.beginPath();
        ctx.arc(ax, ay, 1.7, 0, 7);
        ctx.fill();

        ctx.fillStyle = '#ffffffdd';
        ctx.beginPath();
        ctx.arc(ax - 0.5, ay - 0.5, 0.5, 0, 7);
        ctx.fill();
      }
    }
  }

  // ----------------- DRIFTING LEAVES / PETALS / DEBRIS -----------------
  if (wind.leafDrop > 0.05) {
    const leafRate = isTornado ? 0.0012 : 0.00045;
    const pLeaf = ((t * leafRate + seed * 3.7) % 1);
    if (pLeaf < 0.85) {
      const startX = px + crownSwayX * 0.5;
      const startY = py - height * 0.7;
      const travelDist = isTornado ? 45 : 24;
      const lx = startX + pLeaf * travelDist + Math.sin(t * 0.007 + seed) * 4;
      const ly = startY + pLeaf * (height * 0.85) + Math.cos(t * 0.005 + seed) * 2;
      const alpha = Math.sin(pLeaf * Math.PI) * (isTornado ? 0.95 : 0.85);

      const leafCol =
        seasonId === 0
          ? `rgba(255, 185, 205, ${alpha})`
          : seasonId === 1
          ? `rgba(240, 160, 40, ${alpha})`
          : species === 2
          ? `rgba(165, 225, 75, ${alpha})`
          : `rgba(95, 175, 55, ${alpha})`;

      ctx.fillStyle = leafCol;
      ctx.beginPath();
      ctx.ellipse(lx, ly, isTornado ? 2.2 : 1.6, isTornado ? 1.3 : 1.0, Math.sin(t * (isTornado ? 0.02 : 0.008)) * 0.8, 0, 7);
      ctx.fill();
    }
  }
}

export function tileShadow(ctx, grid, ox, oy, x, y, t, light, rot = 0) {
  if (!light) return;
  const ty = at(grid, x, y);
  if (ty === 0 || ty === 6) return; // Water has no shadow caster

  const z = ht(grid, x, y);
  const [sx, sy] = P(ox, oy, x, y, z, rot);

  if (ty === 2) {
    const { peakHeight } = getMountainParams(grid, x, y);
    castShadow(ctx, sx, sy, W / 2 - 2, H / 2 - 1, peakHeight, light, 'spire');
    return;
  }

  const forest = getForestParams(grid, x, y);
  if (forest) {
    const { feature, hT } = forest;
    if (feature === 'fallen_log') {
      const x0 = sx - 4 + (hT - 0.5) * 6;
      const y0 = sy + 2 + (hash(y, x) - 0.5) * 4;
      const dx = (hash(x * 11, y * 13) > 0.5 ? 1 : -1) * (28 + hT * 10);
      const dy = (hash(x * 7, y * 19) > 0.5 ? 1 : 0.4) * (14 + hT * 5);
      const x1 = x0 + dx;
      const y1 = y0 + dy;
      const top0X = x0 + light.dx * 4;
      const top0Y = y0 + light.dy * 4;
      const top1X = x1 + light.dx * 4;
      const top1Y = y1 + light.dy * 4;
      poly(ctx, [[x0, y0], [x1, y1], [top1X, top1Y], [top0X, top0Y]], `rgba(14, 12, 32, ${light.shadowAlpha * 0.75})`);
    } else if (feature === 'stump') {
      const px = sx + (hT - 0.5) * 8;
      const py = sy + (hash(y, x) - 0.5) * 5;
      castShadow(ctx, px, py + 1, 4.5, 2.5, 5, light, 'agent');
    } else if (feature === 'grove3') {
      castShadow(ctx, sx - 6, sy + 1, 6.5, 3.2, 23, light, 'tree');
      castShadow(ctx, sx + 7, sy + 3, 5.5, 2.8, 18, light, 'tree');
      castShadow(ctx, sx + 1, sy - 6, 6, 3, 21, light, 'tree');
    } else if (feature === 'twin') {
      castShadow(ctx, sx - 4, sy + 2, 7, 3.5, 23, light, 'tree');
      castShadow(ctx, sx + 6, sy - 2, 5.5, 2.8, 16, light, 'tree');
    } else {
      const px = sx + (hT - 0.5) * 4;
      const py = sy + (hash(x, y) - 0.5) * 3;
      castShadow(ctx, px, py + 1, 8.5, 4.2, 27, light, 'tree');
    }
  }

  if (ty === 5) {
    buildingShadow(ctx, grid, ox, oy, x, y, t, light, rot);
  }
}

export function tileStructure(ctx, grid, ox, oy, x, y, t, p, seasonId, nt, light, rot = 0) {
  const ty = at(grid, x, y);
  const z = ht(grid, x, y);
  const [sx, sy] = P(ox, oy, x, y, z, rot);
  const G = p.g;

  if (ty === 0 || ty === 6) return; // Water drawn in tileGround

  if (ty === 2) {
    const {
      rn,
      hVal,
      nN,
      nS,
      nW,
      nE,
      mTier,
      clusterScale,
      is2x2,
      anchor,
      isApex,
      peakHeight
    } = getMountainParams(grid, x, y);

    const hw = W / 2;
    const hh = H / 2;

    const T = [sx, sy - hh];
    const R = [sx + hw, sy];
    const B = [sx, sy + hh];
    const L = [sx - hw, sy];

    const dotLeft = light ? -light.lightDirX * 0.75 - light.lightDirY * 0.45 : 0;
    const dotRight = light ? light.lightDirX * 0.75 - light.lightDirY * 0.45 : 0;

    let offX = (hash(x * 13, y * 29) - 0.5) * 4;
    let offY = (hash(y * 19, x * 31) - 0.5) * 2;

    // In a 4-tile mega massif, nudge summits towards the center of the 2x2 block
    if (is2x2) {
      const relX = x - anchor[0];
      const relY = y - anchor[1];
      const pullX = (0.5 - relX) * 7 - (0.5 - relY) * 7;
      const pullY = (0.5 - relX) * 3.5 + (0.5 - relY) * 3.5;
      offX += pullX;
      offY += pullY;
    }

    const peak = [sx + offX, sy - peakHeight + offY];

    // Solid rock faces from corners to peak
    poly(ctx, [L, T, peak], p.r[1]); // Back-left
    poly(ctx, [R, T, peak], p.r[2]); // Back-right
    poly(ctx, [L, B, peak], p.r[0]); // Front-left (sunlit rock)
    poly(ctx, [R, B, peak], p.r[1]); // Front-right (diffuse rock)

    // Directional face lighting
    if (light) {
      if (dotLeft > 0) poly(ctx, [L, B, peak], `rgba(255, 246, 210, ${dotLeft * 0.22})`);
      else poly(ctx, [L, B, peak], `rgba(16, 12, 36, ${(-dotLeft) * 0.25})`);
      if (dotRight > 0) poly(ctx, [R, B, peak], `rgba(255, 246, 210, ${dotRight * 0.22})`);
      else poly(ctx, [R, B, peak], `rgba(16, 12, 36, ${(-dotRight) * 0.25})`);
    }

    // Connecting arête ridges to adjacent mountains
    ctx.strokeStyle = p.r[2];
    ctx.lineWidth = clusterScale >= 3 ? 1.6 : 1.3;
    ctx.beginPath();
    ctx.moveTo(peak[0], peak[1]);
    ctx.lineTo(B[0], B[1]);
    if (nE) { ctx.moveTo(peak[0], peak[1]); ctx.lineTo(R[0], R[1]); }
    if (nW) { ctx.moveTo(peak[0], peak[1]); ctx.lineTo(L[0], L[1]); }
    if (nN) { ctx.moveTo(peak[0], peak[1]); ctx.lineTo(T[0], T[1]); }
    if (nS) { ctx.moveTo(peak[0], peak[1]); ctx.lineTo(B[0], B[1]); }
    ctx.stroke();

    // Glacial / Alpine Snow Cap
    const hasSnow = seasonId === 2 || clusterScale >= 2 || (mTier && mTier >= 1) || hVal > 0.2;
    if (hasSnow) {
      const sc = seasonId === 2
        ? 0.72
        : clusterScale === 4
          ? 0.58 + (mTier || 0) * 0.06
          : clusterScale === 3
            ? 0.50 + (mTier || 0) * 0.06
            : Math.min(0.68, 0.42 + (mTier || 0) * 0.08);

      const lerp = (q1, q2, f) => [q1[0] + (q2[0] - q1[0]) * f, q1[1] + (q2[1] - q1[1]) * f];
      const sL = lerp(L, peak, 1 - sc);
      const sR = lerp(R, peak, 1 - sc);
      const sB = lerp(B, peak, 1 - sc);
      const sT = lerp(T, peak, 1 - sc);

      poly(ctx, [sL, sT, peak], '#e8eff7');
      poly(ctx, [sR, sT, peak], '#dce5f0');
      poly(ctx, [sL, sB, peak], '#ffffff');
      poly(ctx, [sR, sB, peak], '#e6edf5');

      if (light) {
        if (dotLeft > 0) poly(ctx, [sL, sB, peak], `rgba(255, 252, 235, ${dotLeft * 0.25})`);
        else poly(ctx, [sL, sB, peak], `rgba(60, 80, 130, ${(-dotLeft) * 0.22})`);
        if (dotRight > 0) poly(ctx, [sR, sB, peak], `rgba(255, 252, 235, ${dotRight * 0.25})`);
        else poly(ctx, [sR, sB, peak], `rgba(60, 80, 130, ${(-dotRight) * 0.22})`);
      }

      ctx.strokeStyle = '#ffffffaa';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sL[0], sL[1]);
      ctx.lineTo(sB[0], sB[1]);
      ctx.lineTo(sR[0], sR[1]);
      ctx.stroke();
    }

    // Atmospheric summit cloud streamers / wisp for large mountains & massifs
    if (clusterScale >= 3 || (mTier && mTier >= 1)) {
      const mistPhase = (t * 0.00025 + x * 0.17 + y * 0.23) % 1;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      const mistY = peak[1] + (clusterScale === 4 ? 22 : 12);
      const mistW = clusterScale === 4 ? 16 : 11;
      ctx.ellipse(peak[0] - 10 + mistPhase * 30, mistY, mistW, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  const sh = (ty === 1 || ty === 5) && sandy(grid, x, y);

  if (ty === 4) crops(ctx, x, y, sx, sy, t, seasonId);

  // Decorative Fences & Hedges (Feature 5.1)
  if (ty === 4 || (ty === 1 && !sh && cnt(grid, x, y, 5) > 0 && hash(x + 7, y + 4) > 0.45)) {
    const T = [sx, sy - H / 2];
    const R = [sx + W / 2, sy];
    const B = [sx, sy + H / 2];
    const Lf = [sx - W / 2, sy];
    const E = [
      [Lf, T, ...fromRotated(-1, 0, rot)],
      [T, R, ...fromRotated(0, -1, rot)],
      [R, B, ...fromRotated(1, 0, rot)],
      [B, Lf, ...fromRotated(0, 1, rot)]
    ];

    if (ty === 4) {
      for (const [p1, p2, dx, dy] of E) {
        if (at(grid, x + dx, y + dy) === 4) continue;
        ctx.strokeStyle = p.fl;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1] - 4);
        ctx.lineTo(p2[0], p2[1] - 4);
        ctx.moveTo(p1[0], p1[1] - 1.5);
        ctx.lineTo(p2[0], p2[1] - 1.5);
        for (const u of [0, 0.5, 1]) {
          const px = p1[0] + (p2[0] - p1[0]) * u;
          const py = p1[1] + (p2[1] - p1[1]) * u;
          ctx.moveTo(px, py);
          ctx.lineTo(px, py - 5.5);
        }
        ctx.stroke();

        if (hash(x * 3 + dx, y * 5 + dy) > 0.4) {
          ctx.fillStyle = p.tree[0];
          ctx.beginPath();
          ctx.ellipse((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 - 1.5, 3.2, 1.8, 0, 0, 7);
          ctx.fill();
        }
      }
    } else {
      for (const [p1, p2, dx, dy] of E) {
        if (at(grid, x + dx, y + dy) === 5) {
          ctx.fillStyle = p.tree[0];
          ctx.beginPath();
          for (let u = 0.25; u <= 0.75; u += 0.25) {
            const px = p1[0] + (p2[0] - p1[0]) * u;
            const py = p1[1] + (p2[1] - p1[1]) * u;
            ctx.ellipse(px, py - 2, 2.8, 2, 0, 0, 7);
          }
          ctx.fill();

          ctx.strokeStyle = p.fl;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1] - 3);
          ctx.lineTo(p2[0], p2[1] - 3);
          for (let u = 0.25; u <= 0.75; u += 0.25) {
            const px = p1[0] + (p2[0] - p1[0]) * u;
            const py = p1[1] + (p2[1] - p1[1]) * u;
            ctx.moveTo(px, py);
            ctx.lineTo(px, py - 4.5);
          }
          ctx.stroke();
        }
      }
    }
  }

  if (ty === 1) {
    ctx.strokeStyle = G[1];
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = hash(x + i * 5, y + i * 3) - 0.5;
      const b = hash(y + i, x + i * 9) - 0.5;
      ctx.moveTo(sx + a * W * 0.6, sy + b * H * 0.6);
      ctx.lineTo(sx + a * W * 0.6 + 1, sy + b * H * 0.6 - 4);
    }
    ctx.stroke();
  }

  if (ty === 1 && !sh && hash(x + 9, y + 2) > 0.7) {
    const flwWind = getTreeWind(t, sx, sy, 10, hash(x, y));
    const flwSway = flwWind.swayX * 0.35;
    ctx.fillStyle = ['#ffffff', '#ffd3e0', '#ffe27a'][(hash(x, y) * 3) | 0];
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(sx + (hash(x + i, y) - 0.5) * 30 + flwSway, sy + (hash(y + i, x) - 0.5) * 12, 1.6, 0, 7);
      ctx.fill();
    }
  }

  const forest = getForestParams(grid, x, y);
  if (forest) {
    const { feature, species, hT, hSp } = forest;
    if (feature === 'fallen_log') {
      // Fallen tree trunk spanning across 2+ blocks
      const x0 = sx - 4 + (hT - 0.5) * 6;
      const y0 = sy + 2 + (hash(y, x) - 0.5) * 4;
      const dx = (hash(x * 11, y * 13) > 0.5 ? 1 : -1) * (28 + hT * 10);
      const dy = (hash(x * 7, y * 19) > 0.5 ? 1 : 0.4) * (14 + hT * 5);
      const x1 = x0 + dx;
      const y1 = y0 + dy;

      // Root ball / splintered base at (x0, y0)
      ctx.fillStyle = '#4a2f1c';
      ctx.beginPath();
      ctx.arc(x0, y0 - 1.5, 4.2, 0, 7);
      ctx.fill();

      // Jagged root flares
      ctx.strokeStyle = '#382213';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 - 4, y0 + 3);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 - 5, y0 - 3);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + 1, y0 - 5);
      ctx.stroke();

      // Trunk cylinder body
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 2.8;
      const ny = (dx / len) * 1.8;

      poly(ctx, [
        [x0 + nx, y0 + ny],
        [x1 + nx * 0.7, y1 + ny * 0.7],
        [x1 - nx * 0.7, y1 - ny * 0.7],
        [x0 - nx, y0 - ny]
      ], '#5c3d25');

      // Trunk top highlight / bark grain
      ctx.strokeStyle = '#7d5535';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x0 + nx * 0.3, y0 + ny * 0.3);
      ctx.lineTo(x1 + nx * 0.2, y1 + ny * 0.2);
      ctx.stroke();

      // Moss patch on top of the old log
      ctx.fillStyle = seasonId === 2 ? '#e8edf2' : '#4e8236';
      ctx.beginPath();
      const mx = x0 + dx * 0.45;
      const my = y0 + dy * 0.45;
      ctx.ellipse(mx, my - 1, 6, 2.5, Math.atan2(dy, dx), 0, 7);
      ctx.fill();

      // Broken cut cross-section with annual growth rings at tip (x1, y1)
      ctx.fillStyle = '#d6b88b';
      ctx.beginPath();
      ctx.ellipse(x1, y1, 2.6, 2, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = '#9c7349';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(x1, y1, 1.2, 0, 7);
      ctx.stroke();

      // Little woodland shelf mushrooms on the side
      ctx.fillStyle = '#fce49f';
      ctx.beginPath();
      ctx.arc(mx - 2, my + 2, 1.3, 0, 7);
      ctx.arc(mx + 3, my + 3, 1.5, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#e64a38';
      ctx.beginPath();
      ctx.arc(mx - 2, my + 1.2, 1.4, Math.PI, 0);
      ctx.arc(mx + 3, my + 2.1, 1.6, Math.PI, 0);
      ctx.fill();
    } else if (feature === 'stump') {
      // Cut tree stump with growth rings & axe or mushrooms
      const px = sx + (hT - 0.5) * 8;
      const py = sy + (hash(y, x) - 0.5) * 5;

      // Roots spreading into ground
      ctx.strokeStyle = '#422a19';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py + 1);
      ctx.lineTo(px - 4, py + 3);
      ctx.moveTo(px, py + 1);
      ctx.lineTo(px + 4, py + 3);
      ctx.moveTo(px, py - 1);
      ctx.lineTo(px + 3, py - 3);
      ctx.stroke();

      // Stump base bark
      ctx.fillStyle = '#543621';
      ctx.fillRect(px - 3.5, py - 4, 7, 5);

      // Stump top heartwood with rings
      ctx.fillStyle = '#d9b98c';
      ctx.beginPath();
      ctx.ellipse(px, py - 4, 3.5, 2, 0, 0, 7);
      ctx.fill();

      ctx.strokeStyle = '#8c5e32';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(px, py - 4, 2, 1.1, 0, 0, 7);
      ctx.stroke();

      // Embedded axe or shelf fungus
      if (hSp > 0.5) {
        ctx.strokeStyle = '#856447';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px + 0.5, py - 4);
        ctx.lineTo(px + 4, py - 10);
        ctx.stroke();

        poly(ctx, [
          [px + 0.5, py - 4],
          [px - 2.5, py - 5.5],
          [px - 1, py - 7],
          [px + 2, py - 5]
        ], '#7b8794');
      } else {
        ctx.fillStyle = '#3f732c';
        ctx.beginPath();
        ctx.arc(px - 2.5, py - 2, 1.5, 0, 7);
        ctx.fill();

        ctx.fillStyle = '#c7783a';
        ctx.beginPath();
        ctx.ellipse(px + 3.2, py - 2.5, 2, 1, 0, 0, 7);
        ctx.fill();
      }
    } else if (feature === 'grove3') {
      // Dense grove of 3 trees, rendered back-to-front with wind animation
      drawTree(ctx, sx + 1, sy - 6, species, 21, seasonId, p, light, t, hash(x * 17, y * 23));
      drawTree(ctx, sx - 6, sy + 1, (species + 1) % 4, 23, seasonId, p, light, t, hash(x * 29, y * 31));
      drawTree(ctx, sx + 7, sy + 3, (species + 2) % 4, 18, seasonId, p, light, t, hash(x * 41, y * 43));

      // Forest floor detail: mushrooms / berries
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(sx - 1, sy + 4, 1.2, 0, 7);
      ctx.arc(sx + 2, sy + 5, 1.1, 0, 7);
      ctx.fill();
    } else if (feature === 'twin') {
      // Parent + sapling pair, rendered back-to-front with wind animation
      drawTree(ctx, sx + 6, sy - 2, (species + 2) % 4, 16, seasonId, p, light, t, hash(x * 19, y * 37));
      drawTree(ctx, sx - 4, sy + 2, species, 24, seasonId, p, light, t, hash(x * 23, y * 47));
    } else {
      // Solitary grand specimen tree with wind animation
      const px = sx + (hT - 0.5) * 4;
      const py = sy + (hash(x, y) - 0.5) * 3;
      drawTree(ctx, px, py, species, 27, seasonId, p, light, t, hash(x * 13, y * 71));
    }
  }

  if (ty === 5) building(ctx, grid, ox, oy, x, y, t, p, nt, light, rot);
}

export function tile(ctx, grid, ox, oy, x, y, t, p, seasonId, nt, light) {
  tileGround(ctx, grid, ox, oy, x, y, t, p, seasonId);
  tileShadow(ctx, grid, ox, oy, x, y, t, light);
  tileStructure(ctx, grid, ox, oy, x, y, t, p, seasonId, nt, light);
}

function parseHexColor(hex) {
  if (!hex || typeof hex !== 'string') return { r: 30, g: 63, b: 90 };
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16) || 0,
      g: parseInt(h[1] + h[1], 16) || 0,
      b: parseInt(h[2] + h[2], 16) || 0
    };
  }
  if (h.length >= 6) {
    return {
      r: parseInt(h.slice(0, 2), 16) || 0,
      g: parseInt(h.slice(2, 4), 16) || 0,
      b: parseInt(h.slice(4, 6), 16) || 0
    };
  }
  return { r: 30, g: 63, b: 90 };
}

export function ocean(ctx, cw, ch, sc, camx, camy, t, p, nt = 0, light = null, rot = 0, ox = 0, oy = 0) {
  const w = cw / sc;
  const h = ch / sc;
  const originX = ox || (w / 2 - camx);
  const originY = oy || (h / 2 - camy);

  // 1. Continuous atmospheric fog & lighting factors
  const fogCol = getAtmosphericFogColor(t, p, nt, light);
  const sunsetW = fogCol.sunsetWeight || 0;
  const dawnW = fogCol.dawnWeight || 0;
  const nightW = fogCol.nightWeight || 0;

  // 2. Deep Ocean Base: dynamically transitions with sunset/twilight and night
  const baseRgb = parseHexColor(p.wd);
  let baseR = baseRgb.r;
  let baseG = baseRgb.g;
  let baseB = baseRgb.b;

  if (sunsetW > 0) {
    // Rich twilight violet-navy ocean base
    baseR = Math.round(baseR * (1 - sunsetW) + 38 * sunsetW);
    baseG = Math.round(baseG * (1 - sunsetW) + 26 * sunsetW);
    baseB = Math.round(baseB * (1 - sunsetW) + 64 * sunsetW);
  }
  if (dawnW > 0) {
    baseR = Math.round(baseR * (1 - dawnW) + 40 * dawnW);
    baseG = Math.round(baseG * (1 - dawnW) + 34 * dawnW);
    baseB = Math.round(baseB * (1 - dawnW) + 68 * dawnW);
  }
  if (nightW > 0) {
    baseR = Math.round(baseR * (1 - nightW) + 4 * nightW);
    baseG = Math.round(baseG * (1 - nightW) + 9 * nightW);
    baseB = Math.round(baseB * (1 - nightW) + 26 * nightW);
  }

  ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
  ctx.fillRect(0, 0, w, h);

  // Gradual ambient depth gradient reflecting sunset / dawn sky onto ocean surface
  const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
  if (sunsetW > 0) {
    baseGrad.addColorStop(0, `rgba(${fogCol.r}, ${fogCol.g}, ${fogCol.b}, ${0.52 * sunsetW + 0.30 * (1 - sunsetW)})`);
    baseGrad.addColorStop(0.36, `rgba(${Math.round(fogCol.r * 0.9)}, ${Math.round(fogCol.g * 0.65)}, ${Math.round(fogCol.b * 0.7)}, ${0.30 * sunsetW + 0.14 * (1 - sunsetW)})`);
    baseGrad.addColorStop(0.72, `rgba(45, 24, 62, ${0.28 * sunsetW + 0.10 * (1 - sunsetW)})`);
    baseGrad.addColorStop(1, `rgba(18, 12, 38, ${0.38 * sunsetW + 0.22 * (1 - sunsetW)})`);
  } else {
    baseGrad.addColorStop(
      0,
      `rgba(${fogCol.r}, ${fogCol.g}, ${fogCol.b}, ${0.30 * (1 - nightW * 0.4)})`
    );
    baseGrad.addColorStop(
      0.42,
      `rgba(${Math.round(fogCol.r * 0.7)}, ${Math.round(fogCol.g * 0.85)}, ${Math.round(fogCol.b * 0.95)}, 0.14)`
    );
    baseGrad.addColorStop(
      1,
      `rgba(5, 20, 55, ${0.22 + 0.35 * nightW})`
    );
  }
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  // Sunset Sun Road / Specular Horizon Beam across the water
  if (sunsetW > 0.05) {
    ctx.save();
    const sunDirX = light ? light.lightDirX : -0.7;
    const sunScreenX = originX + sunDirX * (w * 0.38);

    // Warm specular reflection path on water stretching from the setting sun toward viewer
    const sunRefl = ctx.createLinearGradient(sunScreenX, 0, originX, h);
    sunRefl.addColorStop(0.00, `rgba(255, 195, 95, ${0.42 * sunsetW})`);
    sunRefl.addColorStop(0.25, `rgba(255, 155, 70, ${0.30 * sunsetW})`);
    sunRefl.addColorStop(0.55, `rgba(235, 110, 60, ${0.16 * sunsetW})`);
    sunRefl.addColorStop(1.00, 'rgba(160, 60, 50, 0)');

    ctx.fillStyle = sunRefl;
    ctx.fillRect(0, 0, w, h);

    // Broad ambient sunset horizon flare over water
    const flare = ctx.createRadialGradient(sunScreenX, h * 0.10, 10, sunScreenX, h * 0.40, w * 0.62);
    flare.addColorStop(0, `rgba(255, 205, 110, ${0.28 * sunsetW})`);
    flare.addColorStop(0.45, `rgba(255, 140, 60, ${0.10 * sunsetW})`);
    flare.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = flare;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Radial vignette centering around the island to create focal depth
  const rad = ctx.createRadialGradient(
    originX,
    originY,
    Math.min(w, h) * 0.28,
    originX,
    originY,
    Math.max(w, h) * 0.88
  );
  rad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  const vigCol = sunsetW > 0
    ? `rgba(22, 12, 38, ${0.20 + 0.16 * sunsetW})`
    : `rgba(4, 18, 42, ${0.18 + 0.26 * nightW})`;
  rad.addColorStop(1, vigCol);
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();

  // 3. PHYSICAL DISTANCE METRIC & EXTINCTION
  // Focal baseline anchored near foreground viewing plane
  const focalBaseline = originY + h * 0.38;
  const depthRange = h * 0.92;

  // Helper: compute continuous physical distance and Beer-Lambert extinction at any (px, py)
  const getAtmosphericExtinction = (px, py) => {
    const d = Math.max(0, (focalBaseline - py) / depthRange);
    const turb =
      Math.sin(px * 0.007 + t * 0.00028) * 0.07 +
      Math.cos((px - py) * 0.005 - t * 0.00019) * 0.05;
    const dynamicD = Math.max(0, d + turb);
    return 1.0 - Math.exp(-Math.pow(dynamicD, 1.35) * 1.85);
  };

  // 4. Multi-layered Isometric Wave Swells with Distance Blur & Defocus
  const swellSpacing = 32;
  const numSwells = Math.ceil((h + w * 0.5) / swellSpacing) + 6;
  const startJ = -Math.floor((w * 0.5) / swellSpacing) - 4;

  for (let j = startJ; j < numSwells; j++) {
    const baseOffset = j * swellSpacing + ((camy * 0.55 + camx * 0.28) % swellSpacing);
    const wavePhase = t / 1800 + j * 0.72;

    const midY = originY + (w * 0.5 - originX) * 0.5 + baseOffset;
    const swellDist = Math.max(0, (focalBaseline - midY) / depthRange);
    const swellExtinction = 1.0 - Math.exp(-Math.pow(swellDist, 1.35) * 1.85);

    // A. Trough shadow band
    const troughAlpha = (0.07 + 0.05 * Math.sin(wavePhase)) * (1 - swellExtinction * 0.85);
    if (troughAlpha > 0.005) {
      ctx.beginPath();
      const trR = Math.round(3 * (1 - sunsetW) + 24 * sunsetW);
      const trG = Math.round(20 * (1 - sunsetW) + 12 * sunsetW);
      const trB = Math.round(50 * (1 - sunsetW) + 48 * sunsetW);
      ctx.strokeStyle = `rgba(${trR}, ${trG}, ${trB}, ${troughAlpha})`;
      ctx.lineWidth = 3.6 + swellExtinction * 3.5;

      let started = false;
      for (let x = -40; x <= w + 40; x += 30) {
        const undulation =
          Math.sin((x - camx) / 75 + wavePhase) * 4.5 +
          Math.cos((x + camx) / 130 + t / 2400) * 2.5;
        const y = originY + (x - originX) * 0.5 + baseOffset + undulation;
        if (y < -30 || y > h + 30) continue;
        if (!started) {
          ctx.moveTo(x, y + 2);
          started = true;
        } else {
          ctx.lineTo(x, y + 2);
        }
      }
      if (started) ctx.stroke();
    }

    // B. Sunlit crest highlight line / foam cap
    const baseCrestAlpha = Math.max(
      0,
      0.045 + 0.075 * Math.sin(wavePhase) - fogCol.nightWeight * 0.04
    );
    const crestAlpha = baseCrestAlpha * (1 - swellExtinction * 0.72);

    if (crestAlpha > 0.005) {
      let crR = 255;
      let crG = 255;
      let crB = 255;
      if (sunsetW > 0) {
        crR = 255;
        crG = Math.round(255 * (1 - sunsetW) + 185 * sunsetW);
        crB = Math.round(255 * (1 - sunsetW) + 120 * sunsetW);
      }
      crR = Math.round(crR * (1 - swellExtinction) + fogCol.r * swellExtinction);
      crG = Math.round(crG * (1 - swellExtinction) + fogCol.g * swellExtinction);
      crB = Math.round(crB * (1 - swellExtinction) + fogCol.b * swellExtinction);

      if (swellExtinction > 0.22) {
        ctx.beginPath();
        const blurWidth = 4.5 + swellExtinction * 9.5;
        const blurAlpha = crestAlpha * 0.45;
        ctx.strokeStyle = `rgba(${crR}, ${crG}, ${crB}, ${blurAlpha})`;
        ctx.lineWidth = blurWidth;

        let started = false;
        for (let x = -40; x <= w + 40; x += 30) {
          const undulation =
            Math.sin((x - camx) / 75 + wavePhase) * 4.5 +
            Math.cos((x + camx) / 130 + t / 2400) * 2.5;
          const y = originY + (x - originX) * 0.5 + baseOffset + undulation;
          if (y < -30 || y > h + 30) continue;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        if (started) ctx.stroke();
      }

      ctx.beginPath();
      ctx.strokeStyle = `rgba(${crR}, ${crG}, ${crB}, ${crestAlpha})`;
      ctx.lineWidth = 1.4 + swellExtinction * 3.2;

      let started = false;
      for (let x = -40; x <= w + 40; x += 30) {
        const undulation =
          Math.sin((x - camx) / 75 + wavePhase) * 4.5 +
          Math.cos((x + camx) / 130 + t / 2400) * 2.5;
        const y = originY + (x - originX) * 0.5 + baseOffset + undulation;
        if (y < -30 || y > h + 30) continue;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (started) ctx.stroke();
    }
  }

  // 5. Counter-harmonic Shimmer Ripples
  const shimmerSpacing = 42;
  const numShimmers = Math.ceil((h + w * 0.5) / shimmerSpacing) + 6;
  for (let k = -4; k < numShimmers; k++) {
    const baseOffset = k * shimmerSpacing + ((-camy * 0.5 + camx * 0.25) % shimmerSpacing);
    const shimPhase = t / 1400 + k * 1.1;
    const midY = originY - (w * 0.5 - originX) * 0.5 + baseOffset;
    const shimDist = Math.max(0, (focalBaseline - midY) / depthRange);
    const shimExtinction = 1.0 - Math.exp(-Math.pow(shimDist, 1.35) * 1.85);

    const shimAlpha = Math.max(
      0,
      (0.035 + 0.04 * Math.sin(shimPhase) - fogCol.nightWeight * 0.03) *
        (1 - shimExtinction * 0.82)
    );
    if (shimAlpha <= 0.003) continue;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(${fogCol.r}, ${fogCol.g}, ${fogCol.b}, ${shimAlpha * (1 + sunsetW * 0.35)})`;
    ctx.lineWidth = 1.2 + shimExtinction * 3.5;

    let started = false;
    for (let x = -40; x <= w + 40; x += 36) {
      const undulation = Math.sin((x + camx) / 85 + shimPhase) * 3.5;
      const y = originY - (x - originX) * 0.5 + baseOffset + undulation;
      if (y < -30 || y > h + 30) continue;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (started) ctx.stroke();
  }

  // 6. Stylized Specular Sun Glints
  const numGlints = 70;
  for (let i = 0; i < numGlints; i++) {
    const gx = (((hash(i, 4) * w + camx * 0.4) % w) + w) % w;
    const gy = (((hash(i, 8) * h + camy * 0.4) % h) + h) % h;

    const glintExtinction = getAtmosphericExtinction(gx, gy);
    if (glintExtinction > 0.82) continue;

    const spPhase = Math.sin(t / 550 + i * 2.17);
    if (spPhase > 0.38) {
      const intensity =
        Math.pow((spPhase - 0.38) / 0.62, 2) * (1 - glintExtinction * 0.75);
      const size = 1.2 + hash(i, 11) * 2.2;

      let glR = 255;
      let glG = 255;
      let glB = 255;
      if (sunsetW > 0) {
        glR = 255;
        glG = Math.round(255 * (1 - sunsetW) + 180 * sunsetW);
        glB = Math.round(255 * (1 - sunsetW) + 95 * sunsetW);
      }
      const glintR = Math.round(glR * (1 - glintExtinction) + fogCol.r * glintExtinction);
      const glintG = Math.round(glG * (1 - glintExtinction) + fogCol.g * glintExtinction);
      const glintB = Math.round(glB * (1 - glintExtinction) + fogCol.b * glintExtinction);
      const glintColor = `rgba(${glintR}, ${glintG}, ${glintB}, ${intensity * (0.85 + sunsetW * 0.35)})`;

      if (glintExtinction > 0.32) {
        ctx.fillStyle = glintColor;
        ctx.beginPath();
        ctx.arc(gx, gy, size * 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = glintColor;
        ctx.fillStyle = glintColor;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(gx - size * 1.8, gy);
        ctx.lineTo(gx + size * 1.8, gy);
        ctx.moveTo(gx, gy - size * 1.2);
        ctx.lineTo(gx, gy + size * 1.2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(gx, gy, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

/**
 * Top 10% blur gradient starting at 1st %, fading away at 10th %.
 * Clean, serene atmospheric depth without wavy lines or dark bubbles.
 */
export function drawRegionalAtmosphericFog(ctx, cw, ch, sc, ox, oy, t, p, nt = 0, light = null) {
  const w = cw / sc;
  const h = ch / sc;
  const fogCol = getAtmosphericFogColor(t, p, nt, light);

  const y1 = h * 0.01;   // 1st %
  const y10 = h * 0.10;  // 10th %
  if (y10 <= 0) return;

  ctx.save();

  // Top 10% blur gradient starting at 1st %, fading away at 10th %
  const fogGrad = ctx.createLinearGradient(0, 0, 0, y10);
  const maxAlpha = 0.82 * (1 - fogCol.nightWeight * 0.35);

  // 0% to 1st %: full atmospheric gradient
  fogGrad.addColorStop(0, `rgba(${fogCol.r}, ${fogCol.g}, ${fogCol.b}, ${maxAlpha})`);
  fogGrad.addColorStop(0.10, `rgba(${fogCol.r}, ${fogCol.g}, ${fogCol.b}, ${maxAlpha})`); // 1st %
  // Smoothly fading away to 0 at 10th %
  fogGrad.addColorStop(0.35, `rgba(${fogCol.r}, ${fogCol.g}, ${fogCol.b}, ${maxAlpha * 0.65})`);
  fogGrad.addColorStop(0.70, `rgba(${fogCol.r}, ${fogCol.g}, ${fogCol.b}, ${maxAlpha * 0.22})`);
  fogGrad.addColorStop(1.0, `rgba(${fogCol.r}, ${fogCol.g}, ${fogCol.b}, 0)`); // 10th %

  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, 0, w, y10);

  ctx.restore();
}

export function sky() {
  // Sun removed per user request
}

export function cloudShadows(ctx, cw, ch, sc, t, nt, light, ox, oy) {
  if (!light || light.alt <= -0.15) return;
  const w = cw / sc;
  const h = ch / sc;
  const baseAlpha = Math.max(0.03, Math.min(0.20, light.shadowAlpha * 0.95 * (1 - nt * 0.75)));
  const dx = light.dx;
  const dy = light.dy;

  ctx.save();
  for (let i = 0; i < 4; i++) {
    const cloudX = ((t / 70 + (i * w) / 4 * 1.3) % (w + 320)) - 160;
    const cloudY = 45 + i * 38;

    // Physical altitude offset based on sun angle
    const shadowX = cloudX + dx * 85;
    const shadowY = cloudY + dy * 85 + 75;

    if (shadowX < -150 || shadowX > w + 150 || shadowY < -150 || shadowY > h + 150) continue;

    ctx.fillStyle = `rgba(8, 22, 50, ${baseAlpha})`;
    ctx.beginPath();
    for (const [a, b, r] of [
      [0, 0, 22],
      [24, -8, 28],
      [54, 0, 22],
      [28, 6, 20]
    ]) {
      // Flattened isometric ground shadow projection
      ctx.moveTo(shadowX + a + r * 1.4, shadowY + b * 0.6);
      ctx.ellipse(shadowX + a, shadowY + b * 0.6, r * 1.4, r * 0.72, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();
}

export function clouds(ctx, cw, sc, t, nt, light = null) {
  const w = cw / sc;
  const d = 1 - nt;
  if (d <= 0.05) return;

  for (let i = 0; i < 4; i++) {
    const x = ((t / 70 + (i * w) / 4 * 1.3) % (w + 320)) - 160;
    const y = 45 + i * 38;

    const lobes = [
      [0, 0, 16],
      [18, -6, 20],
      [40, 0, 15],
      [20, 4, 14]
    ];

    // 1. Underside ambient shadow for 3D volumetric puffiness
    ctx.fillStyle = `rgba(185, 205, 230, ${0.45 * d})`;
    ctx.beginPath();
    for (const [a, b, r] of lobes) {
      ctx.moveTo(x + a + r, y + b + 3.5);
      ctx.arc(x + a, y + b + 3.5, r, 0, Math.PI * 2);
    }
    ctx.fill();

    // 2. Main sunlit cloud puff
    ctx.fillStyle = `rgba(255, 255, 255, ${0.78 * d})`;
    ctx.beginPath();
    for (const [a, b, r] of lobes) {
      ctx.moveTo(x + a + r, y + b);
      ctx.arc(x + a, y + b, r, 0, Math.PI * 2);
    }
    ctx.fill();

    // 3. Crisp sunlit rim highlight on top lobes
    ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * d})`;
    ctx.beginPath();
    ctx.arc(x + 18, y - 8, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBoat(ctx, px, py0, v, timestamp, light, rot = 0) {
  // 1. Realistic Buoyancy & Physics anchored continuously to grid plane
  const phase = v.bobPhase !== undefined ? v.bobPhase : (timestamp / 820);
  const bob = Math.sin(phase) * 1.1;
  const roll = (v.roll !== undefined ? v.roll : 0) + Math.cos(phase * 0.9) * 0.04;
  const py = py0 + bob;

  // Continuous smoothed heading on screen
  const heading = v.curHeading !== undefined ? v.curHeading : Math.atan2(v.ty - v.ay, v.tx - v.ax);
  const [rdx, rdy] = toRotated(Math.cos(heading), Math.sin(heading), rot);
  const moveAngle = Math.atan2(rdy * (H / 2), rdx * (W / 2));
  const isMoving = (v.tx !== v.ax || v.ty !== v.ay || (v.speed !== undefined && v.speed > 0.001));

  // Colors
  const hullMain = v.hullColor || '#7c4826';
  const hullShade = '#4e2a14';
  const deckColor = '#bc8f5b';
  const sailColor = v.sailColor || '#f8fafc';
  const pennantColor = v.pennantColor || '#ef4444';

  ctx.save();
  ctx.translate(px, py);

  // 2. Realistic Water Wake & Displacement Ripples
  if (isMoving) {
    const wakePhase = (phase * 0.8) % 1;
    const oppX = -Math.cos(moveAngle);
    const oppY = -Math.sin(moveAngle);

    // V-shaped wake trailing behind stern
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * (1 - wakePhase)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(oppX * 8, 2 + oppY * 4);
    ctx.lineTo(oppX * (13 + wakePhase * 9) - oppY * 6, 2.5 + oppY * (6.5 + wakePhase * 4.5) + oppX * 2.5);
    ctx.moveTo(oppX * 8, 2 + oppY * 4);
    ctx.lineTo(oppX * (13 + wakePhase * 9) + oppY * 6, 2.5 + oppY * (6.5 + wakePhase * 4.5) - oppX * 2.5);
    ctx.stroke();

    // Bow foam splash
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(-oppX * 8, 2 - oppY * 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Idle gentle water ripple around hull
    const rip = (phase * 0.4) % 1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * (1 - rip)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 2.5, 9 + rip * 4, 4 + rip * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Hull tilt roll
  ctx.rotate(roll);

  // 3. Faceted Low-Poly Wooden Hull
  // Shaded bottom/waterline
  poly(ctx, [
    [-9, 0],
    [9, 0],
    [6, 4.5],
    [-6, 4.5]
  ], hullShade);

  // Top deck & gunwales
  poly(ctx, [
    [-9.5, -0.8],
    [9.5, -0.8],
    [8, 1.8],
    [-8, 1.8]
  ], hullMain);

  // Inner deck planking
  poly(ctx, [
    [-7.5, -0.4],
    [7.5, -0.4],
    [6.2, 1.2],
    [-6.2, 1.2]
  ], deckColor);

  // Bench / cargo crate on deck
  poly(ctx, [
    [-3, -1],
    [2, -1],
    [2, 0.5],
    [-3, 0.5]
  ], '#63391d');

  // 4. Wooden Mast & Rigging
  ctx.strokeStyle = '#3e2210';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -17);
  ctx.stroke();

  // Rigging stay lines
  ctx.strokeStyle = 'rgba(240, 230, 215, 0.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(-8, 0);
  ctx.moveTo(0, -16);
  ctx.lineTo(8, 0);
  ctx.stroke();

  // 5. Billowing Curved Canvas Sail
  const billow = Math.sin(timestamp / 500 + v.ax * 2) * 1.5;
  ctx.fillStyle = sailColor;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.quadraticCurveTo(5 + billow, -9, 8.5, -2);
  ctx.lineTo(0.5, -2.5);
  ctx.closePath();
  ctx.fill();

  // Soft shaded crease on sail
  ctx.strokeStyle = 'rgba(180, 165, 145, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(4 + billow * 0.5, -2.2);
  ctx.stroke();

  // 6. Fluttering Masthead Pennant Flag
  const pennantWave = Math.sin(timestamp / 220 + v.ax) * 2;
  ctx.fillStyle = pennantColor;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(-6, -17.5 + pennantWave);
  ctx.lineTo(-4.5, -16 + pennantWave * 0.5);
  ctx.lineTo(0, -15.5);
  ctx.closePath();
  ctx.fill();

  // 7. Cozy Night Lantern
  if (v.hasLantern) {
    const ntVal = light ? light.nt : 0;
    // Lantern bracket
    ctx.strokeStyle = '#26170d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8.5, -0.5);
    ctx.lineTo(10.5, -2);
    ctx.lineTo(10.5, -0.5);
    ctx.stroke();

    // Lantern box
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(9.5, -1.8, 2, 2.5);

    // Warm amber glow at sunset and night
    if (ntVal > 0.15 || light?.alt < 0.25) {
      const glowAlpha = Math.min(0.45, 0.2 + ntVal * 0.25);
      const glow = ctx.createRadialGradient(10.5, -0.5, 1, 10.5, -0.5, 9);
      glow.addColorStop(0, `rgba(255, 210, 100, ${glowAlpha})`);
      glow.addColorStop(1, 'rgba(255, 180, 50, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(10.5, -0.5, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawVillager(ctx, px, py0, v, timestamp, light, rot = 0) {
  // 1. Natural Locomotion & Stride Physics
  const mdx = v.tx - v.ax;
  const mdy = v.ty - v.ay;
  const isWalking = (mdx !== 0 || mdy !== 0) && v.p > 0 && v.p < 1;
  const walkCycle = isWalking ? v.p * Math.PI * 4 : 0;

  // Vertical bounce & forward lean
  const bounce = isWalking ? Math.abs(Math.sin(walkCycle)) * 1.8 : Math.sin(timestamp / 750 + v.ax * 3) * 0.4;

  // Stride swing angles
  const legSwing = isWalking ? Math.sin(walkCycle) * 3.2 : 0;
  const armSwing = isWalking ? Math.sin(walkCycle) * 2.4 : Math.sin(timestamp / 900 + v.ay) * 0.6;

  // Facing direction: check travel vector in rotated view
  const [rdx, rdy] = toRotated(mdx, mdy, rot);
  const facingRight = rdx > rdy;

  // Human scale: proportioned accurately to house doors (~7px tall) and boats (~18px long)
  const humanScale = 0.48;

  ctx.save();
  ctx.translate(px, py0);
  ctx.scale(humanScale, humanScale);
  ctx.translate(0, -bounce);

  // 2. Legs & Boots (swinging in realistic opposition)
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  // Left leg
  ctx.moveTo(-1.2, -3);
  ctx.lineTo(-1.2 - legSwing * 0.5, 0.5);
  // Right leg
  ctx.moveTo(1.2, -3);
  ctx.lineTo(1.2 + legSwing * 0.5, 0.5);
  ctx.stroke();

  // Boots
  ctx.fillStyle = '#27170c';
  ctx.fillRect(-2.2 - legSwing * 0.5, -0.2, 2.0, 1.4);
  ctx.fillRect(0.4 + legSwing * 0.5, -0.2, 2.0, 1.4);

  // 3. Tunic / Garment Body
  ctx.fillStyle = v.c;
  ctx.beginPath();
  ctx.ellipse(0, -6.5, 3.2, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark leather waist belt
  ctx.strokeStyle = '#2b1810';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-3, -4.5);
  ctx.lineTo(3, -4.5);
  ctx.stroke();

  // Little belt buckle
  ctx.fillStyle = '#d97706';
  ctx.fillRect(-0.8, -5.3, 1.6, 1.6);

  // 4. Arms & Hands (swinging in natural counter-phase)
  ctx.strokeStyle = v.c;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  // Left arm
  ctx.moveTo(-2.8, -8.5);
  ctx.lineTo(-3.6 + armSwing * 0.6, -4.5);
  // Right arm
  ctx.moveTo(2.8, -8.5);
  ctx.lineTo(3.6 - armSwing * 0.6, -4.5);
  ctx.stroke();

  // Hands
  ctx.fillStyle = '#f5d3b0';
  ctx.beginPath();
  ctx.arc(-3.6 + armSwing * 0.6, -4.5, 1.0, 0, Math.PI * 2);
  ctx.arc(3.6 - armSwing * 0.6, -4.5, 1.0, 0, Math.PI * 2);
  ctx.fill();

  // 5. Satchel / Traveler Bag
  if (v.hasBag) {
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2.5, -9);
    ctx.lineTo(2.8, -4);
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.roundRect(2, -5.2, 2.8, 3.2, 0.8);
    ctx.fill();
  }

  // 6. Head & Hair
  ctx.fillStyle = '#f5d3b0';
  ctx.beginPath();
  ctx.arc(0, -11.5, 2.7, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  const hairColor = v.hair || '#3d2817';
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(0, -12.5, 2.8, Math.PI * 0.8, Math.PI * 2.2);
  ctx.fill();

  // Eyes (look in movement direction)
  const eyeOffset = facingRight ? 0.6 : -0.6;
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(eyeOffset - 0.7, -11.4, 0.65, 0, Math.PI * 2);
  ctx.arc(eyeOffset + 0.7, -11.4, 0.65, 0, Math.PI * 2);
  ctx.fill();

  // 7. Hats & Headwear Variety
  const hat = v.hat || 'none';
  if (hat === 'straw') {
    // Straw farmer hat: wide woven brim + ribbon
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.ellipse(0, -13.5, 5.2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crown
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.ellipse(0, -15, 2.8, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ribbon band
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -14.2, 2.8, 1.1, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (hat === 'cap' || hat === 'beret') {
    // Slanted wool cap / beret
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.ellipse(0.8, -13.8, 3.5, 1.8, 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Little stalk
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(1.5, -15.8, 1.2, 1.6);
  } else if (hat === 'bandana') {
    // Headband / Bandana
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(0, -12.8, 3.0, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    // Knot tie
    ctx.fillRect(-3.2, -13.2, 1.6, 2.0);
  }

  ctx.restore();
}

export function tileAt(mx, my, cw, ch, sc, ox, oy, grid, rot = 0) {
  const wx = mx / sc;
  const wy = my / sc;
  const a = ((wx - ox) * 2) / W;
  const b = ((wy - oy) * 2) / H;
  const rgx = Math.round((a + b) / 2);
  const rgy = Math.round((b - a) / 2);

  for (let s = rgx + rgy + 6; s >= rgx + rgy - 6; s--) {
    for (let rx = rgx + 6; rx >= rgx - 6; rx--) {
      const ry = s - rx;
      if (Math.abs(ry - rgy) > 6) continue;
      const [x, y] = fromRotated(rx, ry, rot);
      const [sx, sy] = P(ox, oy, x, y, ht(grid, x, y), rot);
      if (Math.abs(wx - sx) / (W / 2) + Math.abs(wy - sy) / (H / 2) <= 1) {
        return [x, y];
      }
    }
  }
  return null;
}
