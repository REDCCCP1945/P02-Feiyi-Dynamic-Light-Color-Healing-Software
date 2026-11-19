import api from "../api.js";
import { esc, table, statusBadge, formatDate, toast, openModal, setBusy } from "../ui.js";

const TYPES = ["功能建议", "内容纠错", "体验问题", "投诉"];

export default {
  async render(container) {
    const self = this;
    const user = api.user();
    const isAdmin = user.role === "ADMIN";
    let status = "";
    const load = async function () {
      const data = await api.get("/api/feedback" + (status ? "?status=" + status : ""));
      const rows = data.feedbacks.map(function (item) {
        return [
          formatDate(item.createdAt, true),
          esc(item.userName),
          esc(item.type),
          esc(item.content),
          statusBadge(item.status),
          isAdmin && item.status === "pending" ? '<button class="btn ghost" data-reply="' + item.id + '">处理</button>' : (item.reply ? esc(item.reply) : "—")
        ];
      });
      container.querySelector("#listBox").innerHTML = table(["时间", "提交人", "类型", "内容", "状态", isAdmin ? "操作/回复" : "回复"], rows);
      if (isAdmin) bindReply(data.feedbacks);
    };
    const bindReply = function (feedbacks) {
      container.querySelectorAll("[data-reply]").forEach(function (button) {
        button.addEventListener("click", function () {
          const item = feedbacks.find(function (feedback) { return feedback.id === button.dataset.reply; });
          const modal = openModal({
            title: "处理反馈",
            sub: item.userName + " · " + item.type + " · " + formatDate(item.createdAt, true),
            body: '<p class="small muted">' + esc(item.content) + "</p>" +
              '<form id="replyForm" class="mt-16"><div class="field"><label>回复内容（2-300字）</label><textarea name="reply" maxlength="300"></textarea><div class="error-text" data-error="reply"></div></div>' +
              '<div class="modal-foot"><button class="btn ghost" type="button" data-close="1">取消</button><button class="btn primary" type="submit">提交回复</button></div></form>',
            foot: false
          });
          const form = modal.root.querySelector("#replyForm");
          form.addEventListener("submit", async function (event) {
            event.preventDefault();
            const submit = form.querySelector("button[type=submit]");
            setBusy(submit, true, "提交中…");
            try {
              await api.post("/api/feedback/" + item.id + "/reply", { reply: form.reply.value.trim() });
              toast("反馈已处理", "ok");
              modal.close();
              await load();
            } catch (error) {
              const target = form.querySelector('[data-error="reply"]');
              if (target) target.textContent = error.message;
              setBusy(submit, false);
            }
          });
        });
      });
    };
    container.innerHTML = '<div class="panel-split">' +
      '<div class="card"><div class="card-head"><div><h3 class="card-title">' + (isAdmin ? "反馈与投诉处理" : "我的反馈") + '</h3><div class="card-sub">' + (isAdmin ? "处理后用户可在本人反馈列表中看到回复" : "提交内容仅本人与管理员可见") + "</div></div></div>" +
        (isAdmin ? '<div class="toolbar"><div class="tabs" style="border:none;margin:0"><div class="tab active" data-status="">全部</div><div class="tab" data-status="pending">待处理</div><div class="tab" data-status="resolved">已处理</div></div></div>' : "") +
        '<div id="listBox"></div></div>' +
      '<div class="card"><div class="card-head"><div><h3 class="card-title">提交反馈</h3><div class="card-sub">功能建议、内容纠错、体验问题或投诉</div></div></div>' +
        '<form id="feedbackForm"><div class="field"><label>类型</label><select name="type">' + TYPES.map(function (item) { return '<option value="' + item + '">' + item + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label>内容（5-500字）</label><textarea name="content" maxlength="500" placeholder="请描述具体问题或建议"></textarea><div class="error-text" data-error="content"></div></div>' +
        '<button class="btn primary" type="submit">提交反馈</button></form>' +
        '<div class="notice-bar mt-16">涉及个人信息的投诉请勿在内容中填写他人隐私；管理员回复会记录处理时间与处理人。</div>' +
      "</div></div>";
    const form = container.querySelector("#feedbackForm");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      setBusy(button, true, "提交中…");
      try {
        await api.post("/api/feedback", { type: form.type.value, content: form.content.value.trim() });
        toast("反馈已提交", "ok");
        form.content.value = "";
        await load();
      } catch (error) {
        const target = form.querySelector('[data-error="content"]');
        if (target) target.textContent = error.message;
      } finally {
        setBusy(button, false);
      }
    });
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
