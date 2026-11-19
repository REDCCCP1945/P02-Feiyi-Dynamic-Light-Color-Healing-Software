const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const store = require("./lib/store");
const auth = require("./lib/auth");
const audit = require("./lib/audit");
const assessment = require("./lib/assessmentService");
const recommend = require("./lib/recommendService");
const asset = require("./lib/assetService");
const theme = require("./lib/themeService");
const session = require("./lib/sessionService");
const report = require("./lib/reportService");
const light = require("./lib/lightService");
const userService = require("./lib/userService");
const settings = require("./lib/settingsService");
const feedback = require("./lib/feedbackService");
const dashboard = require("./lib/dashboardService");
const httpUtil = require("./lib/http");

const PORT = Number(process.env.PORT || 4102);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

store.init(DATA_DIR);
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const routes = [];

function route(method, pattern, roles, handler) {
  routes.push({ method, pattern, roles, handler });
}

route("POST", /^\/api\/auth\/register$/, [], auth.register);
route("POST", /^\/api\/auth\/login$/, [], auth.login);
route("GET", /^\/api\/auth\/me$/, ["USER", "EXPERT", "ADMIN"], auth.me);
route("POST", /^\/api\/auth\/logout$/, ["USER", "EXPERT", "ADMIN"], auth.logout);

route("GET", /^\/api\/dashboard$/, ["USER", "EXPERT", "ADMIN"], dashboard.summary);

route("GET", /^\/api\/elements$/, ["USER", "EXPERT", "ADMIN"], asset.list);
route("GET", /^\/api\/elements\/([^/]+)$/, ["USER", "EXPERT", "ADMIN"], asset.detail);
route("POST", /^\/api\/elements$/, ["EXPERT", "ADMIN"], asset.create);
route("PUT", /^\/api\/elements\/([^/]+)$/, ["EXPERT", "ADMIN"], asset.update);
route("POST", /^\/api\/elements\/([^/]+)\/audit$/, ["ADMIN"], asset.audit);
route("DELETE", /^\/api\/elements\/([^/]+)$/, ["EXPERT", "ADMIN"], asset.remove);
route("GET", /^\/api\/elements\/([^/]+)\/culture$/, ["USER", "EXPERT", "ADMIN"], asset.cultureCard);

route("GET", /^\/api\/themes$/, ["USER", "EXPERT", "ADMIN"], theme.list);
route("GET", /^\/api\/themes\/([^/]+)$/, ["USER", "EXPERT", "ADMIN"], theme.detail);
route("POST", /^\/api\/themes$/, ["EXPERT", "ADMIN"], theme.create);
route("PUT", /^\/api\/themes\/([^/]+)$/, ["EXPERT", "ADMIN"], theme.update);
route("POST", /^\/api\/themes\/([^/]+)\/toggle$/, ["EXPERT", "ADMIN"], theme.toggle);

route("POST", /^\/api\/assessments$/, ["USER", "EXPERT", "ADMIN"], assessment.create);
route("GET", /^\/api\/assessments\/([^/]+)$/, ["USER", "EXPERT", "ADMIN"], assessment.detail);

route("POST", /^\/api\/recommendations$/, ["USER", "EXPERT", "ADMIN"], recommend.create);
route("GET", /^\/api\/recommendations\/([^/]+)$/, ["USER", "EXPERT", "ADMIN"], recommend.detail);

route("GET", /^\/api\/recipes$/, ["USER", "EXPERT", "ADMIN"], session.listRecipes);
route("POST", /^\/api\/recipes$/, ["USER", "EXPERT", "ADMIN"], session.saveRecipe);

route("POST", /^\/api\/sessions$/, ["USER", "EXPERT", "ADMIN"], session.start);
route("GET", /^\/api\/sessions$/, ["USER", "EXPERT", "ADMIN"], session.list);
route("GET", /^\/api\/sessions\/([^/]+)$/, ["USER", "EXPERT", "ADMIN"], session.detail);
route("POST", /^\/api\/sessions\/([^/]+)\/pause$/, ["USER", "EXPERT", "ADMIN"], session.pause);
route("POST", /^\/api\/sessions\/([^/]+)\/resume$/, ["USER", "EXPERT", "ADMIN"], session.resume);
route("POST", /^\/api\/sessions\/([^/]+)\/complete$/, ["USER", "EXPERT", "ADMIN"], session.complete);
route("POST", /^\/api\/sessions\/([^/]+)\/abort$/, ["USER", "EXPERT", "ADMIN"], session.abort);
route("DELETE", /^\/api\/sessions\/([^/]+)$/, ["USER", "EXPERT", "ADMIN"], session.remove);

route("GET", /^\/api\/report\/trend$/, ["USER", "EXPERT", "ADMIN"], report.trend);
route("GET", /^\/api\/report\/session\/([^/]+)$/, ["USER", "EXPERT", "ADMIN"], report.sessionReport);
route("GET", /^\/api\/report\/export$/, ["USER", "EXPERT", "ADMIN"], report.exportData);

