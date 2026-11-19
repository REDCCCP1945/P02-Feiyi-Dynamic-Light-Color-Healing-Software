const store = require("./store");
const audit = require("./audit");
const validate = require("./validate");

const TYPES = ["功能建议", "内容纠错", "体验问题", "投诉"];

function list(ctx) {
  const q = ctx.query;
  const status = q.get("status") || "";
  let rows = store.db.feedbacks.slice();
  if (ctx.user.role !== "ADMIN") {
    rows = rows.filter(function (item) { return item.userId === ctx.user.id; });
  }
  if (status) rows = rows.filter(function (item) { return item.status === status; });
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  ctx.ok({ total: rows.length, feedbacks: rows, types: TYPES });
}

function create(ctx) {
  const body = ctx.body || {};
  const type = validate.oneOf(body.type, "反馈类型", TYPES);
  if (!type.ok) { ctx.fail(400, type.message, type.field); return; }
  const content = validate.text(body.content, "反馈内容", 5, 500);
  if (!content.ok) { ctx.fail(400, content.message, content.field); return; }
  const record = {
    id: store.id("F"),
    userId: ctx.user.id,
    userName: ctx.user.name,
    role: ctx.user.role,
    type: type.value,
    content: content.value,
    status: "pending",
    reply: "",
    repliedBy: "",
    repliedAt: "",
    createdAt: store.now()
  };
  store.db.feedbacks.unshift(record);
  store.save();
  audit.write(ctx.user, "反馈", "提交反馈", record.id, type.value, ctx.req);
  ctx.ok({ feedback: record });
}

function reply(ctx) {
  const record = store.db.feedbacks.find(function (item) { return item.id === ctx.params[0]; });
  if (!record) {
    ctx.fail(404, "反馈不存在");
    return;
  }
  const text = validate.text((ctx.body || {}).reply, "回复内容", 2, 300);
  if (!text.ok) { ctx.fail(400, text.message, text.field); return; }
  record.reply = text.value;
  record.status = "resolved";
  record.repliedBy = ctx.user.name;
  record.repliedAt = store.now();
  store.save();
  audit.write(ctx.user, "反馈", "处理反馈", record.id, "已回复", ctx.req);
  ctx.ok({ feedback: record });
}

module.exports = { list: list, create: create, reply: reply, TYPES: TYPES };
