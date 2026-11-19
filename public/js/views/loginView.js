import api from "../api.js";
import { esc, formError, setBusy, toast } from "../ui.js";
import { enterApp } from "../app.js";

function template() {
  return '<div class="auth-wrap">' +
    '<div class="auth-intro">' +
      "<h2>以非遗之光<br><em>安放当下情绪</em></h2>" +
      "<p>从简版情绪测评开始，系统将依据六个维度的得分计算PAD坐标，并从已审核的非遗主题中给出匹配方案。动态纹样、呼吸光色与环境音在同一节律上运行，体验结束后可回看记录与趋势。</p>" +
      '<div class="auth-points">' +
        '<div class="auth-point"><strong>结构化非遗</strong><span>素材标签与审核</span></div>' +
        '<div class="auth-point"><strong>参数化光色</strong><span>逐帧计算可复现</span></div>' +
        '<div class="auth-point"><strong>可回看记录</strong><span>前后情绪对比</span></div>' +
      "</div>" +
    "</div>" +
    '<div class="auth-card">' +
      "<h3>欢迎回来</h3>" +
      '<div class="sub">登录后进入你的疗愈空间</div>' +
      '<form id="loginForm" autocomplete="off">' +
        '<div class="field"><label>用户名</label><input name="username" placeholder="请输入用户名" autocomplete="username"><div class="error-text" data-error="username"></div></div>' +
        '<div class="field"><label>密码</label><input name="password" type="password" placeholder="请输入密码" autocomplete="current-password"><div class="error-text" data-error="password"></div></div>' +
        '<button class="btn primary block" type="submit">安全登录</button>' +
      "</form>" +
      '<div class="auth-switch">还没有账号？<a href="#/register">注册新账号</a></div>' +
      '<div class="auth-note">本软件用于日常放松与文化体验，不提供医学诊断或治疗。登录与关键操作会写入操作日志。</div>' +
    "</div>" +
  "</div>";
}

export default {
  render(container) {
    container.innerHTML = template();
    const form = container.querySelector("#loginForm");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      formError(form, null);
      const button = form.querySelector("button[type=submit]");
      const data = {
        username: form.username.value.trim(),
        password: form.password.value
      };
      setBusy(button, true, "正在验证…");
      try {
        const result = await api.post("/api/auth/login", data);
        toast("登录成功，正在进入工作台", "ok");
        enterApp(result.user, result.token);
      } catch (error) {
        formError(form, error);
        setBusy(button, false);
      }
    });
  }
};
