/*
 * Fondo animado del menú principal (pixel art, 320 x 180 agrandado x4):
 * noche estrellada, luna, montañas, el castillo del Reino del Trébol con ventanas
 * encendidas, y los cuatro caballeros alrededor de una fogata, con luciérnagas y
 * hojas de trébol que caen.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});
  const W = 320;
  const H = 180;
  let lo = null;
  let lctx = null;
  let staticLayer = null;

  // matriz de Bayer 4x4 para degradados "tramados" estilo 16 bits
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const SKY = ['#070a22', '#0c1233', '#141842', '#221b4f', '#33205a', '#4a2a5e', '#6a3a62'];

  function hash(i, s) {
    return BC.Pixel.hash(i, s || 1);
  }

  // devuelve dos capas fijas: el cielo y la tierra (con el cielo transparente)
  function buildStatic() {
    const skyC = BC.Pixel.makeCanvas(W, H);
    const c = BC.Pixel.makeCanvas(W, H);
    let x = skyC.getContext('2d');
    // cielo con degradado tramado
    const horizon = 118;
    for (let y = 0; y < horizon; y++) {
      const t = (y / horizon) * (SKY.length - 1);
      const band = Math.floor(t);
      const frac = t - band;
      for (let px = 0; px < W; px++) {
        const th = (BAYER[(y % 4) * 4 + (px % 4)] + 0.5) / 16;
        x.fillStyle = SKY[Math.min(SKY.length - 1, frac > th ? band + 1 : band)];
        x.fillRect(px, y, 1, 1);
      }
    }
    x = c.getContext('2d');
    // montañas lejanas
    x.fillStyle = '#1b1434';
    for (let px = 0; px < W; px++) {
      const h = 92 + Math.round(Math.sin(px * 0.035) * 9 + Math.sin(px * 0.11 + 1) * 4 + Math.sin(px * 0.013) * 6);
      x.fillRect(px, h, 1, H - h);
    }
    // nieve en las puntas
    x.fillStyle = '#3a3360';
    for (let px = 0; px < W; px++) {
      const h = 92 + Math.round(Math.sin(px * 0.035) * 9 + Math.sin(px * 0.11 + 1) * 4 + Math.sin(px * 0.013) * 6);
      if (h < 88) x.fillRect(px, h, 1, 2);
    }
    // castillo del Reino del Trébol (silueta)
    const cx = 248;
    const base = 104;
    x.fillStyle = '#100a1e';
    x.fillRect(cx - 34, base - 14, 68, 30); // muralla
    for (let i = 0; i < 9; i++) x.fillRect(cx - 34 + i * 8, base - 17, 4, 3); // almenas
    const tower = (tx, w, h, roof) => {
      x.fillRect(tx, base - h, w, h);
      for (let r = 0; r < roof; r++) x.fillRect(tx + Math.floor((r * w) / (2 * roof)), base - h - roof + r, w - 2 * Math.floor((r * w) / (2 * roof)), 1);
      x.fillRect(tx + (w >> 1), base - h - roof - 3, 1, 3); // bandera
    };
    tower(cx - 40, 8, 26, 8);
    tower(cx + 32, 8, 26, 8);
    tower(cx - 18, 10, 36, 10);
    tower(cx + 8, 10, 36, 10);
    tower(cx - 5, 12, 48, 14);
    // colinas del medio con pinos
    x.fillStyle = '#0d1f18';
    for (let px = 0; px < W; px++) {
      const h = 122 + Math.round(Math.sin(px * 0.02 + 2) * 6 + Math.sin(px * 0.07) * 2);
      x.fillRect(px, h, 1, H - h);
    }
    for (let i = 0; i < 26; i++) {
      const px = Math.floor(hash(i, 3) * W);
      const h = 122 + Math.round(Math.sin(px * 0.02 + 2) * 6 + Math.sin(px * 0.07) * 2);
      const th = 8 + Math.floor(hash(i, 4) * 8);
      for (let r = 0; r < th; r++) {
        const half = Math.floor((r / th) * 4) + 1;
        x.fillRect(px - half, h - th + r, half * 2 + 1, 1);
      }
    }
    // suelo del frente
    for (let px = 0; px < W; px++) {
      const h = 146 + Math.round(Math.sin(px * 0.03) * 3);
      x.fillStyle = '#1c3a22';
      x.fillRect(px, h, 1, H - h);
      x.fillStyle = '#2c5a2e';
      x.fillRect(px, h, 1, 1);
      if (hash(px, 9) < 0.25) {
        x.fillStyle = '#3a7a3a';
        x.fillRect(px, h - 1, 1, 1);
      }
    }
    for (let i = 0; i < 120; i++) {
      x.fillStyle = hash(i, 11) < 0.5 ? '#173020' : '#24482a';
      x.fillRect(Math.floor(hash(i, 12) * W), 150 + Math.floor(hash(i, 13) * 30), 1, 1);
    }
    // troncos de la fogata
    x.fillStyle = '#4a2a14';
    x.fillRect(201, 158, 12, 2);
    x.fillRect(203, 156, 2, 4);
    x.fillRect(209, 156, 2, 4);
    return { sky: skyC, land: c };
  }

  // ---------------- capas animadas ----------------
  function stars(x, t) {
    for (let i = 0; i < 80; i++) {
      const sx = Math.floor(hash(i, 21) * W);
      const sy = Math.floor(hash(i, 22) * 95);
      const tw = Math.sin(t * (1 + hash(i, 23) * 3) + i);
      if (tw < -0.6) continue;
      x.fillStyle = tw > 0.7 ? '#ffffff' : hash(i, 24) < 0.3 ? '#ffe8a8' : '#9aa6d8';
      x.fillRect(sx, sy, 1, 1);
      if (tw > 0.95 && i % 5 === 0) {
        x.fillRect(sx - 1, sy, 1, 1);
        x.fillRect(sx + 1, sy, 1, 1);
        x.fillRect(sx, sy - 1, 1, 1);
        x.fillRect(sx, sy + 1, 1, 1);
      }
    }
  }

  function moon(x) {
    const mx = 286;
    const my = 30;
    // halo tramado
    x.fillStyle = x.createPattern(BC.Pixel.dither('rgba(255,240,200,0.35)'), 'repeat');
    x.beginPath();
    x.arc(mx, my, 20, 0, Math.PI * 2);
    x.fill();
    for (let dy = -12; dy <= 12; dy++)
      for (let dx = -12; dx <= 12; dx++) {
        if (dx * dx + dy * dy > 144) continue;
        x.fillStyle = dx + dy > 8 ? '#d8cfae' : '#f4ecd0';
        x.fillRect(mx + dx, my + dy, 1, 1);
      }
    x.fillStyle = '#cfc4a0';
    x.fillRect(mx - 4, my - 3, 3, 3);
    x.fillRect(mx + 3, my + 2, 2, 2);
    x.fillRect(mx - 1, my + 5, 2, 2);
  }

  function clouds(x, t) {
    for (let i = 0; i < 4; i++) {
      const w = 30 + i * 8;
      const cx = ((hash(i, 31) * W + t * (2 + i)) % (W + w * 2)) - w;
      const cy = 18 + i * 14;
      x.fillStyle = 'rgba(70,60,110,0.55)';
      x.fillRect(Math.round(cx), cy, w, 3);
      x.fillRect(Math.round(cx) + 4, cy - 2, w - 10, 2);
      x.fillRect(Math.round(cx) + 8, cy - 4, w - 20, 2);
    }
  }

  function castleWindows(x, t) {
    const wins = [[245, 70], [249, 70], [238, 80], [258, 80], [231, 90], [266, 90], [215, 95], [281, 95], [243, 92], [253, 92]];
    wins.forEach(([wx, wy], i) => {
      const on = Math.sin(t * 0.7 + i * 1.7) > -0.3;
      x.fillStyle = on ? (Math.sin(t * 9 + i) > 0.8 ? '#fff0a0' : '#ffc84a') : '#4a3410';
      x.fillRect(wx, wy, 1, 2);
    });
  }

  function campfire(x, t) {
    const fx = 207;
    const fy = 156;
    // resplandor en el piso
    x.fillStyle = x.createPattern(BC.Pixel.dither('rgba(255,140,40,0.35)'), 'repeat');
    x.beginPath();
    x.ellipse(fx, fy + 2, 30 + Math.sin(t * 8) * 2, 9, 0, 0, Math.PI * 2);
    x.fill();
    // llamas
    const f = Math.floor(t * 10) % 3;
    const flame = [
      ['..r..', '.ryr.', '.ryr.', 'ryyyr', 'ryyyr'],
      ['.r...', '.rr..', 'ryyr.', 'ryyyr', '.ryyr'],
      ['...r.', '..rr.', '.ryyr', 'ryyyr', 'ryyr.'],
    ][f];
    const pal = { r: '#ff5a1a', y: '#ffd23a' };
    flame.forEach((row, yy) => {
      for (let xx = 0; xx < row.length; xx++) {
        const ch = row[xx];
        if (ch === '.') continue;
        x.fillStyle = pal[ch];
        x.fillRect(fx - 2 + xx, fy - 5 + yy, 1, 1);
      }
    });
    // chispas que suben
    for (let i = 0; i < 6; i++) {
      const life = (t * 0.9 + hash(i, 41)) % 1;
      x.fillStyle = life < 0.5 ? '#ffd23a' : '#ff6a1a';
      x.fillRect(fx + Math.round(Math.sin(t * 3 + i) * 3 + (hash(i, 42) - 0.5) * 6), fy - 6 - Math.round(life * 22), 1, 1);
    }
  }

  function heroes(x, t) {
    const P = BC.Pixel;
    // (personaje, x, y de los pies, mirando a la izquierda)
    const list = [
      ['noelle', 182, 160, false],
      ['asta', 192, 162, false],
      ['yuno', 224, 160, true],
      ['mago', 234, 163, true],
    ];
    for (const [id, px, py, flip] of list) {
      const spr = P.playerSprite(id, 0, flip);
      const bob = Math.floor(t * 2 + px) % 2;
      x.fillStyle = 'rgba(0,0,0,0.35)';
      x.fillRect(px - 4, py, 9, 1);
      x.drawImage(spr, px - (spr.width >> 1), py - spr.height + 1 - (id === 'asta' ? 0 : bob));
    }
  }

  function fireflies(x, t) {
    for (let i = 0; i < 14; i++) {
      const fx = 120 + hash(i, 51) * 190 + Math.sin(t * 0.6 + i) * 10;
      const fy = 120 + hash(i, 52) * 45 + Math.cos(t * 0.8 + i * 2) * 6;
      if (Math.sin(t * 2 + i * 3) < 0) continue;
      x.fillStyle = '#d8ff7a';
      x.fillRect(Math.round(fx), Math.round(fy), 1, 1);
    }
  }

  // hojitas de trébol que caen
  const LEAF = ['.g.g.', 'ggggg', '.ggg.', '..g..'];
  function leaves(x, t) {
    for (let i = 0; i < 7; i++) {
      const speed = 6 + hash(i, 61) * 6;
      const lx = (hash(i, 62) * W + t * speed * 0.6) % W;
      const ly = ((hash(i, 63) * H + t * speed) % (H + 10)) - 10;
      x.fillStyle = i % 3 === 0 ? '#5ad06a' : '#3a9a4a';
      LEAF.forEach((row, yy) => {
        for (let xx = 0; xx < row.length; xx++) if (row[xx] === 'g') x.fillRect(Math.round(lx + xx + Math.sin(t + i) * 3), Math.round(ly + yy), 1, 1);
      });
    }
  }

  function draw(ctx, t, d) {
    if (!BC.Pixel) return false;
    if (!lo) {
      lo = BC.Pixel.makeCanvas(W, H);
      lctx = lo.getContext('2d');
      lctx.imageSmoothingEnabled = false;
    }
    if (!staticLayer) staticLayer = buildStatic();
    lctx.clearRect(0, 0, W, H);
    // primero el cielo (parte de la capa fija), arriba las estrellas y la luna
    lctx.drawImage(staticLayer.sky, 0, 0);
    stars(lctx, t);
    moon(lctx);
    clouds(lctx, t);
    lctx.drawImage(staticLayer.land, 0, 0);
    castleWindows(lctx, t);
    campfire(lctx, t);
    heroes(lctx, t);
    fireflies(lctx, t);
    leaves(lctx, t);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lo, 0, 0, d.width, d.height);
    ctx.restore();
    return true;
  }

  BC.MenuScene = { draw };
})(typeof window !== 'undefined' ? window : globalThis);
