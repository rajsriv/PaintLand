import { useEffect, useRef } from 'react';
import { MINIMAP_COLORS, unK, W, H } from '../game/constants';

export default function Minimap({ grid, camx, camy, sc, cw, ch, onJump }) {
  const canvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const mmStateRef = useRef({ mmx: 0, mmy: 0, mms: 1 });

  const getViewportCenter = () => {
    const ox = cw / sc / 2 + camx;
    const oy = ch / sc / 2 + camy;
    const a = ((cw / sc / 2 - ox) * 2) / W;
    const b = ((ch / sc / 2 - oy) * 2) / H;
    return {
      vx: (a + b) / 2,
      vy: (b - a) / 2
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { vx, vy } = getViewportCenter();
    let x0 = vx,
      x1 = vx,
      y0 = vy,
      y1 = vy;

    for (const k of grid.keys()) {
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
    mmStateRef.current = { mmx, mmy, mms };

    ctx.clearRect(0, 0, 140, 140);

    for (const [k, v] of grid) {
      const [x, y] = unK(k);
      const type = typeof v === 'object' ? v.type : (v % 10);
      ctx.fillStyle = MINIMAP_COLORS[type] || '#888';
      ctx.fillRect((x - mmx) * mms, (y - mmy) * mms, Math.max(mms, 1.8), Math.max(mms, 1.8));
    }

    // Viewport camera rect
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.strokeRect((vx - mmx) * mms - 7, (vy - mmy) * mms - 7, 14, 14);
  }, [grid, camx, camy, sc, cw, ch]);

  const handlePointer = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const { mmx, mmy, mms } = mmStateRef.current;
    const tx = mmx + (((e.clientX - r.left) / r.width) * 140) / mms;
    const ty = mmy + (((e.clientY - r.top) / r.height) * 140) / mms;
    onJump(tx, ty);
  };

  return (
    <div className="minimap-container" title="Minimap (Click or drag to navigate)">
      <canvas
        ref={canvasRef}
        width={140}
        height={140}
        className="minimap-canvas"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          isDraggingRef.current = true;
          handlePointer(e);
        }}
        onPointerMove={(e) => {
          if (isDraggingRef.current) handlePointer(e);
        }}
        onPointerUp={() => {
          isDraggingRef.current = false;
        }}
      />
      <div className="minimap-label">RADAR</div>
    </div>
  );
}
