const store = require("./store");
const audit = require("./audit");
const pad = require("./padService");
const assessmentService = require("./assessmentService");
const themeService = require("./themeService");
const recommendService = require("./recommendService");
const validate = require("./validate");

function paramsOfTheme(theme) {
  return {
    hueMin: theme.params.hueMin,
    hueMax: theme.params.hueMax,
    satMin: theme.params.satMin,
    satMax: theme.params.satMax,
    lightMin: theme.params.lightMin,
    lightMax: theme.params.lightMax,
    breathFreq: theme.params.breathFreq,
    fractalDepth: theme.params.fractalDepth,
    particleDensity: theme.params.particleDensity,
    duration: theme.params.duration,
    audioTrack: theme.params.audioTrack
  };
}

function elementSnapshots(ids) {
  return (ids || []).map(function (id) {
    const element = store.db.ichElements.find(function (item) { return item.id === id; });
    if (!element) return null;
    return {
      id: element.id,
      name: element.name,
      category: element.category,
      primaryColor: element.primaryColor,
      secondaryColors: element.secondaryColors,
      emotionTags: element.emotionTags,
      cultureText: element.cultureText,
      technique: element.technique,
      symbolism: element.symbolism,
      source: element.source,
      collectionPlace: element.collectionPlace,
      copyrightStatus: element.copyrightStatus,
      filePath: element.filePath,
      fileType: element.fileType
    };
  }).filter(Boolean);
}

function start(ctx) {
  const body = ctx.body || {};
  const owned = assessmentService.owned(ctx, String(body.assessmentId || ""));
  if (owned.error === "notfound") {
    ctx.fail(404, "测评记录不存在");
    return;
  }
  if (owned.error === "forbidden") {
    ctx.fail(403, "只能使用本人的测评记录");
    return;
  }
  const active = store.db.sessions.find(function (item) {
    return item.userId === ctx.user.id && (item.status === "running" || item.status === "paused") && !item.deleted;
  });
  if (active) {
    ctx.fail(409, "已有进行中的疗愈会话，请先结束或放弃");
    return;
  }
  let theme = null;
  let recipe = null;
  let params = null;
  let name = "";
  let elements = [];
  let targetPAD = owned.record.padTarget;
  if (body.themeId) {
    theme = store.db.themes.find(function (item) { return item.id === body.themeId; });
    if (!theme || theme.status !== "enabled") {
      ctx.fail(404, "疗愈主题不存在或未启用");
      return;
    }
    const allApproved = theme.elementIds.every(function (id) {
      const element = store.db.ichElements.find(function (item) { return item.id === id; });
      return element && element.auditStatus === "approved";
    });
    if (!allApproved) {
      ctx.fail(409, "主题绑定的素材已失效，请选择其他主题");
      return;
    }
    params = paramsOfTheme(theme);
    name = theme.name;
    elements = elementSnapshots(theme.elementIds);
    targetPAD = theme.targetPAD;
  } else if (body.recipeId) {
    recipe = store.db.recipes.find(function (item) { return item.id === body.recipeId && item.userId === ctx.user.id; });
    if (!recipe) {
      ctx.fail(404, "自定义配方不存在");
      return;
    }
    params = recipe.params;
    name = recipe.name;
    elements = elementSnapshots(recipe.elementIds);
  } else {
    ctx.fail(400, "请选择疗愈主题或自定义配方", "themeId");
    return;
  }
  const session = {
    id: store.id("S"),
    code: "SE-" + String(store.db.sessions.length + 1).padStart(4, "0"),
    userId: ctx.user.id,
    userName: ctx.user.name,
    assessmentId: owned.record.id,
    themeId: theme ? theme.id : null,
    themeCode: theme ? theme.code : "CUSTOM",
    recipeId: recipe ? recipe.id : null,
    themeName: name,
    params: params,
    elements: elements,
    targetPAD: targetPAD,
    preScores: owned.record.scores,
    preLoad: pad.loadIndex(owned.record.scores),
    postScores: null,
    postLoad: null,
    improvement: null,
    rating: null,
    note: "",
    status: "running",
    startAt: store.now(),
    endAt: null,
    pausedMs: 0,
    pauseStartedAt: null,
    deleted: false
  };
  store.db.sessions.unshift(session);
  store.save();
  audit.write(ctx.user, "疗愈", "开始会话", session.code, "主题：" + name + "，素材" + elements.length + "个", ctx.req);
  ctx.ok({ session: session });
}

