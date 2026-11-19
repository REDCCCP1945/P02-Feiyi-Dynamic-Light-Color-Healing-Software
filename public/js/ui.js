const ROLE_NAMES = { USER: "终端用户", EXPERT: "内容管理员", ADMIN: "系统管理员" };

export function esc(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function roleName(role) {
  return ROLE_NAMES[role] || role;
}

export function formatDate(iso, withTime) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  const pad = function (n) { return String(n).padStart(2, "0"); };
  const base = date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  if (!withTime) return base;
  return base + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

export function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(total / 60);
  const s = Math.round(total % 60);
  if (m <= 0) return s + "秒";
  return m + "分" + (s ? s + "秒" : "");
}

export function badge(text, tone) {
  return '<span class="tag ' + (tone || "") + '">' + esc(text) + "</span>";
}

export function statusBadge(status) {
  const map = {
    active: ["启用", "ok"],
    disabled: ["禁用", "warn"],
    pending: ["待审核", "gold"],
    approved: ["已通过", "ok"],
    rejected: ["已驳回", "warn"],
    archived: ["已归档", ""],
    draft: ["草稿", ""],
    enabled: ["已启用", "ok"],
    running: ["进行中", "teal"],
    paused: ["已暂停", "gold"],
    completed: ["已完成", "ok"],
    aborted: ["已放弃", "warn"],
    resolved: ["已处理", "ok"]
  };
  const item = map[status] || [status, ""];
  return badge(item[0], item[1]);
}

export function table(head, rows, options) {
  const opts = options || {};
  const headHtml = head.map(function (item) { return "<th>" + item + "</th>"; }).join("");
  const bodyHtml = rows.length === 0
    ? '<tr><td colspan="' + head.length + '" class="center muted">暂无数据</td></tr>'
    : rows.map(function (row) {
      return "<tr>" + row.map(function (cell) { return "<td>" + cell + "</td>"; }).join("") + "</tr>";
    }).join("");
  return '<div class="table-wrap ' + (opts.cls || "") + '"><table><thead><tr>' + headHtml + "</tr></thead><tbody>" + bodyHtml + "</tbody></table></div>";
}

export function barRow(label, value, max, suffix) {
  const percent = max ? Math.max(2, Math.min(100, value / max * 100)) : 0;
  return '<div class="bar-row"><span>' + esc(label) + '</span><div class="bar-track"><i style="width:' + percent + '%"></i></div><span>' + esc(value) + (suffix || "") + "</span></div>";
}

export function empty(text) {
  return '<div class="empty">' + esc(text) + "</div>";
}

export function toast(message, type) {
  const root = document.getElementById("toastRoot");
  const item = document.createElement("div");
  item.className = "toast " + (type || "");
  item.textContent = message;
  root.appendChild(item);
  setTimeout(function () {
    item.style.opacity = "0";
    item.style.transform = "translateY(6px)";
    item.style.transition = "all 0.25s";
    setTimeout(function () { item.remove(); }, 260);
  }, 2600);
}

export function openModal(options) {
  const root = document.getElementById("modalRoot");
  root.classList.remove("hidden");
  root.innerHTML = '<div class="modal-mask"></div><div class="modal ' + (options.wide ? "wide" : "") + '">' +
    '<button class="modal-close" type="button">×</button>' +
    "<h3>" + esc(options.title) + "</h3>" +
    (options.sub ? '<div class="sub">' + esc(options.sub) + "</div>" : "") +
    '<div class="modal-body">' + (options.body || "") + "</div>" +
    (options.foot === false ? "" : '<div class="modal-foot">' + (options.foot || '<button class="btn ghost" data-close="1">关闭</button>') + "</div>") +
    "</div>";
  const close = function () {
    root.classList.add("hidden");
    root.innerHTML = "";
  };
  root.querySelector(".modal-close").addEventListener("click", close);
  const mask = root.querySelector(".modal-mask");
  if (mask) mask.addEventListener("click", close);
  root.querySelectorAll("[data-close='1']").forEach(function (btn) {
    btn.addEventListener("click", close);
  });
  return { close: close, root: root };
}

export function openDrawer(title, body) {
  const mask = document.createElement("div");
  mask.className = "drawer-mask";
  const drawer = document.createElement("div");
  drawer.className = "drawer";
  drawer.innerHTML = '<div class="card-head"><div><h3 class="card-title">' + esc(title) + '</h3></div><button class="modal-close" type="button">×</button></div>' + body;
  document.body.appendChild(mask);
  document.body.appendChild(drawer);
  const close = function () {
    mask.remove();
    drawer.remove();
  };
  mask.addEventListener("click", close);
  drawer.querySelector(".modal-close").addEventListener("click", close);
  return { close: close, root: drawer };
}

export function fieldError(form, name, message) {
  const target = form.querySelector('[data-error="' + name + '"]');
  if (target) target.textContent = message || "";
}

export function readForm(form) {
  const result = {};
  form.querySelectorAll("input, select, textarea").forEach(function (input) {
    if (!input.name) return;
    if (input.type === "checkbox") {
      result[input.name] = input.checked;
      return;
    }
    result[input.name] = input.value;
  });
  return result;
}

export function formError(form, error) {
  if (!error) return;
  if (error.field) {
    const key = String(error.field).split(".").pop();
    const target = form.querySelector('[data-error="' + key + '"]');
    if (target) {
      target.textContent = error.message;
      return;
    }
  }
  toast(error.message, "err");
}

export function setBusy(button, busy, text) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.disabled = true;
    button.textContent = text || "处理中…";
  } else {
    button.disabled = false;
    if (button.dataset.label) button.textContent = button.dataset.label;
  }
}

export function initials(name) {
  const text = String(name || "用户").trim();
  return text.slice(0, 1);
}

export function spotColorList(colors) {
  return colors.map(function (color) {
    return '<span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:' + esc(color) + ';border:1px solid rgba(255,255,255,.2);margin-right:4px"></span>';
  }).join("");
}
