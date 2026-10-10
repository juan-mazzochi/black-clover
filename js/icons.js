/*
 * ÍCONOS EN PIXEL ART (reemplazan a los emojis del sistema).
 *
 * Cada emoji que usa el juego (habilidades, reliquias, pasivas, sinergias,
 * menús, barra de arriba...) tiene acá un dibujito de 16 x 16 píxeles hecho
 * con código. Se usan en dos lugares:
 *   - en el canvas (render.js los dibuja en vez del emoji),
 *   - en las ventanas HTML: BC.PixelIcons.replaceIn(elemento) cambia cada
 *     emoji del texto por una imagen <img class="pxi">.
 * Si algún emoji no tiene dibujo, queda el emoji de siempre.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});
  const P = BC.Pixel;
  if (!P || !P.GridHD || typeof document === 'undefined') return;
  const G = P.GridHD;
  const shade = P.shade;
  const mix = P.mix;

  // ---------- piezas que se repiten ----------
  const orb = (g, c) => {
    g.ball(8, 8, 6.6, 6.6, c);
    g.set(5, 5, '#ffffff');
    g.set(6, 5, mix(c, '#ffffff', 0.6));
  };
  const gem = (g, c) => {
    g.poly([[8, 1], [14, 7], [8, 15], [2, 7]], c);
    g.poly([[8, 1], [2, 7], [8, 7]], shade(c, 0.45));
    g.poly([[8, 1], [14, 7], [8, 7]], shade(c, 0.2));
    g.poly([[2, 7], [8, 15], [8, 7]], shade(c, -0.1));
    g.poly([[14, 7], [8, 15], [8, 7]], shade(c, -0.35));
    g.set(6, 4, '#ffffff');
  };
  // espada diagonal: punta arriba a la derecha
  const swordDiag = (g, blade, hilt, flip) => {
    const X = (x) => (flip ? 15 - x : x);
    for (let i = 0; i < 10; i++) {
      g.set(X(4 + i), 11 - i, blade);
      g.set(X(5 + i), 11 - i, shade(blade, -0.3));
      g.set(X(4 + i), 10 - i, shade(blade, 0.35));
    }
    g.line(X(2), 9, X(6), 13, hilt); // guarda
    g.line(X(3), 12, X(1), 14, '#6a4a2a'); // mango
    g.set(X(0), 15, hilt);
  };
  const flame = (g, cx, cy, s, outer, inner) => {
    g.poly([[cx, cy - 7 * s], [cx + 4 * s, cy - 1 * s], [cx + 3.5 * s, cy + 3 * s], [cx, cy + 5 * s], [cx - 3.5 * s, cy + 3 * s], [cx - 4 * s, cy - 1 * s], [cx - 1.5 * s, cy - 3 * s]], outer || '#ff5a1a');
    g.poly([[cx + 0.5, cy - 3 * s], [cx + 2.5 * s, cy + 1 * s], [cx + 2 * s, cy + 3 * s], [cx, cy + 4.5 * s], [cx - 2 * s, cy + 3 * s], [cx - 2 * s, cy + 0.5 * s]], inner || '#ffd23a');
    g.ellipse(cx, cy + 2.6 * s, 1.2 * s, 1.5 * s, '#fff6c0');
  };
  const heartShape = (g, c, hi) => {
    g.ball(5, 6, 3.6, 3.6, c);
    g.ball(11, 6, 3.6, 3.6, c);
    g.poly([[1.4, 7], [14.6, 7], [8, 14.5]], shade(c, -0.12));
    g.rect(3, 4, 4, 5, hi || mix(c, '#ffffff', 0.55));
    g.set(3, 4, '#ffffff');
  };
  const book = (g, cover, emblem) => {
    g.box(3, 1, 13, 14, cover, { top: true, light: 0.3 });
    g.rect(3, 1, 4, 14, shade(cover, -0.4)); // lomo
    g.rect(13, 2, 13, 14, '#f0e6c8'); // hojas
    g.rect(14, 3, 14, 14, '#d8ccaa');
    if (emblem) emblem(g);
  };
  const cloverEmblem = (g, c) => {
    g.ellipse(7, 6, 1.6, 1.6, c);
    g.ellipse(10, 6, 1.6, 1.6, c);
    g.ellipse(8.5, 4, 1.6, 1.6, mix(c, '#ffffff', 0.35));
    g.line(8, 8, 8, 10, shade(c, -0.25));
  };
  const cloud = (g, c, y) => {
    const yy = y || 0;
    g.ball(5, 9 + yy, 4, 3.4, c);
    g.ball(10, 7 + yy, 4.6, 4.2, c);
    g.ball(12.5, 10 + yy, 3, 2.6, c);
    g.rect(2, 10 + yy, 14, 12 + yy, c);
    g.rect(3, 12 + yy, 13, 12 + yy, shade(c, -0.25));
  };
  const bolt = (g, c, ox, oy) => {
    const o = ox || 0;
    const p = oy || 0;
    g.poly([[9 + o, 0 + p], [3 + o, 9 + p], [7 + o, 9 + p], [5 + o, 16 + p], [13 + o, 6 + p], [9 + o, 6 + p], [12 + o, 0 + p]], c);
    g.line(9 + o, 1 + p, 5 + o, 8 + p, mix(c, '#ffffff', 0.7));
  };
  const face = (g, skin, mood) => {
    g.ball(8, 8, 6.6, 6.6, skin);
    const e = '#2a1a10';
    if (mood === 'devil') {
      g.line(4, 5, 6, 6, e);
      g.line(12, 5, 10, 6, e);
      g.rect(5, 7, 6, 7, e);
      g.rect(10, 7, 11, 7, e);
      g.line(5, 10, 8, 12, e);
      g.line(11, 10, 8, 12, e);
    } else if (mood === 'angry') {
      g.line(4, 6, 6, 7, e);
      g.line(12, 6, 10, 7, e);
      g.rect(5, 8, 6, 8, e);
      g.rect(10, 8, 11, 8, e);
      g.rect(6, 11, 10, 11, e);
    } else {
      g.rect(5, 6, 5, 8, e);
      g.rect(11, 6, 11, 8, e);
      g.line(5, 11, 7, 12, e);
      g.line(11, 11, 9, 12, e);
      g.rect(7, 12, 9, 12, e);
    }
  };

  // ---------- un dibujo por emoji (sin el "selector de variante" U+FE0F) ----------
  const D = {
    // ===== armas y combate =====
    '⚔': (g) => {
      swordDiag(g, '#dfe4ea', '#c8a040', false);
      swordDiag(g, '#dfe4ea', '#c8a040', true);
    },
    '🗡': (g) => swordDiag(g, '#e8ecf0', '#c8a040'),
    '🔱': (g) => {
      g.rect(7, 4, 8, 15, '#d8b040');
      g.rect(7, 4, 7, 15, '#f0d070');
      g.rect(2, 5, 13, 6, '#d8b040');
      for (const x of [2, 7, 12]) g.poly([[x - 0.5, 5], [x + 1, 0], [x + 2.5, 5]], '#f0d070');
      g.rect(6, 14, 9, 15, '#a07a20');
    },
    '🔨': (g) => {
      g.box(2, 2, 13, 6, '#8a8a94', { top: true, light: 0.35 });
      g.box(7, 7, 8, 15, '#8a5a2a');
      g.set(3, 3, '#e0e0e8');
    },
    '⚒': (g) => {
      g.line(2, 14, 12, 4, '#8a5a2a');
      g.line(14, 14, 4, 4, '#8a5a2a');
      g.poly([[9, 1], [15, 6], [13, 7], [8, 3]], '#9a9aa4');
      g.poly([[1, 3], [5, 1], [7, 5], [3, 6]], '#9a9aa4');
      g.set(10, 2, '#e0e0e8');
    },
    '⛏': (g) => {
      g.line(3, 14, 11, 6, '#8a5a2a');
      g.line(4, 14, 12, 6, '#6a4020');
      g.poly([[2, 4], [7, 1], [12, 1], [15, 5], [14, 8], [11, 4], [7, 3]], '#9aa0aa');
      g.line(7, 2, 12, 2, '#e0e4ea');
    },
    '🏹': (g) => {
      g.line(3, 1, 3, 15, '#e8e0d0'); // cuerda
      for (let y = 1; y <= 15; y++) {
        const x = 4 + Math.round(Math.sin(((y - 1) / 14) * Math.PI) * 8);
        g.set(x, y, '#8a5a2a');
        g.set(x - 1, y, '#a87038');
      }
      g.line(1, 8, 14, 8, '#c8a070');
      g.poly([[12, 6], [15, 8], [12, 10]], '#d8dde3');
      g.rect(1, 7, 2, 9, '#c0302a');
    },
    '🥊': (g) => {
      g.ball(8, 6.5, 6, 5.5, '#d02828');
      g.ball(4, 8, 2.6, 2.6, '#e03a3a');
      g.box(4, 11, 12, 15, '#f0ece0');
      g.rect(4, 11, 12, 11, '#c8c0b0');
      g.set(6, 3, '#ff9a9a');
    },
    '👊': (g) => {
      g.ball(8, 8, 6, 5.6, '#f0c090');
      for (const x of [4, 7, 10]) g.rect(x, 4, x, 7, '#c88a5a');
      g.rect(3, 9, 7, 10, '#c88a5a');
      g.set(5, 4, '#ffe0c0');
    },
    '💪': (g) => {
      // brazo flexionado: antebrazo hacia arriba y bíceps marcado
      g.box(2, 9, 10, 13, '#e8b080', { light: 0.15 });
      g.ball(7, 9, 4, 3.2, '#f0c090');
      g.box(10, 2, 13, 11, '#e8b080', { light: 0.15 });
      g.ball(11.5, 2.5, 2.6, 2.2, '#f0c090'); // puño
      g.line(10, 2, 13, 2, '#c88a5a');
      g.line(5, 7, 8, 6, '#ffe0c0');
      g.line(3, 13, 10, 13, '#c88a5a');
    },
    '🛡': (g) => {
      g.poly([[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]], '#3a6ad0');
      g.poly([[8, 2], [14, 2], [14, 8], [8, 15]], '#2a50a8');
      g.rect(2, 2, 14, 3, '#d8b040');
      g.rect(7, 4, 8, 12, '#d8b040');
      g.rect(4, 6, 11, 7, '#d8b040');
      g.set(3, 4, '#8ab0ff');
    },
    '🪖': (g) => {
      g.ellipse(8, 9, 7, 6, '#5a6a4a');
      g.rect(0, 10, 15, 12, '#4a5a3a');
      g.rect(1, 10, 14, 10, '#7a8a6a');
      g.clear && [13, 14, 15].forEach((y) => g.rect(0, y, 15, y, null));
      g.set(5, 5, '#8a9a7a');
    },
    '🎯': (g) => {
      g.ball(8, 8, 7, 7, '#e0e0e0', 0.4);
      g.ellipse(8, 8, 5.4, 5.4, '#d02828');
      g.ellipse(8, 8, 3.6, 3.6, '#f4f4f4');
      g.ellipse(8, 8, 1.8, 1.8, '#d02828');
      g.line(9, 7, 15, 1, '#6a4a2a');
      g.rect(13, 0, 15, 1, '#c0302a');
    },
    '💣': (g) => {
      g.ball(7, 10, 5.6, 5.4, '#2a2a34');
      g.rect(9, 3, 11, 5, '#5a5a64');
      g.line(11, 3, 13, 1, '#c8a070');
      g.set(14, 0, '#ffd23a');
      g.set(15, 1, '#ff6a1a');
      g.set(4, 7, '#8a8a98');
    },
    '⛓': (g) => {
      // cadena en diagonal: eslabones de frente y de costado
      for (let i = 0; i < 4; i++) {
        const cx = 2.5 + i * 3.6;
        const cy = 13 - i * 3.6;
        if (i % 2 === 0) {
          g.ellipse(cx, cy, 2.6, 2.6, '#9a9aa4');
          g.ellipse(cx, cy, 1, 1, null);
          for (let y = Math.round(cy) - 1; y <= Math.round(cy); y++) for (let x = Math.round(cx) - 1; x <= Math.round(cx); x++) g.clear(x, y);
          g.set(Math.round(cx) - 2, Math.round(cy) - 1, '#d0d0da');
        } else g.line(Math.round(cx - 1.5), Math.round(cy + 1.5), Math.round(cx + 1.5), Math.round(cy - 1.5), '#7a7a84');
      }
    },
    '🔗': (g) => {
      g.ellipse(5, 10, 4, 3, '#9a9aa4');
      g.ellipse(5, 10, 2, 1.2, null);
      g.ellipse(11, 6, 4, 3, '#b0b0ba');
      for (const [cx, cy] of [[5, 10], [11, 6]]) for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) g.clear(x, y);
    },
    '🦴': (g) => {
      g.line(4, 12, 12, 4, '#f0ead8');
      g.line(4, 11, 11, 4, '#f0ead8');
      for (const [x, y] of [[3, 11], [5, 13], [11, 3], [13, 5]]) g.ellipse(x, y, 1.8, 1.8, '#f0ead8');
      g.line(5, 12, 12, 5, '#c8c0a8');
    },

    // ===== elementos y magia =====
    '🔥': (g) => flame(g, 8, 9, 1),
    '💧': (g) => {
      g.poly([[8, 1], [12, 8], [8, 9]], '#4aa8ff');
      g.ball(8, 10, 4.8, 4.8, '#3a90f0');
      g.poly([[8, 1], [4, 8], [8, 9]], '#6ac0ff');
      g.rect(5, 9, 6, 11, '#c0e4ff');
    },
    '🩸': (g) => {
      g.poly([[8, 1], [12, 8], [8, 9]], '#d02020');
      g.ball(8, 10, 4.8, 4.8, '#b01818');
      g.poly([[8, 1], [4, 8], [8, 9]], '#e83030');
      g.rect(5, 9, 6, 11, '#ff8a8a');
    },
    '🌊': (g) => {
      g.poly([[0, 15], [0, 9], [3, 5], [8, 3], [12, 4], [14, 7], [11, 6], [9, 8], [11, 10], [15, 10], [15, 15]], '#2a78d0');
      g.poly([[3, 6], [8, 3.5], [12, 4.5], [14, 7], [11, 6], [8, 6]], '#e8f6ff');
      g.line(1, 12, 14, 12, '#5aa8f0');
      g.rect(0, 14, 15, 15, '#1a58a8');
    },
    '🫧': (g) => {
      for (const [x, y, r] of [[6, 9, 4.5], [12, 4, 2.6], [12.5, 12, 2]]) {
        g.ellipse(x, y, r, r, '#7ac8f0');
        g.ellipse(x, y, r - 1, r - 1, '#d8f0ff');
        g.set(Math.round(x - r / 2), Math.round(y - r / 2), '#ffffff');
      }
    },
    '🌪': (g) => {
      const rows = [[1, 1, 14], [3, 2, 13], [5, 4, 12], [7, 5, 10], [9, 6, 10], [11, 6, 9], [13, 7, 9], [15, 7, 8]];
      for (const [y, a, b] of rows) {
        g.rect(a, y - 1, b, y, '#b8c4cc');
        g.rect(a, y - 1, b, y - 1, '#e8f0f4');
        g.set(b, y, '#7a8a94');
      }
    },
    '🌀': (g) => {
      for (let t = 0; t < 26; t += 0.25) {
        const r = 0.6 + t * 0.26;
        const a = t * 0.62;
        g.set(Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r), t > 18 ? '#5ab0ff' : '#3a80e0');
      }
      g.ellipse(8, 8, 1.4, 1.4, '#c0e4ff');
    },
    '🌬': (g) => {
      for (const [y, a, b] of [[4, 1, 11], [8, 3, 14], [12, 1, 9]]) {
        g.line(a, y, b, y, '#d8eef4');
        g.set(b + 1, y - 1, '#d8eef4');
        g.set(b + 1, y - 2, '#a8ccd8');
        g.set(b, y - 2, '#a8ccd8');
      }
    },
    '🍃': (g) => {
      for (const [cx, cy, r] of [[5, 6, 0], [11, 10, 1]]) {
        g.poly([[cx - 4, cy + 3], [cx - 1, cy - 3], [cx + 4, cy - 4], [cx + 2, cy + 1]], r ? '#5ab04a' : '#7ac85a');
        g.line(cx - 3, cy + 2, cx + 3, cy - 3, '#3a8a2a');
      }
      g.line(0, 13, 6, 13, '#c8e8d8');
      g.line(9, 2, 15, 2, '#c8e8d8');
    },
    '⚡': (g) => bolt(g, '#ffd23a'),
    '☁': (g) => cloud(g, '#e8eef4', 0),
    '🌩': (g) => {
      cloud(g, '#8a94a4', -3);
      g.poly([[8, 9], [6, 13], [8, 13], [7, 16], [11, 11], [9, 11], [10, 9]], '#ffd23a');
    },
    '⛈': (g) => {
      cloud(g, '#6a7484', -3);
      g.poly([[9, 9], [7, 12], [9, 12], [8, 15], [11, 11], [9.5, 11], [10.5, 9]], '#ffd23a');
      for (const x of [3, 5, 13]) g.line(x, 11, x - 1, 14, '#6ab0f0');
    },
    '🌫': (g) => {
      for (const [y, a, b, c] of [[3, 2, 13, '#c8ccd4'], [6, 0, 11, '#b0b4bc'], [9, 4, 15, '#c8ccd4'], [12, 1, 12, '#a0a4ac']]) {
        g.rect(a, y, b, y + 1, c);
        g.rect(a, y, b - 2, y, shade(c, 0.2));
      }
    },
    '☄': (g) => {
      g.poly([[1, 1], [10, 7], [12, 12], [7, 10]], '#ff9a3a');
      g.poly([[3, 2], [10, 8], [8, 9]], '#ffd23a');
      g.ball(11, 11, 3.6, 3.6, '#8a5a3a');
      g.set(10, 10, '#c8a070');
    },
    '✨': (g) => {
      const star = (cx, cy, r, c) => {
        g.poly([[cx, cy - r], [cx + r * 0.25, cy - r * 0.25], [cx + r, cy], [cx + r * 0.25, cy + r * 0.25], [cx, cy + r], [cx - r * 0.25, cy + r * 0.25], [cx - r, cy], [cx - r * 0.25, cy - r * 0.25]], c);
      };
      star(6, 9, 6, '#ffd23a');
      star(12.5, 3.5, 3.4, '#fff0a0');
      star(13, 12.5, 2.6, '#ffe070');
      g.set(6, 9, '#ffffff');
    },
    '🌟': (g) => {
      g.ellipse(8, 8, 7.5, 7.5, '#fff0a0');
      g.poly([[8, 0.5], [10, 6], [15.5, 6], [11, 9.5], [13, 15], [8, 11.5], [3, 15], [5, 9.5], [0.5, 6], [6, 6]], '#ffc21a');
      g.poly([[8, 0.5], [10, 6], [8, 8], [6, 6]], '#ffe070');
      g.set(7, 5, '#ffffff');
    },
    '⭐': (g) => {
      g.poly([[8, 0.5], [10, 6], [15.5, 6], [11, 9.5], [13, 15], [8, 11.5], [3, 15], [5, 9.5], [0.5, 6], [6, 6]], '#ffc21a');
      g.poly([[8, 0.5], [10, 6], [8, 8], [6, 6]], '#ffe070');
      g.poly([[8, 11.5], [13, 15], [11, 9.5]], '#d89a10');
      g.set(7, 5, '#ffffff');
    },
    '☀': (g) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.line(Math.round(8 + Math.cos(a) * 5), Math.round(8 + Math.sin(a) * 5), Math.round(8 + Math.cos(a) * 7.4), Math.round(8 + Math.sin(a) * 7.4), '#ffb020');
      }
      g.ball(8, 8, 4.4, 4.4, '#ffd23a');
    },
    '🌅': (g) => {
      g.rect(0, 0, 15, 9, '#ff9a5a');
      g.rect(0, 0, 15, 3, '#c86aa0');
      g.rect(0, 4, 15, 6, '#ff7a6a');
      g.ball(8, 10, 4.5, 4.5, '#ffe070');
      g.rect(0, 10, 15, 15, '#2a5aa0');
      g.rect(3, 12, 12, 12, '#ffd080');
      g.rect(5, 14, 10, 14, '#ffd080');
    },
    '🌙': (g) => {
      g.ellipse(8, 8, 6.5, 6.5, '#ffe58a');
      g.ellipse(11, 6, 5.5, 5.5, null);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + 0.5 - 11) ** 2 + (y + 0.5 - 6) ** 2 < 30) g.clear(x, y);
      g.set(4, 8, '#fff6c0');
    },
    '🌑': (g) => {
      g.ball(8, 8, 6.6, 6.6, '#3a3448');
      g.ellipse(6, 6, 1.6, 1.4, '#4a4458');
      g.ellipse(10, 10, 1.2, 1.2, '#2a2438');
    },
    '🌈': (g) => {
      const cols = ['#e83a3a', '#ff9a2a', '#ffd23a', '#4ac04a', '#3a80e0', '#8a4ae0'];
      cols.forEach((c, i) => {
        const r = 7.5 - i;
        for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.05) g.set(Math.round(8 + Math.cos(a) * r - 0.5), Math.round(12 + Math.sin(a) * r), c);
      });
      cloud(g, '#ffffff', 5);
    },
    '🔵': (g) => orb(g, '#3a80e0'),
    '🟣': (g) => orb(g, '#8a4ae0'),
    '⚫': (g) => orb(g, '#3a3440'),
    '🔷': (g) => gem(g, '#3a90f0'),
    '🔹': (g) => {
      g.poly([[8, 3], [13, 8], [8, 13], [3, 8]], '#4aa0f0');
      g.poly([[8, 3], [3, 8], [8, 8]], '#8ac8ff');
    },
    '💠': (g) => {
      g.poly([[8, 0], [16, 8], [8, 16], [0, 8]], '#3a90f0');
      g.poly([[8, 3], [13, 8], [8, 13], [3, 8]], '#8ac8ff');
      g.ellipse(8, 8, 1.8, 1.8, '#ffffff');
    },
    '💎': (g) => {
      g.poly([[3, 2], [13, 2], [16, 6], [8, 15], [0, 6]], '#5ad0f0');
      g.poly([[3, 2], [6, 6], [0, 6]], '#a8ecff');
      g.poly([[6, 6], [10, 6], [8, 15]], '#8ae0f8');
      g.poly([[10, 6], [16, 6], [8, 15]], '#2a98c0');
      g.rect(3, 2, 13, 2, '#d8f8ff');
      g.set(5, 3, '#ffffff');
    },
    '🪨': (g) => {
      g.ball(8, 9, 7, 5.6, '#8a8a94');
      g.line(5, 7, 8, 10, '#5a5a64');
      g.line(8, 10, 12, 8, '#5a5a64');
      g.set(4, 5, '#c0c0ca');
    },
    '⛰': (g) => {
      g.poly([[0, 15], [6, 3], [9, 8], [11, 5], [16, 15]], '#7a7a8a');
      g.poly([[6, 3], [9, 8], [7, 7], [5, 8], [4.5, 6]], '#f4f4f8');
      g.poly([[11, 5], [13, 9], [10, 8.5]], '#e8e8f0');
      g.poly([[6, 3], [0, 15], [5, 15]], '#9a9aaa');
    },
    '🧱': (g) => {
      g.rect(0, 1, 15, 14, '#6a3a2a');
      const brick = (x0, y0, x1, y1) => g.box(x0, y0, x1, y1, '#b8583a', { top: true, light: 0.25 });
      brick(0, 1, 6, 4);
      brick(8, 1, 15, 4);
      brick(0, 6, 2, 9);
      brick(4, 6, 11, 9);
      brick(13, 6, 15, 9);
      brick(0, 11, 6, 14);
      brick(8, 11, 15, 14);
    },
    '🟫': (g) => {
      g.box(1, 1, 14, 14, '#8a5a32', { top: true, light: 0.25 });
      for (const [x, y] of [[4, 4], [10, 6], [6, 10], [11, 11]]) g.set(x, y, '#6a4020');
      g.set(9, 3, '#a87048');
    },
    '🌋': (g) => {
      g.poly([[0, 15], [5, 5], [11, 5], [16, 15]], '#6a4a3a');
      g.poly([[5, 5], [11, 5], [9, 7], [7, 7]], '#ff5a1a');
      g.poly([[7, 6], [9, 6], [10, 13], [8, 11], [6, 14]], '#ff7a2a');
      g.ellipse(6, 2, 2, 1.6, '#8a8a94');
      g.ellipse(10, 1, 1.6, 1.2, '#a0a0aa');
      g.poly([[5, 5], [0, 15], [3, 15]], '#8a6a5a');
    },
    '💨': (g) => {
      g.ball(10, 8, 4.6, 4.2, '#e8f0f4');
      g.ball(5, 9, 3.4, 3.2, '#d8e4ea');
      g.ball(2.5, 10, 2, 2, '#c8d8e0');
      g.line(0, 4, 6, 4, '#d8e4ea');
      g.line(1, 13, 7, 13, '#d8e4ea');
    },
    '🌑x': null,

    // ===== plantas =====
    '🌲': (g) => {
      g.box(7, 12, 8, 15, '#6a4020');
      g.poly([[8, 0], [13, 6], [3, 6]], '#3a8a35');
      g.poly([[8, 3], [14, 10], [2, 10]], '#2f7a2a');
      g.poly([[8, 6], [15, 13], [1, 13]], '#24621f');
      g.poly([[8, 0], [3, 6], [6, 6]], '#5ab04a');
      g.poly([[8, 3], [2, 10], [5, 10]], '#4a9a3a');
    },
    '🌳': (g) => {
      g.box(7, 10, 9, 15, '#6a4020');
      g.ball(5, 7, 4.4, 4, '#3a8a35');
      g.ball(11, 7, 4.4, 4, '#2f7a2a');
      g.ball(8, 4.5, 5, 4.4, '#4a9a3a');
    },
    '🌿': (g) => {
      g.line(3, 15, 12, 2, '#3a7a2a');
      for (const [x, y, s] of [[5, 11, -1], [7, 8, 1], [9, 6, -1], [10, 4, 1], [6, 12, 1]]) g.ellipse(x + s * 2, y, 2.4, 1.3, s > 0 ? '#5ab04a' : '#4a9a3a');
    },
    '🌸': (g) => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        g.ball(8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 3.2, 3.2, '#ffb0d0');
      }
      g.ellipse(8, 8, 2, 2, '#ff7ab0');
      g.set(8, 8, '#ffe070');
    },
    '🌺': (g) => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        g.ball(8 + Math.cos(a) * 4.2, 8 + Math.sin(a) * 4.2, 3.4, 3.4, '#e83a5a');
      }
      g.ellipse(8, 8, 2, 2, '#a01a3a');
      g.line(8, 8, 12, 4, '#ffd23a');
      g.set(12, 4, '#ffe070');
    },
    '🌼': (g) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.ellipse(8 + Math.cos(a) * 4.5, 8 + Math.sin(a) * 4.5, 2, 2, '#fff8d0');
      }
      g.ball(8, 8, 2.8, 2.8, '#ffc21a');
    },
    '🌷': (g) => {
      g.line(8, 9, 8, 15, '#3a8a2a');
      g.ellipse(5, 12, 2.5, 1.2, '#4a9a3a');
      g.poly([[3, 2], [5.5, 5], [8, 1], [10.5, 5], [13, 2], [13, 7], [11, 10], [5, 10], [3, 7]], '#ff5a8a');
      g.poly([[8, 1], [10.5, 5], [8, 10], [5.5, 5]], '#ff8ab0');
    },
    '🍀': (g) => {
      for (const [x, y] of [[5, 5], [11, 5], [5, 10], [11, 10]]) g.ball(x, y, 3.2, 3.2, '#3aa04a');
      g.line(8, 8, 12, 15, '#2a7a2a');
      g.set(4, 4, '#7ad07a');
      g.set(10, 4, '#7ad07a');
    },
    '🍄': (g) => {
      g.box(6, 9, 10, 15, '#f0e4cc');
      g.ellipse(8, 8, 7.5, 5.5, '#d02a2a');
      g.rect(0, 8, 15, 9, null);
      for (let x = 0; x < 16; x++) for (let y = 9; y < 10; y++) if (x < 6 || x > 10) g.clear(x, y);
      for (const [x, y] of [[4, 5], [8, 3], [11, 6]]) g.ellipse(x, y, 1.2, 1.2, '#fff4e8');
    },
    '🪴': (g) => {
      g.poly([[3, 9], [13, 9], [12, 15], [4, 15]], '#c0683a');
      g.rect(3, 9, 13, 10, '#d8804a');
      g.ellipse(5, 5, 3, 1.6, '#4a9a3a');
      g.ellipse(11, 4, 3, 1.6, '#5ab04a');
      g.ellipse(8, 2, 1.6, 2.6, '#3a8a35');
      g.line(8, 8, 8, 4, '#3a7a2a');
    },
    '🍎': (g) => {
      g.ball(8, 9.5, 6.4, 5.8, '#d82a2a');
      g.line(8, 4, 9, 1, '#6a4020');
      g.ellipse(11, 2.5, 2.4, 1.2, '#4a9a3a');
      g.rect(4, 6, 5, 7, '#ff8a8a');
    },
    '🍙': (g) => {
      g.poly([[8, 1], [15, 13], [1, 13]], '#f4f4f0');
      g.ball(8, 10, 6.6, 4, '#f4f4f0');
      g.box(5, 9, 11, 15, '#1a3a2a');
      g.set(6, 4, '#ffffff');
    },

    // ===== animales =====
    '🦁': (g) => {
      g.ball(8, 8, 7.5, 7.5, '#c06a1a');
      g.ball(8, 8.5, 4.8, 4.8, '#f0b84a');
      g.rect(6, 7, 6, 8, '#2a1a10');
      g.rect(10, 7, 10, 8, '#2a1a10');
      g.rect(7, 10, 9, 10, '#6a3a20');
      g.set(8, 11, '#6a3a20');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.set(Math.round(8 + Math.cos(a) * 7), Math.round(8 + Math.sin(a) * 7), '#e08a2a');
      }
    },
    '🐺': (g) => {
      g.poly([[2, 1], [6, 5], [10, 5], [14, 1], [14, 9], [8, 15], [2, 9]], '#8a8a98');
      g.poly([[5, 9], [11, 9], [8, 15]], '#d8d8e0');
      g.rect(5, 7, 5, 7, '#ffd23a');
      g.rect(11, 7, 11, 7, '#ffd23a');
      g.rect(7, 13, 9, 14, '#2a2a30');
      g.poly([[3, 2], [5, 5], [3, 5]], '#c87a8a');
      g.poly([[13, 2], [11, 5], [13, 5]], '#c87a8a');
    },
    '🐗': (g) => {
      g.ball(8, 8, 6.8, 6, '#6a4a3a');
      g.ball(8, 11, 3.6, 2.6, '#c08a7a');
      g.set(7, 11, '#3a2020');
      g.set(9, 11, '#3a2020');
      g.line(3, 12, 4, 9, '#f0ead8');
      g.line(13, 12, 12, 9, '#f0ead8');
      g.set(5, 6, '#ff3030');
      g.set(11, 6, '#ff3030');
      g.poly([[2, 1], [5, 4], [2, 5]], '#4a3020');
      g.poly([[14, 1], [11, 4], [14, 5]], '#4a3020');
    },
    '🐂': (g) => {
      // toro (emblema de los Toros Negros)
      g.ball(8, 9, 5.6, 6, '#2a2a30');
      g.poly([[3, 6], [0, 3], [0, 0], [2, 3], [5, 5]], '#f0ead8');
      g.poly([[13, 6], [16, 3], [16, 0], [14, 3], [11, 5]], '#f0ead8');
      g.ball(8, 12.5, 3.4, 2.4, '#4a4a54');
      g.set(7, 12, '#1a1a1a');
      g.set(9, 12, '#1a1a1a');
      g.rect(5, 8, 5, 8, '#e03030');
      g.rect(11, 8, 11, 8, '#e03030');
      g.ellipse(8, 14.5, 1.4, 1, '#d8b040'); // argolla
    },
    '🦎': (g) => {
      g.poly([[1, 13], [5, 9], [9, 8], [12, 5], [15, 4], [14, 7], [11, 10], [7, 12]], '#4ab04a');
      g.line(4, 9, 2, 7, '#3a9a3a');
      g.line(9, 11, 8, 14, '#3a9a3a');
      g.line(10, 7, 12, 9, '#3a9a3a');
      g.set(14, 5, '#1a1a1a');
      g.line(5, 11, 11, 7, '#7ad07a');
    },
    '🐍': (g) => {
      // serpiente en S, con panza clara
      let px = null;
      for (let t = 0; t <= 1; t += 0.02) {
        const x = 2 + t * 10;
        const y = 13 - t * 6 + Math.sin(t * Math.PI * 2) * 3;
        g.rect(Math.round(x), Math.round(y), Math.round(x) + 1, Math.round(y) + 1, '#3a9a3a');
        g.set(Math.round(x), Math.round(y) + 1, '#7ad07a');
        px = [x, y];
      }
      g.ball(13, 4, 2.6, 2.2, '#4ab04a');
      g.set(13, 3, '#ffd23a');
      g.line(15, 5, 16, 6, '#e03030');
      g.set(1, 14, '#3a9a3a');
    },
    '🐊': (g) => {
      g.poly([[0, 10], [4, 7], [15, 7], [15, 10], [4, 12]], '#3a7a3a');
      g.rect(8, 9, 15, 9, '#f0ead8');
      for (let x = 9; x <= 14; x += 2) g.set(x, 10, '#f0ead8');
      g.ellipse(6, 6, 1.4, 1.4, '#4a8a4a');
      g.set(6, 6, '#ffd23a');
      for (let x = 1; x <= 6; x += 2) g.set(x, 8, '#2a5a2a');
    },
    '🦅': (g) => {
      g.poly([[0, 6], [5, 4], [8, 7], [11, 4], [16, 6], [11, 9], [8, 12], [5, 9]], '#6a4a2a');
      g.ball(8, 5, 2.2, 2.2, '#f4f4f4');
      g.poly([[9, 5], [11, 6], [9, 7]], '#ffc21a');
      g.set(8, 4, '#1a1a1a');
      g.line(1, 6, 5, 5, '#8a6a4a');
      g.line(15, 6, 11, 5, '#8a6a4a');
    },
    '🐦': (g) => {
      g.ball(7, 9, 5, 4, '#4aa0e0');
      g.ball(11, 6, 3, 3, '#5ab0f0');
      g.poly([[13, 6], [16, 7], [13, 8]], '#ffc21a');
      g.set(12, 5, '#1a1a1a');
      g.poly([[2, 8], [7, 9], [3, 12]], '#3a80c0');
      g.rect(6, 13, 6, 15, '#ffc21a');
      g.rect(9, 13, 9, 15, '#ffc21a');
    },
    '🦡': (g) => {
      g.ball(8, 9, 6.6, 5.6, '#5a5a64');
      g.poly([[5, 4], [8, 15], [11, 4]], '#f4f4f4');
      g.set(5, 8, '#1a1a1a');
      g.set(11, 8, '#1a1a1a');
      g.ellipse(8, 13, 1.4, 1, '#1a1a1a');
    },
    '🦇': (g) => {
      g.poly([[8, 6], [1, 2], [0, 8], [3, 7], [5, 11]], '#3a2a4a');
      g.poly([[8, 6], [15, 2], [16, 8], [13, 7], [11, 11]], '#3a2a4a');
      g.ball(8, 8, 2.8, 3.2, '#4a3a5a');
      g.set(7, 4, '#3a2a4a');
      g.set(9, 4, '#3a2a4a');
      g.set(7, 7, '#ff3030');
      g.set(9, 7, '#ff3030');
    },
    '🐉': (g) => {
      g.poly([[1, 9], [5, 4], [11, 3], [15, 5], [15, 8], [11, 9], [9, 12], [4, 13]], '#3aa04a');
      g.poly([[11, 9], [15, 8], [15, 10], [12, 11]], '#2a8a3a');
      for (const x of [12, 14]) g.set(x, 10, '#f0ead8');
      g.poly([[6, 4], [5, 0], [8, 3]], '#d8b040');
      g.poly([[9, 3], [9, 0], [11, 3]], '#d8b040');
      g.set(11, 5, '#ffd23a');
      g.set(12, 5, '#1a1a1a');
      g.line(2, 10, 8, 6, '#7ad07a');
      g.poly([[15, 7], [16, 6], [16, 9]], '#ff6a1a');
    },

    // ===== personas y caras =====
    '🧙': (g) => {
      g.poly([[8, 0], [12, 7], [4, 7]], '#3a4a8a');
      g.ellipse(8, 7, 7, 1.6, '#3a4a8a');
      g.rect(5, 6, 11, 6, '#ffd23a');
      g.ball(8, 10.5, 3.4, 3, '#f0c8a0');
      g.poly([[4, 11], [12, 11], [10, 16], [6, 16]], '#e8e8f0'); // barba
      g.set(7, 10, '#2a1a10');
      g.set(9, 10, '#2a1a10');
      g.set(10, 2, '#ffd23a');
    },
    '🧚': (g) => {
      g.ellipse(4, 6, 3, 4, '#c0f0ff');
      g.ellipse(12, 6, 3, 4, '#c0f0ff');
      g.ellipse(4, 12, 2.4, 2.6, '#a0e0f0');
      g.ellipse(12, 12, 2.4, 2.6, '#a0e0f0');
      g.ball(8, 5, 2.6, 2.6, '#f8e0c8');
      g.poly([[6, 8], [10, 8], [11, 15], [5, 15]], '#5ad0a0');
      g.rect(6, 2, 10, 3, '#7ae0b0');
      g.set(7, 5, '#1a1a1a');
      g.set(9, 5, '#1a1a1a');
    },
    '🧟': (g) => {
      face(g, '#8aa07a', 'angry');
      g.rect(3, 1, 13, 3, '#3a3a2a');
      g.line(3, 9, 6, 9, '#5a6a4a');
      g.set(11, 4, '#c03030');
    },
    '👼': (g) => {
      g.ellipse(3, 10, 3, 4, '#f4f4f4');
      g.ellipse(13, 10, 3, 4, '#f4f4f4');
      g.ball(8, 9.5, 5, 5, '#f8d8b8');
      g.ellipse(8, 2, 4.5, 1.4, '#ffd23a');
      g.ellipse(8, 2, 2.5, 0.6, null);
      for (let x = 6; x <= 10; x++) g.clear(x, 2);
      g.set(6, 9, '#2a1a10');
      g.set(10, 9, '#2a1a10');
      g.rect(7, 12, 9, 12, '#c06060');
      g.rect(4, 5, 12, 6, '#ffe070');
    },
    '😇': (g) => {
      face(g, '#ffc83a');
      g.ellipse(8, 1.5, 5, 1.4, '#a8e0ff');
      for (let x = 5; x <= 11; x++) g.clear(x, 1);
    },
    '😈': (g) => {
      g.poly([[2, 5], [1, 0], [5, 3]], '#8a3ab0');
      g.poly([[14, 5], [15, 0], [11, 3]], '#8a3ab0');
      face(g, '#a050d0', 'devil');
    },
    '👿': (g) => {
      g.poly([[2, 5], [1, 0], [5, 3]], '#8a3ab0');
      g.poly([[14, 5], [15, 0], [11, 3]], '#8a3ab0');
      face(g, '#a050d0', 'angry');
    },
    '👹': (g) => {
      g.ball(8, 9, 7, 6.5, '#d02a2a');
      g.poly([[3, 4], [2, 0], [6, 3]], '#f0ead8');
      g.poly([[13, 4], [14, 0], [10, 3]], '#f0ead8');
      g.rect(4, 7, 6, 8, '#ffd23a');
      g.rect(10, 7, 12, 8, '#ffd23a');
      g.line(3, 6, 6, 6, '#3a0808');
      g.line(10, 6, 13, 6, '#3a0808');
      g.rect(4, 11, 12, 13, '#3a0808');
      g.poly([[5, 11], [6, 13], [7, 11]], '#f4f4f4');
      g.poly([[9, 11], [10, 13], [11, 11]], '#f4f4f4');
    },
    '💀': (g) => {
      g.ball(8, 7, 6.5, 6, '#f0eadc');
      g.box(5, 11, 11, 14, '#e0d8c8');
      g.ellipse(5.5, 7.5, 1.8, 2, '#2a1a20');
      g.ellipse(10.5, 7.5, 1.8, 2, '#2a1a20');
      g.poly([[8, 9], [9, 11], [7, 11]], '#2a1a20');
      for (const x of [6, 8, 10]) g.rect(x, 13, x, 14, '#8a7a6a');
      g.set(4, 3, '#ffffff');
    },
    '☠': (g) => {
      g.line(1, 13, 15, 3, '#f0eadc');
      g.line(1, 3, 15, 13, '#f0eadc');
      for (const [x, y] of [[1, 13], [15, 3], [1, 3], [15, 13]]) g.ellipse(x, y, 1.4, 1.4, '#f0eadc');
      g.ball(8, 6.5, 5, 4.6, '#f4eee0');
      g.box(6, 9, 10, 11, '#e0d8c8');
      g.ellipse(6, 6.5, 1.3, 1.5, '#2a1a20');
      g.ellipse(10, 6.5, 1.3, 1.5, '#2a1a20');
    },
    '👻': (g) => {
      g.ball(8, 7, 6.2, 6.2, '#f0f0f8', 0.6);
      g.rect(2, 7, 14, 13, '#f0f0f8');
      for (let x = 2; x <= 14; x++) if (x % 3 === 1) g.set(x, 14, '#f0f0f8');
      g.rect(13, 7, 14, 13, '#c8c8d8');
      g.ellipse(5.5, 7, 1.4, 2, '#2a2a3a');
      g.ellipse(10.5, 7, 1.4, 2, '#2a2a3a');
      g.ellipse(8, 11, 1.4, 1.2, '#2a2a3a');
    },
    '🗿': (g) => {
      g.box(4, 1, 12, 15, '#8a8a7a', { top: true, light: 0.2 });
      g.rect(4, 4, 12, 5, '#5a5a4a');
      g.rect(7, 6, 9, 10, '#a0a090');
      g.rect(5, 12, 11, 12, '#5a5a4a');
      g.rect(3, 6, 3, 10, '#7a7a6a');
    },
    '🎭': (g) => {
      g.ball(6, 7, 5, 5.5, '#f4f0e8');
      g.ball(11, 9, 4.6, 5, '#ffd23a');
      g.rect(4, 6, 4, 6, '#2a1a20');
      g.rect(7, 6, 7, 6, '#2a1a20');
      g.line(4, 9, 6, 10, '#2a1a20');
      g.line(8, 9, 6, 10, '#2a1a20');
      g.rect(10, 8, 10, 8, '#2a1a20');
      g.rect(13, 8, 13, 8, '#2a1a20');
      g.line(10, 12, 12, 11, '#2a1a20');
      g.line(14, 12, 12, 11, '#2a1a20');
    },
    '🙏': (g) => {
      // dos manos juntas rezando
      g.poly([[8, 1], [11, 6], [11, 13], [8, 14]], '#e8b080');
      g.poly([[8, 1], [5, 6], [5, 13], [8, 14]], '#f0c090');
      g.line(8, 2, 8, 13, '#b87a4a');
      for (const y of [5, 7, 9]) {
        g.set(6, y, '#d89a68');
        g.set(10, y, '#c88a5a');
      }
      g.rect(4, 13, 12, 15, '#3a6ad0');
      g.rect(4, 13, 12, 13, '#5a8af0');
      g.set(6, 3, '#ffe0c0');
    },
    '🧘': (g) => {
      // persona meditando con las piernas cruzadas
      g.ball(8, 3, 2.6, 2.6, '#f0c090');
      g.rect(6, 1, 10, 1, '#3a2a20');
      g.box(6, 6, 10, 10, '#e07a2a', { light: 0.2 });
      g.line(6, 7, 3, 11, '#f0c090');
      g.line(10, 7, 13, 11, '#f0c090');
      g.ellipse(8, 12.5, 7, 2.2, '#c86020');
      g.ellipse(8, 12, 4, 1, '#e07a2a');
      g.set(3, 11, '#ffd23a');
      g.set(13, 11, '#ffd23a');
      for (let a = 0; a < 6.3; a += 0.35) g.set(Math.round(8 + Math.cos(a) * 7.4), Math.round(7 + Math.sin(a) * 7.4 * 0.95), a % 0.7 < 0.35 ? '#ffe58a' : null);
    },

    // ===== objetos =====
    '❤': (g) => heartShape(g, '#e8303e'),
    '🖤': (g) => heartShape(g, '#2a2430', '#6a6070'),
    '💰': (g) => {
      g.ball(8, 10, 6.4, 5.4, '#c08a3a');
      g.poly([[5, 1], [11, 1], [9, 5], [7, 5]], '#a06a2a');
      g.rect(5, 4, 11, 5, '#7a5020');
      g.ellipse(8, 10.5, 2.4, 2.4, '#ffd23a');
      g.set(7, 9, '#fff0a0');
      g.set(4, 7, '#e0aa5a');
    },
    '👑': (g) => {
      g.box(2, 8, 13, 13, '#e8b830', { top: true, light: 0.35 });
      for (const x of [2, 7.5, 13]) g.poly([[x - 1.5, 9], [x, 2], [x + 1.5, 9]], '#e8b830');
      for (const x of [2, 7.5, 13]) g.ellipse(x, 2, 1.2, 1.2, '#fff0a0');
      g.set(5, 11, '#d02a2a');
      g.set(10, 11, '#3a70e0');
      g.set(7, 11, '#3ac06a');
      g.rect(2, 13, 13, 13, '#a07a10');
    },
    '💍': (g) => {
      g.ellipse(8, 10, 5.5, 5, '#e8b830');
      g.ellipse(8, 10, 3.6, 3.2, null);
      for (let y = 7; y <= 13; y++) for (let x = 5; x <= 11; x++) if ((x + 0.5 - 8) ** 2 / 13 + (y + 0.5 - 10) ** 2 / 10 < 1) g.clear(x, y);
      gemSmall(g, 8, 3, '#7ae0ff');
    },
    '📿': (g) => {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.ellipse(8 + Math.cos(a) * 5.5, 7 + Math.sin(a) * 5.5, 1.3, 1.3, i % 3 ? '#8a5a3a' : '#c0302a');
      }
      g.rect(7, 13, 8, 15, '#c0302a');
    },
    '🎖': (g) => {
      g.poly([[4, 0], [8, 0], [9, 7], [6, 7]], '#c0302a');
      g.poly([[8, 0], [12, 0], [10, 7], [7, 7]], '#3a5ad0');
      g.ball(8, 11, 4, 4, '#e8b830');
      g.poly([[8, 8], [9, 10.5], [11.5, 11], [9.5, 12.5], [10, 15], [8, 13.5], [6, 15], [6.5, 12.5], [4.5, 11], [7, 10.5]], '#fff0a0');
    },
    '🏅': (g) => {
      g.poly([[3, 0], [7, 0], [9, 7], [6, 7]], '#3a5ad0');
      g.poly([[9, 0], [13, 0], [10, 7], [7, 7]], '#c0302a');
      g.ball(8, 11, 4.4, 4.4, '#e8b830');
      g.ellipse(8, 11, 2.2, 2.2, '#c8901a');
      g.set(6, 9, '#fff0a0');
    },
    '🏆': (g) => {
      g.poly([[3, 1], [13, 1], [12, 7], [9, 9], [7, 9], [4, 7]], '#e8b830');
      g.rect(7, 9, 9, 12, '#c8901a');
      g.box(4, 12, 12, 15, '#6a4a2a', { top: true });
      g.ellipse(2, 4, 2, 2.6, null);
      for (const x of [1, 14]) g.rect(x, 2, x, 5, '#e8b830');
      g.rect(4, 2, 5, 6, '#fff0a0');
    },
    '📕': (g) => book(g, '#b02a2a', (gg) => cloverEmblem(gg, '#ffd23a')),
    '📖': (g) => {
      g.poly([[0, 3], [7, 2], [8, 4], [9, 2], [16, 3], [16, 14], [9, 13], [8, 15], [7, 13], [0, 14]], '#6a3a20');
      g.poly([[1, 3], [7.5, 3], [7.5, 13], [1, 13]], '#f4ead0');
      g.poly([[8.5, 3], [15, 3], [15, 13], [8.5, 13]], '#ece0c0');
      for (const y of [5, 7, 9, 11]) {
        g.line(2, y, 6, y, '#a89878');
        g.line(10, y, 14, y, '#a89878');
      }
      g.line(8, 3, 8, 14, '#c8b890');
    },
    '📜': (g) => {
      g.box(3, 3, 12, 13, '#f0e0b8', { light: 0.1 });
      g.ellipse(3, 3, 2, 2, '#d8c498');
      g.ellipse(12, 13, 2, 2, '#d8c498');
      g.rect(1, 2, 12, 2, '#d8c498');
      g.rect(3, 14, 14, 14, '#c8b488');
      for (const y of [5, 7, 9, 11]) g.line(5, y, 10, y, '#8a7a5a');
      g.ellipse(10, 12, 1.4, 1.4, '#c0302a');
    },
    '🧥': (g) => {
      g.poly([[3, 2], [6, 1], [8, 4], [10, 1], [13, 2], [15, 13], [12, 13], [12, 15], [4, 15], [4, 13], [1, 13]], '#2a2a34');
      g.poly([[6, 1], [8, 4], [8, 15], [6, 15], [5, 4]], '#3a3a48');
      g.line(8, 4, 8, 15, '#d8b040');
      g.set(7, 7, '#d8b040');
      g.set(7, 10, '#d8b040');
    },
    '👗': (g) => {
      g.poly([[5, 0], [7, 0], [8, 2], [9, 0], [11, 0], [11, 5], [15, 15], [1, 15], [5, 5]], '#d04a8a');
      g.rect(5, 5, 11, 6, '#ffd23a');
      g.poly([[5, 6], [8, 6], [6, 15], [1, 15]], '#e06aa0');
    },
    '👢': (g) => {
      g.poly([[4, 0], [10, 0], [10, 9], [15, 11], [15, 15], [3, 15], [4, 9]], '#7a4a2a');
      g.rect(3, 14, 15, 15, '#3a2010');
      g.rect(4, 0, 10, 1, '#a06a3a');
      g.rect(5, 2, 5, 10, '#9a6a3a');
    },
    '👟': (g) => {
      // bota con alitas (velocidad)
      g.poly([[3, 3], [9, 3], [9, 9], [15, 11], [15, 15], [2, 15], [3, 9]], '#e8e8f0');
      g.rect(2, 14, 15, 15, '#5a5a6a');
      g.rect(3, 3, 9, 4, '#c03030');
      g.poly([[1, 6], [3, 5], [3, 9], [0, 8]], '#ffffff');
      g.poly([[0, 3], [3, 4], [2, 6]], '#f0f0ff');
      g.rect(10, 11, 13, 11, '#c03030');
    },
    '🚬': (g) => {
      g.rect(1, 9, 11, 11, '#f4f0e8');
      g.rect(1, 9, 4, 11, '#e0a050');
      g.rect(12, 9, 13, 11, '#ff6a1a');
      g.set(13, 9, '#ffd23a');
      g.line(14, 7, 13, 4, '#b0b0ba');
      g.line(13, 4, 15, 1, '#c8c8d0');
    },
    '🧵': (g) => {
      g.box(4, 0, 12, 2, '#c8a070', { top: true });
      g.box(4, 13, 12, 15, '#c8a070', { top: true });
      g.box(5, 3, 11, 12, '#d02a5a', { light: 0.3 });
      for (const y of [4, 6, 8, 10]) g.line(5, y, 11, y + 1, '#a01a40');
      g.line(11, 8, 15, 12, '#d02a5a');
    },
    '🪞': (g) => {
      g.ellipse(8, 6.5, 5.5, 6, '#d8b040');
      g.ellipse(8, 6.5, 4, 4.6, '#a8d8f0');
      g.line(5, 4, 7, 2, '#ffffff');
      g.rect(7, 12, 8, 15, '#d8b040');
    },
    '🚪': (g) => {
      g.box(3, 0, 13, 15, '#8a5a2a', { top: true, light: 0.2 });
      g.rect(4, 1, 12, 1, '#a06a3a');
      for (const y of [3, 9]) g.box(5, y, 11, y + 4, '#7a4a20', { light: 0.15 });
      g.ellipse(11, 8, 1, 1, '#ffd23a');
    },
    '🏛': (g) => {
      g.poly([[8, 0], [16, 4], [0, 4]], '#e8e0c8');
      g.rect(1, 4, 15, 5, '#d8d0b8');
      for (const x of [2, 6, 10, 13]) g.box(x, 6, x + 1, 13, '#f0e8d0', { light: 0.2 });
      g.box(0, 13, 15, 15, '#d8d0b8', { top: true });
    },
    '🏰': (g) => {
      g.box(2, 5, 13, 15, '#9a9aa8', { light: 0.2 });
      for (const x of [2, 5, 8, 11]) g.rect(x, 3, x + 1, 5, '#9a9aa8');
      g.box(6, 0, 9, 5, '#b0b0c0');
      g.poly([[5.5, 0], [7.5, -3], [9.5, 0]], '#c0302a');
      g.rect(6, 10, 9, 15, '#3a2a20');
      g.ellipse(7.5, 10, 1.6, 1.4, '#3a2a20');
      g.rect(3, 7, 4, 8, '#3a3a48');
      g.rect(11, 7, 12, 8, '#3a3a48');
      g.poly([[8, 0], [8, 3], [12, 1.5]], '#c0302a');
    },
    '🏚': (g) => {
      g.poly([[8, 1], [15, 7], [1, 7]], '#6a4a3a');
      g.box(2, 7, 13, 15, '#9a8a7a');
      g.rect(5, 10, 8, 15, '#3a2a20');
      g.line(10, 9, 12, 12, '#5a4a3a');
      g.rect(10, 2, 10, 4, null);
      g.clear(10, 3);
      g.clear(11, 4);
    },
    '⛪': (g) => {
      g.box(3, 7, 13, 15, '#e8e0d0', { light: 0.15 });
      g.poly([[2, 8], [8, 3], [14, 8]], '#8a3a3a');
      g.rect(7, 0, 8, 4, '#d8b040');
      g.rect(6, 1, 9, 1, '#d8b040');
      g.rect(7, 11, 9, 15, '#6a4a2a');
      g.ellipse(8, 9, 1.4, 1.2, '#7ac0f0');
    },
    '⛲': (g) => {
      g.ellipse(8, 13, 7.5, 2.4, '#9a9aa8');
      g.ellipse(8, 12.5, 6, 1.4, '#4aa8f0');
      g.rect(7, 6, 9, 12, '#b0b0c0');
      g.ellipse(8, 6, 4, 1.4, '#9a9aa8');
      g.line(8, 5, 8, 1, '#8ad0ff');
      g.line(8, 1, 4, 5, '#8ad0ff');
      g.line(8, 1, 12, 5, '#8ad0ff');
    },
    '🪦': (g) => {
      g.box(3, 4, 12, 15, '#9a9aa8', { light: 0.25 });
      g.ellipse(7.5, 4.5, 4.5, 3.6, '#9a9aa8');
      g.rect(7, 6, 8, 12, '#5a5a68');
      g.rect(5, 8, 10, 9, '#5a5a68');
      g.rect(1, 15, 14, 15, '#3a5a2a');
    },
    '🕯': (g) => {
      g.box(5, 6, 10, 15, '#f4ecdc', { light: 0.1 });
      g.rect(9, 6, 9, 10, '#e0d4bc');
      g.ellipse(7.5, 3, 1.8, 3, '#ffb030');
      g.set(7, 3, '#fff6c0');
      g.set(7, 5, '#2a1a10');
    },
    '⏳': (g) => {
      g.rect(2, 0, 13, 1, '#8a5a2a');
      g.rect(2, 14, 13, 15, '#8a5a2a');
      g.poly([[3, 2], [12, 2], [8, 8], [12, 13], [3, 13], [7, 8]], '#d8ecf4');
      g.poly([[4, 3], [11, 3], [8, 7]], '#f0c060');
      g.poly([[5, 13], [10, 13], [7.5, 10]], '#f0c060');
      g.line(7, 8, 7, 12, '#f0c060');
    },
    '⌛': (g) => {
      g.rect(2, 0, 13, 1, '#8a5a2a');
      g.rect(2, 14, 13, 15, '#8a5a2a');
      g.poly([[3, 2], [12, 2], [8, 8], [12, 13], [3, 13], [7, 8]], '#d8ecf4');
      g.poly([[4, 13], [11, 13], [7.5, 9]], '#f0c060');
    },
    '⏱': (g) => {
      g.rect(6, 0, 9, 1, '#9a9aa8');
      g.rect(7, 1, 8, 2, '#9a9aa8');
      g.ball(8, 9, 6.5, 6.5, '#9a9aa8');
      g.ellipse(8, 9, 5, 5, '#f4f4f8');
      g.line(8, 9, 8, 5, '#2a2a30');
      g.line(8, 9, 11, 10, '#c03030');
    },
    '⚙': (g) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.ellipse(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 1.6, 1.6, '#8a8a94');
      }
      g.ball(8, 8, 5.4, 5.4, '#9a9aa4');
      g.ellipse(8, 8, 2, 2, '#4a4a54');
    },
    '🎲': (g) => {
      g.poly([[8, 1], [15, 4], [8, 7], [1, 4]], '#f8f8f8');
      g.poly([[1, 4], [8, 7], [8, 15], [1, 11]], '#e0e0e8');
      g.poly([[15, 4], [8, 7], [8, 15], [15, 11]], '#c8c8d4');
      g.set(8, 4, '#c03030');
      for (const [x, y] of [[3, 7], [5, 10], [11, 7], [13, 10], [12, 9]]) g.set(x, y, '#2a2a30');
    },
    '🎁': (g) => {
      g.box(2, 6, 13, 15, '#d03a5a', { light: 0.25 });
      g.box(1, 4, 14, 6, '#e04a6a', { top: true });
      g.rect(7, 4, 8, 15, '#ffd23a');
      g.ellipse(5, 2.5, 2.6, 1.6, '#ffd23a');
      g.ellipse(10, 2.5, 2.6, 1.6, '#ffd23a');
    },
    '🧪': (g) => {
      g.rect(6, 0, 9, 4, '#c8e0f0');
      g.rect(5, 0, 10, 0, '#8a5a2a');
      g.ball(7.5, 10.5, 5.6, 5, '#c8e0f0');
      g.ellipse(7.5, 11.5, 4.4, 3.4, '#5ad06a');
      g.set(5, 10, '#c0ffc0');
      g.set(9, 12, '#a0f0b0');
    },
    '🧺': (g) => {
      g.ellipse(8, 5, 6, 4, '#a87038');
      g.ellipse(8, 5, 4.5, 3, null);
      for (let y = 2; y <= 7; y++) for (let x = 4; x <= 12; x++) if ((x + 0.5 - 8) ** 2 / 20 + (y + 0.5 - 5) ** 2 / 9 < 1) g.clear(x, y);
      g.poly([[1, 7], [15, 7], [13, 15], [3, 15]], '#c08a4a');
      for (let x = 3; x <= 13; x += 2) g.line(x, 8, x, 14, '#a06a30');
      g.rect(1, 7, 15, 8, '#d8a060');
    },
    '☂': (g) => {
      g.poly([[0, 8], [3, 3], [8, 1], [13, 3], [16, 8]], '#c03a8a');
      g.poly([[5, 2], [8, 1], [9, 8], [6, 8]], '#e05aa8');
      g.line(8, 8, 8, 14, '#6a4a2a');
      g.line(8, 14, 6, 15, '#6a4a2a');
      g.set(5, 14, '#6a4a2a');
    },
    '📍': (g) => {
      g.ball(8, 5, 4.6, 4.6, '#e03030');
      g.line(8, 9, 8, 15, '#9a9aa8');
      g.set(6, 3, '#ff9a9a');
    },
    '🗺': (g) => {
      g.poly([[0, 2], [5, 0], [10, 2], [16, 0], [16, 14], [10, 16], [5, 14], [0, 16]], '#e8d8a8');
      g.poly([[5, 0], [10, 2], [10, 16], [5, 14]], '#d8c890');
      g.line(2, 12, 7, 6, '#c03030');
      g.line(7, 6, 13, 9, '#c03030');
      g.ellipse(12, 4, 2, 1.4, '#6ab06a');
    },
    '🛒': (g) => {
      g.line(0, 2, 3, 2, '#9a9aa8');
      g.poly([[3, 3], [15, 4], [13, 10], [5, 10]], '#c0c0cc');
      for (const x of [6, 9, 12]) g.line(x, 4, x, 9, '#8a8a98');
      g.line(5, 10, 6, 12, '#9a9aa8');
      g.rect(5, 12, 14, 12, '#9a9aa8');
      g.ellipse(6, 14, 1.4, 1.4, '#3a3a48');
      g.ellipse(13, 14, 1.4, 1.4, '#3a3a48');
    },
    '❓': (g) => {
      const b = '#e03a3a';
      g.rect(4, 1, 11, 3, b);
      g.rect(3, 2, 5, 6, b);
      g.rect(10, 2, 12, 8, b);
      g.rect(7, 8, 11, 9, b);
      g.rect(7, 9, 9, 11, b);
      g.rect(7, 13, 9, 15, b);
      g.rect(5, 1, 8, 1, '#ff8a8a');
    },
    '❔': (g) => {
      const b = '#e8e8f0';
      g.rect(4, 1, 11, 3, b);
      g.rect(3, 2, 5, 6, b);
      g.rect(10, 2, 12, 8, b);
      g.rect(7, 8, 11, 9, b);
      g.rect(7, 9, 9, 11, b);
      g.rect(7, 13, 9, 15, b);
    },
    '✝': (g) => {
      g.box(6, 0, 9, 15, '#e8c860', { light: 0.35 });
      g.box(2, 4, 13, 7, '#e8c860', { top: true, light: 0.35 });
    },
    '🔄': (g) => {
      for (let a = 0.3; a < Math.PI - 0.2; a += 0.08) g.set(Math.round(8 + Math.cos(a + Math.PI) * 6), Math.round(8 + Math.sin(a + Math.PI) * 6), '#3a90e0');
      for (let a = 0.3; a < Math.PI - 0.2; a += 0.08) g.set(Math.round(8 + Math.cos(a) * 6), Math.round(8 + Math.sin(a) * 6), '#3a90e0');
      g.poly([[12, 1], [15, 6], [10, 5]], '#3a90e0');
      g.poly([[4, 15], [1, 10], [6, 11]], '#3a90e0');
    },
    '⬆': (g) => {
      g.poly([[8, 0], [15, 8], [11, 8], [11, 15], [5, 15], [5, 8], [1, 8]], '#4ac04a');
      g.poly([[8, 0], [1, 8], [5, 8], [5, 15], [7, 15], [7, 4]], '#7ae07a');
    },
    '🔒': (g) => {
      g.ellipse(8, 5, 4.5, 4.5, '#9a9aa8');
      g.ellipse(8, 5, 2.6, 2.6, null);
      for (let y = 3; y <= 7; y++) for (let x = 6; x <= 10; x++) g.clear(x, y);
      g.box(2, 7, 13, 15, '#e8b830', { top: true, light: 0.3 });
      g.rect(7, 10, 8, 12, '#5a4010');
    },
    '🔓': (g) => {
      g.ellipse(11, 4, 4, 4, '#9a9aa8');
      for (let y = 2; y <= 7; y++) for (let x = 9; x <= 13; x++) g.clear(x, y);
      g.rect(14, 4, 15, 7, null);
      g.box(1, 7, 12, 15, '#e8b830', { top: true, light: 0.3 });
      g.rect(6, 10, 7, 12, '#5a4010');
    },
    '📊': (g) => {
      g.box(0, 0, 15, 15, '#f4f4f8', { light: 0 });
      g.box(2, 9, 4, 14, '#3a90e0');
      g.box(6, 4, 8, 14, '#e05a3a');
      g.box(10, 7, 12, 14, '#4ac04a');
    },
    '🔊': (g) => {
      g.rect(1, 5, 4, 10, '#9a9aa8');
      g.poly([[4, 5], [9, 1], [9, 14], [4, 10]], '#c0c0cc');
      for (const r of [3, 5]) for (let a = -0.9; a <= 0.9; a += 0.15) g.set(Math.round(9 + Math.cos(a) * r), Math.round(7.5 + Math.sin(a) * r), '#e8e8f0');
    },
    '🔇': (g) => {
      g.rect(1, 5, 4, 10, '#9a9aa8');
      g.poly([[4, 5], [9, 1], [9, 14], [4, 10]], '#c0c0cc');
      g.line(11, 5, 15, 10, '#e03030');
      g.line(15, 5, 11, 10, '#e03030');
    },
    '🎨': (g) => {
      g.ball(8, 8, 7, 6.4, '#e8c890');
      g.ellipse(10, 11, 1.8, 1.8, null);
      for (let y = 9; y <= 13; y++) for (let x = 8; x <= 12; x++) if ((x + 0.5 - 10.5) ** 2 + (y + 0.5 - 11.5) ** 2 < 4) g.clear(x, y);
      for (const [x, y, c] of [[4, 6, '#e03030'], [7, 3, '#ffd23a'], [11, 4, '#3a90e0'], [4, 10, '#4ac04a']]) g.ellipse(x, y, 1.4, 1.4, c);
    },
    '👾': (g) => {
      const rows = ['..x.....x..', '...x...x...', '..xxxxxxx..', '.xx.xxx.xx.', 'xxxxxxxxxxx', 'x.xxxxxxx.x', 'x.x.....x.x', '...xx.xx...'];
      g.stamp(rows, 2, 4, { x: '#8a5ae0' });
    },
    '📱': (g) => {
      g.box(4, 0, 11, 15, '#3a3a48', { top: true });
      g.rect(5, 2, 10, 12, '#6ab0f0');
      g.rect(5, 2, 10, 3, '#a0d0ff');
      g.set(7, 14, '#8a8a98');
      g.set(8, 14, '#8a8a98');
    },
    '👁': (g) => {
      g.poly([[0, 8], [4, 4], [12, 4], [16, 8], [12, 12], [4, 12]], '#f4f4f8');
      g.ball(8, 8, 3.6, 3.6, '#4a8ad0');
      g.ellipse(8, 8, 1.6, 1.6, '#1a1a2a');
      g.set(7, 6, '#ffffff');
    },
    '♾': (g) => {
      // infinito dorado
      for (let t = 0; t < Math.PI * 2; t += 0.04) {
        const x = 8 + Math.sin(t) * 6.5;
        const y = 8 + Math.sin(t) * Math.cos(t) * 4.5;
        g.rect(Math.round(x), Math.round(y), Math.round(x), Math.round(y) + 1, t < Math.PI ? '#ffd23a' : '#e8a820');
      }
      g.set(4, 6, '#fff0a0');
    },
    '⚠': (g) => {
      g.poly([[8, 0], [16, 15], [0, 15]], '#ffc21a');
      g.rect(7, 5, 8, 10, '#2a2a30');
      g.rect(7, 12, 8, 13, '#2a2a30');
    },
  };
  // la cara de los emojis de cara con aureola usa una gema chica
  function gemSmall(g, x, y, c) {
    g.poly([[x, y - 3], [x + 3, y], [x, y + 3], [x - 3, y]], c);
    g.poly([[x, y - 3], [x - 3, y], [x, y]], shade(c, 0.4));
    g.set(x - 1, y - 1, '#ffffff');
  }
  delete D['🌑x'];

  // ---------- armado de las imágenes ----------
  const strip = (e) => e.replace(/️/g, '');
  const cache = new Map();
  function canvas(emoji) {
    const k = strip(emoji);
    if (cache.has(k)) return cache.get(k);
    const draw = D[k];
    let c = null;
    if (draw) {
      const inner = new G(16, 16);
      // los rect(…, null) no pintan nada: se usan como "no dibujar"
      draw(inner);
      const g = new G(18, 18);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g.set(x + 1, y + 1, inner.get(x, y));
      g.outlineSel('#120c14', 0.8);
      c = g.toCanvas();
    }
    cache.set(k, c);
    return c;
  }
  const urls = new Map();
  function url(emoji) {
    const k = strip(emoji);
    if (!urls.has(k)) {
      const c = canvas(k);
      urls.set(k, c ? c.toDataURL() : null);
    }
    return urls.get(k);
  }
  function has(emoji) {
    return !!D[strip(emoji)];
  }

  // emojis (con sus variantes) que aparecen en un texto
  const RE = /(?:\p{Extended_Pictographic}|[☀-➿⬆])️?/gu;
  // estos se dejan como letra (son adornos tipográficos, no emojis)
  const KEEP = new Set(['✦', '❦', '☘', '▶', '✔', '←', '→']);

  // Cambia los emojis del texto de un elemento por imágenes en pixel art
  function replaceIn(el) {
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const t = n.nodeValue;
      RE.lastIndex = 0;
      if (!RE.test(t)) continue;
      RE.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0;
      let changed = false;
      for (const m of t.matchAll(RE)) {
        const e = m[0];
        if (KEEP.has(strip(e)) || !has(e)) continue;
        if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
        const img = document.createElement('img');
        img.className = 'pxi';
        img.alt = e;
        img.src = url(e);
        frag.appendChild(img);
        last = m.index + e.length;
        changed = true;
      }
      if (!changed) continue;
      if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
      n.parentNode.replaceChild(frag, n);
    }
  }

  BC.PixelIcons = { has, canvas, url, replaceIn, RE, KEEP, strip, list: () => Object.keys(D) };
})(typeof window !== 'undefined' ? window : globalThis);
