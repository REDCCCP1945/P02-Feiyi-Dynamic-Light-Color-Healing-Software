const crypto = require("crypto");
const store = require("./store");
const audit = require("./audit");

const failures = new Map();

function hashPassword(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), useSalt, 64).toString("hex");
  return { salt: useSalt, hash: hash };
}

function verifyPassword(password, salt, hash) {
  const computed = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function signToken(user) {
  const payload = { uid: user.id, role: user.role, exp: Date.now() + 12 * 60 * 60 * 1000 };
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", store.getSecret()).update(body).digest("hex");
  return body + "." + sig;
}

function parseToken(token) {
  if (!token || token.indexOf(".") < 0) return null;
  const parts = token.split(".");
  const body = parts[0];
  const sig = parts[1];
  const expect = crypto.createHmac("sha256", store.getSecret()).update(body).digest("hex");
  if (sig !== expect) return null;
  let payload = null;
  try {
    payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch (e) {
    return null;
  }
  if (!payload || !payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

function fromRequest(req) {
  const header = req.headers["authorization"] || "";
  if (header.indexOf("Bearer ") !== 0) return null;
  const payload = parseToken(header.slice(7).trim());
  if (!payload) return null;
  const user = store.db.users.find(function (item) { return item.id === payload.uid; });
  if (!user || user.status !== "active") return null;
  return { id: user.id, username: user.username, name: user.name, role: user.role };
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    phone: user.phone || "",
    status: user.status,
    preferences: user.preferences || {},
    createdAt: user.createdAt
  };
}

function register(ctx) {
  const body = ctx.body || {};
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const confirm = String(body.confirmPassword || "");
  const name = String(body.name || "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_]{3,19}$/.test(username)) {
    ctx.fail(400, "用户名须为4-20位，以字母开头，可含字母、数字和下划线", "username");
    return;
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/.test(password)) {
    ctx.fail(400, "密码须为8-32位，且同时包含字母和数字", "password");
    return;
  }
  if (password !== confirm) {
    ctx.fail(400, "两次输入的密码不一致", "confirmPassword");
    return;
  }
  if (name.length < 2 || name.length > 20) {
    ctx.fail(400, "姓名须为2-20个字符", "name");
    return;
  }
  const exists = store.db.users.some(function (item) { return item.username.toLowerCase() === username.toLowerCase(); });
  if (exists) {
    ctx.fail(409, "用户名已存在，请更换", "username");
    return;
  }
  const pair = hashPassword(password);
  const user = {
    id: store.id("U"),
    username: username,
    passwordHash: pair.hash,
    salt: pair.salt,
    name: name,
    phone: "",
    role: "USER",
    status: "active",
    preferences: { sound: true, reduceMotion: false, defaultDuration: 20 },
    createdAt: store.now()
  };
  store.db.users.push(user);
  store.save();
  audit.write({ id: user.id, name: user.name, role: user.role }, "账号", "注册", user.username, "新用户注册", ctx.req);
  ctx.ok({ user: publicUser(user) });
}

function login(ctx) {
  const body = ctx.body || {};
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) {
    ctx.fail(400, "请输入用户名和密码", !username ? "username" : "password");
    return;
  }
  const key = username.toLowerCase();
  const record = failures.get(key) || { count: 0, lockedUntil: 0, first: 0 };
  if (record.lockedUntil > Date.now()) {
    const minutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    ctx.fail(423, "账号暂时锁定，请" + minutes + "分钟后再试");
    return;
  }
  const user = store.db.users.find(function (item) { return item.username.toLowerCase() === key; });
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    if (!record.first || Date.now() - record.first > 10 * 60 * 1000) {
      record.first = Date.now();
      record.count = 0;
    }
    record.count += 1;
    if (record.count >= 5) {
      record.lockedUntil = Date.now() + 10 * 60 * 1000;
      record.count = 0;
      record.first = 0;
    }
    failures.set(key, record);
    audit.write(user || { id: "-", name: username, role: "-" }, "账号", "登录失败", username, "用户名或密码错误", ctx.req);
    ctx.fail(401, "用户名或密码错误");
    return;
  }
  if (user.status !== "active") {
    ctx.fail(403, "账号已被禁用，请联系系统管理员");
    return;
  }
  failures.delete(key);
  const token = signToken(user);
  user.lastLoginAt = store.now();
  store.save();
  audit.write({ id: user.id, name: user.name, role: user.role }, "账号", "登录", user.username, "登录成功", ctx.req);
  ctx.ok({ token: token, user: publicUser(user) });
}

function me(ctx) {
  const user = store.db.users.find(function (item) { return item.id === ctx.user.id; });
  ctx.ok({ user: publicUser(user) });
}

function logout(ctx) {
  audit.write(ctx.user, "账号", "退出", ctx.user.username, "用户退出登录", ctx.req);
  ctx.ok({});
}

module.exports = {
  hashPassword: hashPassword,
  verifyPassword: verifyPassword,
  signToken: signToken,
  fromRequest: fromRequest,
  publicUser: publicUser,
  register: register,
  login: login,
  me: me,
  logout: logout
};
