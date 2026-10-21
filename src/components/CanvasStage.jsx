import { useEffect, useRef, useCallback } from 'react';
import { W, H, SEASONS, K, unK, MINIMAP_COLORS } from '../game/constants';
import {
  P,
  ht,
  poly,
  at,
  kind,
  ocean,
  clouds,
  cloudShadows,
  drawBoat,
  drawVillager,
  tile,
  tileGround,
  tileShadow,
  tileStructure,
  tileAt,
  toRotated,
  fromRotated,
  getLightParams,
  getHouseLightState,
  castShadow,
  drawTornado,
  drawHouseArchitecturalLight,
  drawHouseProximityShadows,
  drawNightHouseBlooms,
  drawRegionalAtmosphericFog
} from '../game/engine';
import { updateSimulation } from '../game/simulation';
import { drawBird, drawBirdShadow } from '../game/birds';
import { drawMarineLife } from '../game/marine';
import { sound } from '../game/sound';

export default function CanvasStage({
  grid,
  setGrid,
  activeTool,
  seasonId,
  onRecordHistory,
  onUpdateStats,
  onZoomChange,
  onRotateChange,
  camRef
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const minimapCanvasRef = useRef(null);
  const darkCanvasRef = useRef(null);

  // Synchronized refs for the continuous 60fps render loop
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  const seasonIdRef = useRef(seasonId);
  seasonIdRef.current = seasonId;

  const onUpdateStatsRef = useRef(onUpdateStats);
  onUpdateStatsRef.current = onUpdateStats;

  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;

  const onRotateChangeRef = useRef(onRotateChange);
  onRotateChangeRef.current = onRotateChange;

  const hoverTileRef = useRef(null);

  // Internal persistent simulation refs
  const simRef = useRef({
    villagers: [],
    boats: [],
    birds: [],
    marineLife: [],
    talkState: { t: 0, lastMsgAt: 0, currentMsg: '' },
    lastFrameTime: 0,
    lastStatsTime: 0
  });

  // Camera & Transform refs
  const transformRef = useRef({
    camx: 0,
    camy: 0,
    zm: 1,
    sc: 1,
    ox: 0,
    oy: 0,
    cw: 0,
    ch: 0,
    dpr: 1,
    rot: 0
  });

  const mmStateRef = useRef({ mmx: 0, mmy: 0, mms: 1, isDragging: false });

  const pointerRef = useRef({
    ptrs: new Map(),
    isPainting: false,
    isPanning: false,
    lx: 0,
    ly: 0,
    pinchDist: 0,
    lastPaintedKey: null
  });

  // Calculate Layout scale and offsets
  const updateLayout = useCallback(() => {
    const t = transformRef.current;
    if (t.cw <= 0 || t.ch <= 0) return;
    t.sc = Math.min(t.cw / (20 * W + 60), t.ch / (20 * H + 130)) * t.zm;
    t.ox = t.cw / t.sc / 2 + t.camx;
    t.oy = t.ch / t.sc / 2 + t.camy;

    if (onZoomChangeRef.current) {
      onZoomChangeRef.current(t.zm);
    }

    if (camRef) {
      camRef.current = {
        camx: t.camx,
        camy: t.camy,
        zoom: t.zm,
        rotation: t.rot || 0,
        setZoom: (newZm) => {
          t.zm = Math.min(3.0, Math.max(0.4, newZm));
          updateLayout();
        },
        rotate: (dir) => {
          const oldRot = t.rot || 0;
          const newRot = ((oldRot + dir) % 4 + 4) % 4;

          // Viewport center in current camera coordinates
          const a = ((t.cw / t.sc / 2 - t.ox) * 2) / W;
          const b = ((t.ch / t.sc / 2 - t.oy) * 2) / H;
          const curRx = (a + b) / 2;
          const curRy = (b - a) / 2;

          // World coordinate currently at screen center
          const [worldX, worldY] = fromRotated(curRx, curRy, oldRot);

          // New camera coordinates for the same world center point
          const [newRx, newRy] = toRotated(worldX, worldY, newRot);

          t.camx = -(newRx - newRy) * (W / 2);
          t.camy = -(newRx + newRy) * (H / 2);
          t.rot = newRot;

          sound.play('click');
          updateLayout();
          if (onRotateChangeRef.current) {
            onRotateChangeRef.current(newRot);
          }
        },
        centerHome: () => {
          let sx = 0,
            sy = 0,
            n = 0;
          for (const k of gridRef.current.keys()) {
            const [x, y] = unK(k);
            sx += x;
            sy += y;
            n++;
          }
          t.zm = 1;
          const tx = n ? sx / n : 0;
          const ty = n ? sy / n : 0;
          const [rx, ry] = toRotated(tx, ty, t.rot || 0);
          t.camx = (-(rx - ry) * W) / 2;
          t.camy = (-(rx + ry) * H) / 2;
          updateLayout();
        }
      };
    }
  }, [camRef]);

  // Jump camera directly to world coordinate
  const handleJump = useCallback((tx, ty) => {
    const t = transformRef.current;
    const [rx, ry] = toRotated(tx, ty, t.rot || 0);
    t.camx = (-(rx - ry) * W) / 2;
    t.camy = (-(rx + ry) * H) / 2;
    updateLayout();
  }, [updateLayout]);

  // Apply tool to world with smooth curved land uplift and higher mountain peaks
  const applyTool = useCallback(
    (tileCoord) => {
      const tool = activeToolRef.current;
      if (!tileCoord || tool < 0) return;
      const [x, y] = tileCoord;
      const k = K(x, y);

      // Avoid re-applying same tile on drag unless cursor moves to a new tile
      if (pointerRef.current.lastPaintedKey === k) return;
      pointerRef.current.lastPaintedKey = k;

      const currentRaw = gridRef.current.get(k) || 0;
      const currentType = typeof currentRaw === 'object' ? currentRaw.type : (currentRaw % 10);
      const currentTier = typeof currentRaw === 'object' ? currentRaw.h : Math.floor(currentRaw / 10);

      // Water tool on existing water does nothing
      if (tool === 0 && currentRaw === 0) return;

      setGrid((prevGrid) => {
        const nextGrid = new Map(prevGrid);

        if (tool === 0) {
          // Water tool (0 / 6):
          if (currentType === 6) {
            // Already water: clicking again lowers by 1 tier, or clears to ocean if at sea level (tier 0)
            if (currentTier > 0) {
              nextGrid.set(k, 6 + (currentTier - 1) * 10);
            } else {
              nextGrid.delete(k);
            }
          } else {
            // Place water directly on the SAME LEVEL as the current land/structure!
            // Maintains currentTier so flat land or elevated hills/mountains get water at their height
            nextGrid.set(k, 6 + currentTier * 10);
          }
        } else if (tool === 1) {
          // Land tool
          if (currentType === 1) {
            // Painting Land over Land uplifts the land mass in that area
            const newTier = Math.min(currentTier + 1, 6);
            nextGrid.set(k, 1 + newTier * 10);

            // Uplift surrounding land in a smooth Gaussian-like curve falloff
            for (let dx = -2; dx <= 2; dx++) {
              for (let dy = -2; dy <= 2; dy++) {
                if (dx === 0 && dy === 0) continue;
                const dist = Math.hypot(dx, dy);
                if (dist > 2.3) continue;

                // Radius 1: 1 tier below; Radius 2: 2 tiers below
                const falloff = dist <= 1.5 ? 1 : 2;
                const minTier = newTier - falloff;
                if (minTier <= 0) continue;

                const nk = K(x + dx, y + dy);
                const nRaw = nextGrid.get(nk) || 0;
                const nType = typeof nRaw === 'object' ? nRaw.type : (nRaw % 10);
                const nTier = typeof nRaw === 'object' ? nRaw.h : Math.floor(nRaw / 10);

                // Elevate connected land, canals, and structures smoothly
                if (nType > 0 && nType !== 2 && nTier < minTier) {
                  nextGrid.set(nk, nType + minTier * 10);
                }
              }
            }
          } else {
            // New land or replacing water/non-land at current elevation level
            const baseTier = currentType !== 0 ? currentTier : 0;
            nextGrid.set(k, 1 + baseTier * 10);
          }
        } else if (tool === 2) {
          // Mountain tool: places mountain directly on the terrain
          const baseTier = currentType !== 0 ? currentTier : 0;
          nextGrid.set(k, 2 + baseTier * 10);
        } else {
          // Other tools (Road: 3, Field: 4, House: 5): inherit terrain elevation
          const baseTier = currentType !== 0 ? currentTier : 0;
          nextGrid.set(k, tool + baseTier * 10);
        }

        gridRef.current = nextGrid;
        return nextGrid;
      });

      sound.play(tool);
    },
    [setGrid]
  );

  // Resize listener
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const t = transformRef.current;

      t.dpr = dpr;
      t.cw = rect.width;
      t.ch = rect.height;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      updateLayout();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    return () => resizeObserver.disconnect();
  }, [updateLayout]);

  // Minimap rendering helper
  const drawMinimap = (mmCanvas, curGrid, t, mmState) => {
    if (!mmCanvas) return;
    const mc = mmCanvas.getContext('2d');
    if (!mc) return;

    const a = ((t.cw / t.sc / 2 - t.ox) * 2) / W;
    const b = ((t.ch / t.sc / 2 - t.oy) * 2) / H;
    const rx = (a + b) / 2;
    const ry = (b - a) / 2;
    const [vx, vy] = fromRotated(rx, ry, t.rot || 0);

    let x0 = vx,
      x1 = vx,
      y0 = vy,
      y1 = vy;

    for (const k of curGrid.keys()) {
      const [x, y] = unK(k);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }

    const span = Math.max(x1 - x0, y1 - y0, 24) + 8;
    const mms = 140 / span;
    const mmx = (x0 + x1) / 2 - span / 2;
    const mmy = (y0 + y1) / 2 - span / 2;

    mmState.mmx = mmx;
    mmState.mmy = mmy;
    mmState.mms = mms;

    mc.clearRect(0, 0, 140, 140);

    for (const [k, v] of curGrid) {
      const [x, y] = unK(k);
      const type = typeof v === 'object' ? v.type : (v % 10);
      mc.fillStyle = MINIMAP_COLORS[type] || '#888';
      mc.fillRect((x - mmx) * mms, (y - mmy) * mms, Math.max(mms, 1.8), Math.max(mms, 1.8));
    }

    mc.strokeStyle = '#8b5cf6';
    mc.lineWidth = 2;
    mc.strokeRect((vx - mmx) * mms - 7, (vy - mmy) * mms - 7, 14, 14);
  };

  // Persistent Animation Loop - Runs continuously without restarts
  useEffect(() => {
    let animId;
    let frameCount = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bucket = new Map();
    let lastCachedGrid = null;
    let cachedActiveTiles = [];

    const loop = (timestamp) => {
      const t = transformRef.current;
      const sim = simRef.current;
      const curGrid = gridRef.current;
      const curSeasonId = seasonIdRef.current;
      const rot = t.rot || 0;
      const dt = Math.min(0.05, (timestamp - (sim.lastFrameTime || timestamp)) / 1000);
      sim.lastFrameTime = timestamp;
      sim.talkState.t = timestamp;

      // Update cached active island tiles whenever grid changes (avoids scanning ocean)
      if (curGrid !== lastCachedGrid) {
        lastCachedGrid = curGrid;
        const tileSet = new Set();
        for (const k of curGrid.keys()) {
          const [x, y] = unK(k);
          const val = curGrid.get(k);
          const ty = typeof val === 'object' ? val.type : val % 10;
          if (ty > 0) {
            // Land/structures: include this tile and 1-tile shoreline fringe
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                tileSet.add(K(x + dx, y + dy));
              }
            }
          } else {
            tileSet.add(k);
          }
        }
        const list = [];
        for (const k of tileSet) {
          list.push(unK(k));
        }
        list.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
        cachedActiveTiles = list;
      }

      // Update world simulation
      const a = ((t.cw / t.sc / 2 - t.ox) * 2) / W;
      const b = ((t.ch / t.sc / 2 - t.oy) * 2) / H;
      const [camWorldX, camWorldY] = fromRotated((a + b) / 2, (b - a) / 2, rot);
      const camCoords = {
        mx: camWorldX,
        my: camWorldY
      };

      const simResult = updateSimulation(
        dt,
        curGrid,
        sim.villagers,
        sim.boats,
        sim.birds || [],
        camCoords,
        sim.talkState,
        sim.marineLife || []
      );
      sim.villagers = simResult.villagers;
      sim.boats = simResult.boats;
      sim.birds = simResult.birds || [];
      sim.marineLife = simResult.marineLife || [];

      // Throttled stats dispatch (every 1s)
      if (timestamp - sim.lastStatsTime > 1000) {
        sim.lastStatsTime = timestamp;
        if (onUpdateStatsRef.current) {
          onUpdateStatsRef.current({
            homes: simResult.homes,
            villagers: simResult.villagers.length,
            message: sim.talkState.currentMsg
          });
        }
      }

      // Drawing
      const palette = SEASONS[curSeasonId] || SEASONS[0];
      const light = getLightParams(timestamp);
      const nt = light.nt;

      ctx.setTransform(t.dpr * t.sc, 0, 0, t.dpr * t.sc, 0, 0);
      ctx.clearRect(0, 0, t.cw / t.sc, t.ch / t.sc);
      bucket.clear();

      ocean(ctx, t.cw, t.ch, t.sc, t.camx, t.camy, timestamp, palette, nt, light, rot, t.ox, t.oy);

      // Marine life (whales, dolphins, sharks, manta rays, fish schools) swimming in open ocean
      if (sim.marineLife && sim.marineLife.length) {
        drawMarineLife(ctx, sim.marineLife, t.ox, t.oy, curGrid, rot, timestamp, light, nt);
      }

      // Bucket entities for depth sorting
      for (const v of sim.villagers.concat(sim.boats)) {
        const f = v.p;
        const ex = v.ax + (v.tx - v.ax) * f;
        const ey = v.ay + (v.ty - v.ay) * f;
        const key = Math.round(ex) + ',' + Math.round(ey);
        if (!bucket.has(key)) bucket.set(key, []);
        bucket.get(key).push([ex, ey, v.b ? 'b' : v.c, v]);
      }

      const vw = t.cw / t.sc;
      const vh = t.ch / t.sc;
      const corners = [
        [-70, -110],
        [vw + 70, -110],
        [vw + 70, vh + 70],
        [-70, vh + 70]
      ].map(([wx, wy]) => {
        const ca = ((wx - t.ox) * 2) / W;
        const cb = ((wy - t.oy) * 2) / H;
        const rx = (ca + cb) / 2;
        const ry = (cb - ca) / 2;
        return fromRotated(rx, ry, rot);
      });

      const x0 = Math.floor(Math.min(...corners.map((c) => c[0])));
      const x1 = Math.ceil(Math.max(...corners.map((c) => c[0])));
      const y0 = Math.floor(Math.min(...corners.map((c) => c[1])));
      const y1 = Math.ceil(Math.max(...corners.map((c) => c[1])));

      // Collect visible tiles in isometric depth order from cached active island tiles
      const visibleTiles = [];
      for (let i = 0; i < cachedActiveTiles.length; i++) {
        const pt = cachedActiveTiles[i];
        const x = pt[0];
        const y = pt[1];
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        const q = P(t.ox, t.oy, x, y, 0, rot);
        if (q[0] < -70 || q[0] > vw + 70 || q[1] < -110 || q[1] > vh + 70) continue;
        visibleTiles.push(pt);
      }

      // Ensure all entity cells (e.g. boats sailing out in ocean) are included in visibleTiles
      const tileKeySet = new Set(visibleTiles.map(([x, y]) => x + ',' + y));
      for (const key of bucket.keys()) {
        if (!tileKeySet.has(key)) {
          const [bx, by] = key.split(',').map(Number);
          const q = P(t.ox, t.oy, bx, by, 0, rot);
          if (q[0] >= -100 && q[0] <= vw + 100 && q[1] >= -150 && q[1] <= vh + 100) {
            visibleTiles.push([bx, by]);
            tileKeySet.add(key);
          }
        }
      }

      // Depth sort visible tiles and entity locations
      visibleTiles.sort((ta, tb) => {
        const [raX, raY] = toRotated(ta[0], ta[1], rot);
        const [rbX, rbY] = toRotated(tb[0], tb[1], rot);
        return (raX + raY) - (rbX + rbY) || (raX - rbX);
      });

      // Pass 1: Render all ground surfaces with continuous curved mesh & topographical lighting
      for (let i = 0; i < visibleTiles.length; i++) {
        const [x, y] = visibleTiles[i];
        tileGround(ctx, curGrid, t.ox, t.oy, x, y, timestamp, palette, curSeasonId, light, rot);
      }

      // Pass 2: Render all real-time shadows across multiple blocks on top of the ground plane
      // Atmospheric cloud shadows drifting across landscape
      cloudShadows(ctx, t.cw, t.ch, t.sc, timestamp, nt, light, t.ox, t.oy);

      for (let i = 0; i < visibleTiles.length; i++) {
        const [x, y] = visibleTiles[i];
        tileShadow(ctx, curGrid, t.ox, t.oy, x, y, timestamp, light, rot);
      }
      for (const entities of bucket.values()) {
        for (const [vx, vy, c] of entities) {
          const [px, py0] = P(
            t.ox,
            t.oy,
            vx,
            vy,
            c === 'b' ? 0.02 : ht(curGrid, Math.round(vx), Math.round(vy)),
            rot
          );
          if (c === 'b') {
            castShadow(ctx, px, py0 + 0.5, 7.5, 2.5, 0.8, light, 'agent');
          } else {
            castShadow(ctx, px, py0 + 1, 1.6, 0.8, 3.5, light, 'agent');
          }
        }
      }

      // Flying bird shadows projected onto terrain and water
      if (sim.birds && sim.birds.length) {
        for (let bi = 0; bi < sim.birds.length; bi++) {
          drawBirdShadow(ctx, sim.birds[bi], t.ox, t.oy, curGrid, rot, light);
        }
      }

      // Proximity point-light ground shadows cast by trees, props, villagers & boats away from lit houses
      drawHouseProximityShadows(ctx, curGrid, t.ox, t.oy, timestamp, nt, light, rot, visibleTiles, sim.villagers, sim.boats);

      // Pass 3: Render all 3D structures, directional face lighting, and entities in depth order
      const drawnEntities = new Set();
      for (let i = 0; i < visibleTiles.length; i++) {
        const [x, y] = visibleTiles[i];
        tileStructure(ctx, curGrid, t.ox, t.oy, x, y, timestamp, palette, curSeasonId, nt, light, rot);

        const entities = bucket.get(x + ',' + y);
        if (entities) {
          for (const [vx, vy, c, ent] of entities) {
            drawnEntities.add(ent);
            const [px, py0] = P(
              t.ox,
              t.oy,
              vx,
              vy,
              c === 'b' ? 0.02 : ht(curGrid, Math.round(vx), Math.round(vy)),
              rot
            );

            if (c === 'b') {
              drawBoat(ctx, px, py0, ent, timestamp, light, rot);
              continue;
            }

            // Villager 3D model
            drawVillager(ctx, px, py0, ent, timestamp, light, rot);
          }
        }
      }

      // Guaranteed fallback: If any boat or villager on screen wasn't visited in visibleTiles, render it
      for (const v of sim.villagers.concat(sim.boats)) {
        if (!drawnEntities.has(v)) {
          const f = v.p;
          const ex = v.ax + (v.tx - v.ax) * f;
          const ey = v.ay + (v.ty - v.ay) * f;
          const [px, py0] = P(
            t.ox,
            t.oy,
            ex,
            ey,
            v.b ? 0.02 : ht(curGrid, Math.round(ex), Math.round(ey)),
            rot
          );
          if (px >= -80 && px <= vw + 80 && py0 >= -100 && py0 <= vh + 100) {
            drawnEntities.add(v);
            if (v.b) {
              drawBoat(ctx, px, py0, v, timestamp, light, rot);
            } else {
              drawVillager(ctx, px, py0, v, timestamp, light, rot);
            }
          }
        }
      }

      // Flying birds (rendered at their respective 3D altitudes)
      if (sim.birds && sim.birds.length) {
        for (let bi = 0; bi < sim.birds.length; bi++) {
          drawBird(ctx, sim.birds[bi], t.ox, t.oy, rot, timestamp, light);
        }
      }

      // Tornado whirlwind vortex event
      drawTornado(ctx, t.ox, t.oy, timestamp);

      // Living volumetric atmospheric fog sticking strictly to northern region
      drawRegionalAtmosphericFog(ctx, t.cw, t.ch, t.sc, t.ox, t.oy, timestamp, palette, nt, light);

      clouds(ctx, t.cw, t.sc, timestamp, nt, light);

      // Night ambient overlay (Deep, rich nocturnal darkness with soft illumination cutouts for lit houses)
      if (nt > 0) {
        if (!darkCanvasRef.current) {
          darkCanvasRef.current = document.createElement('canvas');
        }
        const dCanvas = darkCanvasRef.current;
        const dw = Math.max(1, Math.ceil(vw));
        const dh = Math.max(1, Math.ceil(vh));
        if (dCanvas.width !== dw || dCanvas.height !== dh) {
          dCanvas.width = dw;
          dCanvas.height = dh;
        }
        const dctx = dCanvas.getContext('2d');
        dctx.clearRect(0, 0, dw, dh);

        // 1. Fill darkness overlay with nocturnal deep blue/black
        const nightAlpha = Math.min(0.78, nt * 0.78);
        dctx.fillStyle = `rgba(5, 9, 28, ${nightAlpha})`;
        dctx.fillRect(0, 0, dw, dh);

        if (nt > 0.35) {
          const deepNightAlpha = Math.min(0.28, (nt - 0.35) * 0.45);
          dctx.fillStyle = `rgba(2, 4, 16, ${deepNightAlpha})`;
          dctx.fillRect(0, 0, dw, dh);
        }

        // 2. Softly relieve darkness where light physically spills from doorways and windows
        dctx.globalCompositeOperation = 'destination-out';
        if (visibleTiles) {
          for (let i = 0; i < visibleTiles.length; i++) {
            const [x, y] = visibleTiles[i];
            if (at(curGrid, x, y) === 5 && kind(curGrid, x, y) === 'house') {
              const houseLight = getHouseLightState(x, y, timestamp, nt, light);
              if (houseLight.intensity > 0.05) {
                drawHouseArchitecturalLight(dctx, curGrid, t.ox, t.oy, x, y, ht(curGrid, x, y), rot, houseLight, true);
              }
            }
          }
        }

        // Also carve soft light around boats with lanterns
        if (sim.boats && sim.boats.length) {
          for (const b of sim.boats) {
            if (!b.hasLantern) continue;
            const f = b.p;
            const ex = b.ax + (b.tx - b.ax) * f;
            const ey = b.ay + (b.ty - b.ay) * f;
            const [px, py0] = P(t.ox, t.oy, ex, ey, 0.3, rot);
            const bob = Math.sin(timestamp / 680 + b.ax * 2.8 + b.ay * 1.9) * 1.8;
            const lx = px + 10.5;
            const ly = py0 + bob - 1.5;

            const lGrad = dctx.createRadialGradient(lx, ly, 1, lx, ly, 20);
            lGrad.addColorStop(0, `rgba(0, 0, 0, ${0.36 * Math.min(1, nt * 1.2)})`);
            lGrad.addColorStop(0.5, `rgba(0, 0, 0, ${0.15 * Math.min(1, nt * 1.2)})`);
            lGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            dctx.fillStyle = lGrad;
            dctx.beginPath();
            dctx.arc(lx, ly, 20, 0, Math.PI * 2);
            dctx.fill();
          }
        }

        dctx.globalCompositeOperation = 'source-over';

        // Blit darkness onto world
        ctx.drawImage(dCanvas, 0, 0);
      }

      // Houses & lanterns illuminate area around themselves (delicate atmospheric screen bloom)
      drawNightHouseBlooms(ctx, curGrid, t.ox, t.oy, timestamp, nt, light, rot, visibleTiles, sim.boats);

      // Cursor Highlight Ring from ref (no state re-render)
      const hov = hoverTileRef.current;
      if (hov) {
        const [hx, hy] = hov;
        const [sx, sy] = P(t.ox, t.oy, hx, hy, ht(curGrid, hx, hy), rot);
        const hw = W / 2;
        const hh = H / 2;
        const r = 0.22;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(sx - hw * (1 - r), sy - hh * r);
        ctx.quadraticCurveTo(sx - hw, sy, sx - hw * (1 - r), sy + hh * r);
        ctx.lineTo(sx - hw * r, sy + hh * (1 - r));
        ctx.quadraticCurveTo(sx, sy + hh, sx + hw * r, sy + hh * (1 - r));
        ctx.lineTo(sx + hw * (1 - r), sy + hh * r);
        ctx.quadraticCurveTo(sx + hw, sy, sx + hw * (1 - r), sy - hh * r);
        ctx.lineTo(sx + hw * r, sy - hh * (1 - r));
        ctx.quadraticCurveTo(sx, sy - hh, sx - hw * r, sy - hh * (1 - r));
        ctx.closePath();
        ctx.stroke();
      }

      // Draw Minimap every 8 frames
      if (!(frameCount++ % 8) && minimapCanvasRef.current) {
        drawMinimap(minimapCanvasRef.current, curGrid, t, mmStateRef.current);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []); // Run continuously on mount

  // Pointer & Input Handling
  const getPointerTile = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    const t = transformRef.current;
    return tileAt(
      e.clientX - r.left,
      e.clientY - r.top,
      t.cw,
      t.ch,
      t.sc,
      t.ox,
      t.oy,
      gridRef.current,
      t.rot || 0
    );
  };

  const calcPinchDistance = () => {
    const arr = [...pointerRef.current.ptrs.values()];
    return Math.hypot(arr[0][0] - arr[1][0], arr[0][1] - arr[1][1]);
  };

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const p = pointerRef.current;
    const t = transformRef.current;
    p.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    p.lx = e.clientX;
    p.ly = e.clientY;
    p.lastPaintedKey = null;

    if (p.ptrs.size > 1) {
      p.isPainting = false;
      p.isPanning = true;
      p.pinchDist = calcPinchDistance();
      return;
    }

    if (e.button !== 0 || activeToolRef.current < 0) {
      p.isPanning = true;
      return;
    }

    onRecordHistory();
    p.isPainting = true;
    p.lastPaintedKey = null; // Reset so clicking repeatedly on the same tile triggers continuous uplifts
    const targetTile = getPointerTile(e);
    hoverTileRef.current = targetTile;
    applyTool(targetTile);
  };

  const handlePointerMove = (e) => {
    const p = pointerRef.current;
    const t = transformRef.current;

    if (p.ptrs.has(e.pointerId)) {
      p.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    }

    if (p.isPanning) {
      if (p.ptrs.size > 1) {
        const currentDist = calcPinchDistance();
        if (p.pinchDist > 0) {
          const ratio = currentDist / p.pinchDist;
          t.zm = Math.min(3.0, Math.max(0.4, t.zm * ratio));
          p.pinchDist = currentDist;
          updateLayout();
        }
      } else {
        t.camx += (e.clientX - p.lx) / t.sc;
        t.camy += (e.clientY - p.ly) / t.sc;
        p.lx = e.clientX;
        p.ly = e.clientY;
        updateLayout();
      }
      return;
    }

    const targetTile = getPointerTile(e);
    hoverTileRef.current = targetTile;
    if (p.isPainting) {
      applyTool(targetTile);
    }
  };

  const handlePointerUp = (e) => {
    const p = pointerRef.current;
    p.ptrs.delete(e.pointerId);
    p.isPainting = false;
    p.lastPaintedKey = null;
    if (!p.ptrs.size) {
      p.isPanning = false;
    }
  };

  // Direct non-passive wheel event listener for 100% reliable zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e) => {
      e.preventDefault();
      const t = transformRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 0.88;
      t.zm = Math.min(3.0, Math.max(0.4, t.zm * factor));
      updateLayout();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [updateLayout]);

  // Minimap Pointer Interaction
  const handleMinimapPointer = (e) => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const { mmx, mmy, mms } = mmStateRef.current;
    const tx = mmx + (((e.clientX - r.left) / r.width) * 140) / mms;
    const ty = mmy + (((e.clientY - r.top) / r.height) * 140) / mms;
    handleJump(tx, ty);
  };

  return (
    <div
      ref={containerRef}
      className={`stage-container ${activeTool < 0 ? 'move-mode' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          hoverTileRef.current = null;
        }}
      />

      {/* Embedded Minimap */}
      <div className="minimap-container" title="Minimap (Click or drag to navigate)">
        <canvas
          ref={minimapCanvasRef}
          width={140}
          height={140}
          className="minimap-canvas"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            mmStateRef.current.isDragging = true;
            handleMinimapPointer(e);
          }}
          onPointerMove={(e) => {
            if (mmStateRef.current.isDragging) handleMinimapPointer(e);
          }}
          onPointerUp={() => {
            mmStateRef.current.isDragging = false;
          }}
        />
        <div className="minimap-label">RADAR</div>
      </div>
    </div>
  );
}
