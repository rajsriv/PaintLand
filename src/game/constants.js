export const W = 48;
export const H = 24;
export const U = 9;

// 5 minutes (300,000ms) per full day-night celestial cycle
export const DAY_CYCLE_MS = 300000;

export const WALL = ['#fbf3e1', '#efe2c4', '#dccda8'];

export const HOUSE_WALL_PALETTES = [
  // 0: Classic White / Cream Plaster
  ['#fbf5e6', '#efe4ce', '#dccab2'],
  // 1: Rustic Timber / Warm Wood
  ['#d6a774', '#bc8e5b', '#9e7343'],
  // 2: Nordic Red Cottage (Falun Red)
  ['#d66552', '#b84e3c', '#983929'],
  // 3: Seaside Pastel Blue / Slate
  ['#d8e5ec', '#b9ccd6', '#98afbc'],
  // 4: Honey Stone / Cotswold Yellow
  ['#f5e2b0', '#dec68f', '#c2aa72'],
  // 5: Cobblestone / Ash Grey
  ['#e8eaed', '#cfd4d9', '#b2b9c0'],
  // 6: Forest Moss Green
  ['#bccbb4', '#9fb296', '#7f9476'],
  // 7: Terracotta Brick
  ['#de8a73', '#c3725b', '#a45743']
];

export const ROOF_TINTS = [
  null, // Uses seasonal palette p.roof
  ['#7c8899', '#636e7d'], // Slate Grey
  ['#a44b36', '#873928'], // Red Terracotta
  ['#b08d5b', '#8f6e3e'], // Thatch Brown
  ['#537a72', '#3f5e57']  // Weathered Teal
];

export const SEASONS = [
  {
    id: 0,
    name: 'Spring',
    icon: '🌸',
    g: ['#9bd36b', '#7fb85a', '#6aa349'],
    w: '#6ec1d6',
    wd: '#4fa2bb',
    r: ['#b9b4ab', '#8f8a82', '#78736c'],
    rd: '#eadbb0',
    f: '#e9c46a',
    fl: '#c99c3c',
    roof: ['#d9694f', '#b8523c'],
    tree: ['#4f9a4a', '#3f8340'],
    skyGradient: ['#e4f3f5', '#f1ecf8']
  },
  {
    id: 1,
    name: 'Autumn',
    icon: '🍂',
    g: ['#e0b25a', '#c4963f', '#a97f34'],
    w: '#5fa3b8',
    wd: '#448498',
    r: ['#b3a99c', '#8a8073', '#726a5f'],
    rd: '#efe0bd',
    f: '#d98a3d',
    fl: '#b5651f',
    roof: ['#a8452d', '#8a3524'],
    tree: ['#d2652a', '#b3501f'],
    skyGradient: ['#faedd6', '#ede1f5']
  },
  {
    id: 2,
    name: 'Winter',
    icon: '❄️',
    g: ['#f1f5f9', '#cfdae5', '#b8c6d4'],
    w: '#82b3d1',
    wd: '#6291b0',
    r: ['#c4c9cf', '#9aa1a9', '#838a93'],
    rd: '#d9c9a4',
    f: '#dfe6ec',
    fl: '#aeb9c4',
    roof: ['#6f86b8', '#566c9c'],
    tree: ['#3f6e57', '#4f8a6a'],
    skyGradient: ['#e2ebf3', '#e4e2ee']
  },
  {
    id: 3,
    name: 'Sunset',
    icon: '🌅',
    g: ['#88c070', '#6a9f52', '#52833d'],
    w: '#4c8dae',
    wd: '#376885',
    r: ['#a89284', '#877063', '#695549'],
    rd: '#e2ba96',
    f: '#df8748',
    fl: '#b05a2f',
    roof: ['#c04838', '#9e3224'],
    tree: ['#3b7b48', '#2b6037'],
    skyGradient: ['#fed8b1', '#e8b5ce']
  }
];

