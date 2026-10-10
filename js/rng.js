/*
 * Generador de números aleatorios con semilla (seed).
 * Misma semilla => mismos resultados. Así una run se puede repetir.
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  // Convierte un texto en un número (hash xmur3)
  function hashString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  // Generador mulberry32: rápido y suficiente para juegos
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class RNG {
    constructor(seed) {
      this.seed = String(seed);
      this._next = mulberry32(hashString(this.seed));
    }
    float() {
      return this._next();
    }
    range(min, max) {
      return min + (max - min) * this._next();
    }
    // entero entre min y max (ambos incluidos)
    int(min, max) {
      return Math.floor(min + (max - min + 1) * this._next());
    }
    chance(p) {
      return this._next() < p;
    }
    pick(arr) {
      return arr[Math.floor(this._next() * arr.length)];
    }
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this._next() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    }
    // items: [{..., weight}] o usar getWeight(item)
    weighted(items, getWeight) {
      const w = getWeight || ((it) => it.weight);
      let total = 0;
      for (const it of items) total += Math.max(0, w(it));
      if (total <= 0) return null;
      let r = this._next() * total;
      for (const it of items) {
        r -= Math.max(0, w(it));
        if (r < 0) return it;
      }
      return items[items.length - 1];
    }
    // Un generador "hijo" independiente pero determinístico
    fork(label) {
      return new RNG(this.seed + '::' + label);
    }
  }

  // Semilla legible al azar (para cuando el jugador no escribe una)
  function randomSeed() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  BC.RNG = RNG;
  BC.randomSeed = randomSeed;
  BC.hashString = hashString;
})(typeof window !== 'undefined' ? window : globalThis);
