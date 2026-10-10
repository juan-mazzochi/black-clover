/*
 * Inteligencia de los enemigos y biblioteca de ataques de élites y jefes.
 * Los ataques (fan, radial, charge, spikes...) se configuran en data.js.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});
  const U = BC.U;

  function moveToward(e, tx, ty, speed, dt) {
    const n = U.norm(tx - e.x, ty - e.y);
    e.x += n.x * speed * dt;
    e.y += n.y * speed * dt;
    return n;
  }

  function enemyShot(g, e, ang, o) {
    g.spawnProjectile({
      x: e.x + Math.cos(ang) * e.r,
      y: e.y + Math.sin(ang) * e.r,
      vx: Math.cos(ang) * o.speed,
      vy: Math.sin(ang) * o.speed,
      r: o.radius || 8,
      damage: (o.damage || 10) * e.dmgMult,
      owner: 'enemy', by: e.name,
      color: o.color || '#ff6060',
      life: o.life || 3,
      homing: o.homing || 0,
      slowOnHit: o.slowOnHit || 0,
      magic: true,
    });
  }

  // Movimiento genérico usado por las fases de élites y jefes
  function patternMove(g, e, mode, dt, speed, ph) {
    const p = g.player;
    const d = U.dist(e.x, e.y, p.x, p.y);
    if (mode === 'chase') {
      if (d > e.r + p.r) moveToward(e, p.x, p.y, speed, dt);
    } else if (mode === 'keepDistance') {
      const want = ph.keepDistance || 250;
      if (d > want + 40) moveToward(e, p.x, p.y, speed, dt);
      else if (d < want - 40) moveToward(e, p.x, p.y, -speed, dt);
      else strafe(g, e, p, speed * 0.6, dt);
    } else if (mode === 'strafe') {
      if (d > 320) moveToward(e, p.x, p.y, speed, dt);
      else if (d < 160) moveToward(e, p.x, p.y, -speed, dt);
      else strafe(g, e, p, speed, dt);
    }
  }

  function strafe(g, e, p, speed, dt) {
    if (e.st.strafeDir === undefined) e.st.strafeDir = g.rng.float() < 0.5 ? 1 : -1;
    const a = Math.atan2(e.y - p.y, e.x - p.x) + Math.PI / 2;
    e.x += Math.cos(a) * speed * e.st.strafeDir * dt;
    e.y += Math.sin(a) * speed * e.st.strafeDir * dt;
    e.st.strafeT = (e.st.strafeT || 0) + dt;
    if (e.st.strafeT > 2.5) {
      e.st.strafeT = 0;
      e.st.strafeDir *= -1;
    }
  }

  // ---------------------------------------------------------------------
  // ATAQUES DE ÉLITES Y JEFES
  //  start: se llama al empezar el ataque
  //  update: devuelve true cuando el ataque terminó
  // ---------------------------------------------------------------------
  const ATTACKS = {
    charge: {
      start(g, e, a, s) {
        s.left = a.chain || 1;
        ATTACKS.charge.aim(g, e, a, s, a.windup);
      },
      aim(g, e, a, s, windup) {
        const p = g.player;
        s.stage = 'windup';
        s.t = 0;
        s.windup = windup;
        s.ang = Math.atan2(p.y - e.y, p.x - e.x);
        e.windup = windup;
        const len = a.speed * a.duration;
        g.spawnZone({ kind: 'warnLine', owner: 'enemy', by: e.name, x: e.x, y: e.y, x2: e.x + Math.cos(s.ang) * len, y2: e.y + Math.sin(s.ang) * len, width: e.r * 2, duration: windup, delay: windup, color: '#ff4040' });
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        if (s.stage === 'windup') {
          if (s.t >= s.windup) {
            s.stage = 'dash';
            s.t = 0;
            e.charging = true;
            e.chargeHit = false;
            e.chargeDamage = a.damage * e.dmgMult;
            g.sfx('charge');
          }
          return false;
        }
        e.x += Math.cos(s.ang) * a.speed * dt;
        e.y += Math.sin(s.ang) * a.speed * dt;
        const b = g.bounds;
        const hitWall = e.x < b.x1 + e.r || e.x > b.x2 - e.r || e.y < b.y1 + e.r || e.y > b.y2 - e.r;
        if (Math.random() < 0.7) g.particle(e.x, e.y, e.color, 1, 60, 0.4);
        if (s.t >= a.duration || hitWall) {
          e.charging = false;
          if (hitWall) g.shake(5);
          if (a.endNova) g.spawnZone({ kind: 'nova', owner: 'enemy', by: e.name, x: e.x, y: e.y, radius: 0, maxRadius: a.endNova.maxRadius, speed: a.endNova.speed, damage: a.endNova.damage * e.dmgMult, color: e.color, duration: 3 });
          s.left--;
          if (s.left > 0) {
            ATTACKS.charge.aim(g, e, a, s, a.windup * 0.6);
            return false;
          }
          return true;
        }
        return false;
      },
    },

    fan: {
      start(g, e, a, s) {
        s.t = 0;
        s.n = 0;
        s.next = a.windup || 0.3;
        e.windup = s.next;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        if (s.t >= s.next) {
          const p = g.player;
          const base = Math.atan2(p.y - e.y, p.x - e.x);
          const n = a.count;
          const spread = ((a.spread || 40) * Math.PI) / 180;
          for (let i = 0; i < n; i++) {
            const ang = base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
            enemyShot(g, e, ang, a);
          }
          g.sfx('enemyShot');
          s.n++;
          s.next += a.repeatDelay || 0.3;
          if (s.n >= (a.repeat || 1)) return true;
        }
        return false;
      },
    },

    radial: {
      start(g, e, a, s) {
        s.t = 0;
        s.n = 0;
        s.next = a.windup || 0.3;
        s.off = g.rng.float() * Math.PI * 2;
        e.windup = s.next;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        if (s.t >= s.next) {
          const off = s.off + ((s.n * (a.rotate || 0)) * Math.PI) / 180;
          for (let i = 0; i < a.count; i++) enemyShot(g, e, off + (i / a.count) * Math.PI * 2, a);
          g.sfx('enemyShot');
          s.n++;
          s.next += a.repeatDelay || 0.4;
          if (s.n >= (a.repeat || 1)) return true;
        }
        return false;
      },
    },

    spiral: {
      start(g, e, a, s) {
        s.t = 0;
        s.emit = 0;
        s.ang = g.rng.float() * Math.PI * 2;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        s.emit -= dt;
        s.ang += a.rotSpeed * dt;
        if (s.emit <= 0) {
          s.emit = a.rate;
          for (let i = 0; i < a.arms; i++) enemyShot(g, e, s.ang + (i / a.arms) * Math.PI * 2, a);
        }
        return s.t >= a.duration;
      },
    },

    aimed: {
      start(g, e, a, s) {
        s.t = 0;
        s.n = 0;
        s.next = a.windup || 0.3;
        e.windup = s.next;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        if (s.t >= s.next) {
          const p = g.player;
          // apunta un poco adelante del jugador
          const lead = 0.25;
          const ang = Math.atan2(p.y + p.vy * lead - e.y, p.x + p.vx * lead - e.x);
          enemyShot(g, e, ang, a);
          g.sfx('enemyShot');
          s.n++;
          s.next += a.burstDelay || 0.15;
          if (s.n >= (a.count || 1)) return true;
        }
        return false;
      },
    },

    spikes: {
      start(g, e, a, s) {
        const p = g.player;
        for (let i = 0; i < a.count; i++) {
          let x = p.x;
          let y = p.y;
          if (i > 0) {
            const ang = g.rng.float() * Math.PI * 2;
            const d = g.rng.range(a.radius, a.spread);
            x += Math.cos(ang) * d;
            y += Math.sin(ang) * d;
          }
          const c = g.clampToArena(x, y, a.radius * 0.5);
          const delay = a.delay + i * (a.stagger || 0);
          g.spawnZone({ kind: 'telegraphCircle', owner: 'enemy', by: e.name, x: c.x, y: c.y, r: a.radius, delay, duration: delay + 0.3, damage: a.damage * e.dmgMult, color: a.color || '#ff4040' });
        }
        s.t = 0;
        e.windup = 0.4;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        return s.t > 0.4;
      },
    },

    rain: {
      start(g, e, a, s) {
        const b = g.bounds;
        for (let i = 0; i < a.count; i++) {
          const x = g.rng.range(b.x1 + a.radius, b.x2 - a.radius);
          const y = g.rng.range(b.y1 + a.radius, b.y2 - a.radius);
          const delay = a.delay + g.rng.float() * a.duration;
          g.spawnZone({ kind: 'telegraphCircle', owner: 'enemy', by: e.name, x, y, r: a.radius, delay, duration: delay + 0.3, damage: a.damage * e.dmgMult, color: a.color || '#ff4040' });
        }
        // uno siempre cae sobre el jugador
        const p = g.player;
        g.spawnZone({ kind: 'telegraphCircle', owner: 'enemy', by: e.name, x: p.x, y: p.y, r: a.radius, delay: a.delay, duration: a.delay + 0.3, damage: a.damage * e.dmgMult, color: a.color || '#ff4040' });
        s.t = 0;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        return s.t > 0.5;
      },
    },

    line: {
      start(g, e, a, s) {
        const p = g.player;
        const base = Math.atan2(p.y - e.y, p.x - e.x);
        const n = a.count || 1;
        const spread = ((a.angleSpread || 30) * Math.PI) / 180;
        for (let i = 0; i < n; i++) {
          const ang = base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
          g.spawnZone({
            kind: 'telegraphLine', owner: 'enemy', by: e.name, x: e.x, y: e.y,
            x2: e.x + Math.cos(ang) * a.length, y2: e.y + Math.sin(ang) * a.length,
            width: a.width, delay: a.windup, duration: a.windup + 0.3, damage: a.damage * e.dmgMult, color: a.color || '#ff4040',
          });
        }
        s.t = 0;
        e.windup = a.windup;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        return s.t >= a.windup + 0.15;
      },
    },

    summon: {
      start(g, e, a, s) {
        e.minions = (e.minions || []).filter((m) => !m.dead);
        const room = Math.max(0, (a.max || 6) - e.minions.length);
        const n = Math.min(a.count, room);
        for (let i = 0; i < n; i++) {
          const ang = (i / Math.max(1, n)) * Math.PI * 2;
          const c = g.clampToArena(e.x + Math.cos(ang) * 70, e.y + Math.sin(ang) * 70, 20);
          g.queueSpawn(a.enemy, c.x, c.y, { owner: e, telegraph: 0.6 });
        }
        s.t = 0;
        e.windup = 0.5;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        return s.t > 0.5;
      },
    },

    teleport: {
      start(g, e, a, s) {
        s.t = 0;
        s.moved = false;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        if (s.t < 0.3) e.alpha = 1 - s.t / 0.3;
        else if (!s.moved) {
          s.moved = true;
          const p = g.player;
          const ang = g.rng.float() * Math.PI * 2;
          const d = g.rng.range(a.minDist || 180, a.maxDist || 280);
          const c = g.clampToArena(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d, e.r + 10);
          g.particle(e.x, e.y, e.color, 10, 150, 0.4);
          e.x = c.x;
          e.y = c.y;
          g.particle(e.x, e.y, e.color, 10, 150, 0.4);
        } else e.alpha = Math.min(1, (s.t - 0.3) / 0.3);
        if (s.t >= 0.6) {
          e.alpha = 1;
          return true;
        }
        return false;
      },
    },

    gravityWell: {
      start(g, e, a, s) {
        const p = g.player;
        for (let i = 0; i < a.count; i++) {
          let x = p.x;
          let y = p.y;
          if (i > 0) {
            const ang = g.rng.float() * Math.PI * 2;
            const d = g.rng.range(a.radius, a.spread);
            x += Math.cos(ang) * d;
            y += Math.sin(ang) * d;
          }
          const c = g.clampToArena(x, y, a.radius * 0.5);
          g.spawnZone({ kind: 'gravityWell', owner: 'enemy', by: e.name, x: c.x, y: c.y, r: a.radius, delay: a.delay, duration: a.delay + a.duration, slow: a.slow, dps: a.dps * e.dmgMult, pull: a.pull, tickRate: 0.5, color: a.color || '#6a3aff' });
        }
        s.t = 0;
        e.windup = 0.4;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        return s.t > 0.5;
      },
    },

    pull: {
      start(g, e, a, s) {
        s.t = 0;
        e.windup = a.duration;
        e.pulling = true;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        const p = g.player;
        const n = U.norm(e.x - p.x, e.y - p.y);
        if (n.l > e.r + p.r + 10) {
          p.pullX += n.x * a.strength;
          p.pullY += n.y * a.strength;
        }
        if (Math.random() < 0.6) {
          const ang = g.rng.float() * Math.PI * 2;
          g.addEffect({ type: 'spark', x: e.x + Math.cos(ang) * 260, y: e.y + Math.sin(ang) * 260, tx: e.x, ty: e.y, life: 0.5, color: '#9a7bff' });
        }
        if (s.t >= a.duration) {
          e.pulling = false;
          if (a.then) {
            const t = a.then;
            g.spawnZone({ kind: 'nova', owner: 'enemy', by: e.name, x: e.x, y: e.y, radius: 0, maxRadius: t.maxRadius, speed: t.speed, damage: t.damage * e.dmgMult, color: '#9a7bff', duration: 3 });
          }
          return true;
        }
        return false;
      },
    },

    nova: {
      start(g, e, a, s) {
        s.t = 0;
        e.windup = a.windup || 0.4;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        if (s.t >= (a.windup || 0.4)) {
          g.spawnZone({ kind: 'nova', owner: 'enemy', by: e.name, x: e.x, y: e.y, radius: 0, maxRadius: a.maxRadius, speed: a.speed, damage: a.damage * e.dmgMult, color: a.color || e.color, duration: 3 });
          g.sfx('nova');
          return true;
        }
        return false;
      },
    },

    shield: {
      start(g, e, a) {
        e.shield = Math.max(e.shield, a.amount);
        e.maxShield = Math.max(e.maxShield || 0, e.shield);
        g.addEffect({ type: 'ring', x: e.x, y: e.y, r0: e.r, r1: e.r + 30, life: 0.4, color: '#bdf8ff', width: 6 });
      },
      update() {
        return true;
      },
    },

    // Detiene el tiempo: el jugador queda casi inmóvil y después llueven proyectiles
    timeStop: {
      start(g, e, a, s) {
        s.t = 0;
        s.fired = false;
        const p = g.player;
        p.slowT = a.duration;
        p.slowAmt = a.slow;
        e.windup = a.duration;
        g.addEffect({ type: 'ring', x: p.x, y: p.y, r0: 400, r1: 20, life: a.duration, color: '#d8c7ff', width: 6 });
        g.shake(6);
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        if (s.t >= a.duration && !s.fired) {
          s.fired = true;
          const t = a.then;
          const off = g.rng.float() * Math.PI * 2;
          for (let i = 0; i < t.count; i++) enemyShot(g, e, off + (i / t.count) * Math.PI * 2, t);
          g.sfx('nova');
        }
        return s.t >= a.duration + 0.2;
      },
    },

    portalVolley: {
      start(g, e, a, s) {
        const p = g.player;
        const off = g.rng.float() * Math.PI * 2;
        for (let i = 0; i < a.count; i++) {
          const ang = off + (i / a.count) * Math.PI * 2;
          const c = g.clampToArena(p.x + Math.cos(ang) * a.radius, p.y + Math.sin(ang) * a.radius, 10);
          g.spawnZone({ kind: 'portal', owner: 'enemy', by: e.name, x: c.x, y: c.y, r: 18, delay: a.windup + i * 0.05, duration: a.windup + 1, speed: a.speed, damage: a.damage * e.dmgMult, color: a.color || '#b28cff' });
        }
        s.t = 0;
        e.windup = 0.4;
      },
      update(g, e, a, s, dt) {
        s.t += dt;
        return s.t > 0.4;
      },
    },
  };

  // ---------------------------------------------------------------------
  // IA por tipo de comportamiento
  // ---------------------------------------------------------------------
  const AI = {
    chase(g, e, dt, speed) {
      const p = g.player;
      if (U.dist2(e.x, e.y, p.x, p.y) > (e.r + p.r - 2) ** 2) moveToward(e, p.x, p.y, speed, dt);
    },

    ranged(g, e, dt, speed) {
      const p = g.player;
      const d = e.def;
      const dist = U.dist(e.x, e.y, p.x, p.y);
      if (dist > d.range * 0.9) moveToward(e, p.x, p.y, speed, dt);
      else if (dist < d.range * 0.5) moveToward(e, p.x, p.y, -speed, dt);
      else strafe(g, e, p, speed * 0.5, dt);
      if (e.st.fire === undefined) e.st.fire = 0.8 + g.rng.float() * d.fireRate;
      e.st.fire -= dt;
      if (e.st.fire < 0.35 && dist < d.range * 1.15) e.windup = e.st.fire;
      if (e.st.fire <= 0) {
        e.st.fire = d.fireRate * (0.85 + g.rng.float() * 0.3);
        if (dist < d.range * 1.15) {
          const pr = d.projectile;
          const base = Math.atan2(p.y - e.y, p.x - e.x);
          const n = pr.count || 1;
          const spread = ((pr.spread || 0) * Math.PI) / 180;
          for (let i = 0; i < n; i++) enemyShot(g, e, base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), pr);
          g.sfx('enemyShot');
        }
      }
    },

    charger(g, e, dt, speed) {
      const p = g.player;
      const d = e.def;
      const st = e.st;
      if (!st.mode) {
        st.mode = 'approach';
        st.cd = 1 + g.rng.float() * 1.5;
      }
      if (st.mode === 'approach') {
        st.cd -= dt;
        moveToward(e, p.x, p.y, speed, dt);
        if (st.cd <= 0 && U.dist(e.x, e.y, p.x, p.y) < 340) {
          st.mode = 'windup';
          st.t = 0;
          st.ang = Math.atan2(p.y - e.y, p.x - e.x);
          e.windup = d.windup;
          const len = d.chargeSpeed * d.chargeTime;
          g.spawnZone({ kind: 'warnLine', owner: 'enemy', by: e.name, x: e.x, y: e.y, x2: e.x + Math.cos(st.ang) * len, y2: e.y + Math.sin(st.ang) * len, width: e.r * 2, duration: d.windup, delay: d.windup, color: '#ff4040' });
        }
      } else if (st.mode === 'windup') {
        st.t += dt;
        if (st.t >= d.windup) {
          st.mode = 'charge';
          st.t = 0;
          e.charging = true;
          e.chargeHit = false;
          e.chargeDamage = e.damage * 1.3;
        }
      } else if (st.mode === 'charge') {
        st.t += dt;
        e.x += Math.cos(st.ang) * d.chargeSpeed * dt;
        e.y += Math.sin(st.ang) * d.chargeSpeed * dt;
        if (st.t >= d.chargeTime) {
          e.charging = false;
          st.mode = 'approach';
          st.cd = d.chargeCooldown;
        }
      }
    },

    caster(g, e, dt, speed) {
      const p = g.player;
      const d = e.def;
      const st = e.st;
      if (st.tp === undefined) st.tp = 1.5 + g.rng.float() * 2;
      st.tp -= dt;
      const dist = U.dist(e.x, e.y, p.x, p.y);
      if (dist < 200) moveToward(e, p.x, p.y, -speed, dt);
      else strafe(g, e, p, speed, dt);
      if (st.tp < 0.5 && !st.warned) {
        st.warned = true;
        e.windup = 0.5;
      }
      if (st.tp <= 0) {
        st.tp = d.teleportCooldown;
        st.warned = false;
        g.particle(e.x, e.y, e.color, 8, 140, 0.4);
        const ang = g.rng.float() * Math.PI * 2;
        const c = g.clampToArena(p.x + Math.cos(ang) * 260, p.y + Math.sin(ang) * 260, e.r + 10);
        e.x = c.x;
        e.y = c.y;
        g.particle(e.x, e.y, e.color, 8, 140, 0.4);
        const b = d.burst;
        const off = g.rng.float() * Math.PI;
        for (let i = 0; i < b.count; i++) enemyShot(g, e, off + (i / b.count) * Math.PI * 2, b);
        g.sfx('enemyShot');
      }
    },

    // Torreta: no se mueve, dispara cuando estás en rango
    turret(g, e, dt) {
      const p = g.player;
      const d = e.def;
      const dist = U.dist(e.x, e.y, p.x, p.y);
      if (e.st.fire === undefined) e.st.fire = 0.8 + g.rng.float() * d.fireRate;
      e.st.fire -= dt;
      if (e.st.fire < 0.35 && dist < d.range) e.windup = e.st.fire;
      if (e.st.fire <= 0) {
        e.st.fire = d.fireRate * (0.85 + g.rng.float() * 0.3);
        if (dist < d.range) {
          const pr = d.projectile;
          const base = Math.atan2(p.y - e.y, p.x - e.x);
          const n = pr.count || 1;
          const spread = ((pr.spread || 0) * Math.PI) / 180;
          for (let i = 0; i < n; i++) enemyShot(g, e, base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), pr);
          g.sfx('enemyShot');
        }
      }
    },

    // Explosivo: se acerca, se detiene y explota (círculo rojo de aviso)
    exploder(g, e, dt, speed) {
      const p = g.player;
      const d = e.def;
      const st = e.st;
      if (st.fuse === undefined) {
        moveToward(e, p.x, p.y, speed, dt);
        if (U.dist(e.x, e.y, p.x, p.y) < d.triggerRange + p.r) {
          st.fuse = d.fuse;
          e.windup = d.fuse;
          g.spawnZone({ kind: 'telegraphCircle', owner: 'enemy', by: e.name, x: e.x, y: e.y, r: d.blastRadius, delay: d.fuse, duration: d.fuse + 0.3, damage: e.damage, color: '#ff5030' });
        }
      } else {
        st.fuse -= dt;
        if (st.fuse <= 0) g.killEnemy(e);
      }
    },

    // Se teletransporta cerca del jugador cada tanto
    blinker(g, e, dt, speed) {
      const p = g.player;
      const st = e.st;
      moveToward(e, p.x, p.y, speed, dt);
      if (st.blink === undefined) st.blink = 1.5 + g.rng.float() * 2;
      st.blink -= dt;
      if (st.blink < 0.5 && !st.warn) {
        st.warn = true;
        e.windup = 0.5;
      }
      if (st.blink <= 0) {
        st.blink = e.def.blinkCooldown;
        st.warn = false;
        g.particle(e.x, e.y, e.color, 8, 140, 0.4);
        const ang = g.rng.float() * Math.PI * 2;
        const c = g.clampToArena(p.x + Math.cos(ang) * 110, p.y + Math.sin(ang) * 110, e.r + 6);
        e.x = c.x;
        e.y = c.y;
        g.particle(e.x, e.y, e.color, 8, 140, 0.4);
      }
    },

    // Quieto (se usa en tests)
    none() {},

    pattern(g, e, dt, speed) {
      const phases = e.def.phases;
      const st = e.st;
      if (st.phase === undefined) {
        st.phase = 0;
        st.atkT = 1.0;
      }
      // ¿Cambia de fase?
      const ratio = e.hp / e.maxHp;
      while (st.phase + 1 < phases.length && ratio <= phases[st.phase + 1].hpBelow) {
        st.phase++;
        enterPhase(g, e, phases[st.phase]);
      }
      const ph = phases[st.phase];
      if (e.atk) {
        if (ATTACKS[e.atk.def.type].update(g, e, e.atk.def, e.atk.s, dt)) {
          e.atk = null;
          e.windup = 0;
          const ad = ph.attackDelay || [1.2, 2];
          const speedUp = 1 + (e.boss ? g.ascMods.bossAttackSpeedPct || 0 : 0);
          st.atkT = g.rng.range(ad[0], ad[1]) / speedUp;
        }
        return;
      }
      patternMove(g, e, ph.move || 'chase', dt, speed * (ph.speedMult || 1), ph);
      st.atkT -= dt;
      if (st.atkT <= 0) {
        const a = g.rng.weighted(ph.attacks, (x) => x.weight || 1);
        const impl = ATTACKS[a.type];
        if (!impl) {
          st.atkT = 1;
          return;
        }
        e.atk = { def: a, s: {} };
        impl.start(g, e, a, e.atk.s);
      }
    },
  };

  function enterPhase(g, e, ph) {
    if (e.atk) {
      e.charging = false;
      e.pulling = false;
      e.alpha = 1;
      e.atk = null;
    }
    e.windup = 0;
    e.st.atkT = 1.2;
    e.phaseInvuln = 0.8;
    if (ph.transform) {
      Object.assign(e, { name: ph.transform.name || e.name, icon: ph.transform.icon || e.icon, color: ph.transform.color || e.color, r: ph.transform.radius || e.r });
    }
    if (ph.onEnter && ATTACKS[ph.onEnter.type]) ATTACKS[ph.onEnter.type].start(g, e, ph.onEnter, {});
    if (ph.banner) g.banner(ph.banner, e.name, 2);
    g.addEffect({ type: 'ring', x: e.x, y: e.y, r0: e.r, r1: 220, life: 0.6, color: e.color, width: 10 });
    g.shake(10);
    g.emit('bossPhase', { enemy: e, phase: ph });
  }

  // ---------------------------------------------------------------------
  // Actualización por frame de un enemigo
  // ---------------------------------------------------------------------
  function update(g, e, dt) {
    if (e.flash > 0) e.flash -= dt;
    if (e.contactCd > 0) e.contactCd -= dt;
    if (e.orbitCd > 0) e.orbitCd -= dt;
    if (e.phaseInvuln > 0) e.phaseInvuln -= dt;
    if (e.windup > 0) e.windup -= dt;
    e.sinceHit += dt;

    if (e.slowT > 0) {
      e.slowT -= dt;
      if (e.slowT <= 0) e.slowAmt = 0;
    }
    if (e.burn) {
      e.burn.t -= dt;
      e.burn.tick = (e.burn.tick || 0) - dt;
      if (e.burn.tick <= 0) {
        e.burn.tick = 0.5;
        g.hitEnemy(e, e.burn.dps * 0.5, { noCrit: true, isDot: true, color: '#ff9a3a' });
      }
      if (e.burn && e.burn.t <= 0) e.burn = null;
      if (e.dead) return;
    }
    if (e.poison) {
      e.poison.t -= dt;
      e.poison.tick = (e.poison.tick || 0) - dt;
      if (e.poison.tick <= 0) {
        e.poison.tick = 0.5;
        g.hitEnemy(e, e.poison.dps * 0.5, { noCrit: true, isDot: true, color: '#c58bff' });
      }
      if (e.poison && e.poison.t <= 0) e.poison = null;
      if (e.dead) return;
    }
    // Regeneración de Dante si nadie lo golpea
    if (e.def.regenWhenIdle && e.sinceHit > 3 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.def.regenWhenIdle * dt);

    // Empuje (knockback)
    if (e.kbx || e.kby) {
      e.x += e.kbx * dt;
      e.y += e.kby * dt;
      const decay = Math.pow(0.0005, dt);
      e.kbx *= decay;
      e.kby *= decay;
      if (Math.abs(e.kbx) < 5) e.kbx = 0;
      if (Math.abs(e.kby) < 5) e.kby = 0;
    }

    const slowMult = (1 - (e.slowAmt || 0)) * (1 - (g.player.eff.enemySlowPct || 0));
    const speed = e.speed * slowMult;
    const fn = AI[e.behavior] || AI.chase;
    fn(g, e, dt, speed);

    const b = g.bounds;
    e.x = U.clamp(e.x, b.x1 + e.r, b.x2 - e.r);
    e.y = U.clamp(e.y, b.y1 + e.r, b.y2 - e.r);

    // Daño por contacto
    const p = g.player;
    if (U.dist2(e.x, e.y, p.x, p.y) < (e.r + p.r - 2) ** 2) {
      if (e.charging && !e.chargeHit) {
        e.chargeHit = true;
        g.hurtPlayer(e.chargeDamage, { x: e.x, y: e.y, by: e.name });
      } else if (e.contactCd <= 0) {
        e.contactCd = g.data.config.contactCooldown;
        g.hurtPlayer(e.damage, { x: e.x, y: e.y, by: e.name });
      }
    }
  }

  // Separa enemigos superpuestos (para que no se apilen)
  function separate(enemies) {
    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i];
      if (a.dead) continue;
      for (let j = i + 1; j < enemies.length; j++) {
        const c = enemies[j];
        if (c.dead) continue;
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const min = a.r + c.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          const wa = a.boss ? 0.1 : 1;
          const wc = c.boss ? 0.1 : 1;
          a.x -= nx * push * wa;
          a.y -= ny * push * wa;
          c.x += nx * push * wc;
          c.y += ny * push * wc;
        }
      }
    }
  }

  BC.EnemyAI = { update, separate, ATTACKS, AI };
})(typeof window !== 'undefined' ? window : globalThis);
