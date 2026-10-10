/*
 * Efectos de sonido sintetizados (no hay archivos de audio).
 * Tecla M para silenciar.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  // [tipo de onda, frecuencia inicial, frecuencia final, duración, volumen, ruido]
  const SOUNDS = {
    slash: ['noise', 0, 0, 0.07, 0.25],
    thrust: ['sawtooth', 220, 60, 0.12, 0.18],
    shoot: ['triangle', 900, 500, 0.06, 0.08],
    cast: ['triangle', 500, 900, 0.12, 0.12],
    wind: ['noise', 0, 0, 0.18, 0.12],
    water: ['sine', 300, 600, 0.2, 0.15],
    beam: ['sawtooth', 160, 120, 0.4, 0.08],
    hurt: ['square', 160, 60, 0.15, 0.18],
    kill: ['triangle', 320, 120, 0.08, 0.12],
    coin: ['sine', 1300, 1700, 0.06, 0.07],
    dash: ['noise', 0, 0, 0.1, 0.1],
    slam: ['sine', 120, 40, 0.35, 0.35],
    enemyShot: ['square', 600, 400, 0.05, 0.04],
    charge: ['sawtooth', 120, 260, 0.25, 0.12],
    nova: ['sine', 200, 60, 0.4, 0.2],
    ult: ['sawtooth', 200, 800, 0.6, 0.18],
    clear: ['triangle', 600, 1200, 0.3, 0.15],
    synergy: ['sine', 700, 1400, 0.45, 0.18],
    death: ['sawtooth', 300, 40, 1.0, 0.2],
    victory: ['triangle', 400, 1600, 1.0, 0.2],
    click: ['sine', 800, 900, 0.04, 0.08],
  };

  class Audio {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.last = {};
      this.volume = 0.6;
    }
    unlock() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      try {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        const len = this.ctx.sampleRate * 0.5;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) {
        this.ctx = null;
      }
    }
    play(name) {
      if (this.muted || !this.ctx) return;
      const s = SOUNDS[name];
      if (!s) return;
      const now = this.ctx.currentTime;
      if (this.last[name] && now - this.last[name] < 0.045) return;
      this.last[name] = now;
      const [type, f0, f1, dur, vol] = s;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      gain.connect(this.ctx.destination);
      let src;
      if (type === 'noise') {
        src = this.ctx.createBufferSource();
        src.buffer = this.noise;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 1800;
        src.connect(filt);
        filt.connect(gain);
      } else {
        src = this.ctx.createOscillator();
        src.type = type;
        src.frequency.setValueAtTime(f0, now);
        src.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + dur);
        src.connect(gain);
      }
      src.start(now);
      src.stop(now + dur + 0.02);
    }
  }

  BC.Audio = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
