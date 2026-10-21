import { walk, at } from './engine';
import { TALK_MESSAGES } from './constants';
import { updateBirds } from './birds';
import { updateMarineLife } from './marine';

const VILLAGER_COLORS = ['#d9694f', '#4f86c6', '#e0a63a', '#8a6fd0', '#3f9a74', '#e11d48', '#059669'];
const HAT_TYPES = ['straw', 'cap', 'bandana', 'none', 'none', 'beret'];
const HAIR_COLORS = ['#3d2817', '#1a1a1a', '#78350f', '#b45309', '#d97706'];

export function countHomes(grid) {
  let count = 0;
  for (const v of grid.values()) {
    if (v === 5) count++;
  }
  return count;
}

export function pickVillagerTarget(v, grid) {
  const options = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) =>
    walk(grid, v.ax + dx, v.ay + dy)
  );

  if (!walk(grid, v.ax, v.ay)) {
    v.dead = true;
    return;
  }

  if (options.length) {
    const [dx, dy] = options[(Math.random() * options.length) | 0];
    v.tx = v.ax + dx;
    v.ty = v.ay + dy;
  } else {
    v.tx = v.ax;
    v.ty = v.ay;
  }
}

export function spawnVillager(grid, villagers) {
  const homeKeys = [];
  for (const [k, v] of grid) {
    if (v === 5) homeKeys.push(k);
  }
  if (!homeKeys.length) return;

  const h = homeKeys[(Math.random() * homeKeys.length) | 0];
  const hx = Math.floor(h / 100003) - 50000;
  const hy = (h % 100003) - 50000;

  const options = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) =>
    walk(grid, hx + dx, hy + dy)
  );
  if (!options.length) return;

  const [dx, dy] = options[(Math.random() * options.length) | 0];
  const villager = {
    ax: hx + dx,
    ay: hy + dy,
    tx: hx + dx,
    ty: hy + dy,
    p: 0,
    c: VILLAGER_COLORS[(Math.random() * VILLAGER_COLORS.length) | 0],
    hat: HAT_TYPES[(Math.random() * HAT_TYPES.length) | 0],
    hair: HAIR_COLORS[(Math.random() * HAIR_COLORS.length) | 0],
    hasBag: Math.random() < 0.45
  };

  villagers.push(villager);
  pickVillagerTarget(villager, grid);
}

export function countLandNeighbors(grid, x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (at(grid, x + dx, y + dy) !== 0) count++;
    }
  }
  return count;
}

export function isNavigableWater(grid, x, y) {
  // Tile itself must be water
  if (at(grid, x, y) !== 0) return false;
  // Must have clearance from shore: no direct orthogonal land neighbors
  // so the boat never clips into beach sand fillets, cliffs, or breaking surf
  if (
    at(grid, x + 1, y) !== 0 ||
    at(grid, x - 1, y) !== 0 ||
    at(grid, x, y + 1) !== 0 ||
    at(grid, x, y - 1) !== 0
  ) {
    return false;
  }
  return true;
}

