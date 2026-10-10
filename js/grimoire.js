/*
 * La pausa como un GRIMORIO abierto: dos páginas de pergamino gastado (generadas
 * con código: manchas, fibras, bordes quemados e irregulares) dentro de una tapa
 * de cuero. Se navega con los marcadores de arriba o con las flechas ← →.
 *
 * Secciones: Hechizos · Pasivas y Reliquias · Sinergias · Estado
 */
(function (root) {
  const BC = (root.BC = root.BC || {});
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ---------------------------------------------------------------------
  // PERGAMINO GASTADO (se genera una vez por página y se guarda como imagen)
  // ---------------------------------------------------------------------
  const parchCache = {};
  function parchment(w, h, seed, side) {
    const key = w + 'x' + h + ':' + seed;
    if (parchCache[key]) return parchCache[key];
    const rng = new BC.RNG('pergamino:' + seed);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');

    // borde irregular (más gastado del lado de afuera del libro)
    const pts = [];
    const jag = (outer) => (outer ? rng.range(2, 14) : rng.range(0, 4));
    const step = 14;
    for (let px = 0; px <= w; px += step) pts.push([px, jag(true) * 0.6]);
    const outerR = side === 'right' || side === 'both';
    const outerL = side === 'left' || side === 'both';
    for (let py = 0; py <= h; py += step) pts.push([w - (outerR ? jag(true) : jag(false)), py]);
    for (let px = w; px >= 0; px -= step) pts.push([px, h - jag(true) * 0.7]);
    for (let py = h; py >= 0; py -= step) pts.push([outerL ? jag(true) : jag(false), py]);
    x.beginPath();
    pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
    x.closePath();
    x.save();
    x.clip();

    // papel base
    const base = x.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, '#ead9b4');
    base.addColorStop(0.5, '#e2cc9c');
    base.addColorStop(1, '#d5ba86');
    x.fillStyle = base;
    x.fillRect(0, 0, w, h);

    // granulado
    const img = x.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng.float() - 0.5) * 22;
      d[i] += n;
      d[i + 1] += n * 0.9;
      d[i + 2] += n * 0.7;
    }
    x.putImageData(img, 0, 0);

    // manchas de humedad y de té
    for (let i = 0; i < 9; i++) {
      const cx = rng.range(0, w);
      const cy = rng.range(0, h);
      const r = rng.range(30, 120);
      const gr = x.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      const a = rng.range(0.05, 0.14);
      gr.addColorStop(0, 'rgba(120,80,30,' + a * 0.5 + ')');
      gr.addColorStop(0.75, 'rgba(110,70,25,' + a + ')');
      gr.addColorStop(1, 'rgba(110,70,25,0)');
      x.fillStyle = gr;
      x.beginPath();
      x.arc(cx, cy, r, 0, Math.PI * 2);
      x.fill();
    }
    // aro de una taza
    x.strokeStyle = 'rgba(100,60,20,0.12)';
    x.lineWidth = 3;
    x.beginPath();
    x.arc(rng.range(w * 0.2, w * 0.8), rng.range(h * 0.6, h * 0.9), rng.range(28, 40), 0.3, 5.6);
    x.stroke();

    // fibras del papel
    x.strokeStyle = 'rgba(90,60,20,0.08)';
    x.lineWidth = 1;
    for (let i = 0; i < 70; i++) {
      const a = rng.range(0, Math.PI);
      const len = rng.range(6, 24);
      const fx = rng.range(0, w);
      const fy = rng.range(0, h);
      x.beginPath();
      x.moveTo(fx, fy);
      x.lineTo(fx + Math.cos(a) * len, fy + Math.sin(a) * len);
      x.stroke();
    }

    // bordes oscurecidos (viejo y quemado)
    const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.75, 'rgba(90,55,20,0.18)');
    v.addColorStop(1, 'rgba(60,30,10,0.55)');
    x.fillStyle = v;
    x.fillRect(0, 0, w, h);
    // sombra del lomo (del lado del centro del libro)
    if (side === 'left' || side === 'right') {
      const sp = side === 'left' ? x.createLinearGradient(w, 0, w - 60, 0) : x.createLinearGradient(0, 0, 60, 0);
      sp.addColorStop(0, 'rgba(50,25,5,0.45)');
      sp.addColorStop(1, 'rgba(50,25,5,0)');
      x.fillStyle = sp;
      x.fillRect(0, 0, w, h);
    }
    x.restore();

    // borde quemado: trazo marrón oscuro sobre el contorno irregular
    x.beginPath();
    pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
    x.closePath();
    x.strokeStyle = 'rgba(70,35,10,0.75)';
    x.lineWidth = 3;
    x.stroke();
    x.strokeStyle = 'rgba(40,18,4,0.35)';
    x.lineWidth = 7;
    x.stroke();

    // WebP: conserva la transparencia de los bordes y pesa mucho menos que PNG
    // (un PNG grande con tanto granulado puede superar lo que acepta una variable de CSS)
    let url = c.toDataURL('image/webp', 0.82);
    if (url.indexOf('data:image/webp') !== 0) url = c.toDataURL('image/png');
    parchCache[key] = url;
    return url;
  }

  // ---------------------------------------------------------------------
  // PÁGINAS
  // ---------------------------------------------------------------------
  const SECTIONS = [
    { id: 'hechizos', name: 'Hechizos', icon: '📜' },
    { id: 'reliquias', name: 'Pasivas y Reliquias', icon: '💎' },
    { id: 'sinergias', name: 'Sinergias', icon: '🔗' },
    { id: 'estado', name: 'Estado', icon: '⚔️' },
  ];

  function pips(lvl, max, evolved) {
    let s = '';
    for (let i = 1; i <= max; i++) s += i <= lvl ? '●' : '○';
    return '<span class="g-pips">' + s + (evolved ? ' <b class="g-evo">✦</b>' : '') + '</span>';
  }

  function pageHechizos(ui) {
    const D = ui.D;
    const run = ui.game.run;
    const ch = D.characters[run.characterId];
    const ids = ch.skillPool.filter((id) => run.inventory.skills[id]);
    if (!ui.gSkill || ids.indexOf(ui.gSkill) === -1) ui.gSkill = ids[0];
    const max = D.config.maxSkillLevel;
    const evolved = run.inventory.evolved || [];
    const list = ids
      .map((id) => {
        const def = D.skills[id];
        const lvl = run.inventory.skills[id];
        const evo = evolved.indexOf(id) !== -1;
        const el = def.element ? D.elements[def.element].name : id === ch.basicSkill ? 'Inicial' : D.characters[def.character] ? D.characters[def.character].name : '';
        return `<button class="g-row ${id === ui.gSkill ? 'sel' : ''}" data-act="gSkill" data-arg="${id}">
          <span class="g-ic">${def.icon}</span>
          <span class="g-name">${esc(evo ? D.evolutions[id] : def.name)}<small>${esc(el)}</small></span>
          ${pips(lvl, max, evo)}
        </button>`;
      })
      .join('');
    const slots = ch.maxSkills ? `<p class="g-note">Habilidades: ${ids.filter((i) => i !== ch.basicSkill).length} de ${ch.maxSkills} (más la inicial)</p>` : '';

    // detalle de la seleccionada
    const id = ui.gSkill;
    const def = D.skills[id];
    const lvl = run.inventory.skills[id];
    const evo = evolved.indexOf(id) !== -1;
    const rows = BC.Loot.skillStatRows(id, lvl, run, D);
    const table = rows
      .map((r) => `<tr><td>${esc(r.label)}</td><td class="n">${esc(r.now)}</td><td class="n ${r.changed ? 'up' : 'dim'}">${r.next === null ? '' : r.changed ? '→ ' + esc(r.next) : '='}</td></tr>`)
      .join('');
    const elem = def.element ? D.elements[def.element] : null;
    const right = `
      <h3 class="g-h">${def.icon} ${esc(evo ? D.evolutions[id] : def.name)}</h3>
      ${evo ? `<p class="g-sub">Potenciado desde <i>${esc(def.name)}</i></p>` : ''}
      <p class="g-sub">${elem ? 'Elemento: ' + elem.icon + ' ' + esc(elem.name) : id === ch.basicSkill ? 'Habilidad inicial' : 'Habilidad de ' + esc(D.characters[def.character].name)} · Nivel ${lvl} de ${max}</p>
      <p class="g-desc">${esc(def.desc)}</p>
      <table class="g-tbl"><tr><th></th><th>Ahora</th><th>${lvl < max ? 'Nivel ' + (lvl + 1) : 'Máximo'}</th></tr>${table}</table>
      <p class="g-note">Los números son los del hechizo; además se suma tu daño extra (+${Math.round(ui.game.player.eff.damagePct * 100)}%) y la reducción de recarga.</p>
      ${lvl >= max && !evo && evolved.length < D.config.evolution.max ? '<p class="g-note">✦ Al nivel máximo, un cofre puede potenciarlo.</p>' : ''}`;
    return { left: `<h3 class="g-h">Hechizos del grimorio</h3>${slots}<div class="g-list">${list}</div>`, right };
  }

  function pageReliquias(ui) {
    const D = ui.D;
    const run = ui.game.run;
    const inv = run.inventory;
    const pas = Object.keys(inv.passives).filter((id) => inv.passives[id] > 0);
    const left =
      `<h3 class="g-h">Pasivas</h3><p class="g-note">${pas.length} de ${D.config.maxPassives} distintas</p>` +
      (pas
        .map((id) => {
          const p = D.passives[id];
          return `<div class="g-item"><span class="g-ic">${p.icon}</span><div><b>${esc(p.name)}</b> <span class="g-pips">${inv.passives[id]}/${p.maxStacks}</span><br><span class="g-desc">${esc(p.desc)} <i>(×${inv.passives[id]})</i></span></div></div>`;
        })
        .join('') || '<p class="g-empty">Todavía ninguna. Aparecen al subir de nivel.</p>');
    const right =
      `<h3 class="g-h">Reliquias</h3><p class="g-note">${inv.relics.length} de ${D.config.maxRelics}</p>` +
      (inv.relics
        .map((id) => {
          const r = D.relics[id];
          const rar = D.rarities[r.rarity];
          return `<div class="g-item"><span class="g-ic">${r.icon}</span><div><b>${esc(r.name)}</b> <span class="g-rar" style="--rc:${rar.color}">${rar.name}</span><br><span class="g-desc">${esc(r.desc)}</span></div></div>`;
        })
        .join('') || '<p class="g-empty">Todavía ninguna. Las dan los élites, los jefes, la tienda y algunos eventos.</p>');
    return { left, right };
  }

  function pageSinergias(ui) {
    const D = ui.D;
    const run = ui.game.run;
    const found = ui.app.save.discoveredSynergies;
    const active = run.synergies.map((id) => D.synergies.find((s) => s.id === id)).filter(Boolean);
    const left =
      '<h3 class="g-h">Sinergias activas</h3>' +
      (active.map((s) => `<div class="g-item"><span class="g-ic">${s.icon}</span><div><b>${esc(s.name)}</b><br><span class="g-desc">${esc(s.desc)}</span></div></div>`).join('') ||
        '<p class="g-empty">Ninguna todavía. Combiná elementos, habilidades o reliquias.</p>');
    // las que te faltan poco para activar
    const inv = run.inventory;
    const tags = BC.Stats.tagCounts(inv, D);
    const stags = BC.Stats.skillTagCounts(inv, D);
    const owned = BC.Stats.ownedIds(inv);
    const near = [];
    for (const s of D.synergies) {
      if (run.synergies.indexOf(s.id) !== -1) continue;
      const req = s.requires;
      if (!BC.Stats.characterAllowed(req, run.characterId)) continue;
      let have = 0;
      let need = 0;
      for (const id of req.items || []) {
        need++;
        if (owned.has(id)) have++;
      }
      for (const t in req.tags || {}) {
        need += req.tags[t];
        have += Math.min(req.tags[t], tags[t] || 0);
      }
      for (const t in req.skillTags || {}) {
        need += req.skillTags[t];
        have += Math.min(req.skillTags[t], stags[t] || 0);
      }
      if (have > 0) near.push({ s, have, need });
    }
    near.sort((a, b) => b.have / b.need - a.have / a.need);
    const right =
      '<h3 class="g-h">Cerca de activarse</h3>' +
      (near
        .slice(0, 6)
        .map(({ s, have, need }) => {
          const known = found.indexOf(s.id) !== -1;
          const pct = Math.round((have / need) * 100);
          return `<div class="g-item"><span class="g-ic">${known ? s.icon : '❔'}</span><div><b>${known ? esc(s.name) : '???'}</b> <span class="g-pips">${have}/${need}</span><div class="g-bar"><i style="width:${pct}%"></i></div>${known ? `<span class="g-desc">${esc(s.desc)}</span>` : '<span class="g-desc"><i>Sinergia sin descubrir.</i></span>'}</div></div>`;
        })
        .join('') || '<p class="g-empty">Nada a la vista todavía.</p>') +
      `<p class="g-note">Descubiertas en total: ${found.length} de ${D.synergies.length}</p>`;
    return { left, right };
  }

  function pageEstado(ui) {
    const D = ui.D;
    const g = ui.game;
    const run = g.run;
    const st = g.player.eff;
    const pct = (v) => Math.round(v * 100) + '%';
    const realm = D.realms[run.realmIndex];
    const need = BC.Run.xpToNext(run.level, D);
    const mm = Math.floor(run.time / 60);
    const ss = String(Math.floor(run.time % 60)).padStart(2, '0');
    const rows = [
      ['❤', 'Vida', Math.ceil(run.hp) + ' / ' + st.maxHp],
      ['⚔', 'Daño extra', '+' + pct(st.damagePct)],
      ['⏱', 'Recarga', '-' + pct(1 - st.cooldownMult)],
      ['🎯', 'Crítico', pct(st.critChance) + ' (x' + st.critMult.toFixed(2).replace('.', ',') + ')'],
      ['🛡', 'Armadura', st.armor],
      ['👟', 'Velocidad', Math.round(st.speed)],
      st.maxMana ? ['🔷', 'Maná', st.maxMana + ' (+' + st.manaRegen.toFixed(1).replace('.', ',') + '/s)'] : null,
      ['👁', 'Evasión', pct(st.evasion)],
      st.lifesteal ? ['🩸', 'Robo de vida', pct(st.lifesteal)] : null,
      st.regen ? ['✨', 'Regeneración', st.regen.toFixed(1).replace('.', ',') + '/s'] : null,
    ].filter(Boolean);
    const left = `<h3 class="g-h">Tu caballero</h3><table class="g-tbl stats">${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="n">${r[2]}</td></tr>`).join('')}</table>`;
    const right = `
      <h3 class="g-h">La partida</h3>
      <table class="g-tbl stats">
        <tr><td>🗺</td><td>Reino</td><td class="n">${esc(realm.name)} · sala ${run.floorIndex + 1}</td></tr>
        <tr><td>⭐</td><td>Nivel</td><td class="n">${run.level} <small>(${Math.floor(run.xp)}/${need} XP)</small></td></tr>
        <tr><td>💰</td><td>Yules</td><td class="n">${run.yul}</td></tr>
        <tr><td>🔄</td><td>Re-tiradas</td><td class="n">${run.rerolls}</td></tr>
        <tr><td>✝</td><td>Revivir</td><td class="n">${run.revives}</td></tr>
        <tr><td>💀</td><td>Derrotados</td><td class="n">${run.kills}</td></tr>
        <tr><td>⌛</td><td>Tiempo</td><td class="n">${mm}:${ss}</td></tr>
      </table>
      <p class="g-note">Semilla: <b>${esc(run.seed)}</b> (escribila al elegir personaje para repetir esta partida)</p>`;
    return { left, right };
  }

  const BUILDERS = { hechizos: pageHechizos, reliquias: pageReliquias, sinergias: pageSinergias, estado: pageEstado };

  // ---------------------------------------------------------------------
  // PAUSA = GRIMORIO
  // ---------------------------------------------------------------------
  BC.UI.prototype.pause = function () {
    if (!this.gSection) this.gSection = 'hechizos';
    const sec = SECTIONS.find((s) => s.id === this.gSection) || SECTIONS[0];
    const pages = BUILDERS[sec.id](this);
    const left = parchment(520, 620, 'izq', 'left');
    const right = parchment(520, 620, 'der', 'right');
    const idx = SECTIONS.indexOf(sec);
    const ribbons = SECTIONS.map(
      (s, i) => `<button class="g-ribbon ${s.id === sec.id ? 'on' : ''}" style="--i:${i}" data-act="gSection" data-arg="${s.id}"><span>${s.icon}</span>${esc(s.name)}</button>`
    ).join('');
    const ch = this.D.characters[this.game.run.characterId];
    this.show(
      'pause',
      `<div class="g-book">
        <div class="g-ribbons">${ribbons}</div>
        <div class="g-cover">
          <div class="g-clover" title="Grimorio de ${esc(ch.name)}">☘</div>
          <div class="g-page left" style="background-image:url(${left})"><div class="g-in">${pages.left}</div><span class="g-folio">${idx * 2 + 1}</span></div>
          <div class="g-page right" style="background-image:url(${right})"><div class="g-in">${pages.right}</div><span class="g-folio">${idx * 2 + 2}</span></div>
        </div>
        <div class="g-foot">
          <button class="btn small" data-act="gPrev" ${idx === 0 ? 'disabled' : ''}>← Anterior</button>
          <button class="btn gold" data-act="resume" data-focus>▶ Continuar <span class="kh">[Esc]</span></button>
          <button class="btn small" data-act="gNext" ${idx === SECTIONS.length - 1 ? 'disabled' : ''}>Siguiente →</button>
        </div>
        <div class="g-foot small">
          <button class="btn small" data-act="mute">${this.app.audio.muted ? '🔇 Sonido: No' : '🔊 Sonido: Sí'}</button>
          <button class="btn small" data-act="graphics">${this.app.save.settings.graphics === 'clasico' ? '🎨 Gráficos: Clásicos' : '👾 Gráficos: Pixel art'}</button>
          <button class="btn small danger" data-act="abandon">${this.confirm === 'abandon' ? (BC.touchMode ? '¿Seguro? Tocá otra vez' : '¿Seguro? Clic otra vez') : 'Abandonar partida'}</button>
        </div>
      </div>`,
      'dim grimoire'
    );
  };

  // acciones del grimorio (se agregan a las de ui.js)
  const baseAct = BC.UI.prototype.act;
  BC.UI.prototype.act = function (a, arg) {
    if (a === 'gSection') {
      this.gSection = arg;
      return this.pause();
    }
    if (a === 'gSkill') {
      this.gSkill = arg;
      return this.pause();
    }
    if (a === 'gPrev' || a === 'gNext') {
      const i = SECTIONS.findIndex((s) => s.id === (this.gSection || 'hechizos'));
      const j = Math.max(0, Math.min(SECTIONS.length - 1, i + (a === 'gNext' ? 1 : -1)));
      this.gSection = SECTIONS[j].id;
      return this.pause();
    }
    return baseAct.call(this, a, arg);
  };

  const baseKey = BC.UI.prototype.key;
  BC.UI.prototype.key = function (k) {
    if (this.screen === 'pause') {
      if (k === 'arrowright' || k === 'd') return this.act('gNext');
      if (k === 'arrowleft' || k === 'a') return this.act('gPrev');
      const n = Number(k);
      if (n >= 1 && n <= SECTIONS.length) return this.act('gSection', SECTIONS[n - 1].id);
    }
    return baseKey.call(this, k);
  };

  BC.Grimoire = { parchment, SECTIONS };
})(typeof window !== 'undefined' ? window : globalThis);
