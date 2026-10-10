/*
 * Menús y ventanas (HTML encima del canvas): menú principal, selección de
 * personaje, base (mejoras permanentes), grimorio, recompensas, eventos,
 * tienda, descanso, pausa y fin de partida.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  class UI {
    constructor(app) {
      this.app = app;
      this.el = document.getElementById('overlay');
      this.screen = null;
      this.sel = 'asta';
      this.grimTab = 'personajes';
      this.confirm = null;
      this.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (!b || b.disabled || b.classList.contains('disabled')) return;
        this.app.audio.unlock();
        this.app.audio.play('click');
        this.act(b.dataset.act, b.dataset.arg);
      });
    }

    get D() {
      return this.app.data;
    }
    get game() {
      return this.app.game;
    }

    show(screen, html, cls) {
      this.screen = screen;
      this.el.innerHTML = html;
      if (BC.PixelIcons) BC.PixelIcons.replaceIn(this.el); // emojis -> pixel art
      this.el.className = 'overlay show ' + (cls || '');
      const f = this.el.querySelector('[data-focus]');
      // foco para el teclado, sin mover la ventana (si no, se corta el título)
      if (f) f.focus({ preventScroll: true });
      const p = this.el.querySelector('.panel');
      if (p) p.scrollTop = 0;
    }
    hide() {
      this.screen = null;
      this.el.className = 'overlay';
      this.el.innerHTML = '';
    }

    // Retrato en pixel art de un personaje (imagen agrandada sin suavizar)
    avatar(id, w) {
      if (!BC.Pixel || typeof document === 'undefined') return this.D.characters[id].icon;
      this.pxCache = this.pxCache || {};
      const key = 'p:' + id;
      if (!this.pxCache[key]) this.pxCache[key] = BC.Pixel.playerSprite(id, 0, false).toDataURL();
      return `<img class="pxav" alt="" src="${this.pxCache[key]}"${w ? ` style="width:${w}px"` : ''}>`;
    }

    bossAvatar(id) {
      if (!BC.Pixel) return this.D.bosses[id].icon;
      this.pxCache = this.pxCache || {};
      const key = 'b:' + id;
      if (!this.pxCache[key]) {
        const spr = BC.Pixel.enemySprite({ id, name: this.D.bosses[id].name }, 0, false);
        this.pxCache[key] = spr ? spr.toDataURL() : '';
      }
      return this.pxCache[key] ? `<img class="pxav" alt="" src="${this.pxCache[key]}" style="width:44px">` : this.D.bosses[id].icon;
    }

    // =================== MENÚ PRINCIPAL ===================
    mainMenu() {
      const s = this.app.save;
      this.show(
        'menu',
        `<div class="panel menu">
          <div class="logo"><div class="clover">☘</div><h1>BLACK CLOVER</h1><h2>La Senda del Rey Mago</h2></div>
          <div class="stars">⭐ ${s.stars} estrellas</div>
          <button class="btn big gold" data-act="play">▶ Jugar</button>
          <button class="btn" data-act="base">🏰 Base de los Toros Negros</button>
          <button class="btn" data-act="grimoire">📖 Grimorio</button>
          <div class="row tight"><button class="btn half" data-act="achievements">🏆 Logros (${s.achievements.length}/${this.D.achievements.length})</button><button class="btn half" data-act="statsScreen">📊 Estadísticas</button></div>
          <button class="btn" data-act="howto">❓ Cómo jugar</button>
          <div class="row tight"><button class="btn small half" data-act="mute">${this.app.audio.muted ? '🔇 Sonido: No' : '🔊 Sonido: Sí'}</button><button class="btn small half" data-act="graphics">${s.settings.graphics === 'clasico' ? '🎨 Gráficos: Clásicos' : '👾 Gráficos: Pixel art'}</button>${BC.touchMode && BC.Fullscreen && BC.Fullscreen.can() ? `<button class="btn small half" data-act="fullscreen">${BC.Fullscreen.is() ? '⛶ Salir de pantalla completa' : '⛶ Pantalla completa'}</button>` : ''}</div>
          <div class="foot">Partidas: ${s.stats.runs} · Victorias: ${s.stats.wins} · Mejor reino: ${s.stats.bestRealm || '-'} · Rango máximo: ${s.maxAscension}</div>
        </div>`,
        'menuov'
      );
    }

    // =================== SELECCIÓN DE PERSONAJE ===================
    charSelect() {
      const D = this.D;
      const s = this.app.save;
      if (s.characters.indexOf(this.sel) === -1) this.sel = 'asta';
      const cards = Object.values(D.characters)
        .map((ch) => {
          const owned = s.characters.indexOf(ch.id) !== -1;
          return `<div class="card char ${this.sel === ch.id ? 'selected' : ''} ${owned ? '' : 'locked'}" data-act="${owned ? 'selChar' : 'noop'}" data-arg="${ch.id}" style="--c:${ch.accent}">
            <div class="avatar" style="border-color:${ch.accent}">${this.avatar(ch.id)}</div>
            <div class="title">${esc(ch.name)}</div>
            <div class="sub">${esc(ch.title)}</div>
            ${owned ? '' : `<div class="lock">🔒 ${ch.unlockCost} ⭐</div><button class="btn small gold" data-act="buyChar" data-arg="${ch.id}" ${s.stars < ch.unlockCost ? 'disabled' : ''}>Desbloquear</button>`}
          </div>`;
        })
        .join('');
      const ch = D.characters[this.sel];
      // habilidades propias en detalle; las de otros / elementales como lista corta
      const own = ch.skillPool.filter((id) => D.skills[id].character === ch.id);
      const others = ch.skillPool.filter((id) => D.skills[id].character !== ch.id && !D.skills[id].element);
      const learnsEl = ch.skillPool.some((id) => D.skills[id].element);
      const elemLine = learnsEl
        ? `<p><b>Hechizos elementales</b> (6 de cada elemento; con los 6 de uno se activa una sinergia): ${Object.values(D.elements).map((el) => el.icon + ' ' + el.name).join(' · ')}</p>`
        : '<p><small>Asta no tiene magia: no puede aprender hechizos elementales.</small></p>';
      const skills = own
        .map((id) => {
          const sk = D.skills[id];
          return `<li><span class="ic">${sk.icon}</span><b>${esc(sk.name)}</b>${sk.basic ? ' <span class="tag">inicial</span>' : ''}${sk.cost ? ' <span class="tag blue">' + sk.cost + ' maná</span>' : ''}<br><small>${esc(sk.desc)}</small></li>`;
        })
        .join('');
      let ascOpts = '';
      for (let i = 0; i <= s.maxAscension; i++) ascOpts += `<option value="${i}">${i === 0 ? 'Normal' : 'Rango ' + i + ': ' + esc(D.ascension[i - 1].desc)}</option>`;
      this.show(
        'charSelect',
        `<div class="panel wide charsel">
          <h2>Elegí tu Caballero Mágico</h2>
          <div class="row cards">${cards}</div>
          <div class="charinfo">
            <p>${esc(ch.description)}</p>
            <p><b>Rasgo — ${esc(ch.trait.name)}:</b> ${esc(ch.trait.desc)}</p>
            <p><b>Definitiva — ${esc(ch.ultimate.name)}:</b> ${esc(ch.ultimate.desc)}</p>
            <ul class="skills">${skills}</ul>
            ${
              others.length
                ? `<p><b>${ch.versatile ? 'Puede aprender las de otros personajes' : 'También puede aprender'}:</b></p><div class="chips">${others
                    .map((id) => `<span class="chip" title="${esc(D.skills[id].desc)}">${D.skills[id].icon} ${esc(D.skills[id].name)}</span>`)
                    .join('')}</div>`
                : ''
            }
            ${elemLine}
            ${ch.maxSkills ? '<p><small>Máximo ' + ch.maxSkills + ' habilidades a la vez, sin contar la inicial.</small></p>' : ''}
          </div>
          <div class="row opts">
            <label>Semilla (opcional): <input id="seed" maxlength="16" placeholder="al azar" autocomplete="off"></label>
            ${s.maxAscension > 0 ? `<label>Dificultad: <select id="asc">${ascOpts}</select></label>` : ''}
          </div>
          <div class="row">
            <button class="btn" data-act="menu">← Volver</button>
            <button class="btn big gold" data-act="start" data-focus>¡A la aventura!</button>
          </div>
        </div>`,
        'dim'
      );
    }

    // =================== BASE (MEJORAS PERMANENTES) ===================
    base() {
      const D = this.D;
      const s = this.app.save;
      const ups = Object.keys(D.meta.upgrades)
        .map((id) => {
          const u = D.meta.upgrades[id];
          const lvl = s.upgrades[id] || 0;
          const cost = BC.Save.upgradeCost(s, id, D);
          const pips = u.costs.map((_, i) => `<span class="pip ${i < lvl ? 'on' : ''}"></span>`).join('');
          return `<div class="card up">
            <div class="ic big">${u.icon}</div>
            <div class="title">${esc(u.name)}</div>
            <div class="sub">${esc(u.desc)}</div>
            <div class="pips">${pips}</div>
            ${cost === null ? '<div class="tag gold">MÁXIMO</div>' : `<button class="btn small gold" data-act="buyUp" data-arg="${id}" ${s.stars < cost ? 'disabled' : ''}>Mejorar · ${cost} ⭐</button>`}
          </div>`;
        })
        .join('');
      const chars = Object.values(D.characters)
        .filter((c) => s.characters.indexOf(c.id) === -1)
        .map((c) => `<div class="card up"><div class="avatar" style="border-color:${c.accent}">${this.avatar(c.id)}</div><div class="title">${esc(c.name)}</div><button class="btn small gold" data-act="buyChar" data-arg="${c.id}" ${s.stars < c.unlockCost ? 'disabled' : ''}>Desbloquear · ${c.unlockCost} ⭐</button></div>`)
        .join('');
      const unlocked = BC.Save.unlockedRelics(s, D);
      const lockedRelics = Object.keys(D.relics)
        .filter((id) => D.relics[id].unlock)
        .map((id) => {
          const r = D.relics[id];
          const ok = unlocked.indexOf(id) !== -1;
          return `<span class="chip ${ok ? '' : 'off'}" title="${esc(r.desc)}">${r.icon} ${esc(r.name)} ${ok ? '✔' : '🔒 Derrotá a ' + esc(D.bosses[r.unlock.boss].name)}</span>`;
        })
        .join('');
      this.show(
        'base',
        `<div class="panel wide">
          <h2>🏰 Base de los Toros Negros</h2>
          <div class="stars">⭐ ${s.stars} estrellas disponibles <small>(ganás estrellas limpiando salas, élites y jefes)</small></div>
          <h3>Entrenamiento permanente</h3>
          <div class="grid">${ups}</div>
          ${chars ? `<h3>Reclutar caballeros</h3><div class="grid">${chars}</div>` : ''}
          <h3>Reliquias legendarias</h3>
          <div class="chips">${lockedRelics}</div>
          <div class="row">
            <button class="btn" data-act="menu">← Volver</button>
            <button class="btn small danger" data-act="reset">${this.confirm === 'reset' ? '¿Seguro? Se borra TODO. Clic otra vez' : 'Borrar progreso'}</button>
          </div>
        </div>`,
        'dim'
      );
    }

    // =================== GRIMORIO (COMPENDIO) ===================
    grimoire() {
      const D = this.D;
      const s = this.app.save;
      const tabs = [
        ['personajes', 'Personajes'],
        ['habilidades', 'Habilidades'],
        ['pasivas', 'Pasivas'],
        ['reliquias', 'Reliquias'],
        ['sinergias', 'Sinergias'],
        ['jefes', 'Jefes'],
        ['rangos', 'Rangos'],
      ];
      const t = this.grimTab;
      let body = '';
      if (t === 'personajes') {
        body = Object.values(D.characters)
          .map((c) => `<div class="entry"><span class="ic big">${this.avatar(c.id, 40)}</span><div><b>${esc(c.name)}</b> — ${esc(c.title)}<br>${esc(c.description)}<br><small><b>${esc(c.trait.name)}:</b> ${esc(c.trait.desc)}<br><b>${esc(c.ultimate.name)}:</b> ${esc(c.ultimate.desc)}</small></div></div>`)
          .join('');
      } else if (t === 'habilidades') {
        body = Object.keys(D.skills)
          .map((id) => {
            const k = D.skills[id];
            return `<div class="entry"><span class="ic big">${k.icon}</span><div><b>${esc(k.name)}</b> <span class="tag">${k.element ? D.elements[k.element].icon + ' ' + D.elements[k.element].name : esc(D.characters[k.character].name)}</span>${k.cost ? ' <span class="tag blue">' + k.cost + ' maná</span>' : ''}<br>${esc(k.desc)}</div></div>`;
          })
          .join('');
      } else if (t === 'pasivas') {
        body = Object.values(D.passives)
          .map((p) => `<div class="entry"><span class="ic big">${p.icon}</span><div><b>${esc(p.name)}</b> <span class="tag">máx. ${p.maxStacks}</span>${p.requiresMana ? ' <span class="tag blue">requiere maná</span>' : ''}<br>${esc(p.desc)}</div></div>`)
          .join('');
      } else if (t === 'reliquias') {
        const unl = BC.Save.unlockedRelics(s, D);
        body = Object.keys(D.relics)
          .map((id) => {
            const r = D.relics[id];
            const locked = r.unlock && unl.indexOf(id) === -1;
            const rar = D.rarities[r.rarity];
            return `<div class="entry ${locked ? 'off' : ''}"><span class="ic big">${r.icon}</span><div><b style="color:${rar.color}">${esc(r.name)}</b> <span class="tag">${rar.name}</span> ${r.tags.map((x) => '<span class="tag">' + x + '</span>').join(' ')}<br>${esc(r.desc)}${locked ? '<br><small>🔒 Derrotá a ' + esc(D.bosses[r.unlock.boss].name) + ' para desbloquearla</small>' : ''}</div></div>`;
          })
          .join('');
      } else if (t === 'sinergias') {
        // ocultas hasta que las actives por primera vez
        const found = s.discoveredSynergies;
        body =
          `<p class="center">Descubiertas: <b>${D.synergies.filter((x) => found.indexOf(x.id) !== -1).length} / ${D.synergies.length}</b>. Las que todavía no activaste aparecen como ❔.</p>` +
          D.synergies
            .map((x) =>
              found.indexOf(x.id) !== -1
                ? `<div class="entry"><span class="ic big">${x.icon}</span><div><b>${esc(x.name)}</b><br>${esc(x.desc)}</div></div>`
                : `<div class="entry off"><span class="ic big">❔</span><div><b>???</b><br><small>Sinergia sin descubrir. Probá combinar habilidades, elementos o reliquias.</small></div></div>`
            )
            .join('');
      } else if (t === 'jefes') {
        body = D.realms
          .map((r) => {
            const b = D.bosses[r.boss];
            const seen = s.bossesDefeated.indexOf(r.boss) !== -1;
            if (r.secret && !BC.Save.secretUnlocked(s, D)) return `<div class="entry off"><span class="ic big">❔</span><div><b>???</b> — Reino secreto<br><small>Ganá el juego ${D.config.secretUnlockWins} veces para descubrirlo (llevás ${s.stats.wins}).</small></div></div>`;
            return `<div class="entry"><span class="ic big">${this.bossAvatar(r.boss)}</span><div><b>${esc(b.name)}</b> — ${esc(r.name)} ${seen ? '<span class="tag gold">derrotado</span>' : ''}<br>${esc(b.title)}<br><small>Fases: ${b.phases.map((p) => esc(p.name)).join(' → ')}</small></div></div>`;
          })
          .join('');
      } else if (t === 'rangos') {
        body =
          '<p>Al ganar una partida desbloqueás el siguiente Rango. Cada rango suma su dificultad a la de los anteriores y da +20% de estrellas por rango.</p>' +
          D.ascension.map((a, i) => `<div class="entry ${i < s.maxAscension ? '' : 'off'}"><span class="ic big">${i < s.maxAscension ? '🏅' : '🔒'}</span><div><b>${esc(a.name)}</b><br>${esc(a.desc)}</div></div>`).join('');
      }
      this.show(
        'grimoire',
        `<div class="panel wide">
          <h2>📖 Grimorio</h2>
          <div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === t ? 'on' : ''}" data-act="grimTab" data-arg="${k}">${n}</button>`).join('')}</div>
          <div class="list">${body}</div>
          <div class="row"><button class="btn" data-act="menu">← Volver</button></div>
        </div>`,
        'dim'
      );
    }

    achievementsScreen() {
      const D = this.D;
      const s = this.app.save;
      const list = D.achievements
        .map((a) => {
          const done = s.achievements.indexOf(a.id) !== -1;
          return `<div class="entry ${done ? '' : 'off'}"><span class="ic big">${done ? a.icon : '🔒'}</span><div><b>${esc(a.name)}</b> <span class="tag gold">+${a.stars} ⭐</span>${done ? ' <span class="tag gold">✔ conseguido</span>' : ''}<br>${esc(a.desc)}</div></div>`;
        })
        .join('');
      this.show(
        'achievements',
        `<div class="panel wide">
          <h2>🏆 Logros</h2>
          <div class="sub center">Conseguidos: <b>${s.achievements.length} / ${D.achievements.length}</b>. Cada logro da estrellas extra una sola vez.</div>
          <div class="list">${list}</div>
          <div class="row"><button class="btn" data-act="menu">← Volver</button></div>
        </div>`,
        'dim'
      );
    }

    statsScreen() {
      const D = this.D;
      const s = this.app.save;
      const st = s.stats;
      const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
      const chars = Object.values(D.characters)
        .map((c) => {
          const p = st.perChar[c.id] || { runs: 0, wins: 0, bestLevel: 0 };
          return `<tr><td>${this.avatar(c.id, 22)} ${esc(c.name)}</td><td>${p.runs}</td><td>${p.wins}</td><td>${p.runs ? Math.round((p.wins / p.runs) * 100) + '%' : '-'}</td><td>${p.bestLevel || '-'}</td></tr>`;
        })
        .join('');
      const killers = BC.Progress.top(st.killers, 5).map(([n, c]) => `<li>${esc(n)} <b>×${c}</b></li>`).join('') || '<li><small>Todavía nadie</small></li>';
      const syns = BC.Progress.top(st.synergyUse, 5)
        .map(([id, c]) => {
          const x = D.synergies.find((y) => y.id === id);
          return x ? `<li>${x.icon} ${esc(x.name)} <b>×${c}</b></li>` : '';
        })
        .join('') || '<li><small>Todavía ninguna</small></li>';
      const hist = s.history
        .slice(0, 10)
        .map((h) => {
          const c = D.characters[h.characterId];
          const realm = D.realms[h.realm] ? D.realms[h.realm].name : '-';
          return `<tr><td>${h.won ? '👑' : '💀'}</td><td>${c ? this.avatar(c.id, 22) + ' ' + esc(c.name) : '-'}</td><td>${esc(realm)}</td><td>${h.level}</td><td>${h.kills}</td><td>${fmt(h.time)}</td><td>${h.won ? '¡Victoria!' : esc(h.killedBy || '-')}</td></tr>`;
        })
        .join('') || '<tr><td colspan="7"><small>Todavía no jugaste ninguna partida</small></td></tr>';
      this.show(
        'statsScreen',
        `<div class="panel wide">
          <h2>📊 Estadísticas</h2>
          <div class="statsgrid">
            <div>Partidas <b>${st.runs}</b></div>
            <div>Victorias <b>${st.wins}</b></div>
            <div>Enemigos derrotados <b>${st.kills}</b></div>
            <div>Tiempo jugado <b>${fmt(st.totalTime || 0)}</b></div>
            <div>Victoria más rápida <b>${st.bestWinTime ? fmt(st.bestWinTime) : '-'}</b></div>
            <div>Estrellas totales <b>${s.totalStars}</b></div>
            <div>Sinergias descubiertas <b>${s.discoveredSynergies.length}/${D.synergies.length}</b></div>
            <div>Logros <b>${s.achievements.length}/${D.achievements.length}</b></div>
          </div>
          <h3>Por personaje</h3>
          <table class="tbl"><tr><th>Personaje</th><th>Partidas</th><th>Victorias</th><th>%</th><th>Mejor nivel</th></tr>${chars}</table>
          <div class="cols">
            <div><h3>💀 Quién más te derrotó</h3><ul class="plain">${killers}</ul></div>
            <div><h3>🔗 Sinergias más usadas</h3><ul class="plain">${syns}</ul></div>
          </div>
          <h3>Últimas partidas</h3>
          <table class="tbl"><tr><th></th><th>Personaje</th><th>Llegó a</th><th>Nivel</th><th>Kills</th><th>Tiempo</th><th>Resultado</th></tr>${hist}</table>
          <div class="row"><button class="btn" data-act="menu">← Volver</button></div>
        </div>`,
        'dim'
      );
    }

    howTo() {
      this.show(
        'howto',
        `<div class="panel">
          <h2>❓ Cómo jugar</h2>
          <div class="help">
            <p class="only-touch"><b>En el celular:</b> apoyá el dedo en cualquier parte de la pantalla y arrastralo para moverte (aparece un joystick). Con la otra mano: <b>💨</b> para esquivar, <b>✦</b> para la definitiva (brilla cuando está lista) y <b>❚❚</b> arriba a la derecha para pausar.</p>
            <p class="only-keys"><b>Moverse:</b> W A S D o las flechas.</p>
            <p class="only-keys"><b>Esquivar (dash):</b> Espacio o Shift. Mientras esquivás sos invulnerable un instante.</p>
            <p><b>Atacar:</b> ¡automático! Tus habilidades se lanzan solas contra el enemigo más cercano cuando están listas (y si tenés maná).</p>
            <p><b>Definitiva:</b> cuando su barra (la tercera) se llena, <span class="only-keys">apretá <b>Q</b></span><span class="only-touch">tocá <b>✦</b></span> para activarla. ¡Guardala para el momento justo!</p>
            <p class="only-keys"><b>Pausa:</b> Esc o P (ahí ves tu build completa). <b>Sonido:</b> M.</p>
            <hr>
            <p>Cada partida recorre 5 reinos. En cada reino elegís puertas: ⚔️ combate, 💀 élite, 🛒 tienda, ❓ evento, 🔥 descanso y al final 👹 el jefe.</p>
            <p>Los enemigos dan <b>experiencia</b> (barra dorada arriba de todo). Cada vez que subís de nivel elegís una mejora: habilidades nuevas, niveles, pasivas o reliquias. Cada nivel pide más experiencia que el anterior. Los élites y jefes dan reliquias (máximo ${this.D.config.maxRelics}). Algunas combinaciones activan <b>sinergias</b> (mirá el Grimorio).</p>
            <p>Si morís, perdés la partida pero ganás ⭐ estrellas para mejorar a tu escuadrón en la Base.</p>
            <p>Los círculos y líneas rojas en el piso avisan dónde va a caer un ataque: ¡salí de ahí!</p>
          </div>
          <div class="row"><button class="btn" data-act="menu">← Volver</button></div>
        </div>`,
        'dim'
      );
    }

    // =================== RECOMPENSAS ===================
    synergyHints(choice) {
      const D = this.D;
      const run = this.game.run;
      const out = [];
      const tags = choice.kind === 'relic' ? D.relics[choice.id].tags || [] : [];
      const counts = BC.Stats.tagCounts(run.inventory, D);
      const owned = BC.Stats.ownedIds(run.inventory);
      const skillCounts = BC.Stats.skillTagCounts(run.inventory, D);
      for (const s of D.synergies) {
        const req = s.requires;
        if (!BC.Stats.characterAllowed(req, run.characterId)) continue;
        if (run.synergies.indexOf(s.id) !== -1) continue;
        let rel = false;
        let have = 0;
        let need = 0;
        if (req.items) {
          need += req.items.length;
          for (const id of req.items) if (owned.has(id) || id === choice.id) have++;
          if (req.items.indexOf(choice.id) !== -1) rel = true;
        }
        if (req.tags) {
          for (const tg in req.tags) {
            need += req.tags[tg];
            have += Math.min(req.tags[tg], (counts[tg] || 0) + (tags.indexOf(tg) !== -1 ? 1 : 0));
            if (tags.indexOf(tg) !== -1) rel = true;
          }
        }
        if (req.skillTags) {
          // sólo cuenta si es una habilidad nueva con esa etiqueta
          const sTags = choice.kind === 'skillNew' ? D.skills[choice.id].tags || [] : [];
          for (const tg in req.skillTags) {
            need += req.skillTags[tg];
            have += Math.min(req.skillTags[tg], (skillCounts[tg] || 0) + (sTags.indexOf(tg) !== -1 ? 1 : 0));
            if (sTags.indexOf(tg) !== -1) rel = true;
          }
        }
        if (!rel) continue;
        // las sinergias que todavía no descubriste se muestran ocultas
        const known = this.app.save.discoveredSynergies.indexOf(s.id) !== -1;
        out.push({ txt: `${s.icon} ${esc(s.name)} (${have}/${need})`, hidden: !known, ratio: have / need });
      }
      out.sort((a, b) => b.ratio - a.ratio);
      // las conocidas con nombre; las ocultas, sólo cuántas son
      const known = out.filter((o) => !o.hidden).slice(0, 2).map((o) => o.txt);
      const hidden = out.filter((o) => o.hidden).length;
      if (hidden) known.push('❔ ' + hidden + (hidden === 1 ? ' sinergia oculta' : ' sinergias ocultas'));
      return known.length ? `<div class="syn">Sinergia: ${known.join(', ')}</div>` : '';
    }

    // Los números clave de una habilidad (y cuánto suben si es una mejora)
    statLine(c) {
      if (c.kind !== 'skillNew' && c.kind !== 'skillUp') return '';
      const run = this.game.run;
      const lvl = run.inventory.skills[c.id] || 0;
      const rows = BC.Loot.skillStatRows(c.id, Math.max(1, lvl), run, this.D);
      const pick = c.kind === 'skillUp' ? rows.filter((r) => r.changed).slice(0, 3) : rows.filter((r) => r.key !== 'cost').slice(0, 3);
      if (!pick.length) return '';
      return '<div class="statline">' + pick.map((r) => (c.kind === 'skillUp' ? `${esc(r.label)} <b>${esc(r.now)} → ${esc(r.next)}</b>` : `${esc(r.label)} <b>${esc(r.now)}</b>`)).join(' · ') + '</div>';
    }

    choiceCard(c, i, extra) {
      const d = BC.Loot.describe(c, this.game.run, this.D);
      return `<div class="card choice" data-act="${extra ? extra.act : 'choose'}" data-arg="${i}" style="--c:${d.color}">
        <div class="key">${i + 1}</div>
        <div class="ic huge">${d.icon}</div>
        <div class="tag" style="--tc:${d.color}">${esc(d.tag)}</div>
        <div class="title">${esc(d.title)}</div>
        <div class="desc">${esc(d.desc)}</div>
        ${this.statLine(c)}
        ${this.synergyHints(c)}
        ${extra && extra.footer ? extra.footer : ''}
      </div>`;
    }

    reward(pr) {
      const titles = {
        normal: ['¡Sala despejada!', 'Elegí una mejora para tu grimorio'],
        level: ['¡Nivel <span class="num">' + this.game.run.level + '</span>!', 'Elegí una mejora para tu grimorio'],
        elite: ['¡Élite derrotado!', 'Elegí una reliquia'],
        boss: ['¡Jefe derrotado!', 'Elegí un tesoro'],
        train: ['Entrenamiento', 'Elegí qué habilidad entrenar'],
      };
      const [t, sub] = titles[pr.kind] || titles.normal;
      const run = this.game.run;
      this.show(
        'reward',
        `<div class="panel wide trans">
          <h2>${t}</h2><div class="sub center">${sub}</div>
          <div class="row cards">${pr.choices.map((c, i) => this.choiceCard(c, i)).join('')}</div>
          <div class="row">
            <button class="btn" data-act="reroll" ${run.rerolls > 0 ? '' : 'disabled'} title="Ganás 1 re-tirada cada ${this.D.config.rerollEveryLevels} niveles">🔄 Re-tirar (${run.rerolls}) <span class="kh">[R]</span></button>
            <button class="btn small" data-act="skip">Saltear (+15 yules)</button>
          </div>
        </div>`
      );
    }

    // =================== COFRE ===================
    chest(res) {
      const titles = { evolve: '✦ ¡Hechizo potenciado!', upgrade: '¡Mejora!', yul: '¡Yules!', heal: '¡Curación!' };
      const icons = { evolve: '', upgrade: '⬆️', yul: '💰', heal: '❤️' };
      this.show(
        'chest',
        `<div class="panel chestpop" style="--c:${res.color}">
          <div class="ic huge center">🎁</div>
          <h2>${titles[res.kind] || '¡Cofre!'}</h2>
          <div class="chestres"><span class="ic big">${icons[res.kind] || ''}</span> ${esc(res.text)}</div>
          <div class="row"><button class="btn gold" data-act="closeChest" data-focus>Continuar <span class="kh">[Enter]</span></button></div>
        </div>`
      );
    }

    // =================== EVENTOS ===================
    event(ev) {
      const run = this.game.run;
      const opts = ev.options
        .map((o, i) => {
          const ok = BC.Events.canChoose(run, o);
          return `<button class="btn opt" data-act="eventOpt" data-arg="${i}" ${ok ? '' : 'disabled'}><b>${i + 1}. ${esc(o.label)}</b><br><small>${esc(o.hint || '')}${ok ? '' : ' (no te alcanza)'}</small></button>`;
        })
        .join('');
      this.show(
        'event',
        `<div class="panel trans">
          <div class="ic huge center">${ev.icon}</div>
          <h2>${esc(ev.title)}</h2>
          <p class="story">${esc(ev.text)}</p>
          <div class="col">${opts}</div>
          <div class="sub center">💰 ${run.yul} yules · ❤ ${Math.ceil(run.hp)}/${run.stats.maxHp}</div>
        </div>`
      );
    }

    eventResult(res) {
      this.show(
        'eventResult',
        `<div class="panel trans">
          <h2>Resultado</h2>
          <ul class="results">${res.msgs.map((m) => '<li>' + esc(m) + '</li>').join('') || '<li>Nada cambió.</li>'}</ul>
          <div class="row"><button class="btn gold" data-act="closeOverlay" data-focus>Continuar <span class="kh">[Enter]</span></button></div>
        </div>`
      );
    }

    // =================== TIENDA ===================
    shop(stock) {
      const run = this.game.run;
      const cards = stock
        .map((it, i) => {
          const can = !it.sold && run.yul >= it.price;
          const footer = `<div class="price ${can ? '' : 'no'}">${it.sold ? 'VENDIDO' : '💰 ' + it.price}</div>`;
          return this.choiceCard(it, i, { act: it.sold || !can ? 'noop' : 'buy', footer }).replace('class="card choice"', `class="card choice ${it.sold ? 'sold' : ''} ${can ? '' : 'cant'}"`);
        })
        .join('');
      this.show(
        'shop',
        `<div class="panel wide trans">
          <h2>🛒 Tienda del Mercader</h2>
          <div class="row shophead"><span class="sub">Tenés 💰 ${run.yul} yules · ❤ ${Math.ceil(run.hp)}/${run.stats.maxHp}</span><button class="btn gold" data-act="closeOverlay">Salir de la tienda</button></div>
          <div class="row cards shopcards">${cards}</div>
        </div>`
      );
    }

    // =================== DESCANSO ===================
    rest(info) {
      const run = this.game.run;
      const heal = Math.round(run.stats.maxHp * info.healPct);
      this.show(
        'rest',
        `<div class="panel trans">
          <div class="ic huge center">🔥</div>
          <h2>Campamento</h2>
          <p class="story">Una fogata tranquila antes de seguir. ¿Qué hacés?</p>
          <div class="col">
            <button class="btn opt" data-act="rest" data-arg="heal"><b>1. Descansar</b><br><small>Curás ${heal} de vida (❤ ${Math.ceil(run.hp)}/${run.stats.maxHp})</small></button>
            <button class="btn opt" data-act="rest" data-arg="train"><b>2. Entrenar</b><br><small>Mejorás o aprendés una habilidad</small></button>
          </div>
        </div>`
      );
    }

    // La pausa (el grimorio) está en js/grimoire.js

    // =================== FIN DE PARTIDA ===================
    runEnd(summary, result) {
      const D = this.D;
      const won = summary.won;
      const ch = D.characters[summary.characterId];
      const mm = Math.floor(summary.time / 60);
      const ss = Math.floor(summary.time % 60);
      const unlocks = (result.newUnlocks || []).map((id) => `<li>🔓 Nueva reliquia: ${D.relics[id].icon} ${esc(D.relics[id].name)}</li>`).join('');
      this.show(
        'runEnd',
        `<div class="panel">
          <div class="ic huge center">${won ? '👑' : '💀'}</div>
          <h2>${won ? '¡VICTORIA!' : 'Derrota'}</h2>
          <p class="story center">"${esc(won ? ch.quotes.win : ch.quotes.death)}" — ${esc(ch.name)}</p>
          <div class="statsgrid">
            <div>Llegaste a <b>${esc(D.realms[summary.realmReached].name)}</b></div>
            <div>Salas despejadas <b>${summary.roomsCleared}</b></div>
            <div>Enemigos derrotados <b>${summary.kills}</b></div>
            <div>Élites <b>${summary.elitesKilled}</b></div>
            <div>Jefes <b>${summary.bossesDefeated.length}</b></div>
            <div>Tiempo <b>${mm}:${ss < 10 ? '0' : ''}${ss}</b></div>
            <div>Nivel alcanzado <b>${summary.level || 1}</b></div>
          </div>
          <div class="stars big">+${result.stars} ⭐</div>
          <ul class="results">${unlocks}${result.newAscension ? '<li>🏅 ¡Desbloqueaste el Rango ' + result.save.maxAscension + '!</li>' : ''}${(result.newAchievements || []).map((a) => `<li>🏆 Logro: <b>${a.icon} ${esc(a.name)}</b> (+${a.stars} ⭐)</li>`).join('')}${result.newSecret ? '<li>👁️ <b>¡Se desbloqueó el REINO SECRETO!</b> Aparecerá después de Dante.</li>' : ''}</ul>
          <div class="sub center">Semilla: ${esc(summary.seed)}</div>
          <div class="row">
            <button class="btn gold" data-act="play" data-focus>Jugar otra vez</button>
            <button class="btn" data-act="base">🏰 Base</button>
            <button class="btn" data-act="menu">Menú</button>
          </div>
        </div>`,
        'dim'
      );
    }

    // =================== ACCIONES ===================
    act(a, arg) {
      const app = this.app;
      const g = this.game;
      const D = this.D;
      if (a !== 'reset' && a !== 'abandon') this.confirm = null;
      switch (a) {
        case 'noop':
          return;
        case 'menu':
          return app.toMenu();
        case 'play':
          return this.charSelect();
        case 'base':
          return this.base();
        case 'grimoire':
          return this.grimoire();
        case 'grimTab':
          this.grimTab = arg;
          return this.grimoire();
        case 'achievements':
          return this.achievementsScreen();
        case 'statsScreen':
          return this.statsScreen();
        case 'howto':
          return this.howTo();
        case 'graphics':
          app.toggleGraphics();
          return this.screen === 'pause' ? this.pause() : this.mainMenu();
        case 'fullscreen':
          BC.Fullscreen.toggle();
          return setTimeout(() => this.screen === 'menu' && this.mainMenu(), 300);
        case 'mute':
          app.toggleMute();
          return this.screen === 'pause' ? this.pause() : this.mainMenu();
        case 'selChar':
          this.sel = arg;
          return this.charSelect();
        case 'buyChar': {
          const r = BC.Save.buyCharacter(app.save, arg, D);
          if (r.ok) {
            app.save = r.save;
            app.persist();
            this.sel = arg;
          }
          return this.screen === 'base' ? this.base() : this.charSelect();
        }
        case 'buyUp': {
          const r = BC.Save.buyUpgrade(app.save, arg, D);
          if (r.ok) {
            app.save = r.save;
            app.persist();
          }
          return this.base();
        }
        case 'reset':
          if (this.confirm !== 'reset') {
            this.confirm = 'reset';
            return this.base();
          }
          this.confirm = null;
          app.resetSave();
          return this.base();
        case 'start': {
          const seedEl = document.getElementById('seed');
          const ascEl = document.getElementById('asc');
          const seed = seedEl && seedEl.value.trim() ? seedEl.value.trim().toUpperCase() : null;
          return app.startRun({ characterId: this.sel, seed, ascension: ascEl ? Number(ascEl.value) : 0 });
        }
        case 'closeChest':
          this.hide();
          return g.closeChest();
        case 'choose':
          this.hide();
          return g.chooseReward(Number(arg));
        case 'reroll':
          return g.rerollReward();
        case 'skip':
          this.hide();
          return g.skipReward();
        case 'eventOpt':
          return g.chooseEvent(Number(arg));
        case 'closeOverlay':
          this.hide();
          return g.closeOverlay();
        case 'buy':
          return g.buyItem(Number(arg));
        case 'rest':
          this.hide();
          return g.restChoice(arg);
        case 'resume':
          return app.setPaused(false);
        case 'abandon':
          if (this.confirm !== 'abandon') {
            this.confirm = 'abandon';
            return this.pause();
          }
          this.confirm = null;
          app.setPaused(false);
          return g.abandon();
      }
    }

    // Atajos de teclado dentro de las ventanas
    key(k) {
      const s = this.screen;
      const n = Number(k);
      if (s === 'reward' && n >= 1 && n <= this.game.pendingReward.choices.length) return this.act('choose', n - 1);
      if (s === 'reward' && k === 'r') return this.act('reroll');
      if (s === 'event' && n >= 1 && this.game.currentEvent && n <= this.game.currentEvent.options.length) {
        if (BC.Events.canChoose(this.game.run, this.game.currentEvent.options[n - 1])) return this.act('eventOpt', n - 1);
      }
      if (s === 'eventResult' && (k === 'enter' || k === ' ')) return this.act('closeOverlay');
      if (s === 'chest' && (k === 'enter' || k === ' ' || k === 'escape')) return this.act('closeChest');
      if (s === 'rest' && (k === '1' || k === '2')) return this.act('rest', k === '1' ? 'heal' : 'train');
    }
  }

  BC.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
