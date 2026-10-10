/*
 * PIXEL ART EN ALTA DEFINICIÓN (el doble de detalle).
 *
 * El mundo sigue midiendo 320 x 180 "píxeles grandes", pero ahora cada uno se
 * parte en 2 x 2: los personajes, enemigos, jefes, pisos, paredes, adornos e
 * íconos se dibujan con el doble de píxeles, con luces y sombras, ojos de
 * anime, mechones de pelo, pliegues en la ropa y armas con brillo.
 *
 * Los sprites HD llevan la marca `hd = 2`: quien los dibuja los achica a la
 * mitad, así que ocupan el mismo lugar que antes pero con más detalle.
 * Este archivo reemplaza las funciones de dibujo de js/pixel.js (que queda
 * como base: paleta, aspecto de cada personaje, utilidades).
 */
(function (root) {
  const BC = (root.BC = root.BC || {});
  const P = BC.Pixel;
  if (!P) return;
  const HD = 2;
  const shade = P.shade;
  const makeCanvas = P.makeCanvas;
  const cache = new Map();

  // mezcla dos colores (#rrggbb): t=0 -> a, t=1 -> b
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }

  // ---------------------------------------------------------------------
  // Grilla HD: como la de pixel.js, con formas extra y contorno "selectivo"
  // (el borde toma un tono oscuro del color de al lado, no negro puro)
  // ---------------------------------------------------------------------
  class GridHD extends P.Grid {
    clear(x, y) {
      if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = null;
    }
    // rectángulo con volumen: borde izquierdo/arriba con luz, derecho/abajo con sombra
    box(x0, y0, x1, y1, c, o) {
      o = o || {};
      this.rect(x0, y0, x1, y1, c);
      const light = shade(c, o.light === undefined ? 0.22 : o.light);
      const dark = shade(c, o.dark === undefined ? -0.28 : o.dark);
      if (x1 - x0 >= 2 && o.lx !== false) this.rect(x0, y0, x0, y1, light);
      if (o.top) this.rect(x0, y0, x1, y0, light);
      if (x1 - x0 >= 1 && o.rx !== false) this.rect(x1, y0, x1, y1, dark);
      if (o.bottom !== false && y1 - y0 >= 2) this.rect(x0 + (o.lx === false ? 0 : 1), y1, x1, y1, dark);
    }
    ellipse(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) this.set(x, y, c);
        }
    }
    // esfera/bola con luz arriba a la izquierda
    ball(cx, cy, rx, ry, c, amt) {
      const a = amt === undefined ? 1 : amt;
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          const d = dx * dx + dy * dy;
          if (d > 1) continue;
          const lit = -dx * 0.6 - dy * 0.8; // hacia la luz
          let col = c;
          if (lit > 0.55) col = shade(c, 0.32 * a);
          else if (lit > 0.15) col = shade(c, 0.12 * a);
          else if (lit < -0.55 || d > 0.8) col = shade(c, -0.3 * a);
          else if (lit < -0.15) col = shade(c, -0.14 * a);
          this.set(x, y, col);
        }
    }
    poly(pts, c) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const [x, y] of pts) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++)
        for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
          const px = x + 0.5;
          const py = y + 0.5;
          let inside = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [xi, yi] = pts[i];
            const [xj, yj] = pts[j];
            if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
          }
          if (inside) this.set(x, y, c);
        }
    }
    line(x0, y0, x1, y1, c) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
    }
    // contorno: cada píxel vacío pegado a algo dibujado toma un tono muy oscuro de ese color
    outlineSel(base, amt) {
      const add = [];
      const k = amt === undefined ? 0.78 : amt;
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          if (this.get(x, y)) continue;
          const n = this.get(x, y + 1) || this.get(x, y - 1) || this.get(x - 1, y) || this.get(x + 1, y);
          if (n) add.push([x, y, mix(n, base, k)]);
        }
      for (const [x, y, c] of add) this.set(x, y, c);
    }
    toCanvasHD(flip) {
      const c = this.toCanvas(flip);
      c.hd = HD;
      return c;
    }
  }

  // ---------------------------------------------------------------------
  // HUMANOIDES (personajes, la mayoría de los enemigos y los jefes)
  // Medidas pensadas para una caja de 24 x 30; los jefes se agrandan x1.5.
  // ---------------------------------------------------------------------
  const hl0 = (c) => shade(c, 0.35);
  function humanoid(look, frame) {
    const big = look.size === 'l';
    const k = big ? 1.5 : 1;
    const f = (v) => Math.round(v * k);
    const padX = f(7);
    const padT = f(8);
    const g = new GridHD(f(24) + padX * 2, f(30) + padT);
    // coordenadas de la caja -> grilla (r = rectángulo que escala bien)
    const X = (v) => padX + f(v);
    const Y = (v) => padT + f(v);
    const X1 = (v) => padX + f(v + 1) - 1;
    const Y1 = (v) => padT + f(v + 1) - 1;
    const R = (x0, y0, x1, y1, c) => g.rect(X(x0), Y(y0), X1(x1), Y1(y1), c);
    const B = (x0, y0, x1, y1, c, o) => g.box(X(x0), Y(y0), X1(x1), Y1(y1), c, o);
    const S = (x, y, c) => R(x, y, x, y, c);

    const skin = look.skin || '#e8c39e';
    const cloth = look.cloth || '#555560';
    const accent = look.accent || shade(cloth, 0.35);
    const pants = look.pants || shade(cloth, -0.32);
    const boots = look.boots || '#3a2a1c';
    const hair = look.hair;
    const hs = look.hairStyle || 'short';
    const outfit = look.outfit || 'tunic';
    const gold = '#e8c860';
    const walk = frame === 1 ? [2, 0] : frame === 2 ? [0, 2] : [0, 0];
    const swing = frame === 1 ? [-1, 1] : frame === 2 ? [1, -1] : [0, 0];

    // ---------- atrás de todo: alas ----------
    if (look.wings) {
      const wc = look.wings;
      const angel = look.halo || wc === '#ffffff';
      for (const side of [-1, 1]) {
        const sx = side < 0 ? 7 : 16; // hombro
        const out = side < 0 ? -7 : 30;
        const pts = angel
          ? [[sx, 12], [sx + side * 4, 5], [out - side * 2, 3], [out, 9], [out - side, 15], [sx + side * 6, 20], [sx, 18]]
          : [[sx, 12], [sx + side * 5, 4], [out, 2], [out - side * 2, 9], [out, 13], [out - side * 4, 15], [out - side * 3, 19], [sx + side * 4, 17], [sx, 19]];
        g.poly(pts.map(([x, y]) => [X(x), Y(y)]), wc);
        if (angel) {
          // plumas: líneas claras y oscuras
          for (let i = 0; i < 4; i++) {
            const t = i / 4;
            g.line(X(sx + side * 2), Y(13 + i * 1.5), X(out - side * (1 + i)), Y(5 + i * 3.5), shade(wc, -0.18));
            g.line(X(sx + side * 3), Y(10 + i), X(sx + side * (6 + i * 2)), Y(6 + t * 4), shade(wc, 0.25));
          }
        } else {
          // membrana con costillas
          g.line(X(sx), Y(12), X(out), Y(2), shade(wc, 0.3));
          g.line(X(sx + side * 2), Y(13), X(out - side * 2), Y(9), shade(wc, -0.35));
          g.line(X(sx + side * 2), Y(14), X(out - side * 4), Y(15), shade(wc, -0.35));
        }
      }
    }

    // ---------- capa (atrás del cuerpo) ----------
    if (look.cape) {
      const cc = look.cape;
      const wave = frame === 1 ? 1 : 0;
      for (let y = 12; y <= 28 + wave; y++) {
        const fl = Math.floor((y - 12) / 6);
        const a = 5 - fl;
        const b = 18 + fl;
        R(a, y, b, y, cc);
        S(a, y, shade(cc, 0.22));
        S(a + 1, y, shade(cc, 0.1));
        S(b, y, shade(cc, -0.3));
      }
      // borde de abajo ondeado y forro
      R(3, 28 + wave, 20, 28 + wave, look.lining || shade(cc, 0.18));
      for (let x = 3; x <= 20; x++) if ((x + frame) % 3 === 0) S(x, 29 + wave, shade(cc, -0.2));
    }

    // ---------- pelo de atrás ----------
    if (hair && hs === 'long') {
      B(4, 3, 19, 18, shade(hair, -0.12), { light: 0.15 });
      for (let x = 5; x <= 18; x += 3) R(x, 15, x, 18, shade(hair, -0.35));
      R(4, 17, 4, 19, shade(hair, -0.2));
      R(19, 17, 19, 19, shade(hair, -0.3));
    }
    if (hair && hs === 'twintails') {
      // dos coletas que cuelgan de los moños, separadas de la cabeza
      for (const side of [-1, 1]) {
        for (let y = 2; y <= 23; y++) {
          const t = (y - 2) / 21;
          const sway = y > 12 && frame === 1 ? side : 0;
          const c0 = (side < 0 ? 2.5 : 21.5) + side * 3.6 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + sway;
          const w = t < 0.12 ? 2 : t > 0.85 ? 1 : t > 0.7 ? 2 : 4;
          const xa = Math.round(c0 - w / 2);
          R(xa, y, xa + w - 1, y, hair);
          S(xa, y, side < 0 ? hl0(hair) : shade(hair, -0.05));
          if (w > 2) S(xa + w - 1, y, shade(hair, -0.3));
        }
        for (const y of [9, 14, 18]) S(side < 0 ? 0 : 23, y, shade(hair, -0.35)); // mechones
      }
    }
    if (hair && hs === 'mane') {
      const cx = X(11.5);
      const cy = Y(5);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const len = (i % 2 ? 11 : 13) * k;
        g.poly([[cx, cy], [cx + Math.cos(a - 0.25) * 8 * k, cy + Math.sin(a - 0.25) * 8 * k], [cx + Math.cos(a) * len, cy + Math.sin(a) * len], [cx + Math.cos(a + 0.25) * 8 * k, cy + Math.sin(a + 0.25) * 8 * k]], i % 3 ? hair : shade(hair, -0.25));
      }
      g.ellipse(cx, cy, 9 * k, 8 * k, hair);
      g.ellipse(cx - 2 * k, cy - 3 * k, 5 * k, 3 * k, shade(hair, 0.2));
    }

    // ---------- piernas y botas ----------
    const leg = (x0, x1, up, toeDir) => {
      B(x0, 22, x1, 29 - up, pants, { bottom: false, light: 0.1, dark: -0.2 });
      const by = 27 - up;
      B(Math.min(x0, x0 + toeDir), by, Math.max(x1, x1 + toeDir), 29 - up, boots, { top: true, light: 0.25 });
      R(Math.min(x0, x0 + toeDir), 29 - up, Math.max(x1, x1 + toeDir), 29 - up, shade(boots, -0.4)); // suela
    };
    if (outfit !== 'robe') {
      leg(8, 11, walk[0], -1);
      leg(12, 15, walk[1], 1);
      R(11, 22, 11, 26 - walk[0], shade(pants, -0.3)); // separación
    } else {
      // con túnica larga sólo asoman las puntas de las botas
      R(7, 28 - walk[0], 11, 29 - walk[0], boots);
      R(12, 28 - walk[1], 16, 29 - walk[1], boots);
      R(7, 29 - walk[0], 11, 29 - walk[0], shade(boots, -0.4));
      R(12, 29 - walk[1], 16, 29 - walk[1], shade(boots, -0.4));
    }

    // ---------- torso y ropa ----------
    B(7, 12, 16, 21, cloth, { light: 0.18 });
    if (outfit === 'robe' || outfit === 'dress') {
      const dress = outfit === 'dress';
      const bottom = dress ? 26 : 28;
      for (let y = 21; y <= bottom; y++) {
        const fl = Math.floor(((y - 21) / (bottom - 21)) * (dress ? 3 : 2));
        R(7 - fl, y, 16 + fl, y, cloth);
        S(7 - fl, y, shade(cloth, 0.2));
        S(16 + fl, y, shade(cloth, -0.3));
      }
      // pliegues
      for (const x of dress ? [9, 12, 15] : [10, 13]) R(x, 23, x, bottom - 1, shade(cloth, -0.18));
      // ruedo
      const fb = dress ? 3 : 2;
      R(7 - fb, bottom, 16 + fb, bottom, accent);
      if (dress) for (let x = 4; x <= 19; x += 2) S(x, bottom + 1, shade(accent, -0.2));
      if (!dress) R(11, 12, 12, bottom - 1, shade(accent, -0.1)); // costura del frente
    }
    if (outfit === 'armor') {
      B(8, 12, 15, 19, shade(cloth, 0.12), { top: true, light: 0.3 });
      R(8, 15, 15, 15, shade(cloth, -0.2));
      R(8, 18, 15, 18, shade(cloth, -0.2));
      S(9, 13, shade(cloth, 0.55)); // brillo del metal
      // faldón de placas
      for (let x = 7; x <= 15; x += 3) B(x, 21, x + 1, 23, accent, { bottom: true });
    }
    if (outfit === 'rags') {
      for (let x = 7; x <= 16; x++) if (x % 2 === 0) S(x, 22, cloth);
      S(9, 15, shade(cloth, -0.3));
      S(14, 18, shade(cloth, -0.3));
      S(10, 17, shade(cloth, 0.2));
    }
    if (outfit === 'tunic') {
      R(13, 15, 13, 18, shade(cloth, -0.2)); // pliegue
      // cuello en V
      S(11, 12, skin);
      S(12, 12, skin);
      S(11, 13, shade(skin, -0.15));
      S(10, 12, accent);
      S(13, 12, accent);
    }
    // cinturón con hebilla
    if (outfit !== 'armor') {
      R(7, 20, 16, 20, shade(accent, -0.15));
      S(11, 20, gold);
      S(12, 20, shade(gold, -0.3));
    }

    // ---------- brazos y manos ----------
    const arm = (x0, x1, dy, light) => {
      const sleeve = outfit === 'armor' ? shade(cloth, -0.15) : cloth;
      B(x0, 12 + dy, x1, 19 + dy, sleeve, { lx: light, rx: !light });
      if (!light) R(x0, 12 + dy, x0, 19 + dy, shade(sleeve, 0.12));
      R(x0, 19 + dy, x1, 19 + dy, shade(accent, -0.1)); // puño de la manga
      const hand = look.weapon === 'claws' ? '#f2f2f2' : skin;
      B(x0, 20 + dy, x1, 21 + dy, hand, { lx: light, rx: !light, bottom: false });
      R(x0, 21 + dy, x1, 21 + dy, shade(hand, -0.18));
    };
    arm(4, 6, swing[0], true);
    arm(17, 19, swing[1], false);
    if (outfit === 'armor') {
      // hombreras
      B(3, 11, 7, 14, accent, { top: true, light: 0.35 });
      B(16, 11, 20, 14, accent, { top: true, light: 0.35 });
      S(4, 11, shade(accent, 0.6));
      S(17, 11, shade(accent, 0.6));
    }
    if (look.cape) {
      // broche de la capa sobre los hombros
      R(6, 12, 8, 12, look.cape);
      R(15, 12, 17, 12, look.cape);
      S(8, 13, gold);
    }

    // ---------- arma (en la mano derecha) ----------
    const wpn = look.weapon || 'none';
    const hy = 21 + swing[1]; // altura de la mano
    if (wpn === 'greatsword') {
      // Espada Mata-Demonios: hoja negra enorme, mellada
      const top = -7;
      B(19, top + 2, 22, hy - 2, '#2a2a34', { light: 0.35, dark: -0.45, bottom: false });
      R(19, top + 1, 21, top + 1, '#2a2a34');
      R(19, top, 20, top, '#3a3a46');
      R(19, top + 1, 19, hy - 3, '#6a6a7c'); // filo con brillo
      R(20, top + 3, 20, hy - 6, '#3a3a48');
      for (const y of [top + 6, top + 13, top + 20]) g.clear(X(22), Y(y));
      R(18, hy - 1, 23, hy - 1, '#4a3a2a'); // guarda
      R(20, hy, 21, hy + 3, '#6a4a2a'); // empuñadura
      S(20, hy + 1, '#8a6a3a');
      S(21, hy + 3, '#3a2a18');
    } else if (wpn === 'sword') {
      B(20, hy - 13, 21, hy - 2, '#d8dde3', { light: 0.6, dark: -0.25, bottom: false });
      S(20, hy - 14, '#ffffff');
      R(18, hy - 1, 23, hy - 1, gold);
      S(18, hy - 1, shade(gold, 0.4));
      R(20, hy, 21, hy + 1, '#6a4a2a');
    } else if (wpn === 'spear') {
      R(20, -4, 20, 30, '#7a5230');
      R(21, -4, 21, 30, '#5a3a20');
      g.poly([[X(20.5), Y(-11)], [X(23), Y(-6)], [X(20.5), Y(-3)], [X(18), Y(-6)]], '#d8dde3');
      R(20, -10, 20, -5, '#ffffff');
      R(19, -3, 22, -2, accent);
    } else if (wpn === 'staff') {
      B(20, 2, 21, 30, '#7a5230', { bottom: false });
      const gem = look.gem || accent;
      R(19, 1, 22, 1, '#5a3a20');
      S(19, 0, '#5a3a20');
      S(22, 0, '#5a3a20');
      g.ball(X(20.5) + 1 * k, Y(-1.5), 2.6 * k, 2.6 * k, gem);
      S(20, -3, '#ffffff');
    } else if (wpn === 'dagger') {
      B(20, hy - 6, 21, hy - 2, '#d8dde3', { light: 0.6, bottom: false });
      S(20, hy - 7, '#ffffff');
      R(19, hy - 1, 22, hy - 1, gold);
    } else if (wpn === 'bow') {
      // arco largo con cuerda y flecha
      for (let y = 6; y <= 30; y++) {
        const x = 21 + Math.round(Math.sin(((y - 6) / 24) * Math.PI) * 3);
        R(x, y, x, y, '#8a5a2a');
        if (y % 4 === 0) S(x, y, '#a87038');
      }
      R(21, 6, 21, 30, '#e8e0d0');
      R(17, hy - 1, 24, hy - 1, '#c8a070');
      S(25, hy - 1, '#d8dde3');
      S(17, hy - 2, '#c03030');
    } else if (wpn === 'claws') {
      for (const x0 of [4, 17]) for (let i = 0; i < 3; i++) R(x0 + i, 22, x0 + i, 23 + (i % 2), '#f2f2f2');
    }

    // ---------- cabeza ----------
    B(6, 0, 17, 10, skin, { light: 0.12, dark: -0.14 });
    // mentón redondeado
    for (const [x, y] of [[6, 0], [17, 0], [6, 10], [17, 10], [7, 10], [16, 10], [6, 9], [17, 9]]) g.clear(X(x), Y(y));
    R(10, 11, 13, 11, shade(skin, -0.25)); // cuello
    S(5, 5, skin); // orejas
    S(18, 5, shade(skin, -0.15));
    S(5, 6, shade(skin, -0.1));
    S(18, 6, shade(skin, -0.25));

    // ---------- cara ----------
    const eyes = look.eyes || '#3a2a4a';
    const lash = '#1a1020';
    if (look.mask) {
      B(6, 4, 17, 7, look.mask, { light: 0.3 });
      S(9, 6, eyes);
      S(14, 6, eyes);
      S(9, 5, lash);
      S(14, 5, lash);
    } else {
      // ojos de anime: pestaña, iris con brillo, iris oscuro abajo
      R(8, 5, 10, 5, lash);
      R(13, 5, 15, 5, lash);
      S(8, 6, '#ffffff');
      S(9, 6, eyes);
      S(13, 6, '#ffffff');
      S(14, 6, eyes);
      S(8, 7, shade(eyes, -0.35));
      S(9, 7, shade(eyes, -0.5));
      S(13, 7, shade(eyes, -0.35));
      S(14, 7, shade(eyes, -0.5));
      if (look.fierce) {
        S(10, 4, lash);
        S(13, 4, lash);
      }
    }
    S(12, 8, shade(skin, -0.1)); // nariz
    R(11, 9, 12, 9, mix(skin, '#8a3030', 0.4)); // boca
    if (look.blush) {
      S(7, 8, mix(skin, '#ff7a8a', 0.45));
      S(16, 8, mix(skin, '#ff7a8a', 0.45));
    }

    // ---------- pelo de adelante ----------
    const hl = shade(hair || '#000000', 0.38);
    const hd = shade(hair || '#000000', -0.28);
    const cap = () => {
      R(6, -1, 17, 3, hair);
      R(5, 0, 18, 3, hair);
      R(8, -2, 15, -2, hair);
      R(8, -1, 12, -1, hl); // brillo
      R(7, 0, 9, 0, hl);
      R(5, 3, 18, 3, hd);
      // flequillo en mechones
      for (const x of [6, 7, 11, 12, 16, 17]) S(x, 4, hair);
      S(12, 5, hd);
      S(6, 5, hair);
      S(17, 5, hd);
      // patillas
      R(5, 4, 5, 7, hair);
      R(18, 4, 18, 7, hd);
      // cejas
      R(8, 4, 9, 4, hd);
      R(14, 4, 15, 4, hd);
    };
    if (hair && hs !== 'bald' && hs !== 'hood' && hs !== 'helmet') {
      if (hs !== 'hat') cap();
      else {
        R(5, 2, 18, 6, hair);
        R(5, 6, 5, 8, hair);
        R(18, 6, 18, 8, hd);
        R(8, 4, 9, 4, hd);
        R(14, 4, 15, 4, hd);
        for (let x = 6; x <= 17; x++) g.clear(X(x), Y(5)), (x === 6 || x === 17) && S(x, 5, hair);
        for (let x = 7; x <= 16; x++) g.clear(X(x), Y(6));
        // vuelve a poner piel donde el pelo tapaba la frente
        R(7, 5, 16, 6, skin);
        R(8, 5, 10, 5, lash);
        R(13, 5, 15, 5, lash);
        S(8, 6, '#ffffff');
        S(9, 6, eyes);
        S(13, 6, '#ffffff');
        S(14, 6, eyes);
      }
      if (hs === 'spiky') {
        // púas despeinadas (Asta)
        const spikes = [[3, 4, -1.1], [6.5, 6, -0.7], [11, 8, -0.15], [15, 6, 0.55], [18.5, 4, 1.1]];
        for (const [bx, h, lean] of spikes) {
          for (let i = 0; i < h; i++) {
            const w = Math.max(1, Math.round(4 * (1 - i / h)));
            const x = Math.round(bx + lean * i);
            R(x - (w >> 1), -2 - i, x - (w >> 1) + w - 1, -2 - i, hair);
            if (w > 1) S(x - (w >> 1), -2 - i, hl);
            if (w > 2) S(x - (w >> 1) + w - 1, -2 - i, hd);
          }
        }
        S(4, 2, hair);
        S(3, 1, hair);
        S(19, 2, hd);
        S(20, 1, hd);
      }
      if (hs === 'long') {
        R(5, 4, 6, 15, hair);
        R(17, 4, 18, 15, hd);
        S(5, 9, hl);
        S(6, 12, hd);
      }
      if (hs === 'twintails') {
        // moños con cinta
        R(2, 0, 5, 2, accent);
        R(18, 0, 21, 2, accent);
        S(2, 0, shade(accent, 0.45));
        S(18, 0, shade(accent, 0.45));
        S(5, 1, shade(accent, -0.3));
        S(21, 1, shade(accent, -0.3));
        R(5, 4, 5, 9, hair);
        R(18, 4, 18, 9, hd);
      }
      if (hs === 'mane') {
        R(5, 4, 5, 9, hair);
        R(18, 4, 18, 9, hd);
      }
    }
    if (hs === 'hood') {
      const hc = look.hood || cloth;
      B(5, -2, 18, 3, hc, { top: true, light: 0.25 });
      B(4, 2, 6, 11, hc, { bottom: false });
      B(17, 2, 19, 11, hc, { lx: false, bottom: false });
      R(7, 3, 16, 4, shade(hc, -0.55)); // sombra profunda adentro
      R(7, 4, 16, 4, shade(skin, -0.4));
      R(6, 11, 17, 12, hc); // cae sobre los hombros
      R(11, 3, 12, 3, shade(hc, -0.3));
      // ojos brillando en la sombra
      S(9, 6, eyes);
      S(14, 6, eyes);
    }
    if (hs === 'helmet') {
      const hc = look.helmet || accent;
      B(5, -2, 18, 4, hc, { top: true, light: 0.35 });
      B(5, 4, 7, 9, hc, { bottom: false });
      B(16, 4, 18, 9, hc, { lx: false, bottom: false });
      R(7, -1, 9, -1, shade(hc, 0.55)); // brillo
      // visera: ranura oscura con ojos que brillan
      R(7, 5, 16, 7, shade(hc, -0.6));
      R(8, 6, 9, 6, eyes);
      R(14, 6, 15, 6, eyes);
      R(11, -4, 12, -2, look.crest || accent); // cresta
      S(11, -4, shade(look.crest || accent, 0.4));
      R(11, 1, 12, 4, shade(hc, -0.25));
    }
    if (hs === 'hat') {
      const hc = look.hat || cloth;
      // ala ancha
      g.ellipse(X(11.5) + 0.5 * k, Y(2.5), 9.5 * k, 2 * k, hc);
      R(4, 3, 19, 3, shade(hc, -0.35));
      // copa en punta, doblada
      const rows = [[1, 6, 17], [0, 7, 16], [-1, 7, 16], [-2, 8, 15], [-3, 8, 15], [-4, 9, 14], [-5, 10, 14], [-6, 11, 15], [-7, 12, 16], [-8, 14, 17], [-9, 16, 17]];
      for (const [y, a, b] of rows) {
        R(a, y, b, y, hc);
        S(a, y, shade(hc, 0.25));
        S(b, y, shade(hc, -0.3));
      }
      R(7, 0, 16, 1, look.accent || accent); // cinta
      S(9, 0, gold);
    }
    if (look.headband) {
      R(6, 2, 17, 3, look.headband);
      R(6, 2, 17, 2, shade(look.headband, 0.25));
      // nudo con puntas al costado
      R(3, 3, 5, 3, look.headband);
      S(3, 4, look.headband);
      S(2, 5, shade(look.headband, -0.2));
    }
    if (look.horns) {
      for (const side of [-1, 1]) {
        const x = side < 0 ? 7 : 16;
        for (let i = 0; i < 6; i++) {
          const xx = x + side * Math.round(i * 0.7);
          R(xx, -1 - i, xx + (i < 3 ? 1 : 0), -1 - i, i < 2 ? shade(look.horns, -0.2) : look.horns);
        }
        S(x + side * 4, -6, shade(look.horns, 0.4));
      }
    }
    if (look.crown) {
      const cc = look.crown;
      R(7, -3, 16, -1, cc);
      for (const x of [7, 10, 13, 16]) R(x, -5, x, -4, cc);
      R(7, -3, 16, -3, shade(cc, 0.35));
      S(10, -2, '#ff4060');
      S(13, -2, '#60c0ff');
    }
    if (look.halo) {
      for (let x = 7; x <= 16; x++) {
        S(x, x === 7 || x === 16 ? -8 : x === 8 || x === 15 ? -9 : -10, look.halo);
        S(x, x === 7 || x === 16 ? -7 : x === 8 || x === 15 ? -6 : -6, shade(look.halo, -0.2));
      }
    }

    // ---------- grimorio flotando ----------
    if (look.book) {
      const bob = frame === 2 ? 1 : 0;
      const bc = look.book;
      const bx = -2;
      const by = 12 + bob;
      B(bx, by, bx + 4, by + 6, bc, { top: true, light: 0.3 });
      R(bx + 5, by + 1, bx + 5, by + 6, '#f0e6c8'); // hojas
      R(bx, by, bx, by + 6, shade(bc, -0.4)); // lomo
      // trébol dorado
      S(bx + 2, by + 2, gold);
      S(bx + 1, by + 3, gold);
      S(bx + 3, by + 3, gold);
      S(bx + 2, by + 4, shade(gold, -0.3));
    }

    g.outlineSel(look.outlineColor || '#100a14');
    return g;
  }

  // ---------------------------------------------------------------------
  // OTRAS CRIATURAS
  // ---------------------------------------------------------------------
  function beast(look, frame) {
    const g = new GridHD(40, 26);
    const c = look.cloth;
    const d = shade(c, -0.3);
    const up = frame === 1 ? [2, 0] : frame === 2 ? [0, 2] : [0, 0];
    // patas de atrás (más oscuras)
    for (const [x, u] of [[10, up[1]], [26, up[0]]]) {
      g.box(x, 16, x + 2, 23 - u, d, { bottom: false });
      g.rect(x - 1, 23 - u, x + 2, 23 - u, shade(d, -0.35));
    }
    // cola peluda
    g.poly([[8, 9], [2, 4], [1, 8], [4, 12], [8, 13]], c);
    g.line(2, 6, 7, 10, shade(c, 0.25));
    // cuerpo
    g.ball(19, 12, 12, 6.5, c);
    // pelaje: rayitas
    for (let i = 0; i < 9; i++) g.set(10 + i * 2, 7 + (i % 3), shade(c, 0.25));
    for (let i = 0; i < 7; i++) g.set(12 + i * 2, 16 + (i % 2), shade(c, -0.22));
    // patas de adelante
    for (const [x, u] of [[13, up[0]], [29, up[1]]]) {
      g.box(x, 16, x + 2, 23 - u, c, { bottom: false });
      g.rect(x - 1, 23 - u, x + 2, 23 - u, shade(c, -0.45));
    }
    // cabeza
    g.ball(32, 8, 6, 5.5, c);
    g.ball(37, 10, 3, 2.4, shade(c, -0.1)); // hocico
    g.set(39, 9, '#1a1010'); // nariz
    g.poly([[28, 4], [29, -1], [32, 3]], d); // orejas
    g.poly([[32, 3], [34, -1], [35, 4]], c);
    g.set(33, 1, shade(c, 0.3));
    if (look.mane) {
      g.poly([[26, 2], [30, 1], [28, 14], [24, 12]], look.mane);
    }
    if (look.tusk) {
      g.line(36, 12, 38, 14, '#f2efe0');
      g.set(38, 13, '#ffffff');
    }
    g.outlineSel('#100a10');
    // ojo con brillo y boca
    g.set(33, 7, look.eyes || '#ff3030');
    g.set(34, 7, shade(look.eyes || '#ff3030', -0.4));
    g.set(33, 6, '#1a0a0a');
    g.line(35, 12, 38, 12, '#2a0a0a');
    return g;
  }

  function ghost(look, frame) {
    const g = new GridHD(26, 30);
    const c = look.cloth;
    g.ball(13, 11, 10, 10, c, 0.8);
    g.rect(3, 11, 22, 22, c);
    for (let x = 3; x <= 22; x++) g.set(x, 11 + Math.round((x - 3) * 0), x < 8 ? shade(c, 0.15) : c);
    // shading del faldón
    g.rect(3, 11, 4, 22, shade(c, 0.18));
    g.rect(20, 11, 22, 22, shade(c, -0.25));
    // borde ondulado que se mueve
    for (let x = 3; x <= 22; x++) {
      const h = Math.round(2 + Math.sin((x + frame * 2) * 0.9) * 2);
      g.rect(x, 23, x, 23 + h, x > 19 ? shade(c, -0.25) : c);
    }
    // brillo
    g.ellipse(9, 6, 3, 2, shade(c, 0.45));
    g.set(8, 5, '#ffffff');
    g.outlineSel('#140a18');
    // cara: ojos huecos y boca
    const e = look.eyes || '#1a0010';
    g.ellipse(9, 12, 2, 2.6, e);
    g.ellipse(17, 12, 2, 2.6, e);
    g.set(9, 11, '#ffffff');
    g.set(17, 11, '#ffffff');
    g.ellipse(13, 18, 2, frame === 1 ? 2 : 1.4, e);
    return g;
  }

  function plant(look, frame) {
    const g = new GridHD(30, 34);
    // maceta
    g.box(9, 25, 20, 33, '#8a4a2a', { light: 0.2 });
    g.box(7, 24, 22, 26, '#a65a32', { top: true });
    g.rect(10, 29, 19, 29, '#6a3820');
    // tallo y hojas
    g.box(13, 15, 15, 24, '#2f7a2f');
    g.poly([[14, 21], [5, 17], [3, 20], [8, 23]], '#3f9a3a');
    g.poly([[15, 19], [24, 14], [27, 17], [21, 21]], '#3f9a3a');
    g.line(5, 18, 13, 21, '#6ac05a');
    g.line(24, 15, 16, 19, '#2a6a2a');
    // cabeza (flor carnívora)
    const c = look.cloth;
    const open = frame !== 1;
    g.ball(14.5, 9, 11, 8, c);
    for (let x = 6; x <= 23; x += 3) g.ellipse(x, 4, 1.2, 1.2, shade(c, 0.35)); // manchas
    // boca
    if (open) {
      g.ellipse(14.5, 11, 8, 4, '#3a0a10');
      g.ellipse(14.5, 12, 5, 2, '#8a1a2a'); // lengua
      for (let x = 8; x <= 21; x += 2) {
        g.set(x, 8, '#f2efe0');
        g.set(x + 1, 14, '#f2efe0');
      }
    } else {
      g.line(6, 11, 23, 11, '#3a0a10');
      for (let x = 8; x <= 21; x += 3) g.set(x, 12, '#f2efe0');
    }
    g.outlineSel('#120a0c');
    // ojitos amarillos
    g.set(9, 4, '#ffe14a');
    g.set(20, 4, '#ffe14a');
    g.set(9, 3, '#1a1010');
    g.set(20, 3, '#1a1010');
    return g;
  }

  function bomb(look, frame) {
    const g = new GridHD(26, 30);
    const c = look.cloth;
    // piernitas
    g.box(8, 23, 10, 29 - (frame === 1 ? 2 : 0), '#3a2a18', { bottom: false });
    g.box(15, 23, 17, 29 - (frame === 2 ? 2 : 0), '#3a2a18', { bottom: false });
    // cuerpo redondo
    g.ball(13, 15, 10, 9.5, c);
    // grietas brillando por dentro (maldito)
    g.line(7, 12, 10, 17, '#ff5a2a');
    g.line(17, 9, 20, 15, '#ff5a2a');
    g.line(15, 20, 18, 22, '#ff8a3a');
    // mecha
    g.line(13, 5, 14, 2, '#7a5230');
    g.line(14, 2, 16, 0, '#7a5230');
    g.outlineSel('#120a0a');
    // chispa que titila
    const sp = frame === 1 ? '#ffe14a' : '#ff6a1a';
    g.set(17, 0, sp);
    g.set(16, 1, sp);
    g.set(18, 1, frame === 1 ? '#ffffff' : sp);
    // ojos enojados
    g.rect(8, 13, 10, 14, '#ff3030');
    g.rect(15, 13, 17, 14, '#ff3030');
    g.set(8, 12, '#1a0808');
    g.set(17, 12, '#1a0808');
    g.rect(10, 18, 15, 18, '#1a0808');
    return g;
  }

  function crystal(look, frame) {
    const g = new GridHD(18, 20);
    const c = look.cloth;
    g.poly([[9, 0], [17, 8], [9, 19], [1, 8]], c);
    g.poly([[9, 0], [9, 19], [1, 8]], shade(c, 0.25)); // cara iluminada
    g.poly([[9, 0], [17, 8], [9, 8]], shade(c, 0.45));
    g.poly([[9, 8], [17, 8], [9, 19]], shade(c, -0.25));
    g.line(9, 0, 9, 19, shade(c, -0.1));
    g.outlineSel('#081a20');
    if (frame === 1) {
      g.set(6, 5, '#ffffff');
      g.set(5, 6, '#ffffff');
    } else g.set(6, 4, '#ffffff');
    return g;
  }

  function build(look, frame) {
    switch (look.kind) {
      case 'beast':
        return beast(look, frame);
      case 'ghost':
        return ghost(look, frame);
      case 'plant':
        return plant(look, frame);
      case 'bomb':
        return bomb(look, frame);
      case 'crystal':
        return crystal(look, frame);
      default:
        return humanoid(look, frame);
    }
  }

  function actorSprite(key, look, frame, flip) {
    const ck = key + '|' + frame + '|' + (flip ? 1 : 0);
    let c = cache.get(ck);
    if (!c) {
      c = build(look, frame).toCanvasHD(flip);
      cache.set(ck, c);
    }
    return c;
  }

  // detalles extra que sólo existen en HD (se suman al aspecto de pixel.js)
  const EXTRA = {
    asta: { fierce: true },
    noelle: { blush: true },
    vanica: { blush: true },
    fana: { blush: true },
  };
  function withExtra(id, look) {
    return EXTRA[id] ? Object.assign({}, look, EXTRA[id]) : look;
  }

  // los de antes quedan guardados (para comparar en tests/sprites.html)
  P.playerSpriteLo = P.playerSprite;
  P.enemySpriteLo = P.enemySprite;
  P.playerSprite = function (chId, frame, flip) {
    const id = P.LOOKS[chId] ? chId : 'mago';
    return actorSprite('p:' + id, withExtra(id, P.LOOKS[id]), frame, flip);
  };
  P.enemySprite = function (e, frame, flip) {
    const key = P.enemyLookKey(e);
    if (!key) return null;
    return actorSprite('e:' + key, withExtra(key, P.ENEMY_LOOKS[key]), frame, flip);
  };

  // =====================================================================
  // ESCENARIO EN HD: pisos, paredes, adornos e íconos
  // =====================================================================
  const hash = P.hash;

  // ---------- pisos: 6 baldosas de 32x32 por reino ----------
  function speckle(g, v, n, colors, seed) {
    for (let i = 0; i < n; i++) {
      const x = Math.floor(hash(v * 97 + i, seed) * g.w);
      const y = Math.floor(hash(v * 53 + i, seed + 1) * g.h);
      const c = colors[Math.floor(hash(i, v + seed) * colors.length)];
      g.set(x, y, c);
      if (hash(i, seed + 2) < 0.3) g.set(x + 1, y, c);
    }
  }
  function floorTile(realm, v) {
    const pal = realm.palette;
    const g = new GridHD(32, 32);
    const base = v % 2 ? mix(pal.floor, pal.floor2, 0.5) : pal.floor;
    g.rect(0, 0, 31, 31, base);
    const r = (a, b) => hash(v * 131 + a, b);
    const dark = shade(pal.floor, -0.2);
    const light = shade(pal.floor2, 0.1);
    switch (realm.id) {
      case 'trebol': {
        speckle(g, v, 70, [dark, light, shade(base, -0.1)], 3);
        // matas de pasto con puntas claras
        for (let i = 0; i < 6; i++) {
          const x = 2 + Math.floor(r(i, 1) * 28);
          const y = 4 + Math.floor(r(i, 2) * 26);
          const tip = shade(pal.floor2, 0.45);
          const mid = shade(pal.floor2, 0.22);
          g.set(x, y, mid);
          g.set(x, y - 1, mid);
          g.set(x, y - 2, tip);
          g.set(x - 1, y - 1, mid);
          g.set(x - 2, y - 2, tip);
          g.set(x + 1, y - 1, mid);
          g.set(x + 2, y - 2, tip);
          g.set(x, y + 1, shade(base, -0.25));
        }
        if (v === 5) {
          // florcita
          for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) g.ellipse(13 + dx, 12 + dy, 1.4, 1.4, '#f4f4f4');
          g.set(13, 12, '#ffd23a');
          g.set(12, 11, '#ffffff');
          g.line(13, 15, 13, 19, '#3f8a35');
          g.set(14, 17, '#4fa042');
        }
        break;
      }
      case 'corazon': {
        speckle(g, v, 60, [dark, light], 5);
        // musgo
        for (let i = 0; i < 3; i++) g.ellipse(4 + r(i, 3) * 24, 4 + r(i, 4) * 24, 2.5, 1.5, shade(base, 0.08));
        // pétalos caídos
        for (let i = 0; i < (v % 3 === 0 ? 3 : 1); i++) {
          const x = 2 + Math.floor(r(i, 5) * 27);
          const y = 2 + Math.floor(r(i, 6) * 27);
          g.set(x, y, '#e8a4c8');
          g.set(x + 1, y, '#d07aa8');
          g.set(x, y + 1, '#f4c4dc');
        }
        if (v === 5) {
          g.ellipse(15, 15, 3, 2.2, '#c86aa0');
          g.ellipse(14, 14, 1.4, 1, '#f4c4dc');
        }
        break;
      }
      case 'diamante': {
        speckle(g, v, 50, [dark, light], 7);
        // piedras del piso de la mina
        for (let i = 0; i < 4; i++) {
          const cx = 3 + r(i, 7) * 26;
          const cy = 3 + r(i, 8) * 26;
          g.ellipse(cx, cy, 3 + r(i, 9) * 2, 2, shade(base, 0.07));
          g.set(Math.round(cx - 1), Math.round(cy - 1), shade(base, 0.18));
          g.set(Math.round(cx + 1), Math.round(cy + 1.5), shade(base, -0.2));
        }
        if (v === 3) {
          // astillas de cristal
          const x = 6 + Math.floor(r(1, 10) * 18);
          const y = 8 + Math.floor(r(1, 11) * 16);
          g.poly([[x, y + 3], [x + 2, y - 2], [x + 4, y + 3]], shade(pal.accent, -0.2));
          g.line(x + 2, y - 1, x + 2, y + 2, shade(pal.accent, 0.4));
          g.poly([[x + 4, y + 3], [x + 6, y], [x + 7, y + 3]], shade(pal.accent, -0.35));
        }
        if (v === 5) {
          g.set(20, 8, '#ffffff');
          g.set(19, 8, pal.accent);
          g.set(21, 8, pal.accent);
          g.set(20, 7, pal.accent);
          g.set(20, 9, pal.accent);
        }
        break;
      }
      case 'espada': {
        speckle(g, v, 60, [dark, light], 9);
        // grietas que se ramifican, con borde claro arriba
        if (v !== 1) {
          let x = 4 + Math.floor(r(1, 12) * 22);
          for (let y = 3; y < 29; y++) {
            g.set(x, y, shade(pal.floor, -0.5));
            g.set(x + 1, y - 1, shade(pal.floor, 0.12));
            if (r(y, 13) < 0.4) x += r(y, 14) < 0.5 ? -1 : 1;
            if (y === 14) {
              let bx = x;
              for (let yy = 14; yy < 22; yy++) {
                bx += 1;
                g.set(bx, yy, shade(pal.floor, -0.45));
              }
            }
          }
        }
        // piedritas
        for (let i = 0; i < 2; i++) {
          const x = 3 + Math.floor(r(i, 15) * 26);
          const y = 3 + Math.floor(r(i, 16) * 26);
          g.rect(x, y, x + 1, y + 1, '#6a5a5a');
          g.set(x, y, '#8a7a7a');
          g.set(x + 1, y + 2, shade(base, -0.3));
        }
        break;
      }
      default: {
        // pica / capital: baldosas de piedra (4 por baldosa) con bisel
        const top = shade(pal.floor2, 0.14);
        const low = shade(pal.floor, -0.25);
        const mortar = shade(pal.floor, -0.45);
        for (let by = 0; by < 2; by++)
          for (let bx = 0; bx < 2; bx++) {
            const x0 = bx * 16;
            const y0 = by * 16;
            const tone = hash(v * 7 + bx, by + 31) < 0.5 ? base : shade(base, 0.05);
            g.rect(x0, y0, x0 + 15, y0 + 15, tone);
            g.rect(x0, y0, x0 + 14, y0, top);
            g.rect(x0, y0, x0, y0 + 14, shade(top, -0.05));
            g.rect(x0 + 1, y0 + 14, x0 + 15, y0 + 14, low);
            g.rect(x0 + 14, y0 + 1, x0 + 14, y0 + 14, low);
            g.rect(x0, y0 + 15, x0 + 15, y0 + 15, mortar);
            g.rect(x0 + 15, y0, x0 + 15, y0 + 15, mortar);
            // desgaste
            for (let i = 0; i < 6; i++) g.set(x0 + 2 + Math.floor(hash(v + i, bx * 9 + by) * 11), y0 + 2 + Math.floor(hash(i, v * 5 + bx + by * 3) * 11), i % 2 ? dark : light);
            if (hash(v, bx + by * 2 + 40) < 0.07) g.line(x0 + 3, y0 + 4, x0 + 6, y0 + 6, mortar); // rajadura
          }
        if (v === 5) {
          if (realm.id === 'capital') {
            // incrustación dorada
            g.poly([[16, 11], [21, 16], [16, 21], [11, 16]], shade(pal.accent, -0.25));
            g.poly([[16, 13], [19, 16], [16, 19], [13, 16]], pal.accent);
            g.set(15, 14, '#ffffff');
          } else {
            // runa violeta apagada
            const rc = mix(base, pal.accent, 0.35);
            g.line(13, 13, 19, 19, rc);
            g.line(19, 13, 13, 19, rc);
            g.set(16, 16, mix(base, pal.accent, 0.6));
          }
        }
      }
    }
    return g.toCanvasHD();
  }
  P.tiles = function (realm) {
    const k = 'thd:' + realm.id;
    let list = cache.get(k);
    if (!list) {
      list = [];
      for (let v = 0; v < 6; v++) list.push(floorTile(realm, v));
      cache.set(k, list);
    }
    return list;
  };

  // ---------- paredes: ladrillos de 32x16 con luz y sombra ----------
  P.wallTile = function (realm) {
    const k = 'whd:' + realm.id;
    let c = cache.get(k);
    if (c) return c;
    const w = realm.palette.wall;
    const g = new GridHD(32, 16);
    const mortar = shade(w, -0.4);
    g.rect(0, 0, 31, 15, mortar);
    const brick = (x0, y0, x1, y1, i) => {
      const b = shade(w, 0.1 + hash(i, 77) * 0.08);
      g.rect(x0, y0, x1, y1, b);
      g.rect(x0, y0, x1 - 1, y0, shade(b, 0.28));
      g.rect(x0, y0 + 1, x0, y1 - 1, shade(b, 0.14));
      g.rect(x0 + 1, y1, x1, y1, shade(b, -0.3));
      for (let j = 0; j < 3; j++) g.set(x0 + 2 + Math.floor(hash(i, j + 5) * (x1 - x0 - 3)), y0 + 2 + Math.floor(hash(j, i + 9) * (y1 - y0 - 3)), shade(b, hash(i, j) < 0.5 ? -0.15 : 0.15));
    };
    brick(0, 0, 14, 6, 1);
    brick(16, 0, 30, 6, 2);
    brick(0, 8, 6, 14, 3);
    brick(8, 8, 22, 14, 4);
    brick(24, 8, 31, 14, 5);
    c = g.toCanvasHD();
    cache.set(k, c);
    return c;
  };

  // ---------- adornos ----------
  const DECO_HD = {
    tree(g) {
      // pino de tres pisos
      g.box(10, 22, 13, 29, '#5a3a1a', { light: 0.2 });
      g.set(11, 25, '#3a2410');
      const tiers = [[20, 11.5, 11, 9], [14, 11.5, 9, 8], [8, 11.5, 6.5, 7]];
      for (const [y, cx, hw, h] of tiers) {
        g.poly([[cx, y - h], [cx + hw, y + 2], [cx - hw, y + 2]], '#2f6a2a');
        g.poly([[cx, y - h], [cx - hw, y + 2], [cx - hw * 0.2, y + 2]], '#4a9a3a');
        g.line(cx + 1, y - h + 2, cx + hw - 1, y + 1, '#24521f');
        for (let i = 0; i < 4; i++) g.set(Math.round(cx - hw * 0.6 + i * hw * 0.4), y + 1, i % 2 ? '#24521f' : '#3f8a35');
      }
      g.set(11, 1, '#7ac05a');
    },
    blossom(g) {
      // árbol de flores (Reino del Corazón)
      g.box(10, 18, 13, 29, '#6a4030', { light: 0.2 });
      g.line(12, 20, 16, 16, '#6a4030');
      g.line(11, 21, 7, 17, '#6a4030');
      g.ball(8, 12, 6, 5, '#d070a8');
      g.ball(16, 12, 6, 5, '#d070a8');
      g.ball(12, 8, 7, 6, '#e48ac0');
      for (let i = 0; i < 9; i++) g.set(4 + Math.floor(hash(i, 3) * 16), 4 + Math.floor(hash(i, 4) * 12), '#ffd0e8');
    },
    bush(g) {
      g.ball(6, 8, 5, 4, '#3f8a35');
      g.ball(13, 8, 5, 4, '#3f8a35');
      g.ball(9.5, 5, 5, 4, '#4f9a42');
      g.set(5, 7, '#c0302a');
      g.set(13, 6, '#c0302a');
      g.set(12, 5, '#ff7a6a');
    },
    rock(g) {
      g.ball(8, 7, 7.5, 5, '#7a7a84');
      g.line(6, 5, 9, 8, '#4a4a52');
      g.line(9, 8, 12, 7, '#4a4a52');
      g.set(4, 4, '#b0b0ba');
      g.rect(2, 11, 13, 11, '#3a5a2a'); // pastito al pie
    },
    mushroom(g) {
      g.box(5, 7, 8, 12, '#e8d8c0', { light: 0.15 });
      g.ellipse(6.5, 6, 6, 4.5, '#c0302a');
      g.rect(1, 6, 12, 7, '#8a1a18');
      g.ellipse(5, 3.5, 2.5, 1.5, '#e04a3a');
      for (const [x, y] of [[3, 4], [8, 3], [10, 5], [6, 5]]) g.set(x, y, '#f4ece0');
    },
    flower(g) {
      g.line(4, 7, 4, 13, '#3f9a3a');
      g.line(10, 5, 10, 13, '#3f9a3a');
      g.set(5, 10, '#5ab04a');
      g.set(9, 9, '#5ab04a');
      for (const [cx, cy, c] of [[4, 5, '#ff8ac8'], [10, 3, '#ffb0d8']]) {
        for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) g.ellipse(cx + dx + 0.5, cy + dy + 0.5, 1.3, 1.3, c);
        g.set(cx, cy, '#ffe14a');
      }
    },
    crystal(g) {
      const c = '#7ff3ff';
      g.poly([[8, 0], [11, 6], [10, 16], [6, 16], [5, 6]], c);
      g.poly([[8, 0], [5, 6], [6, 16], [8, 16]], shade(c, 0.35));
      g.poly([[3, 6], [5, 10], [5, 16], [1, 16], [1, 10]], shade(c, -0.15));
      g.poly([[13, 8], [15, 12], [14, 16], [11, 16], [11, 12]], shade(c, -0.25));
      g.set(7, 3, '#ffffff');
      g.set(7, 4, '#e0ffff');
      g.rect(0, 16, 15, 17, '#2e5a64');
    },
    grave(g) {
      g.box(2, 4, 11, 16, '#8a8a94', { light: 0.25 });
      g.ellipse(6.5, 4.5, 4.5, 3.5, '#8a8a94');
      g.ellipse(5.5, 3.5, 2.5, 1.5, '#a8a8b2');
      g.rect(6, 6, 7, 12, '#5a5a64'); // cruz grabada
      g.rect(4, 8, 9, 9, '#5a5a64');
      g.line(9, 11, 10, 14, '#5a5a64');
      g.rect(0, 16, 13, 17, '#3a3a2a');
    },
    torch(g) {
      g.box(3, 7, 4, 16, '#5a3a1a');
      g.rect(1, 7, 6, 8, '#4a4a52');
      g.ellipse(3.5, 4, 2.6, 3.6, '#ff6a1a');
      g.ellipse(3.5, 4.8, 1.6, 2.4, '#ffd23a');
      g.set(3, 4, '#ffffff');
      g.set(3, 0, '#ff9a3a');
    },
    sword(g) {
      g.ellipse(5, 17, 5, 1.6, '#4a3a2a'); // tierra
      g.box(4, 5, 5, 16, '#c8d0d8', { light: 0.5 });
      g.rect(1, 4, 8, 4, '#a07a30');
      g.set(1, 4, '#d8b050');
      g.box(4, 1, 5, 3, '#6a4a2a');
      g.ellipse(4.5, 0.5, 1.2, 1.2, '#d8b050');
    },
    candle(g) {
      g.box(1, 6, 6, 13, '#f0e8d8', { light: 0.1 });
      g.set(2, 7, '#ffffff');
      g.rect(1, 6, 1, 8, '#e0d4bc');
      g.rect(5, 6, 5, 9, '#e0d4bc'); // gota de cera
      g.rect(0, 13, 7, 14, '#8a7a5a');
      g.ellipse(3.5, 3, 1.6, 2.6, '#ffb030');
      g.set(3, 3, '#fff6c0');
      g.set(3, 5, '#2a1a10');
    },
    bat(g) {
      g.poly([[8, 4], [1, 0], [0, 5], [3, 4], [5, 7]], '#2a1a3a');
      g.poly([[8, 4], [15, 0], [16, 5], [13, 4], [11, 7]], '#2a1a3a');
      g.ball(8, 5, 2.6, 2.6, '#3a2a4a');
      g.set(7, 1, '#2a1a3a');
      g.set(9, 1, '#2a1a3a');
      g.line(2, 1, 6, 4, '#4a3a5a');
      g.line(14, 1, 10, 4, '#4a3a5a');
      g.set(7, 5, '#ff3030');
      g.set(9, 5, '#ff3030');
    },
    chain(g) {
      // eslabones: uno de frente (aro) y uno de costado (barrita), alternados
      for (let i = 0; i < 4; i++) {
        const y = i * 4;
        if (i % 2) {
          g.rect(3, y, 4, y + 4, '#8a8a94');
          g.set(3, y + 1, '#c0c0ca');
        } else {
          g.rect(1, y, 6, y, '#8a8a94');
          g.rect(1, y + 4, 6, y + 4, '#6a6a74');
          g.rect(1, y, 1, y + 4, '#a0a0aa');
          g.rect(6, y, 6, y + 4, '#6a6a74');
          g.set(2, y, '#c0c0ca');
        }
      }
    },
    crown(g) {
      g.box(1, 4, 12, 8, '#e0b040', { top: true, light: 0.35 });
      for (const x of [1, 6, 12]) g.poly([[x - 1, 5], [x + 0.5, 0], [x + 2, 5]], '#e0b040');
      g.set(6, 0, '#fff0a0');
      g.set(4, 6, '#c0302a');
      g.set(9, 6, '#3a6ae0');
      g.set(6, 6, '#3ac06a');
      g.rect(1, 8, 12, 8, '#a07a20');
    },
    pillar(g) {
      g.box(1, 0, 12, 2, '#f0e8d0', { top: true });
      g.box(2, 3, 11, 18, '#e8e0c8', { light: 0.15 });
      for (const x of [4, 7, 10]) g.rect(x, 4, x, 17, '#b8b098');
      g.rect(3, 4, 3, 17, '#ffffff');
      g.box(1, 19, 12, 21, '#d8d0b8', { top: true });
    },
    sparkle(g) {
      g.poly([[5, 0], [6, 4], [10, 5], [6, 6], [5, 10], [4, 6], [0, 5], [4, 4]], '#fff3a0');
      g.rect(4, 4, 6, 6, '#ffffff');
    },
    banner(g) {
      g.rect(0, 0, 13, 1, '#5a3a1a');
      g.set(0, 0, '#8a6a3a');
      g.poly([[1, 2], [12, 2], [12, 17], [6.5, 13], [1, 17]], '#8a1c1c');
      g.rect(1, 2, 2, 15, '#a83030');
      g.rect(11, 2, 11, 15, '#5a1010');
      // trébol dorado
      g.ellipse(5, 7, 1.6, 1.6, '#ffd76a');
      g.ellipse(8, 7, 1.6, 1.6, '#ffd76a');
      g.ellipse(6.5, 5, 1.6, 1.6, '#ffe8a0');
      g.line(6, 9, 6, 11, '#c8a040');
    },
  };
  const DECO_SIZE = { tree: [24, 30], blossom: [24, 30], bush: [20, 13], rock: [16, 12], mushroom: [14, 13], flower: [14, 14], crystal: [16, 18], grave: [14, 18], torch: [8, 17], sword: [10, 19], candle: [8, 15], bat: [17, 9], chain: [8, 16], crown: [14, 10], pillar: [14, 22], sparkle: [11, 11], banner: [14, 18] };
  P.deco = function (emoji) {
    let name = P.DECO_BY_EMOJI[emoji] || 'rock';
    if (emoji === '🌳') name = 'blossom';
    const k = 'dhd:' + name;
    let c = cache.get(k);
    if (!c) {
      const [w, h] = DECO_SIZE[name];
      const inner = new GridHD(w, h);
      DECO_HD[name](inner);
      const g = new GridHD(w + 2, h + 2);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g.set(x + 1, y + 1, inner.get(x, y));
      g.outlineSel('#0a0a0e', 0.7);
      c = g.toCanvasHD();
      cache.set(k, c);
    }
    return c;
  };

  // ---------- íconos (monedas, corazones, cofres y puertas) ----------
  const ICON_HD = {
    coin: [10, 10, (g) => {
      g.ball(5, 5, 4.6, 4.6, '#ffd23a');
      g.ellipse(5, 5, 2.6, 2.6, '#e8a820');
      g.rect(5, 3, 5, 6, '#fff0a0');
      g.set(3, 2, '#ffffff');
    }],
    heart: [12, 11, (g) => {
      g.ball(3.5, 3.5, 3.4, 3.2, '#ff3b4a');
      g.ball(8.5, 3.5, 3.4, 3.2, '#ff3b4a');
      g.poly([[0.3, 4], [11.7, 4], [6, 10.6]], '#e02838');
      g.rect(2, 2, 3, 3, '#ffc0c8');
      g.set(2, 2, '#ffffff');
    }],
    chest: [18, 14, (g) => {
      g.box(1, 5, 16, 13, '#8a5a2a', { light: 0.2 });
      g.box(1, 1, 16, 5, '#a66a32', { top: true, light: 0.25 });
      g.ellipse(8.5, 1.6, 7.5, 1.6, '#a66a32');
      for (const x of [4, 13]) g.rect(x, 1, x, 13, '#c8a040');
      g.rect(1, 6, 16, 6, '#5a3a18');
      g.box(7, 5, 10, 9, '#ffd76a', { top: true });
      g.set(8, 7, '#3a2a10');
    }],
    combat: [16, 16, (g) => {
      for (const s of [1, -1]) {
        const x0 = s > 0 ? 1 : 14;
        g.line(x0, 1, x0 + s * 11, 12, '#e8e8f0');
        g.line(x0 + s, 1, x0 + s * 12, 12, '#a0a8b8');
        g.line(x0 + s * 8, 13, x0 + s * 12, 9, '#a07a30');
        g.rect(Math.min(x0 + s * 12, x0 + s * 13), 13, Math.max(x0 + s * 12, x0 + s * 13), 14, '#6a4a2a');
      }
    }],
    elite: [14, 14, (g) => {
      g.ball(7, 6, 6, 5.5, '#f0eadc');
      g.box(4, 10, 9, 13, '#e0d8c8');
      g.ellipse(4.5, 6.5, 1.8, 2, '#1a1020');
      g.ellipse(9.5, 6.5, 1.8, 2, '#1a1020');
      g.set(4, 6, '#d58cff');
      g.set(9, 6, '#d58cff');
      g.set(7, 9, '#3a2a30');
      for (const x of [5, 7, 9]) g.set(x, 12, '#5a4a40');
    }],
    shop: [14, 14, (g) => {
      g.ball(7, 8.5, 6, 5.2, '#c08a3a');
      g.rect(5, 2, 9, 3, '#7a5020');
      g.poly([[4, 1], [10, 1], [8, 3], [6, 3]], '#a06a2a');
      g.ellipse(7, 8.5, 2.2, 2.2, '#ffd23a');
      g.set(6, 7, '#fff0a0');
    }],
    event: [12, 16, (g) => {
      const b = '#4aa3d9';
      g.rect(2, 1, 9, 2, b);
      g.rect(1, 2, 2, 5, b);
      g.rect(9, 2, 10, 7, b);
      g.rect(5, 7, 9, 8, b);
      g.rect(5, 8, 6, 10, b);
      g.rect(5, 13, 6, 14, b);
      g.rect(2, 1, 5, 1, '#9ad4f4');
    }],
    rest: [16, 16, (g) => {
      g.line(2, 14, 13, 11, '#6a4020');
      g.line(2, 11, 13, 14, '#7a5030');
      g.poly([[8, 1], [12, 8], [11, 12], [5, 12], [4, 8]], '#ff5a1a');
      g.poly([[8, 5], [10, 9], [9, 12], [7, 12], [6, 9]], '#ffd23a');
      g.set(8, 10, '#ffffff');
    }],
    boss: [16, 13, (g) => {
      g.ball(8, 7, 6.5, 5.5, '#c41e1e');
      g.poly([[2, 4], [0, -1], [5, 2]], '#e8e0d0');
      g.poly([[14, 4], [16, -1], [11, 2]], '#e8e0d0');
      g.rect(4, 6, 6, 7, '#ffd23a');
      g.rect(10, 6, 12, 7, '#ffd23a');
      g.rect(5, 10, 11, 10, '#3a0408');
      for (const x of [6, 8, 10]) g.set(x, 11, '#f0e8d8');
    }],
  };
  P.icon = function (name) {
    const k = 'ihd:' + name;
    let c = cache.get(k);
    if (!c) {
      const d = ICON_HD[name];
      if (!d) return null;
      const [w, h, draw] = d;
      const inner = new GridHD(w, h);
      draw(inner);
      const g = new GridHD(w + 2, h + 2);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g.set(x + 1, y + 1, inner.get(x, y));
      g.outlineSel('#0a0a10', 0.75);
      c = g.toCanvasHD();
      cache.set(k, c);
    }
    return c;
  };

  // ---------- proyectiles: bolitas de energía con brillo ----------
  P.orb = function (color, r) {
    if (!/^#[0-9a-f]{6}$/i.test(color || '')) return null; // colores raros: se dibuja como antes
    const rr = Math.max(1, Math.min(8, Math.round(r)));
    const k = 'orb:' + color + ':' + rr;
    let c = cache.get(k);
    if (!c) {
      const R = rr * HD; // radio en píxeles HD
      const g = new GridHD(R * 2 + 4, R * 2 + 4);
      const m = R + 2;
      g.ellipse(m, m, R + 1, R + 1, shade(color, -0.35)); // borde
      g.ball(m, m, R, R, color, 0.7);
      g.ellipse(m - R * 0.25, m - R * 0.25, Math.max(1, R * 0.45), Math.max(1, R * 0.45), mix(color, '#ffffff', 0.65)); // núcleo
      g.set(Math.round(m - R * 0.45), Math.round(m - R * 0.45), '#ffffff');
      c = g.toCanvasHD();
      cache.set(k, c);
    }
    return c;
  };

  // tamaño en "píxeles del mundo" de un sprite (los HD miden la mitad)
  P.dw = (spr) => spr.width / (spr.hd || 1);
  P.dh = (spr) => spr.height / (spr.hd || 1);
  // dibuja un sprite (HD o común) en un lienzo de 320x180 con escala 2
  P.blit = (ctx, spr, x, y) => ctx.drawImage(spr, x, y, P.dw(spr), P.dh(spr));

  P.HD = HD;
  P.GridHD = GridHD;
  P.mix = mix;
  P.hdCache = cache;
})(typeof window !== 'undefined' ? window : globalThis);