export const TOOLS = [
  { id: 1, name: 'Land', icon: '🌿', key: '1', desc: 'Paint lush grassy land' },
  { id: 4, name: 'Field', icon: '🌾', key: '2', desc: 'Grow waving wheat farms with fences' },
  { id: 5, name: 'House', icon: '🏠', key: '3', desc: 'Build homes, mills, churches & castles' },
  { id: 3, name: 'Road', icon: '🛤️', key: '4', desc: 'Pave stone & dirt paths for villagers' },
  { id: 2, name: 'Rock', icon: '⛰️', key: '5', desc: 'Erect rocky peaks and mountains' },
  { id: 0, name: 'Water', icon: '🌊', key: '6', desc: 'Dig canals or restore the ocean' },
  { id: -1, name: 'Move', icon: '✋', key: 'Space', desc: 'Pan camera (or drag with right-click)' }
];

export const MINIMAP_COLORS = {
  0: '#5fa3b8',
  1: '#7fb85a',
  2: '#8f8a82',
  3: '#d8c58f',
  4: '#e0b24a',
  5: '#d9694f',
  6: '#5fa3b8'
};

export const TALK_MESSAGES = [
  '“Bridge, please!”',
  '“Work wanted!”',
  '“A cottage with a view, perhaps?”',
  '“Gone fishing.”',
  '“Milling merrily.”',
  '“Doorstep dawdling.”',
  '“Fresh harvest on the way!”',
  '“The church bells chime across the meadow.”',
  '“What a splendid castle atop the hill!”'
];

export const K = (x, y) => (x + 50000) * 100003 + (y + 50000);

export const unK = (k) => [
  Math.floor(k / 100003) - 50000,
  (k % 100003) - 50000
];

export const hash = (x, y) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

