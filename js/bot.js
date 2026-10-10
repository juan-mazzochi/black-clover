/*
 * Jugador automático ("bot"). Se usa para:
 *  - los tests (simular partidas enteras sin abrir el navegador)
 *  - el modo demo: index.html?demo=1
 * No hace falta tocarlo para jugar.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});
  const U = BC.U;

  const Bot = {
    // Devuelve hacia dónde moverse { mx, my, dash }
    steer(g) {
      const p = g.player;
      const room = g.room;
      const W = g.data.config.width;
      const H = g.data.config.height;
      let fx = 0;
      let fy = 0;
      let danger = 0;
      // habilidad del bot (0..1): qué tan seguido reacciona a los peligros
      const skill = g.botSkill === undefined ? 1 : g.botSkill;
      if (!g.botRng) g.botRng = new BC.RNG(g.run.seed + ':bot');
      const sees = () => skill >= 1 || g.botRng.float() < skill;

      if (room.doors.length) {
        const d = room.doors[(g.botDoorPref || 0) % room.doors.length];
        const n = U.norm(d.x - p.x, d.y - p.y);
        return { mx: n.x, my: n.y, dash: false };
      }

      for (const e of room.enemies) {
        if (e.dead) continue;
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const reach = e.boss ? 300 : e.elite ? 240 : 170;
        if (d < reach) {
          const w = ((reach - d) / reach) * (e.boss || e.elite ? 2.2 : 1.2) * (e.charging ? 3 : 1);
          fx += (dx / d) * w;
          fy += (dy / d) * w;
          danger += w;
        }
      }
      for (const q of room.projectiles) {
        if (q.owner !== 'enemy') continue;
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < 140 && sees()) {
          // esquiva perpendicular a la trayectoria
          const sp = Math.hypot(q.vx, q.vy) || 1;
          const px = -q.vy / sp;
          const py = q.vx / sp;
          const side = px * dx + py * dy >= 0 ? 1 : -1;
          const w = ((140 - d) / 140) * 1.6;
          fx += px * side * w;
          fy += py * side * w;
          danger += w;
        }
      }
      for (const z of room.zones) {
        if (z.owner !== 'enemy' || !sees()) continue;
        if (z.kind === 'telegraphCircle' || z.kind === 'gravityWell') {
          const d = U.dist(p.x, p.y, z.x, z.y);
          if (d < z.r + 30) {
            const n = U.norm(p.x - z.x, p.y - z.y);
            fx += n.x * 3;
            fy += n.y * 3;
            danger += 3;
          }
        } else if (z.kind === 'telegraphLine' || z.kind === 'warnLine') {
          const d = U.segDist(p.x, p.y, z.x, z.y, z.x2, z.y2);
          if (d < z.width / 2 + 30) {
            const ang = Math.atan2(z.y2 - z.y, z.x2 - z.x) + Math.PI / 2;
            const side = Math.cos(ang) * (p.x - z.x) + Math.sin(ang) * (p.y - z.y) >= 0 ? 1 : -1;
            fx += Math.cos(ang) * side * 3;
            fy += Math.sin(ang) * side * 3;
            danger += 3;
          }
        } else if (z.kind === 'nova' && z.radius !== undefined) {
          const d = U.dist(p.x, p.y, z.x, z.y);
          if (d > z.radius && d - z.radius < 80) {
            const n = U.norm(p.x - z.x, p.y - z.y);
            fx += n.x * 1.5;
            fy += n.y * 1.5;
          }
        }
      }

      // Asta (cuerpo a cuerpo) se acerca a pelear si tiene vida
      const near = g.findNearestEnemy(p.x, p.y, 2000);
      const melee = p.ch.id === 'asta';
      const hpRatio = g.run.hp / p.eff.maxHp;
      if (near) {
        const d = U.dist(p.x, p.y, near.x, near.y);
        const want = melee ? 70 : 230;
        const n = U.norm(near.x - p.x, near.y - p.y);
        let w = 0;
        if (d > want + 20) w = melee && hpRatio > 0.35 ? 1.4 : 0.6;
        else if (d < want - 40 && !melee) w = -0.8;
        fx += n.x * w;
        fy += n.y * w;
      }
      // pickups
      if (!near) {
        const k = room.pickups[0];
        if (k) {
          const n = U.norm(k.x - p.x, k.y - p.y);
          fx += n.x;
          fy += n.y;
        }
      }
      // no quedarse pegado a las paredes
      fx += ((W / 2 - p.x) / W) * 1.2;
      fy += ((H / 2 + 40 - p.y) / H) * 1.2;

      const n = U.norm(fx, fy);
      // usa la definitiva cuando está llena y la pelea lo amerita
      const ultReady = !p.ult.active && p.ult.gauge >= p.ch.ultimate.gaugeMax;
      const bigFight = (room.boss && !room.boss.dead) || (room.elite && !room.elite.dead) || g.aliveEnemies() >= 4 || hpRatio < 0.5;
      return { mx: n.x, my: n.y, dash: danger > 3.5 && p.dash.cd <= 0 && sees(), ult: ultReady && bigFight };
    },

    // Toma decisiones en ventanas (recompensas, eventos, tienda, descanso)
    decide(g) {
      const run = g.run;
      if (g.state === 'reward') {
        const ch = g.pendingReward.choices;
        // prioriza habilidades nuevas, después mejoras
        let idx = ch.findIndex((c) => c.kind === 'skillNew');
        if (idx < 0) idx = ch.findIndex((c) => c.kind === 'relic');
        if (idx < 0) idx = ch.findIndex((c) => c.kind === 'skillUp');
        g.chooseReward(Math.max(0, idx));
      } else if (g.state === 'event') {
        const ev = g.currentEvent;
        if (ev) {
          let idx = 0;
          while (idx < ev.options.length && !BC.Events.canChoose(run, ev.options[idx])) idx++;
          g.chooseEvent(Math.min(idx, ev.options.length - 1));
        }
        g.closeOverlay();
      } else if (g.state === 'shop') {
        for (let i = 0; i < g.shopStock.length; i++) {
          const it = g.shopStock[i];
          if (!it.sold && it.kind !== 'heal' && run.yul >= it.price) g.buyItem(i);
        }
        const heal = g.shopStock.findIndex((it) => it.kind === 'heal');
        if (heal >= 0 && run.hp < run.stats.maxHp * 0.6) g.buyItem(heal);
        g.closeOverlay();
      } else if (g.state === 'chest') {
        g.closeChest();
      } else if (g.state === 'rest') {
        g.restChoice(run.hp < run.stats.maxHp * 0.7 ? 'heal' : 'train');
      }
    },

    /*
     * Simula una partida completa sin gráficos.
     * opts: { characterId, seed, ascension, god, maxTime, save, dt }
     * Devuelve un resumen.
     */
    simulate(opts) {
      const g = new BC.Game({ headless: true, save: opts.save });
      g.godMode = !!opts.god;
      if (opts.botSkill !== undefined) g.botSkill = opts.botSkill;
      g.startRun({ characterId: opts.characterId, seed: opts.seed, ascension: opts.ascension || 0, endless: !!opts.endless });
      const dt = opts.dt || 1 / 30;
      const maxTime = opts.maxTime || 3600;
      let t = 0;
      const roomLog = [];
      let lastNode = null;
      let roomStart = 0;
      let guard = 0;
      while (!g.run.over && t < maxTime && guard++ < 5e6) {
        if (opts.untilLoop && g.run.loop >= opts.untilLoop && g.run.nodeId && g.run.nodeId.indexOf('L' + opts.untilLoop + '-') === 0) break;
        if (g.run.nodeId !== lastNode) {
          if (lastNode) roomLog.push({ node: lastNode, time: t - roomStart, hp: Math.round(g.run.hp) });
          lastNode = g.run.nodeId;
          roomStart = t;
        }
        if (g.state === 'playing') {
          const inp = Bot.steer(g);
          g.input.mx = inp.mx;
          g.input.my = inp.my;
          g.input.dash = inp.dash;
          g.input.ult = !!inp.ult;
          g.update(dt);
          t += dt;
          // si una sala tarda muchísimo, algo anda mal
          if (t - roomStart > 400) {
            return { error: 'Sala trabada: ' + g.run.nodeId + ' (' + g.room.node.type + ') enemigos=' + g.aliveEnemies(), game: g, roomLog, time: t };
          }
        } else if (g.state === 'gameover' || g.state === 'victory') break;
        else Bot.decide(g);
      }
      return { summary: g.summary(), game: g, roomLog, time: t, timedOut: t >= maxTime };
    },
  };

  BC.Bot = Bot;
})(typeof window !== 'undefined' ? window : globalThis);
