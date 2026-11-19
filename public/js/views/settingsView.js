import api from "../api.js";
import { esc, toast, setBusy, formError } from "../ui.js";

export default {
  async render(container) {
    const data = await api.get("/api/settings");
    const settings = data.settings;
    container.innerHTML = '<div class="card pad-lg" style="max-width:820px">' +
      '<div class="card-head"><div><h3 class="card-title">系统设置</h3><div class="card-sub">影响新会话的默认值、灯光亮度上限与日志保留</div></div></div>' +
      '<form id="settingsForm">' +
        '<div class="field"><label>默认呼吸频率（0.10-0.25Hz）</label><input name="defaultBreathFreq" type="number" step="0.01" value="' + settings.defaultBreathFreq + '"><div class="error-text" data-error="defaultBreathFreq"></div></div>' +
        '<div class="field"><label>灯光亮度上限（10-100）</label><input name="maxBrightness" type="number" value="' + settings.maxBrightness + '"><div class="error-text" data-error="maxBrightness"></div></div>' +
        '<div class="field"><label>智能匹配默认状态</label><select name="smartMatchDefault"><option value="1"' + (Number(settings.smartMatchDefault) === 1 ? " selected" : "") + '>默认开启</option><option value="0"' + (Number(settings.smartMatchDefault) === 0 ? " selected" : "") + ">默认关闭</option></select></div>" +
        '<div class="field"><label>日志保留天数（30-3650）</label><input name="retentionDays" type="number" value="' + settings.retentionDays + '"><div class="error-text" data-error="retentionDays"></div></div>' +
        '<div class="field"><label>色彩强度（50-120）</label><input name="colorIntensity" type="number" value="' + settings.colorIntensity + '"><div class="error-text" data-error="colorIntensity"></div></div>' +
        '<div class="field"><label>首页提示语（10-200字）</label><textarea name="notice" maxlength="200">' + esc(settings.notice) + '</textarea><div class="error-text" data-error="notice"></div></div>' +
        '<div class="notice-bar">亮度上限会实时约束灯光指令；色彩强度影响画面明度振幅；日志保留策略在每次写入日志时执行。</div>' +
        '<div class="inline mt-16"><button class="btn primary" type="submit">保存设置</button></div>' +
      "</form>" +
      '<div class="split-line"></div><div class="kv"><dt>最近修改人</dt><dd>' + esc(settings.updatedBy || "—") + '</dd><dt>最近修改时间</dt><dd>' + esc(settings.updatedAt || "—") + "</dd></div>" +
    "</div>";
    const form = container.querySelector("#settingsForm");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      setBusy(button, true, "保存中…");
      try {
        await api.post("/api/settings", {
          defaultBreathFreq: Number(form.defaultBreathFreq.value),
          maxBrightness: Number(form.maxBrightness.value),
          smartMatchDefault: Number(form.smartMatchDefault.value),
          retentionDays: Number(form.retentionDays.value),
          colorIntensity: Number(form.colorIntensity.value),
          notice: form.notice.value.trim()
        });
        toast("系统设置已保存", "ok");
        setBusy(button, false);
      } catch (error) {
        formError(form, error);
        setBusy(button, false);
      }
    });
  }
};
