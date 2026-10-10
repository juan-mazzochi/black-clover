/*
 * El motor del juego: maneja la run, las salas, oleadas, daño, recompensas,
 * puertas, tienda, eventos y descansos. No dibuja nada (eso es render.js),
 * así se puede simular una partida entera en los tests.
 *
 * Estados (game.state):
 *   'idle'     -> no hay partida
 *   'playing'  -> la simulación corre
 *   'reward'   -> esperando que elijas una mejora
 *   'event' | 'shop' | 'rest' -> salas sin combate (ventana abierta)
 *   'gameover' | 'victory'
 */
(function (root) {
  const BC = (root.BC = root.BC || {});
  const U = BC.U;
  const E = BC.Entities;

  class Game {
    constructor(opts) {
      const o = opts || {};
      this.data = o.data || BC.DATA;
      this.headless = !!o.headless;
      this.meta = o.save || BC.Save.defaultSave();
      this.audio = o.audio || null;
      this.listeners = [];
      this.state = 'idle';
      this.paused = false;
      this.input = { mx: 0, my: 0, dash: false, ult: false };
      const c = this.data.config;
      this.bounds = { x1: c.wall, y1: c.wallTop, x2: c.width - c.wall, y2: c.height - c.wall };
      this.effects = [];
      this.particles = [];
      this.texts = [];
      this.toasts = [];
      this.bannerInfo = null;
      this.shakeAmt = 0;
      this.time = 0;
      this.run = null;
      this.room = null;
      this.player = null;
    }

    // ---------------- eventos hacia la interfaz ----------------
    on(fn) {
      this.listeners.push(fn);
    }
    emit(type, payload) {
      for (const fn of this.listeners) fn(type, payload);
    }
    sfx(name) {
      if (this.audio) this.audio.play(name);
    }

    // ---------------- inicio de partida ----------------
    startRun(opts) {
      const data = this.data;
      const meta = this.meta;
      this.run = BC.Run.createRun(
        {
          characterId: opts.characterId,
          seed: opts.seed,
          ascension: opts.ascension || 0,
          metaLevels: meta.upgrades,
          unlockedRelics: BC.Save.unlockedRelics(meta, data),
          includeSecret: BC.Save.secretUnlocked(meta, data),
          endless: !!opts.endless,
        },
        data
      );
      // modificadores del mundo: ascensión + Pacto de Maldición
      this.ascMods = BC.Stats.worldMods(this.run.ascension, this.run.metaLevels, data);
      this.rng = new BC.RNG(this.run.seed + ':combat');
      this.player = new E.Player(this);
      this.effects = [];
      this.particles = [];
      this.texts = [];
      this.toasts = [];
      this.rerollN = 0;
      this.pendingLevels = 0;
      this.pendingChests = [];
      this.lastHitBy = null;
      this.state = 'playing';
      this.emit('runStart', this.run);
      this.enterNode(this.run.map.realms[0].floors[0][0]);
      this.player.say(this.player.ch.quotes.start, 2.5);
    }

    // ---------------- salas ----------------
    enterNode(node) {
      const run = this.run;
      const data = this.data;
      const prevRealm = this.room ? this.room.node.realm : -1;
      BC.Run.enterNode(run, node);
      const realm = data.realms[node.realm];
      const room = {
        node,
        enemies: [],
        projectiles: [],
        zones: [],
        pickups: [],
        spawns: [],
        doors: [],
        waves: [],
        waveIndex: 0,
        waveTimer: 0,
        combat: node.type === 'combat' || node.type === 'ambush' || node.type === 'elite' || node.type === 'boss',
        cleared: false,
        clearT: 0,
        rewardOffered: false,
        doorsT: 0,
        time: 0,
        boss: null,
        npc: null,
        decos: this.makeDecos(node, realm),
      };
      this.room = room;
      this.rerollN = 0;
      const c = data.config;
      this.player.resetForRoom(c.width / 2, this.bounds.y2 - 60);
      this.state = 'playing';

      if (node.realm !== prevRealm) this.banner(realm.name, realm.subtitle, 2.6);

      const enc = room.combat ? BC.MapGen.generateEncounter(run.seed, node, data, this.ascMods) : null;
      if (node.type === 'combat' || node.type === 'ambush') {
        room.waves = enc.waves;
        if (node.type === 'ambush') this.banner('¡Emboscada!', 'Sobreviví y el cofre es tuyo', 2);
      } else if (node.type === 'elite') {
        room.waves = enc.waves;
        this.queueSpawn(enc.elite, c.width / 2, this.bounds.y1 + 140, { telegraph: 1.0 });
        this.banner('¡Élite!', data.enemies[enc.elite].name + ' — ' + data.enemies[enc.elite].title, 2);
      } else if (node.type === 'boss') {
        const bd = data.bosses[enc.boss];
        this.queueSpawn(enc.boss, c.width / 2, this.bounds.y1 + 160, { telegraph: 1.4 });
        this.banner(bd.name, '"' + bd.quote + '"', 3);
        this.player.say(this.player.ch.quotes.boss, 2.5);
        this.emit('bossStart', bd);
        run.track.bossHits = 0;
      } else if (node.type === 'event') {
        const rng = new BC.RNG(run.seed + ':event:' + node.id);
        const ev = BC.Events.pickEvent(run, rng, data);
        run.seenEvents.push(ev.id);
        this.currentEvent = ev;
        room.npc = { icon: ev.icon, x: c.width / 2, y: 330 };
        this.state = 'event';
        this.emit('event', ev);
      } else if (node.type === 'shop') {
        const rng = new BC.RNG(run.seed + ':shop:' + node.id);
        this.shopStock = BC.Loot.shopStock(run, rng, data);
        room.npc = { icon: '🛒', x: c.width / 2, y: 330 };
        this.state = 'shop';
        this.emit('shop', this.shopStock);
      } else if (node.type === 'rest') {
        room.npc = { icon: '🔥', x: c.width / 2, y: 330 };
        this.state = 'rest';
        this.emit('rest', { healPct: this.restHealPct() });
      }
      this.emit('roomEnter', node);
    }

    makeDecos(node, realm) {
      const rng = new BC.RNG(this.run.seed + ':deco:' + node.id);
      const out = [];
      const b = this.bounds;
      for (let i = 0; i < 16; i++) {
        out.push({ x: rng.range(b.x1 + 20, b.x2 - 20), y: rng.range(b.y1 + 70, b.y2 - 20), icon: rng.pick(realm.deco), s: rng.range(16, 30), a: rng.range(0.18, 0.35) });
      }
      return out;
    }

    restHealPct() {
      return this.data.rest.healPct * (1 + (this.ascMods.restHealPct || 0));
    }

    // ---------------- enemigos ----------------
    queueSpawn(id, x, y, opts) {
      const o = opts || {};
      this.room.spawns.push({ id, x, y, t: o.telegraph !== undefined ? o.telegraph : this.data.config.spawnTelegraph, total: o.telegraph || this.data.config.spawnTelegraph, opts: o });
    }

    spawnEnemy(id, x, y, opts) {
      const data = this.data;
      const def = data.enemies[id] || data.bosses[id];
      if (!def) throw new Error('Enemigo desconocido: ' + id);
      const scale = BC.Combat.enemyScaling(this.run.realmIndex, this.run.floorIndex, this.ascMods, data, !!def.boss, this.run.loop);
      const e = new E.Enemy(id, def, x, y, scale);
      this.room.enemies.push(e);
      // la primera vez en la partida que aparece un enemigo con mecánica especial, se explica
      if (def.hint && this.run) {
        this.run.seenHints = this.run.seenHints || {};
        if (!this.run.seenHints[id]) {
          this.run.seenHints[id] = true;
          this.toast(def.hint, '#ffe58a', 5.5);
        }
      }
      if (opts && opts.owner) (opts.owner.minions = opts.owner.minions || []).push(e);
      if (def.boss) this.room.boss = e;
      if (def.elite) this.room.elite = e;
      return e;
    }

    spawnWave(list) {
      const p = this.player;
      const b = this.bounds;
      const minD = this.data.config.spawnMinDistance;
      for (const id of list) {
        let x = 0;
        let y = 0;
        for (let k = 0; k < 25; k++) {
          x = this.rng.range(b.x1 + 30, b.x2 - 30);
          y = this.rng.range(b.y1 + 30, b.y2 - 30);
          if (U.dist2(x, y, p.x, p.y) > minD * minD) break;
        }
        this.queueSpawn(id, x, y);
      }
    }

    aliveEnemies() {
      let n = 0;
      for (const e of this.room.enemies) if (!e.dead) n++;
      return n;
    }

    findNearestEnemy(x, y, range) {
      let best = null;
      let bd = range * range;
      for (const e of this.room.enemies) {
        if (e.dead || e.untargetable) continue;
        const d = U.dist2(x, y, e.x, e.y) - e.r * e.r;
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      return best;
    }

    clampToArena(x, y, m) {
      const b = this.bounds;
      return { x: U.clamp(x, b.x1 + m, b.x2 - m), y: U.clamp(y, b.y1 + m, b.y2 - m) };
    }

    spawnProjectile(o) {
      const pr = new E.Projectile(o);
      this.room.projectiles.push(pr);
      return pr;
    }

    spawnZone(o) {
      const z = new E.Zone(o);
      this.room.zones.push(z);
      return z;
    }

    // ---------------- daño ----------------
    hitEnemy(e, base, o) {
      if (!e || e.dead || e.untargetable) return 0;
      // protegido por un Guardián del Vínculo vivo: no recibe daño
      if (e.bondRef) {
        if (!e.bondRef.dead) {
          e.flash = 0.05;
          if (!e.immuneTextT || this.time - e.immuneTextT > 0.6) {
            e.immuneTextT = this.time;
            this.floatText(e.x, e.y - e.r - 12, 'Inmune', '#ffe58a');
          }
          return 0;
        }
        e.bondRef = null;
      }
      const opt = o || {};
      const p = this.player;
      const eff = p.eff;
      const run = this.run;
      const manaRatio = eff.maxMana > 0 ? p.mana / eff.maxMana : 0;
      const ctx = {
        hpRatio: run.hp / eff.maxHp,
        manaRatio,
        ultActive: p.ult.active,
        traitPct: p.ch.trait.id === 'sangreReal' ? manaRatio * p.ch.trait.maxBonus : 0,
        targetArmor: e.armor,
      };
      const res = BC.Combat.playerDamage(base, eff, ctx, opt.noCrit ? 1 : this.rng.float());
      let amt = res.amount;
      if (e.phaseInvuln > 0) amt = Math.round(amt * 0.2);
      if (e.shield > 0) {
        const abs = Math.min(e.shield, amt);
        e.shield -= abs;
        amt -= abs;
        if (abs > 0) this.dmgText(e.x, e.y - e.r, abs, false, '#bdf8ff');
      }
      e.hp -= amt;
      e.flash = 0.08;
      e.sinceHit = 0;
      if (opt.knockback && !e.boss && opt.fromX !== undefined) {
        const n = U.norm(e.x - opt.fromX, e.y - opt.fromY);
        const k = opt.knockback * (e.elite ? 0.25 : 1);
        e.kbx += n.x * k * 1.6;
        e.kby += n.y * k * 1.6;
      }
      if (!opt.isDot && !e.dead) {
        // quemadura y veneno: del hechizo (opt.burn / opt.poison) o de reliquias/sinergias
        const burn = (opt.burn || 0) + (eff.burnOnHit > 0 ? eff.burnOnHit * (1 + eff.damagePct) : 0);
        if (burn > 0) e.burn = { dps: Math.max(burn, e.burn ? e.burn.dps : 0), t: 3, tick: e.burn ? e.burn.tick : 0.5 };
        const poison = (opt.poison || 0) + (eff.poisonOnHit > 0 ? eff.poisonOnHit * (1 + eff.damagePct) : 0);
        if (poison > 0) e.poison = { dps: Math.max(poison, e.poison ? e.poison.dps : 0), t: 4, tick: e.poison ? e.poison.tick : 0.5 };
        if (eff.lifesteal > 0 && amt > 0) BC.Run.heal(run, amt * eff.lifesteal);
      }
      const u = p.ch.ultimate;
      if (u.gainPerDamageDealt && amt > 0) {
        // tope por segundo: con mucho daño (o muchos enemigos) la barra no se llena volando
        let gain = amt * u.gainPerDamageDealt;
        if (u.maxDamageGainPerSec) {
          if (!p.ultWin || this.time - p.ultWin.t >= 1) p.ultWin = { t: this.time, got: 0 };
          gain = Math.max(0, Math.min(gain, u.maxDamageGainPerSec - p.ultWin.got));
          p.ultWin.got += gain;
        }
        if (gain > 0) this.addUlt(gain);
      }
      if (amt > 0) this.dmgText(e.x, e.y - e.r, amt, res.crit, opt.color);
      if (e.hp <= 0) this.killEnemy(e);
      return amt;
    }

    killEnemy(e) {
      if (e.dead) return;
      e.dead = true;
      const run = this.run;
      // copias del Ilusionista: se rompen sin dar recompensa
      if (e.def.isClone) {
        this.particle(e.x, e.y, '#d8b8ff', 14, 180, 0.5);
        this.floatText(e.x, e.y - 20, '¡Ilusión!', '#d8b8ff');
        this.sfx('kill');
        return;
      }
      run.kills++;
      // experiencia
      const ups = BC.Run.addXp(run, BC.Run.enemyXp(e.def, this.data), this.data);
      if (ups > 0) {
        this.pendingLevels += ups;
        this.floatText(this.player.x, this.player.y - 44, '¡Nivel ' + run.level + '!', '#ffd76a');
        // cada N niveles ganás una re-tirada
        const every = this.data.config.rerollEveryLevels;
        const gained = Math.floor(run.level / every) - Math.floor((run.level - ups) / every);
        if (gained > 0) {
          run.rerolls += gained;
          this.toast('🔄 +' + gained + ' re-tirada de mejoras', '#8fd3ff');
        }
        this.sfx('synergy');
      }
      const def = e.def;
      const yr = def.yul || [0, 0];
      const n = this.rng.int(yr[0], yr[1]);
      const total = Math.round(n * run.stats.yulMult);
      const coins = Math.min(total, 6);
      for (let i = 0; i < coins; i++) {
        const v = Math.floor(total / coins) + (i < total % coins ? 1 : 0);
        const a = this.rng.float() * Math.PI * 2;
        const sp = this.rng.range(60, 160);
        this.room.pickups.push(new E.Pickup('yul', e.x, e.y, v, Math.cos(a) * sp, Math.sin(a) * sp));
      }
      if (e.elite || e.boss || this.rng.float() < 0.04) this.room.pickups.push(new E.Pickup('heart', e.x, e.y, 0.08, 0, -60));
      // cofre
      const ch = this.data.chests;
      if (e.boss || this.rng.float() < (e.elite ? ch.eliteChance : ch.chance)) {
        this.room.pickups.push(new E.Pickup('chest', e.x, e.y, 0, 0, -40));
        this.floatText(e.x, e.y - 20, '¡Un cofre!', '#ffd76a');
      }
      this.particle(e.x, e.y, e.color, e.boss ? 40 : 12, e.boss ? 300 : 180, 0.6);
      this.sfx('kill');
      if (def.splitInto) {
        for (let i = 0; i < def.splitInto.count; i++) {
          const a = (i / def.splitInto.count) * Math.PI * 2;
          const c = this.clampToArena(e.x + Math.cos(a) * 24, e.y + Math.sin(a) * 24, 12);
          this.spawnEnemy(def.splitInto.id, c.x, c.y);
        }
      }
      if (e.elite) {
        run.elitesKilled++;
        this.banner('¡Élite derrotado!', e.name, 1.6);
      }
      if (e.boss) {
        if (run.bossesDefeated.indexOf(e.id) === -1) run.bossesDefeated.push(e.id);
        if (run.track.bossHits === 0) run.track.bossNoHit++;
        for (const o of this.room.enemies) if (o !== e && !o.dead) o.dead = true;
        this.room.spawns = [];
        this.banner('¡' + e.name + ' derrotado!', '', 2.4);
        this.shake(16);
        BC.Run.healPct(run, this.data.rewards.bossHealPct);
      }
    }

    // Devuelve true si el golpe hizo daño
    hurtPlayer(raw, o) {
      const p = this.player;
      const run = this.run;
      if (this.state !== 'playing' || this.godMode) return false;
      if (p.invuln > 0 || p.dash.t > 0) return false;
      const res = BC.Combat.damageTaken(raw, p.eff, this.rng.float());
      if (res.evaded) {
        p.invuln = 0.25;
        this.floatText(p.x, p.y - 26, '¡Esquivado!', '#9ff5d6');
        return false;
      }
      const amt = res.amount;
      run.hp -= amt;
      if (o && o.by) this.lastHitBy = o.by;
      if (this.room.boss && !this.room.boss.dead) run.track.bossHits++;
      p.invuln = (o && o.dot) ? 0.15 : this.data.config.invulnAfterHit;
      p.hurtFlash = 0.2;
      this.dmgText(p.x, p.y - 24, amt, false, '#ff5050');
      this.shake(4);
      this.sfx('hurt');
      const t = p.ch.trait;
      if (t.id === 'determinacion') {
        if (p.hurtStacks.length >= t.maxStacks) p.hurtStacks.shift();
        p.hurtStacks.push(t.duration);
      }
      if (p.ch.ultimate.gainPerHpLost) this.addUlt(amt * p.ch.ultimate.gainPerHpLost);
      if (run.hp <= 0) {
        if (p.eff.lastStand && !p.lastStandUsed) {
          p.lastStandUsed = true;
          run.hp = 1;
          p.invuln = 1.2;
          this.floatText(p.x, p.y - 40, '¡Hilo Rojo del Destino!', '#ff5a7a');
        } else if (run.revives > 0) {
          run.revives--;
          run.hp = Math.round(run.stats.maxHp * this.data.meta.reviveHpPct);
          p.invuln = 2;
          this.banner('¡Segunda oportunidad!', '¡Nunca me rendiré!', 2);
          this.addEffect({ type: 'ring', x: p.x, y: p.y, r0: 10, r1: 260, life: 0.7, color: '#ffd76a', width: 14 });
          for (const q of this.room.projectiles) if (q.owner === 'enemy') q.dead = true;
        } else {
          run.hp = 0;
          this.gameOver();
        }
      }
      return true;
    }

    addUlt(amount) {
      const p = this.player;
      if (!p || p.ult.active) return;
      p.ult.gauge = Math.min(p.ch.ultimate.gaugeMax, p.ult.gauge + amount * (p.eff.ultGainMult || 1));
    }

    onAntimagic(n, x, y) {
      const p = this.player;
      if (p.ch.ultimate.gainPerAntimagic) this.addUlt(n * p.ch.ultimate.gainPerAntimagic);
      BC.Skills.onAntimagic(this, p, n);
      if (this.rng.float() < 0.25) this.floatText(x, y - 30, '¡Anti-magia!', '#dddddd');
    }

    // ---------------- loop principal ----------------
    update(dtRaw) {
      const dt = Math.min(dtRaw, 0.05);
      this.time += dt;
      this.updateFx(dt);
      if (this.state !== 'playing' || this.paused) return;
      const run = this.run;
      const room = this.room;
      run.time += dt;
      room.time += dt;

      this.player.update(dt);
      if (this.state !== 'playing') return;

      // aparición de enemigos (con aviso previo)
      for (let i = room.spawns.length - 1; i >= 0; i--) {
        const s = room.spawns[i];
        s.t -= dt;
        if (s.t <= 0) {
          room.spawns.splice(i, 1);
          this.spawnEnemy(s.id, s.x, s.y, s.opts);
        }
      }

      // oleadas
      if (room.combat && room.waveIndex < room.waves.length) {
        room.waveTimer += dt;
        const alive = this.aliveEnemies() + room.spawns.length;
        const first = room.waveIndex === 0 && room.waveTimer > 0.6;
        const cfg = this.data.config;
        if (first || (room.waveIndex > 0 && (alive <= cfg.waveNextThreshold || room.waveTimer > cfg.waveMaxTime))) {
          this.spawnWave(room.waves[room.waveIndex]);
          room.waveIndex++;
          room.waveTimer = 0;
        }
      }

      for (const e of room.enemies) {
        if (!e.dead) BC.EnemyAI.update(this, e, dt);
        if (this.state !== 'playing') return;
      }
      BC.EnemyAI.separate(room.enemies);
      for (const pr of room.projectiles) if (!pr.dead) pr.update(dt, this);
      if (this.state !== 'playing') return;
      for (const z of room.zones) if (!z.dead) z.update(dt, this);
      if (this.state !== 'playing') return;
      this.updatePickups(dt);
      if (run.yul > run.track.maxYul) run.track.maxYul = run.yul;

      room.enemies = room.enemies.filter((e) => !e.dead);
      room.projectiles = room.projectiles.filter((p) => !p.dead);
      room.zones = room.zones.filter((z) => !z.dead);
      room.pickups = room.pickups.filter((p) => !p.dead);

      this.checkClear(dt);
      this.checkDoors(dt);

      // cofres abiertos: ventana con lo que salió (pausa el juego)
      if (this.pendingChests.length && this.state === 'playing' && !this.run.over) {
        this.chestResult = this.pendingChests.shift();
        this.state = 'chest';
        this.emit('chest', this.chestResult);
        return;
      }

      // subidas de nivel pendientes: se elige una mejora por cada nivel
      if (this.pendingLevels > 0 && this.state === 'playing' && !this.run.over) {
        this.pendingLevels--;
        this.rerollN = 0;
        this.offerReward('level');
      }
    }

    updatePickups(dt) {
      const p = this.player;
      const room = this.room;
      const r2 = p.eff.pickupRadius * p.eff.pickupRadius;
      for (const k of room.pickups) {
        k.t += dt;
        const near = k.kind === 'chest' ? U.dist2(k.x, k.y, p.x, p.y) < 60 * 60 : U.dist2(k.x, k.y, p.x, p.y) < r2;
        if (!k.magnet && (room.cleared || near) && k.t > 0.3) k.magnet = true;
        if (k.magnet) {
          const n = U.norm(p.x - k.x, p.y - k.y);
          const sp = this.data.config.magnetSpeed + k.t * 200;
          k.x += n.x * sp * dt;
          k.y += n.y * sp * dt;
          if (n.l < p.r + 8) {
            k.dead = true;
            if (k.kind === 'yul') {
              this.run.yul += k.value;
              this.sfx('coin');
            } else if (k.kind === 'chest') {
              const res = BC.Loot.openChest(this.run, this.rng, this.data);
              this.floatText(p.x, p.y - 44, res.text, res.color);
              this.sfx('synergy');
              this.onNewSynergies(res.newSynergies);
              this.pendingChests.push(res); // se muestra en una ventana al final del frame
            } else if (k.kind === 'heart') {
              const h = BC.Run.healPct(this.run, k.value);
              if (h > 0) this.floatText(p.x, p.y - 30, '+' + Math.round(h), '#7dff9a');
            }
          }
        } else {
          k.x += k.vx * dt;
          k.y += k.vy * dt;
          k.vx *= Math.pow(0.02, dt);
          k.vy *= Math.pow(0.02, dt);
        }
      }
    }

    checkClear(dt) {
      const room = this.room;
      if (!room.combat) return;
      if (!room.cleared) {
        if (room.waveIndex >= room.waves.length && room.spawns.length === 0 && this.aliveEnemies() === 0 && room.time > 1) {
          room.cleared = true;
          room.clearT = 0;
          this.run.roomsCleared++;
          for (const q of room.projectiles) if (q.owner === 'enemy') q.dead = true;
          for (const z of room.zones) if (z.owner === 'enemy') z.dead = true;
          const h = this.run.stats.healOnClearPct;
          if (h) {
            const healed = BC.Run.healPct(this.run, h);
            if (healed > 0) this.floatText(this.player.x, this.player.y - 30, '+' + Math.round(healed), '#7dff9a');
          }
          if (room.node.type !== 'boss') this.toast('¡Sala despejada!', '#ffd76a');
          if (room.node.type === 'ambush') {
            this.room.pickups.push(new E.Pickup('chest', this.player.x, this.player.y - 70, 0, 0, -40));
            this.floatText(this.player.x, this.player.y - 90, '¡Un cofre!', '#ffd76a');
          }
          this.sfx('clear');
          this.emit('roomClear', room.node);
        }
        return;
      }
      room.clearT += dt;
      if (!room.rewardOffered && (room.clearT > 1.6 || (room.clearT > 0.8 && room.pickups.length === 0))) {
        room.rewardOffered = true;
        const t = room.node.type;
        // las salas de combate normales no dan recompensa: las mejoras llegan al subir de nivel
        if (t === 'combat' || t === 'ambush') this.openDoors();
        else this.offerReward(t === 'boss' ? 'boss' : 'elite');
      }
    }

    // ---------------- recompensas ----------------
    makeChoices(kind) {
      const data = this.data;
      const run = this.run;
      const rng = new BC.RNG(run.seed + ':loot:' + run.nodeId + ':' + kind + (kind === 'level' ? run.level : '') + ':' + this.rerollN);
      if (kind === 'elite') return BC.Loot.relicChoices(run, rng, data, data.rewards.eliteRelicChoices);
      if (kind === 'boss') return BC.Loot.relicChoices(run, rng, data, data.rewards.eliteRelicChoices, data.rewards.bossRelicMinRarity, true);
      if (kind === 'train') {
        const list = BC.Loot.candidates(run, data).filter((c) => c.kind === 'skillUp' || c.kind === 'skillNew');
        const res = [];
        const pool = list.slice();
        while (res.length < 3 && pool.length) {
          const p = rng.weighted(pool, (c) => c.w);
          res.push({ kind: p.kind, id: p.id });
          pool.splice(pool.indexOf(p), 1);
        }
        return res.length ? res : [{ kind: 'heal', id: 'heal' }];
      }
      return BC.Loot.rewardChoices(run, rng, data, data.config.rewardChoices);
    }

    offerReward(kind) {
      this.pendingReward = { kind, choices: this.makeChoices(kind) };
      this.state = 'reward';
      this.emit('reward', this.pendingReward);
    }

    // Cierra la ventana del cofre
    closeChest() {
      if (this.state !== 'chest') return;
      this.chestResult = null;
      this.state = 'playing';
    }

    rerollReward() {
      if (!this.pendingReward || this.run.rerolls <= 0) return false;
      this.run.rerolls--;
      this.rerollN++;
      this.pendingReward.choices = this.makeChoices(this.pendingReward.kind);
      this.emit('reward', this.pendingReward);
      return true;
    }

    chooseReward(i) {
      const pr = this.pendingReward;
      if (!pr || !pr.choices[i]) return;
      const c = pr.choices[i];
      const res = BC.Loot.applyReward(this.run, c, this.data);
      const d = BC.Loot.describe(c, this.run, this.data);
      this.toast(d.icon + ' ' + d.title, d.color);
      this.onNewSynergies(res.newSynergies);
      this.pendingReward = null;
      this.state = 'playing';
      this.afterReward(pr.kind);
    }

    skipReward() {
      if (!this.pendingReward) return;
      const kind = this.pendingReward.kind;
      this.run.yul += 15;
      this.toast('+15 yules', '#ffd76a');
      this.pendingReward = null;
      this.state = 'playing';
      this.afterReward(kind);
    }

    afterReward(kind) {
      const run = this.run;
      if (kind === 'level') return; // subir de nivel no cambia de sala
      // la partida termina con el último reino del mapa (el secreto, si está desbloqueado)
      if (kind === 'boss' && run.realmIndex === run.map.realms.length - 1) {
        if (run.endless) return this.nextLoop();
        this.victory();
        return;
      }
      if (kind === 'train') this.room.cleared = true;
      if (kind === 'boss' && run.realmIndex === run.map.realms.length - 2 && run.secret) this.banner('Algo más te espera...', 'Un poder enorme te llama desde la capital', 3);
      this.openDoors();
    }

    // MODO INFINITO: termina un ciclo y empieza otro, más difícil
    nextLoop() {
      const run = this.run;
      const en = this.data.endless;
      run.loop++;
      run.map = BC.MapGen.generateMap(run.seed, this.data, BC.Stats.worldMods(run.ascension, run.metaLevels, this.data), false, run.loop);
      run.nodeId = null; // las próximas puertas son las del primer piso del ciclo nuevo
      BC.Run.healPct(run, en.healPctPerLoop);
      this.banner('♾ Ciclo ' + (run.loop + 1), 'Los enemigos se vuelven más fuertes...', 3);
      this.sfx('ult');
      this.openDoors();
    }

    onNewSynergies(ids) {
      for (const id of ids || []) {
        const s = this.data.synergies.find((x) => x.id === id);
        if (!s) continue;
        this.banner('¡Sinergia: ' + s.name + '!', s.desc, 3);
        this.sfx('synergy');
        this.emit('synergy', s);
      }
      if (this.player && this.player.ch.usesMana) this.player.mana = Math.min(this.player.mana, this.run.stats.maxMana);
    }

    // ---------------- puertas ----------------
    openDoors() {
      const room = this.room;
      const nodes = BC.Run.nextNodes(this.run);
      const b = this.bounds;
      const cx = (b.x1 + b.x2) / 2;
      const cy = (b.y1 + b.y2) / 2;
      // lugares posibles: arriba, a la izquierda y a la derecha (siempre en el centro de esa pared).
      // Cuál puerta va en cada lado cambia de sala en sala (fijo por semilla).
      const slots = [
        { x: cx, y: b.y1 + 40, w: 90, h: 70 },
        { x: b.x1 + 40, y: cy, w: 70, h: 90 },
        { x: b.x2 - 40, y: cy, w: 70, h: 90 },
      ];
      const rng = new BC.RNG(this.run.seed + ':doors:' + (this.run.nodeId || 'start') + ':' + (this.run.loop || 0));
      for (let i = slots.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [slots[i], slots[j]] = [slots[j], slots[i]];
      }
      room.doors = nodes.map((node, i) => {
        const s = slots[i % slots.length];
        return { x: s.x, y: s.y, w: s.w, h: s.h, node, nextRealm: node.realm !== room.node.realm || (node.loop || 0) !== (room.node.loop || 0) };
      });
      room.doorsT = 0;
      room.cleared = true;
      this.emit('doorsOpen', room.doors);
    }

    checkDoors(dt) {
      const room = this.room;
      if (!room.doors.length) return;
      room.doorsT += dt;
      if (room.doorsT < 0.4) return;
      const p = this.player;
      for (const d of room.doors) {
        if (Math.abs(p.x - d.x) < d.w / 2 && Math.abs(p.y - d.y) < d.h / 2 + p.r) {
          this.enterNode(d.node);
          return;
        }
      }
    }

    // ---------------- eventos / tienda / descanso ----------------
    chooseEvent(i) {
      const ev = this.currentEvent;
      if (!ev || this.state !== 'event') return null;
      const opt = ev.options[i];
      if (!opt || !BC.Events.canChoose(this.run, opt)) return null;
      const rng = new BC.RNG(this.run.seed + ':eventRoll:' + this.run.nodeId + ':' + i);
      const res = BC.Events.applyOption(this.run, opt, rng, this.data);
      this.onNewSynergies(res.newSynergies);
      this.currentEvent = null;
      this.emit('eventResult', res);
      return res;
    }

    buyItem(i) {
      const it = this.shopStock && this.shopStock[i];
      if (!it || it.sold || this.state !== 'shop') return false;
      if (this.run.yul < it.price) return false;
      this.run.yul -= it.price;
      const res = BC.Loot.applyReward(this.run, it, this.data);
      this.onNewSynergies(res.newSynergies);
      this.sfx('coin');
      it.sold = true; // todo se compra una sola vez (también la poción)
      this.emit('shop', this.shopStock);
      return true;
    }

    restChoice(kind) {
      if (this.state !== 'rest') return;
      if (kind === 'heal') {
        const h = BC.Run.healPct(this.run, this.restHealPct());
        this.toast('+' + Math.round(h) + ' de vida', '#7dff9a');
        this.closeOverlay();
      } else {
        this.offerReward('train');
      }
    }

    // Cierra la ventana de evento/tienda/descanso y abre las puertas
    closeOverlay() {
      if (this.state === 'gameover' || this.state === 'victory') return;
      this.state = 'playing';
      this.room.cleared = true;
      this.openDoors();
    }

    // ---------------- final ----------------
    summary() {
      const run = this.run;
      return {
        won: run.won,
        characterId: run.characterId,
        seed: run.seed,
        ascension: run.ascension,
        roomsCleared: run.roomsCleared,
        elitesKilled: run.elitesKilled,
        bossesDefeated: run.bossesDefeated.slice(),
        kills: run.kills,
        realmReached: run.realmIndex,
        endless: !!run.endless,
        loop: run.loop || 0,
        floorReached: run.floorIndex,
        time: run.time,
        level: run.level,
        starBonus: run.stats.starPct || 0,
        synergies: run.synergies.slice(),
        evolved: (run.inventory.evolved || []).length,
        legendaries: run.inventory.relics.filter((id) => this.data.relics[id].rarity === 'legendary').length,
        dashes: run.track.dashes,
        maxYul: run.track.maxYul,
        bossNoHit: run.track.bossNoHit,
        killedBy: run.won ? null : this.lastHitBy || null,
        date: new Date().toISOString().slice(0, 10),
      };
    }

    gameOver() {
      if (this.run.over) return;
      this.run.over = true;
      this.state = 'gameover';
      this.player.say(this.player.ch.quotes.death, 3);
      this.sfx('death');
      this.emit('runEnd', this.summary());
    }

    victory() {
      if (this.run.over) return;
      this.run.over = true;
      this.run.won = true;
      this.state = 'victory';
      this.player.say(this.player.ch.quotes.win, 3);
      this.sfx('victory');
      this.emit('runEnd', this.summary());
    }

    abandon() {
      if (!this.run || this.run.over) return;
      this.run.over = true;
      this.state = 'gameover';
      this.emit('runEnd', this.summary());
    }

    // ---------------- efectos visuales ----------------
    addEffect(fx) {
      if (this.headless) return;
      fx.t = 0;
      this.effects.push(fx);
    }
    particle(x, y, color, n, speed, life) {
      if (this.headless) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * speed;
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.5 + Math.random() * 0.5), t: 0, color, size: 2 + Math.random() * 3 });
      }
      if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
    }
    dmgText(x, y, amount, crit, color) {
      if (this.headless) return;
      this.texts.push({ x: x + (Math.random() - 0.5) * 16, y, text: String(Math.round(amount)), color: color || (crit ? '#ffd23a' : '#ffffff'), size: crit ? 22 : 15, t: 0, life: 0.7 });
      if (this.texts.length > 120) this.texts.shift();
    }
    floatText(x, y, text, color) {
      if (this.headless) return;
      this.texts.push({ x, y, text, color, size: 16, t: 0, life: 1.1 });
    }
    toast(text, color, life) {
      if (this.headless) return;
      this.toasts.push({ text, color: color || '#fff', t: 0, life: life || 2.5 });
      if (this.toasts.length > 4) this.toasts.shift();
    }
    banner(text, sub, life) {
      if (this.headless) return;
      this.bannerInfo = { text, sub: sub || '', t: 0, life: life || 2 };
    }
    shake(n) {
      this.shakeAmt = Math.max(this.shakeAmt, n);
    }
    updateFx(dt) {
      if (this.headless) return;
      for (const f of this.effects) f.t += dt;
      this.effects = this.effects.filter((f) => f.t < f.life);
      for (const p of this.particles) {
        p.t += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
      }
      this.particles = this.particles.filter((p) => p.t < p.life);
      for (const t of this.texts) {
        t.t += dt;
        t.y -= 40 * dt;
      }
      this.texts = this.texts.filter((t) => t.t < t.life);
      for (const t of this.toasts) t.t += dt;
      this.toasts = this.toasts.filter((t) => t.t < t.life);
      if (this.bannerInfo) {
        this.bannerInfo.t += dt;
        if (this.bannerInfo.t > this.bannerInfo.life) this.bannerInfo = null;
      }
      this.shakeAmt = Math.max(0, this.shakeAmt - 40 * dt);
    }
  }

  BC.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
