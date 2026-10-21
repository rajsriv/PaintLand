import { P, toRotated, ht, at } from './engine';
import { W, H } from './constants';

// Species definitions and visual parameters with realistic scale ratios
// (Tile = 32x16px, Boat = 18px, Villager = 14px)
export const MARINE_SPECIES = {
  whale: {
    id: 'whale',
    name: 'Humpback Whale',
    length: 32,
    width: 9.5,
    speed: 0.007, // Calm, majestic slow cruise
    maxCount: 2
  },
  dolphin: {
    id: 'dolphin',
    name: 'Bottlenose Dolphin',
    length: 10.5,
    width: 3.6,
    speed: 0.022, // Playful pod pace
    maxCount: 4
  },
  shark: {
    id: 'shark',
    name: 'Reef Shark',
    length: 14.0,
    width: 4.5,
    speed: 0.014, // Slow, stealthy prowl
    maxCount: 3
  },
  manta: {
    id: 'manta',
    name: 'Manta Ray',
    length: 10.0,
    width: 14.5,
    speed: 0.010, // Gentle gliding
    maxCount: 2
  },
  fish_school: {
    id: 'fish_school',
    name: 'School of Fish',
    length: 2.6, // Tiny slivers in schools
    width: 1.0,
    speed: 0.013, // Relaxed meandering
    maxCount: 5
  }
};

let nextCreatureId = 1;

// Helper to test if a position is in water and check clearance from shore
function getLandProximity(grid, x, y, checkRadius = 2.5) {
  const gx = Math.round(x);
  const gy = Math.round(y);
  let minLandDist = 999;
  let repX = 0;
  let repY = 0;
  const iRad = Math.ceil(checkRadius);

  for (let dy = -iRad; dy <= iRad; dy++) {
    for (let dx = -iRad; dx <= iRad; dx++) {
      if (at(grid, gx + dx, gy + dy) !== 0) {
        const d = Math.hypot(x - (gx + dx), y - (gy + dy));
        if (d < minLandDist) minLandDist = d;
        if (d < checkRadius && d > 0.001) {
          const w = (checkRadius - d) / checkRadius;
          repX += ((x - (gx + dx)) / d) * w;
          repY += ((y - (gy + dy)) / d) * w;
        }
      }
    }
  }

  return { minLandDist, repX, repY };
}

// Global active surface ripples & slicks across the ocean
let activeRipples = [];

// Spawn a new marine creature or pod strictly in open water far from land
export function spawnMarineCreature(grid, camX, camY, type) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 24;
    const x = camX + Math.cos(angle) * dist;
    const y = camY + Math.sin(angle) * dist;

    // Must be in water with at least 3 tiles clearance from any land
    const { minLandDist } = getLandProximity(grid, x, y, 3.2);
    if (minLandDist < 3.0) continue;

    const heading = Math.random() * Math.PI * 2;
    const id = nextCreatureId++;

    // 1. WHALE SPAWN
    if (type === 'whale') {
      return {
        id,
        type: 'whale',
        x,
        y,
        z: -0.32,
        heading,
        speed: 0.007,
        swimPhase: Math.random() * 10,
        state: 'cruising',
        stateTimer: 9000 + Math.random() * 9000,
        pitch: 0,
        spoutParticles: [],
        footprints: [],
        spine: [0, 0, 0, 0, 0, 0]
      };
    }

    // 2. SHARK SPAWN
    if (type === 'shark') {
      return {
        id,
        type: 'shark',
        x,
        y,
        z: -0.18,
        heading,
        speed: 0.014,
        baseSpeed: 0.014,
        swimPhase: Math.random() * 10,
        state: Math.random() < 0.5 ? 'finning' : 'patrolling',
        stateTimer: 7000 + Math.random() * 8000,
        wakeTrail: [],
        spineAngles: [0, 0, 0, 0, 0, 0, 0]
      };
    }

    // 3. MANTA RAY SPAWN
    if (type === 'manta') {
      return {
        id,
        type: 'manta',
        x,
        y,
        z: -0.22,
        heading,
        speed: 0.010,
        swimPhase: Math.random() * 10,
        state: 'gliding',
        stateTimer: 10000 + Math.random() * 10000,
        wingRoll: 0
      };
    }

    // 4. DOLPHIN POD SPAWN (Synchronized pairs in echelon formation)
    if (type === 'dolphin') {
      const podSize = 2 + (Math.random() < 0.35 ? 1 : 0);
      const pod = [];
      const leaderId = id;
      for (let i = 0; i < podSize; i++) {
        const podAngle = (i * Math.PI * 2) / podSize;
        pod.push({
          id: nextCreatureId++,
          type: 'dolphin',
          podLeaderId: leaderId,
          podIndex: i,
          x: x + Math.cos(podAngle) * (0.8 + i * 0.3),
          y: y + Math.sin(podAngle) * (0.8 + i * 0.3),
          z: -0.15,
          heading: heading + (Math.random() - 0.5) * 0.15,
          speed: 0.022,
          swimPhase: Math.random() * 10,
          state: 'cruising',
          stateTimer: 4000 + Math.random() * 6000 + i * 500,
          leapProgress: 0,
          leapDuration: 1.4,
          splashRipples: []
        });
      }
      return pod;
    }

    // 5. FISH SCHOOL (Tiny schooling slivers with burst-and-coast)
    if (type === 'fish_school') {
      const count = 12 + Math.floor(Math.random() * 8);
      const members = [];

      for (let i = 0; i < count; i++) {
        const ox = (Math.random() - 0.5) * 2.2;
        const oy = (Math.random() - 0.5) * 2.2;
        members.push({
          x: x + ox,
          y: y + oy,
          vx: Math.cos(heading) * 0.012,
          vy: Math.sin(heading) * 0.012,
          heading,
          speed: 0.012,
          burstPhase: Math.random() * Math.PI * 2,
          burstTimer: Math.random() * 2.0,
          isGliding: false,
          tailSway: 0,
          depth: -0.06 - Math.random() * 0.10,
          spineOffsets: [0, 0, 0, 0]
        });
      }

      return {
        id,
        type: 'fish_school',
        x,
        y,
        z: -0.10,
        heading,
        speed: 0.013,
        members,
        state: 'cruising',
        stateTimer: 6000 + Math.random() * 7000,
        scatterTimer: 0
      };
    }
  }
  return null;
}

