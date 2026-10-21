import { P, toRotated, fromRotated, ht } from './engine';
import { W, H } from './constants';

export const BIRD_SPECIES = [
  {
    id: 'seagull',
    name: 'Seagull',
    bodyColor: '#ffffff',
    bellyColor: '#f8fafc',
    wingColor: '#e2e8f0',
    wingTipColor: '#334155',
    beakColor: '#f59e0b',
    wingspan: 13,
    length: 8,
    minHeight: 4.2,
    maxHeight: 7.2,
    glideRatio: 0.72,
    flapSpeed: 13,
    speed: 0.052,
    flockSizeRange: [3, 6],
    weight: 1.1
  },
  {
    id: 'eagle',
    name: 'Hawk / Eagle',
    bodyColor: '#4a2c17',
    bellyColor: '#5c3820',
    wingColor: '#3d2211',
    wingTipColor: '#201108',
    beakColor: '#f59e0b',
    wingspan: 19,
    length: 11,
    minHeight: 8.5,
    maxHeight: 13.5,
    glideRatio: 0.88,
    flapSpeed: 9,
    speed: 0.040,
    flockSizeRange: [1, 2], // Eagles soar solo or in pairs
    weight: 0.55
  },
  {
    id: 'swallow',
    name: 'Barn Swallow',
    bodyColor: '#1e3a8a',
    bellyColor: '#ffffff',
    wingColor: '#0f172a',
    wingTipColor: '#38bdf8',
    beakColor: '#e2e8f0',
    throatColor: '#991b1b',
    hasForkedTail: true,
    wingspan: 10,
    length: 7,
    minHeight: 2.8,
    maxHeight: 4.8,
    glideRatio: 0.42,
    flapSpeed: 17,
    speed: 0.070,
    flockSizeRange: [4, 7],
    weight: 0.95
  },
  {
    id: 'dove',
    name: 'Dove',
    bodyColor: '#e2e8f0',
    bellyColor: '#f1f5f9',
    wingColor: '#cbd5e1',
    wingTipColor: '#94a3b8',
    beakColor: '#fb7185',
    wingspan: 12,
    length: 7.5,
    minHeight: 4.0,
    maxHeight: 6.8,
    glideRatio: 0.60,
    flapSpeed: 14,
    speed: 0.048,
    flockSizeRange: [3, 6],
    weight: 0.85
  }
];

let nextBirdId = 1;

