import api from "../api.js";
import { esc, badge, toast, setBusy } from "../ui.js";

export default {
  async render(container, params) {
    const theme = (await api.get("/api/themes/" + params.id)).theme;
    const assessmentId = localStorage.getItem("p02_last_assessment") || "";
    container.innerHTML =
      '<div class="hero"><div><h2>' + esc(theme.name) + "</h2><p>" + esc(theme.description) + "</p>" +
        '<div class="inline mt-12">' + badge(theme.code, "gold") + badge("呼吸 " + theme.params.breathFreq + " Hz", "teal") +
        badge("分形 " + theme.params.fractalDepth + " 层", "") + badge("建议 " + theme.params.duration + " 分钟", "gold") +
        badge("音轨 " + theme.audioName, "") + "</div></div>" +
        '<div class="hero-actions">' + (assessmentId
          ? '<button class="btn primary" id="startBtn">开始疗愈</button>'
          : '<a class="btn primary" href="#/assessment">先做情绪测评</a>') +
          '<a class="btn" href="#/themes">返回列表</a></div></div>' +
      '<div class="panel-split mt-24">' +
        '<div class="card"><div class="card-head"><div><h3 class="card-title">动态参数</h3><div class="card-sub">这些参数直接驱动画布与灯光指令</div></div></div>' +
          '<div class="grid cols-2"><div class="kv">' +
            "<dt>色相区间</dt><dd>" + theme.params.hueMin + "° - " + theme.params.hueMax + "°</dd>" +
            "<dt>饱和度区间</dt><dd>" + theme.params.satMin + "% - " + theme.params.satMax + "%</dd>" +
            "<dt>明度区间</dt><dd>" + theme.params.lightMin + "% - " + theme.params.lightMax + "%</dd>" +
            "<dt>呼吸频率</dt><dd>" + theme.params.breathFreq + " Hz</dd></div><div class=\"kv\">" +
            "<dt>分形层级</dt><dd>" + theme.params.fractalDepth + " 层</dd>" +
            "<dt>粒子密度</dt><dd>" + theme.params.particleDensity + "</dd>" +
            "<dt>建议时长</dt><dd>" + theme.params.duration + " 分钟</dd>" +
            "<dt>环境音轨</dt><dd>" + theme.audioName + "</dd></div></div>" +
          '<div class="notice-bar mt-16">明度按 L(t) = L_base + 0.15 × sin(2πft) 变化，画面与音频共用同一呼吸相位；灯光指令中的亮度受系统上限约束。</div>' +
        "</div>" +
        '<div class="card"><div class="card-head"><div><h3 class="card-title">目标PAD</h3><div class="card-sub">主题希望引导到的情绪坐标</div></div></div>' +
          '<div class="kv"><dt>愉悦度</dt><dd>' + theme.targetPAD.p + '</dd><dt>唤醒度</dt><dd>' + theme.targetPAD.a + '</dd><dt>优势度</dt><dd>' + theme.targetPAD.d + "</dd></div>" +
          '<div class="split-line"></div><div class="small muted">推荐得分只使用距离与协同权重，不包含未经证实的情绪识别模型。</div>' +
        "</div>" +
      "</div>" +
      '<div class="section-title">主题素材与文化说明</div>' +
      '<div class="grid cols-2">' + theme.elements.map(function (element) {
        return '<div class="card"><div class="inline mb-12"><img src="' + esc(element.filePath) + '" alt="" style="width:74px;height:74px;object-fit:contain;border:1px solid var(--line);border-radius:10px;background:#081014">' +
          "<div><h4 class=\"card-title\">" + esc(element.name) + '</h4><div class="card-sub">' + esc(element.category) + " · " + element.emotionTags.join(" / ") + "</div></div></div>" +
          '<div class="culture-card"><h4>文化科普</h4><p>' + esc(element.cultureText) + "</p><small>来源：" + esc(element.source) + " · 采集地：" + esc(element.collectionPlace) + " · " + esc(element.copyrightStatus) + "</small></div>" +
        "</div>";
      }).join("") + "</div>";
    if (assessmentId) {
      const button = container.querySelector("#startBtn");
      button.addEventListener("click", async function () {
        setBusy(button, true, "准备中…");
        try {
          const result = await api.post("/api/sessions", { assessmentId: assessmentId, themeId: theme.id });
          location.hash = "#/session/" + result.session.id;
        } catch (error) {
          toast(error.message, "err");
          setBusy(button, false);
        }
      });
    }
  }
};
