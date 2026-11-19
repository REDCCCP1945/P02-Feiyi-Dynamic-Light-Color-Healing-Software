import api from "../api.js";
import { esc, toast, setBusy } from "../ui.js";

const DIMENSIONS = [
  { key: "T", name: "紧张焦虑", desc: "心神不宁、难以放松" },
  { key: "D", name: "抑郁低落", desc: "情绪低落、缺少兴致" },
  { key: "A", name: "愤怒敌意", desc: "易烦躁、容易被触怒" },
  { key: "V", name: "活力精力", desc: "精神充足、行动有力" },
  { key: "F", name: "疲劳迟钝", desc: "身体疲惫、反应变慢" },
  { key: "C", name: "困惑迷茫", desc: "思绪杂乱、难以集中" }
];

const DEFAULTS = { T: 5, D: 3, A: 2, V: 5, F: 5, C: 4 };

function sliderRows() {
  return DIMENSIONS.map(function (item) {
    return '<div class="slider-row"><span>' + item.name + '<br><small class="muted">' + item.desc + '</small></span>' +
      '<input type="range" min="0" max="10" step="1" value="' + DEFAULTS[item.key] + '" data-key="' + item.key + '">' +
      '<strong data-value="' + item.key + '">' + DEFAULTS[item.key] + "</strong></div>";
  }).join("");
}

function readScores(container) {
  const scores = {};
  container.querySelectorAll("input[type=range][data-key]").forEach(function (input) {
    scores[input.dataset.key] = Number(input.value);
  });
  return scores;
}

function dominantOf(scores) {
  let key = "T";
  let max = -1;
  DIMENSIONS.forEach(function (item) {
    if (scores[item.key] > max) {
      max = scores[item.key];
      key = item.key;
    }
  });
  const found = DIMENSIONS.find(function (item) { return item.key === key; });
  return max * 10 < 30 ? "平稳" : found.name;
}

async function sampleVoice(container, button) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast("当前浏览器不支持麦克风采集", "err");
    return;
  }
  setBusy(button, true, "准备麦克风…");
  let stream = null;
  let context = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const Ctx = window.AudioContext || window.webkitAudioContext;
    context = new Ctx();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    const features = [];
    const started = performance.now();
    button.textContent = "采样中 5 秒…";
    await new Promise(function (resolve) {
      const timer = setInterval(function () {
        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        let zero = 0;
        for (let i = 1; i < buffer.length; i += 1) {
          sum += buffer[i] * buffer[i];
          if ((buffer[i - 1] >= 0 && buffer[i] < 0) || (buffer[i - 1] < 0 && buffer[i] >= 0)) zero += 1;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const zcr = zero / buffer.length;
        let bestLag = 0;
        let bestCorrelation = 0;
        for (let lag = 40; lag < 400; lag += 1) {
          let correlation = 0;
          let norm = 0;
          for (let i = 0; i < buffer.length - lag; i += 2) {
            correlation += buffer[i] * buffer[i + lag];
            norm += buffer[i] * buffer[i];
          }
          if (norm > 0 && correlation / norm > bestCorrelation) {
            bestCorrelation = correlation / norm;
            bestLag = lag;
          }
        }
        const pitch = bestLag > 0 ? context.sampleRate / bestLag : 0;
        features.push({ rms: rms, zcr: zcr, pitch: pitch });
        if (performance.now() - started > 5000) {
          clearInterval(timer);
          resolve();
        }
      }, 120);
    });
    const valid = features.filter(function (item) { return item.rms > 0.002; });
    const avg = function (key) {
      if (!valid.length) return 0;
      return valid.reduce(function (sum, item) { return sum + item[key]; }, 0) / valid.length;
    };
    const rms = avg("rms");
    const zcr = avg("zcr");
    const pitch = avg("pitch");
    const energy = Math.max(0, Math.min(1, rms * 5));
    const zcrNorm = Math.max(0, Math.min(1, zcr * 9));
    const pitchNorm = Math.max(0, Math.min(1, (pitch - 90) / 180));
    const suggested = {
      T: Math.round(3 + 5 * zcrNorm),
      D: Math.round(2 + 4 * (1 - energy)),
      A: Math.round(2 + 4 * zcrNorm),
      V: Math.round(2 + 6 * energy),
      F: Math.round(8 - 5 * energy),
      C: Math.round(3 + 3 * (1 - pitchNorm))
    };
    Object.keys(suggested).forEach(function (key) {
      const input = container.querySelector('input[data-key="' + key + '"]');
      const label = container.querySelector('[data-value="' + key + '"]');
      if (input) {
        input.value = suggested[key];
        if (label) label.textContent = suggested[key];
      }
    });
    const resultBox = container.querySelector("#voiceResult");
    resultBox.innerHTML = '<div class="notice-bar">语音特征：均方根能量 ' + rms.toFixed(4) + "，过零率 " + zcr.toFixed(4) +
      "，基频 " + (pitch ? pitch.toFixed(1) + " Hz" : "未检出") + "。已把特征折算为建议分值，可继续手动调整。</div>";
    toast("语音特征采样完成，建议值已填入", "ok");
  } catch (error) {
    toast(error.name === "NotAllowedError" ? "麦克风授权被拒绝，仍可手动填写量表" : "语音采样未完成：" + error.message, "err");
  } finally {
    if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
    if (context) context.close();
    setBusy(button, false);
    button.textContent = "开始5秒语音采样";
  }
}

