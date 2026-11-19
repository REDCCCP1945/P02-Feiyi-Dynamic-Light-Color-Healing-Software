import Perlin from "./perlin.js";
import { colorAtPhase, clamp } from "./colorSpace.js";
import { generate, drawSegments } from "./lsystem.js";

function seeded(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export default class HealingRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.params = null;
    this.elements = [];
    this.images = new Map();
    this.perlin = new Perlin(20260605);
    this.particles = [];
    this.running = false;
    this.raf = 0;
    this.last = 0;
    this.elapsed = 0;
    this.frame = 0;
    this.fps = 60;
    this.fpsFrames = 0;
    this.fpsAt = 0;
    this.audioLevels = [];
    this.reduceMotion = false;
    this.colorState = null;
    this.dpr = window.devicePixelRatio || 1;
  }

  setScene(options) {
    this.params = options.params;
    this.elements = options.elements || [];
    this.reduceMotion = Boolean(options.reduceMotion);
    this.elements.forEach((element) => this.loadImage(element));
    const random = seeded(20260605);
    const count = Math.round((this.params.particleDensity || 40) * 2.2);
    this.particles = [];
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        baseAngle: random() * Math.PI * 2,
        radius: 0.16 + random() * 0.42,
        speed: (0.03 + random() * 0.08) * (random() > 0.5 ? 1 : -1),
        size: 0.8 + random() * 2.4,
        phase: random() * Math.PI * 2,
        drift: 0.4 + random() * 0.9
      });
    }
    this.lsystemCache = new Map();
  }

  loadImage(element) {
    if (this.images.has(element.id)) return;
    if (!element.filePath) return;
    const image = new Image();
    image.onload = () => {
      this.images.set(element.id, image);
    };
    image.onerror = () => {
      this.images.set(element.id, null);
    };
    image.src = element.filePath;
    this.images.set(element.id, null);
  }

  resize() {
    const width = this.canvas.clientWidth || this.canvas.parentElement.clientWidth || 960;
    const height = this.canvas.clientHeight || this.canvas.parentElement.clientHeight || 560;
    this.dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== Math.floor(width * this.dpr) || this.canvas.height !== Math.floor(height * this.dpr)) {
      this.canvas.width = Math.floor(width * this.dpr);
      this.canvas.height = Math.floor(height * this.dpr);
    }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = width;
    this.height = height;
  }

  segmentsFor(depth) {
    const key = String(depth);
    if (this.lsystemCache && this.lsystemCache.has(key)) return this.lsystemCache.get(key);
    const result = generate({
      axiom: "F",
      rules: { F: "F[+F]F[-F][F]" },
      iterations: depth,
      angle: 22,
      step: 4
    });
    if (this.lsystemCache) this.lsystemCache.set(key, result.normalized);
    return result.normalized;
  }

  palette() {
    const colors = [];
    this.elements.forEach(function (element) {
      if (element.primaryColor) colors.push(element.primaryColor);
      (element.secondaryColors || []).forEach(function (color) { colors.push(color); });
    });
    if (colors.length === 0) colors.push("#7fc6b8", "#d9b26a", "#3f7f74");
    return colors;
  }

  drawMotif(element, cx, cy, size, rotation, alpha) {
    const ctx = this.ctx;
    const image = this.images.get(element.id);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.globalAlpha = alpha;
    if (image && image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -size / 2, -size / 2, size, size);
    } else {
      ctx.strokeStyle = element.primaryColor || "#7fc6b8";
      ctx.lineWidth = Math.max(1, size * 0.02);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i += 1) {
        const angle = i * Math.PI / 3;
        ctx.beginPath();
        ctx.ellipse(Math.cos(angle) * size * 0.22, Math.sin(angle) * size * 0.22, size * 0.16, size * 0.07, angle, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawBackground(state, time) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(width, height) * 0.72;
    const base = state.rgb;
    const dark = "rgb(" + Math.round(base.r * 0.16) + "," + Math.round(base.g * 0.16) + "," + Math.round(base.b * 0.18) + ")";
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, "rgba(" + base.r + "," + base.g + "," + base.b + ",0.34)");
    gradient.addColorStop(0.42, "rgba(" + Math.round(base.r * 0.55) + "," + Math.round(base.g * 0.55) + "," + Math.round(base.b * 0.6) + ",0.2)");
    gradient.addColorStop(1, "rgba(4,8,11,0.98)");
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    const glowCount = 3;
    for (let i = 0; i < glowCount; i += 1) {
      const nx = this.perlin.noise3(i * 1.7, time * 0.05, 0.3);
      const ny = this.perlin.noise3(i * 2.3 + 4, time * 0.045, 1.7);
      const gx = cx + nx * width * 0.3;
      const gy = cy + ny * height * 0.28;
      const gr = Math.max(width, height) * (0.24 + i * 0.06);
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      glow.addColorStop(0, "rgba(" + base.r + "," + base.g + "," + base.b + ",0.1)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }
  }

  drawMandala(state, time) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const cx = width / 2;
    const cy = height / 2;
    const minSide = Math.min(width, height);
    const depth = clamp(Math.round(this.params.fractalDepth || 4), 3, 6);
    const elements = this.elements.length ? this.elements : [{ id: "fallback", primaryColor: state.hex, secondaryColors: [] }];
    const palette = this.palette();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let layer = 0; layer < depth; layer += 1) {
      const copies = 5 + layer * 2;
      const radius = minSide * (0.07 + layer * 0.055);
      const direction = layer % 2 === 0 ? 1 : -1;
      const rotation = time * 0.035 * direction * (1 + layer * 0.15);
      const size = minSide * (0.19 - layer * 0.017);
      for (let i = 0; i < copies; i += 1) {
        const angle = rotation + i * Math.PI * 2 / copies;
        const noise = this.perlin.noise3(Math.cos(angle) * 1.6 + layer, Math.sin(angle) * 1.6, time * 0.08);
        const jitter = 1 + noise * (this.reduceMotion ? 0.03 : 0.09);
        const x = cx + Math.cos(angle) * radius * jitter;
        const y = cy + Math.sin(angle) * radius * jitter;
        const element = elements[(i + layer) % elements.length];
        const alpha = 0.16 + 0.05 * Math.sin(time * 0.7 + layer + i);
        this.drawMotif(element, x, y, size, angle + Math.PI / 2, Math.max(0.06, alpha));
      }
    }
    const center = elements[0];
    const breath = 1 + 0.05 * Math.sin(2 * Math.PI * (this.params.breathFreq || 0.1) * time);
    this.drawMotif(center, cx, cy, minSide * 0.44 * breath, time * 0.04, 0.32);
    const segments = this.segmentsFor(depth);
    ctx.globalAlpha = 0.42;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.02);
    drawSegments(ctx, segments, 0, 0, minSide * 0.62 * breath, palette[0] || state.hex, 1.1);
    ctx.restore();
    ctx.globalAlpha = 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-time * 0.015);
    drawSegments(ctx, this.segmentsFor(Math.max(3, depth - 1)), 0, 0, minSide * 0.4, palette[1] || "#d9b26a", 0.9);
    ctx.restore();
    ctx.restore();
  }

  drawRings(state, time) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const cx = width / 2;
    const cy = height / 2;
    const minSide = Math.min(width, height);
    const freq = this.params.breathFreq || 0.1;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i += 1) {
      const phase = 2 * Math.PI * freq * time - i * 0.7;
      const radius = minSide * (0.2 + i * 0.07) * (1 + 0.06 * Math.sin(phase));
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(" + state.rgb.r + "," + state.rgb.g + "," + state.rgb.b + "," + (0.15 - i * 0.03) + ")";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawParticles(state, time) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const cx = width / 2;
    const cy = height / 2;
    const minSide = Math.min(width, height);
    const palette = this.palette();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    this.particles.forEach((particle, index) => {
      const angle = particle.baseAngle + particle.speed * time;
      const noise = this.perlin.noise3(index * 0.13, time * 0.12, particle.drift);
      const radius = (particle.radius + noise * 0.02) * minSide;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.86;
      const pulse = 0.35 + 0.65 * Math.abs(Math.sin(time * 0.8 + particle.phase));
      const color = palette[index % palette.length];
      ctx.globalAlpha = 0.12 + pulse * 0.35;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, particle.size * (0.8 + pulse * 0.6), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawAudioHalo(state) {
    if (!this.audioLevels || this.audioLevels.length === 0) return;
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const cx = width / 2;
    const cy = height / 2;
    const minSide = Math.min(width, height);
    const average = this.audioLevels.reduce(function (sum, value) { return sum + value; }, 0) / this.audioLevels.length / 255;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.arc(cx, cy, minSide * (0.3 + average * 0.08), 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(" + state.rgb.r + "," + state.rgb.g + "," + state.rgb.b + "," + (0.1 + average * 0.25) + ")";
    ctx.lineWidth = 2 + average * 5;
    ctx.stroke();
    ctx.restore();
  }

  drawVignette() {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.28, width / 2, height / 2, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(2,5,7,0.74)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  draw() {
    if (!this.params) return;
    const time = this.elapsed;
    const lightBase = (this.params.lightMin + this.params.lightMax) / 2;
    const state = colorAtPhase(
      this.params.hueMin,
      this.params.hueMax,
      this.params.satMin,
      this.params.satMax,
      lightBase,
      this.params.breathFreq || 0.1,
      time
    );
    this.colorState = state;
    this.drawBackground(state, time);
    this.drawParticles(state, time);
    this.drawMandala(state, time);
    this.drawRings(state, time);
    this.drawAudioHalo(state);
    this.drawVignette();
  }

  loop(now) {
    if (!this.running) return;
    const delta = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    this.elapsed += delta;
    this.frame += 1;
    this.fpsFrames += 1;
    if (!this.fpsAt) this.fpsAt = now;
    if (now - this.fpsAt >= 500) {
      this.fps = Math.round(this.fpsFrames * 1000 / (now - this.fpsAt));
      this.fpsFrames = 0;
      this.fpsAt = now;
    }
    this.resize();
    this.draw();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.fpsAt = 0;
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  pause() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  resume() {
    this.start();
  }

  stop() {
    this.pause();
    this.elapsed = 0;
    this.frame = 0;
  }

  setAudioLevels(levels) {
    this.audioLevels = levels || [];
  }

  stats() {
    return {
      fps: this.fps,
      frame: this.frame,
      elapsed: Math.round(this.elapsed * 10) / 10,
      color: this.colorState
    };
  }
}
