const store = require("./store");
const audit = require("./audit");
const validate = require("./validate");

const AUDIO_TRACKS = ["guzheng", "bianzhong", "chiba", "rain"];
const AUDIO_NAMES = { guzheng: "古琴", bianzhong: "编钟", chiba: "尺八", rain: "雨声" };

function validateParams(raw) {
  const params = raw || {};
  const fields = [
    ["hueMin", "色相下限", 0, 360],
    ["hueMax", "色相上限", 0, 360],
    ["satMin", "饱和度下限", 20, 80],
    ["satMax", "饱和度上限", 20, 80],
    ["lightMin", "明度下限", 30, 80],
    ["lightMax", "明度上限", 30, 80],
    ["breathFreq", "呼吸频率", 0.1, 0.25],
    ["fractalDepth", "分形层级", 3, 6],
    ["particleDensity", "粒子密度", 0, 100],
    ["duration", "建议时长", 5, 60]
  ];
  const out = {};
  for (const item of fields) {
    const result = item[0] === "breathFreq"
      ? validate.decimal(params[item[0]], item[1], item[2], item[3])
      : validate.integer(params[item[0]], item[1], item[2], item[3]);
    if (!result.ok) return result;
    out[item[0]] = result.value;
  }
  if (out.hueMin > out.hueMax) return { ok: false, message: "色相下限不能大于上限", field: "params.hueMin" };
  if (out.satMin > out.satMax) return { ok: false, message: "饱和度下限不能大于上限", field: "params.satMin" };
  if (out.lightMin > out.lightMax) return { ok: false, message: "明度下限不能大于上限", field: "params.lightMin" };
  const audio = validate.oneOf(params.audioTrack, "音轨", AUDIO_TRACKS);
  if (!audio.ok) return audio;
  out.audioTrack = audio.value;
  return { ok: true, value: out };
}

function snapshot(element) {
  return {
    id: element.id,
    name: element.name,
    category: element.category,
    primaryColor: element.primaryColor,
    secondaryColors: element.secondaryColors,
    emotionTags: element.emotionTags,
    cultureText: element.cultureText,
    filePath: element.filePath,
    fileType: element.fileType
  };
}

function enrich(theme) {
  const elements = (theme.elementIds || []).map(function (id) {
    const found = store.db.ichElements.find(function (item) { return item.id === id; });
    return found ? snapshot(found) : { id: id, name: "已移除素材", category: "其他", primaryColor: "#666666", secondaryColors: [], emotionTags: [], cultureText: "", filePath: "", fileType: "SVG" };
  });
  return Object.assign({}, theme, { elements: elements, audioName: AUDIO_NAMES[theme.params.audioTrack] || "" });
}

function list(ctx) {
  const q = ctx.query;
  const keyword = (q.get("keyword") || "").trim().toLowerCase();
  const status = q.get("status") || "";
  let rows = store.db.themes.slice();
  if (ctx.user.role === "USER") rows = rows.filter(function (item) { return item.status === "enabled"; });
  if (status) rows = rows.filter(function (item) { return item.status === status; });
  if (keyword) {
    rows = rows.filter(function (item) {
      return (item.name + item.description + item.code).toLowerCase().indexOf(keyword) >= 0;
    });
  }
  rows.sort(function (a, b) { return a.code < b.code ? -1 : 1; });
  ctx.ok({ total: rows.length, themes: rows.map(enrich), audioTracks: AUDIO_TRACKS });
}

function detail(ctx) {
  const theme = store.db.themes.find(function (item) { return item.id === ctx.params[0]; });
  if (!theme) {
    ctx.fail(404, "疗愈主题不存在");
    return;
  }
  if (ctx.user.role === "USER" && theme.status !== "enabled") {
    ctx.fail(404, "疗愈主题不存在");
    return;
  }
  ctx.ok({ theme: enrich(theme), audioTracks: AUDIO_TRACKS });
}

function checkElements(elementIds) {
  if (!Array.isArray(elementIds) || elementIds.length < 1) {
    return { ok: false, message: "请至少选择一个已审核素材", field: "elementIds" };
  }
  const ids = elementIds.map(function (id) { return String(id); });
  for (const id of ids) {
    const element = store.db.ichElements.find(function (item) { return item.id === id; });
    if (!element) return { ok: false, message: "所选素材不存在", field: "elementIds" };
    if (element.auditStatus !== "approved") return { ok: false, message: "只能绑定审核通过的素材", field: "elementIds" };
  }
  return { ok: true, value: ids };
}

