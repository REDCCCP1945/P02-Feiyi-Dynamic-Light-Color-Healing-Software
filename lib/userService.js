const store = require("./store");
const audit = require("./audit");
const auth = require("./auth");
const validate = require("./validate");

function list(ctx) {
  const rows = store.db.users.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; }).map(function (item) {
    return {
      id: item.id,
      username: item.username,
      name: item.name,
      role: item.role,
      status: item.status,
      phone: item.phone || "",
      createdAt: item.createdAt,
      lastLoginAt: item.lastLoginAt || ""
    };
  });
  ctx.ok({ total: rows.length, users: rows });
}

function create(ctx) {
  const body = ctx.body || {};
  const username = String(body.username || "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_]{3,19}$/.test(username)) {
    ctx.fail(400, "用户名须为4-20位，以字母开头，可含字母、数字和下划线", "username");
    return;
  }
  if (store.db.users.some(function (item) { return item.username.toLowerCase() === username.toLowerCase(); })) {
    ctx.fail(409, "用户名已存在", "username");
    return;
  }
  const password = String(body.password || "");
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/.test(password)) {
    ctx.fail(400, "密码须为8-32位，且同时包含字母和数字", "password");
    return;
  }
  const name = validate.text(body.name, "姓名", 2, 20);
  if (!name.ok) { ctx.fail(400, name.message, name.field); return; }
  const role = validate.oneOf(body.role, "角色", ["USER", "EXPERT", "ADMIN"]);
  if (!role.ok) { ctx.fail(400, role.message, role.field); return; }
  const pair = auth.hashPassword(password);
  const user = {
    id: store.id("U"),
    username: username,
    passwordHash: pair.hash,
    salt: pair.salt,
    name: name.value,
    phone: "",
    role: role.value,
    status: "active",
    preferences: { sound: true, reduceMotion: false, defaultDuration: 20 },
    createdAt: store.now()
  };
  store.db.users.push(user);
  store.save();
  audit.write(ctx.user, "用户", "新建账号", user.username, "角色：" + user.role, ctx.req);
  ctx.ok({ user: auth.publicUser(user) });
}

function toggle(ctx) {
  const user = store.db.users.find(function (item) { return item.id === ctx.params[0]; });
  if (!user) {
    ctx.fail(404, "用户不存在");
    return;
  }
  if (user.id === ctx.user.id) {
    ctx.fail(400, "不能禁用当前登录账号", "status");
    return;
  }
  user.status = user.status === "active" ? "disabled" : "active";
  store.save();
  audit.write(ctx.user, "用户", user.status === "active" ? "启用账号" : "禁用账号", user.username, "", ctx.req);
  ctx.ok({ user: auth.publicUser(user) });
}

function reset(ctx) {
  const user = store.db.users.find(function (item) { return item.id === ctx.params[0]; });
  if (!user) {
    ctx.fail(404, "用户不存在");
    return;
  }
  const password = String((ctx.body || {}).password || "");
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/.test(password)) {
    ctx.fail(400, "密码须为8-32位，且同时包含字母和数字", "password");
    return;
  }
  const pair = auth.hashPassword(password);
  user.passwordHash = pair.hash;
  user.salt = pair.salt;
  store.save();
  audit.write(ctx.user, "用户", "重置密码", user.username, "管理员重置", ctx.req);
  ctx.ok({});
}

function profile(ctx) {
  const user = store.db.users.find(function (item) { return item.id === ctx.user.id; });
  const sessions = store.db.sessions.filter(function (item) {
    return item.userId === ctx.user.id && item.status === "completed" && !item.deleted;
  });
  ctx.ok({
    user: auth.publicUser(user),
    stats: {
      sessions: sessions.length,
      minutes: sessions.reduce(function (sum, item) { return sum + Math.round(item.durationSec / 60); }, 0)
    }
  });
}

function updateProfile(ctx) {
  const user = store.db.users.find(function (item) { return item.id === ctx.user.id; });
  const body = ctx.body || {};
  const name = validate.text(body.name, "姓名", 2, 20);
  if (!name.ok) { ctx.fail(400, name.message, name.field); return; }
  const phone = String(body.phone || "").trim();
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
    ctx.fail(400, "手机号格式不正确", "phone");
    return;
  }
  const prefs = body.preferences || {};
  user.name = name.value;
  user.phone = phone;
  user.preferences = {
    sound: prefs.sound === undefined ? true : Boolean(prefs.sound),
    reduceMotion: Boolean(prefs.reduceMotion),
    defaultDuration: Math.max(5, Math.min(60, Number(prefs.defaultDuration) || 20))
  };
  store.save();
  audit.write(ctx.user, "账号", "修改资料", user.username, "更新姓名、联系方式与偏好", ctx.req);
  ctx.ok({ user: auth.publicUser(user) });
}

function changePassword(ctx) {
  const user = store.db.users.find(function (item) { return item.id === ctx.user.id; });
  const body = ctx.body || {};
  const oldPassword = String(body.oldPassword || "");
  const newPassword = String(body.newPassword || "");
  if (!auth.verifyPassword(oldPassword, user.salt, user.passwordHash)) {
    ctx.fail(400, "原密码不正确", "oldPassword");
    return;
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/.test(newPassword)) {
    ctx.fail(400, "新密码须为8-32位，且同时包含字母和数字", "newPassword");
    return;
  }
  if (newPassword === oldPassword) {
    ctx.fail(400, "新密码不能与原密码相同", "newPassword");
    return;
  }
  const pair = auth.hashPassword(newPassword);
  user.passwordHash = pair.hash;
  user.salt = pair.salt;
  store.save();
  audit.write(ctx.user, "账号", "修改密码", user.username, "本人修改", ctx.req);
  ctx.ok({});
}

module.exports = {
  list: list,
  create: create,
  toggle: toggle,
  reset: reset,
  profile: profile,
  updateProfile: updateProfile,
  changePassword: changePassword
};
