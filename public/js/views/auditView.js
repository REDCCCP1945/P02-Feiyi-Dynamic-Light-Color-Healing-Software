import api from "../api.js";
import { esc, badge, statusBadge, table, formatDate, openModal, toast, setBusy, empty } from "../ui.js";

export default {
  async render(container) {
    const self = this;
    let status = "pending";
    const load = async function () {
      const data = await api.get("/api/elements" + (status ? "?status=" + status : ""));
      const rows = data.elements.map(function (element) {
        return [
          '<img src="' + esc(element.filePath) + '" style="width:46px;height:46px;object-fit:contain;background:#081014;border:1px solid var(--line);border-radius:8px">',
          esc(element.code),
          esc(element.name),
          esc(element.category),
          element.emotionTags.map(function (tag) { return badge(tag, "teal"); }).join(""),
          esc(element.createdByName),
          formatDate(element.createdAt, true),
          statusBadge(element.auditStatus),
          '<button class="btn ghost" data-audit="' + element.id + '">查看与审核</button>'
        ];
      });
      container.querySelector("#tableBox").innerHTML = rows.length
        ? table(["预览", "编号", "名称", "类别", "情绪标签", "提交人", "提交时间", "状态", "操作"], rows)
        : empty("当前分类下没有素材");
      bind();
    };
    const bind = function () {
      container.querySelectorAll("[data-audit]").forEach(function (button) {
        button.addEventListener("click", async function () {
          const element = (await api.get("/api/elements/" + button.dataset.audit)).element;
          const modal = openModal({
            title: element.name,
            sub: element.code + " · " + element.category + " · " + element.copyrightStatus,
            wide: true,
            body: '<div class="panel-split"><div><img src="' + esc(element.filePath) + '" style="width:100%;max-height:300px;object-fit:contain;background:#081014;border:1px solid var(--line);border-radius:12px"></div>' +
              '<div><div class="kv"><dt>主色</dt><dd><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:' + esc(element.primaryColor) + ';vertical-align:-2px;margin-right:6px"></span>' + esc(element.primaryColor) + "</dd>" +
              "<dt>情绪标签</dt><dd>" + element.emotionTags.join(" / ") + "</dd><dt>来源</dt><dd>" + esc(element.source) + "</dd>" +
              "<dt>采集地</dt><dd>" + esc(element.collectionPlace) + "</dd><dt>版权状态</dt><dd>" + esc(element.copyrightStatus) + "</dd>" +
              "<dt>当前状态</dt><dd>" + statusBadge(element.auditStatus) + "</dd>" + (element.auditNote ? "<dt>审核意见</dt><dd>" + esc(element.auditNote) + "</dd>" : "") + "</div></div></div>" +
              '<div class="split-line"></div><p class="small muted">' + esc(element.cultureText) + "</p>" +
              '<div class="kv mt-12"><dt>技法</dt><dd>' + esc(element.technique) + "</dd><dt>寓意</dt><dd>" + esc(element.symbolism) + "</dd></div>" +
              (element.auditStatus === "pending" ? '<div class="split-line"></div><div class="field"><label>审核意见（驳回必填）</label><textarea id="auditNote" maxlength="200" placeholder="通过可留空；驳回须说明具体原因"></textarea></div>' : ""),
            foot: element.auditStatus === "pending"
              ? '<button class="btn ghost" data-close="1">稍后处理</button><button class="btn danger" id="rejectBtn">驳回</button><button class="btn primary" id="approveBtn">通过</button>'
              : '<button class="btn ghost" data-close="1">关闭</button>'
          });
          if (element.auditStatus === "pending") {
            const decide = async function (decision) {
              const note = modal.root.querySelector("#auditNote").value.trim();
              try {
                await api.post("/api/elements/" + element.id + "/audit", { decision: decision, note: note });
                toast(decision === "approved" ? "素材已通过审核" : "素材已驳回", decision === "approved" ? "ok" : "err");
                modal.close();
                await load();
              } catch (error) {
                toast(error.message, "err");
              }
            };
            modal.root.querySelector("#approveBtn").addEventListener("click", function () { decide("approved"); });
            modal.root.querySelector("#rejectBtn").addEventListener("click", function () { decide("rejected"); });
          }
        });
      });
    };
    container.innerHTML = '<div class="card"><div class="toolbar"><div class="tabs" style="border:none;margin:0">' +
      '<div class="tab active" data-status="pending">待审核</div><div class="tab" data-status="approved">已通过</div><div class="tab" data-status="rejected">已驳回</div><div class="tab" data-status="">全部</div></div>' +
      '<span class="spacer"></span><span class="small muted">审核通过后素材才能被主题引用；驳回须填写具体意见。</span></div><div id="tableBox"></div></div>';
    container.querySelectorAll("[data-status]").forEach(function (tab) {
      tab.addEventListener("click", async function () {
        status = tab.dataset.status;
        container.querySelectorAll("[data-status]").forEach(function (item) { item.classList.remove("active"); });
        tab.classList.add("active");
        await load();
      });
    });
    await load();
    void self;
  }
};
