const store = require("./store");
const httpUtil = require("./http");

function write(user, module, action, target, detail, req) {
  const db = store.db;
  const settings = db.settings || {};
  const retentionDays = Number(settings.retentionDays || 365);
  const log = {
    id: store.id("L"),
    userId: user ? user.id : "-",
    actorName: user ? user.name : "访客",
    role: user ? user.role : "-",
    module: module,
    action: action,
    target: target || "",
    detail: detail || "",
    ip: req ? httpUtil.clientIp(req) : "127.0.0.1",
    createdAt: store.now()
  };
  db.auditLogs.unshift(log);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  db.auditLogs = db.auditLogs.filter(function (item) {
    return new Date(item.createdAt).getTime() >= cutoff;
  });
  if (db.auditLogs.length > 3000) db.auditLogs.length = 3000;
  store.save();
  return log;
}

function list(ctx) {
  const q = ctx.query;
  const moduleFilter = q.get("module") || "";
  const roleFilter = q.get("role") || "";
  const from = q.get("from") || "";
  const to = q.get("to") || "";
  const keyword = (q.get("keyword") || "").trim();
  let rows = store.db.auditLogs.slice();
  if (moduleFilter) rows = rows.filter(function (item) { return item.module === moduleFilter; });
  if (roleFilter) rows = rows.filter(function (item) { return item.role === roleFilter; });
  if (from) rows = rows.filter(function (item) { return item.createdAt.slice(0, 10) >= from; });
  if (to) rows = rows.filter(function (item) { return item.createdAt.slice(0, 10) <= to; });
  if (keyword) {
    const k = keyword.toLowerCase();
    rows = rows.filter(function (item) {
      return (item.actorName + item.action + item.target + item.detail).toLowerCase().indexOf(k) >= 0;
    });
  }
  rowGuard(rows);
  ctx.ok({ total: rows.length, logs: rows.slice(0, 300) });
}

function rowGuard(rows) {
  rows.forEach(function (item) {
    if (item.detail && item.detail.length > 160) item.detail = item.detail.slice(0, 160);
  });
}

module.exports = { write: write, list: list };
