/*
 * Tests del juego. Se ejecutan:
 *  - con Node:      node tests/run-tests.js
 *  - en el navegador: abriendo tests/tests.html
 */
(function (root) {
  const BC = root.BC;
  const D = BC.DATA;
  const cases = [];
  const test = (name, fn, opts) => cases.push({ name, fn, slow: !!(opts && opts.slow) });

  function assert(c, msg) {
    if (!c) throw new Error(msg || 'assert falló');
  }
  function eq(a, b, msg) {
    if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'esperado ' + JSON.stringify(b) + ', obtenido ' + JSON.stringify(a));
  }
  function near(a, b, eps, msg) {
    if (Math.abs(a - b) > (eps || 1e-6)) throw new Error((msg ? msg + ': ' : '') + 'esperado ~' + b + ', obtenido ' + a);
  }

  function fakeStorage() {
    const m = {};
    return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => (m[k] = String(v)), removeItem: (k) => delete m[k] };
  }

  function makeRun(charId, extra) {
    return BC.Run.createRun(Object.assign({ characterId: charId || 'asta', seed: 'TEST' }, extra || {}), D);
  }

  // =============================== RNG ===============================
  test('RNG: misma semilla => misma secuencia', () => {
    const a = new BC.RNG('ABC');
    const b = new BC.RNG('ABC');
    for (let i = 0; i < 50; i++) eq(a.float(), b.float());
    const c = new BC.RNG('ABD');
    let diff = false;
    const a2 = new BC.RNG('ABC');
    for (let i = 0; i < 10; i++) if (a2.float() !== c.float()) diff = true;
    assert(diff, 'semillas distintas deberían dar secuencias distintas');
  });

  test('RNG: int incluye los extremos y weighted ignora pesos 0', () => {
    const r = new BC.RNG('X');
    const seen = new Set();
    for (let i = 0; i < 500; i++) {
      const v = r.int(1, 3);
      assert(v >= 1 && v <= 3, 'fuera de rango ' + v);
      seen.add(v);
    }
    eq(seen.size, 3);
    for (let i = 0; i < 200; i++) eq(r.weighted([{ id: 'a', weight: 0 }, { id: 'b', weight: 1 }]).id, 'b');
    eq(r.weighted([{ weight: 0 }]), null);
  });

  // =============================== MAPA ===============================
  test('Mapa: la misma semilla genera el mismo mapa', () => {
    const a = JSON.stringify(BC.MapGen.generateMap('SEMILLA', D, 0));
    const b = JSON.stringify(BC.MapGen.generateMap('SEMILLA', D, 0));
    eq(a, b);
    const c = JSON.stringify(BC.MapGen.generateMap('OTRA', D, 0));
    assert(a !== c, 'semillas distintas deberían dar mapas distintos');
  });

  test('Mapa: estructura válida en 300 semillas', () => {
    for (let s = 0; s < 300; s++) {
      const map = BC.MapGen.generateMap('S' + s, D, s % 4);
      eq(map.realms.length, D.realms.filter((r) => !r.secret).length, 'cantidad de reinos (sin el secreto)');
      map.realms.forEach((realm, ri) => {
        const F = D.realms[ri].floors || D.config.floorsPerRealm;
        eq(realm.floors.length, F, 'salas por reino');
        eq(realm.floors[0].length, 1);
        eq(realm.floors[0][0].type, 'combat', 'primera sala');
        eq(realm.floors[F - 1].length, 1);
        eq(realm.floors[F - 1][0].type, 'boss', 'última sala');
        eq(realm.floors[F - 2].map((n) => n.type).join(','), D.mapgen.preBossChoices.join(','), 'antes del jefe');
        const counts = {};
        for (let f = 1; f < F - 2; f++) {
          const types = realm.floors[f].map((n) => n.type);
          assert(types.length >= D.mapgen.choicesMin && types.length <= D.mapgen.choicesMax, 'cantidad de opciones ' + types.length);
          // ninguna puerta repetida en el mismo piso (tampoco dos de combate)
          eq(new Set(types).size, types.length, 'puerta repetida en el mismo piso: ' + types.join(','));
          assert(types.some((t) => t === 'combat' || t === 'elite' || t === 'ambush'), 'falta sala de pelea');
          for (const t of types) {
            const def = D.rooms[t];
            assert(def && t !== 'boss', 'tipo inválido ' + t);
            if (def.minFloor !== undefined) assert(f >= def.minFloor, t + ' antes de su piso mínimo');
            counts[t] = (counts[t] || 0) + 1;
          }
        }
        for (const t in counts) if (D.rooms[t].maxPerRealm !== undefined) assert(counts[t] <= D.rooms[t].maxPerRealm, 'demasiadas salas de ' + t);
        // una sala especial nunca se repite en el piso siguiente
        for (let f = 1; f < F; f++) {
          const prevSpecial = realm.floors[f - 1].map((n) => n.type).filter((t) => t !== 'combat' && t !== 'ambush');
          for (const n of realm.floors[f]) assert(prevSpecial.indexOf(n.type) === -1, 'sala especial repetida seguida: ' + n.type + ' en piso ' + f);
        }
      });
    }
  });

  test('Mapa: encuentros determinísticos y válidos', () => {
    const map = BC.MapGen.generateMap('ENC', D, 0);
    for (const realm of map.realms) {
      for (const floor of realm.floors) {
        for (const node of floor) {
          if (['combat', 'elite', 'boss'].indexOf(node.type) === -1) continue;
          const a = BC.MapGen.generateEncounter('ENC', node, D, 0);
          const b = BC.MapGen.generateEncounter('ENC', node, D, 0);
          eq(JSON.stringify(a), JSON.stringify(b), 'encuentro no determinístico');
          const R = D.realms[node.realm];
          if (node.type === 'boss') eq(a.boss, R.boss);
          if (node.type === 'elite') assert(R.elites.indexOf(a.elite) !== -1, 'élite fuera del reino');
          if (node.type === 'combat') {
            assert(a.waves.length >= D.difficulty.wavesBase, 'pocas oleadas');
            for (const w of a.waves) {
              assert(w.length > 0, 'oleada vacía');
              for (const id of w) assert(D.enemies[id], 'enemigo inexistente ' + id);
            }
          }
        }
      }
    }
  });

  // =============================== DAÑO ===============================
  test('Daño: armadura', () => {
    near(BC.Combat.armorFactor(0), 1);
    near(BC.Combat.armorFactor(20), 0.5);
    near(BC.Combat.armorFactor(5), 0.8);
  });

  test('Daño: multiplicadores y críticos', () => {
    const st = { damagePct: 0.5, critChance: 0.1, critMult: 2 };
    eq(BC.Combat.playerDamage(100, st, {}, 0.99).amount, 150);
    const c = BC.Combat.playerDamage(100, st, {}, 0.05);
    eq(c.crit, true);
    eq(c.amount, 300);
    eq(BC.Combat.playerDamage(100, st, { targetArmor: 20 }, 0.99).amount, 75);
    eq(BC.Combat.playerDamage(0.1, { damagePct: 0 }, {}, 0.99).amount, 1, 'mínimo 1');
  });

  test('Daño: bonus condicionales (vida baja, maná alto, definitiva, rasgo)', () => {
    const st = { damagePct: 0, critChance: 0, lowHpDamagePct: 0.2, highManaDamagePct: 0.3, ultDamagePct: 0.5 };
    eq(BC.Combat.playerDamage(100, st, { hpRatio: 0.4 }, 1).amount, 120);
    eq(BC.Combat.playerDamage(100, st, { hpRatio: 0.6 }, 1).amount, 100);
    eq(BC.Combat.playerDamage(100, st, { manaRatio: 0.8 }, 1).amount, 130);
    eq(BC.Combat.playerDamage(100, st, { manaRatio: 0.7 }, 1).amount, 100);
    eq(BC.Combat.playerDamage(100, st, { ultActive: true }, 1).amount, 150);
    eq(BC.Combat.playerDamage(100, st, { traitPct: 0.4 }, 1).amount, 140);
  });

  test('Daño recibido: evasión y armadura', () => {
    eq(BC.Combat.damageTaken(50, { evasion: 0.2, armor: 0 }, 0.1).evaded, true);
    eq(BC.Combat.damageTaken(50, { evasion: 0.2, armor: 0 }, 0.5).amount, 50);
    eq(BC.Combat.damageTaken(40, { evasion: 0, armor: 20 }, 0.5).amount, 20);
    eq(BC.Combat.damageTaken(0.2, { evasion: 0, armor: 50 }, 0.5).amount, 1);
  });

  test('Dificultad: escala por reino y sala; jefes ignoran el multiplicador de reino', () => {
    const a = BC.Combat.enemyScaling(0, 0, {}, D, false);
    const b = BC.Combat.enemyScaling(0, 3, {}, D, false);
    const c = BC.Combat.enemyScaling(2, 0, {}, D, false);
    assert(b.hp > a.hp && c.hp > b.hp, 'la vida debería crecer');
    assert(c.dmg > a.dmg, 'el daño debería crecer');
    eq(BC.Combat.enemyScaling(4, 5, {}, D, true).hp, 1);
    near(BC.Combat.enemyScaling(4, 5, { enemyHpPct: 0.2, bossHpPct: 0.25 }, D, true).hp, 1.5);
  });

  // =============================== STATS ===============================
  test('Stats: base de cada personaje', () => {
    for (const id in D.characters) {
      const ch = D.characters[id];
      const inv = BC.Stats.emptyInventory();
      const { stats } = BC.Stats.computeStats(id, inv, {}, 0, D);
      eq(stats.maxHp, ch.base.maxHp, id + ' vida');
      eq(stats.armor, ch.base.armor, id + ' armadura');
      eq(stats.maxMana, ch.usesMana ? ch.base.maxMana : 0, id + ' maná');
      eq(stats.cooldownMult, 1);
    }
  });

  test('Stats: pasivas, reliquias, meta y ascensión se suman', () => {
    const inv = BC.Stats.emptyInventory();
    inv.passives.musculos = 3;
    inv.passives.vitalidad = 2;
    inv.relics.push('insigniaCaballero');
    const { stats } = BC.Stats.computeStats('asta', inv, { vida: 2, fuerza: 1 }, 0, D);
    near(stats.damagePct, 0.3 + 0.08 + 0.05);
    eq(stats.maxHp, D.characters.asta.base.maxHp + 40 + 15 + 20);
    const asc8 = BC.Stats.computeStats('asta', BC.Stats.emptyInventory(), {}, 8, D).stats;
    eq(asc8.maxHp, Math.round(D.characters.asta.base.maxHp * 0.85));
    const inv2 = BC.Stats.emptyInventory();
    inv2.passives.celeridad = 5;
    inv2.relics.push('capaReyMago', 'emblemaAmanecer');
    inv2.extra.cooldownPct = 0.3; // total 88% de reducción => se limita a 60%
    eq(BC.Stats.computeStats('asta', inv2, {}, 0, D).stats.cooldownMult, 0.4, 'mínimo de enfriamiento');
  });

  test('Habilidades: valores por nivel', () => {
    const z = D.skills.zanka;
    const l1 = BC.Stats.skillLevelStats(z, 1);
    eq(l1.damage, z.base.damage);
    eq(l1.count, 1);
    eq(BC.Stats.skillLevelStats(z, 3).count, 2);
    const l5 = BC.Stats.skillLevelStats(z, 5);
    eq(l5.count, 3);
    eq(l5.pierce, 5);
    eq(l5.damage, z.base.damage + z.perLevel.damage * 4);
    assert(BC.Stats.skillLevelStats(D.skills.destructora, 5).cooldown >= 0.15);
  });

  // =============================== SINERGIAS ===============================
  function inventoryFor(syn) {
    const inv = BC.Stats.emptyInventory();
    const req = syn.requires;
    for (const id of req.items || []) {
      if (D.skills[id]) inv.skills[id] = 1;
      else if (D.relics[id]) inv.relics.push(id);
      else if (D.passives[id]) inv.passives[id] = 1;
      else throw new Error('Sinergia ' + syn.id + ' pide algo inexistente: ' + id);
    }
    for (const tag in req.skillTags || {}) {
      const list = Object.keys(D.skills).filter((k) => (D.skills[k].tags || []).indexOf(tag) !== -1);
      for (let i = 0; i < req.skillTags[tag]; i++) inv.skills[list[i]] = 1;
    }
    for (const tag in req.tags || {}) {
      const have = inv.relics.filter((r) => D.relics[r].tags.indexOf(tag) !== -1).length;
      const extra = Object.keys(D.relics).filter((r) => D.relics[r].tags.indexOf(tag) !== -1 && inv.relics.indexOf(r) === -1);
      if (extra.length < req.tags[tag] - have) throw new Error('No hay suficientes reliquias con etiqueta ' + tag);
      for (let i = 0; i < req.tags[tag] - have; i++) inv.relics.push(extra[i]);
    }
    return inv;
  }

  test('Sinergias: cada una se activa con sus requisitos y no sin ellos', () => {
    for (const syn of D.synergies) {
      const allowed = [].concat(syn.requires.character || Object.keys(D.characters));
      const ch = allowed[0];
      const inv = inventoryFor(syn);
      for (const c of allowed) assert(BC.Stats.synergyActive(syn, c, inv, D), syn.id + ' no se activó con ' + c);
      if (syn.requires.character) {
        const other = Object.keys(D.characters).find((c) => allowed.indexOf(c) === -1);
        assert(!BC.Stats.synergyActive(syn, other, inv, D), syn.id + ' se activó con otro personaje');
      }
      // sacar el último requisito la desactiva
      const inv2 = JSON.parse(JSON.stringify(inv));
      if (syn.requires.items && syn.requires.items.length) {
        const last = syn.requires.items[syn.requires.items.length - 1];
        delete inv2.skills[last];
        delete inv2.passives[last];
        inv2.relics = inv2.relics.filter((r) => r !== last);
      } else if (syn.requires.skillTags) {
        delete inv2.skills[Object.keys(inv2.skills)[0]];
      } else inv2.relics.pop();
      assert(!BC.Stats.synergyActive(syn, ch, inv2, D), syn.id + ' sigue activa sin un requisito');
    }
  });

  test('Sinergias: Noelle + maná alto => Valquiria Desbordante', () => {
    const inv = BC.Stats.emptyInventory();
    inv.relics.push('trebolCuatro', 'emblemaAmanecer');
    const res = BC.Stats.computeStats('noelle', inv, {}, 0, D);
    assert(res.synergies.indexOf('valquiriaDesbordante') !== -1, 'falta Valquiria Desbordante');
    assert(res.synergies.indexOf('amanecerDorado') !== -1, 'falta Amanecer Dorado');
    eq(res.stats.ultDurationFlat, 4);
    near(res.stats.ultDamagePct, 0.3);
    const asta = BC.Stats.computeStats('asta', inv, {}, 0, D);
    assert(asta.synergies.indexOf('valquiriaDesbordante') === -1, 'Asta no debería tener Valquiria');
  });

  test('Sinergias: al activarse una nueva, recompute la informa', () => {
    const run = makeRun('asta');
    BC.Loot.applyReward(run, { kind: 'relic', id: 'fuegoMagna' }, D);
    const r = BC.Loot.applyReward(run, { kind: 'relic', id: 'botasLuck' }, D);
    assert(r.newSynergies.indexOf('locosBatalla') !== -1, 'Locos de la Batalla no se informó');
  });

  // =============================== RECOMPENSAS ===============================
  test('Recompensas: 3 opciones distintas y válidas', () => {
    const run = makeRun('yuno');
    for (let i = 0; i < 100; i++) {
      const ch = BC.Loot.rewardChoices(run, new BC.RNG('R' + i), D, 3);
      eq(ch.length, 3);
      eq(new Set(ch.map((c) => c.kind + c.id)).size, 3, 'opciones repetidas');
      assert(ch.some((c) => c.kind === 'skillNew' || c.kind === 'skillUp'), 'siempre debe haber una habilidad');
      for (const c of ch) {
        if (c.kind === 'skillNew') eq(run.inventory.skills[c.id] || 0, 0);
        if (c.kind === 'skillUp') assert(run.inventory.skills[c.id] < D.config.maxSkillLevel);
        if (c.kind === 'skillNew' || c.kind === 'skillUp') assert(D.skills[c.id].character === 'yuno' || D.skills[c.id].shared, c.id + ' no es de Yuno');
      }
    }
  });

  test('Recompensas: Asta nunca recibe objetos que requieren maná', () => {
    const run = makeRun('asta');
    for (const c of BC.Loot.candidates(run, D)) {
      const def = c.kind === 'passive' ? D.passives[c.id] : c.kind === 'relic' ? D.relics[c.id] : null;
      if (def) assert(!def.requiresMana, c.id + ' requiere maná');
    }
  });

  test('Recompensas: reliquias bloqueadas no aparecen hasta desbloquearlas', () => {
    const run = makeRun('asta');
    assert(BC.Loot.relicPool(run, D).indexOf('corazonLiebe') === -1, 'Corazón de Liebe no debería estar');
    const run2 = makeRun('asta', { unlockedRelics: ['corazonLiebe'] });
    assert(BC.Loot.relicPool(run2, D).indexOf('corazonLiebe') !== -1, 'Corazón de Liebe debería estar');
  });

  test('Recompensas: aplicar habilidad, mejora, pasiva y reliquia', () => {
    const run = makeRun('asta');
    BC.Loot.applyReward(run, { kind: 'skillNew', id: 'zanka' }, D);
    eq(run.inventory.skills.zanka, 1);
    BC.Loot.applyReward(run, { kind: 'skillUp', id: 'zanka' }, D);
    eq(run.inventory.skills.zanka, 2);
    run.hp = 50;
    BC.Loot.applyReward(run, { kind: 'passive', id: 'vitalidad' }, D);
    eq(run.stats.maxHp, D.characters.asta.base.maxHp + 20);
    eq(run.hp, 50 + 20 + 20, 'sube la vida máxima y cura');
    BC.Loot.applyReward(run, { kind: 'relic', id: 'rosarioLily' }, D);
    BC.Loot.applyReward(run, { kind: 'relic', id: 'rosarioLily' }, D);
    eq(run.inventory.relics.filter((r) => r === 'rosarioLily').length, 1, 'reliquia duplicada');
  });

  test('Tienda: precios suben con el reino y la ascensión', () => {
    const run = makeRun('noelle');
    const base = BC.Loot.shopStock(run, new BC.RNG('S'), D);
    assert(base.length >= 3, 'tienda vacía');
    const heal0 = base.find((i) => i.kind === 'heal').price;
    run.realmIndex = 2;
    const heal2 = BC.Loot.shopStock(run, new BC.RNG('S'), D).find((i) => i.kind === 'heal').price;
    assert(heal2 > heal0, 'el precio debería subir por reino');
    const runA = makeRun('noelle', { ascension: 4 });
    const healA = BC.Loot.shopStock(runA, new BC.RNG('S'), D).find((i) => i.kind === 'heal').price;
    assert(healA > heal0, 'el precio debería subir con ascensión 4');
  });

  // =============================== EVENTOS ===============================
  test('Eventos: los efectos usan claves conocidas', () => {
    const allowed = ['heal', 'maxHp', 'yul', 'relic', 'minRarity', 'skillUp', 'passive', 'passiveId', 'damagePct', 'chance', 'success', 'fail', 'yulPctGain', 'yulPctLoss'];
    function check(effs, where) {
      for (const ef of effs || []) {
        for (const k in ef) assert(allowed.indexOf(k) !== -1, where + ': clave desconocida ' + k);
        if (ef.relic && ef.relic !== 'random') assert(D.relics[ef.relic], where + ': reliquia inexistente');
        if (ef.passiveId) assert(D.passives[ef.passiveId], where + ': pasiva inexistente');
        check(ef.success, where);
        check(ef.fail, where);
      }
    }
    for (const ev of D.events) {
      assert(ev.options.length >= 2, ev.id + ' necesita 2 opciones');
      ev.options.forEach((o, i) => check(o.effects, ev.id + '#' + i));
    }
  });

  test('Eventos: costo, curación y azar determinístico', () => {
    const run = makeRun('asta');
    const ev = D.events.find((e) => e.id === 'iglesia');
    run.yul = 10;
    eq(BC.Events.canChoose(run, ev.options[1]), false);
    run.yul = 100;
    const r = BC.Events.applyOption(run, ev.options[1], new BC.RNG('E'), D);
    eq(r.ok, true);
    eq(run.yul, 60);
    assert(run.inventory.relics.indexOf('rosarioLily') !== -1, 'falta el rosario');
    run.hp = 10;
    BC.Events.applyOption(run, ev.options[0], new BC.RNG('E'), D);
    eq(run.hp, 10 + Math.round(run.stats.maxHp * 0.2));
    const fin = D.events.find((e) => e.id === 'finral');
    const r1 = makeRun('asta');
    const r2 = makeRun('asta');
    r1.yul = r2.yul = 100;
    BC.Events.applyOption(r1, fin.options[0], new BC.RNG('F'), D);
    BC.Events.applyOption(r2, fin.options[0], new BC.RNG('F'), D);
    eq(r1.yul, r2.yul, 'misma semilla, mismo resultado');
    assert(r1.yul === 150 || r1.yul === 50, 'resultado de apuesta inválido: ' + r1.yul);
  });

  // =============================== GUARDADO ===============================
  test('Guardado: estrellas de una run', () => {
    const base = { roomsCleared: 9, elitesKilled: 2, bossesDefeated: ['vetto'], won: false, ascension: 0 };
    eq(BC.Save.starsForRun(base, D), 3 + 2 + 3);
    eq(BC.Save.starsForRun(Object.assign({}, base, { won: true }), D), 13);
    eq(BC.Save.starsForRun(Object.assign({}, base, { ascension: 5 }), D), 16);
  });

  test('Guardado: resultado de run desbloquea reliquias y rango', () => {
    let s = BC.Save.defaultSave();
    const r = BC.Save.applyRunResult(s, { roomsCleared: 6, elitesKilled: 1, bossesDefeated: ['vetto'], won: false, kills: 50, realmReached: 1 }, D);
    s = r.save;
    eq(s.stars, r.stars + r.newAchievements.reduce((n, a) => n + a.stars, 0), 'estrellas de la partida + logros');
    assert(r.newUnlocks.indexOf('corazonLiebe') !== -1, 'debería desbloquear Corazón de Liebe');
    eq(s.maxAscension, 0);
    const w = BC.Save.applyRunResult(s, { roomsCleared: 30, elitesKilled: 3, bossesDefeated: ['vetto', 'vanica', 'mars', 'zenon', 'dante'], won: true, kills: 400, realmReached: 4, ascension: 0 }, D);
    eq(w.save.maxAscension, 1);
    eq(w.newAscension, true);
    eq(w.save.stats.wins, 1);
    eq(w.save.stats.runs, 2);
  });

  test('Guardado: comprar personajes y mejoras', () => {
    let s = BC.Save.defaultSave();
    eq(BC.Save.buyCharacter(s, 'yuno', D).ok, false);
    s.stars = 100;
    const b = BC.Save.buyCharacter(s, 'yuno', D);
    eq(b.ok, true);
    eq(b.save.stars, 100 - D.characters.yuno.unlockCost);
    assert(b.save.characters.indexOf('yuno') !== -1);
    eq(BC.Save.buyCharacter(b.save, 'yuno', D).ok, false, 'no se compra dos veces');
    s = b.save;
    const costs = D.meta.upgrades.revivir.costs;
    const u = BC.Save.buyUpgrade(s, 'revivir', D);
    eq(u.ok, true);
    eq(u.save.stars, s.stars - costs[0]);
    eq(BC.Save.buyUpgrade(u.save, 'revivir', D).ok, false, 'nivel máximo');
  });

  test('Guardado: ida y vuelta por localStorage y datos corruptos', () => {
    const st = fakeStorage();
    const s = BC.Save.defaultSave();
    s.stars = 7;
    s.characters.push('noelle');
    BC.Save.save(s, st);
    const l = BC.Save.load(st);
    eq(l.stars, 7);
    assert(l.characters.indexOf('noelle') !== -1);
    st.setItem(BC.Save.KEY, '{esto no es json');
    eq(BC.Save.load(st).stars, 0, 'datos corruptos => guardado nuevo');
    st.setItem(BC.Save.KEY, JSON.stringify({ stars: 3 }));
    const n = BC.Save.load(st);
    eq(n.stars, 3);
    assert(n.characters.indexOf('asta') !== -1, 'Asta siempre disponible');
  });

  // =============================== DATOS ===============================
  test('Datos: personajes, habilidades y reinos coherentes', () => {
    for (const id in D.characters) {
      const ch = D.characters[id];
      assert(ch.skillPool.indexOf(ch.basicSkill) !== -1, id + ': básica fuera del pool');
      for (const s of ch.skillPool) {
        assert(D.skills[s], id + ': habilidad inexistente ' + s);
        // las elementales son compartidas; sólo los versátiles usan habilidades de otros personajes
        if (!D.skills[s].shared && !ch.versatile) eq(D.skills[s].character, id, s + ' de otro personaje');
        if (D.skills[s].shared) assert(ch.usesMana, id + ' no usa maná y tiene una elemental');
        assert(BC.Skills.behaviors[D.skills[s].behavior], s + ': comportamiento inexistente');
      }
      assert(BC.Skills.ultimates[ch.ultimate.id], id + ': definitiva inexistente');
    }
    for (const r of D.realms) {
      for (const e in r.enemies) assert(D.enemies[e], r.id + ': enemigo inexistente ' + e);
      for (const e of r.elites) assert(D.enemies[e] && D.enemies[e].elite, r.id + ': élite inválido ' + e);
      assert(D.bosses[r.boss], r.id + ': jefe inexistente');
    }
    const all = Object.assign({}, D.enemies, D.bosses);
    for (const id in all) {
      const e = all[id];
      assert(BC.EnemyAI.AI[e.behavior], id + ': comportamiento inexistente ' + e.behavior);
      for (const ph of e.phases || []) {
        for (const a of ph.attacks) {
          assert(BC.EnemyAI.ATTACKS[a.type], id + ': ataque inexistente ' + a.type);
          if (a.type === 'summon') assert(D.enemies[a.enemy], id + ': invoca algo inexistente');
        }
      }
    }
  });

  test('Datos: mínimo 30 habilidades/objetos y 5 sinergias', () => {
    const n = Object.keys(D.skills).length + Object.keys(D.passives).length + Object.keys(D.relics).length;
    assert(n >= 30, 'hay ' + n);
    assert(D.synergies.length >= 5, 'hay ' + D.synergies.length + ' sinergias');
    assert(D.realms.filter((r) => !r.secret).length === 5, 'deberían ser 5 reinos (más el secreto)');
    const nb = Object.keys(D.bosses).filter((b) => !D.bosses[b].secret).length;
    assert(nb >= 3 && nb <= 5, 'entre 3 y 5 jefes (sin contar el secreto)');
  });

  // =============================== SIMULACIÓN ===============================
  test('Motor: una sala de combate se limpia y ofrece recompensa', () => {
    const g = new BC.Game({ headless: true });
    g.godMode = true;
    g.startRun({ characterId: 'asta', seed: 'SALA1' });
    let t = 0;
    while (g.state === 'playing' && t < 120) {
      const inp = BC.Bot.steer(g);
      Object.assign(g.input, inp);
      g.update(1 / 30);
      t += 1 / 30;
    }
    // (el loop de arriba se corta en cada subida de nivel)
    let levelUps = 0;
    while (t < 120 && !g.room.doors.length) {
      if (g.state === 'reward') {
        eq(g.pendingReward.kind, 'level', 'en combate normal sólo hay recompensas por nivel');
        levelUps++;
        g.chooseReward(0);
      }
      Object.assign(g.input, BC.Bot.steer(g));
      g.update(1 / 30);
      t += 1 / 30;
    }
    assert(g.run.kills > 0, 'debería haber matado enemigos');
    eq(g.run.roomsCleared, 1);
    assert(g.room.doors.length >= 1, 'deberían abrirse puertas sin recompensa de sala');
    assert(levelUps >= 1 && g.run.level >= 2, 'debería haber subido de nivel');
  });

  test('Motor: el jugador muere si no esquiva (sin modo dios)', () => {
    const g = new BC.Game({ headless: true });
    g.startRun({ characterId: 'yuno', seed: 'MUERTE' });
    g.run.hp = 1;
    g.player.invuln = 0;
    g.hurtPlayer(50, {});
    eq(g.state, 'gameover');
    eq(g.run.over, true);
  });

  test('Motor: Segunda oportunidad e Hilo Rojo evitan la muerte', () => {
    const g = new BC.Game({ headless: true, save: Object.assign(BC.Save.defaultSave(), { upgrades: { revivir: 1 } }) });
    g.startRun({ characterId: 'asta', seed: 'REV' });
    eq(g.run.revives, 1);
    g.run.hp = 1;
    g.player.invuln = 0;
    g.hurtPlayer(80, {});
    eq(g.state, 'playing');
    assert(g.run.hp > 1, 'debería revivir con vida');
    BC.Loot.applyReward(g.run, { kind: 'relic', id: 'hiloVanessa' }, D);
    g.player.computeEff();
    g.run.hp = 1;
    g.player.invuln = 0;
    g.hurtPlayer(80, {});
    eq(g.run.hp, 1, 'el hilo deja con 1 de vida');
    eq(g.state, 'playing');
  });

  // =============================== EXPERIENCIA ===============================
  test('Experiencia: cada nivel pide más XP y se pueden subir varios de golpe', () => {
    for (let l = 1; l < 30; l++) assert(BC.Run.xpToNext(l + 1, D) > BC.Run.xpToNext(l, D), 'el nivel ' + (l + 1) + ' debería costar más');
    const run = makeRun('asta');
    const need = BC.Run.xpToNext(1, D) + BC.Run.xpToNext(2, D);
    eq(BC.Run.addXp(run, need + 1, D), 2);
    eq(run.level, 3);
    eq(run.xp, 1);
    assert(BC.Run.enemyXp(D.bosses.vetto, D) > BC.Run.enemyXp(D.enemies.valtos, D), 'jefe da más que élite');
    assert(BC.Run.enemyXp(D.enemies.valtos, D) > BC.Run.enemyXp(D.enemies.bandido, D), 'élite da más que un bandido');
  });

  // =============================== RELIQUIAS MÁXIMAS ===============================
  test('Reliquias: máximo por partida; después se ofrece otra cosa', () => {
    const run = makeRun('yuno');
    const ids = Object.keys(D.relics).filter((id) => !D.relics[id].unlock);
    for (let i = 0; i < D.config.maxRelics; i++) BC.Loot.applyReward(run, { kind: 'relic', id: ids[i] }, D);
    eq(run.inventory.relics.length, D.config.maxRelics);
    eq(BC.Loot.relicPool(run, D).length, 0);
    for (let i = 0; i < 20; i++) {
      for (const c of BC.Loot.relicChoices(run, new BC.RNG('C' + i), D, 3)) assert(c.kind !== 'relic', 'ofreció una reliquia de más');
      for (const c of BC.Loot.rewardChoices(run, new BC.RNG('N' + i), D, 3)) assert(c.kind !== 'relic', 'ofreció una reliquia de más');
    }
    assert(BC.Loot.shopStock(run, new BC.RNG('S'), D).every((it) => it.kind !== 'relic'), 'la tienda vende reliquias de más');
    const ev = { options: [{ effects: [{ relic: 'random' }] }] };
    const before = run.yul;
    BC.Events.applyOption(run, ev.options[0], new BC.RNG('E'), D);
    eq(run.inventory.relics.length, D.config.maxRelics, 'un evento no debe pasar el máximo');
    assert(run.yul > before, 'en su lugar da yules');
  });

  // =============================== MEJORAS PERMANENTES NUEVAS ===============================
  test('Base: Velocidad al máximo sigue siendo más lenta que antes', () => {
    const before = { asta: 215, yuno: 245, noelle: 205, mago: 225 };
    for (const id in before) {
      const st = BC.Stats.computeStats(id, BC.Stats.emptyInventory(), { velocidad: 3 }, 0, D).stats;
      assert(st.speed < before[id], id + ' llega a ' + st.speed + ' (antes ' + before[id] + ')');
      assert(st.speed > D.characters[id].base.speed, 'la mejora debería sumar');
    }
  });

  test('Base: Meditación cura de a poco', () => {
    const st = BC.Stats.computeStats('asta', BC.Stats.emptyInventory(), { meditacion: 3 }, 0, D).stats;
    near(st.regen, 0.6, 1e-9);
  });

  test('Base: Pacto de Maldición sube daño, enemigos, vida enemiga y estrellas', () => {
    const st = BC.Stats.computeStats('asta', BC.Stats.emptyInventory(), { maldicion: 2 }, 0, D).stats;
    near(st.damagePct, 0.24, 1e-9);
    const w = BC.Stats.worldMods(0, { maldicion: 2 }, D);
    near(w.enemyHpPct, 0.3, 1e-9);
    near(w.waveSizePct, 0.3, 1e-9);
    const node = { id: '0-3-0', type: 'combat', realm: 0, floor: 3 };
    const a = BC.MapGen.generateEncounter('MAL', node, D, 0).waves.reduce((n, wv) => n + wv.length, 0);
    const b = BC.MapGen.generateEncounter('MAL', node, D, w).waves.reduce((n, wv) => n + wv.length, 0);
    assert(b > a, 'debería haber más enemigos (' + a + ' vs ' + b + ')');
    assert(BC.Combat.enemyScaling(0, 0, w, D, false).hp > BC.Combat.enemyScaling(0, 0, {}, D, false).hp, 'más vida enemiga');
    const sum = { roomsCleared: 9, elitesKilled: 0, bossesDefeated: [], won: false, ascension: 0 };
    assert(BC.Save.starsForRun(Object.assign({ starBonus: 0.3 }, sum), D) > BC.Save.starsForRun(sum, D), 'más estrellas');
    // y el motor la aplica de verdad
    const g = new BC.Game({ headless: true, save: Object.assign(BC.Save.defaultSave(), { upgrades: { maldicion: 2 } }) });
    g.startRun({ characterId: 'asta', seed: 'MAL' });
    near(g.ascMods.enemyHpPct, 0.3, 1e-9);
    near(g.summary().starBonus, 0.3, 1e-9);
  });

  // =============================== ELEMENTALES ===============================
  test('Elementales: Asta nunca las recibe; Yuno, Noelle y el Novato sí', () => {
    const shared = Object.keys(D.skills).filter((id) => D.skills[id].shared);
    eq(shared.length, 48, '8 elementos x 6');
    for (const el in D.elements) eq(shared.filter((id) => D.skills[id].element === el).length, 6, 'hechizos de ' + el);
    for (const c of BC.Loot.candidates(makeRun('asta'), D)) assert(shared.indexOf(c.id) === -1, 'Asta recibió ' + c.id);
    for (const ch of ['yuno', 'noelle', 'mago']) {
      const ids = BC.Loot.candidates(makeRun(ch), D).map((c) => c.id);
      for (const sId of shared) assert(ids.indexOf(sId) !== -1, ch + ' no puede aprender ' + sId);
    }
  });

  test('Elementales: los 48 hechizos funcionan en combate', () => {
    const ids = Object.keys(D.skills).filter((id) => D.skills[id].element);
    for (const id of ids) {
      const def = D.skills[id];
      const g = new BC.Game({ headless: true });
      g.startRun({ characterId: 'mago', seed: 'ELEM' });
      g.godMode = true;
      g.room.waves = []; // sin oleadas: sólo nuestro enemigo de prueba
      delete g.run.inventory.skills.balaMagica; // para medir sólo el hechizo
      BC.Loot.applyReward(g.run, { kind: 'skillNew', id }, D);
      const e = g.spawnEnemy('corrompido', 640, 500);
      e.hp = e.maxHp = 99999;
      e.behavior = 'none'; // quieto
      g.player.x = 640;
      // las ráfagas en todas direcciones pueden pasar entre los huecos si el enemigo está lejos
      g.player.y = def.behavior === 'radialBurst' ? 530 : 590;
      if (def.base.whenHurt !== undefined) g.run.hp = g.run.stats.maxHp * 0.4; // curaciones
      const hp0 = g.run.hp;
      let slowed = false;
      let burned = false;
      let poisoned = false;
      let buffed = false;
      for (let i = 0; i < 150; i++) {
        g.input.mx = g.input.my = 0;
        g.player.mana = 9999;
        g.update(1 / 30);
        if (e.slowAmt > 0) slowed = true;
        if (e.burn) burned = true;
        if (e.poison) poisoned = true;
        if (g.player.buffs.length) buffed = true;
      }
      if (def.behavior === 'buff') {
        assert(buffed || g.run.hp > hp0, id + ': no dio la mejora ni curó');
      } else assert(e.hp < e.maxHp, id + ' no hizo daño');
      if (def.base.slowOnHit || def.base.slow) assert(slowed, id + ' debería frenar');
      if (def.base.burn) assert(burned, id + ' debería quemar');
      if (def.base.poison) assert(poisoned, id + ' debería envenenar');
    }
  });

  test('Sinergias elementales: 6 de un elemento y 3+3 de dos elementos', () => {
    const of = (el) => Object.keys(D.skills).filter((id) => D.skills[id].element === el);
    const inv = BC.Stats.emptyInventory();
    inv.skills.balaMagica = 1;
    for (const id of of('fuego').slice(0, 5)) inv.skills[id] = 1;
    let syn = BC.Stats.computeStats('mago', inv, {}, 0, D).synergies;
    assert(syn.indexOf('llamaImperial') === -1, 'con 5 de fuego no');
    inv.skills[of('fuego')[5]] = 1;
    syn = BC.Stats.computeStats('mago', inv, {}, 0, D).synergies;
    assert(syn.indexOf('llamaImperial') !== -1, 'con 6 de fuego sí');
    const inv2 = BC.Stats.emptyInventory();
    for (const id of of('fuego').slice(0, 3).concat(of('viento').slice(0, 2))) inv2.skills[id] = 1;
    assert(BC.Stats.computeStats('mago', inv2, {}, 0, D).synergies.indexOf('tormentaDeFuego') === -1, '3+2 no');
    inv2.skills[of('viento')[2]] = 1;
    assert(BC.Stats.computeStats('mago', inv2, {}, 0, D).synergies.indexOf('tormentaDeFuego') !== -1, '3+3 sí');
    // las habilidades propias de Yuno cuentan como viento
    const inv3 = BC.Stats.emptyInventory();
    for (const id of ['cuchillasViento', 'tornado', 'lluviaCuchillas', 'medialuna', 'escudoViento', 'rafagaViento']) inv3.skills[id] = 1;
    assert(BC.Stats.computeStats('yuno', inv3, {}, 0, D).synergies.indexOf('reyDeLosVientos') !== -1, 'Yuno con 6 de viento');
    // Asta con sus 5 espadas
    const inv4 = BC.Stats.emptyInventory();
    for (const id of D.characters.asta.skillPool) inv4.skills[id] = 1;
    assert(BC.Stats.computeStats('asta', inv4, {}, 0, D).synergies.indexOf('cincoEspadas') !== -1, 'Asta con 5 espadas');
    // 8 de elemento + 10 de pares
    eq(D.synergies.filter((x) => x.requires.skillTags && Object.keys(x.requires.skillTags).length === 1 && Object.values(x.requires.skillTags)[0] === 6).length, 8);
    eq(D.synergies.filter((x) => x.requires.skillTags && Object.keys(x.requires.skillTags).length === 2).length, 10);
  });

  test('Afinidad: tener hechizos de un elemento hace más probable que salgan más de ese elemento', () => {
    const run = makeRun('mago');
    const w0 = BC.Loot.candidates(run, D).find((c) => c.id === 'leoRugiens').w;
    BC.Loot.applyReward(run, { kind: 'skillNew', id: 'bolaFuego' }, D);
    BC.Loot.applyReward(run, { kind: 'skillNew', id: 'espiralFuego' }, D);
    const w2 = BC.Loot.candidates(run, D).find((c) => c.id === 'leoRugiens').w;
    assert(w2 > w0 * 3, 'la afinidad debería subir mucho el peso (' + w0 + ' -> ' + w2 + ')');
  });

  test('Grimorio: las sinergias se descubren al activarlas y quedan guardadas', () => {
    const s0 = BC.Save.defaultSave();
    eq(s0.discoveredSynergies.length, 0, 'empiezan ocultas');
    eq(BC.Save.discoverSynergy(s0, 'tempestad'), true);
    eq(BC.Save.discoverSynergy(s0, 'tempestad'), false, 'no se duplica');
    const st = fakeStorage();
    BC.Save.save(s0, st);
    assert(BC.Save.load(st).discoveredSynergies.indexOf('tempestad') !== -1, 'se guarda');
    const r = BC.Save.applyRunResult(s0, { roomsCleared: 3, elitesKilled: 0, bossesDefeated: [], won: false }, D);
    assert(r.save.discoveredSynergies.indexOf('tempestad') !== -1, 'sobrevive al fin de partida');
    // el motor avisa cuando se activa una sinergia
    const g = new BC.Game({ headless: true });
    const got = [];
    g.on((t, p) => t === 'synergy' && got.push(p.id));
    g.startRun({ characterId: 'asta', seed: 'SYN' });
    for (const id of ['fuegoMagna', 'botasLuck']) {
      const res = BC.Loot.applyReward(g.run, { kind: 'relic', id }, D);
      g.onNewSynergies(res.newSynergies);
    }
    assert(got.indexOf('locosBatalla') !== -1, 'debería avisar la sinergia');
  });

  // =============================== LEGENDARIAS ===============================
  test('Legendarias: sólo salen de jefes y si están desbloqueadas', () => {
    const leg = Object.keys(D.relics).filter((id) => D.relics[id].rarity === 'legendary');
    assert(leg.length >= 5, 'deberían ser al menos 5 legendarias, hay ' + leg.length);
    for (const id of leg) assert(D.relics[id].unlock, id + ' debería requerir desbloqueo');
    const run = makeRun('yuno', { unlockedRelics: leg });
    for (const id of leg) {
      assert(BC.Loot.relicPool(run, D).indexOf(id) === -1, id + ' no debe salir fuera de un jefe');
      assert(BC.Loot.relicPool(run, D, null, true).indexOf(id) !== -1, id + ' debe poder salir de un jefe');
    }
    for (let i = 0; i < 40; i++) {
      for (const c of BC.Loot.rewardChoices(run, new BC.RNG('L' + i), D, 3)) assert(c.kind !== 'relic' || leg.indexOf(c.id) === -1, 'legendaria en recompensa normal');
      for (const c of BC.Loot.relicChoices(run, new BC.RNG('E' + i), D, 3)) assert(leg.indexOf(c.id) === -1, 'legendaria en premio de élite');
      for (const it of BC.Loot.shopStock(run, new BC.RNG('S' + i), D)) assert(leg.indexOf(it.id) === -1, 'legendaria en la tienda');
    }
    // sin desbloquear no salen ni de jefes
    assert(BC.Loot.relicPool(makeRun('yuno'), D, null, true).every((id) => leg.indexOf(id) === -1), 'legendaria sin desbloquear');
    // y son poco probables: en 300 premios de jefe aparecen, pero en menos de la mitad
    let n = 0;
    for (let i = 0; i < 300; i++) if (BC.Loot.relicChoices(run, new BC.RNG('B' + i), D, 3, 'rare', true).some((c) => leg.indexOf(c.id) !== -1)) n++;
    assert(n > 0 && n < 150, 'frecuencia de legendarias en premios de jefe: ' + n + '/300');
  });

  // =============================== COFRES ===============================
  test('Cofres: mejoran algo que ya tenés, dan yules o curan', () => {
    const seen = {};
    for (let i = 0; i < 200; i++) {
      const run = makeRun('yuno');
      BC.Loot.applyReward(run, { kind: 'passive', id: 'musculos' }, D);
      run.hp = run.stats.maxHp / 2;
      const before = JSON.stringify(run.inventory);
      const y0 = run.yul;
      const hp0 = run.hp;
      const r = BC.Loot.openChest(run, new BC.RNG('C' + i), D);
      seen[r.kind] = true;
      if (r.kind === 'upgrade') {
        const inv = run.inventory;
        assert(inv.skills.cuchillasViento === 2 || inv.passives.musculos === 2, 'debería subir algo que ya tenía');
        eq(Object.keys(inv.skills).length, 1, 'no agrega habilidades nuevas');
      } else if (r.kind === 'yul') {
        assert(run.yul > y0, 'debería dar yules');
        eq(JSON.stringify(run.inventory), before);
      } else {
        assert(run.hp > hp0, 'debería curar');
      }
    }
    assert(seen.upgrade && seen.yul && seen.heal, 'deberían salir los 3 tipos: ' + Object.keys(seen));
    // con todo al máximo y la vida llena, sólo yules
    const full = makeRun('asta');
    full.inventory.skills.mataDemonios = D.config.maxSkillLevel;
    full.inventory.evolved = ['x', 'y']; // ya tiene el máximo de potenciados
    for (let i = 0; i < 20; i++) eq(BC.Loot.openChest(full, new BC.RNG('F' + i), D).kind, 'yul');
  });

  test('Cofres: los élites los sueltan y se abren al tocarlos', () => {
    let chests = 0;
    for (let i = 0; i < 30; i++) {
      const g = new BC.Game({ headless: true });
      g.startRun({ characterId: 'asta', seed: 'COFRE' + i });
      const e = g.spawnEnemy('valtos', 640, 300);
      g.killEnemy(e);
      if (g.room.pickups.some((k) => k.kind === 'chest')) chests++;
    }
    assert(chests > 3 && chests < 25, 'los élites deberían soltar cofres a veces: ' + chests + '/30');
    const g = new BC.Game({ headless: true });
    g.startRun({ characterId: 'asta', seed: 'ABRIR' });
    g.room.waves = [];
    g.room.pickups.push(new BC.Entities.Pickup('chest', g.player.x, g.player.y - 10, 0, 0, 0));
    const y0 = g.run.yul;
    const inv0 = JSON.stringify(g.run.inventory);
    const hp0 = g.run.hp;
    for (let i = 0; i < 30; i++) g.update(1 / 30);
    eq(g.room.pickups.filter((k) => k.kind === 'chest').length, 0, 'el cofre se abrió');
    assert(g.run.yul > y0 || JSON.stringify(g.run.inventory) !== inv0 || g.run.hp !== hp0, 'el cofre dio algo');
  });

  // =============================== HECHIZOS POTENCIADOS ===============================
  test('Potenciados: sólo de cofres, sobre habilidades al máximo y hasta 2', () => {
    for (const id in D.skills) assert(D.evolutions[id], 'falta el nombre potenciado de ' + id);
    const def = D.skills.zanka;
    const normal = BC.Stats.skillLevelStats(def, 5);
    const evo = BC.Stats.skillLevelStats(def, 5, D.config.evolution);
    assert(evo.damage > normal.damage * 1.5, 'más daño');
    assert(evo.cooldown < normal.cooldown, 'menos enfriamiento');
    eq(evo.count, normal.count + 1, 'un proyectil más');
    // un cofre no potencia algo que no está al máximo
    for (let i = 0; i < 100; i++) {
      const run = makeRun('asta');
      run.inventory.skills.mataDemonios = 4;
      assert(BC.Loot.openChest(run, new BC.RNG('N' + i), D).kind !== 'evolve', 'potenció algo que no está al máximo');
    }
    // con 3 habilidades al máximo, como mucho 2 potenciados
    const r2 = makeRun('asta');
    for (const id of ['mataDemonios', 'zanka', 'habitante']) r2.inventory.skills[id] = 5;
    let evolves = 0;
    for (let i = 0; i < 400; i++) if (BC.Loot.openChest(r2, new BC.RNG('E' + i), D).kind === 'evolve') evolves++;
    eq(r2.inventory.evolved.length, 2, 'máximo 2 potenciados');
    eq(evolves, 2);
    // probabilidad aproximada cuando es posible: 10-15%
    let n = 0;
    for (let i = 0; i < 2000; i++) {
      const r3 = makeRun('asta');
      r3.inventory.skills.mataDemonios = 5;
      r3.hp = r3.stats.maxHp / 2;
      if (BC.Loot.openChest(r3, new BC.RNG('P' + i), D).kind === 'evolve') n++;
    }
    assert(n > 200 && n < 300, 'probabilidad de potenciar: ' + (n / 20).toFixed(1) + '%');
    // el motor usa los valores potenciados
    const g = new BC.Game({ headless: true });
    g.startRun({ characterId: 'asta', seed: 'EVO' });
    g.run.inventory.skills.mataDemonios = 5;
    g.run.inventory.evolved.push('mataDemonios');
    eq(BC.Loot.describe({ kind: 'skillUp', id: 'mataDemonios' }, g.run, D).title, '✦ ' + D.evolutions.mataDemonios);
  });

  test('Cofres: casi nunca de enemigos comunes, a veces de élites y siempre de jefes', () => {
    assert(D.chests.chance <= 0.01, 'comunes: casi nunca');
    assert(D.chests.eliteChance > D.chests.chance * 10, 'élites: bastante más');
    const g = new BC.Game({ headless: true });
    g.startRun({ characterId: 'asta', seed: 'JEFECOFRE' });
    const b = g.spawnEnemy('vetto', 640, 300);
    g.killEnemy(b);
    assert(g.room.pickups.some((k) => k.kind === 'chest'), 'el jefe tiene que soltar un cofre');
  });

  // =============================== ENEMIGOS NUEVOS ===============================
  test('Enemigos nuevos: torreta, explosivo, gólem que se parte y diablillo', () => {
    const mk = (id, x, y) => {
      const g = new BC.Game({ headless: true });
      g.startRun({ characterId: 'asta', seed: 'ENE' });
      g.godMode = true;
      g.room.waves = [];
      g.run.inventory.skills = {}; // que el jugador no ataque
      const e = g.spawnEnemy(id, x, y);
      return { g, e };
    };
    // torreta: no se mueve y dispara
    let { g, e } = mk('plantaCarnivora', 640, 400);
    let shots = 0;
    for (let i = 0; i < 120; i++) {
      g.update(1 / 30);
      shots = Math.max(shots, g.room.projectiles.filter((q) => q.owner === 'enemy').length);
    }
    eq(Math.round(e.x), 640, 'la torreta no se mueve');
    assert(shots > 0, 'la torreta dispara');
    // explosivo: se acerca, avisa y explota (muere)
    ({ g, e } = mk('esclavoMaldito', 640, 450));
    let warned = false;
    for (let i = 0; i < 150 && !e.dead; i++) {
      g.update(1 / 30);
      if (g.room.zones.some((z) => z.kind === 'telegraphCircle')) warned = true;
    }
    assert(warned, 'el explosivo debería avisar con un círculo');
    assert(e.dead, 'el explosivo debería explotar');
    // gólem: al morir se parte en fragmentos
    ({ g, e } = mk('golemCristal', 640, 300));
    g.killEnemy(e);
    eq(g.room.enemies.filter((x) => x.id === 'fragmentoCristal').length, D.enemies.golemCristal.splitInto.count);
    // diablillo: se teletransporta
    ({ g, e } = mk('diablillo', 200, 200));
    let jumped = false;
    let last = { x: e.x, y: e.y };
    for (let i = 0; i < 200; i++) {
      g.update(1 / 30);
      if (Math.hypot(e.x - last.x, e.y - last.y) > 40) jumped = true;
      last = { x: e.x, y: e.y };
    }
    assert(jumped, 'el diablillo debería teletransportarse');
  });

  test('Lucius: Tiempo Detenido frena al jugador y después dispara', () => {
    const g = new BC.Game({ headless: true });
    g.startRun({ characterId: 'asta', seed: 'TIEMPO' });
    g.godMode = true;
    const e = g.spawnEnemy('lucius', 640, 250);
    const a = D.bosses.lucius.phases[1].attacks.find((x) => x.type === 'timeStop');
    e.atk = { def: a, s: {} };
    BC.EnemyAI.ATTACKS.timeStop.start(g, e, a, e.atk.s);
    g.player.computeEff();
    assert(g.player.slowAmt >= 0.7, 'el jugador debería quedar casi quieto');
    let done = false;
    for (let i = 0; i < 90 && !done; i++) done = BC.EnemyAI.ATTACKS.timeStop.update(g, e, a, e.atk.s, 1 / 30);
    assert(g.room.projectiles.filter((q) => q.owner === 'enemy').length >= a.then.count, 'después debería disparar');
  });

  // =============================== REINO SECRETO ===============================
  test('Reino secreto: aparece después de ganar 3 veces y Lucius es el final', () => {
    const save = BC.Save.defaultSave();
    eq(BC.Save.secretUnlocked(save, D), false);
    let g = new BC.Game({ headless: true, save });
    g.startRun({ characterId: 'asta', seed: 'SEC' });
    eq(g.run.map.realms.length, 5, 'sin desbloquear: 5 reinos');
    let s2 = save;
    let res;
    for (let i = 0; i < 3; i++) {
      res = BC.Save.applyRunResult(s2, { roomsCleared: 40, elitesKilled: 2, bossesDefeated: ['vetto', 'vanica', 'mars', 'zenon', 'dante'], won: true, kills: 300, realmReached: 4, characterId: 'asta', time: 1000 }, D);
      s2 = res.save;
    }
    eq(res.newSecret, true, 'avisa que se desbloqueó en la 3ª victoria');
    eq(BC.Save.secretUnlocked(s2, D), true);
    g = new BC.Game({ headless: true, save: s2 });
    g.startRun({ characterId: 'asta', seed: 'SEC' });
    eq(g.run.map.realms.length, 6, 'con el secreto: 6 reinos');
    const last = g.run.map.realms[5];
    eq(last.floors[last.floors.length - 1][0].type, 'boss');
    eq(BC.MapGen.generateEncounter('SEC', last.floors[last.floors.length - 1][0], D, 0).boss, 'lucius');
    // vencer a Dante ya no gana la partida: hay que seguir
    g.run.realmIndex = 4;
    g.afterReward('boss');
    eq(g.state, 'playing', 'después de Dante sigue el reino secreto');
    g.run.realmIndex = 5;
    g.afterReward('boss');
    eq(g.state, 'victory', 'vencer a Lucius gana');
  });

  test('Simulación: el reino secreto se puede completar (modo dios)', () => {
    const save = BC.Save.defaultSave();
    save.stats.wins = D.config.secretUnlockWins;
    const r = BC.Bot.simulate({ characterId: 'yuno', seed: 'SECRETO', god: true, save, maxTime: 9000 });
    if (r.error) throw new Error(r.error);
    eq(r.summary.won, true);
    assert(r.summary.bossesDefeated.indexOf('lucius') !== -1, 'debería derrotar a Lucius');
  }, { slow: true });

  // =============================== LOGROS Y ESTADÍSTICAS ===============================
  test('Logros: cada uno tiene condición y se consiguen una sola vez', () => {
    for (const a of D.achievements) assert(BC.Progress.CHECKS[a.id], 'falta la condición de ' + a.id);
    let s0 = BC.Save.defaultSave();
    const win = { roomsCleared: 40, elitesKilled: 2, bossesDefeated: ['vetto', 'vanica', 'mars', 'zenon', 'dante'], won: true, kills: 600, realmReached: 4, characterId: 'yuno', time: 1500, level: 20, synergies: ['reyDeLosVientos'], evolved: 2, legendaries: 1, dashes: 10, maxYul: 520, bossNoHit: 1, ascension: 0 };
    const r = BC.Save.applyRunResult(s0, win, D);
    const got = r.newAchievements.map((a) => a.id);
    for (const id of ['primerPaso', 'caballeroMagico', 'rivales', 'elementalista', 'cazador', 'potenciado', 'legendario', 'intocable', 'millonario']) assert(got.indexOf(id) !== -1, 'debería conseguir ' + id);
    for (const id of ['sinMagia', 'reyMago', 'sinEsquivar', 'rango5', 'masAlla']) assert(got.indexOf(id) === -1, 'no debería conseguir ' + id);
    const r2 = BC.Save.applyRunResult(r.save, win, D);
    eq(r2.newAchievements.length, 0, 'no se repiten');
    // sin dash
    const r3 = BC.Save.applyRunResult(r2.save, Object.assign({}, win, { dashes: 0, characterId: 'asta' }), D);
    const g3 = r3.newAchievements.map((a) => a.id);
    assert(g3.indexOf('sinEsquivar') !== -1 && g3.indexOf('sinMagia') !== -1, 'sin esquivar y con Asta');
  });

  test('Estadísticas: historial, por personaje y quién te mató', () => {
    let s0 = BC.Save.defaultSave();
    for (let i = 0; i < 35; i++) {
      s0 = BC.Save.applyRunResult(s0, { roomsCleared: 5, elitesKilled: 0, bossesDefeated: [], won: false, kills: 50, realmReached: 1, characterId: i % 2 ? 'asta' : 'noelle', time: 300, level: 6, killedBy: i % 3 ? 'Vanica Zogratis' : 'Bandido', synergies: ['tempestad'] }, D).save;
    }
    eq(s0.history.length, 30, 'guarda las últimas 30');
    eq(s0.stats.perChar.asta.runs, 17);
    eq(s0.stats.perChar.noelle.runs, 18);
    eq(BC.Progress.top(s0.stats.killers, 1)[0][0], 'Vanica Zogratis');
    eq(s0.stats.synergyUse.tempestad, 35);
    // el motor registra quién dio el golpe final
    const g = new BC.Game({ headless: true });
    g.startRun({ characterId: 'asta', seed: 'MUERTE' });
    g.run.hp = 1;
    g.player.invuln = 0;
    g.hurtPlayer(500, { by: 'Vetto' });
    eq(g.summary().killedBy, 'Vetto');
  });

  // =============================== AJUSTES DE PARTIDA ===============================
  test('Tienda: la poción de vida se compra una sola vez', () => {
    const g = new BC.Game({ headless: true });
    g.startRun({ characterId: 'asta', seed: 'POCION' });
    g.shopStock = BC.Loot.shopStock(g.run, new BC.RNG('S'), D);
    g.state = 'shop';
    g.run.yul = 9999;
    g.run.hp = 10;
    const i = g.shopStock.findIndex((it) => it.kind === 'heal');
    eq(g.buyItem(i), true, 'la primera compra funciona');
    eq(g.buyItem(i), false, 'la segunda no');
    eq(g.shopStock[i].sold, true);
  });

  test('Pasivas: máximo de distintas, pero las que tenés se siguen subiendo', () => {
    const run = makeRun('yuno');
    const ids = Object.keys(D.passives).slice(0, D.config.maxPassives);
    for (const id of ids) BC.Loot.applyReward(run, { kind: 'passive', id }, D);
    const c = BC.Loot.candidates(run, D).filter((x) => x.kind === 'passive');
    assert(c.length > 0, 'debería ofrecer subir las que ya tiene');
    for (const x of c) assert(ids.indexOf(x.id) !== -1, 'ofreció una pasiva nueva: ' + x.id);
    // un evento con pasiva fija tampoco pasa el máximo
    const other = Object.keys(D.passives).find((id) => ids.indexOf(id) === -1 && !D.passives[id].requiresMana);
    BC.Events.applyOption(run, { effects: [{ passiveId: other }] }, new BC.RNG('E'), D);
    assert(!(run.inventory.passives[other] > 0), 'el evento agregó una pasiva de más');
    eq(Object.keys(run.inventory.passives).length, D.config.maxPassives);
  });

  test('Re-tiradas: se gana una cada 3 niveles', () => {
    const g = new BC.Game({ headless: true });
    g.startRun({ characterId: 'asta', seed: 'REROLL' });
    const r0 = g.run.rerolls;
    // dar XP suficiente para llegar al nivel 7 (2 re-tiradas: niveles 3 y 6)
    let need = 0;
    for (let l = 1; l < 7; l++) need += BC.Run.xpToNext(l, D);
    g.run.xp = need - 1;
    const e = g.spawnEnemy('bandido', 900, 300);
    g.killEnemy(e);
    eq(g.run.level, 7);
    eq(g.run.rerolls, r0 + 2);
  });

  test('Cofre: abre una ventana que pausa el juego hasta cerrarla', () => {
    const g = new BC.Game({ headless: true });
    const seen = [];
    g.on((t, p) => t === 'chest' && seen.push(p));
    g.startRun({ characterId: 'asta', seed: 'VENTANA' });
    g.room.waves = [];
    g.room.pickups.push(new BC.Entities.Pickup('chest', g.player.x, g.player.y - 10, 0, 0, 0));
    for (let i = 0; i < 30 && g.state === 'playing'; i++) g.update(1 / 30);
    eq(g.state, 'chest', 'debería mostrar la ventana del cofre');
    eq(seen.length, 1);
    assert(seen[0].text, 'la ventana tiene el texto de lo que salió');
    const t = g.run.time;
    g.update(1 / 30);
    eq(g.run.time, t, 'el juego está pausado');
    g.closeChest();
    eq(g.state, 'playing');
  });

  test('Dash: más corto que antes', () => {
    assert(D.config.dash.distance <= 110, 'el dash recorre ' + D.config.dash.distance);
  });

  // =============================== PIXEL ART Y GRIMORIO ===============================
  test('Pixel art: todo enemigo, élite, jefe y personaje tiene su sprite', () => {
    for (const id in D.enemies) assert(BC.Pixel.ENEMY_LOOKS[id], 'falta el sprite de ' + id);
    for (const id in D.bosses) assert(BC.Pixel.ENEMY_LOOKS[id], 'falta el sprite del jefe ' + id);
    for (const id in D.characters) assert(BC.Pixel.LOOKS[id], 'falta el sprite de ' + id);
    // las transformaciones de los jefes también
    assert(BC.Pixel.enemyLookKey({ id: 'dante', name: 'Lucifero' }) === 'lucifero');
    assert(BC.Pixel.enemyLookKey({ id: 'lucius', name: 'Lucius (Paladín Supremo)' }) === 'luciusPaladin');
    for (const r of D.realms) for (const e of r.deco) assert(BC.Pixel.DECO_BY_EMOJI[e], r.id + ': decoración sin dibujo ' + e);
  });

  test('Grimorio: números de cada habilidad y cuánto suben', () => {
    const run = makeRun('mago');
    for (const id in D.skills) {
      const rows = BC.Loot.skillStatRows(id, 2, run, D);
      assert(rows.length > 0, id + ' sin números');
      for (const r of rows) assert(r.label && r.now !== undefined, id + ': fila inválida');
    }
    const z = BC.Loot.skillStatRows('zanka', 2, run, D);
    const dmg = z.find((r) => r.key === 'damage');
    eq(dmg.now, String(D.skills.zanka.base.damage + D.skills.zanka.perLevel.damage));
    eq(dmg.changed, true, 'el daño sube al nivel 3');
    eq(z.find((r) => r.key === 'count').next, '2', 'al nivel 3 tira 2');
    const maxed = BC.Loot.skillStatRows('zanka', D.config.maxSkillLevel, run, D);
    assert(maxed.every((r) => r.next === null), 'al máximo no hay próximo nivel');
  });

  test('Gráficos: pixel art por defecto y se guarda la elección', () => {
    eq(BC.Save.defaultSave().settings.graphics, 'pixel');
    const st = fakeStorage();
    const s0 = BC.Save.defaultSave();
    s0.settings.graphics = 'clasico';
    BC.Save.save(s0, st);
    eq(BC.Save.load(st).settings.graphics, 'clasico');
  });

  // =============================== DEFINITIVA (Q) ===============================
  function fightingGame(ch) {
    const g = new BC.Game({ headless: true });
    g.startRun({ characterId: ch, seed: 'ULTI' });
    g.spawnEnemy('bandido', 900, 300);
    g.player.ult.gauge = g.player.ch.ultimate.gaugeMax;
    return g;
  }

  test('Definitiva: con la barra llena NO se activa sola', () => {
    const g = fightingGame('asta');
    for (let i = 0; i < 30; i++) g.update(1 / 30);
    eq(g.player.ult.active, false);
    eq(g.player.ult.gauge, g.player.ch.ultimate.gaugeMax, 'la barra sigue llena');
  });

  test('Definitiva: se activa al apretar Q con la barra llena', () => {
    for (const ch of Object.keys(D.characters)) {
      const g = fightingGame(ch);
      g.input.ult = true;
      g.update(1 / 30);
      eq(g.player.ult.active, true, ch + ' debería activar la definitiva');
      eq(g.player.ult.gauge, 0, ch + ' vacía la barra');
      eq(g.input.ult, false, 'la tecla se consume');
    }
  });

  test('Definitiva: Q sin la barra llena no hace nada (y no queda guardada)', () => {
    const g = fightingGame('yuno');
    g.player.ult.gauge = 50;
    g.input.ult = true;
    g.update(1 / 30);
    eq(g.player.ult.active, false);
    g.player.ult.gauge = g.player.ch.ultimate.gaugeMax;
    for (let i = 0; i < 10; i++) g.update(1 / 30);
    eq(g.player.ult.active, false, 'el Q viejo no debe activarla después');
  });

  // =============================== CABALLERO NOVATO ===============================
  test('Caballero Novato: disponible desde el principio (también en guardados viejos)', () => {
    assert(BC.Save.defaultSave().characters.indexOf('mago') !== -1, 'falta en guardado nuevo');
    const st = fakeStorage();
    st.setItem(BC.Save.KEY, JSON.stringify({ stars: 5, characters: ['asta', 'yuno'] }));
    const s = BC.Save.load(st);
    assert(s.characters.indexOf('mago') !== -1, 'falta en guardado viejo');
    assert(s.characters.indexOf('yuno') !== -1, 'se perdió Yuno');
  });

  test('Caballero Novato: puede recibir habilidades de los 3 personajes', () => {
    const run = makeRun('mago');
    const owners = new Set();
    for (const c of BC.Loot.candidates(run, D)) if (c.kind === 'skillNew') owners.add(D.skills[c.id].character);
    assert(owners.has('asta') && owners.has('yuno') && owners.has('noelle'), 'faltan estilos: ' + [...owners]);
  });

  test('Caballero Novato: máximo 6 habilidades a la vez', () => {
    const run = makeRun('mago');
    for (const id of ['zanka', 'tornado', 'balasAgua', 'medialuna', 'marejada', 'bolaFuego']) BC.Loot.applyReward(run, { kind: 'skillNew', id }, D);
    eq(Object.keys(run.inventory.skills).length, 7, '6 + la básica');
    const c = BC.Loot.candidates(run, D);
    eq(c.filter((x) => x.kind === 'skillNew').length, 0, 'no debería ofrecer más habilidades nuevas');
    assert(c.some((x) => x.kind === 'skillUp'), 'sí debería ofrecer mejoras');
    for (let i = 0; i < 30; i++) for (const ch of BC.Loot.rewardChoices(run, new BC.RNG('M' + i), D, 3)) assert(ch.kind !== 'skillNew', 'ofreció una 7ª habilidad');
    // los demás personajes no tienen límite
    const asta = makeRun('asta');
    for (const id of ['destructora', 'habitante', 'zanka', 'meteorito']) BC.Loot.applyReward(asta, { kind: 'skillNew', id }, D);
    eq(Object.keys(asta.inventory.skills).length, 5);
  });

  test('Caballero Novato: Versátil da daño por cada estilo distinto', () => {
    const g = new BC.Game({ headless: true });
    g.startRun({ characterId: 'mago', seed: 'VERSA' });
    const per = D.characters.mago.trait.perSchool;
    near(g.player.computeEff().damagePct, 0, 1e-9, 'sin estilos');
    BC.Loot.applyReward(g.run, { kind: 'skillNew', id: 'zanka' }, D);
    BC.Loot.applyReward(g.run, { kind: 'skillNew', id: 'meteorito' }, D);
    near(g.player.computeEff().damagePct, per, 1e-9, 'dos de Asta = un estilo');
    BC.Loot.applyReward(g.run, { kind: 'skillNew', id: 'tornado' }, D);
    BC.Loot.applyReward(g.run, { kind: 'skillNew', id: 'marejada' }, D);
    near(g.player.computeEff().damagePct, per * 3, 1e-9, 'tres estilos');
  });

  test('Caballero Novato: activa sinergias de habilidades pero no la de Valquiria', () => {
    const inv = BC.Stats.emptyInventory();
    inv.skills = { balaMagica: 1, habitante: 1, zanka: 1, tornado: 1, lluviaCuchillas: 1 };
    inv.relics.push('trebolCuatro', 'emblemaAmanecer');
    const syn = BC.Stats.computeStats('mago', inv, {}, 0, D).synergies;
    assert(syn.indexOf('antimagiaAbsoluta') !== -1, 'falta Anti-magia Absoluta');
    assert(syn.indexOf('tormentaEspiritual') !== -1, 'falta Tormenta Espiritual');
    assert(syn.indexOf('valquiriaDesbordante') === -1, 'Valquiria es sólo de Noelle');
  });

  for (const ch of Object.keys(D.characters)) {
    test(
      'Simulación: run completa con ' + ch + ' (modo dios) llega a la victoria',
      () => {
        const r = BC.Bot.simulate({ characterId: ch, seed: 'VICTORIA-' + ch.toUpperCase(), god: true, maxTime: 7200 });
        if (r.error) throw new Error(r.error);
        eq(r.summary.won, true, 'no ganó (sala ' + r.game.run.nodeId + ', tiempo ' + Math.round(r.time) + ')');
        eq(r.summary.bossesDefeated.length, D.realms.filter((x) => !x.secret).length, 'jefes derrotados');
      },
      { slow: true }
    );
  }

  test(
    'Modo infinito: después del último jefe empieza el ciclo 2, más difícil',
    () => {
      const r = BC.Bot.simulate({ characterId: 'yuno', seed: 'INFINITO', god: true, endless: true, untilLoop: 1, maxTime: 9000 });
      if (r.error) throw new Error(r.error);
      const g = r.game;
      eq(g.run.over, false, 'la partida sigue');
      eq(g.run.loop, 1, 'ciclo 2');
      eq(g.run.realmIndex, 0, 'vuelve al primer reino');
      const s1 = BC.Combat.enemyScaling(4, 3, {}, D, false, 0);
      const s2 = BC.Combat.enemyScaling(0, 3, {}, D, false, 1);
      assert(s2.hp >= s1.hp && s2.dmg >= s1.dmg, 'el ciclo 2 no es más fácil que el final del 1');
      // al morir, el guardado registra el récord y da estrellas por ciclo
      const res = BC.Save.applyRunResult(BC.Save.defaultSave(), Object.assign(g.summary(), { won: false }), D);
      eq(res.save.stats.bestEndless.loop, 1);
      assert(res.newEndlessRecord, 'récord nuevo');
    },
    { slow: true }
  );

  test('Puertas: nunca hay dos iguales y van arriba, a la izquierda o a la derecha', () => {
    const g = new BC.Game({ headless: true });
    g.startRun({ characterId: 'asta', seed: 'PUERTAS' });
    for (let i = 0; i < 5; i++) {
      g.room.node = g.run.map.realms[0].floors[i + 1][0];
      g.run.nodeId = g.room.node.id;
      g.openDoors();
      const types = g.room.doors.map((d) => d.node.type);
      eq(new Set(types).size, types.length, 'puertas repetidas');
      const b = g.bounds;
      for (const d of g.room.doors) {
        const top = Math.abs(d.y - (b.y1 + 40)) < 1 && Math.abs(d.x - (b.x1 + b.x2) / 2) < 1;
        const side = Math.abs(d.y - (b.y1 + b.y2) / 2) < 1 && (Math.abs(d.x - (b.x1 + 40)) < 1 || Math.abs(d.x - (b.x2 - 40)) < 1);
        assert(top || side, 'puerta fuera de lugar');
      }
      eq(new Set(g.room.doors.map((d) => d.x + ',' + d.y)).size, g.room.doors.length, 'dos puertas en el mismo lugar');
    }
  });

  test(
    'Simulación: misma semilla => misma partida',
    () => {
      const a = BC.Bot.simulate({ characterId: 'noelle', seed: 'DETERMINISMO', god: true, maxTime: 400 });
      const b = BC.Bot.simulate({ characterId: 'noelle', seed: 'DETERMINISMO', god: true, maxTime: 400 });
      eq(JSON.stringify(a.summary), JSON.stringify(b.summary));
    },
    { slow: true }
  );

  // =============================== RUNNER ===============================
  function run(opts) {
    const o = opts || {};
    const results = [];
    for (const c of cases) {
      if (o.skipSlow && c.slow) continue;
      if (o.filter && c.name.toLowerCase().indexOf(o.filter.toLowerCase()) === -1) continue;
      const t0 = Date.now();
      try {
        c.fn();
        results.push({ name: c.name, ok: true, ms: Date.now() - t0 });
      } catch (e) {
        results.push({ name: c.name, ok: false, ms: Date.now() - t0, error: (e && e.stack) || String(e) });
      }
      if (o.onResult) o.onResult(results[results.length - 1]);
    }
    return results;
  }

  root.BCTests = { cases, run };
})(typeof window !== 'undefined' ? window : globalThis);
