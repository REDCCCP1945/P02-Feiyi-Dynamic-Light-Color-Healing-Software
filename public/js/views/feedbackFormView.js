import api from "../api.js";
import { esc, toast, setBusy } from "../ui.js";

const DIMS = [["T", "紧张"], ["D", "低落"], ["A", "愤怒"], ["V", "活力"], ["F", "疲劳"], ["C", "困惑"]];

export default {
  async render(container, params) {
    const session = (await api.get("/api/sessions/" + params.id)).session;
    if (session.status === "completed") {
      location.hash = "#/report/" + session.id;
      return;
    }
    container.innerHTML = '<div class="card pad-lg" style="max-width:760px;margin:0 auto">' +
      '<div class="card-head"><div><h3 class="card-title">体验反馈</h3><div class="card-sub">' + esc(session.themeName) + " · 已进行 " + Math.round((Date.now() - new Date(session.startAt).getTime()) / 1000) + " 秒</div></div></div>" +
      '<form id="feedbackForm"><div class="grid cols-2">' + DIMS.map(function (item) {
        return '<div class="field"><label>' + item[1] + '</label><input type="range" min="0" max="10" value="4" name="' + item[0] + '"><div class="inline"><small class="muted">0</small><span class="spacer"></span><strong data-out="' + item[0] + '">4</strong><span class="spacer"></span><small class="muted">10</small></div></div>';
      }).join("") + "</div>" +
      '<div class="field"><label>整体评分</label><select name="rating"><option value="5">5 - 非常舒适</option><option value="4" selected>4 - 比较舒适</option><option value="3">3 - 一般</option><option value="2">2 - 有些不舒服</option><option value="1">1 - 很不舒服</option></select></div>' +
      '<div class="field"><label>备注（可选）</label><textarea name="note" maxlength="200"></textarea></div>' +
      '<div class="inline"><button class="btn primary" type="submit">保存并查看报告</button><a class="btn ghost" href="#/session/' + session.id + '">返回体验</a></div></form></div>';
    const form = container.querySelector("#feedbackForm");
    form.querySelectorAll("input[type=range]").forEach(function (input) {
      input.addEventListener("input", function () {
        const out = form.querySelector('[data-out="' + input.name + '"]');
        if (out) out.textContent = input.value;
      });
    });
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      setBusy(button, true, "保存中…");
      const scores = {};
      DIMS.forEach(function (item) { scores[item[0]] = Number(form[item[0]].value); });
      try {
        await api.post("/api/sessions/" + session.id + "/complete", {
          postScores: scores,
          rating: Number(form.rating.value),
          note: form.note.value.trim()
        });
        toast("记录已保存", "ok");
        location.hash = "#/report/" + session.id;
      } catch (error) {
        toast(error.message, "err");
        setBusy(button, false);
      }
    });
  }
};
