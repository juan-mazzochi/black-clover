/*
 * Cálculo de estadísticas del jugador: suma personaje base + pasivas +
 * reliquias + sinergias + mejoras permanentes + ascensión.
 * Lógica "pura" (sin dibujo): se puede testear con Node.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  function emptyInventory() {
    return { skills: {}, passives: {}, relics: [], extra: {}, evolved: [] };
  }

  function addMods(acc, mods, times) {
    if (!mods) return;
    const n = times === undefined ? 1 : times;
    for (const k in mods) acc[k] = (acc[k] || 0) + mods[k] * n;
  }

  // Todos los ids que el jugador "tiene" (habilidades, pasivas, reliquias)
  function ownedIds(inv) {
    const s = new Set();
    for (const id in inv.skills) if (inv.skills[id] > 0) s.add(id);
    for (const id in inv.passives) if (inv.passives[id] > 0) s.add(id);
    for (const id of inv.relics) s.add(id);
    return s;
  }

  // Cuántas reliquias hay de cada etiqueta
  function tagCounts(inv, data) {
    const c = {};
    for (const id of inv.relics) {
      const r = data.relics[id];
      if (!r || !r.tags) continue;
      for (const t of r.tags) c[t] = (c[t] || 0) + 1;
    }
    return c;
  }

  // Cuántas habilidades hay de cada etiqueta (ej. 'elemental')
  function skillTagCounts(inv, data) {
    const c = {};
    for (const id in inv.skills) {
      const s = data.skills[id];
      if (!s || !inv.skills[id] || !s.tags) continue;
      for (const t of s.tags) c[t] = (c[t] || 0) + 1;
    }
    return c;
  }

  // requires.character puede ser un id o una lista de ids
  function characterAllowed(req, characterId) {
    if (!req.character) return true;
    return Array.isArray(req.character) ? req.character.indexOf(characterId) !== -1 : req.character === characterId;
  }

  function synergyActive(syn, characterId, inv, data) {
    const req = syn.requires || {};
    if (!characterAllowed(req, characterId)) return false;
    if (req.items) {
      const owned = ownedIds(inv);
      for (const id of req.items) if (!owned.has(id)) return false;
    }
    if (req.tags) {
      const c = tagCounts(inv, data);
      for (const t in req.tags) if ((c[t] || 0) < req.tags[t]) return false;
    }
    if (req.skillTags) {
      const c = skillTagCounts(inv, data);
      for (const t in req.skillTags) if ((c[t] || 0) < req.skillTags[t]) return false;
    }
    return true;
  }

  function activeSynergies(characterId, inv, data) {
    return data.synergies.filter((s) => synergyActive(s, characterId, inv, data));
  }

  // Modificadores de la progresión meta (niveles comprados en la base)
  function metaMods(metaLevels, data) {
    const acc = {};
    if (!metaLevels) return acc;
    for (const id in metaLevels) {
      const up = data.meta.upgrades[id];
      if (up) addMods(acc, up.mods, metaLevels[id]);
    }
    return acc;
  }

  // Modificadores de ascensión acumulados (rango N incluye 1..N)
  function ascensionMods(level, data) {
    const acc = {};
    for (let i = 0; i < Math.min(level || 0, data.ascension.length); i++) addMods(acc, data.ascension[i].mods);
    return acc;
  }

  // Claves de modificadores que afectan al MUNDO (enemigos), no al jugador
  const WORLD_KEYS = ['enemyHpPct', 'enemyDmgPct', 'waveSizePct'];

  // Modificadores del mundo = ascensión + partes "de mundo" de la meta (Pacto de Maldición)
  function worldMods(ascension, metaLevels, data) {
    const w = ascensionMods(ascension, data);
    const meta = metaMods(metaLevels, data);
    for (const k of WORLD_KEYS) if (meta[k]) w[k] = (w[k] || 0) + meta[k];
    return w;
  }

  // Acepta un número (rango de ascensión) o un objeto de modificadores ya calculado
  function resolveMods(x, data) {
    return x && typeof x === 'object' ? x : ascensionMods(x || 0, data);
  }

  /*
   * Devuelve { stats, synergies }.
   * stats tiene valores finales listos para usar (maxHp, speed, damagePct, cooldownMult...).
   */
  function computeStats(characterId, inv, metaLevels, ascension, data) {
    const ch = data.characters[characterId];
    const base = ch.base;
    const acc = {};

    for (const id in inv.passives) {
      const p = data.passives[id];
      if (p) addMods(acc, p.mods, inv.passives[id]);
    }
    for (const id of inv.relics) {
      const r = data.relics[id];
      if (r) addMods(acc, r.mods);
    }
    const syns = activeSynergies(characterId, inv, data);
    for (const s of syns) addMods(acc, s.mods);
    addMods(acc, inv.extra);
    const meta = metaMods(metaLevels, data);
    addMods(acc, meta);
    const asc = ascensionMods(ascension, data);

    const g = (k) => acc[k] || 0;
    const stats = Object.assign({}, acc);

    stats.maxHp = Math.max(1, Math.round((base.maxHp + g('maxHp')) * (1 + g('maxHpPct') + (asc.playerHpPct || 0))));
    stats.speed = base.speed * (1 + g('speedPct'));
    stats.armor = base.armor + g('armor');
    stats.maxMana = ch.usesMana ? Math.round(base.maxMana * (1 + g('maxManaPct'))) : 0;
    stats.manaRegen = ch.usesMana ? base.manaRegen * (1 + g('manaRegenPct')) : 0;
    stats.damagePct = g('damagePct');
    stats.cooldownMult = Math.max(0.4, 1 - g('cooldownPct'));
    stats.critChance = Math.min(0.75, base.critChance + g('critChance'));
    stats.critMult = base.critMult + g('critDamage');
    stats.evasion = Math.min(0.5, g('evasion'));
    stats.regen = g('regen');
    stats.pickupRadius = data.config.pickupRadius + g('pickupRadius');
    stats.yulMult = 1 + g('yulPct');
    stats.ultGainMult = 1 + g('ultGainPct');
    stats.ultDurationMult = 1 + g('ultDurationPct');
    stats.ultDurationFlat = g('ultDurationFlat');
    stats.manaCostMult = Math.max(0, 1 + g('manaCostPct'));
    stats.dashCooldown = base.dashCooldown * Math.max(0.3, 1 - g('dashCdPct'));
    stats.lifesteal = g('lifesteal');
    stats.startYul = g('startYul');
    stats.rerolls = g('rerolls');
    stats.revives = g('revives');
    stats.starPct = g('starPct');

    return { stats, synergies: syns.map((s) => s.id) };
  }

  // Valores de una habilidad en un nivel dado. evo = config.evolution si está potenciada.
  function skillLevelStats(def, level, evo) {
    const s = Object.assign({}, def.base);
    const lv = Math.max(1, level || 1);
    if (def.perLevel) for (const k in def.perLevel) s[k] = (s[k] || 0) + def.perLevel[k] * (lv - 1);
    if (def.at) {
      for (const at in def.at) {
        if (lv >= Number(at)) for (const k in def.at[at]) s[k] = (s[k] || 0) + def.at[at][k];
      }
    }
    if (evo) {
      if (s.damage !== undefined) s.damage *= evo.damageMult;
      if (s.perCharge !== undefined) s.perCharge *= evo.damageMult;
      if (s.cooldown !== undefined) s.cooldown *= evo.cooldownMult;
      for (const k of ['radius', 'range', 'maxRadius', 'length', 'width', 'orbitRadius', 'splash', 'duration', 'jumpRange']) if (s[k] !== undefined) s[k] *= evo.sizeMult;
      for (const k of ['count', 'jumps']) if (s[k] !== undefined) s[k] += evo.extraCount;
      if (s.pierce !== undefined && s.pierce < 99) s.pierce += 1;
      for (const k of ['armor', 'healPct', 'regen', 'speedPct', 'evasion', 'burn', 'poison']) if (s[k] !== undefined) s[k] *= 1.4;
    }
    if (s.cooldown !== undefined) s.cooldown = Math.max(0.15, s.cooldown);
    return s;
  }

  BC.Stats = {
    emptyInventory,
    addMods,
    ownedIds,
    tagCounts,
    skillTagCounts,
    worldMods,
    resolveMods,
    characterAllowed,
    synergyActive,
    activeSynergies,
    metaMods,
    ascensionMods,
    computeStats,
    skillLevelStats,
  };
})(typeof window !== 'undefined' ? window : globalThis);