export function spawnBirdGroup(birds, camX, camY) {
  // Weighted species choice
  const totalWeight = BIRD_SPECIES.reduce((acc, s) => acc + s.weight, 0);
  let roll = Math.random() * totalWeight;
  let species = BIRD_SPECIES[0];
  for (const s of BIRD_SPECIES) {
    if (roll < s.weight) {
      species = s;
      break;
    }
    roll -= s.weight;
  }

  // Spawn position around perimeter of camera view
  const angle = Math.random() * Math.PI * 2;
  const dist = 24 + Math.random() * 8;
  const spawnX = camX + Math.cos(angle) * dist;
  const spawnY = camY + Math.sin(angle) * dist;

  // Aim generally across towards the other side of island with slight randomness
  const targetX = camX + (Math.random() - 0.5) * 12;
  const targetY = camY + (Math.random() - 0.5) * 12;
  const baseHeading = Math.atan2(targetY - spawnY, targetX - spawnX);

  const isFlock = Math.random() < 0.42 && species.flockSizeRange[1] > 2;
  const flockCount = isFlock
    ? Math.floor(species.flockSizeRange[0] + Math.random() * (species.flockSizeRange[1] - species.flockSizeRange[0] + 1))
    : (species.id === 'eagle' && Math.random() < 0.3 ? 2 : 1);

  const flockId = isFlock ? nextBirdId++ : null;
  const baseAltitude = species.minHeight + Math.random() * (species.maxHeight - species.minHeight);

  // Leader bird
  const leader = {
    id: nextBirdId++,
    flockId,
    isLeader: true,
    species,
    x: spawnX,
    y: spawnY,
    z: baseAltitude,
    vx: Math.cos(baseHeading) * species.speed,
    vy: Math.sin(baseHeading) * species.speed,
    vz: 0,
    heading: baseHeading,
    targetHeading: baseHeading,
    bankAngle: 0,
    pitch: 0,
    speed: species.speed * (0.95 + Math.random() * 0.1),
    flapPhase: Math.random() * Math.PI * 2,
    isGliding: Math.random() < species.glideRatio,
    glideTimer: 1.5 + Math.random() * 2.5,
    flapTimer: 1.0 + Math.random() * 1.5,
    formationOffset: [0, 0, 0]
  };
  birds.push(leader);

  // Followers in cohesive formation of the SAME KIND
  for (let i = 1; i < flockCount; i++) {
    // V-formation: alternates left and right wings
    const side = i % 2 === 1 ? 1 : -1;
    const rank = Math.ceil(i / 2);
    const offsetX = -rank * 1.4 + (Math.random() - 0.5) * 0.3;
    const offsetY = side * rank * 1.1 + (Math.random() - 0.5) * 0.3;
    const offsetZ = (Math.random() - 0.5) * 0.4;

    const follower = {
      id: nextBirdId++,
      flockId,
      isLeader: false,
      leaderId: leader.id,
      species, // GUARANTEED SAME SPECIES IN THE FLOCK
      x: spawnX + offsetX * Math.cos(baseHeading) - offsetY * Math.sin(baseHeading),
      y: spawnY + offsetX * Math.sin(baseHeading) + offsetY * Math.cos(baseHeading),
      z: baseAltitude + offsetZ,
      vx: leader.vx,
      vy: leader.vy,
      vz: 0,
      heading: baseHeading,
      targetHeading: baseHeading,
      bankAngle: 0,
      pitch: 0,
      speed: leader.speed,
      flapPhase: leader.flapPhase + (Math.random() - 0.5) * 0.6,
      isGliding: leader.isGliding,
      glideTimer: leader.glideTimer + (Math.random() - 0.5) * 0.5,
      flapTimer: leader.flapTimer + (Math.random() - 0.5) * 0.5,
      formationOffset: [offsetX, offsetY, offsetZ]
    };
    birds.push(follower);
  }
}

