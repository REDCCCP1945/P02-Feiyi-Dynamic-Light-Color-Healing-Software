import api from "../api.js";
import { esc, toast, openModal, setBusy, formatDuration } from "../ui.js";
import HealingRenderer from "../renderEngine.js";
import AmbientAudio from "../audioEngine.js";

const AUDIO_NAMES = { guzheng: "古琴", bianzhong: "编钟", chiba: "尺八", rain: "雨声" };

function elapsedOf(session) {
  let end = Date.now();
  if (session.endAt) end = new Date(session.endAt).getTime();
  let ms = end - new Date(session.startAt).getTime() - (session.pausedMs || 0);
  if (session.status === "paused" && session.pauseStartedAt) {
    ms -= Date.now() - new Date(session.pauseStartedAt).getTime();
  }
  return Math.max(0, Math.round(ms / 1000));
}

function postFormHtml() {
  const dims = [["T", "紧张"], ["D", "低落"], ["A", "愤怒"], ["V", "活力"], ["F", "疲劳"], ["C", "困惑"]];
  return '<form id="finishForm">' +
    '<p class="small muted">请根据此刻的感受再次评分。改善度由前测与后测的情绪负荷差值计算。</p>' +
    '<div class="grid cols-2">' + dims.map(function (item) {
      return '<div class="field"><label>' + item[1] + '</label><input type="range" min="0" max="10" value="4" name="' + item[0] + '"><div class="inline"><small class="muted">0</small><span class="spacer"></span><strong data-out="' + item[0] + '">4</strong><span class="spacer"></span><small class="muted">10</small></div></div>';
    }).join("") + "</div>" +
    '<div class="field"><label>整体评分</label><select name="rating"><option value="5">5 - 非常舒适</option><option value="4" selected>4 - 比较舒适</option><option value="3">3 - 一般</option><option value="2">2 - 有些不舒服</option><option value="1">1 - 很不舒服</option></select></div>' +
    '<div class="field"><label>备注（可选）</label><textarea name="note" maxlength="200" placeholder="记录本次体验的感受"></textarea><div class="error-text" data-error="note"></div></div>' +
    '<div class="error-text" data-error="rating"></div>' +
    '<div class="modal-foot"><button class="btn ghost" type="button" data-close="1">继续体验</button><button class="btn primary" type="submit">结束并保存记录</button></div>' +
  "</form>";
}