function own(ctx, id) {
  const session = store.db.sessions.find(function (item) { return item.id === id; });
  if (!session || session.deleted) return { error: "notfound" };
  if (session.userId !== ctx.user.id) return { error: "forbidden" };
  return { session: session };
}

function pause(ctx) {
  const result = own(ctx, ctx.params[0]);
  if (result.error) {
    ctx.fail(result.error === "notfound" ? 404 : 403, result.error === "notfound" ? "会话不存在" : "只能操作本人的会话");
    return;
  }
  const session = result.session;
  if (session.status !== "running") {
    ctx.fail(409, "当前会话不在进行中");
    return;
  }
  session.status = "paused";
  session.pauseStartedAt = store.now();
  store.save();
  audit.write(ctx.user, "疗愈", "暂停会话", session.code, "已暂停", ctx.req);
  ctx.ok({ session: session });
}

function resume(ctx) {
  const result = own(ctx, ctx.params[0]);
  if (result.error) {
    ctx.fail(result.error === "notfound" ? 404 : 403, result.error === "notfound" ? "会话不存在" : "只能操作本人的会话");
    return;
  }
  const session = result.session;
  if (session.status !== "paused") {
    ctx.fail(409, "当前会话不在暂停状态");
    return;
  }
  session.pausedMs += Date.now() - new Date(session.pauseStartedAt).getTime();
  session.pauseStartedAt = null;
  session.status = "running";
  store.save();
  audit.write(ctx.user, "疗愈", "继续会话", session.code, "已继续", ctx.req);
  ctx.ok({ session: session });
}

function durationSeconds(session, endAt) {
  let ms = endAt.getTime() - new Date(session.startAt).getTime();
  ms -= session.pausedMs || 0;
  if (session.status === "paused" && session.pauseStartedAt) {
    ms -= endAt.getTime() - new Date(session.pauseStartedAt).getTime();
  }
  return Math.max(0, Math.round(ms / 1000));
}

function complete(ctx) {
  const result = own(ctx, ctx.params[0]);
  if (result.error) {
    ctx.fail(result.error === "notfound" ? 404 : 403, result.error === "notfound" ? "会话不存在" : "只能操作本人的会话");
    return;
  }
  const session = result.session;
  if (session.status !== "running" && session.status !== "paused") {
    ctx.fail(409, "当前会话已结束");
    return;
  }
  const body = ctx.body || {};
  const parsed = assessmentService.readScores(body.postScores, "后测");
  if (!parsed.ok) {
    ctx.fail(400, parsed.message, parsed.field);
    return;
  }
  const rating = validate.integer(body.rating, "主观评分", 1, 5);
  if (!rating.ok) {
    ctx.fail(400, rating.message, rating.field);
    return;
  }
  const note = String(body.note || "").trim();
  if (note.length > 200) {
    ctx.fail(400, "备注不得超过200个字符", "note");
    return;
  }
  const endAt = new Date();
  const duration = durationSeconds(session, endAt);
  if (duration < 60) {
    session.status = "aborted";
    session.endAt = endAt.toISOString();
    session.durationSec = duration;
    session.abortReason = "体验时长不足60秒";
    store.save();
    audit.write(ctx.user, "疗愈", "会话放弃", session.code, "时长" + duration + "秒，未计入趋势", ctx.req);
    ctx.fail(409, "本次体验不足60秒，已按放弃处理，未计入趋势");
    return;
  }
  session.status = "completed";
  session.endAt = endAt.toISOString();
  session.durationSec = duration;
  session.postScores = parsed.value;
  session.postLoad = pad.loadIndex(parsed.value);
  session.improvement = pad.round(session.preLoad - session.postLoad, 1);
  session.rating = rating.value;
  session.note = note;
  if (session.themeId) {
    const feedbackValue = rating.value >= 4 ? 1 : (rating.value <= 2 ? -1 : 0);
    if (feedbackValue !== 0) recommendService.bump(ctx.user.id, session.themeId, feedbackValue);
  }
  store.save();
  audit.write(ctx.user, "疗愈", "完成会话", session.code, "时长" + duration + "秒，改善度" + session.improvement, ctx.req);
  ctx.ok({ session: session });
}

