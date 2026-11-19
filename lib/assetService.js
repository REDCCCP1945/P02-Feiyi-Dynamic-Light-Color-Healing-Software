const fs = require("fs");
const path = require("path");
const store = require("./store");
const audit = require("./audit");
const validate = require("./validate");

const CATEGORIES = ["剪纸", "木版年画", "扎染", "皮影", "脸谱", "陶瓷纹样", "其他"];
const EMOTIONS = ["平静", "专注", "活力", "安全感", "秩序感", "助眠", "宣泄"];
const FILE_TYPES = ["SVG", "PNG", "JSON"];
const COPYRIGHT = ["公开领域传统纹样", "已获授权的数字化采集件", "原创绘制"];

function uploadDir() {
  return path.join(store.dataPath(), "uploads");
}

function metaOf(element) {
  return {
    id: element.id,
    code: element.code,
    name: element.name,
    category: element.category,
    fileType: element.fileType,
    filePath: element.filePath,
    primaryColor: element.primaryColor,
    secondaryColors: element.secondaryColors,
    emotionTags: element.emotionTags,
    cultureText: element.cultureText,
    technique: element.technique,
    symbolism: element.symbolism,
    source: element.source,
    collectionPlace: element.collectionPlace,
    copyrightStatus: element.copyrightStatus,
    auditStatus: element.auditStatus,
    auditNote: element.auditNote,
    createdBy: element.createdBy,
    createdByName: element.createdByName,
    createdAt: element.createdAt
  };
}

function list(ctx) {
  const q = ctx.query;
  const keyword = (q.get("keyword") || "").trim().toLowerCase();
  const category = q.get("category") || "";
  const emotion = q.get("emotion") || "";
  const status = q.get("status") || "";
  let rows = store.db.ichElements.slice();
  if (ctx.user.role === "USER") rows = rows.filter(function (item) { return item.auditStatus === "approved"; });
  if (status) rows = rows.filter(function (item) { return item.auditStatus === status; });
  if (category) rows = rows.filter(function (item) { return item.category === category; });
  if (emotion) rows = rows.filter(function (item) { return item.emotionTags.indexOf(emotion) >= 0; });
  if (keyword) {
    rows = rows.filter(function (item) {
      return (item.name + item.category + item.cultureText + item.emotionTags.join("")).toLowerCase().indexOf(keyword) >= 0;
    });
  }
  rows.sort(function (a, b) { return a.code < b.code ? -1 : 1; });
  ctx.ok({ total: rows.length, elements: rows.map(metaOf), categories: CATEGORIES, emotions: EMOTIONS });
}

function detail(ctx) {
  const element = store.db.ichElements.find(function (item) { return item.id === ctx.params[0]; });
  if (!element) {
    ctx.fail(404, "素材不存在");
    return;
  }
  if (ctx.user.role === "USER" && element.auditStatus !== "approved") {
    ctx.fail(404, "素材不存在");
    return;
  }
  ctx.ok({ element: metaOf(element), categories: CATEGORIES, emotions: EMOTIONS });
}

function decodeDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || ""));
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

function checkContent(fileType, buffer) {
  if (fileType === "PNG") {
    if (buffer.length < 8 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
      return "PNG文件头不正确";
    }
    return null;
  }
  if (fileType === "SVG") {
    const text = buffer.toString("utf8");
    if (text.indexOf("<svg") < 0) return "SVG内容缺少<svg>根元素";
    return null;
  }
  try {
    const obj = JSON.parse(buffer.toString("utf8"));
    if (!obj || typeof obj.name !== "string") return "JSON素材须包含name字段";
  } catch (e) {
    return "JSON内容无法解析";
  }
  return null;
}

