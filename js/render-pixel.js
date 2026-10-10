/*
 * Dibujo en PIXEL ART. El mundo (piso, enemigos, ataques, efectos) se dibuja en un
 * lienzo de 320 x 180 "píxeles grandes" y se agranda x4 sin suavizar. Ese lienzo
 * en realidad mide el doble (640 x 360): así los sprites HD de js/pixel-hd.js
 * muestran todo su detalle, y lo demás se dibuja igual que antes con escala x2.
 * Los textos y la interfaz de arriba se dibujan después en alta resolución.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});
  const P = BC.Pixel;
  const TAU = Math.PI * 2;
  const S = P.SCALE;
  const q = (v) => Math.round(v / S);
  const HD = P.HD || 1;
  // posición de un sprite: si es HD puede caer en medio píxel grande
  const qh = (v) => Math.round((v / S) * HD) / HD;

  const ULT_RING = { asta: '#c41e1e', yuno: '#7fe0c8', noelle: '#bfe9ff', mago: '#ffe58a' };
  const ROOM_ICON = { combat: 'combat', elite: 'elite', shop: 'shop', event: 'event', rest: 'rest', boss: 'boss' };

  const proto = BC.Renderer.prototype;

  proto.ensureLo = function () {
    if (this.lo) return;
    const d = this.game.data.config;
    this.lo = P.makeCanvas((d.width / S) * HD, (d.height / S) * HD);
    this.lctx = this.lo.getContext('2d');
    this.lctx.imageSmoothingEnabled = false;
    this.lastPos = new Map(); // para saber si un enemigo se está moviendo (animación)
  };

  // ---------------- cuadro completo en modo pixel ----------------
  proto.drawPixelFrame = function (realm) {
    const g = this.game;
    const ctx = this.ctx;
    const d = g.data.config;
    this.ensureLo();
    const L = this.lctx;
    L.setTransform(1, 0, 0, 1, 0, 0);
    L.globalAlpha = 1;
    L.clearRect(0, 0, this.lo.width, this.lo.height);
    L.setTransform(HD, 0, 0, HD, 0, 0);

    this.pxBackground(realm);
    this.pxDoors();
    this.pxZones(false);
    this.pxSpawns();
    this.pxPickups();
    this.pxNpc();
    this.pxEnemies();
    this.pxPlayer();
    this.pxZones(true);
    this.pxProjectiles();
    this.pxEffects();
    this.pxParticles();

    // agrandar x4 sin suavizar (con el temblor de pantalla en píxeles grandes)
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    let sx = 0;
    let sy = 0;
    if (g.shakeAmt > 0) {
      sx = Math.round(((Math.random() - 0.5) * g.shakeAmt) / S) * S;
      sy = Math.round(((Math.random() - 0.5) * g.shakeAmt) / S) * S;
    }
    ctx.drawImage(this.lo, sx, sy, d.width, d.height);
    ctx.restore();

    // capa en alta resolución: textos y carteles
    this.pxDoorLabels();
    this.pxEliteNames();
    this.drawTexts();
    this.drawSpeech(g.player);
    this.drawVignette();
    this.drawHud(realm);
    this.drawBossBar();
    this.drawBanner();
    this.drawToasts();
    if (g.room.time < 0.35) {
      ctx.fillStyle = 'rgba(0,0,0,' + (1 - g.room.time / 0.35) + ')';
      ctx.fillRect(0, 0, d.width, d.height);
    }
  };

  // ---------------- fondo (se arma una vez por sala) ----------------
  proto.pxBackground = function (realm) {
    const g = this.game;
    const key = 'px:' + g.room.node.id + ':' + g.run.seed;
    if (this.pxBgKey !== key) {
      this.pxBgKey = key;
      const c = P.makeCanvas(this.lo.width, this.lo.height);
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.setTransform(HD, 0, 0, HD, 0, 0);
      // paredes de ladrillo
      // ladrillos (los HD se achican a la mitad para que midan lo mismo que antes)
      const wt = P.wallTile(realm);
      const wallPat = x.createPattern(wt, 'repeat');
      if (wt.hd && wallPat.setTransform) wallPat.setTransform(new DOMMatrix().scale(1 / wt.hd));
      x.fillStyle = wallPat;
      x.fillRect(0, 0, c.width, c.height);
      // piso con baldosas variadas
      const b = g.bounds;
      const x1 = q(b.x1);
      const y1 = q(b.y1);
      const x2 = q(b.x2);
      const y2 = q(b.y2);
      const tiles = P.tiles(realm);
      for (let ty = y1; ty < y2; ty += 16) {
        for (let tx = x1; tx < x2; tx += 16) {
          // baldosa al azar (fija por posición); la especial sale ~7% de las veces
          const r = P.hash(tx >> 4, ty >> 4);
          const h = r < 0.07 ? 5 : Math.floor((r - 0.07) / 0.93 * 5);
          const tw = Math.min(16, x2 - tx);
          const th = Math.min(16, y2 - ty);
          const k = tiles[h].hd || 1; // las baldosas HD tienen el doble de píxeles
          x.drawImage(tiles[h], 0, 0, tw * k, th * k, tx, ty, tw, th);
        }
      }
      // sombra donde el piso toca la pared
      x.fillStyle = 'rgba(0,0,0,0.35)';
      x.fillRect(x1, y1, x2 - x1, 2);
      x.fillRect(x1, y1, 1, y2 - y1);
      // borde
      x.fillStyle = P.shade(realm.palette.accent, -0.35);
      x.fillRect(x1 - 1, y1 - 1, x2 - x1 + 2, 1);
      x.fillRect(x1 - 1, y2, x2 - x1 + 2, 1);
      x.fillRect(x1 - 1, y1 - 1, 1, y2 - y1 + 2);
      x.fillRect(x2, y1 - 1, 1, y2 - y1 + 2);
      // decoraciones
      for (const dc of g.room.decos) {
        const spr = P.deco(dc.icon);
        x.globalAlpha = 0.85;
        P.blit(x, spr, Math.round(q(dc.x) - P.dw(spr) / 2), q(dc.y) - P.dh(spr));
      }
      x.globalAlpha = 1;
      this.pxBg = c;
    }
    this.lctx.drawImage(this.pxBg, 0, 0, this.pxBg.width / HD, this.pxBg.height / HD);
  };

  // ---------------- puertas ----------------
  proto.pxDoors = function () {
    const g = this.game;
    const L = this.lctx;
    for (const dr of g.room.doors) {
      const rd = g.data.rooms[dr.node.type];
      const x = q(dr.x - dr.w / 2);
      const y = q(dr.y - dr.h / 2);
      const w = q(dr.w);
      const h = q(dr.h);
      const pulse = Math.floor(g.time * 4) % 2;
      L.fillStyle = '#0b0b10';
      L.fillRect(x, y, w, h);
      L.fillStyle = rd.color;
      L.fillRect(x - 1, y - 1, w + 2, 1);
      L.fillRect(x - 1, y + h, w + 2, 1);
      L.fillRect(x - 1, y, 1, h);
      L.fillRect(x + w, y, 1, h);
      if (pulse) {
        L.fillStyle = P.shade(rd.color, 0.4);
        L.fillRect(x, y, w, 1);
      }
      const ic = P.icon(ROOM_ICON[dr.node.type] || 'event');
      if (ic) P.blit(L, ic, x + Math.round((w - P.dw(ic)) / 2), y + Math.round((h - P.dh(ic)) / 2));
    }
  };

  proto.pxDoorLabels = function () {
    const g = this.game;
    const T = BC.RenderUtil.text;
    for (const dr of g.room.doors) {
      const rd = g.data.rooms[dr.node.type];
      const label = dr.nextRealm ? '→ ' + g.data.realms[dr.node.realm].name : rd.name;
      T(this.ctx, label, dr.x, dr.y + dr.h / 2 + 14, 14, '#fff', 'center', 'bold', true);
    }
    if (g.room.doors.length) T(this.ctx, 'Elegí una puerta y caminá hacia ella', g.data.config.width / 2, g.bounds.y1 + 112, 15, 'rgba(255,255,255,0.8)', 'center', 'bold', true);
  };

  proto.pxEliteNames = function () {
    const g = this.game;
    for (const e of g.room.enemies) {
      if (e.dead || !e.elite) continue;
      BC.RenderUtil.text(this.ctx, e.name, e.x, e.y - e.r - 26, 13, '#e9c8ff', 'center', 'bold', true);
    }
  };

  proto.pxNpc = function () {
    const g = this.game;
    const n = g.room.npc;
    if (!n) return;
    const type = g.room.node.type;
    const ic = P.icon(ROOM_ICON[type] || 'event');
    if (!ic) return;
    const L = this.lctx;
    const bob = Math.floor(g.time * 2) % 2;
    L.fillStyle = 'rgba(0,0,0,0.35)';
    const iw = P.dw(ic);
    const ih = P.dh(ic);
    L.fillRect(q(n.x) - iw, q(n.y) + ih, iw * 2, 2);
    L.drawImage(ic, q(n.x) - iw, q(n.y) - ih + bob, iw * 2, ih * 2);
  };

  // ---------------- círculos y zonas ----------------
  function ditherCircle(L, x, y, r, color) {
    L.fillStyle = L.createPattern(P.dither(color), 'repeat');
    L.beginPath();
    L.arc(x, y, Math.max(1, r), 0, TAU);
    L.fill();
  }
  function ring(L, x, y, r, color, w) {
    L.strokeStyle = color;
    L.lineWidth = w || 1;
    L.beginPath();
    L.arc(x, y, Math.max(1, r), 0, TAU);
    L.stroke();
  }
  // ---------- trazos con brillo (en HD se ven el doble de finos) ----------
  // capa ancha y transparente del color + capa del color + centro blanco fino
  function glowLine(L, x1, y1, x2, y2, color, w) {
    const ww = Math.max(1, w || 1);
    L.save();
    L.lineCap = 'round';
    L.globalAlpha *= 0.35;
    line(L, x1, y1, x2, y2, color, ww + 2);
    L.restore();
    line(L, x1, y1, x2, y2, color, ww);
    line(L, x1, y1, x2, y2, '#ffffff', Math.max(0.5, ww / 3));
  }
  function glowArc(L, x, y, r, a0, a1, color, w) {
    const ww = Math.max(1, w || 1);
    const arc = (rr, c, lw) => {
      L.strokeStyle = c;
      L.lineWidth = lw;
      L.beginPath();
      L.arc(x, y, Math.max(0.5, rr), a0, a1);
      L.stroke();
    };
    L.save();
    L.globalAlpha *= 0.3;
    arc(r, color, ww + 2.5);
    L.restore();
    arc(r, color, ww);
    arc(r - ww * 0.25, '#ffffff', Math.max(0.5, ww / 3));
  }
  function glowRing(L, x, y, r, color, w) {
    glowArc(L, x, y, r, 0, TAU, color, w);
  }
  // estrellita de 4 puntas (en píxeles HD)
  function star4(L, x, y, r, color) {
    L.fillStyle = color;
    L.fillRect(x - r / 2, y - 0.25, r, 0.5);
    L.fillRect(x - 0.25, y - r / 2, 0.5, r);
    L.fillStyle = '#ffffff';
    L.fillRect(x - 0.25, y - 0.25, 0.5, 0.5);
  }
  function line(L, x1, y1, x2, y2, color, w) {
    L.strokeStyle = color;
    L.lineWidth = w || 1;
    L.beginPath();
    L.moveTo(x1, y1);
    L.lineTo(x2, y2);
    L.stroke();
  }

  proto.pxZones = function (top) {
    const g = this.game;
    const L = this.lctx;
    for (const z of g.room.zones) {
      const isTop = z.kind === 'beam' || z.kind === 'tornado';
      if (isTop !== top) continue;
      const x = q(z.x);
      const y = q(z.y);
      const r = z.r !== undefined ? z.r / S : 0;
      switch (z.kind) {
        case 'tornado':
          ditherCircle(L, x, y, r, 'rgba(127,224,200,0.55)');
          for (let i = 0; i < 3; i++) {
            L.strokeStyle = i === 1 ? '#c4fff0' : '#7fe0c8';
            L.lineWidth = 1;
            L.beginPath();
            L.arc(x, y, r * (0.35 + i * 0.25), z.t * (6 + i * 2), z.t * (6 + i * 2) + 4);
            L.stroke();
          }
          break;
        case 'field':
          ditherCircle(L, x, y, r, z.color || '#888');
          L.setLineDash([2, 2]);
          ring(L, x, y, r, z.color || '#888', 1);
          L.setLineDash([]);
          break;
        case 'dome':
          ditherCircle(L, x, y, r, z.color || '#5ec8ff');
          ring(L, x, y, r + (Math.floor(z.t * 6) % 2), z.color || '#bfe9ff', 1);
          break;
        case 'beam': {
          if (!z.x2) break;
          // rayo con borde que titila
          const w = Math.max(2, z.width / S) + (Math.floor(g.time * 20) % 2 ? 0.5 : 0);
          glowLine(L, x, y, q(z.x2), q(z.y2), z.color || '#5ec8ff', w);
          break;
        }
        case 'shockwave':
          glowRing(L, x, y, (z.radius || 1) / S, z.color || '#5ec8ff', 2);
          break;
        case 'slam':
          if (z.t < z.delay) {
            const k = z.t / z.delay;
            ditherCircle(L, x, y, r * k, z.color || '#000000');
            ring(L, x, y, r, z.color || '#2a2a2a', 1);
            if (!z.icon) {
              // meteorito que cae
              L.fillStyle = '#1a1a1a';
              L.fillRect(x + Math.round((1 - k) * 20) - 2, y - Math.round((1 - k) * 40) - 2, 4, 4);
              L.fillStyle = '#ff6a1a';
              L.fillRect(x + Math.round((1 - k) * 20) + 1, y - Math.round((1 - k) * 40) - 3, 2, 1);
            }
          }
          break;
        case 'warnLine':
        case 'telegraphLine':
          if (z.done) break;
          L.strokeStyle = L.createPattern(P.dither(z.color || '#ff4040'), 'repeat');
          L.lineWidth = Math.max(2, z.width / S);
          L.beginPath();
          L.moveTo(x, y);
          L.lineTo(q(z.x2), q(z.y2));
          L.stroke();
          line(L, x, y, q(z.x2), q(z.y2), z.color || '#ff4040', 1);
          break;
        case 'telegraphCircle':
          if (z.done) break;
          ditherCircle(L, x, y, r, z.color || '#ff4040');
          ring(L, x, y, r, z.color || '#ff4040', 1);
          ring(L, x, y, r * Math.min(1, z.t / z.delay), '#ffffff', 1);
          break;
        case 'gravityWell': {
          ditherCircle(L, x, y, r, z.t >= z.delay ? z.color || '#6a3aff' : 'rgba(106,58,255,0.5)');
          ring(L, x, y, r * (0.4 + 0.6 * ((g.time * 1.5) % 1)), '#000000', 1);
          break;
        }
        case 'nova':
          if (z.radius === undefined) break;
          glowRing(L, x, y, z.radius / S, z.color || '#ffffff', 3);
          break;
        case 'portal': {
          const k = Math.min(1, z.t / z.delay);
          L.fillStyle = '#14002a';
          L.fillRect(x - Math.round(4 * k), y - Math.round(2 * k), Math.round(8 * k), Math.round(4 * k));
          L.strokeStyle = z.color || '#b28cff';
          L.lineWidth = 1;
          L.strokeRect(x - Math.round(4 * k), y - Math.round(2 * k), Math.round(8 * k), Math.round(4 * k));
          break;
        }
      }
    }
  };

  proto.pxSpawns = function () {
    const g = this.game;
    const L = this.lctx;
    for (const s of g.room.spawns) {
      const def = g.data.enemies[s.id] || g.data.bosses[s.id];
      const r = (def.radius || 15) / S;
      const k = 1 - s.t / (s.total || 0.8);
      ditherCircle(L, q(s.x), q(s.y), r, def.boss ? '#ff3030' : 'rgba(255,60,60,0.8)');
      ring(L, q(s.x), q(s.y), r + 3 * (1 - k), '#ff5050', 1);
      const spr = P.enemySprite({ id: s.id, name: def.name }, 0, false);
      if (spr) {
        L.globalAlpha = 0.25 + 0.6 * k;
        P.blit(L, spr, qh(s.x) - P.dw(spr) / 2, q(s.y) - P.dh(spr) + Math.round(r));
        L.globalAlpha = 1;
      }
    }
  };

  proto.pxPickups = function () {
    const g = this.game;
    const L = this.lctx;
    for (const k of g.room.pickups) {
      const bob = Math.floor((g.time + k.uid) * 4) % 2;
      const name = k.kind === 'yul' ? 'coin' : k.kind === 'heart' ? 'heart' : 'chest';
      const ic = P.icon(name);
      if (k.kind === 'chest' && Math.floor(g.time * 5) % 2) ditherCircle(L, q(k.x), q(k.y), 7, '#ffd76a');
      P.blit(L, ic, Math.round(q(k.x) - P.dw(ic) / 2), Math.round(q(k.y) - P.dh(ic) / 2) - bob);
    }
  };

  // ---------------- enemigos ----------------
  proto.pxEnemies = function () {
    const g = this.game;
    const L = this.lctx;
    const p = g.player;
    for (const e of g.room.enemies) {
      if (e.dead) continue;
      // ¿se movió desde el cuadro anterior? (para animar las piernas)
      const last = this.lastPos.get(e.uid);
      const moving = last ? Math.abs(last[0] - e.x) + Math.abs(last[1] - e.y) > 0.3 : false;
      this.lastPos.set(e.uid, [e.x, e.y]);
      const frame = moving ? 1 + (Math.floor(g.time * 6 + e.uid) % 2) : 0;
      const flip = p.x < e.x;
      const spr = P.enemySprite(e, frame, flip);
      const cx = q(e.x);
      const feet = q(e.y + e.r * 0.8);
      L.globalAlpha = e.alpha;
      // sombra
      L.fillStyle = 'rgba(0,0,0,0.35)';
      L.fillRect(cx - Math.round(e.r / S), feet, Math.round((e.r * 2) / S), 1);
      if (e.boss || e.elite) ditherCircle(L, cx, feet - 1, Math.round(e.r / S) + 1, e.boss ? 'rgba(255,215,106,0.5)' : 'rgba(213,140,255,0.45)');
      if (spr) {
        const sw = P.dw(spr);
        const sh = P.dh(spr);
        const x = qh(e.x) - sw / 2;
        const y = feet - sh + 1;
        if (e.flash > 0.04) L.filter = 'brightness(1.8)';
        P.blit(L, spr, x, y);
        L.filter = 'none';
        if (e.windup > 0 || e.charging || e.pulling) {
          if (Math.floor(g.time * 16) % 2) ring(L, cx, feet - (sh >> 1), Math.max(sw, sh) / 2 + 1, e.charging ? '#ffffff' : '#ff3b3b', 1);
        }
        if (e.shield > 0) ring(L, cx, feet - (sh >> 1), Math.max(sw, sh) / 2 + 2, '#bdf8ff', 1);
        if (e.burn) {
          L.fillStyle = Math.floor(g.time * 8) % 2 ? '#ff6a1a' : '#ffe14a';
          L.fillRect(x + sw - 2, y, 2, 2);
        }
        if (e.poison) {
          L.fillStyle = '#b36bff';
          L.fillRect(x, y, 2, 2);
        }
        if (e.slowAmt > 0) {
          L.fillStyle = '#5ec8ff';
          L.fillRect(x + sw / 2, y - 2, 1, 1);
        }
        if (!e.boss && e.hp < e.maxHp) {
          const w = Math.max(6, Math.round(sw * 0.7));
          L.fillStyle = '#000';
          L.fillRect(cx - (w >> 1), y - 1, w, 2);
          L.fillStyle = e.elite ? '#d58cff' : '#ff4d4d';
          L.fillRect(cx - (w >> 1), y - 1, Math.max(1, Math.round(w * (e.hp / e.maxHp))), 2);
        }
      } else {
        L.fillStyle = e.color;
        L.beginPath();
        L.arc(cx, q(e.y), e.r / S, 0, TAU);
        L.fill();
      }
      L.globalAlpha = 1;
    }
  };

  // ---------------- jugador ----------------
  proto.pxPlayer = function () {
    const g = this.game;
    const L = this.lctx;
    const p = g.player;
    const ch = p.ch;
    // orbitales
    for (const id in g.run.inventory.skills) {
      const def = g.data.skills[id];
      const orb = p.skillState[id];
      if (def.behavior !== 'orbit' || !orb || !orb.points) continue;
      L.fillStyle = def.color || '#c4fff0';
      for (const pt of orb.points) L.fillRect(q(pt.x) - 1, q(pt.y) - 1, 3, 3);
    }
    // aura tóxica
    const aura = p.skillState.auraToxica;
    if (aura && aura.auraR && g.run.inventory.skills.auraToxica) ditherCircle(L, q(p.x), q(p.y), aura.auraR / S, 'rgba(179,107,255,0.45)');
    // aura de la definitiva
    if (p.ult.active) {
      const col = ULT_RING[ch.id] || '#ffe58a';
      ring(L, q(p.x), q(p.y) - 3, 7 + (Math.floor(g.time * 10) % 3), col, 1);
      ditherCircle(L, q(p.x), q(p.y), 6, col);
    }
    // parpadeo de invulnerabilidad
    if (p.invuln > 0 && p.dash.t <= 0 && Math.floor(g.time * 20) % 2 === 0 && g.state === 'playing') return;
    const moving = Math.abs(p.vx) + Math.abs(p.vy) > 1;
    const frame = moving ? 1 + (Math.floor(g.time * 8) % 2) : 0;
    const flip = Math.cos(p.facing) < 0;
    const spr = P.playerSprite(ch.id, frame, flip);
    const cx = q(p.x);
    const feet = q(p.y + p.r * 0.9);
    L.fillStyle = 'rgba(0,0,0,0.4)';
    L.fillRect(cx - 3, feet, 7, 1);
    if (p.hurtFlash > 0) L.filter = 'sepia(1) saturate(6) hue-rotate(-40deg)';
    P.blit(L, spr, qh(p.x) - P.dw(spr) / 2, feet - P.dh(spr) + 1);
    L.filter = 'none';
    // mira de dirección
    L.fillStyle = ch.accent;
    L.fillRect(cx + Math.round(Math.cos(p.facing) * 7), q(p.y) + Math.round(Math.sin(p.facing) * 7), 1, 1);
  };

  // ---------------- proyectiles ----------------
  proto.pxProjectiles = function () {
    const g = this.game;
    const L = this.lctx;
    for (const pr of g.room.projectiles) {
      const x = q(pr.x);
      const y = q(pr.y);
      const r = Math.max(1, Math.round(pr.r / S));
      if (pr.owner === 'enemy') {
        const o = P.orb ? P.orb(pr.color, r) : null;
        if (o) P.blit(L, o, qh(pr.x) - P.dw(o) / 2, qh(pr.y) - P.dh(o) / 2);
        else {
          L.fillStyle = pr.color;
          L.fillRect(x - r, y - r, r * 2 + 1, r * 2 + 1);
        }
        continue;
      }
      const a = Math.atan2(pr.vy, pr.vx);
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const fx = pr.x / S;
      const fy = pr.y / S;
      if (pr.style === 'crescent') {
        // media luna cortante con estela
        glowArc(L, fx - cos * r * 0.4, fy - sin * r * 0.4, r + 1, a - 1.1, a + 1.1, pr.color, Math.max(1, r * 0.5));
        L.globalAlpha = 0.35;
        glowArc(L, fx - cos * (r * 0.4 + 2), fy - sin * (r * 0.4 + 2), r + 0.5, a - 0.9, a + 0.9, pr.color, 0.5);
        L.globalAlpha = 1;
      } else if (pr.style === 'blade') {
        // cuchilla de viento: rayita brillante con estela
        L.globalAlpha = 0.4;
        line(L, fx - cos * 6, fy - sin * 6, fx - cos * 2, fy - sin * 2, pr.color, 0.5);
        L.globalAlpha = 1;
        glowLine(L, fx - cos * 2.5, fy - sin * 2.5, fx + cos * 2.5, fy + sin * 2.5, pr.color, 1);
      } else if (pr.style === 'spear') {
        glowLine(L, fx - cos * 5, fy - sin * 5, fx + cos * 2, fy + sin * 2, pr.color, 1);
        // punta en rombo
        L.fillStyle = '#ffffff';
        L.beginPath();
        L.moveTo(fx + cos * 4.5, fy + sin * 4.5);
        L.lineTo(fx + cos * 2 - sin * 1.2, fy + sin * 2 + cos * 1.2);
        L.lineTo(fx + cos * 2 + sin * 1.2, fy + sin * 2 - cos * 1.2);
        L.closePath();
        L.fill();
      } else if (P.orb && P.orb(pr.color, r)) {
        const o = P.orb(pr.color, r);
        P.blit(L, o, qh(pr.x) - P.dw(o) / 2, qh(pr.y) - P.dh(o) / 2);
      } else {
        L.fillStyle = pr.color;
        L.fillRect(x - r, y - r, r * 2, r * 2);
        L.fillStyle = 'rgba(255,255,255,0.8)';
        L.fillRect(x - r, y - r, 1, 1);
      }
    }
  };

  // ---------------- efectos ----------------
  proto.pxEffects = function () {
    const g = this.game;
    const L = this.lctx;
    for (const f of g.effects) {
      const k = f.t / f.life;
      L.globalAlpha = Math.max(0, 1 - k);
      const x = q(f.x);
      const y = q(f.y);
      if (f.type === 'slash') {
        // tajo: medialuna gruesa que se abre, con filo blanco y una estela atrás
        const rr = (f.range * (0.75 + 0.25 * k)) / S;
        const a0 = f.angle - f.arc / 2;
        const a1 = f.angle + f.arc / 2;
        const sweep = Math.min(1, k * 2.2); // el corte avanza de un lado al otro
        const end = a0 + (a1 - a0) * sweep;
        L.globalAlpha = Math.max(0, 1 - k) * 0.35;
        glowArc(L, x, y, rr - 2, a0, end, f.color, 1);
        L.globalAlpha = Math.max(0, 1 - k);
        glowArc(L, x, y, rr, a0, end, f.color, k < 0.4 ? 2.5 : 1.5);
        // chispa en la punta del corte
        if (k < 0.6) star4(L, x + Math.cos(end) * rr, y + Math.sin(end) * rr, 3, f.color);
      } else if (f.type === 'thrust') {
        glowLine(L, x, y, q(f.x2), q(f.y2), f.color, Math.max(1, f.width / S / 2));
        if (k < 0.5) star4(L, q(f.x2), q(f.y2), 4, f.color);
      } else if (f.type === 'ring') {
        // onda expansiva doble
        const rr = (f.r0 + (f.r1 - f.r0) * k) / S;
        glowRing(L, x, y, rr, f.color, Math.max(1, (f.width || 4) / S));
        L.globalAlpha = Math.max(0, 1 - k) * 0.4;
        ring(L, x, y, rr * 0.8, f.color, 0.5);
      } else if (f.type === 'burst') {
        // explosión: tramado + núcleo brillante + rayos
        const rr = (f.r * (1 + k * 0.3)) / S;
        ditherCircle(L, x, y, rr, f.color);
        L.globalAlpha = Math.max(0, 1 - k * 1.5);
        L.fillStyle = '#ffffff';
        L.beginPath();
        L.arc(x, y, Math.max(0.5, rr * 0.2 * (1 - k)), 0, TAU);
        L.fill();
        L.globalAlpha = Math.max(0, 1 - k);
        ring(L, x, y, rr, '#ffffff', 0.5); // borde brillante
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + f.t;
          line(L, x + Math.cos(a) * rr * 0.3, y + Math.sin(a) * rr * 0.3, x + Math.cos(a) * rr * (0.75 + k * 0.4), y + Math.sin(a) * rr * (0.75 + k * 0.4), '#fff4d0', 0.5);
        }
      } else if (f.type === 'lineFlash') {
        glowLine(L, x, y, q(f.x2), q(f.y2), f.color, Math.max(1, f.width / S));
      } else if (f.type === 'bolt') {
        // rayo zigzag con ramitas
        const x2 = q(f.x2);
        const y2 = q(f.y2);
        const pts = [[x, y]];
        for (let i = 1; i < 6; i++) pts.push([x + (x2 - x) * (i / 6) + (Math.random() - 0.5) * 6, y + (y2 - y) * (i / 6) + (Math.random() - 0.5) * 6]);
        pts.push([x2, y2]);
        for (let i = 0; i < pts.length - 1; i++) glowLine(L, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], f.color, 1);
        const b = pts[2];
        line(L, b[0], b[1], b[0] + (Math.random() - 0.5) * 10, b[1] + (Math.random() - 0.5) * 10, f.color, 0.5);
        star4(L, x2, y2, 4, f.color);
      } else if (f.type === 'spark') {
        star4(L, x + (q(f.tx) - x) * k, y + (q(f.ty) - y) * k, 2.5, f.color);
      }
    }
    L.globalAlpha = 1;
  };

  proto.pxParticles = function () {
    const L = this.lctx;
    for (const p of this.game.particles) {
      const k = p.t / p.life;
      L.globalAlpha = Math.max(0, 1 - k);
      L.fillStyle = k < 0.25 ? '#ffffff' : p.color;
      // al principio 1 píxel grande, después medio (en HD)
      const sz = k < 0.5 && p.size > 3.5 ? 1 : 0.5;
      L.fillRect(Math.round((p.x / S) * 2) / 2, Math.round((p.y / S) * 2) / 2, sz, sz);
    }
    L.globalAlpha = 1;
  };
})(typeof window !== 'undefined' ? window : globalThis);