export default {
  async render(container, params) {
    const session = (await api.get("/api/sessions/" + params.id)).session;
    if (session.status !== "running" && session.status !== "paused") {
      location.hash = session.status === "completed" ? "#/report/" + session.id : "#/records";
      return;
    }
    container.innerHTML =
      '<div class="session-stage" id="stage"><canvas id="sessionCanvas"></canvas>' +
        '<div class="session-overlay">' +
          '<div class="session-top"><div><div class="session-title">' + esc(session.themeName) + '</div>' +
            '<div class="session-sub">' + esc(session.themeCode) + " · " + session.elements.length + "件非遗素材 · " + (AUDIO_NAMES[session.params.audioTrack] || "") + "音轨</div></div>" +
            '<div class="session-metrics"><div class="metric-chip">分形层级<strong>' + session.params.fractalDepth + ' 层</strong></div>' +
            '<div class="metric-chip">当前色相<strong id="mHue">—</strong></div>' +
            '<div class="metric-chip">呼吸频率<strong>' + session.params.breathFreq + 'Hz</strong></div>' +
            '<div class="metric-chip">已进行<strong id="mTime">' + formatDuration(elapsedOf(session)) + "</strong></div></div></div>" +
          '<div class="session-breath"><div class="breath-ring"></div><span id="breathText">跟随光色呼吸</span></div>' +
          '<div class="session-controls"><button class="btn" id="pauseBtn">' + (session.status === "paused" ? "继续" : "暂停") + "</button>" +
            '<div class="timer" id="timer">' + formatDuration(elapsedOf(session)) + "</div>" +
            '<button class="btn" id="soundBtn">开启环境音</button>' +
            '<button class="btn ghost" id="lightBtn">灯光指令</button>' +
            '<button class="btn danger" id="endBtn">结束</button></div>' +
        "</div>" +
      "</div>" +
      '<div class="card mt-24"><div class="grid cols-3"><div><h4 class="small muted mb-8">素材</h4>' +
        session.elements.map(function (item) { return '<div class="inline mb-8"><span class="tag teal">' + esc(item.name) + "</span></div>"; }).join("") + "</div>" +
        '<div><h4 class="small muted mb-8">参数</h4><div class="small muted">H ' + session.params.hueMin + "-" + session.params.hueMax + "° · S " + session.params.satMin + "-" + session.params.satMax + "% · L " + session.params.lightMin + "-" + session.params.lightMax + "%<br>分形 " + session.params.fractalDepth + " 层 · 粒子 " + session.params.particleDensity + "</div></div>" +
        '<div><h4 class="small muted mb-8">体验提示</h4><div class="small muted">若感到不适可随时结束；只有达到60秒且完成反馈才会保存为记录。</div></div></div></div>';

    const renderer = new HealingRenderer(container.querySelector("#sessionCanvas"));
    const audio = new AmbientAudio();
    renderer.setScene({
      params: session.params,
      elements: session.elements,
      reduceMotion: Boolean((api.user().preferences || {}).reduceMotion)
    });
    renderer.start();
    let soundOn = false;
    let paused = session.status === "paused";
    if (paused) renderer.pause();
    const startAt = new Date(session.startAt).getTime();
    let pausedMs = session.pausedMs || 0;
    let pauseStart = paused ? Date.now() : 0;
    const updateStats = function () {
      const stats = renderer.stats();
      const hue = container.querySelector("#mHue");
      const time = container.querySelector("#mTime");
      const timer = container.querySelector("#timer");
      if (hue) hue.textContent = stats.color ? stats.color.h + "°" : "—";
      const seconds = paused
        ? Math.round((pauseStart - startAt - pausedMs) / 1000)
        : Math.round((Date.now() - startAt - pausedMs) / 1000);
      const text = formatDuration(Math.max(0, seconds));
      if (time) time.textContent = text;
      if (timer) timer.textContent = text;
      if (soundOn) renderer.setAudioLevels(audio.getLevels(18));
    };
    const statTimer = setInterval(updateStats, 500);
    updateStats();

    const pauseBtn = container.querySelector("#pauseBtn");
    pauseBtn.addEventListener("click", async function () {
      pauseBtn.disabled = true;
      try {
        if (!paused) {
          await api.post("/api/sessions/" + session.id + "/pause");
          paused = true;
          pauseStart = Date.now();
          renderer.pause();
          if (soundOn) audio.setVolume(0);
          pauseBtn.textContent = "继续";
        } else {
          await api.post("/api/sessions/" + session.id + "/resume");
          pausedMs += Date.now() - pauseStart;
          paused = false;
          renderer.resume();
          if (soundOn) audio.setVolume(0.5);
          pauseBtn.textContent = "暂停";
        }
      } catch (error) {
        toast(error.message, "err");
      } finally {
        pauseBtn.disabled = false;
      }
    });

    const soundBtn = container.querySelector("#soundBtn");
    soundBtn.addEventListener("click", async function () {
      soundBtn.disabled = true;
      const original = soundBtn.textContent;
      soundBtn.textContent = soundOn ? "正在关闭…" : "正在启动…";
      try {
        if (!soundOn) {
          await audio.start(session.params.audioTrack, session.params.breathFreq, 0.5);
          soundOn = true;
          soundBtn.textContent = "关闭环境音";
          toast("环境音已开启，音量可在外放设备上调整", "ok");
        } else {
          audio.stop();
          soundOn = false;
          soundBtn.textContent = "开启环境音";
        }
      } catch (error) {
        soundBtn.textContent = original;
        toast("环境音启动失败：" + error.message, "err");
      } finally {
        soundBtn.disabled = false;
      }
    });

    const endBtn = container.querySelector("#endBtn");
    endBtn.addEventListener("click", function () {
      const modal = openModal({
        title: "结束疗愈并保存记录",
        sub: "记录仅本人可见，可在“我的记录”中回看或删除",
        body: postFormHtml(),
        foot: false,
        wide: true
      });
      const form = modal.root.querySelector("#finishForm");
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
        const postScores = {};
        ["T", "D", "A", "V", "F", "C"].forEach(function (key) {
          postScores[key] = Number(form[key].value);
        });
        try {
          const result = await api.post("/api/sessions/" + session.id + "/complete", {
            postScores: postScores,
            rating: Number(form.rating.value),
            note: form.note.value.trim()
          });
          modal.close();
          renderer.stop();
          audio.stop();
          clearInterval(statTimer);
          location.hash = "#/report/" + result.session.id;
        } catch (error) {
          toast(error.message, "err");
          setBusy(button, false);
        }
      });
    });

    const lightBtn = container.querySelector("#lightBtn");
    lightBtn.addEventListener("click", async function () {
      try {
        const result = await api.get("/api/light/frame?sessionId=" + session.id + "&device=LAMP-01");
        const frame = result.frame;
        const modal = openModal({
          title: "灯光控制指令",
          sub: "指令可导出为JSON，由支持IHTP格式的灯光网关接入",
          body: '<p class="small muted">' + esc(result.explanation) + "</p>" +
            '<div class="field mt-12"><label>目标设备</label><input id="deviceInput" value="LAMP-01"></div>' +
            '<div class="field"><label>亮度（1-系统上限）</label><input id="brightnessInput" type="number" value="' + frame.payload.brightness + '" min="1" max="100"></div>' +
            '<div class="code-block" id="frameBox">' + esc(JSON.stringify(frame, null, 2)) + "</div>" +
            '<div class="modal-foot"><button class="btn ghost" id="refreshFrame" type="button">刷新指令</button><button class="btn primary" id="downloadFrame" type="button">下载指令</button></div>',
          foot: false,
          wide: true
        });
        const refreshBox = async function () {
          const device = modal.root.querySelector("#deviceInput").value.trim() || "LAMP-01";
          const brightness = modal.root.querySelector("#brightnessInput").value || frame.payload.brightness;
          const next = await api.get("/api/light/frame?sessionId=" + session.id + "&device=" + encodeURIComponent(device) + "&brightness=" + encodeURIComponent(brightness));
          modal.root.querySelector("#frameBox").textContent = JSON.stringify(next.frame, null, 2);
          modal.root.dataset.frame = JSON.stringify(next.frame);
          toast("指令已刷新", "ok");
        };
        modal.root.dataset.frame = JSON.stringify(frame);
        modal.root.querySelector("#refreshFrame").addEventListener("click", refreshBox);
        modal.root.querySelector("#downloadFrame").addEventListener("click", async function () {
          try {
            const current = JSON.parse(modal.root.dataset.frame);
            const result = await api.post("/api/light/export", { frame: current });
            api.download(result.fileName, JSON.stringify(result.frame, null, 2), "application/json");
            toast("灯光指令已下载", "ok");
          } catch (error) {
            toast(error.message, "err");
          }
        });
      } catch (error) {
        toast(error.message, "err");
      }
    });

    const cleanup = function () {
      clearInterval(statTimer);
      renderer.stop();
      audio.stop();
    };
    window.addEventListener("hashchange", cleanup, { once: true });
  }
};
