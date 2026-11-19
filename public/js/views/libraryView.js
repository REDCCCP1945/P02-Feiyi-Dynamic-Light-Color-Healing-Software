import api from "../api.js";
import { esc, badge, statusBadge, openModal, empty } from "../ui.js";

function card(element, manage) {
  return '<div class="element-card"><div class="element-thumb"><img src="' + esc(element.filePath) + '" alt=""></div>' +
    '<div class="element-body"><div class="inline mb-8"><h4>' + esc(element.name) + "</h4>" + statusBadge(element.auditStatus) + "</div>" +
      '<p>' + esc(element.cultureText) + "</p>" +
      '<div class="inline">' + element.emotionTags.map(function (tag) { return badge(tag, "teal"); }).join("") + "</div>" +
      '<div class="small muted mt-8">' + esc(element.category) + " · " + esc(element.copyrightStatus) + "</div>" +
      '<div class="mini-actions"><button class="btn ghost" data-card="' + element.id + '">文化卡</button>' +
        (manage ? '<a class="btn ghost" href="#/library/' + element.id + '/edit">编辑</a>' : "") +
        '<button class="btn ghost" data-remove="' + element.id + '">删除</button></div>' +
    "</div></div>";
}

export default {
  async render(container) {
    const self = this;
    const user = api.user();
    const manage = user.role === "EXPERT" || user.role === "ADMIN";
    const data = await api.get("/api/elements");
    const categories = data.categories;
    const emotions = data.emotions;
    container.innerHTML =
      '<div class="card"><div class="toolbar"><input id="keyword" placeholder="搜索名称、文化说明或标签">' +
        '<select id="category"><option value="">全部类别</option>' + categories.map(function (item) { return '<option value="' + item + '">' + item + "</option>"; }).join("") + "</select>" +
        '<select id="emotion"><option value="">全部情绪标签</option>' + emotions.map(function (item) { return '<option value="' + item + '">' + item + "</option>"; }).join("") + "</select>" +
        (manage ? '<select id="status"><option value="">全部状态</option><option value="pending">待审核</option><option value="approved">已通过</option><option value="rejected">已驳回</option></select>' : "") +
        '<button class="btn" id="searchBtn">筛选</button><span class="spacer"></span>' +
        (manage ? '<a class="btn primary" href="#/library/new">上传素材</a>' : "") + "</div>" +
        '<div id="grid" class="element-grid">' + (data.elements.length ? data.elements.map(function (element) { return card(element, manage); }).join("") : empty("暂无素材")) + "</div></div>";
    const bind = function () {
      container.querySelectorAll("[data-card]").forEach(function (button) {
        button.addEventListener("click", async function () {
          const result = await api.get("/api/elements/" + button.dataset.card + "/culture");
          const info = result.card;
          openModal({
            title: info.name,
            sub: info.category + " · " + info.copyrightStatus,
            body: '<img src="' + esc((data.elements.find(function (item) { return item.id === info.id; }) || {}).filePath || "") + '" style="width:120px;height:120px;object-fit:contain;background:#081014;border:1px solid var(--line);border-radius:12px;float:right;margin-left:16px">' +
              '<p class="small muted">' + esc(info.cultureText) + "</p>" +
              '<div class="kv mt-12"><dt>技法</dt><dd>' + esc(info.technique) + "</dd><dt>寓意</dt><dd>" + esc(info.symbolism) + "</dd>" +
              "<dt>来源</dt><dd>" + esc(info.source) + "</dd><dt>采集地</dt><dd>" + esc(info.collectionPlace) + "</dd>" +
              "<dt>版权状态</dt><dd>" + esc(info.copyrightStatus) + "</dd></div>",
            foot: '<button class="btn ghost" data-close="1">关闭</button>'
          });
        });
      });
      container.querySelectorAll("[data-remove]").forEach(function (button) {
        button.addEventListener("click", async function () {
          if (!confirm("确认删除该素材？已被主题引用时服务端会拒绝。")) return;
          try {
            await api.del("/api/elements/" + button.dataset.remove);
            const view = container.closest("#view");
            await self.render(view);
          } catch (error) {
            alert(error.message);
          }
        });
      });
    };
    bind();
    const search = async function () {
      const keyword = encodeURIComponent(container.querySelector("#keyword").value.trim());
      const category = encodeURIComponent(container.querySelector("#category").value);
      const emotion = encodeURIComponent(container.querySelector("#emotion").value);
      const status = container.querySelector("#status") ? encodeURIComponent(container.querySelector("#status").value) : "";
      const result = await api.get("/api/elements?keyword=" + keyword + "&category=" + category + "&emotion=" + emotion + "&status=" + status);
      container.querySelector("#grid").innerHTML = result.elements.length ? result.elements.map(function (element) { return card(element, manage); }).join("") : empty("没有找到匹配的素材");
      bind();
    };
    container.querySelector("#searchBtn").addEventListener("click", search);
    container.querySelector("#keyword").addEventListener("keydown", function (event) {
      if (event.key === "Enter") search();
    });
  }
};
