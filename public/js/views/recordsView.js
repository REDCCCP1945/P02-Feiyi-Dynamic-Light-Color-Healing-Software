import api from "../api.js";
import { esc, table, statusBadge, formatDate, formatDuration, toast, openDrawer, openModal } from "../ui.js";

function row(item) {
  return [
    '<a href="#/report/' + item.id + '">' + esc(item.code) + "</a>",
    esc(item.themeName),
    formatDate(item.startAt, true),
    formatDuration(item.durationSec),
    String(item.preLoad),
    item.postLoad === null ? "—" : String(item.postLoad),
    item.improvement === null ? "—" : '<span class="tag ' + (item.improvement >= 0 ? "ok" : "warn") + '">' + (item.improvement > 0 ? "+" : "") + item.improvement + "</span>",
    item.rating ? item.rating + " / 5" : "—",
    statusBadge(item.status),
    '<button class="btn ghost" data-detail="' + item.id + '">详情</button>'
  ];
}

export default {
  async render(container) {
    let rows = (await api.get("/api/sessions?includeAborted=1")).sessions;
    container.innerHTML =
      '<div class="card"><div class="toolbar"><input type="date" id="from"><span class="muted small">至</span><input type="date" id="to">' +
        '<button class="btn" id="filterBtn">筛选</button><button class="btn ghost" id="resetBtn">重置</button><span class="spacer"></span>' +
        '<button class="btn" id="exportCsv">导出CSV</button><button class="btn" id="exportJson">导出JSON</button></div>' +
        '<div id="tableBox">' + table(["记录编号", "主题", "开始时间", "时长", "前测负荷", "后测负荷", "改善度", "评分", "状态", "操作"], rows.map(row)) + "</div></div>";

    const renderRows = function (list) {
      container.querySelector("#tableBox").innerHTML = table(["记录编号", "主题", "开始时间", "时长", "前测负荷", "后测负荷", "改善度", "评分", "状态", "操作"], list.map(row));
      bindDetails();
    };
    const bindDetails = function () {
      container.querySelectorAll("[data-detail]").forEach(function (button) {
        button.addEventListener("click", async function () {
          const session = (await api.get("/api/sessions/" + button.dataset.detail)).session;
          const body = '<div class="kv"><dt>记录编号</dt><dd>' + esc(session.code) + "</dd><dt>主题</dt><dd>" + esc(session.themeName) + "</dd>" +
            "<dt>开始时间</dt><dd>" + formatDate(session.startAt, true) + "</dd><dt>结束时间</dt><dd>" + formatDate(session.endAt, true) + "</dd>" +
            "<dt>时长</dt><dd>" + formatDuration(session.durationSec) + "</dd><dt>状态</dt><dd>" + statusBadge(session.status) + "</dd>" +
            "<dt>前测负荷</dt><dd>" + session.preLoad + "</dd><dt>后测负荷</dt><dd>" + (session.postLoad === null ? "—" : session.postLoad) + "</dd>" +
            "<dt>改善度</dt><dd>" + (session.improvement === null ? "—" : session.improvement) + "</dd>" +
            "<dt>六维前测</dt><dd>T" + session.preScores.T + " D" + session.preScores.D + " A" + session.preScores.A + " V" + session.preScores.V + " F" + session.preScores.F + " C" + session.preScores.C + "</dd>" +
            (session.postScores ? "<dt>六维后测</dt><dd>T" + session.postScores.T + " D" + session.postScores.D + " A" + session.postScores.A + " V" + session.postScores.V + " F" + session.postScores.F + " C" + session.postScores.C + "</dd>" : "") +
            "<dt>呼吸频率</dt><dd>" + session.params.breathFreq + " Hz</dd><dt>分形层级</dt><dd>" + session.params.fractalDepth + " 层</dd>" +
            "<dt>素材</dt><dd>" + session.elements.map(function (item) { return esc(item.name); }).join("、") + "</dd>" +
            (session.note ? "<dt>备注</dt><dd>" + esc(session.note) + "</dd>" : "") + "</div>" +
            '<div class="split-line"></div><div class="inline">' + (session.status === "completed" ? '<a class="btn primary" href="#/report/' + session.id + '">查看报告</a>' : "") +
            '<button class="btn danger" id="deleteBtn">删除记录</button></div>';
          const drawer = openDrawer("疗愈记录详情", body);
          drawer.root.querySelector("#deleteBtn").addEventListener("click", function () {
            const modal = openModal({
              title: "确认删除记录",
              sub: "删除后该记录不再出现在列表与趋势中，操作会写入日志。",
              body: '<p class="small muted">记录编号：' + esc(session.code) + "</p>",
              foot: '<button class="btn ghost" data-close="1">取消</button><button class="btn danger" id="confirmDelete">确认删除</button>'
            });
            modal.root.querySelector("#confirmDelete").addEventListener("click", async function () {
              try {
                await api.del("/api/sessions/" + session.id);
                toast("记录已删除", "ok");
                modal.close();
                drawer.close();
                rows = rows.filter(function (item) { return item.id !== session.id; });
                renderRows(rows);
              } catch (error) {
                toast(error.message, "err");
              }
            });
          });
        });
      });
    };
    bindDetails();
    container.querySelector("#filterBtn").addEventListener("click", async function () {
      const from = container.querySelector("#from").value;
      const to = container.querySelector("#to").value;
      const data = await api.get("/api/sessions?includeAborted=1&from=" + from + "&to=" + to);
      rows = data.sessions;
      renderRows(rows);
    });
    container.querySelector("#resetBtn").addEventListener("click", async function () {
      container.querySelector("#from").value = "";
      container.querySelector("#to").value = "";
      rows = (await api.get("/api/sessions?includeAborted=1")).sessions;
      renderRows(rows);
    });
    container.querySelector("#exportCsv").addEventListener("click", async function () {
      const data = await api.get("/api/report/export?format=csv&days=365");
      api.download(data.fileName, data.content, "text/csv;charset=utf-8");
    });
    container.querySelector("#exportJson").addEventListener("click", async function () {
      const data = await api.get("/api/report/export?format=json&days=365");
      api.download(data.fileName, data.content, "application/json");
    });
  }
};
