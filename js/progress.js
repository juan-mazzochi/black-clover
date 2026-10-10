/*
 * Logros y estadísticas históricas (entre partidas). Lógica pura.
 *  - Los logros se definen en data.js (achievements) y su condición acá (CHECKS).
 *  - Las estadísticas se guardan dentro del guardado (save.stats y save.history).
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  // ids de las sinergias de "elemento completo" (6 hechizos)
  function monoSynergies(data) {
    return data.synergies
      .filter((s) => s.requires.skillTags && Object.keys(s.requires.skillTags).length === 1 && Object.values(s.requires.skillTags)[0] >= 6)
      .map((s) => s.id);
  }

  // Condición de cada logro. sum = resumen de la partida, save = guardado YA actualizado.
  const CHECKS = {
    primerPaso: (sum) => sum.bossesDefeated.indexOf('vetto') !== -1,
    caballeroMagico: (sum) => sum.won,
    sinMagia: (sum) => sum.won && sum.characterId === 'asta',
    rivales: (sum) => sum.won && sum.characterId === 'yuno',
    princesa: (sum) => sum.won && sum.characterId === 'noelle',
    novatoProdigio: (sum) => sum.won && sum.characterId === 'mago',
    reyMago: (sum, save, data) => Object.keys(data.characters).every((id) => (save.stats.perChar[id] || {}).wins > 0),
    elementalista: (sum, save, data) => (sum.synergies || []).some((id) => monoSynergies(data).indexOf(id) !== -1),
    coleccionista: (sum, save) => save.discoveredSynergies.length >= 15,
    cazador: (sum) => sum.kills >= 500,
    masacre: (sum, save) => save.stats.kills >= 5000,
    potenciado: (sum) => (sum.evolved || 0) >= 2,
    legendario: (sum) => (sum.legendaries || 0) >= 1,
    intocable: (sum) => (sum.bossNoHit || 0) >= 1,
    millonario: (sum) => (sum.maxYul || 0) >= 500,
    sinEsquivar: (sum) => sum.won && sum.dashes === 0,
    rango5: (sum) => sum.won && (sum.ascension || 0) >= 5,
    masAlla: (sum) => sum.bossesDefeated.indexOf('lucius') !== -1,
  };

  // Devuelve los logros recién conseguidos (sin repetir los que ya estaban)
  function checkAchievements(save, sum, data) {
    const out = [];
    for (const a of data.achievements) {
      if (save.achievements.indexOf(a.id) !== -1) continue;
      const fn = CHECKS[a.id];
      if (fn && fn(sum, save, data)) out.push(a);
    }
    return out;
  }

  // Actualiza estadísticas acumuladas e historial con una partida
  function recordRun(save, sum) {
    const st = save.stats;
    const pc = (st.perChar[sum.characterId] = st.perChar[sum.characterId] || { runs: 0, wins: 0, bestLevel: 0 });
    pc.runs++;
    if (sum.won) pc.wins++;
    pc.bestLevel = Math.max(pc.bestLevel, sum.level || 1);
    st.totalTime += sum.time || 0;
    if (sum.won && (!st.bestWinTime || sum.time < st.bestWinTime)) st.bestWinTime = sum.time;
    if (!sum.won && sum.killedBy) st.killers[sum.killedBy] = (st.killers[sum.killedBy] || 0) + 1;
    for (const id of sum.synergies || []) st.synergyUse[id] = (st.synergyUse[id] || 0) + 1;
    save.history.unshift({
      date: sum.date || null,
      characterId: sum.characterId,
      won: !!sum.won,
      realm: sum.realmReached,
      floor: sum.floorReached,
      level: sum.level || 1,
      kills: sum.kills,
      time: Math.round(sum.time || 0),
      killedBy: sum.killedBy || null,
      ascension: sum.ascension || 0,
      seed: sum.seed,
    });
    if (save.history.length > 30) save.history.length = 30;
  }

  // Ordena un objeto {clave: cantidad} de mayor a menor
  function top(obj, n) {
    return Object.keys(obj || {})
      .map((k) => [k, obj[k]])
      .sort((a, b) => b[1] - a[1])
      .slice(0, n || 5);
  }

  BC.Progress = { CHECKS, monoSynergies, checkAchievements, recordRun, top };
})(typeof window !== 'undefined' ? window : globalThis);