route("GET", /^\/api\/light\/frame$/, ["USER", "EXPERT", "ADMIN"], light.frame);
route("POST", /^\/api\/light\/export$/, ["USER", "EXPERT", "ADMIN"], light.exportFrame);

route("GET", /^\/api\/users$/, ["ADMIN"], userService.list);
route("POST", /^\/api\/users$/, ["ADMIN"], userService.create);
route("POST", /^\/api\/users\/([^/]+)\/toggle$/, ["ADMIN"], userService.toggle);
route("POST", /^\/api\/users\/([^/]+)\/reset$/, ["ADMIN"], userService.reset);

route("GET", /^\/api\/logs$/, ["ADMIN"], audit.list);
route("GET", /^\/api\/settings$/, ["ADMIN"], settings.get);
route("POST", /^\/api\/settings$/, ["ADMIN"], settings.save);

route("GET", /^\/api\/feedback$/, ["USER", "EXPERT", "ADMIN"], feedback.list);
route("POST", /^\/api\/feedback$/, ["USER", "EXPERT", "ADMIN"], feedback.create);
route("POST", /^\/api\/feedback\/([^/]+)\/reply$/, ["ADMIN"], feedback.reply);

route("GET", /^\/api\/profile$/, ["USER", "EXPERT", "ADMIN"], userService.profile);
route("POST", /^\/api\/profile$/, ["USER", "EXPERT", "ADMIN"], userService.updateProfile);
route("POST", /^\/api\/profile\/password$/, ["USER", "EXPERT", "ADMIN"], userService.changePassword);

route("GET", /^\/api\/meta$/, [], function (ctx) {
  ctx.send(200, {
    name: "基于非遗文化元素的动态光色疗愈体验软件",
    version: "V1.0",
    owner: "陕西理工大学",
    contact: "李果",
    serverTime: new Date().toISOString(),
    elementCount: ctx.store.db.ichElements.length,
    themeCount: ctx.store.db.themes.length
  });
});

function matchRoute(method, pathname) {
  for (const item of routes) {
    if (item.method !== method) continue;
    const m = item.pattern.exec(pathname);
    if (m) return { def: item, params: m.slice(1) };
  }
  return null;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

function serveStatic(req, res, pathname) {
  let root = PUBLIC_DIR;
  let rel = pathname;
  if (pathname.startsWith("/files/")) {
    root = UPLOAD_DIR;
    rel = pathname.slice("/files/".length);
  } else if (pathname === "/") {
    rel = "/index.html";
  }
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(root, safe);
  if (!file.startsWith(root)) {
    httpUtil.sendJson(res, 403, { code: 403, message: "禁止访问" });
    return;
  }
  fs.stat(file, function (err, stat) {
    if (err || !stat.isFile()) {
      httpUtil.sendJson(res, 404, { code: 404, message: "资源不存在" });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300"
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, "http://" + (req.headers.host || "127.0.0.1"));
  const pathname = decodeURIComponent(url.pathname);

  if (!pathname.startsWith("/api/")) {
    serveStatic(req, res, pathname);
    return;
  }

  const matched = matchRoute(req.method, pathname);
  if (!matched) {
    httpUtil.sendJson(res, 404, { code: 404, message: "接口不存在" });
    return;
  }

  httpUtil.readBody(req, 3 * 1024 * 1024, function (err, body) {
    if (err) {
      httpUtil.sendJson(res, 413, { code: 413, message: "请求内容过大" });
      return;
    }
    let user = null;
    try {
      user = auth.fromRequest(req);
    } catch (e) {
      user = null;
    }
    if (matched.def.roles.length > 0) {
      if (!user) {
        httpUtil.sendJson(res, 401, { code: 401, message: "登录状态已失效，请重新登录" });
        return;
      }
      if (matched.def.roles.indexOf(user.role) < 0) {
        audit.write(user, "权限", "拒绝访问", pathname, "角色" + user.role + "无权访问", req);
        httpUtil.sendJson(res, 403, { code: 403, message: "当前角色无权执行该操作" });
        return;
      }
    }
    const ctx = {
      req: req,
      res: res,
      user: user,
      params: matched.params,
      query: url.searchParams,
      body: body,
      store: store,
      audit: audit,
      send: function (code, payload) {
        httpUtil.sendJson(res, code, payload);
      },
      ok: function (payload) {
        httpUtil.sendJson(res, 200, Object.assign({ code: 0, message: "操作成功" }, payload || {}));
      },
      fail: function (code, message, field) {
        httpUtil.sendJson(res, code, { code: code, message: message, field: field || null });
      },
      ip: httpUtil.clientIp(req)
    };
    try {
      matched.def.handler(ctx);
    } catch (e) {
      console.error(e);
      httpUtil.sendJson(res, 500, { code: 500, message: "服务器处理失败" });
    }
  });
});

server.listen(PORT, "127.0.0.1", function () {
  console.log("基于非遗文化元素的动态光色疗愈体验软件V1.0");
  console.log("服务已启动：http://127.0.0.1:" + PORT);
  console.log("数据文件：" + path.join(DATA_DIR, "db.json"));
});
