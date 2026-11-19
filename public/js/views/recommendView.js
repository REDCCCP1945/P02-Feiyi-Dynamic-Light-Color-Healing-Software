import api from "../api.js";
import { esc, toast, table, badge, setBusy } from "../ui.js";

const DIMENSIONS = [
  ["T", "紧张"], ["D", "低落"], ["A", "愤怒"], ["V", "活力"], ["F", "疲劳"], ["C", "困惑"]
];

function dimBars(scores) {
  return DIMENSIONS.map(function (item) {
    const value = scores[item[0]] || 0;
    return '<div class="bar-row"><span>' + item[1] + '</span><div class="bar-track"><i style="width:' + value + '%"></i></div><span>' + Math.round(value / 10) + "</span></div>";
  }).join("");
}

function padLine(pad) {
  return '<span class="tag teal">愉悦度 ' + pad.p + '</span><span class="tag gold">唤醒度 ' + pad.a + '</span><span class="tag rose">优势度 ' + pad.d + "</span>";
}

export default {
  async render(container, params) {
    const recommendation = (await api.get("/api/recommendations/" + params.id)).recommendation;
    const assessment = (await api.get("/api/assessments/" + recommendation.assessmentId)).assessment;
    const items = recommendation.items.slice().sort(function (a, b) { return b.score - a.score; });
    container.innerHTML =
      '<div class="card pad-lg"><div class="card-head"><div><h3 class="card-title">测评结果</h3><div class="card-sub">' +
        (recommendation.smart ? "系统已按目标PAD与协同权重排序" : "已关闭智能匹配，以下为全部可选主题") + "</div></div>" +
        '<div class="inline">' + badge("主导情绪：" + assessment.dominant.label, "gold") + badge("完成于 " + assessment.createdAt.slice(0, 10), "") + "</div></div>" +
        '<div class="grid cols-3"><div><h4 class="small muted mb-8">六维得分</h4>' + dimBars(assessment.normalized) + "</div>" +
        '<div><h4 class="small muted mb-8">PAD情绪坐标</h4><p class="small muted">当前状态</p>' + padLine(assessment.padBefore) +
          '<p class="small muted mt-12">目标状态（推理后）</p>' + padLine(assessment.padTarget) +
          '<div class="notice-bar mt-16">目标坐标由当前坐标按固定规则平移得到：愉悦度上调至多0.5，唤醒度向中间回调0.4，优势度上调至多0.4。</div></div>' +
        '<div><h4 class="small muted mb-8">推荐依据</h4><p class="small muted">主题得分 = 0.6 × 接近度 + 0.4 × 协同权重。接近度由目标PAD与主题目标PAD的欧氏距离换算；协同权重来自历史评分，范围为0.1至5.0。</p>' +
          '<div class="split-line"></div><div class="inline"><button class="btn ghost" id="toggleSmart">' + (recommendation.smart ? "关闭智能匹配" : "恢复智能匹配") + '</button><a class="btn ghost" href="#/recipe">自定义配方</a></div></div>' +
        "</div>" +
      "</div>" +
      '<div class="section-title">' + (recommendation.smart ? "匹配度最高的三个主题" : "全部已启用主题") + "</div>" +
      '<div class="grid cols-3">' + items.map(function (item, index) {
        const theme = item;
        return '<div class="card"><div class="theme-thumb"><img src="' + (theme.cover || "") + '" alt=""></div>' +
          '<div class="inline mb-8">' + (recommendation.smart ? '<span class="rank-no">' + (index + 1) + "</span>" : "") + '<strong>' + esc(theme.name) + "</strong>" +
            (recommendation.smart ? '<span class="score-pill">' + Math.round(theme.score * 100) + "%</span>" : "") + "</div>" +
          '<p class="small muted">' + esc(theme.description) + "</p>" +
          '<div class="inline mt-8">' + badge("呼吸 " + theme.params.breathFreq + "Hz", "teal") + badge("分形 " + theme.params.fractalDepth + "层", "") + badge("时长 " + theme.params.duration + "分钟", "gold") + "</div>" +
          '<p class="small muted mt-12">' + esc(theme.reason) + "</p>" +
          '<div class="inline mt-16"><a class="btn ghost" href="#/themes/' + theme.themeId + '">查看详情</a>' +
            '<button class="btn primary" data-start="' + theme.themeId + '">开始疗愈</button></div>' +
        "</div>";
      }).join("") + "</div>";
    container.querySelectorAll("[data-start]").forEach(function (button) {
      button.addEventListener("click", async function () {
        setBusy(button, true, "准备中…");
        try {
          const result = await api.post("/api/sessions", { assessmentId: assessment.id, themeId: button.dataset.start });
          location.hash = "#/session/" + result.session.id;
        } catch (error) {
          toast(error.message, "err");
          setBusy(button, false);
        }
      });
    });
    container.querySelector("#toggleSmart").addEventListener("click", async function (event) {
      const button = event.currentTarget;
      setBusy(button, true, "生成中…");
      try {
        const next = await api.post("/api/recommendations", { assessmentId: assessment.id, smart: !recommendation.smart });
        location.hash = "#/recommend/" + next.recommendation.id;
      } catch (error) {
        toast(error.message, "err");
        setBusy(button, false);
      }
    });
  }
};