export function updateBirds(dt, birds, camCoords) {
  const { mx, my } = camCoords;
  const timeStep = Math.min(0.1, Math.max(0.001, dt));

  // Spawn new birds when population drops
  if (birds.length < 8 && Math.random() < 0.04) {
    spawnBirdGroup(birds, mx, my);
  }

  // Quick lookup for flock leaders
  const leadersById = new Map();
  for (const b of birds) {
    if (b.isLeader) leadersById.set(b.id, b);
  }

  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    const sp = b.species;

    // 1. Flap vs Glide state machine
    if (b.isGliding) {
      b.glideTimer -= timeStep;
      if (b.glideTimer <= 0) {
        b.isGliding = false;
        b.flapTimer = 0.9 + Math.random() * 1.4;
      }
    } else {
      b.flapPhase += timeStep * sp.flapSpeed;
      b.flapTimer -= timeStep;
      if (b.flapTimer <= 0) {
        b.isGliding = true;
        b.glideTimer = 1.8 + Math.random() * 2.8;
      }
    }

    // 2. Navigation & Steering
    let prevHeading = b.heading;
    if (b.isLeader || !b.flockId) {
      // Solo / Leader steering: gentle wind thermal drift
      b.targetHeading += Math.sin(b.id * 3.7 + Date.now() * 0.0006) * 0.012;
      const angleDiff = Math.atan2(Math.sin(b.targetHeading - b.heading), Math.cos(b.targetHeading - b.heading));
      b.heading += angleDiff * 0.04;
    } else {
      // Follower physics: stay aligned with leader and pull toward formation offset
      const leader = leadersById.get(b.leaderId);
      if (leader) {
        const [offX, offY, offZ] = b.formationOffset;
        // World-space target position based on leader heading
        const cosL = Math.cos(leader.heading);
        const sinL = Math.sin(leader.heading);
        const targetWorldX = leader.x + offX * cosL - offY * sinL;
        const targetWorldY = leader.y + offX * sinL + offY * cosL;
        const targetWorldZ = leader.z + offZ;

        // Spring-damper force towards slot
        const toX = targetWorldX - b.x;
        const toY = targetWorldY - b.y;
        const toZ = targetWorldZ - b.z;

        b.vx += toX * 0.05;
        b.vy += toY * 0.05;
        b.vz += toZ * 0.05;

        b.vx *= 0.92;
        b.vy *= 0.92;
        b.vz *= 0.92;

        // Align heading smoothly with leader
        const headingDiff = Math.atan2(Math.sin(leader.heading - b.heading), Math.cos(leader.heading - b.heading));
        b.heading += headingDiff * 0.08;
        b.isGliding = leader.isGliding;
      }
    }

    // 3. Aerodynamic Banking Angle
    const turnRate = Math.atan2(Math.sin(b.heading - prevHeading), Math.cos(b.heading - prevHeading)) / timeStep;
    const targetBank = Math.max(-0.6, Math.min(0.6, turnRate * 3.5));
    b.bankAngle += (targetBank - b.bankAngle) * 0.15;

    // 4. Position Integration
    const forwardX = Math.cos(b.heading) * b.speed;
    const forwardY = Math.sin(b.heading) * b.speed;

    b.x += (forwardX + b.vx * 0.15) * timeStep * 60;
    b.y += (forwardY + b.vy * 0.15) * timeStep * 60;
    b.z += (b.vz * 0.1) * timeStep * 60;

    // Natural undulating altitude wave
    b.z += Math.sin(b.flapPhase * 0.5) * 0.008;
  }

  // Filter out birds too far from camera
  return birds.filter((b) => Math.hypot(b.x - mx, b.y - my) < 36);
}

