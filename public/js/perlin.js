function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + t * (b - a);
}

function grad(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export default class Perlin {
  constructor(seed) {
    this.p = new Uint8Array(512);
    const source = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) source[i] = i;
    let state = (seed || 20260605) >>> 0;
    const random = function () {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let i = 255; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const temp = source[i];
      source[i] = source[j];
      source[j] = temp;
    }
    for (let i = 0; i < 512; i += 1) this.p[i] = source[i & 255];
  }

  noise3(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);
    const p = this.p;
    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;
    const x1 = lerp(grad(p[AA], xf, yf, zf), grad(p[BA], xf - 1, yf, zf), u);
    const x2 = lerp(grad(p[AB], xf, yf - 1, zf), grad(p[BB], xf - 1, yf - 1, zf), u);
    const y1 = lerp(x1, x2, v);
    const x3 = lerp(grad(p[AA + 1], xf, yf, zf - 1), grad(p[BA + 1], xf - 1, yf, zf - 1), u);
    const x4 = lerp(grad(p[AB + 1], xf, yf - 1, zf - 1), grad(p[BB + 1], xf - 1, yf - 1, zf - 1), u);
    const y2 = lerp(x3, x4, v);
    return lerp(y1, y2, w);
  }

  noise2(x, y) {
    return this.noise3(x, y, 0.5);
  }

  fractal(x, y, octaves, persistence) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let max = 0;
    const count = octaves || 3;
    const persist = persistence === undefined ? 0.5 : persistence;
    for (let i = 0; i < count; i += 1) {
      total += this.noise2(x * frequency, y * frequency) * amplitude;
      max += amplitude;
      amplitude *= persist;
      frequency *= 2;
    }
    return total / (max || 1);
  }
}
