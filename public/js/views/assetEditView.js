import api from "../api.js";
import { esc, toast, setBusy, formError } from "../ui.js";

const CATEGORIES = ["剪纸", "木版年画", "扎染", "皮影", "脸谱", "陶瓷纹样", "其他"];
const EMOTIONS = ["平静", "专注", "活力", "安全感", "秩序感", "助眠", "宣泄"];
const COPYRIGHT = ["公开领域传统纹样", "已获授权的数字化采集件", "原创绘制"];

export default {
  async render(container, params) {
    const editing = Boolean(params && params.id);
    let element = null;
    if (editing) {
      element = (await api.get("/api/elements/" + params.id)).element;
    }
    container.innerHTML = '<div class="card pad-lg" style="max-width:900px">' +
      '<div class="card-head"><div><h3 class="card-title">' + (editing ? "编辑素材" : "上传非遗素材") + '</h3><div class="card-sub">支持SVG、PNG、JSON，单文件不超过2MB；上传后进入待审核状态</div></div>' +
      '<a class="btn ghost" href="#/library">返回素材库</a></div>' +
      '<form id="assetForm"><div class="grid cols-2">' +
        '<div class="field"><label>素材名称</label><input name="name" value="' + (element ? esc(element.name) : "") + '" maxlength="20"><div class="error-text" data-error="name"></div></div>' +
        '<div class="field"><label>非遗类别</label><select name="category">' + CATEGORIES.map(function (item) {
          return '<option value="' + item + '"' + (element && element.category === item ? " selected" : "") + ">" + item + "</option>";
        }).join("") + '</select><div class="error-text" data-error="category"></div></div>' +
        '<div class="field"><label>文件类型</label><select name="fileType"><option value="SVG">SVG</option><option value="PNG">PNG</option><option value="JSON">JSON</option></select></div>' +
        '<div class="field"><label>主色</label><input name="primaryColor" value="' + (element ? element.primaryColor : "#4A6B8A") + '" placeholder="#RRGGBB"><div class="error-text" data-error="primaryColor"></div></div>' +
        '<div class="field"><label>辅助色（逗号分隔）</label><input name="secondaryColors" value="' + (element ? element.secondaryColors.join(",") : "#DDEAF2,#355C7D") + '"></div>' +
        '<div class="field"><label>版权状态</label><select name="copyrightStatus">' + COPYRIGHT.map(function (item) {
          return '<option value="' + item + '"' + (element && element.copyrightStatus === item ? " selected" : "") + ">" + item + "</option>";
        }).join("") + "</select></div>" +
        '<div class="field"><label>来源</label><input name="source" value="' + (element ? esc(element.source) : "传统纹样公开资料整理") + '"><div class="error-text" data-error="source"></div></div>' +
        '<div class="field"><label>采集地</label><input name="collectionPlace" value="' + (element ? esc(element.collectionPlace) : "陕西") + '"><div class="error-text" data-error="collectionPlace"></div></div>' +
      "</div>" +
      '<div class="field"><label>情绪标签（1-3项）</label><div class="inline" id="tagBox">' + EMOTIONS.map(function (tag) {
        const checked = element && element.emotionTags.indexOf(tag) >= 0;
        return '<label class="tag ' + (checked ? "teal" : "") + '" style="cursor:pointer;padding:6px 10px"><input type="checkbox" name="tags" value="' + tag + '"' + (checked ? " checked" : "") + ' style="margin-right:6px">' + tag + "</label>";
      }).join("") + '</div><div class="error-text" data-error="emotionTags"></div></div>' +
      '<div class="field"><label>文化说明（10-500字）</label><textarea name="cultureText" maxlength="500">' + (element ? esc(element.cultureText) : "") + '</textarea><div class="error-text" data-error="cultureText"></div></div>' +
      '<div class="grid cols-2"><div class="field"><label>技法说明</label><input name="technique" value="' + (element ? esc(element.technique) : "") + '"><div class="error-text" data-error="technique"></div></div>' +
      '<div class="field"><label>寓意说明</label><input name="symbolism" value="' + (element ? esc(element.symbolism) : "") + '"><div class="error-text" data-error="symbolism"></div></div></div>' +
      (editing ? '<div class="notice-bar">编辑后素材会重新进入待审核状态；已启用主题仍保留会话快照。</div>' :
        '<div class="field"><label>素材文件</label><div class="upload-box" id="uploadBox">点击选择SVG、PNG或JSON文件<div class="small mt-8" id="fileInfo">尚未选择文件</div></div>' +
        '<img id="preview" class="preview-img hidden" alt=""><div class="error-text" data-error="file"></div></div>') +
      '<div class="inline mt-16"><button class="btn primary" type="submit">' + (editing ? "保存修改" : "上传并提交审核") + '</button><a class="btn ghost" href="#/library">取消</a></div>' +
      "</form></div>";

    const form = container.querySelector("#assetForm");
    let dataUrl = "";
    let fileName = "";
    if (!editing) {
      const box = container.querySelector("#uploadBox");
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".svg,.png,.json,image/svg+xml,image/png,application/json";
      input.style.display = "none";
      container.appendChild(input);
      box.addEventListener("click", function () { input.click(); });
      input.addEventListener("change", async function () {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
          toast("文件不得超过2MB", "err");
          return;
        }
        fileName = file.name;
        const ext = fileName.split(".").pop().toUpperCase();
        if (["SVG", "PNG", "JSON"].indexOf(ext) >= 0) form.fileType.value = ext;
        dataUrl = await api.readFileAsDataUrl(file);
        container.querySelector("#fileInfo").textContent = fileName + " · " + Math.round(file.size / 1024) + " KB";
        const preview = container.querySelector("#preview");
        if (ext === "SVG" || ext === "PNG") {
          preview.src = dataUrl;
          preview.classList.remove("hidden");
        }
      });
    }
    form.querySelectorAll("#tagBox input[type=checkbox]").forEach(function (input) {
      input.addEventListener("change", function () {
        input.closest("label").classList.toggle("teal", input.checked);
      });
    });
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      form.querySelectorAll(".error-text").forEach(function (item) { item.textContent = ""; });
      const button = form.querySelector("button[type=submit]");
      const tags = [];
      form.querySelectorAll("#tagBox input:checked").forEach(function (input) { tags.push(input.value); });
      const payload = {
        name: form.name.value.trim(),
        category: form.category.value,
        fileType: form.fileType.value,
        primaryColor: form.primaryColor.value.trim(),
        secondaryColors: form.secondaryColors.value.split(",").map(function (item) { return item.trim(); }).filter(Boolean),
        copyrightStatus: form.copyrightStatus.value,
        source: form.source.value.trim(),
        collectionPlace: form.collectionPlace.value.trim(),
        cultureText: form.cultureText.value.trim(),
        technique: form.technique.value.trim(),
        symbolism: form.symbolism.value.trim(),
        emotionTags: tags
      };
      if (!editing) {
        if (!dataUrl) {
          formError(form, { message: "请选择素材文件", field: "file" });
          return;
        }
        payload.dataUrl = dataUrl;
      }
      setBusy(button, true, "提交中…");
      try {
        if (editing) {
          await api.put("/api/elements/" + params.id, payload);
          toast("素材已保存并重新进入待审核", "ok");
        } else {
          await api.post("/api/elements", payload);
          toast("素材已上传，等待管理员审核", "ok");
        }
        location.hash = "#/library";
      } catch (error) {
        formError(form, error);
        setBusy(button, false);
      }
    });
  }
};