function parseBody(ctx) {
  const body = ctx.body || {};
  const name = validate.text(body.name, "素材名称", 2, 20);
  if (!name.ok) return name;
  const category = validate.oneOf(body.category, "非遗类别", CATEGORIES);
  if (!category.ok) return category;
  const fileType = validate.oneOf(body.fileType, "文件类型", FILE_TYPES);
  if (!fileType.ok) return fileType;
  const culture = validate.text(body.cultureText, "文化说明", 10, 500);
  if (!culture.ok) return culture;
  const technique = validate.text(body.technique, "技法说明", 2, 100);
  if (!technique.ok) return technique;
  const symbolism = validate.text(body.symbolism, "寓意说明", 2, 200);
  if (!symbolism.ok) return symbolism;
  const source = validate.text(body.source, "来源", 2, 100);
  if (!source.ok) return source;
  const place = validate.text(body.collectionPlace, "采集地", 2, 60);
  if (!place.ok) return place;
  const copyright = validate.oneOf(body.copyrightStatus, "版权状态", COPYRIGHT);
  if (!copyright.ok) return copyright;
  const tags = validate.tags(body.emotionTags, "情绪标签", 1, 3);
  if (!tags.ok) return tags;
  tags.value.forEach(function (tag) {
    if (EMOTIONS.indexOf(tag) < 0) {
      tags.ok = false;
      tags.message = "情绪标签取值不在允许范围内";
    }
  });
  if (!tags.ok) return tags;
  if (!/^#[0-9A-Fa-f]{6}$/.test(String(body.primaryColor || ""))) {
    return { ok: false, message: "主色须为#RRGGBB格式", field: "primaryColor" };
  }
  const secondary = Array.isArray(body.secondaryColors) ? body.secondaryColors.slice(0, 4) : [];
  for (const color of secondary) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(String(color))) {
      return { ok: false, message: "辅助色须为#RRGGBB格式", field: "secondaryColors" };
    }
  }
  const decoded = decodeDataUrl(body.dataUrl);
  if (!decoded) {
    return { ok: false, message: "请选择要上传的素材文件", field: "file" };
  }
  if (decoded.buffer.length > 2 * 1024 * 1024) {
    return { ok: false, message: "文件不得超过2MB", field: "file" };
  }
  const ext = fileType.value.toLowerCase();
  const expectMime = { SVG: "image/svg+xml", PNG: "image/png", JSON: "application/json" }[fileType.value];
  if (decoded.mime !== expectMime) {
    return { ok: false, message: "文件类型与声明不一致", field: "file" };
  }
  const contentError = checkContent(fileType.value, decoded.buffer);
  if (contentError) {
    return { ok: false, message: contentError, field: "file" };
  }
  return {
    ok: true,
    value: {
      name: name.value,
      category: category.value,
      fileType: fileType.value,
      cultureText: culture.value,
      technique: technique.value,
      symbolism: symbolism.value,
      source: source.value,
      collectionPlace: place.value,
      copyrightStatus: copyright.value,
      emotionTags: tags.value,
      primaryColor: body.primaryColor.toUpperCase(),
      secondaryColors: secondary.map(function (c) { return c.toUpperCase(); }),
      buffer: decoded.buffer,
      ext: ext
    }
  };
}

function create(ctx) {
  const parsed = parseBody(ctx);
  if (!parsed.ok) {
    ctx.fail(400, parsed.message, parsed.field);
    return;
  }
  const data = parsed.value;
  const elementId = store.id("E");
  const fileName = elementId + "." + data.ext;
  fs.writeFileSync(path.join(uploadDir(), fileName), data.buffer);
  const element = {
    id: elementId,
    code: "ICH-" + String(store.db.ichElements.length + 1).padStart(3, "0"),
    name: data.name,
    category: data.category,
    fileType: data.fileType,
    filePath: "/files/" + fileName,
    mime: { SVG: "image/svg+xml", PNG: "image/png", JSON: "application/json" }[data.fileType],
    primaryColor: data.primaryColor,
    secondaryColors: data.secondaryColors,
    emotionTags: data.emotionTags,
    cultureText: data.cultureText,
    technique: data.technique,
    symbolism: data.symbolism,
    source: data.source,
    collectionPlace: data.collectionPlace,
    copyrightStatus: data.copyrightStatus,
    auditStatus: "pending",
    auditNote: "",
    createdBy: ctx.user.id,
    createdByName: ctx.user.name,
    createdAt: store.now()
  };
  store.db.ichElements.push(element);
  store.save();
  audit.write(ctx.user, "素材", "上传素材", element.code + " " + element.name, "类别：" + element.category + "，待审核", ctx.req);
  ctx.ok({ element: metaOf(element) });
}

