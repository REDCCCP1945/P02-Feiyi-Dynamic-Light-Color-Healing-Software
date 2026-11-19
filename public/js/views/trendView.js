import api from "../api.js";
import { esc, table, barRow, toast } from "../ui.js";
import { lineChart, radarChart } from "../charts.js";

const DIMS = [["T", "紧张"], ["D", "低落"], ["A", "愤怒"], ["V", "活力"], ["F", "疲劳"], ["C", "困惑"]];

function stat(label, value, unit, foot) {
  return '<div class="stat-card"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '<small>' + unit + '</small></div><div class="stat-foot">' + foot + "</div></div>";
}

export default {
  async render(container) {
    let days = 7;
    const draw = async function () {
      const data = await api.get("/api/report/trend?days=" + days);
      const labels = data.series.map(function (item) { return item.date; });
      container.querySelector("#summary").innerHTML =
        stat("体验次数", data.summary.sessions, "次", days + "天内") +
        stat("累计时长", data.summary.minutes, "分钟", "按完成记录统计") +
        stat("平均改善度", data.summary.averageImprovement, "分", "前测负荷减后测负荷") +
        stat("最佳改善", data.summary.bestImprovement, "分", "单次记录最高值");
      const pre = data.series.map(function (item) { return item.preLoad; });
      const post = data.series.map(function (item) { return item.postLoad; });
      const improvement = data.series.map(function (item) { return item.improvement; });
      lineChart(container.querySelector("#lineBox canvas"), [
        { name: "前测负荷", color: "#7fc6b8", data: pre },
        { name: "后测负荷", color: "#d9b26a", data: post }
      ], { labels: labels, height: 260, max: 100, fill: true });
      lineChart(container.querySelector("#improveBox canvas"), [
        { name: "改善度", color: "#9fb87f", data: improvement }
      ], { labels: labels, height: 190, max: 60, fill: true });
      radarChart(container.querySelector("#radarBox canvas"), DIMS.map(function (item) { return item[1]; }), [
        { name: "前测均值", color: "#7fc6b8", data: DIMS.map(function (item) { return data.preAvg[item[0]]; }) },
        { name: "后测均值", color: "#d9b26a", data: DIMS.map(function (item) { return data.postAvg[item[0]]; }) }
      ], { height: 280 });
      const max = data.themes.length ? data.themes[0].count : 1;
      container.querySelector("#themeBox").innerHTML = data.themes.length ? data.themes.map(function (item) {
        return barRow(item.name, item.count, max, "次");
      }).join("") : '<div class="empty">该窗口内没有完成记录</div>';
      container.querySelector("#tableBox").innerHTML = table(["日期", "次数", "前测均值", "后测均值", "改善度", "分钟"], data.series.filter(function (item) { return item.count > 0; }).map(function (item) {
        return [esc(item.date), String(item.count), String(item.preLoad), String(item.postLoad), '<span class="tag ok">+' + item.improvement + "</span>", String(item.minutes)];
      }));
    };
    container.innerHTML =
      '<div class="card"><div class="toolbar"><div class="tabs" style="border:none;margin:0"><div class="tab active" data-days="7">近7天</div><div class="tab" data-days="30">近30天</div></div>' +
        '<span class="spacer"></span><button class="btn" id="exportCsv">导出CSV</button><button class="btn ghost" id="exportJson">导出JSON</button></div>' +
        '<div id="summary" class="grid cols-4"></div>' +
      "</div>" +
      '<div class="panel-split mt-24"><div class="card"><div class="card-head"><div><h3 class="card-title">情绪负荷变化</h3><div class="card-sub">前测与后测负荷越低表示负担越轻</div></div></div><div id="lineBox" class="chart-box"><canvas></canvas></div>' +
        '<div class="legend mt-8"><span><i style="background:#7fc6b8"></i>前测负荷</span><span><i style="background:#d9b26a"></i>后测负荷</span></div></div>' +
        '<div class="card"><div class="card-head"><div><h3 class="card-title">六维均值</h3><div class="card-sub">窗口内所有完成记录</div></div></div><div id="radarBox" class="chart-box"><canvas></canvas></div></div>' +
      "</div>" +
      '<div class="panel-split mt-24"><div class="card"><div class="card-head"><div><h3 class="card-title">单次改善度</h3><div class="card-sub">正值表示情绪负荷下降</div></div></div><div id="improveBox" class="chart-box"><canvas></canvas></div></div>' +
        '<div class="card"><div class="card-head"><div><h3 class="card-title">主题使用次数</h3><div class="card-sub">按完成记录统计</div></div></div><div id="themeBox"></div></div></div>' +
      '<div class="card mt-24"><div class="card-head"><div><h3 class="card-title">逐日汇总</h3><div class="card-sub">仅列出有记录的日期</div></div></div><div id="tableBox"></div></div>';
    await draw();
    container.querySelectorAll("[data-days]").forEach(function (tab) {
      tab.addEventListener("click", async function () {
        days = Number(tab.dataset.days);
        container.querySelectorAll("[data-days]").forEach(function (item) { item.classList.remove("active"); });
        tab.classList.add("active");
        await draw();
      });
    });
    container.querySelector("#exportCsv").addEventListener("click", async function () {
      const data = await api.get("/api/report/export?format=csv&days=" + days);
      api.download(data.fileName, data.content, "text/csv;charset=utf-8");
    });
    container.querySelector("#exportJson").addEventListener("click", async function () {
      const data = await api.get("/api/report/export?format=json&days=" + days);
      api.download(data.fileName, data.content, "application/json");
    });
  }
};
