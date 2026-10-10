/*
 * Generación procedural del mapa de una run y de los encuentros de cada sala.
 * Todo depende de la semilla: misma semilla => mismo mapa y mismos enemigos.
 *
 * Estructura del mapa:
 *   map.realms[r].floors[f] = [ nodo, nodo, ... ]   (las puertas que podés elegir)
 *   - Sala 0 de cada reino: combate
 *   - Salas del medio: 2 o 3 opciones al azar (combate, élite, tienda, evento, descanso)
 *   - Anteúltima: descanso o tienda
 *   - Última: jefe
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  function roomWeight(type, floor, counts, data, asc) {
    const def = data.rooms[type];
    if (!def || type === 'boss') return 0;
    if (def.minFloor !== undefined && floor < def.minFloor) return 0;
    if (def.maxPerRealm !== undefined && (counts[type] || 0) >= def.maxPerRealm) return 0;
    let w = def.weight || 0;
    if (type === 'elite') w += asc.eliteWeight || 0;
    return w;
  }

  // includeSecret: agrega el reino secreto (si está desbloqueado)
  // loop: número de ciclo del modo infinito (0 = la partida normal)
  function generateMap(seed, data, ascension, includeSecret, loop) {
    const L = loop || 0;
    const rng = new BC.RNG(seed + ':map' + (L ? ':L' + L : ''));
    const asc = BC.Stats.resolveMods(ascension, data);
    const mg = data.mapgen;
    const realms = [];

    data.realms.forEach((realm, r) => {
      if (realm.secret && !includeSecret) return;
      const F = realm.floors || data.config.floorsPerRealm;
      const floors = [];
      const counts = {};
      let prev = [];
      for (let f = 0; f < F; f++) {
        let types;
        if (f === F - 1) types = ['boss'];
        else if (f === F - 2) types = mg.preBossChoices.slice();
        else if (f === 0) types = ['combat'];
        else {
          const k = rng.int(mg.choicesMin, mg.choicesMax);
          types = [];
          // Una sala especial no se repite en el piso siguiente (podrías volver a entrar a la
          // misma que acabás de terminar), y antes de la sala previa al jefe no aparecen
          // las que ya trae esa sala (descanso / tienda).
          const banned = prev.filter((t) => t !== 'combat' && t !== 'ambush'); // las peleas sí pueden seguir
          if (f === F - 3) banned.push(...mg.preBossChoices);
          for (let i = 0; i < k; i++) {
            // nunca dos puertas iguales (tampoco dos de combate)
            const pool = Object.keys(data.rooms)
              .filter((t) => types.indexOf(t) === -1 && banned.indexOf(t) === -1)
              .map((t) => ({ t, w: roomWeight(t, f, counts, data, asc) }));
            const pick = rng.weighted(pool, (p) => p.w);
            if (!pick) break;
            types.push(pick.t);
          }
          // Siempre tiene que haber al menos una sala de pelea para elegir
          if (!types.some((t) => t === 'combat' || t === 'elite' || t === 'ambush')) types[0] = 'combat';
          types.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
        }
        floors.push(types.map((type, i) => ({ id: (L ? 'L' + L + '-' : '') + r + '-' + f + '-' + i, type, realm: r, floor: f, index: i, loop: L })));
        prev = types;
      }
      realms.push({ realmId: realm.id, floors });
    });

    return { seed: String(seed), realms };
  }

  function buildWave(rng, pool, budget, data) {
    const wave = [];
    let left = budget;
    let guard = 0;
    while (left > 0.5 && guard++ < 60) {
      const pick = rng.weighted(pool, (p) => p.w);
      if (!pick) break;
      wave.push(pick.id);
      left -= Math.max(0.5, data.enemies[pick.id].cost || 1);
    }
    return wave;
  }

  // Qué enemigos aparecen en una sala (determinístico por semilla + id de sala)
  function generateEncounter(seed, node, data, ascension) {
    const rng = new BC.RNG(seed + ':enc:' + node.id);
    const realm = data.realms[node.realm];
    const d = data.difficulty;
    const asc = BC.Stats.resolveMods(ascension, data);

    if (node.type === 'boss') return { boss: realm.boss, waves: [] };

    const pool = Object.keys(realm.enemies).map((id) => ({ id, w: realm.enemies[id] }));
    if (node.floor >= d.lateEnemiesFromFloor && realm.lateEnemies) {
      for (const id in realm.lateEnemies) pool.push({ id, w: realm.lateEnemies[id] });
    }
    // en el modo infinito, cada ciclo trae oleadas más grandes
    const sizeMult = (data.rooms[node.type].sizeMult || 1) * (1 + (asc.waveSizePct || 0)) * (1 + (data.endless ? data.endless.wavePerLoop : 0) * (node.loop || 0));

    if (node.type === 'elite') {
      const elite = rng.pick(realm.elites);
      const escort = buildWave(rng, pool, (d.eliteEscortBudget + node.realm) * sizeMult, data);
      return { elite, waves: [escort] };
    }

    const nWaves = d.wavesBase + Math.floor(node.floor / d.extraWaveEveryFloors);
    const waves = [];
    for (let w = 0; w < nWaves; w++) {
      const budget = (d.waveBudgetBase + d.waveBudgetPerFloor * node.floor + d.waveBudgetPerRealm * node.realm + w) * sizeMult;
      waves.push(buildWave(rng, pool, budget, data));
    }
    return { waves };
  }

  BC.MapGen = { generateMap, generateEncounter };
})(typeof window !== 'undefined' ? window : globalThis);
