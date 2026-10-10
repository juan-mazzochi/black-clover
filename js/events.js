/*
 * Eventos: salas con una historia corta y opciones. Lógica pura (testeable).
 * Los eventos se definen en data.js (sección "events").
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  function pickEvent(run, rng, data) {
    let pool = data.events.filter((e) => run.seenEvents.indexOf(e.id) === -1);
    if (!pool.length) pool = data.events;
    return rng.pick(pool);
  }

  function canChoose(run, option) {
    if (option.cost && option.cost.yul && run.yul < option.cost.yul) return false;
    return true;
  }

  /*
   * Aplica una opción. Devuelve una lista de mensajes para mostrar
   * y las sinergias nuevas que se hayan activado.
   */
  function applyOption(run, option, rng, data) {
    const msgs = [];
    const newSyn = [];
    if (!canChoose(run, option)) return { msgs: ['No tenés suficientes yules.'], newSynergies: [], ok: false };
    if (option.cost && option.cost.yul) {
      run.yul -= option.cost.yul;
      msgs.push('-' + option.cost.yul + ' yules');
    }

    function apply(effects) {
      for (const ef of effects || []) {
        if (ef.chance !== undefined) {
          if (rng.chance(ef.chance)) {
            msgs.push('¡Salió bien!');
            apply(ef.success);
          } else {
            msgs.push('Salió mal...');
            apply(ef.fail);
          }
          continue;
        }
        if (ef.heal) {
          const h = BC.Run.healPct(run, ef.heal);
          msgs.push('+' + Math.round(h) + ' de vida');
        }
        if (ef.maxHp) {
          run.inventory.extra.maxHp = (run.inventory.extra.maxHp || 0) + ef.maxHp;
          newSyn.push(...BC.Run.recompute(run, data));
          msgs.push((ef.maxHp > 0 ? '+' : '') + ef.maxHp + ' de vida máxima');
        }
        if (ef.yul) {
          run.yul = Math.max(0, run.yul + ef.yul);
          msgs.push((ef.yul > 0 ? '+' : '') + ef.yul + ' yules');
        }
        if (ef.yulPctGain) {
          const g = Math.round(run.yul * ef.yulPctGain);
          run.yul += g;
          msgs.push('+' + g + ' yules');
        }
        if (ef.yulPctLoss) {
          const l = Math.round(run.yul * ef.yulPctLoss);
          run.yul -= l;
          msgs.push('-' + l + ' yules');
        }
        if (ef.damagePct) {
          const d = Math.round(run.hp * ef.damagePct);
          run.hp = Math.max(1, run.hp - d);
          msgs.push('-' + d + ' de vida');
        }
        if (ef.relic) {
          let id = ef.relic;
          if (id === 'random') id = BC.Loot.randomRelic(run, rng, data, ef.minRarity);
          if (id && run.inventory.relics.indexOf(id) === -1) {
            const r = BC.Loot.applyReward(run, { kind: 'relic', id }, data);
            newSyn.push(...r.newSynergies);
            msgs.push('Reliquia: ' + data.relics[id].icon + ' ' + data.relics[id].name);
          } else {
            run.yul += 30;
            msgs.push('No había nada nuevo... +30 yules');
          }
        }
        if (ef.skillUp) {
          const c = BC.Loot.randomSkillUp(run, rng, data);
          if (c) {
            const r = BC.Loot.applyReward(run, c, data);
            newSyn.push(...r.newSynergies);
            const def = data.skills[c.id];
            msgs.push(def.icon + ' ' + def.name + ' → nivel ' + run.inventory.skills[c.id]);
          } else msgs.push('Tus habilidades ya están al máximo.');
        }
        if (ef.passive || ef.passiveId) {
          let c = ef.passiveId ? { kind: 'passive', id: ef.passiveId } : BC.Loot.randomPassive(run, rng, data);
          if (c && ef.passiveId) {
            const def = data.passives[c.id];
            const full = Object.keys(run.inventory.passives).filter((id) => run.inventory.passives[id] > 0).length >= (data.config.maxPassives || Infinity);
            if ((run.inventory.passives[c.id] || 0) >= def.maxStacks || (full && !(run.inventory.passives[c.id] > 0))) c = BC.Loot.randomPassive(run, rng, data);
          }
          if (c) {
            const r = BC.Loot.applyReward(run, c, data);
            newSyn.push(...r.newSynergies);
            msgs.push('Pasiva: ' + data.passives[c.id].icon + ' ' + data.passives[c.id].name);
          }
        }
      }
    }

    apply(option.effects);
    return { msgs, newSynergies: newSyn, ok: true };
  }

  BC.Events = { pickEvent, canChoose, applyOption };
})(typeof window !== 'undefined' ? window : globalThis);
