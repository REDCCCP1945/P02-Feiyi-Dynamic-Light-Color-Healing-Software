const store = require("./store");
const audit = require("./audit");
const pad = require("./padService");

const KEYS = ["T", "D", "A", "V", "F", "C"];

function readScores(raw, prefix) {
  const scores = {};
  for (const key of KEYS) {
    const value = raw ? raw[key] : undefined;
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0 || num > 10) {
      return { ok: false, message: (prefix || "测评") + "第" + key + "项须为0-10的整数", field: "scores." + key };
    }
    scores[key] = num;
  }
  return { ok: true, value: scores };
}

function create(ctx) {
  const body = ctx.body || {};
  const parsed = readScores(body.scores, "测评");
  if (!parsed.ok) {
    ctx.fail(400, parsed.message, parsed.field);
    return;
  }
  const scores = parsed.value;
  const computed = pad.compute(scores);
  const record = {
    id: store.id("A"),
    userId: ctx.user.id,
    scores: scores,
    normalized: pad.normalize(scores),
    dominant: pad.dominant(scores),
    padBefore: computed.before,
    padTarget: computed.target,
    probabilities: computed.probabilities,
    method: body.method === "voice" ? "voice" : "scale",
    voiceFeatures: body.voiceFeatures || null,
    createdAt: store.now()
  };
  store.db.assessments.unshift(record);
  store.save();
  audit.write(ctx.user, "测评", "提交情绪测评", record.id, "主导情绪：" + record.dominant.label, ctx.req);
  ctx.ok({ assessment: record });
}

function owned(ctx, id) {
  const record = store.db.assessments.find(function (item) { return item.id === id; });
  if (!record) return { error: "notfound" };
  if (record.userId !== ctx.user.id) return { error: "forbidden" };
  return { record: record };
}

function detail(ctx) {
  const result = owned(ctx, ctx.params[0]);
  if (result.error === "notfound") {
    ctx.fail(404, "测评记录不存在");
    return;
  }
  if (result.error === "forbidden") {
    ctx.fail(403, "只能查看本人的测评记录");
    return;
  }
  ctx.ok({ assessment: result.record });
}

module.exports = { create: create, detail: detail, readScores: readScores, owned: owned };
