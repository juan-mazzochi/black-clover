/*
 * Estado de una run (partida): personaje, vida, yules, inventario, mapa y progreso.
 * Lógica pura: no dibuja nada.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  function createRun(opts, data) {
    const ch = data.characters[opts.characterId];
    if (!ch) throw new Error('Personaje desconocido: ' + opts.characterId);
    const inv = BC.Stats.emptyInventory();
    inv.skills[ch.basicSkill] = 1;
    const seed = String(opts.seed || BC.randomSeed()).toUpperCase();
    const run = {
      seed,
      characterId: ch.id,
      ascension: opts.ascension || 0,
      metaLevels: opts.metaLevels || {},
      unlockedRelics: opts.unlockedRelics || [],
      map: BC.MapGen.generateMap(seed, data, BC.Stats.worldMods(opts.ascension || 0, opts.metaLevels || {}, data), !!opts.includeSecret),
      secret: !!opts.includeSecret,
      endless: !!opts.endless, // modo infinito: después del último jefe empieza otro ciclo más difícil
      loop: 0,
      realmIndex: 0,
      floorIndex: 0,
      nodeId: null,
      inventory: inv,
      hp: 0,
      yul: 0,
      stats: null,
      synergies: [],
      rerolls: 0,
      revives: 0,
      level: 1,
      xp: 0,
      kills: 0,
      // para logros y estadísticas
      track: { dashes: 0, maxYul: 0, bossHits: 0, bossNoHit: 0 },
      roomsCleared: 0,
      elitesKilled: 0,
      bossesDefeated: [],
      seenEvents: [],
      time: 0,
      won: false,
      over: false,
    };
    recompute(run, data);
    run.hp = run.stats.maxHp;
    run.yul = run.stats.startYul || 0;
    run.rerolls = run.stats.rerolls || 0;
    run.revives = run.stats.revives || 0;
    return run;
  }

  // Recalcula estadísticas. Devuelve las sinergias recién activadas.
  function recompute(run, data) {
    const prevMax = run.stats ? run.stats.maxHp : null;
    const prevSyn = run.synergies || [];
    const res = BC.Stats.computeStats(run.characterId, run.inventory, run.metaLevels, run.ascension, data);
    run.stats = res.stats;
    run.synergies = res.synergies;
    if (prevMax !== null && run.stats.maxHp > prevMax) run.hp += run.stats.maxHp - prevMax;
    run.hp = Math.min(run.hp, run.stats.maxHp);
    return res.synergies.filter((id) => prevSyn.indexOf(id) === -1);
  }

  function heal(run, amount) {
    const before = run.hp;
    run.hp = Math.min(run.stats.maxHp, run.hp + amount);
    return run.hp - before;
  }

  function healPct(run, pct) {
    return heal(run, run.stats.maxHp * pct);
  }

  function getNode(run, realm, floor, index) {
    const r = run.map.realms[realm];
    if (!r) return null;
    const f = r.floors[floor];
    return f ? f[index] || null : null;
  }

  function nodeById(run, id) {
    if (!id) return null;
    const p = id.split('-').map(Number);
    return getNode(run, p[0], p[1], p[2]);
  }

  // Las puertas que se abren después de la sala actual
  function nextNodes(run) {
    const node = nodeById(run, run.nodeId);
    if (!node) return run.map.realms[0].floors[0];
    const realm = run.map.realms[node.realm];
    if (node.floor + 1 < realm.floors.length) return realm.floors[node.floor + 1];
    if (node.realm + 1 < run.map.realms.length) return run.map.realms[node.realm + 1].floors[0];
    return [];
  }

  function enterNode(run, node) {
    run.nodeId = node.id;
    run.realmIndex = node.realm;
    run.floorIndex = node.floor;
  }

  // XP necesaria para pasar del nivel N al N+1 (cada nivel cuesta más)
  function xpToNext(level, data) {
    const x = data.config.xp;
    return Math.round(x.base * Math.pow(x.growth, level - 1));
  }

  // Suma experiencia. Devuelve cuántos niveles se subieron.
  function addXp(run, amount, data) {
    run.xp += amount;
    let ups = 0;
    while (run.xp >= xpToNext(run.level, data)) {
      run.xp -= xpToNext(run.level, data);
      run.level++;
      ups++;
    }
    return ups;
  }

  // XP que da un enemigo
  function enemyXp(def, data) {
    const x = data.config.xp;
    if (def.boss) return x.boss;
    if (def.elite) return x.elite;
    return Math.max(1, Math.round((def.cost || 0.34) * x.perCost));
  }

  BC.Run = { createRun, recompute, heal, healPct, nodeById, nextNodes, enterNode, xpToNext, addXp, enemyXp };
})(typeof window !== 'undefined' ? window : globalThis);
