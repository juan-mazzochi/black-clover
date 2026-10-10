/*
 * Teclado: WASD / flechas para moverse, Espacio o Shift para el dash,
 * Esc o P para pausa, M para silenciar.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  class Input {
    constructor() {
      this.keys = new Set();
      this.handlers = {};
      window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
        if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) !== -1) e.preventDefault();
        if (!this.keys.has(k) && this.handlers.press) this.handlers.press(k);
        this.keys.add(k);
      });
      window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
      window.addEventListener('blur', () => this.keys.clear());
    }
    onPress(fn) {
      this.handlers.press = fn;
    }
    axis() {
      const k = this.keys;
      let x = 0;
      let y = 0;
      if (k.has('a') || k.has('arrowleft')) x -= 1;
      if (k.has('d') || k.has('arrowright')) x += 1;
      if (k.has('w') || k.has('arrowup')) y -= 1;
      if (k.has('s') || k.has('arrowdown')) y += 1;
      return { x, y };
    }
  }

  BC.Input = Input;
})(typeof window !== 'undefined' ? window : globalThis);
