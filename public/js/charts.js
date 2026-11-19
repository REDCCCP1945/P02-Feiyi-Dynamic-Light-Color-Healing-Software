function setup(canvas, height) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.parentElement.clientWidth || 600;
  canvas.width = Math.max(300, Math.floor(width * ratio));
  canvas.height = Math.floor((height || 220) * ratio);
  canvas.style.height = (height || 220) + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx: ctx, width: canvas.width / ratio, height: (height || 220) };
}

function axes(ctx, width, height, padding, maxValue, steps) {
  ctx.strokeStyle = "rgba(140,190,200,0.12)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(168,188,196,0.72)";
  ctx.font = "10px Microsoft YaHei";
  const count = steps || 4;
  for (let i = 0; i <= count; i += 1) {
    const y = padding.top + (height - padding.top - padding.bottom) * i / count;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    const value = Math.round(maxValue * (1 - i / count));
    ctx.fillText(String(value), 6, y + 3);
  }
}

export function lineChart(canvas, series, options) {
  const opts = options || {};
  const env = setup(canvas, opts.height || 220);
  const ctx = env.ctx;
  const width = env.width;
  const height = env.height;
  const padding = { top: 16, right: 16, bottom: 30, left: 34 };
  let maxValue = opts.max || 0;
  series.forEach(function (item) {
    (item.data || []).forEach(function (value) {
      if (value !== null && value > maxValue) maxValue = value;
    });
  });
  maxValue = Math.max(10, Math.ceil(maxValue / 10) * 10);
  axes(ctx, width, height, padding, maxValue, 4);
  const labels = opts.labels || [];
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  ctx.font = "10px Microsoft YaHei";
  const stepX = labels.length > 1 ? innerW / (labels.length - 1) : innerW;
  if (labels.length) {
    const every = Math.max(1, Math.ceil(labels.length / 8));
    labels.forEach(function (label, index) {
      if (index % every !== 0 && index !== labels.length - 1) return;
      const x = padding.left + stepX * index;
      ctx.fillStyle = "rgba(111,135,144,0.9)";
      ctx.fillText(label.slice(5), x - 12, height - 8);
    });
  }
  series.forEach(function (item) {
    const values = item.data || [];
    ctx.beginPath();
    ctx.strokeStyle = item.color || "#7fc6b8";
    ctx.lineWidth = 2;
    let started = false;
    values.forEach(function (value, index) {
      if (value === null || value === undefined) return;
      const x = padding.left + stepX * index;
      const y = padding.top + innerH * (1 - value / maxValue);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    if (opts.fill && item.fill !== false) {
      const last = values.length - 1;
      ctx.lineTo(padding.left + stepX * last, padding.top + innerH);
      ctx.lineTo(padding.left, padding.top + innerH);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, (item.color || "#7fc6b8") + "55");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    values.forEach(function (value, index) {
      if (value === null || value === undefined) return;
      const x = padding.left + stepX * index;
      const y = padding.top + innerH * (1 - value / maxValue);
      ctx.beginPath();
      ctx.fillStyle = item.color || "#7fc6b8";
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

export function barChart(canvas, labels, values, options) {
  const opts = options || {};
  const env = setup(canvas, opts.height || 210);
  const ctx = env.ctx;
  const width = env.width;
  const height = env.height;
  const padding = { top: 16, right: 14, bottom: 30, left: 30 };
  const maxValue = Math.max(opts.max || 10, Math.ceil(Math.max.apply(null, values.concat([1])) / 5) * 5);
  axes(ctx, width, height, padding, maxValue, 4);
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const slot = innerW / Math.max(1, values.length);
  ctx.font = "10px Microsoft YaHei";
  values.forEach(function (value, index) {
    const barW = Math.min(38, slot * 0.48);
    const x = padding.left + slot * index + (slot - barW) / 2;
    const h = innerH * (value / maxValue);
    const gradient = ctx.createLinearGradient(0, height - padding.bottom - h, 0, height - padding.bottom);
    gradient.addColorStop(0, opts.color || "#7fc6b8");
    gradient.addColorStop(1, "rgba(127,198,184,0.15)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, height - padding.bottom - h, barW, h);
    ctx.fillStyle = "rgba(168,188,196,0.85)";
    const label = String(labels[index] || "");
    ctx.fillText(label.length > 6 ? label.slice(0, 6) : label, x - 2, height - 9);
    ctx.fillStyle = "rgba(230,238,242,0.9)";
    ctx.fillText(String(value), x + 2, height - padding.bottom - h - 5);
  });
}

export function radarChart(canvas, labels, series, options) {
  const opts = options || {};
  const env = setup(canvas, opts.height || 260);
  const ctx = env.ctx;
  const width = env.width;
  const height = env.height;
  const cx = width / 2;
  const cy = height / 2 + 4;
  const radius = Math.min(width, height) * 0.34;
  const count = labels.length;
  ctx.strokeStyle = "rgba(140,190,200,0.16)";
  ctx.fillStyle = "rgba(111,135,144,0.85)";
  ctx.font = "11px Microsoft YaHei";
  for (let ring = 1; ring <= 4; ring += 1) {
    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
      const r = radius * ring / 4;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
    const lx = cx + Math.cos(angle) * (radius + 22);
    const ly = cy + Math.sin(angle) * (radius + 14);
    ctx.fillStyle = "rgba(168,188,196,0.9)";
    ctx.textAlign = Math.abs(Math.cos(angle)) < 0.2 ? "center" : (Math.cos(angle) > 0 ? "left" : "right");
    ctx.fillText(labels[i], lx, ly);
  }
  ctx.textAlign = "left";
  series.forEach(function (item) {
    ctx.beginPath();
    item.data.forEach(function (value, index) {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
      const r = radius * Math.max(0, Math.min(10, value)) / 10;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = item.color || "#7fc6b8";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = (item.color || "#7fc6b8") + "26";
    ctx.fill();
  });
}

export function donutChart(canvas, items, options) {
  const opts = options || {};
  const env = setup(canvas, opts.height || 200);
  const ctx = env.ctx;
  const width = env.width;
  const height = env.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;
  const total = items.reduce(function (sum, item) { return sum + item.value; }, 0) || 1;
  let start = -Math.PI / 2;
  items.forEach(function (item) {
    const angle = item.value / total * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    start += angle;
  });
  ctx.beginPath();
  ctx.fillStyle = "#101a21";
  ctx.arc(cx, cy, radius * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(230,238,242,0.92)";
  ctx.font = "16px Songti SC";
  ctx.textAlign = "center";
  ctx.fillText(String(total), cx, cy + 2);
  ctx.font = "10px Microsoft YaHei";
  ctx.fillStyle = "rgba(111,135,144,0.9)";
  ctx.fillText(opts.centerLabel || "合计", cx, cy + 18);
  ctx.textAlign = "left";
}
