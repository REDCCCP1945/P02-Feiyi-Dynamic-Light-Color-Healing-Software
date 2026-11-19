import api from "../api.js";
import { esc, toast, setBusy, table, statusBadge, formatDate } from "../ui.js";
import HealingRenderer from "../renderEngine.js";

const AUDIO = [["guzheng", "古琴"], ["bianzhong", "编钟"], ["chiba", "尺八"], ["rain", "雨声"]];

export default {
  async render(container) {
    const self = this;
    const elements = (await api.get("/api/elements?status=approved")).elements;
    const recipes = (await api.get("/api/recipes")).recipes;
    const assessmentId = localStorage.getItem("p02_last_assessment") || "";
    container.innerHTML =
      '<div class="panel-split">' +
        '<div class="card pad-lg"><div class="card-head"><div><h3 class="card-title">自定义疗愈配方</h3><div class="card-sub">参数越界会被服务端拒绝，合法配方可保存并在会话中使用</div></div></div>' +
          '<form id="recipeForm"><div class="grid cols-2">' +
            '<div class="field"><label>配方名称</label><input name="name" value="我的静谧配方"><div class="error-text" data-error="name"></div></div>' +
            '<div class="field"><label>绑定素材（1-2件）</label><select name="element1">' + elements.map(function (item) {
              return '<option value="' + item.id + '">' + esc(item.name) + " · " + esc(item.category) + "</option>";
            }).join("") + '</select><div class="error-text" data-error="elementIds"></div></div>' +
            '<div class="field"><label>第二件素材（可选）</label><select name="element2"><option value="">不选择</option>' + elements.map(function (item) {
              return '<option value="' + item.id + '">' + esc(item.name) + "</option>";
            }).join("") + "</select></div>" +
            '<div class="field"><label>环境音轨</label><select name="audioTrack">' + AUDIO.map(function (item) {
              return '<option value="' + item[0] + '">' + item[1] + "</option>";
            }).join("") + "</select></div>" +
            '<div class="field"><label>色相下限 / 上限</label><div class="inline"><input name="hueMin" type="number" value="190" min="0" max="360" style="width:48%"><input name="hueMax" type="number" value="230" min="0" max="360" style="width:48%"></div><div class="error-text" data-error="params"></div></div>' +
            '<div class="field"><label>饱和度下限 / 上限</label><div class="inline"><input name="satMin" type="number" value="28" min="20" max="80" style="width:48%"><input name="satMax" type="number" value="48" min="20" max="80" style="width:48%"></div></div>' +
            '<div class="field"><label>明度下限 / 上限</label><div class="inline"><input name="lightMin" type="number" value="42" min="30" max="80" style="width:48%"><input name="lightMax" type="number" value="60" min="30" max="80" style="width:48%"></div></div>' +
            '<div class="field"><label>呼吸频率（0.10-0.25Hz）</label><input name="breathFreq" type="number" step="0.01" value="0.12"></div>' +
            '<div class="field"><label>分形层级（3-6）</label><input name="fractalDepth" type="number" value="4" min="3" max="6"></div>' +
            '<div class="field"><label>粒子密度（0-100）</label><input name="particleDensity" type="number" value="45" min="0" max="100"></div>' +
            '<div class="field"><label>建议时长（5-60分钟）</label><input name="duration" type="number" value="18" min="5" max="60"></div>' +
          "</div>" +
          '<div class="inline mt-16"><button class="btn primary" type="submit">保存配方</button><button class="btn" type="button" id="previewBtn">刷新预览</button>' +
          '<span class="small muted">预览每帧由当前参数计算，不是预制动画。</span></div></form>' +
        "</div>" +
        '<div class="card"><div class="card-head"><div><h3 class="card-title">实时预览</h3><div class="card-sub">采样画布，与正式会话使用同一渲染引擎</div></div><span class="tag teal" id="previewInfo">—</span></div>' +
          '<div class="hero-canvas-wrap"><canvas id="previewCanvas" style="height:330px"></canvas></div>' +
          '<div class="small muted mt-12">提示：预览只播放画面，不播放声音；正式体验时可调节音量。</div>' +
        "</div>" +
      "</div>" +
      '<div class="card mt-24"><div class="card-head"><div><h3 class="card-title">已保存的配方</h3><div class="card-sub">仅本人可见</div></div></div>' +
        (recipes.length ? table(["名称", "呼吸频率", "时长", "素材数", "创建时间", "操作"], recipes.map(function (recipe) {
          return [esc(recipe.name), recipe.params.breathFreq + "Hz", recipe.params.duration + "分钟", String(recipe.elementIds.length), formatDate(recipe.createdAt, true),
            '<button class="btn ghost" data-use="' + recipe.id + '">使用此配方</button>'];
        })) : '<div class="empty">还没有保存过配方，可在左侧调整参数后保存。</div>') +
      "</div>";
    const form = container.querySelector("#recipeForm");
    const renderer = new HealingRenderer(container.querySelector("#previewCanvas"));
    const readParams = function () {
      return {
        hueMin: Number(form.hueMin.value),
        hueMax: Number(form.hueMax.value),
        satMin: Number(form.satMin.value),
        satMax: Number(form.satMax.value),
        lightMin: Number(form.lightMin.value),
        lightMax: Number(form.lightMax.value),
        breathFreq: Number(form.breathFreq.value),
        fractalDepth: Number(form.fractalDepth.value),
        particleDensity: Number(form.particleDensity.value),
        duration: Number(form.duration.value),
        audioTrack: form.audioTrack.value
      };
    };
    const selectedElements = function () {
      const ids = [form.element1.value];
      if (form.element2.value && form.element2.value !== form.element1.value) ids.push(form.element2.value);
      return ids.map(function (id) {
        const found = elements.find(function (item) { return item.id === id; });
        return found || { id: id, primaryColor: "#7fc6b8", secondaryColors: [], filePath: "" };
      });
    };
    const refresh = function () {
      renderer.setScene({ params: readParams(), elements: selectedElements() });
      renderer.start();
      setTimeout(function () {
        const stats = renderer.stats();
        const info = container.querySelector("#previewInfo");
        if (info) info.textContent = "帧率 " + stats.fps + " · " + (stats.color ? "H" + stats.color.h + " S" + stats.color.s + " L" + stats.color.l : "");
      }, 1200);
    };
    refresh();
    container.querySelector("#previewBtn").addEventListener("click", refresh);
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      setBusy(button, true, "保存中…");
      try {
        const params = readParams();
        await api.post("/api/recipes", {
          name: form.name.value.trim(),
          params: params,
          elementIds: selectedElements().map(function (item) { return item.id; })
        });
        toast("配方已保存", "ok");
        const view = container.closest("#view");
        await self.render(view);
      } catch (error) {
        const target = form.querySelector('[data-error="' + (error.field || "params") + '"]');
        if (target) target.textContent = error.message;
        toast(error.message, "err");
        setBusy(button, false);
      }
    });
    container.querySelectorAll("[data-use]").forEach(function (button) {
      button.addEventListener("click", async function () {
        if (!assessmentId) {
          toast("请先完成一次情绪测评，再开始体验", "err");
          location.hash = "#/assessment";
          return;
        }
        setBusy(button, true, "准备中…");
        try {
          const result = await api.post("/api/sessions", { assessmentId: assessmentId, recipeId: button.dataset.use });
          location.hash = "#/session/" + result.session.id;
        } catch (error) {
          toast(error.message, "err");
          setBusy(button, false);
        }
      });
    });
  }
};
