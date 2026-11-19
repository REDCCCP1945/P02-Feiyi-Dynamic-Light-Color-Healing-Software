import api from "../api.js";
import { esc, toast, setBusy, formError } from "../ui.js";

const AUDIO = [["guzheng", "古琴"], ["bianzhong", "编钟"], ["chiba", "尺八"], ["rain", "雨声"]];

export default {
  async render(container, params) {
    const editing = Boolean(params && params.id);
    const elements = (await api.get("/api/elements?status=approved")).elements;
    let theme = null;
    if (editing) theme = (await api.get("/api/themes/" + params.id)).theme;
    const bound = theme ? theme.elementIds : [];
    const paramsValue = theme ? theme.params : { hueMin: 190, hueMax: 230, satMin: 26, satMax: 44, lightMin: 42, lightMax: 60, breathFreq: 0.12, fractalDepth: 4, particleDensity: 45, duration: 20, audioTrack: "guzheng" };
    container.innerHTML = '<div class="card pad-lg" style="max-width:960px">' +
      '<div class="card-head"><div><h3 class="card-title">' + (editing ? "编辑疗愈主题" : "新建疗愈主题") + '</h3><div class="card-sub">只能绑定审核通过的素材；启用后进入推荐候选池</div></div><a class="btn ghost" href="#/theme-manage">返回主题管理</a></div>' +
      '<form id="themeForm"><div class="grid cols-2">' +
        '<div class="field"><label>主题名称</label><input name="name" value="' + (theme ? esc(theme.name) : "") + '" maxlength="20"><div class="error-text" data-error="name"></div></div>' +
        '<div class="field"><label>主题状态</label><select name="status"><option value="draft"' + (theme && theme.status === "draft" ? " selected" : "") + '>草稿</option><option value="enabled"' + (theme && theme.status === "enabled" ? " selected" : "") + '>启用</option><option value="disabled"' + (theme && theme.status === "disabled" ? " selected" : "") + '>停用</option></select></div>' +
      "</div>" +
      '<div class="field"><label>主题说明（10-300字）</label><textarea name="description" maxlength="300">' + (theme ? esc(theme.description) : "") + '</textarea><div class="error-text" data-error="description"></div></div>' +
      '<div class="field"><label>绑定素材（至少1件，仅列出已审核素材）</label><div class="grid cols-2" id="elementBox">' + elements.map(function (element) {
        const checked = bound.indexOf(element.id) >= 0;
        return '<label class="tag ' + (checked ? "teal" : "") + '" style="cursor:pointer;padding:8px 10px;display:flex;gap:8px;align-items:center"><input type="checkbox" name="elements" value="' + element.id + '"' + (checked ? " checked" : "") + '><img src="' + esc(element.filePath) + '" style="width:30px;height:30px;object-fit:contain;background:#081014;border-radius:6px">' + esc(element.name) + "</label>";
      }).join("") + '</div><div class="error-text" data-error="elementIds"></div></div>' +
      '<div class="section-title">目标PAD</div><div class="grid cols-3">' +
        '<div class="field"><label>愉悦度（-1至1）</label><input name="padP" type="number" step="0.01" value="' + (theme ? theme.targetPAD.p : 0.5) + '"></div>' +
        '<div class="field"><label>唤醒度（-1至1）</label><input name="padA" type="number" step="0.01" value="' + (theme ? theme.targetPAD.a : -0.3) + '"></div>' +
        '<div class="field"><label>优势度（-1至1）</label><input name="padD" type="number" step="0.01" value="' + (theme ? theme.targetPAD.d : 0.3) + '"></div>' +
      "</div>" +
      '<div class="section-title">动态参数</div><div class="grid cols-3">' +
        '<div class="field"><label>色相下限</label><input name="hueMin" type="number" value="' + paramsValue.hueMin + '" min="0" max="360"></div>' +
        '<div class="field"><label>色相上限</label><input name="hueMax" type="number" value="' + paramsValue.hueMax + '" min="0" max="360"></div>' +
        '<div class="field"><label>呼吸频率（0.10-0.25）</label><input name="breathFreq" type="number" step="0.01" value="' + paramsValue.breathFreq + '"></div>' +
        '<div class="field"><label>饱和度下限</label><input name="satMin" type="number" value="' + paramsValue.satMin + '" min="20" max="80"></div>' +
        '<div class="field"><label>饱和度上限</label><input name="satMax" type="number" value="' + paramsValue.satMax + '" min="20" max="80"></div>' +
        '<div class="field"><label>分形层级（3-6）</label><input name="fractalDepth" type="number" value="' + paramsValue.fractalDepth + '" min="3" max="6"></div>' +
        '<div class="field"><label>明度下限</label><input name="lightMin" type="number" value="' + paramsValue.lightMin + '" min="30" max="80"></div>' +
        '<div class="field"><label>明度上限</label><input name="lightMax" type="number" value="' + paramsValue.lightMax + '" min="30" max="80"></div>' +
        '<div class="field"><label>粒子密度（0-100）</label><input name="particleDensity" type="number" value="' + paramsValue.particleDensity + '" min="0" max="100"></div>' +
        '<div class="field"><label>建议时长（5-60分钟）</label><input name="duration" type="number" value="' + paramsValue.duration + '" min="5" max="60"></div>' +
        '<div class="field"><label>环境音轨</label><select name="audioTrack">' + AUDIO.map(function (item) {
          return '<option value="' + item[0] + '"' + (paramsValue.audioTrack === item[0] ? " selected" : "") + ">" + item[1] + "</option>";
        }).join("") + "</select></div>" +
      "</div>" +
      '<div class="error-text" data-error="params"></div>' +
      '<div class="inline mt-16"><button class="btn primary" type="submit">' + (editing ? "保存主题" : "创建主题") + '</button><a class="btn ghost" href="#/theme-manage">取消</a></div></form></div>';
    const form = container.querySelector("#themeForm");
    form.querySelectorAll("#elementBox input").forEach(function (input) {
      input.addEventListener("change", function () {
        input.closest("label").classList.toggle("teal", input.checked);
      });
    });
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      const ids = [];
      form.querySelectorAll("#elementBox input:checked").forEach(function (input) { ids.push(input.value); });
      const payload = {
        name: form.name.value.trim(),
        description: form.description.value.trim(),
        status: form.status.value,
        elementIds: ids,
        targetPAD: { p: Number(form.padP.value), a: Number(form.padA.value), d: Number(form.padD.value) },
        params: {
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
        }
      };
      setBusy(button, true, "保存中…");
      try {
        if (editing) await api.put("/api/themes/" + params.id, payload);
        else await api.post("/api/themes", payload);
        toast("主题已保存", "ok");
        location.hash = "#/theme-manage";
      } catch (error) {
        formError(form, error);
        setBusy(button, false);
      }
    });
  }
};
