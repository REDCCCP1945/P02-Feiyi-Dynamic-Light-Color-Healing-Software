const store = require("./store");
const audit = require("./audit");
const pad = require("./padService");
const assessmentService = require("./assessmentService");

function weightOf(userId, themeId) {
  const found = store.db.cfWeights.find(function (item) {
    return item.userId === userId && item.themeId === themeId;
  });
  return found ? found.weight : 1.0;
}

function decay(userId) {
  store.db.cfWeights.forEach(function (item) {
    if (item.userId === userId) {
      item.weight = Math.max(0.1, Math.min(5.0, item.weight * 0.95));
      item.updatedAt = store.now();
    }
  });
}

function bump(userId, themeId, feedback) {
  let found = store.db.cfWeights.find(function (item) {
    return item.userId === userId && item.themeId === themeId;
  });
  if (!found) {
    found = { userId: userId, themeId: themeId, weight: 1.0, updatedAt: store.now() };
    store.db.cfWeights.push(found);
  }
  found.weight = Math.max(0.1, Math.min(5.0, found.weight + 0.05 * feedback));
  found.updatedAt = store.now();
}

function eligibleThemes() {
  return store.db.themes.filter(function (theme) {
    if (theme.status !== "enabled") return false;
    if (!Array.isArray(theme.elementIds) || theme.elementIds.length === 0) return false;
    return theme.elementIds.every(function (id) {
      const element = store.db.ichElements.find(function (item) { return item.id === id; });
      return element && element.auditStatus === "approved";
    });
  });
}

function reasonFor(assessment, theme, prox, weight) {
  const dominant = assessment.dominant.label;
  const d = pad.round(1 / prox - 1, 3);
  return "主导情绪为" + dominant + "，当前目标PAD与主题目标的距离为" + d + "，接近度" + pad.round(prox, 3) + "，协同权重" + pad.round(weight, 2);
}

function create(ctx) {
  const body = ctx.body || {};
  const owned = assessmentService.owned(ctx, String(body.assessmentId || ""));
  if (owned.error === "notfound") {
    ctx.fail(404, "测评记录不存在");
    return;
  }
  if (owned.error === "forbidden") {
    ctx.fail(403, "只能依据本人的测评获得推荐");
    return;
  }
  const smart = body.smart === undefined ? true : Boolean(body.smart);
  const themes = eligibleThemes();
  if (themes.length === 0) {
    ctx.fail(409, "当前没有已启用的疗愈主题，请联系内容管理员");
    return;
  }
  decay(ctx.user.id);
  let items = themes.map(function (theme) {
    const prox = 1 / (1 + pad.distance(owned.record.padTarget, theme.targetPAD));
    const weight = weightOf(ctx.user.id, theme.id);
    const score = smart ? 0.6 * prox + 0.4 * (weight / 5) : 0;
    const firstElement = store.db.ichElements.find(function (item) {
      return item.id === theme.elementIds[0];
    });
    return {
      themeId: theme.id,
      code: theme.code,
      name: theme.name,
      description: theme.description,
      targetPAD: theme.targetPAD,
      params: theme.params,
      elementIds: theme.elementIds,
      cover: firstElement ? firstElement.filePath : "",
      primaryColor: firstElement ? firstElement.primaryColor : "#7fc6b8",
      score: pad.round(score, 4),
      proximity: pad.round(prox, 4),
      cfWeight: pad.round(weight, 2),
      reason: smart ? reasonFor(owned.record, theme, prox, weight) : "已关闭智能匹配，可手动选择主题"
    };
  });
  if (smart) {
    items.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.code < b.code ? -1 : 1;
    });
    items = items.slice(0, 3);
  } else {
    items.sort(function (a, b) { return a.code < b.code ? -1 : 1; });
  }
  const record = {
    id: store.id("R"),
    userId: ctx.user.id,
    assessmentId: owned.record.id,
    smart: smart,
    items: items,
    createdAt: store.now()
  };
  store.db.recommendations.unshift(record);
  store.save();
  audit.write(ctx.user, "推荐", smart ? "生成智能推荐" : "浏览主题列表", record.id, "候选" + themes.length + "个，返回" + items.length + "个", ctx.req);
  ctx.ok({ recommendation: record });
}

function detail(ctx) {
  const record = store.db.recommendations.find(function (item) { return item.id === ctx.params[0]; });
  if (!record) {
    ctx.fail(404, "推荐记录不存在");
    return;
  }
  if (record.userId !== ctx.user.id) {
    ctx.fail(403, "只能查看本人的推荐记录");
    return;
  }
  ctx.ok({ recommendation: record });
}

module.exports = {
  create: create,
  detail: detail,
  bump: bump,
  weightOf: weightOf,
  eligibleThemes: eligibleThemes
};
