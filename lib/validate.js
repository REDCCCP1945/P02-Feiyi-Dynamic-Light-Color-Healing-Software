function text(value, name, min, max) {
  const str = String(value === undefined || value === null ? "" : value).trim();
  if (str.length < min || str.length > max) {
    return { ok: false, message: name + "须为" + min + "-" + max + "个字符", field: name };
  }
  return { ok: true, value: str };
}

function integer(value, name, min, max) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < min || num > max) {
    return { ok: false, message: name + "须为" + min + "-" + max + "之间的整数", field: name };
  }
  return { ok: true, value: num };
}

function decimal(value, name, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) {
    return { ok: false, message: name + "须在" + min + "至" + max + "之间", field: name };
  }
  return { ok: true, value: num };
}

function oneOf(value, name, options) {
  if (options.indexOf(value) < 0) {
    return { ok: false, message: name + "取值不在允许范围内", field: name };
  }
  return { ok: true, value: value };
}

function dateText(value, name) {
  const str = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return { ok: false, message: name + "须为YYYY-MM-DD格式", field: name };
  }
  return { ok: true, value: str };
}

function tags(value, name, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    return { ok: false, message: name + "须选择" + min + "-" + max + "项", field: name };
  }
  const cleaned = value.map(function (item) { return String(item).trim(); }).filter(Boolean);
  return { ok: true, value: cleaned };
}

module.exports = { text: text, integer: integer, decimal: decimal, oneOf: oneOf, dateText: dateText, tags: tags };
