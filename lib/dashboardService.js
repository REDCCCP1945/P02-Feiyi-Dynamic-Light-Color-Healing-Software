const store = require("./store");
const pad = require("./padService");

function userSummary(ctx) {
  const sessions = store.db.sessions.filter(function (item) {
    return item.userId === ctx.user.id && !item.deleted;
  });
  const completed = sessions.filter(function (item) { return item.status === "completed"; });
  const minutes = completed.reduce(function (sum, item) { return sum + Math.round(item.durationSec / 60); }, 0);
  const avg = completed.length
    ? pad.round(completed.reduce(function (sum, item) { return sum + item.improvement; }, 0) / completed.length, 1)
    : 0;
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekCount = completed.filter(function (item) { return new Date(item.startAt).getTime() >= weekStart; }).length;
  const recent = completed.slice().sort(function (a, b) { return a.startAt < b.startAt ? 1 : -1; }).slice(0, 5).map(function (item) {
    return {
      id: item.id,
      code: item.code,
      themeName: item.themeName,
      startAt: item.startAt,
      durationSec: item.durationSec,
      improvement: item.improvement,
      rating: item.rating
    };
  });
  const recommendation = store.db.recommendations.find(function (item) { return item.userId === ctx.user.id; });
  const suggestions = recommendation ? recommendation.items.slice(0, 3).map(function (item) {
    return { themeId: item.themeId, name: item.name, score: item.score, reason: item.reason };
  }) : [];
  return {
    role: "USER",
    stats: {
      sessions: completed.length,
      minutes: minutes,
      averageImprovement: avg,
      weekCount: weekCount,
      active: sessions.filter(function (item) { return item.status === "running" || item.status === "paused"; }).length
    },
    recent: recent,
    suggestions: suggestions,
    themeCount: store.db.themes.filter(function (item) { return item.status === "enabled"; }).length,
    elementCount: store.db.ichElements.filter(function (item) { return item.auditStatus === "approved"; }).length
  };
}

function expertSummary() {
  const elements = store.db.ichElements;
  const themes = store.db.themes;
  const categories = {};
  elements.forEach(function (item) {
    categories[item.category] = (categories[item.category] || 0) + 1;
  });
  const themeCount = {};
  store.db.sessions.filter(function (item) { return item.status === "completed"; }).forEach(function (item) {
    themeCount[item.themeName] = (themeCount[item.themeName] || 0) + 1;
  });
  return {
    role: "EXPERT",
    stats: {
      elements: elements.length,
      pending: elements.filter(function (item) { return item.auditStatus === "pending"; }).length,
      approved: elements.filter(function (item) { return item.auditStatus === "approved"; }).length,
      rejected: elements.filter(function (item) { return item.auditStatus === "rejected"; }).length,
      themes: themes.length,
      enabledThemes: themes.filter(function (item) { return item.status === "enabled"; }).length,
      sessions: store.db.sessions.filter(function (item) { return item.status === "completed"; }).length
    },
    categories: Object.keys(categories).map(function (key) { return { name: key, count: categories[key] }; }),
    topThemes: Object.keys(themeCount).map(function (key) { return { name: key, count: themeCount[key] }; }).sort(function (a, b) { return b.count - a.count; }).slice(0, 5),
    recentElements: elements.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }).slice(0, 6).map(function (item) {
      return {
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        auditStatus: item.auditStatus,
        createdAt: item.createdAt
      };
    })
  };
}

function adminSummary() {
  const users = store.db.users;
  const elements = store.db.ichElements;
  const logs = store.db.auditLogs;
  const today = new Date().toISOString().slice(0, 10);
  const modules = {};
  logs.forEach(function (item) {
    modules[item.module] = (modules[item.module] || 0) + 1;
  });
  return {
    role: "ADMIN",
    stats: {
      users: users.length,
      activeUsers: users.filter(function (item) { return item.status === "active"; }).length,
      experts: users.filter(function (item) { return item.role === "EXPERT"; }).length,
      pendingElements: elements.filter(function (item) { return item.auditStatus === "pending"; }).length,
      pendingFeedback: store.db.feedbacks.filter(function (item) { return item.status === "pending"; }).length,
      todayLogs: logs.filter(function (item) { return item.createdAt.slice(0, 10) === today; }).length,
      totalLogs: logs.length,
      enabledThemes: store.db.themes.filter(function (item) { return item.status === "enabled"; }).length
    },
    modules: Object.keys(modules).map(function (key) { return { name: key, count: modules[key] }; }).sort(function (a, b) { return b.count - a.count; }),
    recentLogs: logs.slice(0, 8).map(function (item) {
      return {
        id: item.id,
        actorName: item.actorName,
        role: item.role,
        module: item.module,
        action: item.action,
        target: item.target,
        createdAt: item.createdAt
      };
    })
  };
}

function summary(ctx) {
  if (ctx.user.role === "USER") {
    ctx.ok({ dashboard: userSummary(ctx) });
    return;
  }
  if (ctx.user.role === "EXPERT") {
    ctx.ok({ dashboard: expertSummary() });
    return;
  }
  ctx.ok({ dashboard: adminSummary() });
}

module.exports = { summary: summary };
