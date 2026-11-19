export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360 / 360;
  const sat = clamp(s, 0, 100) / 100;
  const lig = clamp(l, 0, 100) / 100;
  if (sat === 0) {
    const gray = Math.round(lig * 255);
    return { r: gray, g: gray, b: gray };
  }
  const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
  const p = 2 * lig - q;
  const channel = function (t) {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  return {
    r: Math.round(channel(hue + 1 / 3) * 255),
    g: Math.round(channel(hue) * 255),
    b: Math.round(channel(hue - 1 / 3) * 255)
  };
}

export function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hexToRgb(hex) {
  const value = String(hex || "#000000").replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16) || 0,
    g: parseInt(value.slice(2, 4), 16) || 0,
    b: parseInt(value.slice(4, 6), 16) || 0
  };
}

export function rgbToHex(rgb) {
  const pad = function (n) { return clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0"); };
  return "#" + pad(rgb.r) + pad(rgb.g) + pad(rgb.b);
}

function srgbToLinear(value) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function linearToSrgb(value) {
  const channel = value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return clamp(Math.round(channel * 255), 0, 255);
}

export function rgbToOklab(rgb) {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l1 = Math.cbrt(l);
  const m1 = Math.cbrt(m);
  const s1 = Math.cbrt(s);
  return {
    L: 0.2104542553 * l1 + 0.7936177850 * m1 - 0.0040720468 * s1,
    a: 1.9779984951 * l1 - 2.4285922050 * m1 + 0.4505937099 * s1,
    b: 0.0259040371 * l1 + 0.7827717662 * m1 - 0.8086757660 * s1
  };
}

export function oklabToRgb(lab) {
  const l1 = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m1 = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s1 = lab.L - 0.0894841775 * lab.a - 1.2914855480 * lab.b;
  const l = l1 * l1 * l1;
  const m = m1 * m1 * m1;
  const s = s1 * s1 * s1;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return { r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b) };
}

export function mixOklab(hexA, hexB, t) {
  const a = rgbToOklab(hexToRgb(hexA));
  const b = rgbToOklab(hexToRgb(hexB));
  const ratio = clamp(t, 0, 1);
  return rgbToHex(oklabToRgb({
    L: a.L + (b.L - a.L) * ratio,
    a: a.a + (b.a - a.a) * ratio,
    b: a.b + (b.b - a.b) * ratio
  }));
}

export function breathingLight(base, amplitude, freq, seconds) {
  return base + amplitude * Math.sin(2 * Math.PI * freq * seconds);
}

export function colorAtPhase(hueMin, hueMax, satMin, satMax, lightBase, freq, seconds) {
  const hue = hueMin + (hueMax - hueMin) * (0.5 + 0.5 * Math.sin(2 * Math.PI * freq * seconds * 0.5));
  const sat = (satMin + satMax) / 2;
  const light = clamp(breathingLight(lightBase, 9, freq, seconds), lightBase - 10, lightBase + 10);
  const rgb = hslToRgb(hue, sat, light);
  return { h: Math.round(hue), s: Math.round(sat), l: Math.round(light * 10) / 10, rgb: rgb, hex: rgbToHex(rgb) };
}
