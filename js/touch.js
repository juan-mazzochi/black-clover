/*
 * Controles táctiles (celular y tablet).
 *   - Joystick: apoyá el dedo en cualquier parte de la pantalla y arrastralo.
 *   - Botones a la derecha: 💨 esquivar y ✦ definitiva (brilla cuando está lista).
 *   - Botón ❚❚ arriba a la derecha: pausa (grimorio).
 * Sólo aparecen en pantallas táctiles, mientras se está jugando una sala.
 * Para probarlo en la computadora: index.html?touch=1
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  const STICK_RADIUS = 56; // cuánto se puede alejar la perilla del centro (px de pantalla)
  const DEADZONE = 10; // movimientos más chicos que esto no cuentan

  function detect() {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(location.search);
    if (p.has('touch')) return p.get('touch') !== '0';
    return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  class Touch {
    constructor(app) {
      this.app = app;
      this.stickId = null;
      this.axis = { x: 0, y: 0 };
      this.visible = null;
      this.ultReady = null;

      const el = document.createElement('div');
      el.id = 'touch';
      el.innerHTML = `
        <div class="t-stick"><div class="t-knob"></div></div>
        <button class="t-btn t-pause" aria-label="Pausa">❚❚</button>
        <button class="t-btn t-ult" aria-label="Definitiva">✦<small>Definitiva</small></button>
        <button class="t-btn t-dash" aria-label="Esquivar">💨<small>Esquivar</small></button>`;
      document.body.appendChild(el);
      const rot = document.createElement('div');
      rot.id = 'rotate';
      rot.innerHTML = '<div class="r-ic">📱</div><div>Girá el celular<br><small>El juego se juega con el teléfono acostado</small></div>';
      document.body.appendChild(rot);
      if (BC.PixelIcons) {
        BC.PixelIcons.replaceIn(el);
        BC.PixelIcons.replaceIn(rot);
      }

      this.el = el;
      this.stick = el.querySelector('.t-stick');
      this.knob = el.querySelector('.t-knob');
      this.ultBtn = el.querySelector('.t-ult');

      // joystick: en cualquier parte que no sea un botón
      el.addEventListener('pointerdown', (e) => {
        app.audio.unlock();
        if (e.target.closest('.t-btn') || this.stickId !== null) return;
        e.preventDefault();
        this.stickId = e.pointerId;
        this.ox = e.clientX;
        this.oy = e.clientY;
        this.stick.style.left = e.clientX + 'px';
        this.stick.style.top = e.clientY + 'px';
        this.stick.classList.add('on');
        this.moveKnob(0, 0);
        try {
          el.setPointerCapture(e.pointerId);
        } catch (err) {
          /* algunos navegadores no lo permiten: igual funciona */
        }
      });
      el.addEventListener('pointermove', (e) => {
        if (e.pointerId !== this.stickId) return;
        e.preventDefault();
        this.moveKnob(e.clientX - this.ox, e.clientY - this.oy);
      });
      const release = (e) => {
        if (e.pointerId !== this.stickId) return;
        this.releaseStick();
      };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);

      // botones: reaccionan al apoyar el dedo (no al soltarlo) para que el dash sea instantáneo
      const press = (sel, fn) => {
        el.querySelector(sel).addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          app.audio.unlock();
          const g = app.game;
          if (g.state !== 'playing' || g.paused) return;
          fn(g);
        });
      };
      press('.t-dash', (g) => (g.input.dash = true));
      press('.t-ult', (g) => (g.input.ult = true));
      press('.t-pause', () => app.setPaused(true));

      // PANTALLA COMPLETA AUTOMÁTICA: los navegadores sólo la permiten después de un toque,
      // así que se activa con el primer toque en cualquier parte, y otra vez al empezar
      // cada partida si se había salido (en el iPhone no existe: hay que "Agregar a inicio").
      const autoFs = () => {
        if (BC.Fullscreen.can() && !BC.Fullscreen.is()) BC.Fullscreen.toggle();
      };
      document.addEventListener('pointerup', autoFs, { once: true });
      app.game.on((type) => {
        if (type === 'runStart') autoFs();
      });

      // que el navegador no haga zoom ni abra menús al mantener apretado
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('blur', () => this.releaseStick());
    }

    moveKnob(dx, dy) {
      const len = Math.hypot(dx, dy);
      const k = len > STICK_RADIUS ? STICK_RADIUS / len : 1;
      this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      if (len < DEADZONE) this.axis = { x: 0, y: 0 };
      else this.axis = { x: dx / len, y: dy / len };
    }

    releaseStick() {
      this.stickId = null;
      this.axis = { x: 0, y: 0 };
      this.stick.classList.remove('on');
    }

    // Se llama en cada cuadro: muestra los controles sólo cuando se puede mover
    update() {
      const app = this.app;
      const g = app.game;
      const show = !app.demo && !!g.run && !g.run.over && g.state === 'playing' && !g.paused && !app.ui.screen;
      if (show !== this.visible) {
        this.visible = show;
        this.el.classList.toggle('show', show);
        if (!show) this.releaseStick();
      }
      if (show && g.player) {
        const u = g.player.ult;
        const ready = !u.active && u.gauge >= g.player.ch.ultimate.gaugeMax;
        if (ready !== this.ultReady) {
          this.ultReady = ready;
          this.ultBtn.classList.toggle('ready', ready);
        }
      }
    }
  }

  // Pantalla completa (Android y tablets; el iPhone no lo permite desde el navegador)
  function canFullscreen() {
    const d = document.documentElement;
    return !!(d.requestFullscreen || d.webkitRequestFullscreen);
  }
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function toggleFullscreen() {
    const d = document.documentElement;
    if (isFullscreen()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    const req = d.requestFullscreen || d.webkitRequestFullscreen;
    const p = req && req.call(d, { navigationUI: 'hide' });
    // ya en pantalla completa, intentamos dejar el teléfono acostado
    const lock = () => {
      try {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      } catch (e) {
        /* no se puede: el aviso de "girá el celular" se encarga */
      }
    };
    if (p && p.then) p.then(lock).catch(() => {});
    else lock();
  }

  BC.Touch = Touch;
  BC.touchMode = detect();
  BC.Fullscreen = { can: canFullscreen, is: isFullscreen, toggle: toggleFullscreen };
})(typeof window !== 'undefined' ? window : globalThis);
