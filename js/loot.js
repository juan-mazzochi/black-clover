/*
 * Recompensas: qué mejoras se ofrecen al limpiar una sala, reliquias de élites
 * y jefes, y el stock de la tienda. Lógica pura (testeable).
 *
 * Una "opción" de recompensa tiene la forma { kind, id }:
 *   kind: 'skillNew' | 'skillUp' | 'passive' | 'relic' | 'heal'
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];

  function manaOk(def, ch) {
    return !def.requiresMana || ch.usesMana;
  }

  // fromBoss: las rarezas 'bossOnly' (legendarias) sólo aparecen en premios de jefe
  function relicPool(run, data, minRarity, fromBoss) {
    const ch = data.characters[run.characterId];
    // con el máximo de reliquias ya no se ofrecen más
    if (run.inventory.relics.length >= (data.config.maxRelics || Infinity)) return [];
    const minIdx = RARITY_ORDER.indexOf(minRarity || 'common');
    return Object.keys(data.relics).filter((id) => {
      const def = data.relics[id];
      if (run.inventory.relics.indexOf(id) !== -1) return false;
      if (!manaOk(def, ch)) return false;
      if (def.unlock && run.unlockedRelics.indexOf(id) === -1) return false;
      if (data.rarities[def.rarity].bossOnly && !fromBoss) return false;
      return RARITY_ORDER.indexOf(def.rarity) >= minIdx;
    });
  }

  function relicWeight(id, data) {
    return data.rarities[data.relics[id].rarity].weight;
  }

  // Todas las opciones válidas para una recompensa normal, con su peso
  function candidates(run, data) {
    const ch = data.characters[run.characterId];
    const w = data.rewards.weights;
    const max = data.config.maxSkillLevel;
    const inv = run.inventory;
    const out = [];
    // la habilidad básica no cuenta para el límite
    const ownedSkills = Object.keys(inv.skills).filter((id) => inv.skills[id] > 0 && id !== ch.basicSkill).length;
    const elemCount = BC.Stats.skillTagCounts(inv, data);
    const canLearn = ownedSkills < (ch.maxSkills || Infinity);
    for (const id of ch.skillPool) {
      const lvl = inv.skills[id] || 0;
      if (lvl === 0) {
        if (canLearn) {
          const sk = data.skills[id];
          // los elementales son muchos: cada uno pesa poco, pero más si ya tenés de ese elemento
          const ww = sk.element ? w.elementalNew * (1 + data.rewards.elementAffinity * (elemCount[sk.element] || 0)) : w.skillNew;
          out.push({ kind: 'skillNew', id, w: ww });
        }
      }
      else if (lvl < max) out.push({ kind: 'skillUp', id, w: w.skillUp });
    }
    // con el máximo de pasivas distintas sólo se ofrecen las que ya tenés
    const passiveCount = Object.keys(inv.passives).filter((id) => inv.passives[id] > 0).length;
    const passiveFull = passiveCount >= (data.config.maxPassives || Infinity);
    for (const id in data.passives) {
      const def = data.passives[id];
      if (!manaOk(def, ch)) continue;
      if ((inv.passives[id] || 0) >= def.maxStacks) continue;
      if (passiveFull && !(inv.passives[id] > 0)) continue;
      out.push({ kind: 'passive', id, w: w.passive });
    }
    for (const id of relicPool(run, data)) {
      out.push({ kind: 'relic', id, w: (w.relic * relicWeight(id, data)) / 60 });
    }
    return out;
  }

  function pickDistinct(rng, list, count) {
    const pool = list.slice();
    const res = [];
    while (res.length < count && pool.length) {
      const p = rng.weighted(pool, (c) => c.w);
      if (!p) break;
      res.push({ kind: p.kind, id: p.id });
      pool.splice(pool.indexOf(p), 1);
    }
    return res;
  }

  function rewardChoices(run, rng, data, count) {
    const n = count || data.config.rewardChoices;
    const all = candidates(run, data);
    // siempre al menos una opción de habilidad (nueva o mejora), si queda alguna
    const skills = all.filter((c) => c.kind === 'skillNew' || c.kind === 'skillUp');
    const res = skills.length ? pickDistinct(rng, skills, 1) : [];
    const rest = all.filter((c) => !res.some((r) => r.kind === c.kind && r.id === c.id));
    res.push(...pickDistinct(rng, rest, n - res.length));
    // mezclamos para que la habilidad no esté siempre primera
    const shuffled = rng.shuffle(res);
    res.length = 0;
    res.push(...shuffled);
    if (!res.length) res.push({ kind: 'heal', id: 'heal' });
    return res;
  }

  function relicChoices(run, rng, data, count, minRarity, fromBoss) {
    let pool = relicPool(run, data, minRarity, fromBoss);
    if (!pool.length) pool = relicPool(run, data, null, fromBoss);
    if (!pool.length) return rewardChoices(run, rng, data, count);
    const list = pool.map((id) => ({ kind: 'relic', id, w: relicWeight(id, data) }));
    return pickDistinct(rng, list, count);
  }

  function randomRelic(run, rng, data, minRarity) {
    const c = relicChoices(run, rng, data, 1, minRarity);
    return c[0] && c[0].kind === 'relic' ? c[0].id : null;
  }

  function randomSkillUp(run, rng, data) {
    const list = candidates(run, data).filter((c) => c.kind === 'skillUp');
    if (list.length) return rng.pick(list);
    const news = candidates(run, data).filter((c) => c.kind === 'skillNew');
    return news.length ? rng.pick(news) : null;
  }

  function randomPassive(run, rng, data) {
    const list = candidates(run, data).filter((c) => c.kind === 'passive');
    return list.length ? rng.pick(list) : null;
  }

  /*
   * Aplica una recompensa a la run. Devuelve { newSynergies, healed }.
   */
  function applyReward(run, choice, data) {
    const inv = run.inventory;
    let healed = 0;
    if (choice.kind === 'skillNew') inv.skills[choice.id] = 1;
    else if (choice.kind === 'skillUp') inv.skills[choice.id] = Math.min(data.config.maxSkillLevel, (inv.skills[choice.id] || 0) + 1);
    else if (choice.kind === 'passive') inv.passives[choice.id] = (inv.passives[choice.id] || 0) + 1;
    else if (choice.kind === 'relic') {
      if (inv.relics.indexOf(choice.id) === -1) inv.relics.push(choice.id);
    }
    const newSynergies = BC.Run.recompute(run, data);
    if (choice.kind === 'passive') {
      const def = data.passives[choice.id];
      if (def.onPick && def.onPick.heal) healed += BC.Run.heal(run, def.onPick.heal);
    }
    if (choice.kind === 'heal') healed += BC.Run.healPct(run, data.shop.healPct);
    return { newSynergies, healed };
  }

  // Texto para mostrar una opción en pantalla
  function describe(choice, run, data) {
    const k = choice.kind;
    if (k === 'skillNew' || k === 'skillUp') {
      const def = data.skills[choice.id];
      const lvl = run.inventory.skills[choice.id] || 0;
      const evo = run.inventory.evolved && run.inventory.evolved.indexOf(choice.id) !== -1;
      return {
        icon: def.icon,
        title: evo ? '✦ ' + data.evolutions[choice.id] : def.name,
        tag: k === 'skillNew' ? 'Nueva habilidad' : 'Nivel ' + lvl + ' → ' + (lvl + 1),
        desc: def.desc + (def.cost ? ' (Maná: ' + def.cost + ')' : ''),
        color: '#ffd76a',
      };
    }
    if (k === 'passive') {
      const def = data.passives[choice.id];
      const st = run.inventory.passives[choice.id] || 0;
      return { icon: def.icon, title: def.name, tag: 'Pasiva ' + (st + 1) + '/' + def.maxStacks, desc: def.desc, color: '#8fd3ff' };
    }
    if (k === 'relic') {
      const def = data.relics[choice.id];
      const rar = data.rarities[def.rarity];
      return { icon: def.icon, title: def.name, tag: 'Reliquia ' + rar.name, desc: def.desc, color: rar.color, tags: def.tags };
    }
    if (k === 'heal') return { icon: '🧪', title: 'Poción de curación', tag: 'Curación', desc: 'Curás ' + Math.round(data.shop.healPct * 100) + '% de tu vida.', color: '#7dff9a' };
    return { icon: '?', title: choice.id, tag: '', desc: '', color: '#fff' };
  }

  // Stock de la tienda con precios
  function shopStock(run, rng, data) {
    const s = data.shop;
    const asc = BC.Stats.worldMods(run.ascension, run.metaLevels, data);
    const mult = (1 + s.realmPriceGrowth * run.realmIndex) * (1 + (asc.shopPricePct || 0));
    const price = (p) => Math.round(p * mult);
    const items = [];
    for (const c of relicChoices(run, rng, data, s.relicCount)) {
      if (c.kind !== 'relic') continue;
      items.push({ kind: 'relic', id: c.id, price: price(s.prices[data.relics[c.id].rarity]) });
    }
    for (let i = 0; i < s.passiveCount; i++) {
      const p = randomPassive(run, rng, data);
      if (p && !items.some((it) => it.id === p.id)) items.push({ kind: 'passive', id: p.id, price: price(s.prices.passive) });
    }
    const up = randomSkillUp(run, rng, data);
    if (up) items.push({ kind: up.kind, id: up.id, price: price(s.prices.skillUp) });
    items.push({ kind: 'heal', id: 'heal', price: price(s.prices.heal) });
    return items;
  }

  /*
   * Abre un cofre: mejora algo que ya tenés, da yules o cura.
   * Devuelve { kind, text, color, newSynergies }.
   */
  function openChest(run, rng, data) {
    const c = data.chests;
    const inv = run.inventory;
    const max = data.config.maxSkillLevel;
    // mejoras posibles: habilidades y pasivas que ya tenés y no están al máximo
    const ups = [];
    for (const id in inv.skills) if (inv.skills[id] > 0 && inv.skills[id] < max) ups.push({ kind: 'skillUp', id });
    for (const id in inv.passives) if (inv.passives[id] > 0 && inv.passives[id] < data.passives[id].maxStacks) ups.push({ kind: 'passive', id });
    // hechizos que se pueden potenciar: al nivel máximo, no potenciados, y sin pasar el máximo
    const evoMax = data.config.evolution.max;
    const evolved = inv.evolved || (inv.evolved = []);
    const evos = evolved.length >= evoMax ? [] : Object.keys(inv.skills).filter((id) => inv.skills[id] >= max && evolved.indexOf(id) === -1 && data.evolutions[id]);
    const opts = [];
    if (ups.length) opts.push({ k: 'upgrade', w: c.weights.upgrade });
    opts.push({ k: 'yul', w: c.weights.yul });
    if (run.hp < run.stats.maxHp) opts.push({ k: 'heal', w: c.weights.heal });
    // primero se sortea el potenciado (probabilidad fija), después el resto
    const pick = evos.length && rng.chance(c.evolveChance) ? 'evolve' : rng.weighted(opts, (o) => o.w).k;
    if (pick === 'evolve') {
      const id = rng.pick(evos);
      evolved.push(id);
      const def = data.skills[id];
      return { kind: 'evolve', id, text: '✦ ¡' + def.name + ' se potenció! → ' + data.evolutions[id], color: '#ff9cf5', newSynergies: [] };
    }
    if (pick === 'upgrade') {
      const u = rng.pick(ups);
      const res = applyReward(run, u, data);
      const d = describe(u, run, data);
      const lvl = u.kind === 'skillUp' ? inv.skills[u.id] : inv.passives[u.id];
      return { kind: 'upgrade', text: d.icon + ' ' + d.title + ' → nivel ' + lvl, color: '#ffd76a', newSynergies: res.newSynergies };
    }
    if (pick === 'heal') {
      const h = BC.Run.healPct(run, c.healPct);
      return { kind: 'heal', text: '❤ +' + Math.round(h) + ' de vida', color: '#7dff9a', newSynergies: [] };
    }
    const y = Math.round(rng.int(c.yul[0], c.yul[1]) * (1 + c.yulPerRealm * run.realmIndex) * run.stats.yulMult);
    run.yul += y;
    return { kind: 'yul', text: '💰 +' + y + ' yules', color: '#ffd23a', newSynergies: [] };
  }

  // Números de una habilidad para mostrar: [{ label, now, next }] (next = al subir un nivel)
  const STAT_LABELS = [
    ['damage', 'Daño', 'int'], ['perCharge', 'Daño por carga', 'int'], ['cooldown', 'Recarga', 's'], ['count', 'Proyectiles', 'int'],
    ['jumps', 'Saltos', 'int'], ['pierce', 'Atraviesa', 'pierce'], ['burn', 'Quemadura', 'ps'], ['poison', 'Veneno', 'ps'],
    ['slowOnHit', 'Frena', 'pct'], ['slow', 'Frena', 'pct'], ['splash', 'Explosión', 'int'], ['radius', 'Radio', 'int'],
    ['maxRadius', 'Radio', 'int'], ['range', 'Alcance', 'int'], ['length', 'Largo', 'int'], ['width', 'Ancho', 'int'],
    ['duration', 'Duración', 's'], ['armor', 'Armadura', 'int'], ['healPct', 'Cura', 'pct'], ['regen', 'Regeneración', 'ps'],
    ['speedPct', 'Velocidad', 'pctPlus'], ['evasion', 'Evasión', 'pctPlus'], ['damagePct', 'Daño extra', 'pctPlus'], ['maxCharges', 'Cargas máx.', 'int'],
  ];
  function fmtStat(v, kind) {
    if (v === undefined || v === null) return '—';
    if (kind === 's') return (Math.round(v * 10) / 10).toString().replace('.', ',') + ' s';
    if (kind === 'ps') return Math.round(v) + '/s';
    if (kind === 'pct') return Math.round(v * 100) + '%';
    if (kind === 'pctPlus') return '+' + Math.round(v * 100) + '%';
    if (kind === 'pierce') return v >= 99 ? 'todo' : String(Math.round(v));
    return String(Math.round(v));
  }
  function skillStatRows(id, level, run, data) {
    const def = data.skills[id];
    const evolved = !!(run && run.inventory.evolved && run.inventory.evolved.indexOf(id) !== -1);
    const evo = evolved ? data.config.evolution : null;
    const lv = Math.max(1, level || 1);
    const now = BC.Stats.skillLevelStats(def, lv, evo);
    const max = data.config.maxSkillLevel;
    const next = lv < max ? BC.Stats.skillLevelStats(def, lv + 1, evo) : null;
    const rows = [];
    const seen = new Set();
    for (const [k, label, kind] of STAT_LABELS) {
      if (now[k] === undefined || seen.has(label)) continue;
      if (k === 'pierce' && !now[k] && !(next && next[k])) continue;
      seen.add(label);
      const a = fmtStat(now[k], kind);
      const b = next ? fmtStat(next[k], kind) : null;
      rows.push({ key: k, label, now: a, next: b, changed: b !== null && b !== a });
    }
    if (def.cost) rows.push({ key: 'cost', label: 'Maná', now: String(def.cost), next: null, changed: false });
    return rows;
  }

  BC.Loot = {
    skillStatRows,
    openChest,
    RARITY_ORDER,
    relicPool,
    candidates,
    rewardChoices,
    relicChoices,
    randomRelic,
    randomSkillUp,
    randomPassive,
    applyReward,
    describe,
    shopStock,
  };
})(typeof window !== 'undefined' ? window : globalThis);