// Update marine life simulation each frame
export function updateMarineLife(dt, creatures = [], grid, camCoords, timestamp) {
  const mx = camCoords ? (camCoords.mx !== undefined ? camCoords.mx : camCoords.x || 0) : 0;
  const my = camCoords ? (camCoords.my !== undefined ? camCoords.my : camCoords.y || 0) : 0;
  const timeStep = Math.min(0.06, Math.max(0.001, dt));

  // Maintain population balance
  const counts = { whale: 0, dolphin: 0, shark: 0, manta: 0, fish_school: 0 };
  for (let i = 0; i < creatures.length; i++) {
    const c = creatures[i];
    if (counts[c.type] !== undefined) counts[c.type]++;
  }

  // Desired population quotas
  if (counts.fish_school < 5) {
    const s = spawnMarineCreature(grid, mx, my, 'fish_school');
    if (s) creatures.push(s);
  }
  if (counts.dolphin < 4) {
    const d = spawnMarineCreature(grid, mx, my, 'dolphin');
    if (d) {
      if (Array.isArray(d)) creatures.push(...d);
      else creatures.push(d);
    }
  }
  if (counts.whale < 2) {
    const w = spawnMarineCreature(grid, mx, my, 'whale');
    if (w) creatures.push(w);
  }
  if (counts.shark < 3) {
    const sh = spawnMarineCreature(grid, mx, my, 'shark');
    if (sh) creatures.push(sh);
  }
  if (counts.manta < 2) {
    const m = spawnMarineCreature(grid, mx, my, 'manta');
    if (m) creatures.push(m);
  }

  // Update standalone surface ripples and slicks
  for (let r = activeRipples.length - 1; r >= 0; r--) {
    const rip = activeRipples[r];
    rip.age += timeStep;
    rip.radius += rip.growthRate * timeStep;
    rip.alpha = Math.max(0, 1 - rip.age / rip.maxAge);
    if (rip.age >= rip.maxAge) {
      activeRipples.splice(r, 1);
    }
  }

  // -----------------------------------------------------------------
  // UPDATE CREATURES
  // -----------------------------------------------------------------
  for (let i = 0; i < creatures.length; i++) {
    const c = creatures[i];
    c.swimPhase = (c.swimPhase || 0) + timeStep * 4.0;
    c.stateTimer -= timeStep * 1000;

    // Strict Shore / Land Repulsion (2.4 tiles buffer zone)
    const { minLandDist, repX, repY } = getLandProximity(grid, c.x, c.y, 2.6);
    if (minLandDist < 2.4) {
      // Steer heading smoothly away from land
      const awayAngle = Math.atan2(repY, repX);
      let diff = awayAngle - c.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.heading += diff * Math.min(1, timeStep * 4.5);

      // Nudge position away from land
      c.x += repX * timeStep * 1.5;
      c.y += repY * timeStep * 1.5;
    }

    // ---------------------------------------------------------------
    // 1. WHALE (Dorso-ventral undulation, spout plume, fluke slick)
    // ---------------------------------------------------------------
    if (c.type === 'whale') {
      if (c.stateTimer <= 0) {
        if (c.state === 'cruising') {
          c.state = 'surfacing';
          c.stateTimer = 4500;
        } else if (c.state === 'surfacing') {
          c.state = 'spouting';
          c.stateTimer = 3500;
          for (let sp = 0; sp < 26; sp++) {
            const spread = (Math.random() - 0.5) * 0.3;
            const spSpeed = 0.7 + Math.random() * 1.1;
            c.spoutParticles.push({
              x: c.x + Math.cos(c.heading) * 1.1,
              y: c.y + Math.sin(c.heading) * 1.1,
              vx: Math.cos(c.heading + Math.PI / 2) * spread * 0.15 + (Math.random() - 0.5) * 0.08,
              vy: Math.sin(c.heading + Math.PI / 2) * spread * 0.15 + (Math.random() - 0.5) * 0.08,
              vz: spSpeed,
              z: 0.08,
              age: 0,
              maxAge: 1.6 + Math.random() * 0.8,
              size: 2.0 + Math.random() * 2.5
            });
          }
        } else if (c.state === 'spouting') {
          c.state = 'sounding';
          c.stateTimer = 5500;
          activeRipples.push({
            x: c.x,
            y: c.y,
            radius: 1.0,
            growthRate: 1.4,
            age: 0,
            maxAge: 6.5,
            isFootprint: true
          });
        } else {
          c.state = 'cruising';
          c.stateTimer = 10000 + Math.random() * 10000;
        }
      }

      if (c.state === 'cruising') {
        c.z += (-0.32 - c.z) * 0.03;
        c.pitch += (0 - c.pitch) * 0.04;
      } else if (c.state === 'surfacing' || c.state === 'spouting') {
        c.z += (-0.02 - c.z) * 0.06;
        c.pitch += (0.10 - c.pitch) * 0.06;
      } else if (c.state === 'sounding') {
        c.z += (-0.48 - c.z) * 0.04;
        c.pitch += (-0.22 - c.pitch) * 0.05;
      }

      const waveFreq = 1.6;
      for (let s = 0; s < c.spine.length; s++) {
        c.spine[s] = Math.sin(c.swimPhase * waveFreq - s * 0.6) * (0.03 + s * 0.04);
      }

      if (c.spoutParticles && c.spoutParticles.length) {
        for (let p = c.spoutParticles.length - 1; p >= 0; p--) {
          const pt = c.spoutParticles[p];
          pt.age += timeStep;
          pt.x += pt.vx * timeStep * 60;
          pt.y += pt.vy * timeStep * 60;
          pt.z += pt.vz * timeStep;
          pt.vz -= 0.5 * timeStep;
          if (pt.age >= pt.maxAge || pt.z <= 0) {
            c.spoutParticles.splice(p, 1);
          }
        }
      }

      c.x += Math.cos(c.heading) * c.speed * timeStep * 60;
      c.y += Math.sin(c.heading) * c.speed * timeStep * 60;
    }

    // ---------------------------------------------------------------
    // 2. SHARK (Sinuous S-curve spine, finning surface wake)
    // ---------------------------------------------------------------
    else if (c.type === 'shark') {
      if (c.stateTimer <= 0) {
        c.state = Math.random() < 0.55 ? 'finning' : 'patrolling';
        c.stateTimer = 7000 + Math.random() * 8000;
      }

      c.heading += Math.sin(c.swimPhase * 0.3) * 0.008;

      if (c.state === 'finning') {
        c.z += (-0.02 - c.z) * 0.06;
        if (Math.random() < 0.3) {
          c.wakeTrail.push({
            x: c.x,
            y: c.y,
            heading: c.heading,
            age: 0,
            maxAge: 2.2
          });
        }
      } else {
        c.z += (-0.20 - c.z) * 0.05;
      }

      for (let w = c.wakeTrail.length - 1; w >= 0; w--) {
        const wk = c.wakeTrail[w];
        wk.age += timeStep;
        if (wk.age >= wk.maxAge) c.wakeTrail.splice(w, 1);
      }

      for (let s = 0; s < c.spineAngles.length; s++) {
        c.spineAngles[s] = Math.sin(c.swimPhase * 2.8 - s * 0.65) * (0.05 + s * 0.06);
      }

      c.x += Math.cos(c.heading) * c.speed * timeStep * 60;
      c.y += Math.sin(c.heading) * c.speed * timeStep * 60;
    }

    // ---------------------------------------------------------------
    // 3. MANTA RAY (Pectoral wing undulation & banking turns)
    // ---------------------------------------------------------------
    else if (c.type === 'manta') {
      c.z = -0.22 + Math.sin(c.swimPhase * 0.4) * 0.05;
      c.heading += Math.sin(c.swimPhase * 0.25) * 0.008;
      c.wingRoll = Math.sin(c.swimPhase * 0.25) * 0.20;

      c.x += Math.cos(c.heading) * c.speed * timeStep * 60;
      c.y += Math.sin(c.heading) * c.speed * timeStep * 60;
    }

    // ---------------------------------------------------------------
    // 4. DOLPHIN (Pod formation & porpoising leaps)
    // ---------------------------------------------------------------
    else if (c.type === 'dolphin') {
      if (c.stateTimer <= 0) {
        if (c.state === 'cruising') {
          c.state = 'leaping';
          c.leapProgress = 0;
          c.leapDuration = 1.3 + Math.random() * 0.3;
          c.stateTimer = c.leapDuration * 1000;
          activeRipples.push({
            x: c.x,
            y: c.y,
            radius: 0.35,
            growthRate: 1.6,
            age: 0,
            maxAge: 2.0
          });
        } else {
          c.state = 'cruising';
          c.stateTimer = 5000 + Math.random() * 6000 + c.podIndex * 500;
          c.z = -0.15;
        }
      }

      if (c.state === 'leaping') {
        c.leapProgress += timeStep / c.leapDuration;
        const arc = Math.sin(Math.min(1, c.leapProgress) * Math.PI);
        c.z = -0.15 + arc * 0.50;

        if (c.leapProgress >= 0.92 && c.splashRipples.length < 2) {
          c.splashRipples.push({ age: 0 });
          activeRipples.push({
            x: c.x,
            y: c.y,
            radius: 0.4,
            growthRate: 1.8,
            age: 0,
            maxAge: 2.0
          });
        }
      } else {
        c.z += (-0.15 - c.z) * 0.08;
      }

      c.x += Math.cos(c.heading) * c.speed * timeStep * 60;
      c.y += Math.sin(c.heading) * c.speed * timeStep * 60;
    }

    // ---------------------------------------------------------------
    // 5. FISH SCHOOL (Boids flocking, burst-and-coast, shore barrier)
    // ---------------------------------------------------------------
    else if (c.type === 'fish_school') {
      if (c.stateTimer <= 0) {
        c.state = Math.random() < 0.45 ? 'swirling' : 'cruising';
        c.stateTimer = 7000 + Math.random() * 8000;
      }

      // Calm, slow circular or meandering guide path
      if (c.state === 'swirling') {
        c.heading += timeStep * 0.8;
      } else {
        c.heading += Math.sin(timestamp * 0.0007 + c.id) * 0.009;
      }

      c.x += Math.cos(c.heading) * c.speed * timeStep * 60;
      c.y += Math.sin(c.heading) * c.speed * timeStep * 60;

      // Predator scatter check
      let predatorNear = false;
      let predX = 0;
      let predY = 0;
      for (let sc = 0; sc < creatures.length; sc++) {
        const other = creatures[sc];
        if (other.type === 'shark' || other.type === 'whale') {
          const dToPred = Math.hypot(other.x - c.x, other.y - c.y);
          if (dToPred < 3.8) {
            predatorNear = true;
            predX = other.x;
            predY = other.y;
            break;
          }
        }
      }

      if (predatorNear) {
        c.scatterTimer = 1.8;
      } else {
        c.scatterTimer = Math.max(0, c.scatterTimer - timeStep);
      }

      // Update individual fish members with burst-and-coast and strict land avoidance
      for (let f = 0; f < c.members.length; f++) {
        const fish = c.members[f];

        fish.burstTimer -= timeStep;
        if (fish.burstTimer <= 0) {
          fish.isGliding = !fish.isGliding;
          fish.burstTimer = fish.isGliding ? 1.0 + Math.random() * 1.0 : 0.4 + Math.random() * 0.4;
        }

        const tailFreq = fish.isGliding ? 2.5 : 7.5;
        fish.burstPhase += timeStep * tailFreq;
        fish.tailSway = Math.sin(fish.burstPhase);

        // Vector to school center
        const toCenterX = c.x - fish.x;
        const toCenterY = c.y - fish.y;
        const distToCenter = Math.hypot(toCenterX, toCenterY) || 1;

        // Separation from siblings
        let sepX = 0;
        let sepY = 0;
        for (let o = 0; o < c.members.length; o++) {
          if (o === f) continue;
          const other = c.members[o];
          const odx = fish.x - other.x;
          const ody = fish.y - other.y;
          const odist = Math.hypot(odx, ody);
          if (odist < 0.55 && odist > 0) {
            sepX += (odx / odist) * 0.012;
            sepY += (ody / odist) * 0.012;
          }
        }

        // Predator avoidance
        let fleeX = 0;
        let fleeY = 0;
        if (c.scatterTimer > 0) {
          const fdx = fish.x - predX;
          const fdy = fish.y - predY;
          const fdist = Math.hypot(fdx, fdy) || 1;
          fleeX = (fdx / fdist) * 0.025;
          fleeY = (fdy / fdist) * 0.025;
        }

        // Shoreline / land repulsion for individual fish
        const { minLandDist: fLandDist, repX: fRepX, repY: fRepY } = getLandProximity(grid, fish.x, fish.y, 1.8);
        let landPushX = 0;
        let landPushY = 0;
        if (fLandDist < 1.6) {
          landPushX = fRepX * 0.04;
          landPushY = fRepY * 0.04;
        }

        // Target velocities (calm, slow cruising)
        const targetSpeed = fish.isGliding ? c.speed * 0.65 : c.speed * 1.35;
        const desiredVx = Math.cos(c.heading) * targetSpeed + fleeX + landPushX;
        const desiredVy = Math.sin(c.heading) * targetSpeed + fleeY + landPushY;

        fish.vx += (desiredVx + (toCenterX / distToCenter) * 0.008 + sepX - fish.vx) * 0.10;
        fish.vy += (desiredVy + (toCenterY / distToCenter) * 0.008 + sepY - fish.vy) * 0.10;

        fish.heading = Math.atan2(fish.vy, fish.vx);

        fish.x += fish.vx * timeStep * 60;
        fish.y += fish.vy * timeStep * 60;

        // Hard barrier: if fish ever touches a land tile, pull directly to school center
        if (at(grid, Math.round(fish.x), Math.round(fish.y)) !== 0) {
          fish.x = c.x + (Math.random() - 0.5) * 0.4;
          fish.y = c.y + (Math.random() - 0.5) * 0.4;
          fish.vx = Math.cos(c.heading) * 0.008;
          fish.vy = Math.sin(c.heading) * 0.008;
        }
      }
    }
  }

  // Filter out creatures that wander far from camera view
  return creatures.filter((c) => Math.hypot(c.x - mx, c.y - my) < 45);
}

