/*
 * Entidades del juego: Jugador, Enemigo, Proyectil, Zona (áreas de efecto y
 * avisos de ataques) y Pickups (yules, corazones).
 */
(function (root) {
  const BC = (root.BC = root.BC || {});
  const U = BC.U;

  let UID = 1;

  // ---------------------------------------------------------------------
  // JUGADOR
  // ---------------------------------------------------------------------
  class Player {
    constructor(game) {
      this.game = game;
      this.ch = game.data.characters[game.run.characterId];
      this.r = 16;
      this.x = 640;
      this.y = 600;
      this.vx = 0;
      this.vy = 0;
      this.facing = -Math.PI / 2;
      this.mana = game.run.stats.maxMana;
      this.ult = { gauge: 0, active: false, timer: 0, total: 0 };
      this.dash = { cd: 0, t: 0, dx: 0, dy: 0, speed: 0, hit: null };
      this.invuln = 0;
      this.skillState = {};
      this.hurtStacks = []; // timers de Determinación (Asta)
      this.buffs = []; // mejoras temporales de hechizos { id, t, mods, icon }
      this.exhaust = 0;
      this.slowT = 0;
      this.slowAmt = 0;
      this.zoneSlow = 0;
      this.pullX = 0;
      this.pullY = 0;
      this.lastStandUsed = false;
      this.speech = null;
      this.hurtFlash = 0;
      this.eff = Object.assign({}, game.run.stats);
    }

    addBuff(id, duration, mods, icon) {
      const old = this.buffs.find((b) => b.id === id);
      if (old) {
        old.t = duration;
        old.mods = mods;
      } else this.buffs.push({ id, t: duration, total: duration, mods, icon });
    }

    get hp() {
      return this.game.run.hp;
    }

    say(text, dur) {
      this.speech = { text, t: 0, life: dur || 2.2 };
    }

    resetForRoom(x, y) {
      this.x = x;
      this.y = y;
      this.dash.t = 0;
      this.invuln = 1.0;
      this.lastStandUsed = false;
      this.pullX = this.pullY = 0;
      this.slowT = 0;
      for (const id in this.skillState) {
        const st = this.skillState[id];
        st.cd = Math.min(st.cd || 0, 0.6);
      }
    }

    // Estadísticas efectivas = base de la run + buffs temporales
    computeEff() {
      const run = this.game.run;
      const e = Object.assign({}, run.stats);
      if (this.ult.active) {
        const m = this.ch.ultimate.mods || {};
        e.damagePct += m.damagePct || 0;
        e.speed *= 1 + (m.speedPct || 0);
        e.cooldownMult *= 1 - (m.cooldownPct || 0);
        e.armor += m.armor || 0;
        e.manaRegen *= 1 + (m.manaRegenPct || 0);
        e.lifesteal += m.lifesteal || 0;
      }
      if (this.ch.trait.id === 'determinacion' && this.hurtStacks.length) {
        e.damagePct += this.hurtStacks.length * this.ch.trait.perStack;
      }
      if (this.ch.trait.id === 'versatil') {
        // un estilo por cada personaje distinto del que aprendiste habilidades
        const schools = new Set();
        for (const id in run.inventory.skills) {
          const owner = this.game.data.skills[id].character;
          if (owner && owner !== this.ch.id) schools.add(owner); // las elementales no cuentan
        }
        e.damagePct += schools.size * this.ch.trait.perSchool;
        this.schools = schools.size;
      }
      for (const bf of this.buffs) {
        const m = bf.mods;
        e.armor += m.armor || 0;
        e.speed *= 1 + (m.speedPct || 0);
        e.evasion = Math.min(0.6, e.evasion + (m.evasion || 0));
        e.damagePct += m.damagePct || 0;
        e.regen += m.regen || 0;
      }
      if (this.exhaust > 0) e.speed *= 1 - this.ch.ultimate.exhaustSlow;
      if (this.slowT > 0) e.speed *= 1 - this.slowAmt;
      if (this.zoneSlow > 0) e.speed *= 1 - this.zoneSlow;
      this.eff = e;
      return e;
    }

    update(dt) {
      const g = this.game;
      const run = g.run;
      const cfg = g.data.config;
      const eff = this.computeEff();
      this.zoneSlow = 0;

      if (this.invuln > 0) this.invuln -= dt;
      if (this.dash.cd > 0) this.dash.cd -= dt;
      if (this.slowT > 0) this.slowT -= dt;
      if (this.exhaust > 0) this.exhaust -= dt;
      if (this.hurtFlash > 0) this.hurtFlash -= dt;
      if (this.speech) {
        this.speech.t += dt;
        if (this.speech.t > this.speech.life) this.speech = null;
      }
      if (this.buffs.length) {
        for (const bf of this.buffs) bf.t -= dt;
        this.buffs = this.buffs.filter((bf) => bf.t > 0);
      }
      if (this.hurtStacks.length) {
        for (let i = this.hurtStacks.length - 1; i >= 0; i--) {
          this.hurtStacks[i] -= dt;
          if (this.hurtStacks[i] <= 0) this.hurtStacks.splice(i, 1);
        }
      }

      if (this.ch.usesMana) this.mana = Math.min(eff.maxMana, this.mana + eff.manaRegen * dt);
      if (eff.regen > 0 && run.hp < eff.maxHp) run.hp = Math.min(eff.maxHp, run.hp + eff.regen * dt);

      // Movimiento
      const inp = g.input;
      const mv = U.norm(inp.mx || 0, inp.my || 0);
      if (this.dash.t > 0) {
        this.dash.t -= dt;
        this.x += this.dash.dx * this.dash.speed * dt;
        this.y += this.dash.dy * this.dash.speed * dt;
        if (eff.dashDamage > 0) {
          for (const e of g.room.enemies) {
            if (e.dead || this.dash.hit.has(e.uid)) continue;
            if (U.dist2(this.x, this.y, e.x, e.y) < (this.r + e.r + 6) ** 2) {
              this.dash.hit.add(e.uid);
              g.hitEnemy(e, eff.dashDamage, { knockback: 120, fromX: this.x, fromY: this.y, source: 'dash' });
              if (eff.dashBurn) e.burn = { dps: 10, t: 3 };
            }
          }
        }
        if (Math.random() < 0.6) g.particle(this.x, this.y, this.ch.accent, 1, 40, 0.3);
      } else {
        if (inp.dash && this.dash.cd <= 0 && mv.l > 0) {
          this.dash.t = cfg.dash.duration;
          this.dash.dx = mv.x;
          this.dash.dy = mv.y;
          this.dash.speed = cfg.dash.distance / cfg.dash.duration;
          this.dash.cd = eff.dashCooldown;
          this.dash.hit = new Set();
          run.track.dashes++;
          this.invuln = Math.max(this.invuln, cfg.dash.invuln);
          if (this.ch.trait.manaOnDash) this.mana = Math.min(eff.maxMana, this.mana + this.ch.trait.manaOnDash);
          g.sfx('dash');
        }
        this.vx = mv.x * eff.speed;
        this.vy = mv.y * eff.speed;
        this.x += (this.vx + this.pullX) * dt;
        this.y += (this.vy + this.pullY) * dt;
      }
      inp.dash = false;
      this.pullX = this.pullY = 0;
      if (mv.l > 0) this.facing = Math.atan2(mv.y, mv.x);

      const b = g.bounds;
      this.x = U.clamp(this.x, b.x1 + this.r, b.x2 - this.r);
      this.y = U.clamp(this.y, b.y1 + this.r, b.y2 - this.r);

      BC.Skills.update(g, this, dt);
      BC.Skills.updateUltimate(g, this, dt);
    }
  }

  // ---------------------------------------------------------------------
  // ENEMIGO (la IA está en enemies.js)
  // ---------------------------------------------------------------------
  class Enemy {
    constructor(id, def, x, y, scale) {
      this.uid = UID++;
      this.id = id;
      this.def = def;
      this.name = def.name;
      this.icon = def.icon;
      this.color = def.color;
      this.x = x;
      this.y = y;
      this.r = def.radius || 15;
      this.maxHp = Math.round(def.hp * scale.hp);
      this.hp = this.maxHp;
      this.armor = def.armor || 0;
      this.speed = (def.speed || 80) * scale.speed;
      this.dmgMult = scale.dmg;
      this.damage = (def.damage || 8) * scale.dmg;
      this.behavior = def.behavior;
      this.elite = !!def.elite;
      this.boss = !!def.boss;
      this.st = {}; // estado de la IA
      this.slowT = 0;
      this.slowAmt = 0;
      this.burn = null;
      this.kbx = 0;
      this.kby = 0;
      this.flash = 0;
      this.contactCd = 0;
      this.shield = 0;
      this.dead = false;
      this.alpha = 1;
      this.orbitCd = 0;
      this.sinceHit = 99;
      this.windup = 0; // >0 => está cargando un ataque (se dibuja un brillo)
    }
  }

  // ---------------------------------------------------------------------
  // PROYECTIL
  // ---------------------------------------------------------------------
  class Projectile {
    constructor(o) {
      this.uid = UID++;
      Object.assign(
        this,
        {
          r: 8,
          damage: 10,
          owner: 'enemy',
          pierce: 0,
          life: 2,
          color: '#fff',
          style: 'orb',
          magic: true,
          antimagic: false,
          splash: 0,
          splashPct: 0,
          homing: 0,
          slowOnHit: 0,
          knockback: 60,
          dead: false,
          t: 0,
        },
        o
      );
      this.hit = new Set();
    }

    checkBounds(g) {
      const b = g.bounds;
      if (this.life <= 0 || this.x < b.x1 - 40 || this.x > b.x2 + 40 || this.y < b.y1 - 40 || this.y > b.y2 + 40) this.dead = true;
    }

    update(dt, g) {
      this.t += dt;
      this.life -= dt;
      if (this.homing) {
        // los del jugador persiguen al enemigo más cercano; los enemigos, al jugador
        const p = this.owner === 'enemy' ? g.player : g.findNearestEnemy(this.x, this.y, 320);
        if (!p) {
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          return this.checkBounds(g);
        }
        const want = Math.atan2(p.y - this.y, p.x - this.x);
        const cur = Math.atan2(this.vy, this.vx);
        const sp = Math.hypot(this.vx, this.vy);
        const na = cur + U.clamp(U.angleDiff(cur, want), -this.homing * dt, this.homing * dt);
        this.vx = Math.cos(na) * sp;
        this.vy = Math.sin(na) * sp;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.checkBounds(g);
      if (this.dead) return;

      if (this.owner === 'player') {
        for (const e of g.room.enemies) {
          if (e.dead || e.untargetable || this.hit.has(e.uid)) continue;
          if (U.dist2(this.x, this.y, e.x, e.y) < (this.r + e.r) ** 2) {
            this.hit.add(e.uid);
            g.hitEnemy(e, this.damage, { knockback: this.knockback, fromX: this.x - this.vx, fromY: this.y - this.vy, source: this.skillId });
            if (this.burn && !e.dead) e.burn = { dps: this.burn, t: 3, tick: e.burn ? e.burn.tick : 0.5 };
            if (this.poison && !e.dead) e.poison = { dps: this.poison, t: 4, tick: e.poison ? e.poison.tick : 0.5 };
            if (this.slowOnHit && !e.dead) {
              e.slowT = Math.max(e.slowT || 0, this.slowTime || 1.5);
              e.slowAmt = Math.max(e.slowAmt || 0, this.slowOnHit);
            }
            if (this.splash > 0) {
              for (const o of g.room.enemies) {
                if (o === e || o.dead) continue;
                if (U.dist2(this.x, this.y, o.x, o.y) < (this.splash + o.r) ** 2) g.hitEnemy(o, this.damage * this.splashPct, { noCrit: true, source: this.skillId });
              }
              g.addEffect({ type: 'ring', x: this.x, y: this.y, r0: 6, r1: this.splash, life: 0.25, color: this.color });
            }
            if (this.pierce <= 0) {
              this.dead = true;
              g.particle(this.x, this.y, this.color, 5, 120, 0.3);
              return;
            }
            this.pierce--;
          }
        }
        if (this.antimagic) {
          let n = 0;
          for (const q of g.room.projectiles) {
            if (q.owner !== 'enemy' || q.dead || !q.magic) continue;
            if (U.dist2(this.x, this.y, q.x, q.y) < (this.r + q.r) ** 2) {
              q.dead = true;
              n++;
            }
          }
          if (n) g.onAntimagic(n, this.x, this.y);
        }
      } else {
        const p = g.player;
        if (U.dist2(this.x, this.y, p.x, p.y) < (this.r + p.r - 3) ** 2) {
          this.dead = true;
          const hurt = g.hurtPlayer(this.damage, { projectile: true, magic: this.magic, x: this.x, y: this.y, by: this.by });
          if (hurt && this.slowOnHit) {
            p.slowT = 1.5;
            p.slowAmt = this.slowOnHit;
          }
          g.particle(this.x, this.y, this.color, 6, 140, 0.3);
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // ZONA: áreas de efecto del jugador y avisos/peligros de enemigos
  // ---------------------------------------------------------------------
  class Zone {
    constructor(o) {
      this.uid = UID++;
      Object.assign(this, { t: 0, tickT: 0, dead: false, owner: 'player', hitSet: null }, o);
      if (!this.hitSet) this.hitSet = new Set();
    }

    update(dt, g) {
      this.t += dt;
      const fn = ZONE_UPDATE[this.kind];
      if (fn) fn(this, dt, g);
      if (this.duration !== undefined && this.t >= this.duration) this.dead = true;
    }
  }

  function tickReady(z, dt) {
    z.tickT -= dt;
    if (z.tickT <= 0) {
      z.tickT += z.tickRate || 0.25;
      return true;
    }
    return false;
  }

  const ZONE_UPDATE = {
    // --- del jugador ---
    tornado(z, dt, g) {
      const tick = tickReady(z, dt);
      for (const e of g.room.enemies) {
        if (e.dead || e.untargetable) continue;
        const d = U.dist(z.x, z.y, e.x, e.y);
        if (d < z.r + e.r) {
          if (!e.boss && d > 4) {
            const f = (z.pull * dt) / Math.max(1, e.elite ? 3 : 1);
            e.x += ((z.x - e.x) / d) * f;
            e.y += ((z.y - e.y) / d) * f;
          }
          if (tick) g.hitEnemy(e, z.damage, { noCrit: false, source: 'tornado' });
        }
      }
      if (z.blades) {
        z.bladeT = (z.bladeT || 0) - dt;
        if (z.bladeT <= 0) {
          z.bladeT = 0.6;
          for (let i = 0; i < 3; i++) {
            const a = g.rng.float() * Math.PI * 2;
            g.spawnProjectile({ x: z.x, y: z.y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, r: 8, damage: z.damage * 1.2, owner: 'player', pierce: 1, life: 0.6, color: '#c4fff0', style: 'blade', skillId: 'tornado' });
          }
        }
      }
    },
    field(z, dt, g) {
      const tick = tickReady(z, dt);
      for (const e of g.room.enemies) {
        if (e.dead || e.untargetable) continue;
        const d = U.dist(z.x, z.y, e.x, e.y);
        if (d >= z.r + e.r) continue;
        if (z.slow) {
          e.slowT = Math.max(e.slowT || 0, 0.2);
          e.slowAmt = Math.max(e.slowAmt || 0, z.slow);
        }
        if (z.pull && !e.boss && d > 4) {
          e.x += ((z.x - e.x) / d) * z.pull * dt;
          e.y += ((z.y - e.y) / d) * z.pull * dt;
        }
        if (tick) g.hitEnemy(e, z.damage, { noCrit: true, source: 'zona', burn: z.burn, poison: z.poison });
      }
    },
    dome(z, dt, g) {
      const p = g.player;
      z.x = p.x;
      z.y = p.y;
      const tick = tickReady(z, dt);
      for (const e of g.room.enemies) {
        if (e.dead || e.untargetable) continue;
        if (U.dist2(z.x, z.y, e.x, e.y) < (z.r + e.r) ** 2) {
          e.slowT = 0.15;
          e.slowAmt = Math.max(e.slowAmt || 0, z.slow);
          if (tick) g.hitEnemy(e, z.damage, { noCrit: true, source: 'cupula', poison: z.poison });
        }
      }
      for (const q of g.room.projectiles) {
        if (q.owner === 'enemy' && !q.dead && U.dist2(z.x, z.y, q.x, q.y) < z.r * z.r) {
          q.dead = true;
          g.particle(q.x, q.y, '#8fd3ff', 3, 80, 0.25);
        }
      }
    },
    beam(z, dt, g) {
      const p = g.player;
      z.x = p.x;
      z.y = p.y;
      z.x2 = p.x + Math.cos(z.angle) * z.length;
      z.y2 = p.y + Math.sin(z.angle) * z.length;
      if (!tickReady(z, dt)) return;
      for (const e of g.room.enemies) {
        if (e.dead || e.untargetable) continue;
        if (U.segDist(e.x, e.y, z.x, z.y, z.x2, z.y2) < z.width / 2 + e.r) g.hitEnemy(e, z.damage, { knockback: 30, fromX: p.x, fromY: p.y, source: 'rugidoDragon' });
      }
    },
    shockwave(z, dt, g) {
      z.radius = Math.min(z.maxRadius, z.t * z.speed);
      for (const e of g.room.enemies) {
        if (e.dead || e.untargetable || z.hitSet.has(e.uid)) continue;
        const d = U.dist(z.x, z.y, e.x, e.y);
        if (d < z.radius + e.r) {
          z.hitSet.add(e.uid);
          g.hitEnemy(e, z.damage, { knockback: z.knockback, fromX: z.x, fromY: z.y, source: 'onda' });
          if (z.slow) {
            e.slowT = Math.max(e.slowT || 0, 2);
            e.slowAmt = Math.max(e.slowAmt || 0, z.slow);
          }
        }
      }
      if (z.radius >= z.maxRadius) z.dead = true;
    },
    slam(z, dt, g) {
      if (!z.done && z.t >= z.delay) {
        z.done = true;
        for (const e of g.room.enemies) {
          if (e.dead || e.untargetable) continue;
          if (U.dist2(z.x, z.y, e.x, e.y) < (z.r + e.r) ** 2) {
            g.hitEnemy(e, z.damage, { knockback: z.knockback, fromX: z.x, fromY: z.y, source: z.source || 'meteorito' });
            if (z.slow) {
              e.slowT = Math.max(e.slowT || 0, 2);
              e.slowAmt = Math.max(e.slowAmt || 0, z.slow);
            }
          }
        }
        for (const q of g.room.projectiles) {
          if (q.owner === 'enemy' && q.magic && U.dist2(z.x, z.y, q.x, q.y) < z.r * z.r) q.dead = true;
        }
        g.addEffect({ type: 'ring', x: z.x, y: z.y, r0: 10, r1: z.r * 1.2, life: 0.4, color: '#111', width: 10 });
        g.particle(z.x, z.y, '#222', 18, 260, 0.5);
        g.shake(8);
        g.sfx('slam');
      }
    },

    // --- de enemigos ---
    warnLine() {
      // sólo visual (aviso de embestida)
    },
    telegraphCircle(z, dt, g) {
      if (!z.done && z.t >= z.delay) {
        z.done = true;
        const p = g.player;
        if (U.dist2(z.x, z.y, p.x, p.y) < (z.r + p.r * 0.6) ** 2) g.hurtPlayer(z.damage, { x: z.x, y: z.y, by: z.by });
        g.addEffect({ type: 'burst', x: z.x, y: z.y, r: z.r, life: 0.3, color: z.color });
        g.particle(z.x, z.y, z.color, 8, 160, 0.4);
        z.duration = z.t + 0.05;
      }
    },
    telegraphLine(z, dt, g) {
      if (!z.done && z.t >= z.delay) {
        z.done = true;
        const p = g.player;
        if (U.segDist(p.x, p.y, z.x, z.y, z.x2, z.y2) < z.width / 2 + p.r * 0.6) g.hurtPlayer(z.damage, { x: p.x, y: p.y, by: z.by });
        g.addEffect({ type: 'lineFlash', x: z.x, y: z.y, x2: z.x2, y2: z.y2, width: z.width, life: 0.3, color: z.color });
        g.shake(4);
        z.duration = z.t + 0.05;
      }
    },
    gravityWell(z, dt, g) {
      if (z.t < z.delay) return;
      const p = g.player;
      const d = U.dist(z.x, z.y, p.x, p.y);
      if (d < z.r + p.r) {
        p.zoneSlow = Math.max(p.zoneSlow, z.slow);
        if (d > 4) {
          p.pullX += ((z.x - p.x) / d) * z.pull;
          p.pullY += ((z.y - p.y) / d) * z.pull;
        }
        if (tickReady(z, dt)) g.hurtPlayer(z.dps * (z.tickRate || 0.5), { x: z.x, y: z.y, dot: true, by: z.by });
      }
    },
    nova(z, dt, g) {
      if (z.t < (z.delay || 0)) return;
      z.radius = Math.min(z.maxRadius, (z.t - (z.delay || 0)) * z.speed);
      const p = g.player;
      if (!z.hitPlayer) {
        const d = U.dist(z.x, z.y, p.x, p.y);
        if (Math.abs(d - z.radius) < 16 + p.r * 0.5) {
          z.hitPlayer = true;
          g.hurtPlayer(z.damage, { x: z.x, y: z.y, by: z.by });
        }
      }
      if (z.radius >= z.maxRadius) z.dead = true;
    },
    portal(z, dt, g) {
      if (!z.done && z.t >= z.delay) {
        z.done = true;
        const p = g.player;
        const a = Math.atan2(p.y - z.y, p.x - z.x);
        const sp = z.speed * (g.data.config.enemyProjectileSpeed || 1);
        g.spawnProjectile({ x: z.x, y: z.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 9, damage: z.damage, owner: 'enemy', life: 2.5, color: z.color, by: z.by });
        z.duration = z.t + 0.25;
      }
    },
  };

  // ---------------------------------------------------------------------
  // PICKUPS (yules y corazones)
  // ---------------------------------------------------------------------
  class Pickup {
    constructor(kind, x, y, value, vx, vy) {
      this.uid = UID++;
      this.kind = kind;
      this.x = x;
      this.y = y;
      this.value = value;
      this.vx = vx || 0;
      this.vy = vy || 0;
      this.t = 0;
      this.magnet = false;
      this.dead = false;
    }
  }

  BC.Entities = { Player, Enemy, Projectile, Zone, Pickup };
})(typeof window !== 'undefined' ? window : globalThis);
