import api from "../api.js";
import { esc, table, statusBadge, roleName, formatDate, toast, openModal, setBusy, formError } from "../ui.js";

export default {
  async render(container) {
    const self = this;
    const data = await api.get("/api/users");
    const rows = data.users.map(function (user) {
      return [
        esc(user.username),
        esc(user.name),
        roleName(user.role),
        statusBadge(user.status),
        user.phone || "—",
        formatDate(user.createdAt, true),
        user.lastLoginAt ? formatDate(user.lastLoginAt, true) : "—",
        '<button class="btn ghost" data-toggle="' + user.id + '">' + (user.status === "active" ? "禁用" : "启用") + "</button>" +
        '<button class="btn ghost" data-reset="' + user.id + '">重置密码</button>'
      ];
    });
    container.innerHTML = '<div class="card"><div class="toolbar"><span class="small muted">管理员可创建内容管理员与系统管理员账号；账号被禁用后现有令牌立即失效。</span><span class="spacer"></span><button class="btn primary" id="newBtn">新建账号</button></div>' +
      table(["用户名", "姓名", "角色", "状态", "手机号", "创建时间", "最近登录", "操作"], rows) + "</div>";

    container.querySelector("#newBtn").addEventListener("click", function () {
      const modal = openModal({
        title: "新建账号",
        sub: "密码须为8-32位并同时包含字母和数字",
        body: '<form id="newUserForm"><div class="field"><label>用户名</label><input name="username" placeholder="4-20位，字母开头"><div class="error-text" data-error="username"></div></div>' +
          '<div class="field"><label>姓名</label><input name="name"><div class="error-text" data-error="name"></div></div>' +
          '<div class="field"><label>角色</label><select name="role"><option value="EXPERT">内容管理员</option><option value="ADMIN">系统管理员</option><option value="USER">终端用户</option></select></div>' +
          '<div class="field"><label>初始密码</label><input name="password" type="password"><div class="error-text" data-error="password"></div></div>' +
          '<div class="modal-foot"><button class="btn ghost" type="button" data-close="1">取消</button><button class="btn primary" type="submit">创建</button></div></form>',
        foot: false
      });
      const form = modal.root.querySelector("#newUserForm");
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const button = form.querySelector("button[type=submit]");
        setBusy(button, true, "创建中…");
        try {
          await api.post("/api/users", {
            username: form.username.value.trim(),
            name: form.name.value.trim(),
            role: form.role.value,
            password: form.password.value
          });
          toast("账号已创建", "ok");
          modal.close();
          const view = container.closest("#view");
          await self.render(view);
        } catch (error) {
          formError(form, error);
          setBusy(button, false);
        }
      });
    });
    container.querySelectorAll("[data-toggle]").forEach(function (button) {
      button.addEventListener("click", async function () {
        setBusy(button, true);
        try {
          const result = await api.post("/api/users/" + button.dataset.toggle + "/toggle");
          toast(result.user.status === "active" ? "账号已启用" : "账号已禁用", "ok");
          const view = container.closest("#view");
          await self.render(view);
        } catch (error) {
          toast(error.message, "err");
          setBusy(button, false);
        }
      });
    });
    container.querySelectorAll("[data-reset]").forEach(function (button) {
      button.addEventListener("click", function () {
        const modal = openModal({
          title: "重置密码",
          sub: "重置后请通知用户尽快登录修改",
          body: '<form id="resetForm"><div class="field"><label>新密码</label><input name="password" type="password" placeholder="8-32位，字母与数字组合"><div class="error-text" data-error="password"></div></div>' +
            '<div class="modal-foot"><button class="btn ghost" type="button" data-close="1">取消</button><button class="btn primary" type="submit">确认重置</button></div></form>',
          foot: false
        });
        const form = modal.root.querySelector("#resetForm");
        form.addEventListener("submit", async function (event) {
          event.preventDefault();
          const submit = form.querySelector("button[type=submit]");
          setBusy(submit, true, "重置中…");
          try {
            await api.post("/api/users/" + button.dataset.reset + "/reset", { password: form.password.value });
            toast("密码已重置", "ok");
            modal.close();
          } catch (error) {
            formError(form, error);
            setBusy(submit, false);
          }
        });
      });
    });
  }
};
