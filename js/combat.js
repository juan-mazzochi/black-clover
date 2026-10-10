/*
 * Fórmulas de daño. Lógica pura (testeable).
 * La armadura reduce el daño así: daño * 20 / (20 + armadura)
 *   armadura 0  -> 100% del daño
 *   armadura 5  -> 80%
 *   armadura 20 -> 50%
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  const ARMOR_K = 20;

  function armorFactor(armor) {
    return ARMOR_K / (ARMOR_K + Math.max(0, armor || 0));
  }

  /*
   * Daño que hace el jugador.
   *  base: daño de la habilidad
   *  stats: estadísticas efectivas del jugador
   *  ctx: { hpRatio, manaRatio, ultActive, traitPct, targetArmor }
   *  critRoll: número entre 0 y 1 (si es menor que critChance => crítico)
   */
  function playerDamage(base, stats, ctx, critRoll) {
    const c = ctx || {};
    let pct = stats.damagePct || 0;
    if (c.hpRatio !== undefined && c.hpRatio < 0.5) pct += stats.lowHpDamagePct || 0;
    if (c.manaRatio !== undefined && c.manaRatio > 0.7) pct += stats.highManaDamagePct || 0;
    if (c.ultActive) pct += stats.ultDamagePct || 0;
    pct += c.traitPct || 0;
    let dmg = base * (1 + pct);
    const crit = critRoll !== undefined && critRoll < (stats.critChance || 0);
    if (crit) dmg *= stats.critMult || 1.5;
    dmg *= armorFactor(c.targetArmor);
    return { amount: Math.max(1, Math.round(dmg)), crit };
  }

  /*
   * Daño que recibe el jugador.
   *  evadeRoll: número entre 0 y 1 (si es menor que evasion => esquiva)
   */
  function damageTaken(raw, stats, evadeRoll) {
    if (evadeRoll !== undefined && evadeRoll < (stats.evasion || 0)) return { amount: 0, evaded: true };
    return { amount: Math.max(1, Math.round(raw * armorFactor(stats.armor))), evaded: false };
  }

  // Multiplicadores de los enemigos según reino, sala y ascensión
  function enemyScaling(realmIndex, floor, ascMods, data, isBoss) {
    const realm = data.realms[realmIndex];
    const d = data.difficulty;
    const a = ascMods || {};
    let hp = (isBoss ? 1 : realm.hpMult * (1 + d.hpPerFloor * floor)) * (1 + (a.enemyHpPct || 0));
    if (isBoss) hp *= 1 + (a.bossHpPct || 0);
    // Los jefes ya tienen su daño definido en data.js; sólo les afecta la ascensión
    const dmg = (isBoss ? 1 : realm.dmgMult * (1 + d.dmgPerFloor * floor)) * (1 + (a.enemyDmgPct || 0));
    const speed = 1 + (a.enemySpeedPct || 0);
    return { hp, dmg, speed };
  }

  BC.Combat = { armorFactor, playerDamage, damageTaken, enemyScaling };
})(typeof window !== 'undefined' ? window : globalThis);