export function createStarterWorld(seed = Math.random() * 10000) {
  const map = new Map();

  // Procedural random island generation parameters
  const radiusBase = 7.5 + hash(seed, 1.1) * 2.5; // Radius between 7.5 and 10.0
  const lobeFreq1 = 2 + Math.floor(hash(seed, 2.2) * 3); // 2, 3, or 4 lobes
  const lobeAmp1 = 1.2 + hash(seed, 3.3) * 1.4;
  const lobeFreq2 = 4 + Math.floor(hash(seed, 4.4) * 3); // secondary ripples
  const lobeAmp2 = 0.6 + hash(seed, 5.5) * 0.8;
  const rotationOffset = hash(seed, 6.6) * Math.PI * 2;
  const centerX = (hash(seed, 7.7) - 0.5) * 2;
  const centerY = (hash(seed, 8.8) - 0.5) * 2;

  // 1. Generate Organic Base Landmass
  for (let y = -14; y <= 14; y++) {
    for (let x = -14; x <= 14; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) + rotationOffset;

      // Multi-octave organic coastline noise
      const rLobe =
        Math.sin(angle * lobeFreq1) * lobeAmp1 +
        Math.cos(angle * lobeFreq2) * lobeAmp2 +
        (hash(x * 3.7 + seed, y * 7.1) - 0.5) * 2.2;

      if (dist + rLobe < radiusBase) {
        map.set(K(x, y), 1);
      }
    }
  }

  // 2. Satellite stepping-stone islets (1 to 3 tiny islands nearby)
  const numIslets = 1 + Math.floor(hash(seed, 9.9) * 3);
  for (let i = 0; i < numIslets; i++) {
    const isletAngle = (i * (Math.PI * 2 / numIslets)) + hash(seed + i, 11) * 1.5;
    const isletDist = radiusBase + 2.5 + hash(seed + i, 12) * 2.5;
    const ix0 = Math.round(centerX + Math.cos(isletAngle) * isletDist);
    const iy0 = Math.round(centerY + Math.sin(isletAngle) * isletDist);
    const isletSize = 1 + Math.floor(hash(seed + i, 13) * 1.8);
    for (let dy = -isletSize; dy <= isletSize; dy++) {
      for (let dx = -isletSize; dx <= isletSize; dx++) {
        if (Math.hypot(dx, dy) <= isletSize * 0.95) {
          map.set(K(ix0 + dx, iy0 + dy), 1);
        }
      }
    }
  }

  const getTile = (x, y) => map.get(K(x, y)) || 0;
  const isLand = (x, y) => (getTile(x, y) % 10) > 0;

  // 3. Natural Hill Elevation (Tier 1 & Tier 2 plateaus)
  const hillAngle = hash(seed, 14) * Math.PI * 2;
  const hillDist = hash(seed, 15) * (radiusBase * 0.35);
  const hx = Math.round(centerX + Math.cos(hillAngle) * hillDist);
  const hy = Math.round(centerY + Math.sin(hillAngle) * hillDist);

  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const tx = hx + dx;
      const ty = hy + dy;
      if (!isLand(tx, ty)) continue;
      const d = Math.hypot(dx, dy);
      if (d <= 1.4) {
        map.set(K(tx, ty), 1 + 20); // Tier 2 elevated peak
      } else if (d <= 3.2) {
        map.set(K(tx, ty), 1 + 10); // Tier 1 hill
      }
    }
  }

  // 4. Mountains / Rock Ridge (Type 2)
  const mtnAngle = hillAngle + Math.PI * (0.6 + hash(seed, 16) * 0.8);
  const mtnDist = radiusBase * (0.35 + hash(seed, 17) * 0.3);
  const mx0 = Math.round(centerX + Math.cos(mtnAngle) * mtnDist);
  const my0 = Math.round(centerY + Math.sin(mtnAngle) * mtnDist);

  // Pick 5 to 7 connected mountain points
  const mtnTiles = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const last = mtnTiles[mtnTiles.length - 1];
    const dir = Math.floor(hash(seed * 3 + i, 18) * 4);
    const step = dir === 0 ? [1, 0] : dir === 1 ? [-1, 0] : dir === 2 ? [0, 1] : [0, -1];
    const nx = last[0] + step[0];
    const ny = last[1] + step[1];
    if (!mtnTiles.some(([tx, ty]) => tx === nx && ty === ny)) {
      mtnTiles.push([nx, ny]);
    }
  }

  mtnTiles.forEach(([dx, dy]) => {
    const tx = mx0 + dx;
    const ty = my0 + dy;
    if (isLand(tx, ty)) {
      const curTier = Math.floor((map.get(K(tx, ty)) || 0) / 10);
      map.set(K(tx, ty), 2 + curTier * 10);
    }
  });

  // 5. Village / Settlement Location
  const villAngle = mtnAngle + Math.PI;
  const villDist = radiusBase * (0.2 + hash(seed, 19) * 0.3);
  const vx0 = Math.round(centerX + Math.cos(villAngle) * villDist);
  const vy0 = Math.round(centerY + Math.sin(villAngle) * villDist);

  const candidateCells = [];
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const tx = vx0 + dx;
      const ty = vy0 + dy;
      const raw = map.get(K(tx, ty));
      if (raw && (raw % 10) === 1) {
        candidateCells.push([tx, ty]);
      }
    }
  }

  const centerCell = candidateCells.length > 0 ? candidateCells[0] : [0, 0];
  const [cx, cy] = centerCell;

  // Town Square / Roads (Type 3)
  const roadOffsets = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]];
  roadOffsets.forEach(([dx, dy]) => {
    const tx = cx + dx;
    const ty = cy + dy;
    if (isLand(tx, ty) && (map.get(K(tx, ty)) % 10) === 1) {
      const tier = Math.floor(map.get(K(tx, ty)) / 10);
      map.set(K(tx, ty), 3 + tier * 10);
    }
  });

  // Houses (Type 5)
  const houseCandidates = [
    [cx - 1, cy - 1],
    [cx + 1, cy - 1],
    [cx - 1, cy + 1],
    [cx + 1, cy + 1],
    [cx + 2, cy],
    [cx, cy - 2]
  ];
  let housesPlaced = 0;
  for (const [hx, hy] of houseCandidates) {
    if (housesPlaced >= 3) break;
    if (isLand(hx, hy) && (map.get(K(hx, hy)) % 10) === 1) {
      const tier = Math.floor(map.get(K(hx, hy)) / 10);
      map.set(K(hx, hy), 5 + tier * 10);
      housesPlaced++;
    }
  }

  // 6. Agricultural Fields / Crops (Type 4)
  const fieldDir = hash(seed, 20) > 0.5 ? 1 : -1;
  const fx0 = cx + fieldDir * 2;
  const fy0 = cy + 2;
  const fieldOffsets = [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0]];
  fieldOffsets.forEach(([dx, dy]) => {
    const tx = fx0 + dx;
    const ty = fy0 + dy;
    if (isLand(tx, ty) && (map.get(K(tx, ty)) % 10) === 1) {
      const tier = Math.floor(map.get(K(tx, ty)) / 10);
      map.set(K(tx, ty), 4 + tier * 10);
    }
  });

  return map;
}
