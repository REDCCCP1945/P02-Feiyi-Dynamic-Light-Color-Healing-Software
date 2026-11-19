import api from "./api.js";
import { roleName, initials, toast, openModal } from "./ui.js";
import loginView from "./views/loginView.js";
import registerView from "./views/registerView.js";
import dashboardView from "./views/dashboardView.js";
import assessmentView from "./views/assessmentView.js";
import recommendView from "./views/recommendView.js";
import themeListView from "./views/themeListView.js";
import themeDetailView from "./views/themeDetailView.js";
import recipeView from "./views/recipeView.js";
import sessionView from "./views/sessionView.js";
import feedbackFormView from "./views/feedbackFormView.js";
import reportView from "./views/reportView.js";
import recordsView from "./views/recordsView.js";
import trendView from "./views/trendView.js";
import libraryView from "./views/libraryView.js";
import assetEditView from "./views/assetEditView.js";
import auditView from "./views/auditView.js";
import themeManageView from "./views/themeManageView.js";
import themeEditView from "./views/themeEditView.js";
import usersView from "./views/usersView.js";
import logsView from "./views/logsView.js";
import settingsView from "./views/settingsView.js";
import complaintsView from "./views/complaintsView.js";
import profileView from "./views/profileView.js";
import helpView from "./views/helpView.js";

const routes = [
  { path: "/login", view: loginView, public: true, title: "登录" },
  { path: "/register", view: registerView, public: true, title: "注册" },
  { path: "/dashboard", view: dashboardView, title: "工作台", crumb: "疗愈空间" },
  { path: "/assessment", view: assessmentView, title: "情绪测评", crumb: "疗愈空间" },
  { path: "/recommend/:id", view: recommendView, title: "主题推荐", crumb: "疗愈空间" },
  { path: "/themes", view: themeListView, title: "疗愈主题", crumb: "疗愈空间" },
  { path: "/themes/:id", view: themeDetailView, title: "主题详情", crumb: "疗愈空间" },
  { path: "/recipe", view: recipeView, title: "自定义配方", crumb: "疗愈空间" },
  { path: "/session/:id", view: sessionView, title: "疗愈体验", crumb: "疗愈空间" },
  { path: "/feedback/:id", view: feedbackFormView, title: "体验反馈", crumb: "疗愈空间" },
  { path: "/report/:id", view: reportView, title: "疗愈报告", crumb: "疗愈空间" },
  { path: "/records", view: recordsView, title: "我的记录", crumb: "疗愈空间" },
  { path: "/trend", view: trendView, title: "情绪趋势", crumb: "疗愈空间" },
  { path: "/library", view: libraryView, title: "非遗素材库", crumb: "文化内容" },
  { path: "/library/new", view: assetEditView, title: "上传素材", crumb: "文化内容", roles: ["EXPERT", "ADMIN"] },
  { path: "/library/:id/edit", view: assetEditView, title: "编辑素材", crumb: "文化内容", roles: ["EXPERT", "ADMIN"] },
  { path: "/audit", view: auditView, title: "素材审核", crumb: "系统管理", roles: ["ADMIN"] },
  { path: "/theme-manage", view: themeManageView, title: "主题管理", crumb: "文化内容", roles: ["EXPERT", "ADMIN"] },
  { path: "/theme-edit/new", view: themeEditView, title: "新建主题", crumb: "文化内容", roles: ["EXPERT", "ADMIN"] },
  { path: "/theme-edit/:id", view: themeEditView, title: "编辑主题", crumb: "文化内容", roles: ["EXPERT", "ADMIN"] },
  { path: "/users", view: usersView, title: "用户管理", crumb: "系统管理", roles: ["ADMIN"] },
  { path: "/logs", view: logsView, title: "操作日志", crumb: "系统管理", roles: ["ADMIN"] },
  { path: "/settings", view: settingsView, title: "系统设置", crumb: "系统管理", roles: ["ADMIN"] },
  { path: "/complaints", view: complaintsView, title: "反馈与投诉", crumb: "账户" },
  { path: "/profile", view: profileView, title: "个人资料", crumb: "账户" },
  { path: "/help", view: helpView, title: "帮助与关于", crumb: "账户" }
];

const NAV = {
  USER: [
    { group: "疗愈空间", items: [["/dashboard", "工作台", "round"], ["/assessment", "情绪测评", "line"], ["/themes", "疗愈主题", "round"], ["/records", "我的记录", "line"], ["/trend", "情绪趋势", "line"]] },
    { group: "文化内容", items: [["/library", "非遗素材库", "round"]] },
    { group: "账户", items: [["/profile", "个人资料", "round"], ["/complaints", "反馈与投诉", "line"], ["/help", "帮助与关于", "line"]] }
  ],
  EXPERT: [
    { group: "内容管理", items: [["/dashboard", "工作台", "round"], ["/library", "素材库", "line"], ["/theme-manage", "主题管理", "round"], ["/themes", "主题浏览", "line"]] },
    { group: "数据", items: [["/trend", "我的趋势", "line"]] },
    { group: "账户", items: [["/profile", "个人资料", "round"], ["/complaints", "反馈与投诉", "line"], ["/help", "帮助与关于", "line"]] }
  ],
  ADMIN: [
    { group: "系统管理", items: [["/dashboard", "工作台", "round"], ["/audit", "素材审核", "line"], ["/users", "用户管理", "round"], ["/logs", "操作日志", "line"], ["/settings", "系统设置", "line"], ["/complaints", "投诉处理", "line"]] },
    { group: "内容", items: [["/library", "素材库", "line"], ["/theme-manage", "主题管理", "round"], ["/themes", "主题浏览", "line"]] },
    { group: "账户", items: [["/profile", "个人资料", "round"], ["/help", "帮助与关于", "line"]] }
  ]
};

