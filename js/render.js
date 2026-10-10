/*
 * Dibujo del juego en el <canvas>. Todo con formas y emojis generados por código.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});
  const TAU = Math.PI * 2;

  // ---------- caché de emojis (dibujar emojis es lento; los guardamos como imagen) ----------
  const emojiCache = new Map();
  function emojiSprite(emoji, size) {
    const s = Math.max(8, Math.round(size));
    const key = emoji + '|' + s;
    let c = emojiCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(s * 1.4);
    const x = c.getContext('2d');
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = s + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    x.fillText(emoji, c.width / 2, c.height / 2 + s * 0.06);
    emojiCache.set(key, c);
    return c;
  }
  function drawEmoji(ctx, emoji, x, y, size, alpha) {
    const c = emojiSprite(emoji, size);
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(c, x - c.width / 2, y - c.height / 2);
    if (alpha !== undefined) ctx.globalAlpha = 1;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Estilo de los textos y barras: clásico o pixel (lo cambia Renderer.setPixel)
  const STYLE = { pixel: false, font: '"Segoe UI",system-ui,sans-serif' };
  const PIXEL_FONT = '"Pixelify Sans","Silkscreen","Courier New",monospace';

  function bar(ctx, x, y, w, h, ratio, color, bg) {
    if (STYLE.pixel) {
      // barra de bordes rectos con marco, estilo consola vieja
      const r = Math.max(0, Math.min(1, ratio));
      ctx.fillStyle = '#0a0810';
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.fillStyle = bg && bg !== 'rgba(0,0,0,0)' ? bg : '#2a2433';
      if (bg !== 'rgba(0,0,0,0)') ctx.fillRect(x, y, w, h);
      if (r > 0) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, Math.round(w * r), h);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x, y, Math.round(w * r), Math.max(1, Math.floor(h / 4)));
      }
      return;
    }
    ctx.fillStyle = bg || 'rgba(0,0,0,0.55)';
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    const r = Math.max(0, Math.min(1, ratio));
    if (r > 0) {
      ctx.fillStyle = color;
      roundRect(ctx, x, y, Math.max(h, w * r), h, h / 2);
      ctx.fill();
    }
  }

  function text(ctx, str, x, y, size, color, align, weight, stroke) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + STYLE.font;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    if (stroke) {
      ctx.lineWidth = Math.max(3, size / 5);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color || '#fff';
    ctx.fillText(str, x, y);
  }

  // color de la barra de definitiva de cada personaje
  const ULT_COLORS = { asta: '#9b1c1c', yuno: '#2fbf9a', noelle: '#8fd3ff', mago: '#c9a64a' };

  class Renderer {
    constructor(canvas, game) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.game = game;
      this.bgCache = null;
      this.bgKey = null;
      this.scale = 1;
    }

    resize(scale, dpr) {
      const d = this.game.data.config;
      this.scale = scale;
      this.dpr = dpr;
      this.canvas.width = Math.round(d.width * scale * dpr);
      this.canvas.height = Math.round(d.height * scale * dpr);
      this.canvas.style.width = Math.round(d.width * scale) + 'px';
      this.canvas.style.height = Math.round(d.height * scale) + 'px';
    }

    // true = pixel art (el mundo se dibuja en baja resolución); false = clásico
    setPixel(on) {
      this.pixel = !!on && !!BC.Pixel;
      STYLE.pixel = this.pixel;
      STYLE.font = this.pixel ? PIXEL_FONT : '"Segoe UI",system-ui,sans-serif';
      this.bgKey = null;
      this.pxBgKey = null;
    }

    draw() {
      const g = this.game;
      const ctx = this.ctx;
      const d = g.data.config;
      ctx.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, 0, 0);
      if (!g.run || !g.room) {
        this.drawIdle();
        return;
      }
      const realm = g.data.realms[g.room.node.realm];
      if (this.pixel) {
        this.drawPixelFrame(realm);
        return;
      }
      ctx.save();
      if (g.shakeAmt > 0) ctx.translate((Math.random() - 0.5) * g.shakeAmt, (Math.random() - 0.5) * g.shakeAmt);
      this.drawBackground(realm);
      this.drawDoors(realm);
      this.drawZones(false);
      this.drawSpawns();
      this.drawPickups();
      this.drawNpc();
      this.drawEnemies();
      this.drawPlayer();
      this.drawZones(true);
      this.drawProjectiles();
      this.drawEffects();
      this.drawParticles();
      this.drawTexts();
      ctx.restore();
      this.drawVignette();
      this.drawHud(realm);
      this.drawBossBar();
      this.drawBanner();
      this.drawToasts();
      // fundido al entrar a una sala
      if (g.room.time < 0.35) {
        ctx.fillStyle = 'rgba(0,0,0,' + (1 - g.room.time / 0.35) + ')';
        ctx.fillRect(0, 0, d.width, d.height);
      }
    }

    drawIdle() {
      const ctx = this.ctx;
      const d = this.game.data.config;
      const t = performance.now() / 1000;
      // fondo animado en pixel art (js/menuscene.js)
      if (BC.MenuScene && BC.MenuScene.draw(ctx, t, d)) return;
      const grd = ctx.createRadialGradient(d.width / 2, d.height / 2, 50, d.width / 2, d.height / 2, 800);
      grd.addColorStop(0, '#1d1428');
      grd.addColorStop(1, '#05030a');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, d.width, d.height);
      // tréboles flotando
      for (let i = 0; i < 18; i++) {
        const x = ((i * 173 + t * (10 + (i % 5) * 4)) % (d.width + 100)) - 50;
        const y = (i * 97) % d.height + Math.sin(t + i) * 12;
        drawEmoji(ctx, i % 6 === 0 ? '🍀' : '☘️', x, y, 18 + (i % 4) * 6, 0.12);
      }
    }

    // ---------- fondo (se cachea por sala) ----------
    drawBackground(realm) {
      const g = this.game;
      const key = g.room.node.id + ':' + g.run.seed;
      if (this.bgKey !== key) {
        this.bgKey = key;
        this.bgCache = this.buildBackground(realm);
      }
      this.ctx.drawImage(this.bgCache, 0, 0, g.data.config.width, g.data.config.height);
    }

    buildBackground(realm) {
      const g = this.game;
      const d = g.data.config;
      const b = g.bounds;
      const pal = realm.palette;
      const c = document.createElement('canvas');
      c.width = d.width;
      c.height = d.height;
      const x = c.getContext('2d');
      x.fillStyle = pal.wall;
      x.fillRect(0, 0, d.width, d.height);
      x.fillStyle = pal.floor;
      x.fillRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
      const T = 48;
      for (let ty = b.y1; ty < b.y2; ty += T) {
        for (let tx = b.x1; tx < b.x2; tx += T) {
          if (((tx - b.x1) / T + (ty - b.y1) / T) % 2 === 0) {
            x.fillStyle = pal.floor2;
            x.fillRect(tx, ty, Math.min(T, b.x2 - tx), Math.min(T, b.y2 - ty));
          }
        }
      }
      for (const dc of g.room.decos) drawEmoji(x, dc.icon, dc.x, dc.y, dc.s, dc.a);
      // sombra interior
      const grd = x.createRadialGradient(d.width / 2, d.height / 2, 200, d.width / 2, d.height / 2, 760);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.45)');
      x.fillStyle = grd;
      x.fillRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
      // borde
      x.strokeStyle = pal.accent;
      x.globalAlpha = 0.35;
      x.lineWidth = 3;
      x.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
      x.globalAlpha = 1;
      return c;
    }

    drawDoors(realm) {
      const g = this.game;
      const ctx = this.ctx;
      const t = g.time;
      for (const dr of g.room.doors) {
        const rd = g.data.rooms[dr.node.type];
        const pulse = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.save();
        ctx.shadowColor = rd.color;
        ctx.shadowBlur = 18 + pulse * 12;
        ctx.fillStyle = '#0b0b10';
        roundRect(ctx, dr.x - dr.w / 2, dr.y - dr.h / 2, dr.w, dr.h, 12);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = rd.color;
        ctx.lineWidth = 3;
        roundRect(ctx, dr.x - dr.w / 2, dr.y - dr.h / 2, dr.w, dr.h, 12);
        ctx.stroke();
        drawEmoji(ctx, rd.icon, dr.x, dr.y - 6, 30);
        const label = dr.nextRealm ? '→ ' + g.data.realms[dr.node.realm].name : rd.name;
        text(ctx, label, dr.x, dr.y + dr.h / 2 + 14, 14, '#fff', 'center', 'bold', true);
      }
      if (g.room.doors.length) {
        text(ctx, 'Elegí una puerta y caminá hacia ella', g.data.config.width / 2, g.bounds.y1 + 112, 15, 'rgba(255,255,255,0.75)', 'center', 'bold', true);
      }
    }

    drawNpc() {
      const g = this.game;
      const n = g.room.npc;
      if (!n) return;
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(n.x, n.y + 26, 30, 10, 0, 0, TAU);
      ctx.fill();
      drawEmoji(ctx, n.icon, n.x, n.y + Math.sin(g.time * 2) * 4, 52);
    }

    drawSpawns() {
      const g = this.game;
      const ctx = this.ctx;
      for (const s of g.room.spawns) {
        const def = g.data.enemies[s.id] || g.data.bosses[s.id];
        const r = def.radius || 15;
        const k = 1 - s.t / (s.total || 0.8);
        ctx.strokeStyle = def.boss ? '#ff3030' : 'rgba(255,80,80,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 14 * (1 - k), 0, TAU);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,60,60,' + 0.25 * k + ')';
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, TAU);
        ctx.fill();
        drawEmoji(ctx, def.icon, s.x, s.y, r * 1.2, 0.3 + 0.5 * k);
      }
    }

    drawPickups() {
      const g = this.game;
      const ctx = this.ctx;
      for (const k of g.room.pickups) {
        const bob = Math.sin((g.time + k.uid) * 6) * 2;
        if (k.kind === 'yul') {
          ctx.fillStyle = '#ffd23a';
          ctx.strokeStyle = '#a07400';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(k.x, k.y + bob, 5 + Math.min(3, k.value / 3), 0, TAU);
          ctx.fill();
          ctx.stroke();
        } else if (k.kind === 'chest') {
          // brillo dorado alrededor del cofre
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.2 * Math.sin(g.time * 5);
          ctx.fillStyle = '#ffd76a';
          ctx.beginPath();
          ctx.arc(k.x, k.y + bob, 20, 0, TAU);
          ctx.fill();
          ctx.restore();
          drawEmoji(ctx, '🎁', k.x, k.y + bob, 24);
        } else drawEmoji(ctx, '❤️', k.x, k.y + bob, 18);
      }
    }

    // ---------- zonas ----------
    drawZones(top) {
      const g = this.game;
      const ctx = this.ctx;
      for (const z of g.room.zones) {
        const isTop = z.kind === 'beam' || z.kind === 'tornado';
        if (isTop !== top) continue;
        switch (z.kind) {
          case 'tornado': {
            const a = 1 - Math.max(0, (z.t - z.duration + 0.4) / 0.4);
            ctx.save();
            ctx.globalAlpha = 0.65 * a;
            for (let i = 0; i < 3; i++) {
              ctx.strokeStyle = i === 1 ? '#c4fff0' : '#7fe0c8';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(z.x, z.y, z.r * (0.4 + i * 0.25), z.t * (6 + i * 2), z.t * (6 + i * 2) + 4.2);
              ctx.stroke();
            }
            ctx.globalAlpha = 0.15 * a;
            ctx.fillStyle = '#7fe0c8';
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.r, 0, TAU);
            ctx.fill();
            ctx.restore();
            break;
          }
          case 'field': {
            const a = Math.min(1, z.t * 5) * (1 - Math.max(0, (z.t - z.duration + 0.4) / 0.4));
            ctx.save();
            ctx.globalAlpha = 0.25 * a;
            ctx.fillStyle = z.color || '#888';
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.r, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 0.8 * a;
            ctx.strokeStyle = z.color || '#888';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.r, z.t, z.t + TAU);
            ctx.stroke();
            ctx.setLineDash([]);
            if (z.icon) {
              for (let i = 0; i < 4; i++) {
                const ang = z.t * 1.5 + (i / 4) * TAU;
                drawEmoji(ctx, z.icon, z.x + Math.cos(ang) * z.r * 0.55, z.y + Math.sin(ang) * z.r * 0.55, 16, a * 0.9);
              }
            }
            ctx.restore();
            break;
          }
          case 'dome': {
            const a = Math.min(1, z.t * 4) * (1 - Math.max(0, (z.t - z.duration + 0.4) / 0.4));
            ctx.save();
            ctx.globalAlpha = 0.22 * a;
            ctx.fillStyle = z.color || '#5ec8ff';
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.r, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 0.7 * a;
            ctx.strokeStyle = z.color || '#bfe9ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.r + Math.sin(z.t * 6) * 3, 0, TAU);
            ctx.stroke();
            ctx.restore();
            break;
          }
          case 'beam': {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = z.color || '#5ec8ff';
            ctx.lineWidth = z.width;
            ctx.beginPath();
            ctx.moveTo(z.x, z.y);
            ctx.lineTo(z.x2 || z.x, z.y2 || z.y);
            ctx.stroke();
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = '#e8f6ff';
            ctx.lineWidth = z.width * 0.35;
            ctx.stroke();
            ctx.restore();
            if (z.x2) drawEmoji(ctx, z.icon || '🐉', z.x2, z.y2, 34);
            break;
          }
          case 'shockwave': {
            ctx.strokeStyle = z.color || '#5ec8ff';
            ctx.globalAlpha = 1 - z.radius / z.maxRadius;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(z.x, z.y, Math.max(1, z.radius), 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 1;
            break;
          }
          case 'slam': {
            if (z.t < z.delay) {
              const k = z.t / z.delay;
              ctx.globalAlpha = 0.35 * k;
              ctx.fillStyle = z.color || '#000';
              ctx.beginPath();
              ctx.arc(z.x, z.y, z.r, 0, TAU);
              ctx.fill();
              ctx.globalAlpha = 1;
              if (z.icon) {
                // pilares que brotan del suelo
                for (let i = 0; i < 5; i++) {
                  const a = (i / 5) * TAU;
                  drawEmoji(ctx, z.icon, z.x + Math.cos(a) * z.r * 0.5, z.y + Math.sin(a) * z.r * 0.5 + (1 - k) * 10, 14 + 18 * k);
                }
              } else drawEmoji(ctx, '☄️', z.x + (1 - k) * 80, z.y - (1 - k) * 160, 40);
            }
            break;
          }
          case 'warnLine':
          case 'telegraphLine': {
            if (z.done) break;
            const k = Math.min(1, z.t / z.delay);
            ctx.save();
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.18 + 0.25 * k;
            ctx.strokeStyle = z.color;
            ctx.lineWidth = z.width;
            ctx.beginPath();
            ctx.moveTo(z.x, z.y);
            ctx.lineTo(z.x2, z.y2);
            ctx.stroke();
            ctx.globalAlpha = 0.9;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 8]);
            ctx.stroke();
            ctx.restore();
            break;
          }
          case 'telegraphCircle': {
            if (z.done) break;
            const k = Math.min(1, z.t / z.delay);
            ctx.save();
            ctx.globalAlpha = 0.15 + 0.2 * k;
            ctx.fillStyle = z.color;
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.r, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = z.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.r, 0, TAU);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.r * k, 0, TAU);
            ctx.stroke();
            ctx.restore();
            break;
          }
          case 'gravityWell': {
            const active = z.t >= z.delay;
            ctx.save();
            ctx.globalAlpha = active ? 0.35 : 0.15;
            const grd = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r);
            grd.addColorStop(0, '#000');
            grd.addColorStop(1, z.color);
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.r, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = z.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.r * (0.6 + 0.4 * ((g.time * 1.5) % 1)), 0, TAU);
            ctx.stroke();
            ctx.restore();
            break;
          }
          case 'nova': {
            if (z.radius === undefined) break;
            ctx.strokeStyle = z.color;
            ctx.globalAlpha = 0.85;
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.arc(z.x, z.y, Math.max(1, z.radius), 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 1;
            break;
          }
          case 'portal': {
            const k = Math.min(1, z.t / z.delay);
            ctx.save();
            ctx.globalAlpha = z.done ? 0.4 : 0.9;
            ctx.strokeStyle = z.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(z.x, z.y, z.r * k, z.r * 0.5 * k + 2, g.time * 3, 0, TAU);
            ctx.stroke();
            ctx.fillStyle = 'rgba(20,0,40,0.6)';
            ctx.fill();
            ctx.restore();
            break;
          }
        }
      }
    }

    // ---------- enemigos ----------
    drawEnemies() {
      const g = this.game;
      const ctx = this.ctx;
      for (const e of g.room.enemies) {
        if (e.dead) continue;
        ctx.save();
        ctx.globalAlpha = e.alpha;
        // sombra
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + e.r * 0.8, e.r, e.r * 0.35, 0, 0, TAU);
        ctx.fill();
        // aviso de ataque
        if (e.windup > 0 || e.charging || e.pulling) {
          ctx.strokeStyle = e.charging ? '#ffffff' : '#ff3b3b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 6 + Math.sin(g.time * 30) * 2, 0, TAU);
          ctx.stroke();
        }
        if (e.boss || e.elite) {
          ctx.shadowColor = e.color;
          ctx.shadowBlur = 20;
        }
        ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = e.boss ? '#ffd76a' : e.elite ? '#d58cff' : 'rgba(0,0,0,0.6)';
        ctx.lineWidth = e.boss || e.elite ? 3 : 2;
        ctx.stroke();
        drawEmoji(ctx, e.icon, e.x, e.y, e.r * 1.25);
        if (e.slowAmt > 0) {
          ctx.fillStyle = 'rgba(94,200,255,0.25)';
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r, 0, TAU);
          ctx.fill();
        }
        if (e.burn) drawEmoji(ctx, '🔥', e.x + e.r * 0.7, e.y - e.r * 0.7, 12);
        if (e.poison) drawEmoji(ctx, '☠️', e.x - e.r * 0.7, e.y - e.r * 0.7, 12);
        if (e.shield > 0) {
          ctx.strokeStyle = 'rgba(189,248,255,0.9)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 8, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
        if (!e.boss && e.hp < e.maxHp) {
          bar(ctx, e.x - e.r, e.y - e.r - 10, e.r * 2, 5, e.hp / e.maxHp, e.elite ? '#d58cff' : '#ff4d4d');
        }
        if (e.elite) text(ctx, e.name, e.x, e.y - e.r - 20, 13, '#e9c8ff', 'center', 'bold', true);
      }
    }

    // ---------- jugador ----------
    drawPlayer() {
      const g = this.game;
      const ctx = this.ctx;
      const p = g.player;
      const ch = p.ch;
      // orbitales (Escudo de Viento, Bestias del Relámpago, pétalos...)
      for (const id in g.run.inventory.skills) {
        const def = g.data.skills[id];
        const orb = p.skillState[id];
        if (def.behavior !== 'orbit' || !orb || !orb.points) continue;
        const col = def.color || '#c4fff0';
        for (const pt of orb.points) {
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 9, 0, TAU);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      const aura = p.skillState.auraToxica;
      if (aura && aura.auraR && g.run.inventory.skills.auraToxica) {
        ctx.save();
        ctx.globalAlpha = 0.16 + 0.05 * Math.sin(g.time * 4);
        ctx.fillStyle = '#b36bff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, aura.auraR, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      // íconos de mejoras activas girando alrededor
      p.buffs.forEach((bf, i) => {
        const ang = g.time * 2 + (i / Math.max(1, p.buffs.length)) * TAU;
        drawEmoji(ctx, bf.icon, p.x + Math.cos(ang) * 28, p.y + Math.sin(ang) * 28, 14, 0.9);
      });
      if (p.invuln > 0 && p.dash.t <= 0 && Math.floor(g.time * 20) % 2 === 0 && g.state === 'playing') return this.drawSpeech(p);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + p.r * 0.85, p.r, p.r * 0.35, 0, 0, TAU);
      ctx.fill();
      // aura de la definitiva
      if (p.ult.active) {
        const col = { asta: 'rgba(0,0,0,0.75)', yuno: 'rgba(127,224,200,0.45)', noelle: 'rgba(191,233,255,0.5)' }[ch.id] || 'rgba(255,229,138,0.5)';
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = col;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 6 + i * 6 + Math.sin(g.time * 10 + i) * 3, 0, TAU);
          ctx.stroke();
        }
        if (ch.id === 'yuno') drawEmoji(ctx, '🧚', p.x + Math.cos(g.time * 3) * 34, p.y - 26 + Math.sin(g.time * 5) * 6, 22);
      }
      ctx.fillStyle = p.hurtFlash > 0 ? '#ff6060' : ch.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = p.ult.active && ch.id === 'asta' ? '#ff2020' : ch.accent;
      ctx.lineWidth = 3;
      ctx.stroke();
      // dirección
      ctx.fillStyle = ch.accent;
      ctx.beginPath();
      const fx = Math.cos(p.facing);
      const fy = Math.sin(p.facing);
      ctx.moveTo(p.x + fx * (p.r + 8), p.y + fy * (p.r + 8));
      ctx.lineTo(p.x + fx * p.r - fy * 5, p.y + fy * p.r + fx * 5);
      ctx.lineTo(p.x + fx * p.r + fy * 5, p.y + fy * p.r - fx * 5);
      ctx.fill();
      text(ctx, ch.letter, p.x, p.y + 1, 16, ch.accent, 'center', 'bold');
      this.drawSpeech(p);
    }

    drawSpeech(p) {
      if (!p.speech) return;
      const ctx = this.ctx;
      const s = p.speech;
      const a = Math.min(1, s.t * 6, (s.life - s.t) * 4);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = 'bold 14px "Segoe UI",system-ui,sans-serif';
      const w = ctx.measureText(s.text).width + 18;
      const x = Math.max(10, Math.min(this.game.data.config.width - w - 10, p.x - w / 2));
      const y = p.y - p.r - 46;
      ctx.fillStyle = '#fffbea';
      roundRect(ctx, x, y, w, 26, 8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x - 6, y + 26);
      ctx.lineTo(p.x + 6, y + 26);
      ctx.lineTo(p.x, y + 34);
      ctx.fill();
      text(ctx, s.text, x + w / 2, y + 13, 14, '#1a1a1a', 'center', 'bold');
      ctx.restore();
    }

    // ---------- proyectiles ----------
    drawProjectiles() {
      const g = this.game;
      const ctx = this.ctx;
      for (const q of g.room.projectiles) {
        const ang = Math.atan2(q.vy, q.vx);
        if (q.owner === 'enemy') {
          ctx.fillStyle = q.color;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.r * 1.7, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.r, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.r * 0.45, 0, TAU);
          ctx.fill();
          continue;
        }
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(ang);
        ctx.fillStyle = q.color;
        ctx.strokeStyle = q.color;
        if (q.style === 'crescent') {
          ctx.lineWidth = Math.max(3, q.r * 0.35);
          ctx.shadowColor = q.color;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(-q.r * 0.4, 0, q.r, -1.1, 1.1);
          ctx.stroke();
        } else if (q.style === 'blade') {
          ctx.beginPath();
          ctx.moveTo(q.r * 1.8, 0);
          ctx.lineTo(-q.r, q.r * 0.6);
          ctx.lineTo(-q.r * 0.4, 0);
          ctx.lineTo(-q.r, -q.r * 0.6);
          ctx.closePath();
          ctx.fill();
        } else if (q.style === 'spear') {
          ctx.lineWidth = 4;
          ctx.shadowColor = '#5ec8ff';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(-q.r * 2.2, 0);
          ctx.lineTo(q.r * 1.6, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(q.r * 2.4, 0);
          ctx.lineTo(q.r * 1.2, 6);
          ctx.lineTo(q.r * 1.2, -6);
          ctx.fill();
        } else {
          ctx.shadowColor = q.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(0, 0, q.r, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // ---------- efectos ----------
    drawEffects() {
      const g = this.game;
      const ctx = this.ctx;
      for (const f of g.effects) {
        const k = f.t / f.life;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - k);
        if (f.type === 'slash') {
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 6 * (1 - k) + 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range * (0.75 + 0.25 * k), f.angle - f.arc / 2, f.angle + f.arc / 2);
          ctx.stroke();
          ctx.globalAlpha *= 0.3;
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.moveTo(f.x, f.y);
          ctx.arc(f.x, f.y, f.range, f.angle - f.arc / 2, f.angle + f.arc / 2);
          ctx.closePath();
          ctx.fill();
        } else if (f.type === 'thrust') {
          ctx.strokeStyle = f.color;
          ctx.lineCap = 'round';
          ctx.lineWidth = f.width * (1 - k * 0.7);
          ctx.beginPath();
          ctx.moveTo(f.x, f.y);
          ctx.lineTo(f.x2, f.y2);
          ctx.stroke();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (f.type === 'ring') {
          ctx.strokeStyle = f.color;
          ctx.lineWidth = f.width || 4;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * k, 0, TAU);
          ctx.stroke();
        } else if (f.type === 'burst') {
          ctx.fillStyle = f.color;
          ctx.globalAlpha *= 0.6;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * (1 + k * 0.3), 0, TAU);
          ctx.fill();
        } else if (f.type === 'lineFlash') {
          ctx.strokeStyle = f.color;
          ctx.lineCap = 'round';
          ctx.lineWidth = f.width;
          ctx.beginPath();
          ctx.moveTo(f.x, f.y);
          ctx.lineTo(f.x2, f.y2);
          ctx.stroke();
        } else if (f.type === 'bolt') {
          // rayo zigzag
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 3;
          ctx.shadowColor = f.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(f.x, f.y);
          const seg = 6;
          for (let i = 1; i < seg; i++) {
            const t = i / seg;
            ctx.lineTo(f.x + (f.x2 - f.x) * t + (Math.random() - 0.5) * 18, f.y + (f.y2 - f.y) * t + (Math.random() - 0.5) * 18);
          }
          ctx.lineTo(f.x2, f.y2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (f.type === 'spark') {
          ctx.fillStyle = f.color;
          const x = f.x + (f.tx - f.x) * k;
          const y = f.y + (f.ty - f.y) * k;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    drawParticles() {
      const ctx = this.ctx;
      for (const p of this.game.particles) {
        ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    }

    drawTexts() {
      const ctx = this.ctx;
      for (const t of this.game.texts) {
        ctx.globalAlpha = Math.max(0, 1 - t.t / t.life);
        text(ctx, t.text, t.x, t.y, t.size, t.color, 'center', 'bold', true);
      }
      ctx.globalAlpha = 1;
    }

    drawVignette() {
      const g = this.game;
      if (g.player.slowT > 0 && g.player.slowAmt >= 0.7 && g.state === 'playing') {
        const dd = g.data.config;
        this.ctx.fillStyle = 'rgba(120,90,200,0.18)';
        this.ctx.fillRect(0, 0, dd.width, dd.height);
      }
      const ratio = g.run.hp / g.player.eff.maxHp;
      if (ratio > 0.3 || g.state !== 'playing') return;
      const d = g.data.config;
      const ctx = this.ctx;
      const a = (0.3 - ratio) * 2 * (0.7 + 0.3 * Math.sin(g.time * 6));
      const grd = ctx.createRadialGradient(d.width / 2, d.height / 2, 250, d.width / 2, d.height / 2, 750);
      grd.addColorStop(0, 'rgba(255,0,0,0)');
      grd.addColorStop(1, 'rgba(200,0,0,' + a + ')');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, d.width, d.height);
    }

    // ---------- interfaz ----------
    drawHud(realm) {
      const g = this.game;
      const ctx = this.ctx;
      const d = g.data.config;
      const p = g.player;
      const run = g.run;
      const eff = p.eff;
      const ch = p.ch;

      ctx.fillStyle = 'rgba(5,5,10,0.82)';
      ctx.fillRect(0, 0, d.width, d.wallTop - 6);
      ctx.fillStyle = realm.palette.accent;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, d.wallTop - 7, d.width, 2);
      ctx.globalAlpha = 1;

      // en el celular la pantalla es chica: retrato, barras y números se dibujan más grandes
      const hudZoom = BC.touchMode ? 1.25 : 1;
      ctx.save();
      ctx.scale(hudZoom, hudZoom);
      // retrato
      ctx.fillStyle = ch.color;
      ctx.beginPath();
      ctx.arc(38, 33, 24, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ch.accent;
      ctx.lineWidth = 3;
      ctx.stroke();
      if (STYLE.pixel && BC.Pixel) {
        // retrato en pixel art
        const spr = BC.Pixel.playerSprite(ch.id, 0, false);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.beginPath();
        ctx.arc(38, 33, 22, 0, TAU);
        ctx.clip();
        ctx.drawImage(spr, 0, 0, spr.width, 12, 38 - spr.width * 1.5, 13, spr.width * 3, 36);
        ctx.restore();
      } else drawEmoji(ctx, ch.icon, 38, 33, 24);
      // nivel y experiencia
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(56, 54, 10, 0, TAU);
      ctx.fill();
      text(ctx, String(run.level), 56, 54.5, 11, '#1a1206', 'center', 'bold');
      const need = BC.Run.xpToNext(run.level, g.data);
      ctx.save();
      ctx.scale(1 / hudZoom, 1 / hudZoom); // la barra de experiencia va de punta a punta, sin agrandar
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, d.wallTop - 6, d.width, 4);
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(0, d.wallTop - 6, d.width * Math.min(1, run.xp / need), 4);
      ctx.restore();

      // barras
      const bx = 72;
      const bw = 260;
      bar(ctx, bx, 8, bw, 16, run.hp / eff.maxHp, run.hp / eff.maxHp < 0.3 ? '#ff3b3b' : '#e0404a');
      text(ctx, '❤ ' + Math.ceil(run.hp) + ' / ' + eff.maxHp, bx + 8, 16, 12, '#fff', 'left', 'bold', true);
      if (ch.usesMana) {
        bar(ctx, bx, 28, bw, 11, p.mana / eff.maxMana, '#3d8bff');
        text(ctx, 'Maná ' + Math.floor(p.mana), bx + 8, 33.5, 10, '#dfe9ff', 'left', 'bold', true);
      } else {
        bar(ctx, bx, 28, bw, 11, 0, '#3d8bff');
        text(ctx, 'Sin maná — Anti-magia', bx + 8, 33.5, 10, '#aaa', 'left', 'bold', true);
      }
      const u = p.ult;
      const ultRatio = u.active ? u.timer / u.total : u.gauge / ch.ultimate.gaugeMax;
      const ultFull = !u.active && u.gauge >= ch.ultimate.gaugeMax;
      const ultCol = u.active ? '#ffffff' : ultFull ? (Math.floor(g.time * 4) % 2 ? '#ffd23a' : '#fff1b0') : ULT_COLORS[ch.id] || '#c9a64a';
      bar(ctx, bx, 43, bw, 11, ultRatio, ultCol);
      const ultLabel = u.active ? '¡' + ch.ultimate.name + '!' : ultFull ? '¡' + ch.ultimate.name + ' lista! ' + (BC.touchMode ? 'Tocá ✦' : 'Apretá Q') : ch.ultimate.name + ' ' + Math.floor((u.gauge / ch.ultimate.gaugeMax) * 100) + '%';
      text(ctx, ultLabel, bx + 8, 48.5, 10, ultFull ? '#1a1206' : '#fff', 'left', 'bold', !ultFull);
      if (ultFull && !BC.touchMode) text(ctx, '[Q]', bx + bw + 12, 31, 14, '#ffd23a', 'left', 'bold', true);
      // estado extra
      let sx = bx + bw + 12;
      if (p.hurtStacks.length) {
        text(ctx, '🔥x' + p.hurtStacks.length, sx, 16, 13, '#ffb38a', 'left', 'bold', true);
      }
      if (ch.trait.id === 'versatil' && p.schools) {
        text(ctx, '🧙+' + Math.round(p.schools * ch.trait.perSchool * 100) + '%', sx, 16, 13, '#ffe58a', 'left', 'bold', true);
      }
      if (p.dash.cd > 0) {
        text(ctx, '💨 ' + p.dash.cd.toFixed(1), sx, 46, 12, '#aaa', 'left', 'bold', true);
      } else text(ctx, '💨 listo', sx, 46, 12, '#9ff5d6', 'left', 'bold', true);

      ctx.restore();

      // reino y progreso
      const cx = d.width / 2;
      text(ctx, realm.name + (run.ascension ? '  ·  Rango ' + run.ascension : ''), cx, 16, 16, realm.palette.accent, 'center', 'bold', true);
      const floors = run.map.realms[run.realmIndex].floors;
      const fw = 34;
      const fx0 = cx - ((floors.length - 1) * fw) / 2;
      for (let i = 0; i < floors.length; i++) {
        const x = fx0 + i * fw;
        const cur = i === run.floorIndex;
        const done = i < run.floorIndex;
        ctx.fillStyle = cur ? realm.palette.accent : done ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.arc(x, 42, cur ? 11 : 8, 0, TAU);
        ctx.fill();
        if (i < floors.length - 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect(x + 10, 41, fw - 20, 2);
        }
        if (cur) drawEmoji(ctx, g.data.rooms[g.room.node.type].icon, x, 42, 13);
        else if (i === floors.length - 1) drawEmoji(ctx, '👹', x, 42, 11, 0.7);
      }
      text(ctx, (g.data.realms[run.realmIndex].secret ? 'Reino secreto' : 'Reino ' + (run.realmIndex + 1) + '/' + run.map.realms.length), cx, 61, 10, '#aaa', 'center', 'bold');

      // derecha
      ctx.save();
      ctx.translate(d.width, 0);
      ctx.scale(hudZoom, hudZoom);
      ctx.translate(-d.width, 0);
      const rx = d.width - 16;
      text(ctx, '💰 ' + run.yul, rx, 16, 16, '#ffd23a', 'right', 'bold', true);
      text(ctx, '💀 ' + run.kills, rx - 110, 16, 13, '#ddd', 'right', 'bold', true);
      const mm = Math.floor(run.time / 60);
      const ss = Math.floor(run.time % 60);
      text(ctx, '⏱ ' + mm + ':' + (ss < 10 ? '0' : '') + ss, rx - 190, 16, 13, '#ddd', 'right', 'bold', true);
      text(ctx, 'Semilla ' + run.seed, rx, 38, 11, '#888', 'right', 'bold');
      if (!BC.touchMode) text(ctx, 'Esc: pausa / build', rx, 54, 11, '#777', 'right', 'bold');
      ctx.restore();

      // reliquias y sinergias (fila superior derecha dentro de la arena)
      let ix = d.width - d.wall - 14;
      for (const id of run.inventory.relics.slice().reverse()) {
        drawEmoji(ctx, g.data.relics[id].icon, ix, d.wallTop + 16, 18, 0.9);
        ix -= 24;
      }
      ix = d.width - d.wall - 14;
      for (const id of run.synergies) {
        const s = g.data.synergies.find((x) => x.id === id);
        ctx.fillStyle = 'rgba(255,215,106,0.25)';
        ctx.beginPath();
        ctx.arc(ix, d.wallTop + 42, 12, 0, TAU);
        ctx.fill();
        drawEmoji(ctx, s.icon, ix, d.wallTop + 42, 15);
        ix -= 28;
      }

      // habilidades (abajo a la izquierda)
      let k = 0;
      const sy = d.height - d.wall - 30;
      for (const id of ch.skillPool) {
        const lvl = run.inventory.skills[id];
        if (!lvl) continue;
        const def = g.data.skills[id];
        const st = p.skillState[id] || {};
        const x = d.wall + 28 + k * 48;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(ctx, x - 21, sy - 21, 42, 42, 8);
        ctx.fill();
        ctx.strokeStyle = def.basic ? '#ffd76a' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        drawEmoji(ctx, def.icon, x, sy, 22);
        if (st.cd > 0 && st.maxCd && !def.behavior.startsWith('orbit')) {
          const r = Math.min(1, st.cd / st.maxCd);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.beginPath();
          ctx.moveTo(x, sy);
          ctx.arc(x, sy, 22, -Math.PI / 2, -Math.PI / 2 + TAU * r);
          ctx.closePath();
          ctx.fill();
        }
        if (st.noMana) {
          ctx.fillStyle = 'rgba(30,60,160,0.5)';
          roundRect(ctx, x - 21, sy - 21, 42, 42, 8);
          ctx.fill();
        }
        if (id === 'habitante' && st.charges) text(ctx, String(Math.floor(st.charges)), x + 15, sy - 14, 11, '#d6b3ff', 'center', 'bold', true);
        text(ctx, String(lvl), x + 15, sy + 14, 11, '#ffd76a', 'center', 'bold', true);
        if (run.inventory.evolved && run.inventory.evolved.indexOf(id) !== -1) {
          ctx.strokeStyle = '#ff9cf5';
          ctx.lineWidth = 2;
          roundRect(ctx, x - 23, sy - 23, 46, 46, 9);
          ctx.stroke();
          text(ctx, '✦', x - 15, sy - 14, 12, '#ff9cf5', 'center', 'bold', true);
        }
        k++;
      }
    }

    drawBossBar() {
      const g = this.game;
      const e = g.room.boss || g.room.elite;
      if (!e || e.dead) return;
      const ctx = this.ctx;
      const d = g.data.config;
      const w = 520;
      const x = d.width / 2 - w / 2;
      const y = d.wallTop + 10;
      text(ctx, e.name + (e.boss ? '' : ' (Élite)'), d.width / 2, y + 2, 15, e.boss ? '#ffd76a' : '#e9c8ff', 'center', 'bold', true);
      bar(ctx, x, y + 12, w, 12, e.hp / e.maxHp, e.boss ? '#c62828' : '#9c4dcc');
      if (e.shield > 0 && e.maxShield) bar(ctx, x, y + 12, w * Math.min(1, e.shield / e.maxHp), 12, 1, 'rgba(189,248,255,0.8)', 'rgba(0,0,0,0)');
      if (e.def.phases && e.def.phases.length > 1) {
        ctx.fillStyle = '#fff';
        for (let i = 1; i < e.def.phases.length; i++) ctx.fillRect(x + w * e.def.phases[i].hpBelow - 1, y + 10, 2, 16);
      }
    }

    drawBanner() {
      const g = this.game;
      const b = g.bannerInfo;
      if (!b) return;
      const ctx = this.ctx;
      const d = g.data.config;
      const a = Math.min(1, b.t * 4, (b.life - b.t) * 3);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, d.height * 0.3 - 44, d.width, b.sub ? 96 : 70);
      text(ctx, b.text, d.width / 2, d.height * 0.3 - 8, 34, '#ffd76a', 'center', 'bold', true);
      if (b.sub) text(ctx, b.sub, d.width / 2, d.height * 0.3 + 30, 17, '#f2f2f2', 'center', '600', true);
      ctx.restore();
    }

    drawToasts() {
      const g = this.game;
      const ctx = this.ctx;
      const d = g.data.config;
      let y = d.height - 90;
      for (let i = g.toasts.length - 1; i >= 0; i--) {
        const t = g.toasts[i];
        const a = Math.min(1, t.t * 5, (t.life - t.t) * 2);
        ctx.globalAlpha = Math.max(0, a);
        text(ctx, t.text, d.width / 2, y, 18, t.color, 'center', 'bold', true);
        y -= 26;
      }
      ctx.globalAlpha = 1;
    }
  }

  BC.Renderer = Renderer;
  BC.drawEmoji = drawEmoji;
  BC.RenderUtil = { text, bar, roundRect, drawEmoji, STYLE };
})(typeof window !== 'undefined' ? window : globalThis);
