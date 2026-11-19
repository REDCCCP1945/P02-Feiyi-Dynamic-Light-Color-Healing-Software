import api from "../api.js";
import { esc, table, statusBadge, formatDate, toast, setBusy } from "../ui.js";

export default {
  async render(container) {
    const self = this;
    const data = await api.get("/api/themes");
    container.innerHTML = '<div class="card"><div class="toolbar"><input id="keyword" placeholder="搜索主题名称或编码"><button class="btn" id="searchBtn">搜索</button><span class="spacer"></span><a class="btn primary" href="#/theme-edit/new">新建主题</a></div>' +
      '<div id="tableBox">' + table(["编码", "名称", "素材", "呼吸", "时长", "状态", "更新时间", "操作"], data.themes.map(function (theme) {
        return [esc(theme.code), esc(theme.name), String(theme.elements.length), theme.params.breathFreq + "Hz", theme.params.duration + "分钟", statusBadge(theme.status), formatDate(theme.updatedAt, true),
          '<a class="btn ghost" href="#/theme-edit/' + theme.id + '">编辑</a><button class="btn ghost" data-toggle="' + theme.id + '">' + (theme.status === "enabled" ? "停用" : "启用") + "</button>"];
      })) + "</div></div>";
    const bind = function () {
      container.querySelectorAll("[data-toggle]").forEach(function (button) {
        button.addEventListener("click", async function () {
          setBusy(button, true);
          try {
            const result = await api.post("/api/themes/" + button.dataset.toggle + "/toggle");
            toast(result.theme.status === "enabled" ? "主题已启用" : "主题已停用", "ok");
            const view = container.closest("#view");
            await self.render(view);
          } catch (error) {
            toast(error.message, "err");
            setBusy(button, false);
          }
        });
      });
    };
    bind();
    container.querySelector("#searchBtn").addEventListener("click", async function () {
      const keyword = encodeURIComponent(container.querySelector("#keyword").value.trim());
      const result = await api.get("/api/themes?keyword=" + keyword);
      container.querySelector("#tableBox").innerHTML = table(["编码", "名称", "素材", "呼吸", "时长", "状态", "更新时间", "操作"], result.themes.map(function (theme) {
        return [esc(theme.code), esc(theme.name), String(theme.elements.length), theme.params.breathFreq + "Hz", theme.params.duration + "分钟", statusBadge(theme.status), formatDate(theme.updatedAt, true),
          '<a class="btn ghost" href="#/theme-edit/' + theme.id + '">编辑</a><button class="btn ghost" data-toggle="' + theme.id + '">' + (theme.status === "enabled" ? "停用" : "启用") + "</button>"];
      }));
      bind();
    });
  }
};
