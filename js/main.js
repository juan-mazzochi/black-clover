/*
 * Arranque del juego: conecta el motor, el dibujo, el teclado, el sonido,
 * los menús y el guardado. También maneja el loop de animación.
 *
 * Modos especiales (agregar al final de la dirección del navegador):
 *   index.html?demo=1   -> el bot juega solo (para mirar)
 */
(function (root) {
  const BC = root.BC;

  class App {
    constructor() {
      this.data = BC.DATA;
      this.save = BC.Save.load();
      this.audio = new BC.Audio();
      this.audio.muted = !!this.save.settings.muted;
      const params = new URLSearchParams(location.search);
      this.autotest = params.has('autotest');
      this.demo = params.has('demo') || this.autotest;
      this.botMove = params.has('botmove'); // (para tests) el bot mueve, las ventanas las maneja una persona
      this.speed = Number(params.get('speed')) || 1;
      this.errors = [];

      this.game = new BC.Game({ save: this.save, audio: this.audio });
      this.game.on((t, p) => this.onGameEvent(t, p));
      this.canvas = document.getElementById('canvas');
      this.wrap = document.getElementById('wrap');
      this.renderer = new BC.Renderer(this.canvas, this.game);
      this.renderer.setPixel(this.save.settings.graphics !== 'clasico');
      this.ui = new BC.UI(this);
      this.input = new BC.Input();
      this.input.onPress((k) => this.onKey(k));
      // celular / tablet: joystick y botones en pantalla
      if (BC.touchMode && !this.demo) {
        document.body.classList.add('touch');
        this.touch = new BC.Touch(this);
      }
      window.addEventListener('resize', () => this.resize());
      // al girar el teléfono el tamaño nuevo llega un poco tarde en algunos navegadores
      window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
      this.canvas.addEventListener('pointerdown', () => this.audio.unlock());
      this.resize();
      // texturas de pergamino para todas las ventanas (css: var(--parch) y var(--parch-card))
      try {
        const css = document.documentElement.style;
        css.setProperty('--parch', 'url(' + BC.Grimoire.parchment(900, 900, 'ventana', 'both') + ')');
        css.setProperty('--parch-card', 'url(' + BC.Grimoire.parchment(320, 440, 'carta', 'both') + ')');
      } catch (e) {
        /* sin textura: se usa el color de papel */
      }

      this.last = performance.now();
      if (this.autotest) {
        // modo de prueba automática: paso fijo con temporizador (funciona sin ventana visible)
        this.fakeNow = 0;
        setInterval(() => {
          this.fakeNow += 1000 / 60;
          this.loop(this.fakeNow, true);
        }, 1000 / 60);
      } else requestAnimationFrame((t) => this.loop(t));

      if (this.demo) this.startDemo();
      else this.ui.mainMenu();
    }

    resize() {
      const d = this.data.config;
      const scale = Math.min(window.innerWidth / d.width, window.innerHeight / d.height);
      this.renderer.resize(scale, window.devicePixelRatio || 1);
      this.wrap.style.width = Math.round(d.width * scale) + 'px';
      this.wrap.style.height = Math.round(d.height * scale) + 'px';
      // las ventanas se escalan junto con el juego. En el celular ocupan toda la
      // pantalla y no se achican tanto, para que la letra se pueda leer
      const ui = this.touch ? Math.min(window.innerWidth / 1000, window.innerHeight / 520) : scale;
      document.documentElement.style.setProperty('--ui-scale', String(Math.max(this.touch ? 0.8 : 0.55, Math.min(1.25, ui))));
    }

    persist() {
      BC.Save.save(this.save);
    }

    resetSave() {
      this.save = BC.Save.reset();
      this.save.settings.muted = this.audio.muted;
      this.persist();
    }

    toggleGraphics() {
      this.save.settings.graphics = this.save.settings.graphics === 'clasico' ? 'pixel' : 'clasico';
      this.renderer.setPixel(this.save.settings.graphics !== 'clasico');
      this.persist();
    }

    toggleMute() {
      this.audio.muted = !this.audio.muted;
      this.save.settings.muted = this.audio.muted;
      this.persist();
    }

    startRun(opts) {
      this.audio.unlock();
      this.game.meta = this.save;
      this.ui.hide();
      this.game.paused = false;
      this.game.startRun(opts);
    }

    startDemo() {
      const ids = Object.keys(this.data.characters);
      this.demoN = (this.demoN || 0) + 1;
      this.game.meta = BC.Save.defaultSave();
      this.game.startRun({ characterId: ids[this.demoN % ids.length], seed: 'DEMO' + this.demoN });
    }

    toMenu() {
      this.game.state = 'idle';
      this.game.run = null;
      this.game.room = null;
      this.game.paused = false;
      this.ui.mainMenu();
    }

    setPaused(v) {
      this.game.paused = v;
      if (v) this.ui.pause();
      else this.ui.hide();
    }

    onGameEvent(type, payload) {
      if (this.demo) {
        if (type === 'runEnd') setTimeout(() => this.startDemo(), 2500);
        return; // el bot decide (ver loop)
      }
      switch (type) {
        case 'reward':
          return this.ui.reward(payload);
        case 'event':
          return this.ui.event(payload);
        case 'eventResult':
          return this.ui.eventResult(payload);
        case 'shop':
          return this.ui.shop(payload);
        case 'rest':
          return this.ui.rest(payload);
        case 'chest':
          return this.ui.chest(payload);
        case 'synergy':
          // primera vez que se activa: queda visible en el Grimorio
          if (BC.Save.discoverSynergy(this.save, payload.id)) {
            this.persist();
            this.game.toast('📖 ¡Nueva sinergia en el Grimorio!', '#ffd76a');
          }
          return;
        case 'runEnd': {
          const result = BC.Save.applyRunResult(this.save, payload, this.data);
          this.save = result.save;
          this.persist();
          setTimeout(() => this.ui.runEnd(payload, result), 1800);
          return;
        }
      }
    }

    onKey(k) {
      this.audio.unlock();
      const g = this.game;
      if (k === 'm') {
        this.toggleMute();
        if (this.ui.screen === 'pause') this.ui.pause();
        return;
      }
      const inRun = g.run && !g.run.over;
      if ((k === 'escape' || k === 'p') && inRun) {
        if (g.state === 'playing') return this.setPaused(!g.paused);
      }
      if ((k === ' ' || k === 'shift') && g.state === 'playing' && !g.paused) g.input.dash = true;
      if (k === 'q' && g.state === 'playing' && !g.paused) g.input.ult = true;
      this.ui.key(k);
    }

    loop(now, fixed) {
      const dt = fixed ? 1 / 60 : Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      const g = this.game;
      try {
        if (g.run && g.state === 'playing' && !g.paused) {
          if (this.demo || this.botMove) {
            const inp = BC.Bot.steer(g);
            g.input.mx = inp.mx;
            g.input.my = inp.my;
            if (inp.dash) g.input.dash = true;
            if (inp.ult && this.demo) g.input.ult = true;
          } else {
            const a = this.touch && this.touch.stickId !== null ? this.touch.axis : this.input.axis();
            g.input.mx = a.x;
            g.input.my = a.y;
          }
        } else if (this.demo && g.run && !g.run.over && g.state !== 'playing') {
          BC.Bot.decide(g);
        }
        // a velocidades altas se simula en varios pasos para no perder precisión
        const steps = Math.max(1, Math.ceil(this.speed));
        for (let i = 0; i < steps; i++) g.update((dt * this.speed) / steps);
        this.renderer.draw();
        if (this.touch) this.touch.update();
      } catch (e) {
        this.reportError(e);
      }
      if (this.autotest) {
        document.title = 'BCTEST state=' + g.state + ' room=' + (g.run ? g.run.nodeId : '-') + ' kills=' + (g.run ? g.run.kills : 0) + ' errors=' + this.errors.length;
      }
      if (!fixed) requestAnimationFrame((t) => this.loop(t));
    }

    reportError(e) {
      const msg = (e && (e.stack || e.message)) || String(e);
      if (this.errors.indexOf(msg) !== -1) return;
      this.errors.push(msg);
      console.error(e);
      const box = document.getElementById('error');
      box.style.display = 'block';
      box.textContent = '⚠ Ocurrió un error (copiá este texto si querés reportarlo):\n\n' + msg;
    }
  }

  window.addEventListener('error', (ev) => {
    if (BC.app) BC.app.reportError(ev.error || ev.message);
  });
  window.addEventListener('load', () => {
    BC.app = new App();
  });
})(window);
