const store = require("./store");
const pad = require("./padService");
const sessionService = require("./sessionService");

function dayKey(iso) {
  return String(iso || "").slice(0, 10);
}

function daysAgo(days) {
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  return start;
}

function ownCompleted(ctx) {
  return store.db.sessions.filter(function (item) {
    return item.userId === ctx.user.id && !item.deleted && item.status === "completed";
  });
}

function trend(ctx) {
  const days = Number(ctx.query.get("days") || 7);
  if (days !== 7 && days !== 30) {
    ctx.fail(400, "统计窗口仅支持7天或30天", "days");
    return;
  }
  const start = daysAgo(days);
  const rows = ownCompleted(ctx).filter(function (item) {
    return new Date(item.startAt).getTime() >= start.getTime();
  });
  const buckets = {};
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, count: 0, preLoad: 0, postLoad: 0, improvement: 0, minutes: 0 };
  }
  rows.forEach(function (item) {
    const key = dayKey(item.startAt);
    const bucket = buckets[key] || { date: key, count: 0, preLoad: 0, postLoad: 0, improvement: 0, minutes: 0 };
    bucket.count += 1;
    bucket.preLoad += item.preLoad;
    bucket.postLoad += item.postLoad;
    bucket.improvement += item.improvement;
    bucket.minutes += Math.round(item.durationSec / 60);
    buckets[key] = bucket;
  });
  const series = Object.keys(buckets).sort().map(function (key) {
    const item = buckets[key];
    return {
      date: key,
      count: item.count,
      preLoad: item.count ? pad.round(item.preLoad / item.count, 1) : null,
      postLoad: item.count ? pad.round(item.postLoad / item.count, 1) : null,
      improvement: item.count ? pad.round(item.improvement / item.count, 1) : null,
      minutes: item.minutes
    };
  });
  const active = rows.length ? rows : [];
  const preAvg = { T: 0, D: 0, A: 0, V: 0, F: 0, C: 0 };
  const postAvg = { T: 0, D: 0, A: 0, V: 0, F: 0, C: 0 };
  active.forEach(function (item) {
    Object.keys(preAvg).forEach(function (key) {
      preAvg[key] += item.preScores[key];
      postAvg[key] += (item.postScores && item.postScores[key]) || 0;
    });
  });
  Object.keys(preAvg).forEach(function (key) {
    preAvg[key] = active.length ? pad.round(preAvg[key] / active.length, 1) : 0;
    postAvg[key] = active.length ? pad.round(postAvg[key] / active.length, 1) : 0;
  });
  const themeMap = {};
  rows.forEach(function (item) {
    const key = item.themeName;
    themeMap[key] = themeMap[key] || { name: key, count: 0, improvement: 0 };
    themeMap[key].count += 1;
    themeMap[key].improvement += item.improvement;
  });
  const themes = Object.keys(themeMap).map(function (key) {
    return {
      name: key,
      count: themeMap[key].count,
      improvement: pad.round(themeMap[key].improvement / themeMap[key].count, 1)
    };
  }).sort(function (a, b) { return b.count - a.count; });
  const totalImprovement = rows.length
    ? pad.round(rows.reduce(function (sum, item) { return sum + item.improvement; }, 0) / rows.length, 1)
    : 0;
  ctx.ok({
    days: days,
    series: series,
    preAvg: preAvg,
    postAvg: postAvg,
    themes: themes,
    summary: {
      sessions: rows.length,
      minutes: rows.reduce(function (sum, item) { return sum + Math.round(item.durationSec / 60); }, 0),
      averageImprovement: totalImprovement,
      bestImprovement: rows.length ? Math.max.apply(null, rows.map(function (item) { return item.improvement; })) : 0
    }
  });
}

function sessionReport(ctx) {
  const result = sessionService.own(ctx, ctx.params[0]);
  if (result.error) {
    ctx.fail(result.error === "notfound" ? 404 : 403, result.error === "notfound" ? "会话不存在" : "只能查看本人的会话");
    return;
  }
  const session = result.session;
  if (session.status !== "completed") {
    ctx.fail(409, "只有已完成的会话才能生成报告");
    return;
  }
  const assessment = store.db.assessments.find(function (item) { return item.id === session.assessmentId; });
  ctx.ok({
    session: session,
    assessment: assessment || null,
    cultureCards: (session.elements || []).map(function (item) {
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        cultureText: item.cultureText,
        technique: item.technique,
        symbolism: item.symbolism,
        source: item.source,
        collectionPlace: item.collectionPlace,
        copyrightStatus: item.copyrightStatus,
        primaryColor: item.primaryColor
      };
    })
  });
}

function csvCell(value) {
  const text = String(value === null || value === undefined ? "" : value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function exportData(ctx) {
  const format = (ctx.query.get("format") || "csv").toLowerCase();
  const days = Number(ctx.query.get("days") || 30);
  if (["csv", "json"].indexOf(format) < 0) {
    ctx.fail(400, "导出格式仅支持csv或json", "format");
    return;
  }
  const start = daysAgo(days);
  const rows = ownCompleted(ctx).filter(function (item) {
    return new Date(item.startAt).getTime() >= start.getTime();
  }).sort(function (a, b) { return a.startAt < b.startAt ? -1 : 1; });
  if (format === "json") {
    ctx.ok({
      format: "json",
      fileName: "P02-疗愈记录-" + new Date().toISOString().slice(0, 10) + ".json",
      content: JSON.stringify({
        version: "V1.0",
        exportedAt: new Date().toISOString(),
        days: days,
        records: rows.map(function (item) {
          return {
            code: item.code,
            date: dayKey(item.startAt),
            theme: item.themeName,
            durationSec: item.durationSec,
            preLoad: item.preLoad,
            postLoad: item.postLoad,
            improvement: item.improvement,
            rating: item.rating,
            note: item.note
          };
        })
      }, null, 2)
    });
    return;
  }
  const lines = ["记录编号,日期,主题,时长(秒),前测负荷,后测负荷,改善度,主观评分,备注"];
  rows.forEach(function (item) {
    lines.push([
      csvCell(item.code),
      csvCell(dayKey(item.startAt)),
      csvCell(item.themeName),
      csvCell(item.durationSec),
      csvCell(item.preLoad),
      csvCell(item.postLoad),
      csvCell(item.improvement),
      csvCell(item.rating),
      csvCell(item.note)
    ].join(","));
  });
  ctx.ok({
    format: "csv",
    fileName: "P02-疗愈记录-" + new Date().toISOString().slice(0, 10) + ".csv",
    content: "\uFEFF" + lines.join("\r\n")
  });
}

module.exports = { trend: trend, sessionReport: sessionReport, exportData: exportData };