function parsePAD(raw) {
  const pad = raw || {};
  const p = validate.decimal(pad.p, "愉悦度", -1, 1);
  if (!p.ok) return p;
  const a = validate.decimal(pad.a, "唤醒度", -1, 1);
  if (!a.ok) return a;
  const d = validate.decimal(pad.d, "优势度", -1, 1);
  if (!d.ok) return d;
  return { ok: true, value: { p: p.value, a: a.value, d: d.value } };
}

function parseBody(ctx) {
  const body = ctx.body || {};
  const name = validate.text(body.name, "主题名称", 2, 20);
  if (!name.ok) return name;
  const desc = validate.text(body.description, "主题说明", 10, 300);
  if (!desc.ok) return desc;
  const elements = checkElements(body.elementIds);
  if (!elements.ok) return elements;
  const pad = parsePAD(body.targetPAD);
  if (!pad.ok) return pad;
  const params = validateParams(body.params);
  if (!params.ok) return params;
  const status = validate.oneOf(body.status || "draft", "主题状态", ["draft", "enabled", "disabled"]);
  if (!status.ok) return status;
  return {
    ok: true,
    value: {
      name: name.value,
      description: desc.value,
      elementIds: elements.value,
      targetPAD: pad.value,
      params: params.value,
      status: status.value
    }
  };
}

function create(ctx) {
  const parsed = parseBody(ctx);
  if (!parsed.ok) {
    ctx.fail(400, parsed.message, parsed.field);
    return;
  }
  const data = parsed.value;
  if (data.status === "enabled" && data.elementIds.length === 0) {
    ctx.fail(400, "启用主题前须绑定审核通过的素材", "elementIds");
    return;
  }
  const theme = {
    id: store.id("TH"),
    code: "TH-" + String(store.db.themes.length + 1).padStart(3, "0"),
    name: data.name,
    description: data.description,
    elementIds: data.elementIds,
    targetPAD: data.targetPAD,
    params: data.params,
    status: data.status,
    createdBy: ctx.user.id,
    createdByName: ctx.user.name,
    createdAt: store.now(),
    updatedAt: store.now()
  };
  store.db.themes.push(theme);
  store.save();
  audit.write(ctx.user, "主题", "新建主题", theme.code + " " + theme.name, "状态：" + theme.status, ctx.req);
  ctx.ok({ theme: enrich(theme) });
}

function update(ctx) {
  const theme = store.db.themes.find(function (item) { return item.id === ctx.params[0]; });
  if (!theme) {
    ctx.fail(404, "疗愈主题不存在");
    return;
  }
  const parsed = parseBody(ctx);
  if (!parsed.ok) {
    ctx.fail(400, parsed.message, parsed.field);
    return;
  }
  const data = parsed.value;
  theme.name = data.name;
  theme.description = data.description;
  theme.elementIds = data.elementIds;
  theme.targetPAD = data.targetPAD;
  theme.params = data.params;
  theme.status = data.status;
  theme.updatedAt = store.now();
  theme.updatedBy = ctx.user.name;
  store.save();
  audit.write(ctx.user, "主题", "编辑主题", theme.code + " " + theme.name, "状态：" + theme.status, ctx.req);
  ctx.ok({ theme: enrich(theme) });
}

function toggle(ctx) {
  const theme = store.db.themes.find(function (item) { return item.id === ctx.params[0]; });
  if (!theme) {
    ctx.fail(404, "疗愈主题不存在");
    return;
  }
  if (theme.status === "enabled") {
    theme.status = "disabled";
  } else {
    const check = checkElements(theme.elementIds);
    if (!check.ok) {
      ctx.fail(400, "启用前须确保主题绑定的素材均已审核通过", "elementIds");
      return;
    }
    theme.status = "enabled";
  }
  theme.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "主题", theme.status === "enabled" ? "启用主题" : "停用主题", theme.code + " " + theme.name, "", ctx.req);
  ctx.ok({ theme: enrich(theme) });
}

module.exports = {
  AUDIO_TRACKS: AUDIO_TRACKS,
  AUDIO_NAMES: AUDIO_NAMES,
  list: list,
  detail: detail,
  create: create,
  update: update,
  toggle: toggle,
  validateParams: validateParams,
  enrich: enrich
};