let currentRoute = null;
let currentParams = {};

function match(path) {
  for (const route of routes) {
    const keys = [];
    const pattern = route.path.replace(/:[^/]+/g, function (part) {
      keys.push(part.slice(1));
      return "([^/]+)";
    });
    const regex = new RegExp("^" + pattern + "$");
    const result = regex.exec(path);
    if (result) {
      const params = {};
      keys.forEach(function (key, index) { params[key] = decodeURIComponent(result[index + 1]); });
      return { route: route, params: params };
    }
  }
  return null;
}

function renderNav(user) {
  const nav = document.getElementById("nav");
  const groups = NAV[user.role] || NAV.USER;
  const current = location.hash.replace("#", "").split("?")[0];
  nav.innerHTML = groups.map(function (group) {
    return '<div class="nav-group"><div class="nav-group-title">' + group.group + "</div>" +
      group.items.map(function (item) {
        const active = current === item[0] || (item[0] !== "/dashboard" && current.indexOf(item[0]) === 0);
        return '<div class="nav-item ' + (active ? "active" : "") + '" data-go="' + item[0] + '">' +
          '<span class="nav-icon ' + item[2] + '"></span><span>' + item[1] + "</span></div>";
      }).join("") + "</div>";
  }).join("");
  nav.querySelectorAll("[data-go]").forEach(function (item) {
    item.addEventListener("click", function () {
      location.hash = "#" + item.dataset.go;
    });
  });
}

function renderSideUser(user) {
  const box = document.getElementById("sideUser");
  box.innerHTML = '<div class="avatar">' + initials(user.name) + '</div><div><strong>' + user.name + "</strong><small>" + roleName(user.role) + " · " + user.username + "</small></div>";
  box.style.cursor = "pointer";
  box.onclick = function () { location.hash = "#/profile"; };
  document.getElementById("roleBadge").textContent = roleName(user.role);
}

function showAuth() {
  document.getElementById("shell").classList.add("hidden");
  document.getElementById("authLayer").classList.remove("hidden");
}

function showShell() {
  document.getElementById("authLayer").classList.add("hidden");
  document.getElementById("shell").classList.remove("hidden");
}

function renderForbidden(view, route) {
  view.innerHTML = '<div class="card pad-lg center"><h2 class="card-title">当前角色无权访问</h2><p class="muted mt-12">' +
    "该页面仅向" + (route.roles || []).map(roleName).join("、") + "开放。</p>" +
    '<button class="btn primary mt-24" onclick="location.hash=\'#/dashboard\'">返回工作台</button></div>';
}

async function handleRoute() {
  const raw = location.hash.replace(/^#/, "") || "/login";
  const path = raw.split("?")[0];
  const matched = match(path);
  const authLayer = document.getElementById("authLayer");
  const view = document.getElementById("view");

  if (!matched) {
    if (api.token()) {
      showShell();
      view.innerHTML = '<div class="empty">页面不存在，可返回工作台继续操作。</div>';
    } else {
      showAuth();
      authLayer.innerHTML = '<div class="auth-card"><h3>页面不存在</h3><p class="sub">请返回登录页</p><a class="btn primary block" href="#/login">返回登录</a></div>';
    }
    return;
  }

  if (matched.route.public) {
    showAuth();
    matched.route.view.render(authLayer);
    currentRoute = matched.route;
    return;
  }

  const user = api.user();
  if (!user || !api.token()) {
    showAuth();
    location.hash = "#/login";
    return;
  }

  if (matched.route.roles && matched.route.roles.indexOf(user.role) < 0) {
    showShell();
    renderNav(user);
    renderSideUser(user);
    document.getElementById("pageTitle").textContent = matched.route.title;
    document.getElementById("crumb").textContent = matched.route.crumb || "";
    renderForbidden(view, matched.route);
    return;
  }

  showShell();
  renderNav(user);
  renderSideUser(user);
  document.getElementById("pageTitle").textContent = matched.route.title;
  document.getElementById("crumb").textContent = matched.route.crumb || "";
  currentRoute = matched.route;
  currentParams = matched.params;
  window.scrollTo(0, 0);
  try {
    await matched.route.view.render(view, matched.params);
  } catch (error) {
    view.innerHTML = '<div class="card pad-lg center"><h3 class="card-title">页面加载失败</h3><p class="muted mt-12">' + (error.message || "未知错误") + "</p></div>";
  }
}

function startClock() {
  const clock = document.getElementById("clock");
  if (!clock) return;
  const tick = function () {
    const now = new Date();
    const pad = function (n) { return String(n).padStart(2, "0"); };
    clock.textContent = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
  };
  tick();
  setInterval(tick, 1000);
}

async function boot() {
  startClock();
  if (api.token()) {
    try {
      const data = await api.get("/api/auth/me");
      api.setSession(null, data.user);
    } catch (error) {
      api.clearSession();
    }
  }
  window.addEventListener("hashchange", handleRoute);
  if (!location.hash) {
    location.hash = api.token() ? "#/dashboard" : "#/login";
  } else {
    handleRoute();
  }
  window.addEventListener("app:refresh", handleRoute);
}

export function enterApp(user, token) {
  api.setSession(token, user);
  location.hash = "#/dashboard";
  handleRoute();
}

export function logout() {
  api.post("/api/auth/logout").catch(function () {}).finally(function () {
    api.clearSession();
    location.hash = "#/login";
    handleRoute();
  });
}

window.P02 = {
  logout: logout,
  enterApp: enterApp,
  toast: toast,
  openModal: openModal
};

boot();