export function drawBirdShadow(ctx, bird, ox, oy, grid, rot, light) {
  if (!light) return;
  const shadowX = bird.x + light.dx * bird.z * 0.38;
  const shadowY = bird.y + light.dy * bird.z * 0.38;
  const groundZ = ht(grid, Math.round(shadowX), Math.round(shadowY));
  const [sx, sy] = P(ox, oy, shadowX, shadowY, groundZ, rot);

  const alt = Math.max(1, bird.z - groundZ);
  const scale = Math.max(0.5, 1.15 - alt * 0.04);
  const shadowAlpha = Math.max(0.03, Math.min(0.20, (0.24 - alt * 0.015) * light.shadowAlpha * 2.2));

  // Projected screen angle
  const [rx, ry] = toRotated(Math.cos(bird.heading), Math.sin(bird.heading), rot);
  const screenAngle = Math.atan2(ry * (H / 2), rx * (W / 2));

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(screenAngle);
  ctx.scale(scale, scale * 0.6); // flattened isometric ground shadow

  ctx.fillStyle = `rgba(10, 20, 45, ${shadowAlpha})`;
  ctx.beginPath();
  // Body shadow
  ctx.ellipse(0, 0, 4, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings shadow flapping in sync
  const wingDeflection = bird.isGliding ? 0.8 : Math.cos(bird.flapPhase) * 2.4;
  ctx.beginPath();
  ctx.moveTo(1, 0);
  ctx.lineTo(-1, -7);
  ctx.lineTo(-3, -7 + wingDeflection);
  ctx.lineTo(-1, 0);
  ctx.lineTo(-3, 7 - wingDeflection);
  ctx.lineTo(-1, 7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawBird(ctx, bird, ox, oy, rot, t, light) {
  const [bx, by] = P(ox, oy, bird.x, bird.y, bird.z, rot);
  const sp = bird.species;

  // Project heading to screen isometric space
  const [rx, ry] = toRotated(Math.cos(bird.heading), Math.sin(bird.heading), rot);
  const screenAngle = Math.atan2(ry * (H / 2), rx * (W / 2));

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(screenAngle);
  // Bank angle roll
  ctx.scale(1, Math.max(0.35, Math.cos(bird.bankAngle)));

  const span = sp.wingspan;
  const len = sp.length;

  // Wing flap deflection physics
  // During glide: slight dihedral V-angle; during flap: fluid sinusoidal bend
  const flapCycle = bird.isGliding
    ? Math.sin(t * 0.003 + bird.id) * 0.5 - 0.8
    : Math.sin(bird.flapPhase) * 4.2;

  // 1. Tail Feathers
  ctx.fillStyle = sp.wingColor;
  ctx.beginPath();
  if (sp.hasForkedTail) {
    // Scissor swallow tail
    ctx.moveTo(-len * 0.35, 0);
    ctx.lineTo(-len * 0.85, -2.5);
    ctx.lineTo(-len * 0.55, 0);
    ctx.lineTo(-len * 0.85, 2.5);
    ctx.closePath();
  } else {
    // Fanned / wedge tail
    ctx.moveTo(-len * 0.3, 0);
    ctx.lineTo(-len * 0.7, -2.2);
    ctx.lineTo(-len * 0.7, 2.2);
    ctx.closePath();
  }
  ctx.fill();

  // 2. Wings (Left and Right with primary wingtip feathers)
  const drawWing = (isLeft) => {
    const sign = isLeft ? -1 : 1;
    const tipY = sign * (span * 0.55);
    const midY = sign * (span * 0.28);
    const tipZ = flapCycle * (isLeft ? 1 : 1);

    // Inner wing
    ctx.fillStyle = sp.wingColor;
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(-len * 0.15, midY);
    ctx.lineTo(-len * 0.45, midY * 0.9);
    ctx.lineTo(-len * 0.35, 0);
    ctx.closePath();
    ctx.fill();

    // Outer wing & primaries
    ctx.beginPath();
    ctx.moveTo(-len * 0.15, midY);
    ctx.quadraticCurveTo(-len * 0.2, tipY * 0.8, -len * 0.35, tipY);
    ctx.lineTo(-len * 0.55, tipY - sign * 1.5 + tipZ * 0.2);
    ctx.lineTo(-len * 0.45, midY * 0.9);
    ctx.closePath();
    ctx.fill();

    // Darker / distinct primary wingtip accents
    ctx.fillStyle = sp.wingTipColor;
    ctx.beginPath();
    ctx.moveTo(-len * 0.28, tipY * 0.85);
    ctx.lineTo(-len * 0.35, tipY);
    ctx.lineTo(-len * 0.55, tipY - sign * 1.5 + tipZ * 0.2);
    ctx.lineTo(-len * 0.45, tipY * 0.75);
    ctx.closePath();
    ctx.fill();
  };

  drawWing(true);
  drawWing(false);

  // 3. Body / Fuselage
  ctx.fillStyle = sp.bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, len * 0.48, len * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Throat / breast highlight
  if (sp.throatColor) {
    ctx.fillStyle = sp.throatColor;
    ctx.beginPath();
    ctx.ellipse(len * 0.22, 0, len * 0.18, len * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (sp.bellyColor) {
    ctx.fillStyle = sp.bellyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.35, len * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Head & Beak
  ctx.fillStyle = sp.bodyColor;
  ctx.beginPath();
  ctx.arc(len * 0.38, 0, len * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = sp.beakColor;
  ctx.beginPath();
  ctx.moveTo(len * 0.48, -0.9);
  ctx.lineTo(len * 0.72, 0);
  ctx.lineTo(len * 0.48, 0.9);
  ctx.closePath();
  ctx.fill();

  // Tiny eye dot
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(len * 0.38, -0.9, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
