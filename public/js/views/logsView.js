import api from "../api.js";
import { esc, table, roleName, formatDate } from "../ui.js";

const MODULES = ["账号", "测评", "推荐", "疗愈", "素材", "审核", "主题", "用户", "设置", "反馈", "权限", "灯光", "配方"];

export default {
  async render(container) {
    container.innerHTML = '<div class="card"><div class="toolbar">' +
      '<select id="module"><option value="">全部模块</option>' + MODULES.map(function (item) { return '<option value="' + item + '">' + item + "</option>"; }).join("") + "</select>" +
      '<select id="role"><option value="">全部角色</option><option value="USER">终端用户</option><option value="EXPERT">内容管理员</option><option value="ADMIN">系统管理员</option></select>' +
      '<input type="date" id="from"><span class="muted small">至</span><input type="date" id="to">' +
      '<input id="keyword" placeholder="搜索操作人或对象"><button class="btn" id="searchBtn">筛选</button><span class="spacer"></span><span class="small muted">日志不记录情绪分数与备注原文</span></div>' +
      '<div id="tableBox"></div></div>';
    const load = async function () {
      const moduleValue = encodeURIComponent(container.querySelector("#module").value);
      const role = encodeURIComponent(container.querySelector("#role").value);
      const from = container.querySelector("#from").value;
      const to = container.querySelector("#to").value;
      const keyword = encodeURIComponent(container.querySelector("#keyword").value.trim());
      const data = await api.get("/api/logs?module=" + moduleValue + "&role=" + role + "&from=" + from + "&to=" + to + "&keyword=" + keyword);
      container.querySelector("#tableBox").innerHTML = table(["时间", "操作人", "角色", "模块", "动作", "对象", "说明", "IP"], data.logs.map(function (item) {
        return [formatDate(item.createdAt, true), esc(item.actorName), roleName(item.role), esc(item.module), esc(item.action), esc(item.target), esc(item.detail), esc(item.ip)];
      })) + '<div class="small muted mt-12">共 ' + data.total + " 条，最多显示最近300条。</div>";
    };
    container.querySelector("#searchBtn").addEventListener("click", load);
    await load();
  }
};
