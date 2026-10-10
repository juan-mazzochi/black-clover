/*
 * Habilidades del jugador (se lanzan solas cuando están listas) y definitivas.
 * Cada "behavior" de data.js tiene acá su comportamiento.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});
  const U = BC.U;

  function nearest(g, p, range) {
    return g.findNearestEnemy(p.x, p.y, range);
  }

  // Dispara un proyectil del jugador (con chance de duplicarse por el Espejo de Gauche)
  function fire(g, p, o) {
    g.spawnProjectile(Object.assign({ owner: 'player', x: p.x, y: p.y }, o));
    if (p.eff.projectileDupChance && g.rng.float() < p.eff.projectileDupChance) {
      const a = Math.atan2(o.vy, o.vx) + (g.rng.float() - 0.5) * 0.5;
      const sp = Math.hypot(o.vx, o.vy);
      g.spawnProjectile(Object.assign({ owner: 'player', x: p.x, y: p.y }, o, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color: '#e6d3ff' }));
    }
  }

  function destroyEnemyProjectiles(g, test) {
    let n = 0;
    for (const q of g.room.projectiles) {
      if (q.owner !== 'enemy' || q.dead || !q.magic) continue;
      if (test(q)) {
        q.dead = true;
        n++;
        g.particle(q.x, q.y, '#ddd', 3, 90, 0.25);
      }
    }
    return n;
  }

  const B = {
    // Tajo en arco (Asta)
    meleeArc: {
      cast(g, p, def, s) {
        const t = nearest(g, p, s.range + 20);
        if (!t) return false;
        const ang = Math.atan2(t.y - p.y, t.x - p.x);
        const half = ((s.arc / 2) * Math.PI) / 180;
        for (const e of g.room.enemies) {
          if (e.dead || e.untargetable) continue;
          const d = U.dist(p.x, p.y, e.x, e.y);
          if (d > s.range + e.r) continue;
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          if (d > e.r + p.r && Math.abs(U.angleDiff(ang, a)) > half) continue;
          g.hitEnemy(e, s.damage, { knockback: s.knockback, fromX: p.x, fromY: p.y, source: def.name, burn: s.burn, poison: s.poison });
        }
        // sólo las espadas de Asta destruyen hechizos
        if (!s.noAntimagic) {
          const n = destroyEnemyProjectiles(g, (q) => {
            const d = U.dist(p.x, p.y, q.x, q.y);
            return d < s.range + 10 && Math.abs(U.angleDiff(ang, Math.atan2(q.y - p.y, q.x - p.x))) <= half + 0.2;
          });
          if (n) g.onAntimagic(n, p.x, p.y);
        }
        p.facing = ang;
        g.addEffect({ type: 'slash', x: p.x, y: p.y, angle: ang, arc: half * 2, range: s.range, life: 0.18, color: def.slashColor || (p.ult.active ? '#ff3030' : '#f2f2f2') });
        g.sfx('slash');
        return true;
      },
    },

    // Estocada en línea (Destructora)
    pierceLine: {
      cast(g, p, def, s) {
        const t = nearest(g, p, s.range);
        if (!t) return false;
        const ang = Math.atan2(t.y - p.y, t.x - p.x);
        const x2 = p.x + Math.cos(ang) * s.range;
        const y2 = p.y + Math.sin(ang) * s.range;
        for (const e of g.room.enemies) {
          if (e.dead || e.untargetable) continue;
          if (U.segDist(e.x, e.y, p.x, p.y, x2, y2) < s.width / 2 + e.r) g.hitEnemy(e, s.damage, { knockback: 200, fromX: p.x, fromY: p.y, source: def.name });
        }
        if (!s.noAntimagic) {
          const n = destroyEnemyProjectiles(g, (q) => U.segDist(q.x, q.y, p.x, p.y, x2, y2) < s.width / 2 + q.r);
          if (n) g.onAntimagic(n, p.x, p.y);
        }
        g.addEffect({ type: 'thrust', x: p.x, y: p.y, x2, y2, width: s.width, life: 0.22, color: def.slashColor || '#d8d8d8' });
        g.sfx('thrust');
        return true;
      },
    },

    // Absorbe y libera (Habitante)
    absorbRelease: {
      tick(g, p, def, s, st, dt) {
        const mult = p.eff.habitanteDoubleCharge ? 2 : 1;
        st.charges = Math.min(s.maxCharges, (st.charges || 0) + s.chargesPerSecond * mult * dt);
      },
      onAntimagic(p, def, s, st, n) {
        const mult = p.eff.habitanteDoubleCharge ? 2 : 1;
        st.charges = Math.min(s.maxCharges, (st.charges || 0) + n * mult);
      },
      cast(g, p, def, s, st) {
        const t = nearest(g, p, s.range);
        if (!t) return false;
        const ch = Math.floor(st.charges || 0);
        const ang = Math.atan2(t.y - p.y, t.x - p.x);
        fire(g, p, {
          vx: Math.cos(ang) * s.speed,
          vy: Math.sin(ang) * s.speed,
          r: s.radius + ch * 2,
          damage: s.damage + s.perCharge * ch,
          pierce: 99,
          life: s.life,
          color: '#3c1d5c',
          style: 'crescent',
          antimagic: true,
          knockback: 220,
          skillId: 'habitante',
        });
        st.charges = 0;
        g.sfx('thrust');
        return true;
      },
    },

    // Proyectiles genéricos (Zanka, cuchillas, balas de agua, lanza, media luna)
    projectile: {
      cast(g, p, def, s, st, id) {
        const t = nearest(g, p, s.range);
        if (!t) return false;
        const ang = Math.atan2(t.y - p.y, t.x - p.x);
        const n = Math.max(1, Math.round(s.count || 1));
        const spread = ((s.spread || 10) * Math.PI) / 180;
        let dmg = s.damage;
        let pierce = s.pierce || 0;
        let style = def.projectileStyle;
        let color = def.color;
        let r = s.radius;
        // Valquiria: las balas de agua se vuelven lanzas
        const emp = p.ult.active && def.basic && p.ch.ultimate.empowerBasic;
        if (emp) {
          dmg *= 1 + emp.damagePct;
          pierce += emp.pierce;
          style = 'spear';
          color = '#e8f6ff';
        }
        if (id === 'zanka' && p.eff.zankaInfinitePierce) pierce = 99;
        for (let i = 0; i < n; i++) {
          const a = ang + (n > 1 ? (i - (n - 1) / 2) * spread : 0);
          fire(g, p, {
            vx: Math.cos(a) * s.speed,
            vy: Math.sin(a) * s.speed,
            r,
            damage: dmg,
            pierce,
            life: s.life || 1,
            splash: s.splash || 0,
            splashPct: s.splashPct || 0,
            color,
            style,
            antimagic: !!s.antimagic,
            burn: s.burn || 0,
            poison: s.poison || 0,
            homing: s.homing || 0,
            knockback: s.knockback || 60,
            slowOnHit: s.slowOnHit || 0,
            slowTime: s.slowTime || 0,
            skillId: id,
          });
        }
        g.sfx(def.basic ? 'shoot' : 'cast');
        return true;
      },
    },

    // Golpe desde el cielo sobre el grupo más denso (Meteorito Negro)
    groundSlam: {
      cast(g, p, def, s, st, id) {
        let best = null;
        let bestN = 0;
        for (const e of g.room.enemies) {
          if (e.dead || e.untargetable) continue;
          if (U.dist2(p.x, p.y, e.x, e.y) > s.range * s.range) continue;
          let n = 0;
          for (const o of g.room.enemies) if (!o.dead && U.dist2(e.x, e.y, o.x, o.y) < s.radius * s.radius) n++;
          if (n > bestN) {
            bestN = n;
            best = e;
          }
        }
        if (!best) return false;
        g.spawnZone({ kind: 'slam', x: best.x, y: best.y, r: s.radius, delay: s.delay, duration: s.delay + 0.1, damage: s.damage, knockback: s.knockback, owner: 'player', icon: def.slamIcon, color: def.slamColor, slow: s.slow || 0, source: id });
        return true;
      },
    },

    // Tornado sobre un enemigo
    zoneAtTarget: {
      cast(g, p, def, s, st, id) {
        const t = nearest(g, p, s.range);
        if (!t) return false;
        const big = 1 + (p.eff.tornadoSizePct || 0);
        const kind = def.zoneKind || 'tornado';
        g.spawnZone({ kind, x: t.x, y: t.y, r: s.radius * (id === 'tornado' ? big : 1), duration: s.duration, damage: s.damage, tickRate: s.tickRate, pull: s.pull || 0, blades: kind === 'tornado' && id === 'tornado' && !!p.eff.tornadoBlades, owner: 'player', slow: s.slow || 0, burn: s.burn || 0, poison: s.poison || 0, icon: def.zoneIcon, color: def.color });
        g.sfx('wind');
        return true;
      },
    },

    // Ráfaga en todas direcciones
    radialBurst: {
      cast(g, p, def, s, st, id) {
        if (!nearest(g, p, s.triggerRange)) return false;
        const n = Math.round(s.count);
        const off = g.rng.float() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * Math.PI * 2;
          fire(g, p, { vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, r: s.radius, damage: s.damage, pierce: s.pierce, life: s.life, color: def.color, style: def.projectileStyle, poison: s.poison || 0, burn: s.burn || 0, skillId: id });
        }
        g.sfx('wind');
        return true;
      },
    },

    // Cuchillas que orbitan (pasiva, no tiene enfriamiento)
    orbit: {
      passive: true,
      tick(g, p, def, s, st, dt) {
        st.angle = (st.angle || 0) + s.angularSpeed * dt;
        const n = Math.round(s.count);
        st.points = [];
        for (let i = 0; i < n; i++) {
          const a = st.angle + (i / n) * Math.PI * 2;
          const ox = p.x + Math.cos(a) * s.orbitRadius;
          const oy = p.y + Math.sin(a) * s.orbitRadius;
          st.points.push({ x: ox, y: oy });
          for (const e of g.room.enemies) {
            if (e.dead || e.untargetable || e.orbitCd > 0) continue;
            if (U.dist2(ox, oy, e.x, e.y) < (s.radius + e.r) ** 2) {
              e.orbitCd = s.hitCooldown;
              g.hitEnemy(e, s.damage, { knockback: 90, fromX: p.x, fromY: p.y, source: 'escudoViento' });
            }
          }
        }
      },
    },

    // Rayo de agua (Rugido del Dragón Marino)
    beam: {
      cast(g, p, def, s) {
        const t = nearest(g, p, s.range);
        if (!t) return false;
        const ang = Math.atan2(t.y - p.y, t.x - p.x);
        const w = s.width * (1 + (p.eff.rugidoWidePct || 0));
        g.spawnZone({ kind: 'beam', x: p.x, y: p.y, angle: ang, length: s.length, width: w, duration: s.duration, damage: s.damage, tickRate: s.tickRate, owner: 'player', icon: def.beamIcon, color: def.color });
        g.sfx('beam');
        return true;
      },
    },

    // Cúpula de agua (Nido del Dragón Marino)
    dome: {
      cast(g, p, def, s, st, id) {
        const enemyNear = nearest(g, p, s.triggerRange);
        let projNear = false;
        for (const q of g.room.projectiles) {
          if (q.owner === 'enemy' && U.dist2(p.x, p.y, q.x, q.y) < 200 * 200) {
            projNear = true;
            break;
          }
        }
        if (!enemyNear && !projNear) return false;
        g.spawnZone({ kind: 'dome', x: p.x, y: p.y, r: s.radius, duration: s.duration + (id === 'nidoDragon' ? p.eff.nidoExtraDuration || 0 : 0), damage: s.damage, tickRate: s.tickRate, slow: s.slow, poison: s.poison || 0, owner: 'player', color: def.color });
        g.sfx('water');
        return true;
      },
    },

    // Onda expansiva (Marejada)
    shockwave: {
      cast(g, p, def, s) {
        if (!nearest(g, p, s.triggerRange)) return false;
        g.spawnZone({ kind: 'shockwave', x: p.x, y: p.y, radius: 0, maxRadius: s.maxRadius, speed: s.speed, damage: s.damage, knockback: s.knockback, owner: 'player', duration: 2, color: def.color, slow: s.slow || 0 });
        g.sfx('water');
        return true;
      },
    },
  };

  // Mejora temporal propia (armadura, velocidad, evasión, daño, regeneración) o curación
  B.buff = {
    cast(g, p, def, s, st, id) {
      const hpRatio = g.run.hp / p.eff.maxHp;
      if (s.whenHurt !== undefined) {
        // las curaciones sólo se usan si te falta vida
        if (hpRatio > s.whenHurt) return false;
      } else if (!nearest(g, p, s.triggerRange || 260)) return false;
      if (s.healPct) {
        const h = BC.Run.healPct(g.run, s.healPct);
        if (h > 0) g.floatText(p.x, p.y - 30, '+' + Math.round(h), '#7dff9a');
      }
      const mods = {};
      for (const k of ['armor', 'speedPct', 'evasion', 'damagePct', 'regen']) if (s[k]) mods[k] = s[k];
      if (Object.keys(mods).length) p.addBuff(id, s.duration, mods, def.icon);
      g.addEffect({ type: 'ring', x: p.x, y: p.y, r0: 10, r1: 60, life: 0.35, color: def.color || '#fff', width: 5 });
      g.sfx('cast');
      return true;
    },
  };

  // Aura constante alrededor del jugador (pasiva)
  B.aura = {
    passive: true,
    tick(g, p, def, s, st, dt) {
      st.auraR = s.radius;
      st.t = (st.t || 0) - dt;
      if (st.t > 0) return;
      st.t = s.tickRate;
      for (const e of g.room.enemies) {
        if (e.dead || e.untargetable) continue;
        if (U.dist2(p.x, p.y, e.x, e.y) < (s.radius + e.r) ** 2) g.hitEnemy(e, s.damage, { noCrit: true, source: def.name, poison: s.poison, burn: s.burn });
      }
    },
  };

  // Rayo en cadena: golpea al más cercano y salta a otros enemigos
  B.chain = {
    cast(g, p, def, s) {
      let cur = nearest(g, p, s.range);
      if (!cur) return false;
      const hit = new Set();
      let fromX = p.x;
      let fromY = p.y;
      for (let i = 0; i <= Math.round(s.jumps) && cur; i++) {
        hit.add(cur.uid);
        g.addEffect({ type: 'bolt', x: fromX, y: fromY, x2: cur.x, y2: cur.y, life: 0.2, color: def.color });
        fromX = cur.x;
        fromY = cur.y;
        // cada salto hace un poco menos de daño
        g.hitEnemy(cur, s.damage * Math.pow(0.85, i), { source: 'rayoCadena' });
        let next = null;
        let bd = s.jumpRange * s.jumpRange;
        for (const e of g.room.enemies) {
          if (e.dead || hit.has(e.uid)) continue;
          const d = U.dist2(fromX, fromY, e.x, e.y);
          if (d < bd) {
            bd = d;
            next = e;
          }
        }
        cur = next;
      }
      g.sfx('cast');
      return true;
    },
  };

  // ---------------------------------------------------------------------
  // Loop de habilidades
  // ---------------------------------------------------------------------
  function update(g, p, dt) {
    if (!g.room || g.room.cleared) return;
    const inv = g.run.inventory;
    const data = g.data;
    for (const id in inv.skills) {
      const lvl = inv.skills[id];
      if (!lvl) continue;
      const def = data.skills[id];
      const beh = B[def.behavior];
      if (!beh) continue;
      const evolved = inv.evolved && inv.evolved.indexOf(id) !== -1;
      const s = BC.Stats.skillLevelStats(def, lvl, evolved ? data.config.evolution : null);
      const st = p.skillState[id] || (p.skillState[id] = { cd: 0.4 });
      if (beh.tick) beh.tick(g, p, def, s, st, dt);
      if (beh.passive) continue;
      st.cd -= dt;
      if (st.cd > 0) continue;
      const free = p.ult.active && p.ch.ultimate.freeMana;
      const cost = free ? 0 : (def.cost || 0) * p.eff.manaCostMult;
      if (cost > 0 && p.mana < cost) {
        st.cd = 0.1;
        st.noMana = true;
        continue;
      }
      st.noMana = false;
      if (beh.cast(g, p, def, s, st, id)) {
        if (cost > 0) {
          p.mana -= cost;
          if (p.ch.ultimate.gainPerManaSpent) g.addUlt(cost * p.ch.ultimate.gainPerManaSpent);
        }
        st.cd = s.cooldown * p.eff.cooldownMult;
        st.maxCd = st.cd;
      } else {
        st.cd = 0.1;
      }
    }
  }

  // Avisa a las habilidades que se destruyeron proyectiles (Habitante)
  function onAntimagic(g, p, n) {
    const id = 'habitante';
    const lvl = g.run.inventory.skills[id];
    if (!lvl) return;
    const def = g.data.skills[id];
    const s = BC.Stats.skillLevelStats(def, lvl);
    const st = p.skillState[id] || (p.skillState[id] = { cd: 0.4 });
    B.absorbRelease.onAntimagic(p, def, s, st, n);
  }

  // ---------------------------------------------------------------------
  // DEFINITIVAS
  // ---------------------------------------------------------------------
  const ULT = {
    modoDemonio: {
      activate(g, p) {
        g.addEffect({ type: 'ring', x: p.x, y: p.y, r0: 10, r1: 160, life: 0.5, color: '#000', width: 14 });
        g.shake(10);
      },
      update(g, p, dt) {
        const u = p.ch.ultimate;
        const run = g.run;
        run.hp = Math.max(1, run.hp - run.stats.maxHp * u.drainPctPerSec * dt);
        if (Math.random() < 0.5) g.particle(p.x + (Math.random() - 0.5) * 20, p.y + (Math.random() - 0.5) * 20, '#000', 1, 60, 0.5);
      },
      end(g, p) {
        p.exhaust = p.ch.ultimate.exhaustDuration;
        p.say('Uf... agotado...', 1.5);
      },
    },
    sylph: {
      activate(g, p) {
        const b = p.ch.ultimate.burst;
        for (const e of g.room.enemies) {
          if (e.dead || e.untargetable) continue;
          if (U.dist2(p.x, p.y, e.x, e.y) < (b.radius + e.r) ** 2) g.hitEnemy(e, b.damage, { knockback: 250, fromX: p.x, fromY: p.y, source: 'sylph' });
        }
        g.addEffect({ type: 'ring', x: p.x, y: p.y, r0: 20, r1: b.radius, life: 0.6, color: '#7fe0c8', width: 12 });
        g.shake(8);
        p.mana = p.eff.maxMana;
      },
      update(g, p) {
        if (Math.random() < 0.4) g.particle(p.x, p.y, '#b6ffe9', 1, 80, 0.5);
      },
      end() {},
    },
    valquiria: {
      activate(g, p) {
        g.addEffect({ type: 'ring', x: p.x, y: p.y, r0: 10, r1: 140, life: 0.5, color: '#bfe9ff', width: 10 });
        g.shake(6);
      },
      update(g, p) {
        if (Math.random() < 0.3) g.particle(p.x, p.y, '#e8f6ff', 1, 50, 0.5);
      },
      end() {},
    },
    // Zona de Maná (Caballero Novato): frena a los enemigos cercanos mientras dura
    zonaMana: {
      activate(g, p) {
        g.addEffect({ type: 'ring', x: p.x, y: p.y, r0: 10, r1: p.ch.ultimate.slowRadius, life: 0.6, color: '#ffe58a', width: 10 });
        g.shake(6);
      },
      update(g, p) {
        const u = p.ch.ultimate;
        for (const e of g.room.enemies) {
          if (e.dead || e.untargetable) continue;
          if (U.dist2(p.x, p.y, e.x, e.y) < (u.slowRadius + e.r) ** 2) {
            e.slowT = 0.15;
            e.slowAmt = Math.max(e.slowAmt || 0, u.slow);
          }
        }
        if (Math.random() < 0.4) g.particle(p.x + (Math.random() - 0.5) * 60, p.y + (Math.random() - 0.5) * 60, '#ffe58a', 1, 40, 0.6);
      },
      end() {},
    },
  };

  function updateUltimate(g, p, dt) {
    const u = p.ult;
    const def = p.ch.ultimate;
    const impl = ULT[def.id];
    const fighting = g.room && !g.room.cleared && g.aliveEnemies() > 0;
    // La definitiva se activa cuando el jugador aprieta Q (g.input.ult)
    const pressed = g.input.ult;
    g.input.ult = false;
    if (u.active) {
      u.timer -= dt;
      impl.update(g, p, dt);
      if (u.timer <= 0) {
        u.active = false;
        impl.end(g, p);
      }
      return;
    }
    if (fighting && def.gainPerSecHighMana && p.eff.maxMana > 0 && p.mana / p.eff.maxMana >= 0.5) g.addUlt(def.gainPerSecHighMana * dt);
    if (!pressed) return;
    if (u.gauge < def.gaugeMax) {
      g.floatText(p.x, p.y - 34, 'Definitiva al ' + Math.floor((u.gauge / def.gaugeMax) * 100) + '%', '#aaaaaa');
      return;
    }
    if (!fighting) {
      g.floatText(p.x, p.y - 34, 'No hay enemigos', '#aaaaaa');
      return;
    }
    {
      u.gauge = 0;
      u.active = true;
      u.total = (def.duration + (p.eff.ultDurationFlat || 0)) * (p.eff.ultDurationMult || 1);
      u.timer = u.total;
      p.say(p.ch.quotes.ult, 1.6);
      g.banner(def.name, '', 1.4);
      g.sfx('ult');
      impl.activate(g, p);
    }
  }

  BC.Skills = { behaviors: B, update, onAntimagic, updateUltimate, ultimates: ULT };
})(typeof window !== 'undefined' ? window : globalThis);
