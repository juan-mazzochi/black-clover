/*
 * PIXEL ART: sprites, pisos y decoraciones dibujados píxel por píxel con código.
 * El mundo se dibuja en un lienzo chico (320 x 180) y se agranda x4 sin suavizar.
 *
 * Los personajes y enemigos humanoides se arman con "piezas" (pelo, ropa, capa,
 * arma...) en vez de dibujarse uno por uno; así cada enemigo nuevo sólo necesita
 * una línea en ENEMY_LOOKS.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  const SCALE = 4;
  const cache = new Map();

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // ---------------------------------------------------------------------
  // Grilla de píxeles con helpers para dibujar
  // ---------------------------------------------------------------------
  class Grid {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.px = new Array(w * h).fill(null);
    }
    set(x, y, c) {
      if (c && x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
    }
    get(x, y) {
      return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : null;
    }
    rect(x0, y0, x1, y1, c) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c);
    }
    // contorno oscuro automático alrededor de todo lo dibujado
    outline(c) {
      const add = [];
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          if (this.get(x, y)) continue;
          if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
        }
      for (const [x, y] of add) this.set(x, y, c);
    }
    // dibuja un sprite hecho con texto ('.' = vacío) usando una paleta
    stamp(rows, x0, y0, pal) {
      rows.forEach((r, yy) => {
        for (let xx = 0; xx < r.length; xx++) {
          const ch = r[xx];
          if (ch !== '.' && pal[ch]) this.set(x0 + xx, y0 + yy, pal[ch]);
        }
      });
    }
    toCanvas(flip) {
      const c = makeCanvas(this.w, this.h);
      const x = c.getContext('2d');
      for (let y = 0; y < this.h; y++)
        for (let xx = 0; xx < this.w; xx++) {
          const col = this.px[y * this.w + xx];
          if (!col) continue;
          x.fillStyle = col;
          x.fillRect(flip ? this.w - 1 - xx : xx, y, 1, 1);
        }
      return c;
    }
  }

  function shade(hex, amt) {
    // aclara (amt>0) u oscurece (amt<0) un color
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255;
    let g = (n >> 8) & 255;
    let b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
    r = f(r);
    g = f(g);
    b = f(b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ---------------------------------------------------------------------
  // HUMANOIDES armados por piezas
  // ---------------------------------------------------------------------
  // medidas para tamaño mediano (12x15) y grande (18x23)
  const SIZES = {
    m: { w: 12, h: 15, head: [3, 2, 8, 6], torso: [3, 7, 8, 11], armL: [2, 7, 2, 10], armR: [9, 7, 9, 10], legL: [4, 12, 5, 14], legR: [6, 12, 7, 14], eyeY: 4 },
    l: { w: 18, h: 23, head: [5, 3, 12, 9], torso: [4, 10, 13, 16], armL: [2, 10, 3, 15], armR: [14, 10, 15, 15], legL: [5, 17, 7, 22], legR: [10, 17, 12, 22], eyeY: 6 },
  };

  /*
   * look = {
   *   size: 'm'|'l', skin, hair, hairStyle, eyes, cloth, accent, pants, boots,
   *   outfit: 'tunic'|'robe'|'armor'|'dress'|'rags', cape, wings, horns, crown, halo,
   *   headband, mask, weapon: 'greatsword'|'sword'|'staff'|'dagger'|'spear'|'claws'|'none', book, glow
   * }
   */
  function humanoid(look, frame) {
    const S = SIZES[look.size || 'm'];
    const pad = look.size === 'l' ? 4 : 3; // espacio para armas, alas y pelo
    const g = new Grid(S.w + pad * 2, S.h + pad);
    const ox = pad;
    const oy = pad;
    const R = (a, c) => g.rect(a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy, c);
    const [hx0, hy0, hx1, hy1] = S.head;
    const [tx0, ty0, tx1, ty1] = S.torso;
    const big = look.size === 'l';
    const cloth = look.cloth || '#555';
    const accent = look.accent || shade(cloth, 0.3);

    // detrás: alas y capa
    if (look.wings) {
      const wc = look.wings;
      for (let i = 0; i < (big ? 5 : 3); i++) {
        g.rect(tx0 + ox - 2 - i, ty0 + oy - 2 + i, tx0 + ox - 1 - i, ty0 + oy + 1 + i, wc);
        g.rect(tx1 + ox + 1 + i, ty0 + oy - 2 + i, tx1 + ox + 2 + i, ty0 + oy + 1 + i, wc);
      }
    }
    if (look.cape) g.rect(tx0 + ox - 1, ty0 + oy, tx1 + ox + 1, S.legL[3] + oy - 1, look.cape);

    // piernas (se alternan al caminar)
    const pants = look.pants || shade(cloth, -0.3);
    const boots = look.boots || '#3a2a18';
    const lift = frame === 1 ? [1, 0] : frame === 2 ? [0, 1] : [0, 0];
    const leg = (L, up) => {
      g.rect(L[0] + ox, L[1] + oy, L[2] + ox, L[3] + oy - 1 - up, pants);
      g.rect(L[0] + ox, L[3] + oy - up, L[2] + ox, L[3] + oy - up, boots);
    };
    leg(S.legL, lift[0]);
    leg(S.legR, lift[1]);

    // torso según la ropa
    const outfit = look.outfit || 'tunic';
    R(S.torso, cloth);
    if (outfit === 'robe' || outfit === 'dress') {
      const flare = outfit === 'dress' ? 1 : 0;
      g.rect(tx0 + ox - flare, ty1 + oy, tx1 + ox + flare, S.legL[3] + oy - 1, cloth);
      g.rect(tx0 + ox - flare, S.legL[3] + oy - 1, tx1 + ox + flare, S.legL[3] + oy - 1, accent);
    }
    if (outfit === 'armor') {
      g.rect(tx0 + ox, ty0 + oy, tx1 + ox, ty0 + oy, shade(accent, 0.3));
      g.rect(tx0 + ox + 1, ty0 + oy + 2, tx1 + ox - 1, ty0 + oy + 2, shade(cloth, -0.25));
      // hombreras
      R(S.armL, accent);
      R(S.armR, accent);
    }
    if (outfit === 'rags') {
      for (let x = tx0; x <= tx1; x += 2) g.set(x + ox, ty1 + oy + 1, cloth);
    }
    // cinturón / detalle
    g.rect(tx0 + ox, ty1 + oy - 1, tx1 + ox, ty1 + oy - 1, accent);

    // brazos y manos
    if (outfit !== 'armor') {
      R(S.armL, cloth);
      R(S.armR, cloth);
    }
    g.set(S.armL[0] + ox, S.armL[3] + oy + 1, look.weapon === 'claws' ? '#f2f2f2' : look.skin);
    g.set(S.armR[0] + ox, S.armR[3] + oy + 1, look.weapon === 'claws' ? '#f2f2f2' : look.skin);

    // cabeza
    R(S.head, look.skin);
    const hair = look.hair;
    const hs = look.hairStyle || 'short';
    if (hair && hs !== 'bald') {
      g.rect(hx0 + ox, hy0 + oy, hx1 + ox, hy0 + oy, hair);
      g.rect(hx0 + ox, hy0 + oy + 1, hx0 + ox, hy0 + oy + (big ? 3 : 2), hair);
      g.rect(hx1 + ox, hy0 + oy + 1, hx1 + ox, hy0 + oy + (big ? 3 : 2), hair);
      if (hs === 'short' || hs === 'long' || hs === 'twintails' || hs === 'mane') g.rect(hx0 + ox, hy0 + oy + 1, hx1 + ox - 2, hy0 + oy + 1, hair);
      if (hs === 'spiky') {
        g.rect(hx0 + ox, hy0 + oy + 1, hx1 + ox, hy0 + oy + 1, hair);
        for (let x = hx0 - 1; x <= hx1 + 1; x += 2) g.set(x + ox, hy0 + oy - 1, hair);
        for (let x = hx0; x <= hx1; x += 3) g.set(x + ox, hy0 + oy - 2, hair);
        if (big) for (let x = hx0 + 1; x <= hx1; x += 3) g.set(x + ox, hy0 + oy - 3, hair);
      }
      if (hs === 'long') {
        g.rect(hx0 + ox - 1, hy0 + oy + 1, hx0 + ox - 1, ty0 + oy + 3, hair);
        g.rect(hx1 + ox + 1, hy0 + oy + 1, hx1 + ox + 1, ty0 + oy + 3, hair);
      }
      if (hs === 'twintails') {
        g.rect(hx0 + ox - 2, hy0 + oy + 1, hx0 + ox - 1, ty0 + oy + 3, hair);
        g.rect(hx1 + ox + 1, hy0 + oy + 1, hx1 + ox + 2, ty0 + oy + 3, hair);
        g.set(hx0 + ox - 1, hy0 + oy, accent);
        g.set(hx1 + ox + 1, hy0 + oy, accent);
      }
      if (hs === 'mane') {
        g.rect(hx0 + ox - 2, hy0 + oy - 1, hx1 + ox + 2, hy0 + oy, hair);
        g.rect(hx0 + ox - 2, hy0 + oy, hx0 + ox - 1, hy1 + oy + 1, hair);
        g.rect(hx1 + ox + 1, hy0 + oy, hx1 + ox + 2, hy1 + oy + 1, hair);
      }
    }
    if (hs === 'hood') {
      const hc = look.hood || cloth;
      g.rect(hx0 + ox - 1, hy0 + oy - 1, hx1 + ox + 1, hy0 + oy, hc);
      g.rect(hx0 + ox - 1, hy0 + oy, hx0 + ox, hy1 + oy, hc);
      g.rect(hx1 + ox, hy0 + oy, hx1 + ox + 1, hy1 + oy, hc);
    }
    if (hs === 'helmet') {
      const hc = look.helmet || accent;
      g.rect(hx0 + ox, hy0 + oy - 1, hx1 + ox, hy0 + oy + 1, hc);
      g.rect(hx0 + ox, hy0 + oy, hx0 + ox, hy1 + oy - 1, hc);
      g.rect(hx1 + ox, hy0 + oy, hx1 + ox, hy1 + oy - 1, hc);
      g.set(Math.round((hx0 + hx1) / 2) + ox, hy0 + oy - 2, shade(hc, 0.3));
    }
    if (hs === 'hat') {
      const hc = look.hat || cloth;
      g.rect(hx0 + ox - 2, hy0 + oy, hx1 + ox + 2, hy0 + oy, hc);
      const mid = Math.round((hx0 + hx1) / 2) + ox;
      for (let i = 1; i <= (big ? 6 : 4); i++) {
        const half = Math.max(0, (big ? 4 : 3) - Math.floor(i / 1.5));
        g.rect(mid - half, hy0 + oy - i, mid + half - 1, hy0 + oy - i, hc);
      }
      g.set(mid + 1, hy0 + oy - (big ? 6 : 4), accent);
    }
    if (look.headband) g.rect(hx0 + ox, hy0 + oy + 2, hx1 + ox, hy0 + oy + 2, look.headband);
    if (look.horns) {
      g.set(hx0 + ox, hy0 + oy - 1, look.horns);
      g.set(hx0 + ox - 1, hy0 + oy - 2, look.horns);
      g.set(hx1 + ox, hy0 + oy - 1, look.horns);
      g.set(hx1 + ox + 1, hy0 + oy - 2, look.horns);
    }
    if (look.crown) {
      g.rect(hx0 + ox + 1, hy0 + oy - 1, hx1 + ox - 1, hy0 + oy - 1, look.crown);
      for (let x = hx0 + 1; x <= hx1 - 1; x += 2) g.set(x + ox, hy0 + oy - 2, look.crown);
    }

    // contorno, después ojos y detalles (para que el contorno no los tape)
    g.outline(look.outlineColor || '#120c12');
    const eyes = look.eyes || '#1a1020';
    const ey = S.eyeY + oy;
    if (look.mask) g.rect(hx0 + ox, ey - 1, hx1 + ox, ey, look.mask);
    g.set(hx0 + ox + (big ? 2 : 1), ey, eyes);
    g.set(hx1 + ox - (big ? 2 : 1), ey, eyes);
    if (big) {
      g.set(hx0 + ox + 2, ey - 1, eyes);
      g.set(hx1 + ox - 2, ey - 1, eyes);
    }
    if (look.halo) for (let x = hx0; x <= hx1; x++) g.set(x + ox, hy0 + oy - (big ? 4 : 3), look.halo);

    // armas (a la derecha)
    const wx = S.armR[0] + ox + 1;
    const handY = S.armR[3] + oy + 1;
    const wpn = look.weapon || 'none';
    if (wpn === 'greatsword') {
      const top = big ? 0 : 0;
      g.rect(wx, top, wx + 1, handY - 1, '#1c1c22');
      g.rect(wx, top, wx, handY - 1, '#4a4a55');
      g.rect(wx - 1, handY - 1, wx + 2, handY - 1, '#7a5a20');
      g.rect(wx, handY, wx + 1, handY + 1, '#3a2a18');
    } else if (wpn === 'sword') {
      g.rect(wx, handY - (big ? 8 : 5), wx, handY - 1, '#d8dde3');
      g.rect(wx - 1, handY - 1, wx + 1, handY - 1, '#7a5a20');
    } else if (wpn === 'spear') {
      g.rect(wx, 1, wx, handY + 2, '#7a5230');
      g.rect(wx - 1, 0, wx + 1, 1, '#d8dde3');
    } else if (wpn === 'staff') {
      g.rect(wx, oy + 1, wx, handY + 2, '#7a5230');
      g.set(wx, oy, look.gem || accent);
      g.set(wx, oy - 1, shade(look.gem || accent, 0.5));
    } else if (wpn === 'dagger') {
      g.rect(wx, handY - 3, wx, handY - 1, '#d8dde3');
    }
    if (look.book) {
      const bx = S.armL[0] + ox - 2;
      const by = ty0 + oy - 2 + (frame === 2 ? 1 : 0);
      g.rect(bx, by, bx + 2, by + 2, look.book);
      g.set(bx + 1, by + 1, '#e8c860');
    }
    return g;
  }

  // ---------------------------------------------------------------------
  // OTRAS FORMAS (bestias, espíritus, plantas, bombas, cristales)
  // ---------------------------------------------------------------------
  function beast(look, frame) {
    const g = new Grid(18, 12);
    const c = look.cloth;
    const d = shade(c, -0.3);
    g.rect(3, 3, 13, 7, c); // cuerpo
    g.rect(4, 2, 11, 2, c);
    g.rect(12, 1, 16, 5, c); // cabeza
    g.rect(16, 4, 17, 5, shade(c, -0.15)); // hocico
    g.set(13, 0, d);
    g.set(15, 0, d); // orejas
    if (look.tusk) {
      g.set(17, 6, '#f2efe0');
      g.set(16, 6, '#f2efe0');
    }
    g.rect(1, 3, 2, 4, c); // cola
    const up = frame === 1 ? [1, 0] : frame === 2 ? [0, 1] : [0, 0];
    for (const [x, u] of [[4, up[0]], [6, up[1]], [10, up[1]], [12, up[0]]]) g.rect(x, 8, x, 10 - u, d);
    g.rect(4, 7, 12, 7, shade(c, -0.15));
    if (look.mane) g.rect(11, 1, 12, 6, look.mane);
    g.outline('#120c12');
    g.set(15, 2, look.eyes || '#ff3030');
    return g;
  }

  function ghost(look, frame) {
    const g = new Grid(12, 14);
    const c = look.cloth;
    const rows = ['...xxxxxx...', '..xxxxxxxx..', '.xxxxxxxxxx.', '.xxxxxxxxxx.', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx'];
    g.stamp(rows, 0, 1, { x: c });
    const wave = frame === 1 ? 'x.xx.xx.xx.x' : 'xx.xx.xx.xx.';
    g.stamp([wave], 0, 11, { x: c });
    g.rect(2, 3, 4, 4, shade(c, 0.4));
    g.outline('#120c12');
    g.rect(3, 5, 4, 6, look.eyes || '#1a0010');
    g.rect(7, 5, 8, 6, look.eyes || '#1a0010');
    g.rect(5, 8, 6, 8, '#1a0010');
    return g;
  }

  function plant(look, frame) {
    const g = new Grid(14, 16);
    g.rect(4, 12, 9, 15, '#8a4a2a'); // maceta
    g.rect(3, 12, 10, 12, '#a65a32');
    g.rect(6, 8, 7, 11, '#2f7a2f'); // tallo
    g.rect(2, 9, 5, 10, '#3f9a3a');
    g.rect(8, 8, 11, 9, '#3f9a3a'); // hojas
    g.rect(2, 1, 11, 7, look.cloth); // cabeza
    g.rect(4, 0, 9, 0, look.cloth);
    for (let x = 3; x <= 10; x += 2) g.set(x, 1, shade(look.cloth, 0.3));
    g.outline('#120c12');
    // boca que se abre y se cierra
    const open = frame !== 1;
    g.rect(4, 4, 9, open ? 6 : 4, '#3a0a10');
    if (open) for (let x = 4; x <= 9; x += 2) g.set(x, 4, '#f2efe0');
    g.set(4, 2, '#ffe14a');
    g.set(9, 2, '#ffe14a');
    return g;
  }

  function bomb(look, frame) {
    const g = new Grid(12, 14);
    const rows = ['...xxxxx....', '..xxxxxxx...', '.xxxxxxxxx..', '.xxxxxxxxx..', '.xxxxxxxxx..', '.xxxxxxxxx..', '..xxxxxxx...', '...xxxxx....'];
    g.stamp(rows, 0, 3, { x: look.cloth });
    g.rect(3, 4, 4, 5, shade(look.cloth, 0.4));
    g.rect(6, 1, 6, 2, '#7a5230'); // mecha
    g.rect(3, 11, 3, 13 - (frame === 1 ? 1 : 0), '#3a2a18');
    g.rect(7, 11, 7, 13 - (frame === 2 ? 1 : 0), '#3a2a18');
    g.outline('#120c12');
    g.set(7, 0, frame === 1 ? '#ffe14a' : '#ff6a1a'); // chispa
    g.set(4, 7, '#ff3030');
    g.set(7, 7, '#ff3030');
    return g;
  }

  function crystal(look, frame) {
    const g = new Grid(9, 9);
    const rows = ['....x....', '...xxx...', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....'];
    g.stamp(rows, 0, 0, { x: look.cloth });
    g.rect(3, 2, 3, 4, shade(look.cloth, 0.6));
    g.outline('#0a1a20');
    if (frame === 1) g.set(4, 1, '#ffffff');
    return g;
  }

  // ---------------------------------------------------------------------
  // CÓMO SE VE CADA PERSONAJE / ENEMIGO / JEFE
  // ---------------------------------------------------------------------
  const SKIN = '#e8c39e';
  const LOOKS = {
    // jugadores
    asta: { skin: SKIN, hair: '#f4f4f4', hairStyle: 'spiky', headband: '#262626', cloth: '#2b2b30', accent: '#8a1c1c', pants: '#1d1d22', cape: '#111114', weapon: 'greatsword', eyes: '#2a7a3a' },
    yuno: { skin: SKIN, hair: '#1a1a24', hairStyle: 'short', cloth: '#2c5a60', accent: '#e0c060', pants: '#22343a', cape: '#f0ede0', book: '#3a2a6a', eyes: '#d8b040' },
    noelle: { skin: '#f0d0b8', hair: '#d8dce8', hairStyle: 'twintails', cloth: '#5b4a8a', accent: '#8fd3ff', outfit: 'dress', cape: '#111114', book: '#1a3a5a', eyes: '#c040a0' },
    mago: { skin: SKIN, hair: '#6a4a2a', hairStyle: 'hat', hat: '#3b4a3a', cloth: '#4a5a3a', accent: '#ffd76a', outfit: 'robe', weapon: 'staff', gem: '#ffd76a' },
  };
  const ENEMY_LOOKS = {
    bandido: { kind: 'h', skin: SKIN, hair: '#5a3a1a', hairStyle: 'hood', hood: '#6b4a2b', cloth: '#8a6d4b', weapon: 'dagger' },
    magoBandido: { kind: 'h', skin: SKIN, hairStyle: 'hat', hat: '#7a2a1a', cloth: '#b5523b', outfit: 'robe', weapon: 'staff', gem: '#ff7b3a' },
    corrompido: { kind: 'beast', cloth: '#5a3d6b', tusk: true, eyes: '#ff3030' },
    loboBosque: { kind: 'beast', cloth: '#7a7a80', eyes: '#ffd23a' },
    soldadoPica: { kind: 'h', skin: SKIN, hairStyle: 'helmet', helmet: '#6d6f7a', cloth: '#3a3c48', outfit: 'armor', accent: '#9a9caa', weapon: 'spear' },
    espirituMaldito: { kind: 'ghost', cloth: '#d08ac0' },
    plantaCarnivora: { kind: 'plant', cloth: '#c0304a' },
    soldadoDiamante: { kind: 'h', skin: SKIN, hairStyle: 'helmet', helmet: '#4f8fa0', cloth: '#2a4a58', outfit: 'armor', accent: '#7fd0e0', weapon: 'sword' },
    magoCristal: { kind: 'h', skin: SKIN, hairStyle: 'hood', hood: '#3a8a9a', cloth: '#59d1e0', outfit: 'robe', weapon: 'staff', gem: '#bdf8ff' },
    golemCristal: { kind: 'h', size: 'l', skin: '#6fb6c6', hairStyle: 'helmet', helmet: '#a6f4ff', cloth: '#4f96a6', outfit: 'armor', accent: '#bdf8ff', eyes: '#ffffff', outlineColor: '#0a1a20' },
    fragmentoCristal: { kind: 'crystal', cloth: '#a6f4ff' },
    guerreroTriada: { kind: 'h', skin: SKIN, hairStyle: 'helmet', helmet: '#4a1a1a', cloth: '#7a2b2b', outfit: 'armor', accent: '#b04040', weapon: 'sword' },
    magoGravedad: { kind: 'h', skin: '#c8b8d8', hairStyle: 'hood', hood: '#2a1f4a', cloth: '#4b3a73', outfit: 'robe', weapon: 'staff', gem: '#9a7bff' },
    esclavoMaldito: { kind: 'bomb', cloth: '#3a2a2a' },
    diablillo: { kind: 'h', skin: '#8a3aa0', hair: '#2a0a30', hairStyle: 'short', horns: '#f2efe0', wings: '#3a1040', cloth: '#5a1f6b', eyes: '#ff3030' },
    magoSolMedianoche: { kind: 'h', skin: SKIN, hairStyle: 'hood', hood: '#d8a33a', cloth: '#f0e0b0', outfit: 'robe', accent: '#ff9a2a', weapon: 'staff', gem: '#ffd76a' },
    cadaver: { kind: 'h', skin: '#8a9a7a', hair: '#3a3a2a', hairStyle: 'short', cloth: '#5a5a48', outfit: 'rags', eyes: '#d0ff60' },
    // enemigos con mecánicas especiales
    francotirador: { kind: 'h', skin: SKIN, hairStyle: 'hood', hood: '#3a4a34', cloth: '#556a48', accent: '#c8b070', pants: '#3a3a2a', weapon: 'bow', mask: '#2a3024', eyes: '#ff4040' },
    magoSellos: { kind: 'h', skin: SKIN, hair: '#e0e0f0', hairStyle: 'hat', hat: '#5a2a7a', cloth: '#6a3a90', accent: '#e8c860', outfit: 'robe', book: '#c07aff' },
    sanador: { kind: 'h', skin: '#f0d8c0', hairStyle: 'hood', hood: '#f4f0e0', cloth: '#e8f0e0', accent: '#7dd88a', outfit: 'robe', weapon: 'staff', gem: '#7dff9a', eyes: '#3a8a4a' },
    asesino: { kind: 'h', skin: '#c8b8c8', hairStyle: 'hood', hood: '#1e1626', cloth: '#2a2034', accent: '#b04aff', pants: '#1a1420', cape: '#120c18', mask: '#120c18', weapon: 'dagger', eyes: '#d080ff' },
    ilusionista: { kind: 'h', skin: '#f4e8f0', hair: '#d8b8ff', hairStyle: 'long', cloth: '#7a4ab0', accent: '#ffd76a', outfit: 'dress', mask: '#f4f0e8', book: '#d8b8ff', eyes: '#7a3ab0' },
    guardian: { kind: 'h', size: 'l', skin: SKIN, hairStyle: 'helmet', helmet: '#e8c860', crest: '#ffffff', cloth: '#c8a040', outfit: 'armor', accent: '#fff0b0', weapon: 'spear', eyes: '#80d0ff' },
    paladin: { kind: 'h', skin: SKIN, hairStyle: 'helmet', helmet: '#e8dca0', cloth: '#f2f0e0', outfit: 'armor', accent: '#d8b040', weapon: 'sword' },
    // élites (Ojos del Sol de Medianoche y otros)
    valtos: { kind: 'h', skin: SKIN, hair: '#2a2a48', hairStyle: 'short', cloth: '#3a4ab0', accent: '#9aa6ff', outfit: 'robe', cape: '#1a1a3a', weapon: 'dagger', mask: '#d8d8f0' },
    rades: { kind: 'h', skin: '#a8b090', hair: '#2a3a20', hairStyle: 'long', cloth: '#4a5a3a', accent: '#b6d17a', outfit: 'robe', weapon: 'staff', gem: '#d0ff60' },
    fana: { kind: 'h', skin: '#f0d0b8', hair: '#e0582c', hairStyle: 'long', cloth: '#7a2a1a', accent: '#ff8a3a', outfit: 'dress', book: '#ff6a2a' },
    rhya: { kind: 'h', skin: SKIN, hair: '#a090d0', hairStyle: 'short', cloth: '#3a2a5a', accent: '#7a6bd6', outfit: 'robe', mask: '#f0f0f0', weapon: 'dagger' },
    ladros: { kind: 'h', skin: SKIN, hair: '#f0c0e0', hairStyle: 'long', cloth: '#8a2a6a', accent: '#ff7ad0', outfit: 'armor', crown: '#ff7ad0', weapon: 'sword' },
    // jefes
    vetto: { kind: 'h', size: 'l', skin: '#d0a070', hair: '#7a4a1a', hairStyle: 'mane', cloth: '#5a3a20', accent: '#ffb347', weapon: 'claws', eyes: '#ffb020' },
    vanica: { kind: 'h', size: 'l', skin: '#f0d0c0', hair: '#c01030', hairStyle: 'long', horns: '#3a0a10', cloth: '#2a0a14', accent: '#ff2b4a', outfit: 'dress', eyes: '#ff2b4a' },
    mars: { kind: 'h', size: 'l', skin: SKIN, hair: '#2a2a30', hairStyle: 'short', cloth: '#2a5a68', accent: '#7ff3ff', outfit: 'armor', weapon: 'sword', eyes: '#3fc7d6' },
    zenon: { kind: 'h', size: 'l', skin: '#d8c8b8', hair: '#1a1a1a', hairStyle: 'short', cloth: '#e8e0d0', accent: '#a09080', outfit: 'armor', horns: '#f2ead8', weapon: 'spear', eyes: '#b28cff' },
    dante: { kind: 'h', size: 'l', skin: '#c8b0c8', hair: '#3a1a5a', hairStyle: 'long', cloth: '#2a1a3a', accent: '#a070ff', cape: '#1a0a2a', eyes: '#c08cff' },
    lucifero: { kind: 'h', size: 'l', skin: '#3a1a4a', hair: '#0a0010', hairStyle: 'spiky', horns: '#f2ead8', wings: '#1a0b2e', cloth: '#1a0b2e', accent: '#7a3aff', eyes: '#ff2020', outlineColor: '#000000' },
    lucius: { kind: 'h', size: 'l', skin: '#f0d8c0', hair: '#f0d070', hairStyle: 'short', cloth: '#f5e6b0', accent: '#d8b040', outfit: 'robe', halo: '#ffe58a', book: '#d8b040', eyes: '#c04020' },
    luciusPaladin: { kind: 'h', size: 'l', skin: '#f0d8c0', hair: '#f0d070', hairStyle: 'helmet', helmet: '#fffbe0', cloth: '#fffbe0', accent: '#ffd76a', outfit: 'armor', wings: '#ffffff', halo: '#ffe58a', weapon: 'sword', eyes: '#c04020' },
  };

  ENEMY_LOOKS.ilusion = ENEMY_LOOKS.ilusionista; // las copias se ven igual que la verdadera

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

  // sprite listo para dibujar (canvas), con caché por id+cuadro+dirección
  function actorSprite(key, look, frame, flip) {
    const k = key + '|' + frame + '|' + (flip ? 1 : 0);
    let c = cache.get(k);
    if (!c) {
      c = build(look, frame).toCanvas(flip);
      cache.set(k, c);
    }
    return c;
  }

  function playerSprite(chId, frame, flip) {
    return actorSprite('p:' + chId, LOOKS[chId] || LOOKS.mago, frame, flip);
  }

  function enemyLookKey(e) {
    if (e.name === 'Lucifero') return 'lucifero';
    if (e.name === 'Lucius (Paladín Supremo)') return 'luciusPaladin';
    return ENEMY_LOOKS[e.id] ? e.id : null;
  }

  function enemySprite(e, frame, flip) {
    const key = enemyLookKey(e);
    if (!key) return null;
    return actorSprite('e:' + key, ENEMY_LOOKS[key], frame, flip);
  }

  // ---------------------------------------------------------------------
  // ÍCONOS Y OBJETOS (texto -> píxeles)
  // ---------------------------------------------------------------------
  const ICONS = {
    coin: { pal: { y: '#ffd23a', o: '#a07400', w: '#fff6c0' }, rows: ['.ooo.', 'oywyo', 'oyyyo', 'oyyyo', '.ooo.'] },
    heart: { pal: { r: '#ff3b4a', o: '#5a0a10', w: '#ffc0c8' }, rows: ['.oo.oo.', 'orrorro', 'orwrrro', 'orrrrro', '.orrro.', '..oro..', '...o...'] },
    chest: { pal: { b: '#8a5a2a', d: '#5a3a18', g: '#ffd76a', o: '#1a0f08' }, rows: ['.oooooooo.', 'obbbbbbbbo', 'obbbbbbbbo', 'oggggggggo', 'oddddgdddo', 'obbbgggbbo', 'obbbbbbbbo', 'oddddddddo', '.oooooooo.'] },
    combat: { pal: { s: '#e8e8f0', h: '#7a5a20', o: '#1a1a20' }, rows: ['s.......s', '.s.....s.', '..s...s..', '...s.s...', '....s....', '...s.s...', '..h...h..', '.h.....h.', 'o.......o'] },
    elite: { pal: { w: '#f0eadc', o: '#1a1020' }, rows: ['.wwwwwww.', 'wwwwwwwww', 'wooowooow', 'wooowooow', 'wwwwowwww', '.wwwwwww.', '..w.w.w..'] },
    shop: { pal: { b: '#c08a3a', d: '#7a5020', y: '#ffd23a' }, rows: ['...ddd...', '..d...d..', '.bbbbbbb.', 'bbbbbbbbb', 'bbbyyybbb', 'bbbyyybbb', 'bbbbbbbbb', '.bbbbbbb.'] },
    event: { pal: { b: '#4aa3d9', w: '#ffffff' }, rows: ['..bbbbb..', '.bb...bb.', '.....bb..', '....bb...', '...bb....', '...bb....', '.........', '...bb....'] },
    rest: { pal: { r: '#ff5a1a', y: '#ffd23a', b: '#6a4020' }, rows: ['....r....', '...rr....', '...ryr.r.', '..rryyrr.', '..ryyyyr.', '...ryyr..', 'bb.....bb', '.bbbbbbb.'] },
    boss: { pal: { r: '#c41e1e', d: '#3a0408', y: '#ffd23a' }, rows: ['r.......r', 'rr.....rr', '.rrrrrrr.', 'rryyryyrr', 'rrrrrrrrr', 'rrdddddrr', '.rrrrrrr.'] },
  };
  function icon(name) {
    const k = 'i:' + name;
    let c = cache.get(k);
    if (!c) {
      const d = ICONS[name];
      if (!d) return null;
      const g = new Grid(d.rows[0].length, d.rows.length);
      g.stamp(d.rows, 0, 0, d.pal);
      c = g.toCanvas();
      cache.set(k, c);
    }
    return c;
  }

  // ---------------------------------------------------------------------
  // DECORACIONES (según el emoji de deco de cada reino)
  // ---------------------------------------------------------------------
  const DECOS = {
    tree: { pal: { g: '#2f6a2a', l: '#4a9a3a', t: '#5a3a1a', o: '#0f1a0f' }, rows: ['....gg....', '...gggg...', '..gglggg..', '..gggggg..', '.gggglggg.', '.gggggggg.', 'gggglggggg', 'gggggggggg', '....tt....', '....tt....'] },
    bush: { pal: { g: '#3f8a35', l: '#6ab04a' }, rows: ['..gg.gg.', '.gglgggg', 'gggggggl', 'gglggggg', '.gggggg.'] },
    rock: { pal: { g: '#7a7a80', l: '#a0a0a8', d: '#4a4a50' }, rows: ['..gggg..', '.glllgg.', 'ggllgggd', 'gggggddd', '.ddddd..'] },
    mushroom: { pal: { r: '#c0302a', w: '#f0e0d0', s: '#e8d8c0' }, rows: ['.rrrr.', 'rrwrrr', 'rrrrwr', '..ss..', '..ss..'] },
    flower: { pal: { p: '#ff8ac8', y: '#ffe14a', g: '#3f9a3a' }, rows: ['.p.p.', 'ppypp', '.ppp.', '..g..', '..g..'] },
    crystal: { pal: { c: '#7ff3ff', l: '#e0ffff', d: '#2e8a9a' }, rows: ['...c...', '..clc..', '..clc.c', '.cclccl', '.cclcc.', 'ddddddd'] },
    grave: { pal: { g: '#8a8a90', d: '#4a4a50' }, rows: ['.ggg.', 'ggggg', 'gdgdg', 'ggggg', 'ggggg', 'ddddd'] },
    torch: { pal: { r: '#ff6a1a', y: '#ffe14a', b: '#5a3a1a' }, rows: ['.r.', 'ryr', 'ryr', '.b.', '.b.', '.b.'] },
    sword: { pal: { s: '#c0c8d0', h: '#7a5a20', d: '#4a3a2a' }, rows: ['.h.', 'hhh', '.s.', '.s.', '.s.', '.s.', 'ddd'] },
    candle: { pal: { y: '#ffe14a', w: '#f0e8d8', d: '#8a7a5a' }, rows: ['.y.', '.y.', 'www', 'www', 'www', 'ddd'] },
    bat: { pal: { b: '#2a1a3a', r: '#ff3030' }, rows: ['b.....b', 'bb.b.bb', 'bbbrbbb', '.bbbbb.', '...b...'] },
    chain: { pal: { c: '#8a8a90' }, rows: ['.c.', 'c.c', '.c.', 'c.c', '.c.', 'c.c'] },
    crown: { pal: { y: '#ffd76a', r: '#c0302a' }, rows: ['y.y.y', 'yyyyy', 'yryry', 'yyyyy'] },
    pillar: { pal: { w: '#e8e0c8', d: '#a09880' }, rows: ['wwwww', '.wdw.', '.wdw.', '.wdw.', '.wdw.', 'wwwww'] },
    sparkle: { pal: { y: '#fff3a0' }, rows: ['..y..', '..y..', 'yyyyy', '..y..', '..y..'] },
    banner: { pal: { r: '#8a1c1c', y: '#ffd76a', p: '#5a3a1a' }, rows: ['ppppp', 'rrrrr', 'ryyyr', 'rrrrr', 'rr.rr', 'r...r'] },
  };
  const DECO_BY_EMOJI = {
    '🌲': 'tree', '🌳': 'tree', '🌿': 'bush', '🪨': 'rock', '🍄': 'mushroom', '🌸': 'flower', '🌷': 'flower',
    '💎': 'crystal', '🔷': 'crystal', '⛏️': 'rock', '🪦': 'grave', '🔥': 'torch', '⚔️': 'sword', '🕯️': 'candle',
    '🦇': 'bat', '⛓️': 'chain', '👑': 'crown', '🏛️': 'pillar', '✨': 'sparkle', '⛪': 'banner',
  };
  function deco(emoji) {
    const name = DECO_BY_EMOJI[emoji] || 'rock';
    const k = 'd:' + name;
    let c = cache.get(k);
    if (!c) {
      const d = DECOS[name];
      const g = new Grid(d.rows[0].length + 2, d.rows.length + 2);
      g.stamp(d.rows, 1, 1, d.pal);
      g.outline('#0a0a0e');
      c = g.toCanvas();
      cache.set(k, c);
    }
    return c;
  }

  // ---------------------------------------------------------------------
  // PISOS: 4 variantes de baldosa de 16x16 por reino
  // ---------------------------------------------------------------------
  function hash(a, b) {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function tiles(realm) {
    const k = 't:' + realm.id;
    let list = cache.get(k);
    if (list) return list;
    const pal = realm.palette;
    list = [];
    for (let v = 0; v < 6; v++) {
      const c = makeCanvas(16, 16);
      const x = c.getContext('2d');
      x.fillStyle = v % 2 ? pal.floor2 : pal.floor;
      x.fillRect(0, 0, 16, 16);
      const dark = shade(pal.floor, -0.18);
      const light = shade(pal.floor2, 0.08);
      for (let i = 0; i < 14; i++) {
        const px = Math.floor(hash(v * 31 + i, 7) * 16);
        const py = Math.floor(hash(v * 17 + i, 13) * 16);
        x.fillStyle = hash(i, v) < 0.5 ? dark : light;
        x.fillRect(px, py, 1, 1);
      }
      const r = (a, b) => hash(v * 101 + a, b);
      switch (realm.id) {
        case 'trebol': // matas de pasto y alguna flor
          for (let i = 0; i < 3; i++) {
            const px = Math.floor(r(i, 1) * 13) + 1;
            const py = Math.floor(r(i, 2) * 12) + 3;
            x.fillStyle = shade(pal.floor2, 0.3);
            x.fillRect(px, py, 1, 2);
            x.fillRect(px - 1, py + 1, 1, 1);
            x.fillRect(px + 1, py + 1, 1, 1);
          }
          if (v === 5) {
            x.fillStyle = '#ffe14a';
            x.fillRect(6, 6, 1, 1);
            x.fillStyle = '#ffffff';
            x.fillRect(5, 6, 1, 1);
            x.fillRect(7, 6, 1, 1);
            x.fillRect(6, 5, 1, 1);
            x.fillRect(6, 7, 1, 1);
          }
          break;
        case 'corazon': // pétalos
          // pocos pétalos y no en todas las baldosas
          for (let i = 0; i < (v % 3 === 0 ? 2 : 0); i++) {
            x.fillStyle = i % 2 ? '#d07aa8' : '#e8a4c8';
            x.fillRect(Math.floor(r(i, 3) * 15), Math.floor(r(i, 4) * 15), 1, 1);
          }
          break;
        case 'diamante': // vetas de cristal
          x.fillStyle = shade(pal.accent, -0.2);
          for (let i = 0; i < (v % 2 ? 1 : 0); i++) {
            const px = Math.floor(r(i, 5) * 12) + 2;
            const py = Math.floor(r(i, 6) * 12) + 2;
            x.fillRect(px, py, 2, 1);
            x.fillRect(px + 1, py - 1, 1, 1);
          }
          if (v === 5) {
            x.fillStyle = '#ffffff';
            x.fillRect(9, 4, 1, 1);
          }
          break;
        case 'espada': // grietas
          x.fillStyle = shade(pal.floor, -0.45);
          if (v !== 1) {
            let px = Math.floor(r(1, 7) * 10) + 2;
            for (let y = 3; y < 12; y++) {
              x.fillRect(px, y, 1, 1);
              if (r(y, 8) < 0.35) px += r(y, 9) < 0.5 ? -1 : 1;
            }
          }
          break;
        case 'pica':
        case 'capital': // baldosas de piedra
          x.fillStyle = shade(pal.floor, -0.35);
          x.fillRect(0, 15, 16, 1);
          x.fillRect(15, 0, 1, 16);
          x.fillStyle = shade(pal.floor2, 0.12);
          x.fillRect(0, 0, 15, 1);
          if (realm.id === 'capital' && v === 5) {
            x.fillStyle = shade(pal.accent, -0.3);
            x.fillRect(7, 7, 2, 2);
          }
          break;
      }
      list.push(c);
    }
    cache.set(k, list);
    return list;
  }

  // patrón de ladrillos para las paredes
  function wallTile(realm) {
    const k = 'w:' + realm.id;
    let c = cache.get(k);
    if (c) return c;
    c = makeCanvas(16, 8);
    const x = c.getContext('2d');
    const w = realm.palette.wall;
    x.fillStyle = w;
    x.fillRect(0, 0, 16, 8);
    x.fillStyle = shade(w, 0.12);
    x.fillRect(0, 0, 7, 3);
    x.fillRect(8, 0, 7, 3);
    x.fillRect(4, 4, 7, 3);
    x.fillRect(12, 4, 4, 3);
    x.fillRect(0, 4, 3, 3);
    cache.set(k, c);
    return c;
  }

  // patrón "tramado" (dithering) para zonas y avisos: un píxel sí, uno no
  function dither(color) {
    const k = 'dither:' + color;
    let c = cache.get(k);
    if (c) return c;
    c = makeCanvas(2, 2);
    const x = c.getContext('2d');
    x.fillStyle = color;
    x.fillRect(0, 0, 1, 1);
    x.fillRect(1, 1, 1, 1);
    cache.set(k, c);
    return c;
  }

  BC.Pixel = { DECO_BY_EMOJI, hash, SCALE, Grid, shade, LOOKS, ENEMY_LOOKS, playerSprite, enemySprite, enemyLookKey, icon, deco, tiles, wallTile, dither, makeCanvas };
})(typeof window !== 'undefined' ? window : globalThis);