export default {
  render(container) {
    container.innerHTML =
      '<div class="panel-split">' +
        '<div class="card pad-lg"><div class="card-head"><div><h3 class="card-title">简版情绪状态量表</h3><div class="card-sub">请根据最近一周的真实感受评分，0表示完全没有，10表示非常明显</div></div><span class="tag teal" id="dominantTag">当前主导：' + dominantOf(DEFAULTS) + "</span></div>" +
          '<form id="assessmentForm">' + sliderRows() +
            '<div class="split-line"></div>' +
            '<div class="inline"><button class="btn primary" type="submit">生成推荐主题</button><a class="btn ghost" href="#/themes">不做测评，直接浏览主题</a></div>' +
          "</form>" +
        "</div>" +
        '<div class="card pad-lg"><div class="card-head"><div><h3 class="card-title">语音特征采样</h3><div class="card-sub">可选辅助方式，需麦克风授权</div></div></div>' +
          '<p class="small muted">朗读一段文字或自然说话5秒，系统计算均方根能量、过零率与基频，折算为量表建议值。该结果只作为填写参考，不替代本人判断。</p>' +
          '<button class="btn mt-12" id="voiceBtn" type="button">开始5秒语音采样</button>' +
          '<div id="voiceResult" class="mt-12"></div>' +
          '<div class="split-line"></div>' +
          '<h4 class="small">评分说明</h4>' +
          '<div class="kv mt-8"><dt>0-3</dt><dd>几乎没有或很轻微</dd><dt>4-6</dt><dd>中等程度，能感受到</dd><dt>7-9</dt><dd>明显，影响当前状态</dd><dt>10</dt><dd>非常强烈</dd></div>' +
          '<div class="notice-bar mt-16">测评结果仅用于生成放松方案，不构成医学诊断。如持续感到不适，请寻求专业帮助。</div>' +
        "</div>" +
      "</div>";
    const form = container.querySelector("#assessmentForm");
    const sync = function () {
      container.querySelectorAll("input[type=range][data-key]").forEach(function (input) {
        const label = container.querySelector('[data-value="' + input.dataset.key + '"]');
        if (label) label.textContent = input.value;
      });
      const tag = container.querySelector("#dominantTag");
      if (tag) tag.textContent = "当前主导：" + dominantOf(readScores(container));
    };
    form.addEventListener("input", sync);
    container.querySelector("#voiceBtn").addEventListener("click", function (event) {
      sampleVoice(container, event.currentTarget);
    });
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      setBusy(button, true, "正在计算…");
      try {
        const scores = readScores(container);
        const assessment = await api.post("/api/assessments", { scores: scores, method: "scale" });
        localStorage.setItem("p02_last_assessment", assessment.assessment.id);
        const recommendation = await api.post("/api/recommendations", { assessmentId: assessment.assessment.id, smart: true });
        toast("测评完成，已生成匹配主题", "ok");
        location.hash = "#/recommend/" + recommendation.recommendation.id;
      } catch (error) {
        toast(error.message, "err");
        setBusy(button, false);
      }
    });
  }
};
