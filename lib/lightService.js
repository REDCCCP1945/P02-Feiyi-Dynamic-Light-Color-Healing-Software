const store = require("./store");
const audit = require("./audit");
const sessionService = require("./sessionService");
const validate = require("./validate");

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360 / 360;
  const sat = s / 100;
  const lig = l / 100;
  if (sat === 0) {
    const gray = Math.round(lig * 255);
    return { r: gray, g: gray, b: gray };
  }
  const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
  const p = 2 * lig - q;
  function channel(t) {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  }
  return {
    r: Math.round(channel(hue + 1 / 3) * 255),
    g: Math.round(channel(hue) * 255),
    b: Math.round(channel(hue - 1 / 3) * 255)
  };
}

function frame(ctx) {
  const sessionId = ctx.query.get("sessionId") || "";
  const result = sessionService.own(ctx, sessionId);
  if (result.error) {
    ctx.fail(result.error === "notfound" ? 404 : 403, result.error === "notfound" ? "会话不存在" : "只能为本人会话生成指令");
    return;
  }
  const session = result.session;
  const params = session.params;
  const settings = store.db.settings || {};
  const maxBrightness = Number(settings.maxBrightness || 70);
  const intensity = Number(settings.colorIntensity || 100) / 100;
  const hue = Math.round((params.hueMin + params.hueMax) / 2);
  const sat = Math.round((params.satMin + params.satMax) / 2);
  const base = (params.lightMin + params.lightMax) / 2;
  const phase = 2 * Math.PI * params.breathFreq * (Date.now() / 1000);
  const light = Math.max(params.lightMin, Math.min(params.lightMax, base + 0.15 * 100 * 0.5 * Math.sin(phase) * intensity));
  const rgb = hslToRgb(hue, sat, light);
  const brightnessParam = ctx.query.get("brightness");
  const requested = brightnessParam === null ? Math.round(light / 100 * maxBrightness) : Number(brightnessParam);
  const brightness = Math.max(1, Math.min(maxBrightness, Number.isFinite(requested) ? requested : maxBrightness));
  const device = String(ctx.query.get("device") || "LAMP-01").slice(0, 32);
  const transitionParam = Number(ctx.query.get("transition") || 1200);
  const transitionMs = Math.max(800, Math.min(3000, Number.isFinite(transitionParam) ? transitionParam : 1200));
  const frameData = {
    header: "IHTP",
    version: 1,
    timestamp: new Date().toISOString(),
    action: "setColor",
    devices: [device],
    payload: {
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      h: hue,
      s: sat,
      l: Math.round(light * 10) / 10,
      brightness: brightness,
      transitionMs: transitionMs
    },
    source: {
      sessionCode: session.code,
      themeName: session.themeName,
      breathFreq: params.breathFreq,
      maxBrightness: maxBrightness
    }
  };
  ctx.ok({
    frame: frameData,
    explanation: "色相取主题区间中点" + hue + "°，饱和度" + sat + "%，明度按L(t)=L_base+0.15·sin(2πft)计算后为" + Math.round(light * 10) / 10 + "%，亮度按系统上限" + maxBrightness + "%折算为" + brightness + "。"
  });
}

function exportFrame(ctx) {
  const body = ctx.body || {};
  const frameData = body.frame;
  if (!frameData || frameData.header !== "IHTP" || !frameData.payload) {
    ctx.fail(400, "灯光指令格式不正确", "frame");
    return;
  }
  const payload = frameData.payload;
  const numeric = ["r", "g", "b", "h", "s", "l", "brightness", "transitionMs"];
  for (const key of numeric) {
    if (!Number.isFinite(Number(payload[key]))) {
      ctx.fail(400, "灯光指令字段" + key + "不是有效数字", "frame");
      return;
    }
  }
  const maxBrightness = Number((store.db.settings || {}).maxBrightness || 70);
  if (Number(payload.brightness) > maxBrightness) {
    ctx.fail(400, "亮度超过系统上限" + maxBrightness + "%", "brightness");
    return;
  }
  const exported = Object.assign({}, frameData, { exportedAt: new Date().toISOString() });
  audit.write(ctx.user, "灯光", "导出灯光指令", String(frameData.source ? frameData.source.sessionCode : "-"), "亮度" + payload.brightness + "%，设备" + (frameData.devices || []).join(","), ctx.req);
  ctx.ok({ frame: exported, fileName: "IHTP-" + Date.now() + ".json" });
}

module.exports = { frame: frame, exportFrame: exportFrame, hslToRgb: hslToRgb };