function update(ctx) {
  const element = store.db.ichElements.find(function (item) { return item.id === ctx.params[0]; });
  if (!element) {
    ctx.fail(404, "素材不存在");
    return;
  }
  if (ctx.user.role !== "ADMIN" && element.createdBy !== ctx.user.id) {
    ctx.fail(403, "只能编辑本人上传的素材");
    return;
  }
  const body = ctx.body || {};
  const name = validate.text(body.name, "素材名称", 2, 20);
  if (!name.ok) { ctx.fail(400, name.message, name.field); return; }
  const category = validate.oneOf(body.category, "非遗类别", CATEGORIES);
  if (!category.ok) { ctx.fail(400, category.message, category.field); return; }
  const culture = validate.text(body.cultureText, "文化说明", 10, 500);
  if (!culture.ok) { ctx.fail(400, culture.message, culture.field); return; }
  const technique = validate.text(body.technique, "技法说明", 2, 100);
  if (!technique.ok) { ctx.fail(400, technique.message, technique.field); return; }
  const symbolism = validate.text(body.symbolism, "寓意说明", 2, 200);
  if (!symbolism.ok) { ctx.fail(400, symbolism.message, symbolism.field); return; }
  const source = validate.text(body.source, "来源", 2, 100);
  if (!source.ok) { ctx.fail(400, source.message, source.field); return; }
  const place = validate.text(body.collectionPlace, "采集地", 2, 60);
  if (!place.ok) { ctx.fail(400, place.message, place.field); return; }
  const copyright = validate.oneOf(body.copyrightStatus, "版权状态", COPYRIGHT);
  if (!copyright.ok) { ctx.fail(400, copyright.message, copyright.field); return; }
  const tags = validate.tags(body.emotionTags, "情绪标签", 1, 3);
  if (!tags.ok) { ctx.fail(400, tags.message, tags.field); return; }
  if (!/^#[0-9A-Fa-f]{6}$/.test(String(body.primaryColor || ""))) {
    ctx.fail(400, "主色须为#RRGGBB格式", "primaryColor");
    return;
  }
  element.name = name.value;
  element.category = category.value;
  element.cultureText = culture.value;
  element.technique = technique.value;
  element.symbolism = symbolism.value;
  element.source = source.value;
  element.collectionPlace = place.value;
  element.copyrightStatus = copyright.value;
  element.emotionTags = tags.value;
  element.primaryColor = body.primaryColor.toUpperCase();
  element.auditStatus = "pending";
  element.auditNote = "";
  store.save();
  audit.write(ctx.user, "素材", "编辑素材", element.code + " " + element.name, "重新进入待审核", ctx.req);
  ctx.ok({ element: metaOf(element) });
}

function auditElement(ctx) {
  const element = store.db.ichElements.find(function (item) { return item.id === ctx.params[0]; });
  if (!element) {
    ctx.fail(404, "素材不存在");
    return;
  }
  const body = ctx.body || {};
  const decision = validate.oneOf(body.decision, "审核结论", ["approved", "rejected"]);
  if (!decision.ok) {
    ctx.fail(400, decision.message, decision.field);
    return;
  }
  const note = String(body.note || "").trim();
  if (decision.value === "rejected" && note.length < 4) {
    ctx.fail(400, "驳回时须填写不少于4个字符的审核意见", "note");
    return;
  }
  element.auditStatus = decision.value;
  element.auditNote = note;
  element.auditedBy = ctx.user.name;
  element.auditedAt = store.now();
  store.save();
  audit.write(ctx.user, "审核", decision.value === "approved" ? "通过素材" : "驳回素材", element.code + " " + element.name, note || "审核通过", ctx.req);
  ctx.ok({ element: metaOf(element) });
}

function remove(ctx) {
  const index = store.db.ichElements.findIndex(function (item) { return item.id === ctx.params[0]; });
  if (index < 0) {
    ctx.fail(404, "素材不存在");
    return;
  }
  const element = store.db.ichElements[index];
  const used = store.db.themes.some(function (theme) {
    return theme.elementIds.indexOf(element.id) >= 0;
  });
  if (used) {
    ctx.fail(409, "素材已被疗愈主题引用，不能删除");
    return;
  }
  store.db.ichElements.splice(index, 1);
  store.save();
  audit.write(ctx.user, "素材", "删除素材", element.code + " " + element.name, "未被主题引用", ctx.req);
  ctx.ok({});
}

function cultureCard(ctx) {
  const element = store.db.ichElements.find(function (item) { return item.id === ctx.params[0]; });
  if (!element) {
    ctx.fail(404, "素材不存在");
    return;
  }
  ctx.ok({
    card: {
      id: element.id,
      name: element.name,
      category: element.category,
      cultureText: element.cultureText,
      technique: element.technique,
      symbolism: element.symbolism,
      source: element.source,
      collectionPlace: element.collectionPlace,
      copyrightStatus: element.copyrightStatus,
      primaryColor: element.primaryColor
    }
  });
}

module.exports = {
  CATEGORIES: CATEGORIES,
  EMOTIONS: EMOTIONS,
  COPYRIGHT: COPYRIGHT,
  list: list,
  detail: detail,
  create: create,
  update: update,
  audit: auditElement,
  remove: remove,
  cultureCard: cultureCard,
  metaOf: metaOf
};