// ---------------------------------------------------------------------------
// RENDERING FUNCTIONS (Underwater shades, light translucent appearance)
// ---------------------------------------------------------------------------

export function drawMarineLife(ctx, creatures, ox, oy, grid, rot, t, light, nt = 0) {
  if (!creatures || !creatures.length && !activeRipples.length) return;

  const sunsetW = light ? (light.alt < 0.35 && light.alt > -0.15 ? Math.sin(((0.35 - light.alt) / 0.5) * Math.PI) : 0) : 0;
  const isNight = nt > 0.35;

  // -------------------------------------------------------------------------
  // PASS 1: DRAW ACTIVE SURFACE RIPPLES & SLICKS
  // -------------------------------------------------------------------------
  for (let r = 0; r < activeRipples.length; r++) {
    const rip = activeRipples[r];
    // Skip if on land
    if (at(grid, Math.round(rip.x), Math.round(rip.y)) !== 0) continue;

    const [rsx, rsy] = P(ox, oy, rip.x, rip.y, 0, rot);

    ctx.save();
    ctx.translate(rsx, rsy);
    ctx.scale(1, 0.52);

    if (rip.isFootprint) {
      ctx.beginPath();
      ctx.arc(0, 0, rip.radius * 7.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 220, 240, ${rip.alpha * 0.20})`;
      ctx.fill();

      ctx.strokeStyle = `rgba(235, 250, 255, ${rip.alpha * 0.32})`;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, rip.radius * 6.0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(240, 250, 255, ${rip.alpha * 0.40})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // PASS 2: DRAW CREATURES (Underwater shades, lighter translucent colors)
  // -------------------------------------------------------------------------
  for (let i = 0; i < creatures.length; i++) {
    const c = creatures[i];

    // Absolute barrier: never render any creature whose center is on land
    if (at(grid, Math.round(c.x), Math.round(c.y)) !== 0) continue;

    // Screen coordinates
    const [sx, sy] = P(ox, oy, c.x, c.y, Math.max(0, c.z), rot);

    // Screen heading angle
    const [rx, ry] = toRotated(Math.cos(c.heading), Math.sin(c.heading), rot);
    const screenAngle = Math.atan2(ry * (H / 2), rx * (W / 2));

    ctx.save();

    // Base underwater shade tone: similar to and slightly darker than ocean water, making creatures hard to spot
    let shadeR = 14;
    let shadeG = 30;
    let shadeB = 48;
    if (sunsetW > 0) {
      shadeR = Math.round(shadeR * (1 - sunsetW) + 26 * sunsetW);
      shadeG = Math.round(shadeG * (1 - sunsetW) + 18 * sunsetW);
      shadeB = Math.round(shadeB * (1 - sunsetW) + 44 * sunsetW);
    }
    if (isNight) {
      shadeR = 3;
      shadeG = 7;
      shadeB = 18;
    }

    // -----------------------------------------------------------------------
    // 1. PROCEDURAL FISH SCHOOL (Subtle underwater shades, hard to spot)
    // -----------------------------------------------------------------------
    if (c.type === 'fish_school') {
      for (let f = 0; f < c.members.length; f++) {
        const fish = c.members[f];

        // Never render any individual fish on land
        if (at(grid, Math.round(fish.x), Math.round(fish.y)) !== 0) continue;

        const [fsx, fsy] = P(ox, oy, fish.x, fish.y, 0, rot);
        const [frx, fry] = toRotated(Math.cos(fish.heading), Math.sin(fish.heading), rot);
        const fAngle = Math.atan2(fry * (H / 2), frx * (W / 2));

        ctx.save();
        ctx.translate(fsx, fsy);
        ctx.rotate(fAngle);
        ctx.scale(1, 0.52);

        // Scaled to length 3.2px, width 1.2px
        const tSway = fish.tailSway * (fish.isGliding ? 0.35 : 0.85);

        ctx.beginPath();
        ctx.moveTo(3.2, 0); // Snout
        ctx.quadraticCurveTo(1.2, -1.1, -0.6, -0.9 + tSway * 0.2);
        ctx.quadraticCurveTo(-1.8, -0.5 + tSway * 0.5, -3.0, tSway);
        // Forked caudal tail fin
        ctx.lineTo(-4.2, tSway - 1.2);
        ctx.lineTo(-3.5, tSway);
        ctx.lineTo(-4.2, tSway + 1.2);
        ctx.lineTo(-3.0, tSway);
        // Right side
        ctx.quadraticCurveTo(-1.8, 0.5 + tSway * 0.5, -0.6, 0.9 + tSway * 0.2);
        ctx.quadraticCurveTo(1.2, 1.1, 3.2, 0);
        ctx.closePath();

        // Subtle underwater shade slightly darker than the ocean, hard to spot
        const shadeAlpha = Math.max(0.28, 0.44 + fish.depth * 0.8);
        ctx.fillStyle = `rgba(${shadeR}, ${shadeG}, ${shadeB}, ${shadeAlpha})`;
        ctx.fill();

        // Very faint, occasional scale glint catching sunlight deep in water
        const glint = Math.sin(t * 0.005 + f * 1.5 + fish.burstPhase);
        if (glint > 0.82) {
          ctx.beginPath();
          ctx.ellipse(0.3, 0, 1.0, 0.3, 0, 0, Math.PI * 2);
          ctx.fillStyle = sunsetW > 0.15
            ? `rgba(235, 205, 175, ${glint * 0.25})`
            : isNight
            ? `rgba(60, 160, 190, ${glint * 0.20})`
            : `rgba(180, 215, 235, ${glint * 0.22})`;
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // -----------------------------------------------------------------------
    // 2. PROCEDURAL REEF SHARK (Stealthy ocean-dark silhouette & surface fin)
    // -----------------------------------------------------------------------
    else if (c.type === 'shark') {
      const len = 14.5;
      const wid = 4.8;

      ctx.save();
      ctx.translate(sx, sy);

      // Surface V-wake if finning
      if (c.state === 'finning' && c.wakeTrail) {
        ctx.save();
        ctx.scale(1, 0.52);
        for (let w = 0; w < c.wakeTrail.length; w++) {
          const wk = c.wakeTrail[w];
          const [wsx, wsy] = P(ox, oy, wk.x, wk.y, 0, rot);
          const wAlpha = Math.max(0, 1 - wk.age / wk.maxAge) * 0.30;
          ctx.beginPath();
          ctx.arc(wsx - sx, (wsy - sy) / 0.52, 1.2 + wk.age * 3.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(220, 240, 255, ${wAlpha})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Sinuous S-curve Shark Body Shade
      ctx.rotate(screenAngle);
      ctx.scale(1, 0.52);

      const spine = c.spineAngles || [0, 0, 0, 0, 0, 0, 0];
      const t1 = spine[2] * 1.5;
      const t2 = spine[4] * 3.0;
      const t3 = spine[6] * 5.0;

      ctx.beginPath();
      ctx.moveTo(len * 0.52, 0);
      ctx.quadraticCurveTo(len * 0.22, -wid * 0.55, 0, -wid * 0.5 + t1);
      ctx.quadraticCurveTo(-len * 0.25, -wid * 0.35 + t2, -len * 0.5, t3);
      // Caudal tail
      ctx.lineTo(-len * 0.74, t3 - 4.5);
      ctx.lineTo(-len * 0.62, t3 - 1.0);
      ctx.lineTo(-len * 0.68, t3 + 2.5);
      ctx.lineTo(-len * 0.5, t3);
      // Right side
      ctx.quadraticCurveTo(-len * 0.25, wid * 0.35 + t2, 0, wid * 0.5 + t1);
      ctx.quadraticCurveTo(len * 0.22, wid * 0.55, len * 0.52, 0);
      ctx.closePath();

      // Slightly darker tone than ocean water
      ctx.fillStyle = `rgba(${Math.max(0, shadeR - 4)}, ${Math.max(0, shadeG - 6)}, ${Math.max(0, shadeB - 8)}, 0.58)`;
      ctx.fill();

      // Swept pectoral fins
      ctx.beginPath();
      ctx.moveTo(len * 0.12, -wid * 0.45 + t1 * 0.5);
      ctx.lineTo(-len * 0.05, -wid * 1.35 + t1 * 0.5);
      ctx.lineTo(-len * 0.10, -wid * 0.85 + t1 * 0.5);
      ctx.closePath();
      ctx.fillStyle = `rgba(${Math.max(0, shadeR - 6)}, ${Math.max(0, shadeG - 8)}, ${Math.max(0, shadeB - 10)}, 0.55)`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(len * 0.12, wid * 0.45 + t1 * 0.5);
      ctx.lineTo(-len * 0.05, wid * 1.35 + t1 * 0.5);
      ctx.lineTo(-len * 0.10, wid * 0.85 + t1 * 0.5);
      ctx.closePath();
      ctx.fill();

      // Triangular Dorsal Fin breaking surface
      if (c.z >= -0.05) {
        ctx.beginPath();
        ctx.moveTo(len * 0.04, t1);
        ctx.lineTo(-len * 0.12, t1 - 3.4);
        ctx.lineTo(-len * 0.10, t1);
        ctx.closePath();
        ctx.fillStyle = `rgba(${Math.max(0, shadeR - 8)}, ${Math.max(0, shadeG - 12)}, ${Math.max(0, shadeB - 14)}, 0.85)`;
        ctx.fill();
      }

      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 3. PROCEDURAL HUMPBACK WHALE (Massive ocean-shade leviathan)
    // -----------------------------------------------------------------------
    else if (c.type === 'whale') {
      const len = 32.0;
      const wid = 9.5;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(screenAngle);
      ctx.scale(1, 0.52);

      const spine = c.spine || [0, 0, 0, 0, 0, 0];
      const arch = c.pitch * 14;
      const tailArch = (spine[4] || 0) * 6.0 + arch;

      ctx.beginPath();
      ctx.moveTo(len * 0.52, 0);
      ctx.quadraticCurveTo(len * 0.25, -wid * 0.58, 0, -wid * 0.52 + tailArch * 0.2);
      ctx.quadraticCurveTo(-len * 0.26, -wid * 0.32 + tailArch * 0.6, -len * 0.52, tailArch);
      // Horizontal Flukes
      ctx.lineTo(-len * 0.65, tailArch - 6.5);
      ctx.quadraticCurveTo(-len * 0.68, tailArch, -len * 0.62, tailArch);
      ctx.lineTo(-len * 0.65, tailArch + 6.5);
      ctx.lineTo(-len * 0.52, tailArch);
      // Right side
      ctx.quadraticCurveTo(-len * 0.26, wid * 0.32 + tailArch * 0.6, 0, wid * 0.52 + tailArch * 0.2);
      ctx.quadraticCurveTo(len * 0.25, wid * 0.58, len * 0.52, 0);
      ctx.closePath();

      // Underwater shade slightly darker than ocean depth
      const isBreaching = c.z >= -0.05;
      const whaleAlpha = isBreaching ? 0.78 : 0.56;
      ctx.fillStyle = `rgba(${Math.max(0, shadeR - 5)}, ${Math.max(0, shadeG - 8)}, ${Math.max(0, shadeB - 10)}, ${whaleAlpha})`;
      ctx.fill();

      // Pectoral Flippers
      ctx.beginPath();
      ctx.moveTo(len * 0.16, -wid * 0.48);
      ctx.quadraticCurveTo(0, -wid * 1.45, -len * 0.10, -wid * 1.4);
      ctx.quadraticCurveTo(-len * 0.04, -wid * 0.85, len * 0.04, -wid * 0.45);
      ctx.closePath();
      ctx.fillStyle = `rgba(${Math.max(0, shadeR - 7)}, ${Math.max(0, shadeG - 10)}, ${Math.max(0, shadeB - 12)}, ${whaleAlpha * 0.9})`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(len * 0.16, wid * 0.48);
      ctx.quadraticCurveTo(0, wid * 1.45, -len * 0.10, wid * 1.4);
      ctx.quadraticCurveTo(-len * 0.04, wid * 0.85, len * 0.04, wid * 0.45);
      ctx.closePath();
      ctx.fill();

      // Back & dorsal fin when breaching surface
      if (isBreaching) {
        ctx.beginPath();
        ctx.moveTo(-len * 0.2, -wid * 0.1 + tailArch * 0.4);
        ctx.lineTo(-len * 0.27, -wid * 0.1 + tailArch * 0.4 - 2.2);
        ctx.lineTo(-len * 0.26, -wid * 0.1 + tailArch * 0.4);
        ctx.closePath();
        ctx.fillStyle = `rgba(${Math.max(0, shadeR - 8)}, ${Math.max(0, shadeG - 12)}, ${Math.max(0, shadeB - 14)}, 0.88)`;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(0, 0, len * 0.38, wid * 0.38, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(210, 240, 255, 0.28)';
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      ctx.restore();

      // Volumetric Spout Mist Spray
      if (c.spoutParticles && c.spoutParticles.length) {
        for (let p = 0; p < c.spoutParticles.length; p++) {
          const pt = c.spoutParticles[p];
          const [psx, psy] = P(ox, oy, pt.x, pt.y, pt.z, rot);
          const pAlpha = Math.max(0, 1 - pt.age / pt.maxAge) * 0.55;
          ctx.beginPath();
          ctx.arc(psx, psy, pt.size * (1 + pt.age * 0.7), 0, Math.PI * 2);
          ctx.fillStyle = sunsetW > 0.15 ? `rgba(255, 235, 210, ${pAlpha})` : `rgba(235, 248, 255, ${pAlpha})`;
          ctx.fill();
        }
      }
    }

    // -----------------------------------------------------------------------
    // 4. PROCEDURAL DOLPHIN (Underwater ocean-dark shade & surface leap)
    // -----------------------------------------------------------------------
    else if (c.type === 'dolphin') {
      const len = 10.5;
      const wid = 3.6;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(screenAngle);
      ctx.scale(1, 0.52);

      const isAirborne = c.z > 0.05;
      const leapArch = c.state === 'leaping' ? Math.sin(c.leapProgress * Math.PI) * 1.8 : 0;

      ctx.beginPath();
      ctx.moveTo(len * 0.56, 0);
      ctx.quadraticCurveTo(len * 0.32, -wid * 0.55 - leapArch, 0, -wid * 0.5);
      ctx.quadraticCurveTo(-len * 0.28, -wid * 0.3, -len * 0.50, leapArch * 0.5);
      // Horizontal Fluke
      ctx.lineTo(-len * 0.66, -2.6 + leapArch * 0.5);
      ctx.lineTo(-len * 0.60, leapArch * 0.5);
      ctx.lineTo(-len * 0.66, 2.6 + leapArch * 0.5);
      ctx.lineTo(-len * 0.50, leapArch * 0.5);
      // Ventral curve
      ctx.quadraticCurveTo(-len * 0.28, wid * 0.3, 0, wid * 0.5);
      ctx.quadraticCurveTo(len * 0.32, wid * 0.55 + leapArch, len * 0.56, 0);
      ctx.closePath();

      // Underwater: slightly darker ocean tone, hard to spot; in air: catches sunlight
      if (isAirborne) {
        ctx.fillStyle = 'rgba(175, 205, 230, 0.95)';
      } else {
        ctx.fillStyle = `rgba(${Math.max(0, shadeR - 3)}, ${Math.max(0, shadeG - 5)}, ${Math.max(0, shadeB - 7)}, 0.50)`;
      }
      ctx.fill();

      // Dorsal Fin
      ctx.beginPath();
      ctx.moveTo(0, -wid * 0.45);
      ctx.quadraticCurveTo(-len * 0.08, -wid * 0.85, -len * 0.15, -wid * 0.80);
      ctx.quadraticCurveTo(-len * 0.10, -wid * 0.5, -len * 0.14, -wid * 0.45);
      ctx.closePath();
      ctx.fillStyle = isAirborne ? '#475569' : `rgba(${Math.max(0, shadeR - 5)}, ${Math.max(0, shadeG - 7)}, ${Math.max(0, shadeB - 9)}, 0.55)`;
      ctx.fill();

      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 5. PROCEDURAL MANTA RAY (Subtle diamond underwater shade)
    // -----------------------------------------------------------------------
    else if (c.type === 'manta') {
      const wingSpan = 14.5;
      const bodyLen = 10.0;
      const wingFlap = Math.sin(c.swimPhase * 0.7) * 2.5;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(screenAngle);
      ctx.scale(1, 0.52);

      ctx.beginPath();
      ctx.moveTo(bodyLen * 0.56, 0);
      ctx.quadraticCurveTo(bodyLen * 0.15, -wingSpan * 0.62, -bodyLen * 0.16, -wingSpan * 0.52 + wingFlap);
      ctx.quadraticCurveTo(-bodyLen * 0.35, -wingSpan * 0.20, -bodyLen * 0.56, 0);
      ctx.quadraticCurveTo(-bodyLen * 0.35, wingSpan * 0.20, -bodyLen * 0.16, wingSpan * 0.52 - wingFlap);
      ctx.quadraticCurveTo(bodyLen * 0.15, wingSpan * 0.62, bodyLen * 0.56, 0);
      ctx.closePath();

      // Soft underwater shade slightly darker than ocean depth
      ctx.fillStyle = `rgba(${Math.max(0, shadeR - 4)}, ${Math.max(0, shadeG - 6)}, ${Math.max(0, shadeB - 8)}, 0.45)`;
      ctx.fill();

      // Whip tail
      ctx.strokeStyle = `rgba(${Math.max(0, shadeR - 6)}, ${Math.max(0, shadeG - 8)}, ${Math.max(0, shadeB - 10)}, 0.50)`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-bodyLen * 0.56, 0);
      ctx.quadraticCurveTo(-bodyLen * 0.95, wingFlap * 0.3, -bodyLen * 1.35, wingFlap * 0.6);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
}