function abort(ctx) {
  const result = own(ctx, ctx.params[0]);
  if (result.error) {
    ctx.fail(result.error === "notfound" ? 404 : 403, result.error === "notfound" ? "会话不存在" : "只能操作本人的会话");
    return;
  }
  const session = result.session;
  if (session.status !== "running" && session.status !== "paused") {
    ctx.fail(409, "当前会话已结束");
    return;
  }
  const endAt = new Date();
  session.status = "aborted";
  session.endAt = endAt.toISOString();
  session.durationSec = durationSeconds(session, endAt);
  session.abortReason = String((ctx.body && ctx.body.reason) || "用户主动放弃").slice(0, 100);
  store.save();
  audit.write(ctx.user, "疗愈", "放弃会话", session.code, session.abortReason, ctx.req);
  ctx.ok({ session: session });
}

function list(ctx) {
  const q = ctx.query;
  const from = q.get("from") || "";
  const to = q.get("to") || "";
  const themeId = q.get("themeId") || "";
  const includeAborted = q.get("includeAborted") === "1";
  let rows = store.db.sessions.filter(function (item) {
    return item.userId === ctx.user.id && !item.deleted;
  });
  if (!includeAborted) rows = rows.filter(function (item) { return item.status === "completed"; });
  if (from) rows = rows.filter(function (item) { return (item.startAt || "").slice(0, 10) >= from; });
  if (to) rows = rows.filter(function (item) { return (item.startAt || "").slice(0, 10) <= to; });
  if (themeId) rows = rows.filter(function (item) { return item.themeId === themeId; });
  rows.sort(function (a, b) { return a.startAt < b.startAt ? 1 : -1; });
  const summary = rows.map(function (item) {
    return {
      id: item.id,
      code: item.code,
      themeName: item.themeName,
      themeCode: item.themeCode,
      startAt: item.startAt,
      endAt: item.endAt,
      durationSec: item.durationSec,
      preLoad: item.preLoad,
      postLoad: item.postLoad,
      improvement: item.improvement,
      rating: item.rating,
      status: item.status
    };
  });
  ctx.ok({ total: summary.length, sessions: summary });
}

function detail(ctx) {
  const result = own(ctx, ctx.params[0]);
  if (result.error) {
    ctx.fail(result.error === "notfound" ? 404 : 403, result.error === "notfound" ? "会话不存在" : "只能查看本人的会话");
    return;
  }
  ctx.ok({ session: result.session });
}

function remove(ctx) {
  const result = own(ctx, ctx.params[0]);
  if (result.error) {
    ctx.fail(result.error === "notfound" ? 404 : 403, result.error === "notfound" ? "会话不存在" : "只能删除本人的会话");
    return;
  }
  result.session.deleted = true;
  store.save();
  audit.write(ctx.user, "疗愈", "删除记录", result.session.code, "软删除", ctx.req);
  ctx.ok({});
}

function validateRecipe(ctx) {
  const body = ctx.body || {};
  const name = validate.text(body.name, "配方名称", 2, 20);
  if (!name.ok) return name;
  const params = themeService.validateParams(body.params);
  if (!params.ok) return params;
  if (!Array.isArray(body.elementIds) || body.elementIds.length < 1 || body.elementIds.length > 2) {
    return { ok: false, message: "请选择1-2个已审核素材", field: "elementIds" };
  }
  for (const id of body.elementIds) {
    const element = store.db.ichElements.find(function (item) { return item.id === id; });
    if (!element || element.auditStatus !== "approved") {
      return { ok: false, message: "只能选择审核通过的素材", field: "elementIds" };
    }
  }
  return {
    ok: true,
    value: {
      name: name.value,
      params: params.value,
      elementIds: body.elementIds.map(String),
      description: String(body.description || "").slice(0, 200)
    }
  };
}

function saveRecipe(ctx) {
  const parsed = validateRecipe(ctx);
  if (!parsed.ok) {
    ctx.fail(400, parsed.message, parsed.field);
    return;
  }
  const recipe = {
    id: store.id("RC"),
    userId: ctx.user.id,
    name: parsed.value.name,
    params: parsed.value.params,
    elementIds: parsed.value.elementIds,
    description: parsed.value.description,
    createdAt: store.now()
  };
  store.db.recipes.unshift(recipe);
  store.save();
  audit.write(ctx.user, "配方", "保存自定义配方", recipe.name, "素材" + recipe.elementIds.length + "个", ctx.req);
  ctx.ok({ recipe: recipe });
}

function listRecipes(ctx) {
  const rows = store.db.recipes.filter(function (item) { return item.userId === ctx.user.id; });
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  ctx.ok({ recipes: rows });
}

module.exports = {
  start: start,
  pause: pause,
  resume: resume,
  complete: complete,
  abort: abort,
  list: list,
  detail: detail,
  remove: remove,
  saveRecipe: saveRecipe,
  listRecipes: listRecipes,
  own: own
};
