/*
 * Progresión meta: se guarda en el navegador (localStorage) y sobrevive
 * entre partidas. Estrellas, personajes, mejoras permanentes, reliquias
 * desbloqueadas y rango de ascensión.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  const KEY = 'bc_senda_rey_mago_v1';

  // Personajes sin costo (disponibles desde el principio)
  function freeCharacters() {
    const D = BC.DATA;
    if (!D) return ['asta'];
    return Object.keys(D.characters).filter((id) => !D.characters[id].unlockCost);
  }

  function defaultSave() {
    return {
      version: 1,
      stars: 0,
      totalStars: 0,
      characters: freeCharacters(),
      upgrades: {},
      bossesDefeated: [],
      maxAscension: 0, // rango más alto desbloqueado
      stats: { runs: 0, wins: 0, kills: 0, bestRealm: 0, perChar: {}, killers: {}, synergyUse: {}, totalTime: 0, bestWinTime: 0 },
      achievements: [], // logros conseguidos
      history: [], // últimas 30 partidas
      discoveredSynergies: [], // sinergias que ya activaste alguna vez (se ven en el Grimorio)
      settings: { muted: false, graphics: 'pixel' },
    };
  }

  // Completa campos que falten (por si el guardado es de una versión vieja)
  function normalize(s) {
    const d = defaultSave();
    const out = Object.assign({}, d, s || {});
    out.stats = Object.assign({}, d.stats, (s && s.stats) || {});
    out.settings = Object.assign({}, d.settings, (s && s.settings) || {});
    if (!Array.isArray(out.characters)) out.characters = [];
    // los personajes gratis siempre están (incluye los que se agreguen en versiones nuevas)
    for (const id of freeCharacters()) if (out.characters.indexOf(id) === -1) out.characters.push(id);
    if (!Array.isArray(out.bossesDefeated)) out.bossesDefeated = [];
    if (!Array.isArray(out.discoveredSynergies)) out.discoveredSynergies = [];
    if (!Array.isArray(out.achievements)) out.achievements = [];
    if (!Array.isArray(out.history)) out.history = [];
    for (const k of ['perChar', 'killers', 'synergyUse']) if (!out.stats[k] || typeof out.stats[k] !== 'object') out.stats[k] = {};
    if (typeof out.upgrades !== 'object' || !out.upgrades) out.upgrades = {};
    return out;
  }

  function getStorage(storage) {
    if (storage) return storage;
    try {
      return root.localStorage || null;
    } catch (e) {
      return null;
    }
  }

  function load(storage) {
    const st = getStorage(storage);
    if (!st) return defaultSave();
    try {
      const raw = st.getItem(KEY);
      return raw ? normalize(JSON.parse(raw)) : defaultSave();
    } catch (e) {
      return defaultSave();
    }
  }

  function save(data, storage) {
    const st = getStorage(storage);
    if (!st) return false;
    try {
      st.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset(storage) {
    const st = getStorage(storage);
    try {
      if (st) st.removeItem(KEY);
    } catch (e) {
      /* nada */
    }
    return defaultSave();
  }

  // Reliquias desbloqueadas según los jefes derrotados alguna vez
  function unlockedRelics(s, data) {
    return Object.keys(data.relics).filter((id) => {
      const u = data.relics[id].unlock;
      return u && u.boss && s.bossesDefeated.indexOf(u.boss) !== -1;
    });
  }

  // Estrellas ganadas por una run
  function starsForRun(summary, data) {
    const st = data.meta.stars;
    let n = Math.floor(summary.roomsCleared / st.perRoomsCleared) + summary.elitesKilled * st.perElite + summary.bossesDefeated.length * st.perBoss;
    if (summary.won) n += st.onWin;
    // modo infinito: estrellas extra por cada ciclo completado
    if (summary.endless && data.endless) n += (summary.loop || 0) * data.endless.starsPerLoop;
    return Math.round(n * (1 + st.ascensionBonus * (summary.ascension || 0) + (summary.starBonus || 0)));
  }

  // Aplica el resultado de una run al guardado. Devuelve { save, stars, newUnlocks }
  function applyRunResult(s0, summary, data) {
    const s = normalize(JSON.parse(JSON.stringify(s0)));
    const stars = starsForRun(summary, data);
    const beforeRelics = unlockedRelics(s, data);
    s.stars += stars;
    s.totalStars += stars;
    s.stats.runs += 1;
    s.stats.kills += summary.kills || 0;
    s.stats.bestRealm = Math.max(s.stats.bestRealm, (summary.realmReached || 0) + 1);
    for (const b of summary.bossesDefeated) if (s.bossesDefeated.indexOf(b) === -1) s.bossesDefeated.push(b);
    // récord del modo infinito: el que recorrió más salas
    let newEndlessRecord = false;
    if (summary.endless) {
      const cur = { loop: summary.loop || 0, realm: summary.realmReached || 0, floor: summary.floorReached || 0, rooms: summary.roomsCleared || 0, characterId: summary.characterId };
      const prev = s.stats.bestEndless;
      if (!prev || cur.rooms > prev.rooms) {
        s.stats.bestEndless = cur;
        newEndlessRecord = true;
      }
    }
    let newAscension = false;
    if (summary.won) {
      s.stats.wins += 1;
      const next = Math.min(data.ascension.length, (summary.ascension || 0) + 1);
      if (next > s.maxAscension) {
        s.maxAscension = next;
        newAscension = true;
      }
    }
    const newUnlocks = unlockedRelics(s, data).filter((id) => beforeRelics.indexOf(id) === -1);
    // estadísticas históricas y logros
    BC.Progress.recordRun(s, summary);
    const newAchievements = BC.Progress.checkAchievements(s, summary, data);
    for (const a of newAchievements) {
      s.achievements.push(a.id);
      s.stars += a.stars;
      s.totalStars += a.stars;
    }
    const need = data.config.secretUnlockWins;
    const newSecret = summary.won && s.stats.wins === need;
    const newEndless = summary.won && s.stats.wins === 1; // la primera victoria desbloquea el modo infinito
    return { save: s, stars, newUnlocks, newAscension, newAchievements, newSecret, newEndless, newEndlessRecord };
  }

  function buyCharacter(s0, id, data) {
    const ch = data.characters[id];
    const s = normalize(JSON.parse(JSON.stringify(s0)));
    if (!ch || s.characters.indexOf(id) !== -1) return { ok: false, save: s0, reason: 'Ya lo tenés.' };
    const cost = ch.unlockCost || 0;
    if (s.stars < cost) return { ok: false, save: s0, reason: 'Te faltan estrellas.' };
    s.stars -= cost;
    s.characters.push(id);
    return { ok: true, save: s };
  }

  // Marca una sinergia como descubierta. Devuelve true si es nueva.
  function discoverSynergy(s, id) {
    if (s.discoveredSynergies.indexOf(id) !== -1) return false;
    s.discoveredSynergies.push(id);
    return true;
  }

  // ¿Ya se desbloqueó el reino secreto?
  function secretUnlocked(s, data) {
    return s.stats.wins >= data.config.secretUnlockWins;
  }

  function upgradeCost(s, id, data) {
    const up = data.meta.upgrades[id];
    const lvl = s.upgrades[id] || 0;
    return lvl < up.costs.length ? up.costs[lvl] : null;
  }

  function buyUpgrade(s0, id, data) {
    const s = normalize(JSON.parse(JSON.stringify(s0)));
    const cost = upgradeCost(s, id, data);
    if (cost === null) return { ok: false, save: s0, reason: 'Nivel máximo.' };
    if (s.stars < cost) return { ok: false, save: s0, reason: 'Te faltan estrellas.' };
    s.stars -= cost;
    s.upgrades[id] = (s.upgrades[id] || 0) + 1;
    return { ok: true, save: s };
  }

  BC.Save = { KEY, defaultSave, normalize, load, save, reset, unlockedRelics, starsForRun, applyRunResult, buyCharacter, upgradeCost, buyUpgrade, discoverSynergy, secretUnlocked };
})(typeof window !== 'undefined' ? window : globalThis);
