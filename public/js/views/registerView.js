import api from "../api.js";
import { formError, setBusy, toast } from "../ui.js";

export default {
  render(container) {
    container.innerHTML = '<div class="auth-wrap">' +
      '<div class="auth-intro">' +
        "<h2>建立你的<br><em>疗愈档案</em></h2>" +
        "<p>注册账号用于保存情绪测评、疗愈记录与趋势。终端用户默认只能查看本人数据；非遗内容管理员与系统管理员账号由系统管理员创建。</p>" +
        '<div class="auth-points">' +
          '<div class="auth-point"><strong>本人数据</strong><span>测评与记录隔离</span></div>' +
          '<div class="auth-point"><strong>可撤回</strong><span>记录可自行删除</span></div>' +
          '<div class="auth-point"><strong>有据可查</strong><span>关键操作留痕</span></div>' +
        "</div>" +
      "</div>" +
      '<div class="auth-card">' +
        "<h3>注册终端用户</h3>" +
        '<div class="sub">用户名4-20位，密码至少8位并包含字母和数字</div>' +
        '<form id="registerForm" autocomplete="off">' +
          '<div class="field"><label>用户名</label><input name="username" placeholder="字母开头，可含数字和下划线"><div class="error-text" data-error="username"></div></div>' +
          '<div class="field"><label>姓名或昵称</label><input name="name" placeholder="用于界面称呼"><div class="error-text" data-error="name"></div></div>' +
          '<div class="field"><label>密码</label><input name="password" type="password" placeholder="8-32位，字母与数字组合"><div class="error-text" data-error="password"></div></div>' +
          '<div class="field"><label>确认密码</label><input name="confirmPassword" type="password" placeholder="再次输入密码"><div class="error-text" data-error="confirmPassword"></div></div>' +
          '<button class="btn primary block" type="submit">创建账号</button>' +
        "</form>" +
        '<div class="auth-switch">已有账号？<a href="#/login">返回登录</a></div>' +
      "</div>" +
    "</div>";
    const form = container.querySelector("#registerForm");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      formError(form, null);
      const button = form.querySelector("button[type=submit]");
      const data = {
        username: form.username.value.trim(),
        name: form.name.value.trim(),
        password: form.password.value,
        confirmPassword: form.confirmPassword.value
      };
      setBusy(button, true, "正在创建…");
      try {
        await api.post("/api/auth/register", data);
        toast("账号创建成功，请登录", "ok");
        location.hash = "#/login";
      } catch (error) {
        formError(form, error);
        setBusy(button, false);
      }
    });
  }
};
