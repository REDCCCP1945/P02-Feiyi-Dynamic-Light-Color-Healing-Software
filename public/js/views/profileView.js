import api from "../api.js";
import { esc, roleName, formatDate, toast, setBusy, formError } from "../ui.js";

export default {
  async render(container) {
    const data = await api.get("/api/profile");
    const user = data.user;
    const prefs = user.preferences || {};
    container.innerHTML = '<div class="panel-split">' +
      '<div class="card pad-lg"><div class="card-head"><div><h3 class="card-title">个人资料</h3><div class="card-sub">' + roleName(user.role) + " · 注册于 " + formatDate(user.createdAt, true) + '</div></div></div>' +
        '<div class="grid cols-3 mb-24"><div class="stat-card"><div class="stat-label">完成体验</div><div class="stat-value">' + data.stats.sessions + '<small>次</small></div></div>' +
        '<div class="stat-card"><div class="stat-label">累计时长</div><div class="stat-value">' + data.stats.minutes + '<small>分钟</small></div></div>' +
        '<div class="stat-card"><div class="stat-label">账号状态</div><div class="stat-value" style="font-size:18px">' + (user.status === "active" ? "正常" : "禁用") + "</div></div></div>" +
        '<form id="profileForm"><div class="grid cols-2"><div class="field"><label>用户名</label><input value="' + esc(user.username) + '" disabled></div>' +
        '<div class="field"><label>姓名或昵称</label><input name="name" value="' + esc(user.name) + '"><div class="error-text" data-error="name"></div></div>' +
        '<div class="field"><label>手机号（可选）</label><input name="phone" value="' + esc(user.phone) + '" placeholder="用于账号联系"><div class="error-text" data-error="phone"></div></div>' +
        '<div class="field"><label>默认体验时长（分钟）</label><input name="defaultDuration" type="number" min="5" max="60" value="' + (prefs.defaultDuration || 20) + '"></div></div>' +
        '<div class="inline mt-12"><label class="inline small"><input type="checkbox" name="sound"' + (prefs.sound !== false ? " checked" : "") + "> 默认开启环境音</label>" +
        '<label class="inline small"><input type="checkbox" name="reduceMotion"' + (prefs.reduceMotion ? " checked" : "") + "> 减少画面扰动</label></div>" +
        '<div class="inline mt-16"><button class="btn primary" type="submit">保存资料</button></div></form>' +
      "</div>" +
      '<div class="card pad-lg"><div class="card-head"><div><h3 class="card-title">修改密码</h3><div class="card-sub">修改后当前令牌仍有效，建议重新登录</div></div></div>' +
        '<form id="passwordForm"><div class="field"><label>原密码</label><input name="oldPassword" type="password"><div class="error-text" data-error="oldPassword"></div></div>' +
        '<div class="field"><label>新密码</label><input name="newPassword" type="password" placeholder="8-32位，字母与数字组合"><div class="error-text" data-error="newPassword"></div></div>' +
        '<button class="btn primary" type="submit">修改密码</button></form>' +
        '<div class="split-line"></div><div class="small muted">账号相关操作会写入操作日志。若需注销账号或导出全部数据，请通过“反馈与投诉”提交申请。</div>' +
      "</div></div>";
    const profileForm = container.querySelector("#profileForm");
    profileForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const button = profileForm.querySelector("button[type=submit]");
      setBusy(button, true, "保存中…");
      try {
        const result = await api.post("/api/profile", {
          name: profileForm.name.value.trim(),
          phone: profileForm.phone.value.trim(),
          preferences: {
            sound: profileForm.sound.checked,
            reduceMotion: profileForm.reduceMotion.checked,
            defaultDuration: Number(profileForm.defaultDuration.value)
          }
        });
        api.setSession(null, result.user);
        toast("资料已保存", "ok");
        setBusy(button, false);
      } catch (error) {
        formError(profileForm, error);
        setBusy(button, false);
      }
    });
    const passwordForm = container.querySelector("#passwordForm");
    passwordForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const button = passwordForm.querySelector("button[type=submit]");
      setBusy(button, true, "修改中…");
      try {
        await api.post("/api/profile/password", {
          oldPassword: passwordForm.oldPassword.value,
          newPassword: passwordForm.newPassword.value
        });
        toast("密码已修改", "ok");
        passwordForm.reset();
        setBusy(button, false);
      } catch (error) {
        formError(passwordForm, error);
        setBusy(button, false);
      }
    });
  }
};
