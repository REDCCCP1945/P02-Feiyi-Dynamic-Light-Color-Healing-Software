import api from "../api.js";
import { esc, table, badge, formatDate, formatDuration } from "../ui.js";
import { radarChart } from "../charts.js";

const DIMS = [["T", "紧张"], ["D", "低落"], ["A", "愤怒"], ["V", "活力"], ["F", "疲劳"], ["C", "困惑"]];

export default {
  async render(container, params) {
    const result = await api.get("/api/report/session/" + params.id);
    const session = result.session;
    const assessment = result.assessment;
    container.innerHTML =
      '<div class="hero"><div><h2>' + esc(session.themeName) + ' <span class="tag ok">已完成</span></h2>' +
        "<p>记录编号 " + esc(session.code) + " · " + formatDate(session.startAt, true) + " 开始 · 时长 " + formatDuration(session.durationSec) +
        " · 主观评分 " + session.rating + " / 5</p>" +
        '<div class="inline mt-12">' + badge("前测负荷 " + session.preLoad, "") + badge("后测负荷 " + session.postLoad, "") +
        badge("改善度 +" + session.improvement, "ok") + badge("呼吸 " + session.params.breathFreq + "Hz", "teal") + "</div></div>" +
        '<div class="hero-actions"><button class="btn primary" id="exportJson">导出JSON</button><button class="btn" id="exportCsv">导出CSV</button>' +
        '<a class="btn ghost" href="#/records">返回记录</a></div></div>' +
      '<div class="panel-split mt-24">' +
        '<div class="card"><div class="card-head"><div><h3 class="card-title">前后情绪对比</h3><div class="card-sub">前测与后测六维评分，0-10</div></div></div>' +
          '<div id="radarBox" class="chart-box"><canvas></canvas></div>' +
          '<div class="legend mt-8"><span><i style="background:#7fc6b8"></i>前测</span><span><i style="background:#d9b26a"></i>后测</span></div>' +
        "</div>" +
        '<div class="card"><div class="card-head"><div><h3 class="card-title">改善度构成</h3><div class="card-sub">情绪负荷 = 五个负向或中性的平均值×10</div></div></div>' +
          '<div class="kv"><dt>前测负荷</dt><dd>' + session.preLoad + '</dd><dt>后测负荷</dt><dd>' + session.postLoad + '</dd>' +
          "<dt>改善度</dt><dd>+" + session.improvement + '</dd><dt>体验时长</dt><dd>' + formatDuration(session.durationSec) + "</dd>" +
          "<dt>主题编码</dt><dd>" + esc(session.themeCode) + '</dd><dt>使用素材</dt><dd>' + session.elements.length + " 件</dd></div>" +
          '<div class="split-line"></div><div class="small muted">' + (session.note ? "备注：" + esc(session.note) : "本次未填写备注") + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="card mt-24"><div class="card-head"><div><h3 class="card-title">六维明细</h3><div class="card-sub">分数越高表示该状态越明显</div></div></div>' +
        table(["维度", "前测", "后测", "变化"], DIMS.map(function (item) {
          const before = session.preScores[item[0]];
          const after = session.postScores[item[0]];
          const diff = after - before;
          return [item[1], String(before), String(after), '<span class="tag ' + (diff < 0 ? "ok" : (diff > 0 ? "warn" : "")) + '">' + (diff > 0 ? "+" : "") + diff + "</span>"];
        })) +
      "</div>" +
      '<div class="section-title">本次使用的非遗素材</div>' +
      '<div class="grid cols-2">' + result.cultureCards.map(function (card) {
        return '<div class="culture-card"><h4>' + esc(card.name) + " · " + esc(card.category) + "</h4>" +
          "<p>" + esc(card.cultureText) + "</p><p>" + esc(card.symbolism) + "</p>" +
          "<small>技法：" + esc(card.technique) + " · 来源：" + esc(card.source) + " · 采集地：" + esc(card.collectionPlace) + "</small></div>";
      }).join("") + "</div>" +
      '<div class="notice-bar mt-16">本报告记录主观评分与体验参数，不构成医学评估。报告内容仅本人可见，可在记录页删除。</div>';

    const canvas = container.querySelector("#radarBox canvas");
    if (canvas) {
      radarChart(canvas, DIMS.map(function (item) { return item[1]; }), [
        { name: "前测", color: "#7fc6b8", data: DIMS.map(function (item) { return session.preScores[item[0]]; }) },
        { name: "后测", color: "#d9b26a", data: DIMS.map(function (item) { return session.postScores[item[0]]; }) }
      ], { height: 290 });
    }
    container.querySelector("#exportJson").addEventListener("click", function () {
      api.download("P02-疗愈报告-" + session.code + ".json", JSON.stringify({
        version: "V1.0",
        exportedAt: new Date().toISOString(),
        session: session,
        assessment: assessment,
        cultureCards: result.cultureCards
      }, null, 2), "application/json");
    });
    container.querySelector("#exportCsv").addEventListener("click", async function () {
      const data = await api.get("/api/report/export?format=csv&days=365");
      api.download(data.fileName, data.content, "text/csv;charset=utf-8");
    });
  }
};