export function updateSimulation(dt, grid, villagers, boats, birds = [], camCoords, talkState, marineLife = []) {
  const homes = countHomes(grid);
  const targetPopulation = Math.min(homes * 2, 36);

  // Villager count adjustments
  if (villagers.length < targetPopulation && Math.random() < 0.1) {
    spawnVillager(grid, villagers);
  }
  while (villagers.length > targetPopulation) {
    villagers.pop();
  }

  // Update boats
  const { mx, my } = camCoords;
  let activeBoats = boats.filter((v) => Math.hypot(v.ax - mx, v.ay - my) < 28);

  // Filter out any boat whose current or target position is on land
  activeBoats = activeBoats.filter((v) => {
    if (v.dead) return false;
    const curX = Math.round(v.ax);
    const curY = Math.round(v.ay);
    const tgtX = Math.round(v.tx);
    const tgtY = Math.round(v.ty);
    if (at(grid, curX, curY) !== 0 || at(grid, tgtX, tgtY) !== 0) return false;
    return (v.p += dt * 0.35) >= 0;
  });

  // Spawn new boats strictly in open navigable water
  if (activeBoats.length < 3 && Math.random() < 0.02) {
    const bx = Math.round(mx + (Math.random() - 0.5) * 22);
    const by = Math.round(my + (Math.random() - 0.5) * 22);
    if (isNavigableWater(grid, bx, by)) {
      activeBoats.push({
        b: true,
        ax: bx,
        ay: by,
        tx: bx,
        ty: by,
        p: 0,
        hullColor: ['#7c4826', '#8a5a3a', '#5c381e', '#2c5282'][(Math.random() * 4) | 0],
        sailColor: ['#f8fafc', '#fed7aa', '#fef3c7', '#e2e8f0'][(Math.random() * 4) | 0],
        hasLantern: Math.random() < 0.65,
        pennantColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'][(Math.random() * 4) | 0],
        curHeading: 0,
        bobPhase: Math.random() * 10,
        roll: 0
      });
    }
  }

  for (const v of activeBoats) {
    // Continuous wave buoyancy phase that never hops across tile bounds
    v.bobPhase = (v.bobPhase || 0) + dt * 2.1;

    // Smooth heading interpolation without snapping 90 degrees
    const curDx = v.tx - v.ax;
    const curDy = v.ty - v.ay;
    const isMoving = (curDx !== 0 || curDy !== 0);

    if (isMoving) {
      const tgtHeading = Math.atan2(curDy, curDx);
      if (v.curHeading === undefined) v.curHeading = tgtHeading;
      let dAngle = tgtHeading - v.curHeading;
      while (dAngle > Math.PI) dAngle -= Math.PI * 2;
      while (dAngle < -Math.PI) dAngle += Math.PI * 2;
      v.curHeading += dAngle * Math.min(1, dt * 3.5);

      // Smooth hydrodynamic roll into turns
      const targetRoll = Math.max(-0.11, Math.min(0.11, dAngle * 0.35));
      v.roll = (v.roll || 0) + (targetRoll - (v.roll || 0)) * Math.min(1, dt * 4.0);
    } else {
      v.roll = (v.roll || 0) * 0.95;
    }

    if (v.p >= 1) {
      v.ax = v.tx;
      v.ay = v.ty;
      v.p = 0;

      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

      // Safe navigable water with at least 1 tile clearance from land
      const safeOpts = dirs.filter(([dx, dy]) => isNavigableWater(grid, v.ax + dx, v.ay + dy));

      if (safeOpts.length) {
        // Prefer maintaining heading for natural cruising
        const straight = safeOpts.find(([dx, dy]) => dx === curDx && dy === curDy);
        if (straight && Math.random() < 0.72) {
          v.tx = v.ax + straight[0];
          v.ty = v.ay + straight[1];
        } else {
          const [dx, dy] = safeOpts[(Math.random() * safeOpts.length) | 0];
          v.tx = v.ax + dx;
          v.ty = v.ay + dy;
        }
      } else {
        // Fallback: steer towards whatever water tile has the fewest land neighbors (towards open sea)
        const waterOpts = dirs.filter(([dx, dy]) => at(grid, v.ax + dx, v.ay + dy) === 0);
        if (waterOpts.length) {
          waterOpts.sort(([dx1, dy1], [dx2, dy2]) => {
            const l1 = countLandNeighbors(grid, v.ax + dx1, v.ay + dy1);
            const l2 = countLandNeighbors(grid, v.ax + dx2, v.ay + dy2);
            return l1 - l2;
          });
          v.tx = v.ax + waterOpts[0][0];
          v.ty = v.ay + waterOpts[0][1];
        } else {
          // Trapped in an enclosed pond: remove boat
          v.dead = true;
        }
      }
    }
  }

  // Update villagers
  const aliveVillagers = villagers.filter((v) => !v.dead);
  for (const v of aliveVillagers) {
    v.p += dt * 0.9;
    if (v.p >= 1) {
      v.ax = v.tx;
      v.ay = v.ty;
      v.p = 0;
      pickVillagerTarget(v, grid);
    }
  }

  // Update birds
  const activeBirds = updateBirds(dt, birds, camCoords);

  // Update marine life (whales, dolphins, sharks, manta rays, fish schools)
  const activeMarineLife = updateMarineLife(dt, marineLife, grid, camCoords, talkState ? talkState.t : 0);

  // Random banter
  if (talkState && talkState.t - talkState.lastMsgAt > 7000) {
    talkState.lastMsgAt = talkState.t;
    talkState.currentMsg = homes
      ? TALK_MESSAGES[(Math.random() * TALK_MESSAGES.length) | 0]
      : 'Paint land, then build homes. Use Space or Move tool to pan, scroll to zoom.';
  }

  return {
    villagers: aliveVillagers,
    boats: activeBoats,
    birds: activeBirds,
    marineLife: activeMarineLife,
    homes
  };
}
