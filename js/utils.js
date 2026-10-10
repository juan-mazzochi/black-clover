/* Funciones matemáticas chicas que se usan en todo el juego. */
(function (root) {
  const BC = (root.BC = root.BC || {});

  const U = {
    clamp(v, a, b) {
      return v < a ? a : v > b ? b : v;
    },
    lerp(a, b, t) {
      return a + (b - a) * t;
    },
    dist2(ax, ay, bx, by) {
      const dx = ax - bx;
      const dy = ay - by;
      return dx * dx + dy * dy;
    },
    dist(ax, ay, bx, by) {
      return Math.sqrt(U.dist2(ax, ay, bx, by));
    },
    angleTo(ax, ay, bx, by) {
      return Math.atan2(by - ay, bx - ax);
    },
    norm(x, y) {
      const l = Math.sqrt(x * x + y * y);
      return l > 0 ? { x: x / l, y: y / l, l } : { x: 0, y: 0, l: 0 };
    },
    // diferencia angular en [-PI, PI]
    angleDiff(a, b) {
      let d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    },
    // distancia de un punto a un segmento
    segDist(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const l2 = dx * dx + dy * dy;
      let t = l2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = x1 + t * dx;
      const cy = y1 + t * dy;
      return Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
    },
    deepClone(o) {
      return JSON.parse(JSON.stringify(o));
    },
    pct(v) {
      return Math.round(v * 100) + '%';
    },
  };

  BC.U = U;
})(typeof window !== 'undefined' ? window : globalThis);
