import api from "../api.js";
import { esc, badge, empty, statusBadge } from "../ui.js";

function card(theme, manage) {
  const cover = theme.elements && theme.elements[0] ? theme.elements[0].filePath : "";
  return '<div class="theme-card" data-id="' + theme.id + '">' +
    '<div class="theme-thumb">' + (cover ? '<img src="' + esc(cover) + '" alt="">' : "") + "</div>" +
    '<div class="theme-body"><div class="inline mb-8"><h4>' + esc(theme.name) + "</h4>" + statusBadge(theme.status) + "</div>" +
      "<p>" + esc(theme.description) + "</p>" +
      '<div class="theme-meta"><span>' + esc(theme.code) + " · " + theme.elements.length + "件素材</span><span>" + theme.params.duration + "分钟</span></div>" +
      (manage ? '<div class="mini-actions"><a class="btn ghost" href="#/theme-edit/' + theme.id + '">编辑</a></div>' : "") +
    "</div></div>";
}

export default {
  async render(container) {
    const user = api.user();
    const result = await api.get("/api/themes");
    const manage = user.role === "EXPERT" || user.role === "ADMIN";
    container.innerHTML =
      '<div class="card"><div class="toolbar"><input id="keyword" placeholder="搜索主题名称或编码"><button class="btn" id="searchBtn">搜索</button><span class="spacer"></span>' +
        (manage ? '<a class="btn primary" href="#/theme-edit/new">新建主题</a>' : "") +
        '<a class="btn ghost" href="#/assessment">重新测评</a></div>' +
        '<div id="themeGrid" class="theme-grid">' + result.themes.map(function (theme) { return card(theme, manage); }).join("") + "</div>" +
        (result.themes.length ? "" : empty("暂无符合条件的主题")) +
      "</div>";
    container.querySelectorAll(".theme-card").forEach(function (item) {
      item.addEventListener("click", function (event) {
        if (event.target.closest("a,button")) return;
        location.hash = "#/themes/" + item.dataset.id;
      });
    });
    const search = async function () {
      const keyword = container.querySelector("#keyword").value.trim();
      const data = await api.get("/api/themes?keyword=" + encodeURIComponent(keyword));
      container.querySelector("#themeGrid").innerHTML = data.themes.map(function (theme) { return card(theme, manage); }).join("") || empty("没有找到匹配的主题");
      container.querySelectorAll(".theme-card").forEach(function (item) {
        item.addEventListener("click", function (event) {
          if (event.target.closest("a,button")) return;
          location.hash = "#/themes/" + item.dataset.id;
        });
      });
    };
    container.querySelector("#searchBtn").addEventListener("click", search);
    container.querySelector("#keyword").addEventListener("keydown", function (event) {
      if (event.key === "Enter") search();
    });
  }
};
