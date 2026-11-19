const store = require("./store");
const audit = require("./audit");
const validate = require("./validate");

const DEFAULTS = {
  defaultBreathFreq: 0.12,
  maxBrightness: 70,
  smartMatchDefault: 1,
  retentionDays: 365,
  colorIntensity: 100,
  notice: "欢迎使用动态光色疗愈体验，本软件用于日常放松与文化体验，不提供医学诊断或治疗。"
};

function values() {
  return Object.assign({}, DEFAULTS, store.db.settings || {});
}

function get(ctx) {
  ctx.ok({ settings: values(), defaults: DEFAULTS });
}

function save(ctx) {
  const body = ctx.body || {};
  const freq = validate.decimal(body.defaultBreathFreq, "默认呼吸频率", 0.1, 0.25);
  if (!freq.ok) { ctx.fail(400, freq.message, freq.field); return; }
  const brightness = validate.integer(body.maxBrightness, "亮度上限", 10, 100);
  if (!brightness.ok) { ctx.fail(400, brightness.message, brightness.field); return; }
  const smart = validate.integer(body.smartMatchDefault, "智能匹配默认值", 0, 1);
  if (!smart.ok) { ctx.fail(400, smart.message, smart.field); return; }
  const retention = validate.integer(body.retentionDays, "日志保留天数", 30, 3650);
  if (!retention.ok) { ctx.fail(400, retention.message, retention.field); return; }
  const intensity = validate.integer(body.colorIntensity, "色彩强度", 50, 120);
  if (!intensity.ok) { ctx.fail(400, intensity.message, intensity.field); return; }
  const notice = String(body.notice || "").trim();
  if (notice.length < 10 || notice.length > 200) {
    ctx.fail(400, "提示语须为10-200个字符", "notice");
    return;
  }
  store.db.settings = {
    defaultBreathFreq: freq.value,
    maxBrightness: brightness.value,
    smartMatchDefault: smart.value,
    retentionDays: retention.value,
    colorIntensity: intensity.value,
    notice: notice,
    updatedBy: ctx.user.name,
    updatedAt: store.now()
  };
  store.save();
  audit.write(ctx.user, "设置", "修改系统设置", "全局参数", "亮度上限" + brightness.value + "%，保留" + retention.value + "天", ctx.req);
  ctx.ok({ settings: values() });
}

module.exports = { get: get, save: save, DEFAULTS: DEFAULTS };
