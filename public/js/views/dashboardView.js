import api from "../api.js";
import { esc, table, statusBadge, formatDate, formatDuration, barRow, roleName } from "../ui.js";
import { lineChart, barChart, donutChart } from "../charts.js";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function statCard(label, value, unit, foot) {
  return '<div class="stat-card"><div class="stat-label">' + label + '</div><div class="stat-value">' + value +
    (unit ? "<small>" + unit + "</small>" : "") + '</div><div class="stat-foot">' + (foot || "") + "</div></div>";
}

function userDashboard(container, data, user) {
  const stats = data.stats;
  container.innerHTML =
    '<div class="hero"><div><h2>' + greeting() + "，" + esc(user.name) + "</h2>" +
      "<p>今天可以从一次简短的情绪测评开始。系统会给出三个匹配主题，你可以自由选择，也可以关闭智能匹配手动浏览。所有记录仅本人可见。</p></div>" +
      '<div class="hero-actions"><a class="btn primary" href="#/assessment">开始情绪测评</a><a class="btn" href="#/themes">浏览主题</a></div></div>' +
    '<div class="grid cols-4 mt-24">' +
      statCard("完成疗愈", stats.sessions, "次", "累计 " + stats.minutes + " 分钟") +
      statCard("近7天体验", stats.weekCount, "次", "保持稳定节律") +
      statCard("平均改善度", stats.averageImprovement, "分", "前测负荷减后测负荷") +
      statCard("可用主题", data.themeCount, "个", "素材 " + data.elementCount + " 件") +
    "</div>" +
    '<div class="panel-split mt-24">' +
      '<div class="card"><div class="card-head"><div><h3 class="card-title">最近疗愈记录</h3><div class="card-sub">按开始时间倒序，展示最近5次</div></div><a class="btn ghost" href="#/records">全部记录</a></div>' +
        (data.recent.length ? table(["记录编号", "主题", "开始时间", "时长", "改善度", "评分"], data.recent.map(function (item) {
          return [
            '<a href="#/report/' + item.id + '">' + esc(item.code) + "</a>",
            esc(item.themeName),
            formatDate(item.startAt, true),
            formatDuration(item.durationSec),
            '<span class="tag ok">+' + item.improvement + "</span>",
            item.rating + " / 5"
          ];
        })) : '<div class="empty">还没有完成的疗愈记录，完成一次体验后会在这里出现。</div>') +
      "</div>" +
      '<div class="card"><div class="card-head"><div><h3 class="card-title">为你推荐</h3><div class="card-sub">来自最近一次测评的匹配结果</div></div></div>' +
        (data.suggestions.length ? data.suggestions.map(function (item, index) {
          return '<div class="rank-card"><div class="rank-no">' + (index + 1) + '</div><div><h4>' + esc(item.name) + '</h4><p>' + esc(item.reason) + '</p></div><div class="right"><div class="score-pill">' + Math.round(item.score * 100) + '%</div><div class="mt-8"><a class="btn ghost" href="#/themes/' + item.themeId + '">查看</a></div></div></div>';
        }).join("") : '<div class="empty">完成一次情绪测评后，这里会显示三个匹配主题。</div>') +
      "</div>" +
    "</div>" +
    '<div class="card mt-24"><div class="card-head"><div><h3 class="card-title">使用提示</h3><div class="card-sub">来自系统设置</div></div></div>' +
      '<p class="muted small">建议在安静环境中佩戴耳机，选择舒适的坐姿。呼吸引导以画面的明暗节律为准，不必刻意加深呼吸。若出现不适，可随时暂停或结束体验。</p>' +
    "</div>";
}

function expertDashboard(container, data) {
  const stats = data.stats;
  container.innerHTML =
    '<div class="hero"><div><h2>内容管理工作台</h2><p>素材经审核后才能被主题引用。主题启用后会进入用户推荐候选池；停用不影响已经开始的会话。</p></div>' +
      '<div class="hero-actions"><a class="btn primary" href="#/library/new">上传非遗素材</a><a class="btn" href="#/theme-manage">管理主题</a></div></div>' +
    '<div class="grid cols-4 mt-24">' +
      statCard("素材总数", stats.elements, "件", "已通过 " + stats.approved + " 件") +
      statCard("待审核", stats.pending, "件", "需管理员处理") +
      statCard("疗愈主题", stats.themes, "个", "已启用 " + stats.enabledThemes + " 个") +
      statCard("累计完成", stats.sessions, "次", "全站聚合，不含个人明细") +
    "</div>" +
    '<div class="panel-split mt-24">' +
      '<div class="card"><div class="card-head"><div><h3 class="card-title">素材类别分布</h3><div class="card-sub">按已入库素材统计</div></div></div><div id="categoryChart" class="chart-box"><canvas></canvas></div></div>' +
      '<div class="card"><div class="card-head"><div><h3 class="card-title">主题使用排行</h3><div class="card-sub">按完成会话次数</div></div></div>' +
        (data.topThemes.length ? data.topThemes.map(function (item) {
          return barRow(item.name, item.count, data.topThemes[0].count, "次");
        }).join("") : '<div class="empty">暂无会话数据</div>') +
      "</div>" +
    "</div>" +
    '<div class="card mt-24"><div class="card-head"><div><h3 class="card-title">最近入库素材</h3><div class="card-sub">按创建时间倒序</div></div><a class="btn ghost" href="#/library">进入素材库</a></div>' +
      table(["素材编号", "名称", "类别", "审核状态", "创建时间"], data.recentElements.map(function (item) {
        return [esc(item.code), esc(item.name), esc(item.category), statusBadge(item.auditStatus), formatDate(item.createdAt, true)];
      })) +
    "</div>";
  const canvas = container.querySelector("#categoryChart canvas");
  if (canvas) {
    donutChart(canvas, data.categories.map(function (item, index) {
      const colors = ["#7fc6b8", "#d9b26a", "#c98a8a", "#6f9fc6", "#9fb87f", "#b28fc0", "#c6a26f"];
      return { name: item.name, value: item.count, color: colors[index % colors.length] };
    }), { centerLabel: "素材" });
  }
}

function adminDashboard(container, data) {
  const stats = data.stats;
  container.innerHTML =
    '<div class="hero"><div><h2>系统运行总览</h2><p>管理员负责账号、素材审核、系统参数与日志。用户情绪明细不在管理员可见范围内，日志仅记录操作事实，不记录测评分数。</p></div>' +
      '<div class="hero-actions"><a class="btn primary" href="#/audit">处理待审核素材</a><a class="btn" href="#/logs">查看操作日志</a></div></div>' +
    '<div class="grid cols-4 mt-24">' +
      statCard("账号总数", stats.users, "个", "启用 " + stats.activeUsers + " 个") +
      statCard("待审核素材", stats.pendingElements, "件", "需管理员确认") +
      statCard("待处理反馈", stats.pendingFeedback, "条", "含投诉与建议") +
      statCard("今日操作", stats.todayLogs, "条", "累计 " + stats.totalLogs + " 条") +
    "</div>" +
    '<div class="panel-split mt-24">' +
      '<div class="card"><div class="card-head"><div><h3 class="card-title">操作模块分布</h3><div class="card-sub">按日志条数统计</div></div></div><div id="moduleChart" class="chart-box"><canvas></canvas></div></div>' +
      '<div class="card"><div class="card-head"><div><h3 class="card-title">系统状态</h3><div class="card-sub">当前配置与内容状态</div></div></div>' +
        '<div class="kv"><dt>已启用主题</dt><dd>' + stats.enabledThemes + " 个</dd>" +
        "<dt>内容管理员</dt><dd>" + stats.experts + " 个</dd>" +
        "<dt>素材审核</dt><dd>通过后自动进入主题候选</dd>" +
        "<dt>日志策略</dt><dd>按系统设置保留，关键操作全量记录</dd></div>" +
        '<div class="split-line"></div><div class="small muted">系统设置中的亮度上限会影响所有新生成的灯光指令；色彩强度影响画面明度振幅。</div>' +
      "</div>" +
    "</div>" +
    '<div class="card mt-24"><div class="card-head"><div><h3 class="card-title">最近操作</h3><div class="card-sub">日志不包含用户情绪分数</div></div><a class="btn ghost" href="#/logs">全部日志</a></div>' +
      table(["时间", "操作人", "角色", "模块", "动作", "对象"], data.recentLogs.map(function (item) {
        return [formatDate(item.createdAt, true), esc(item.actorName), roleName(item.role), esc(item.module), esc(item.action), esc(item.target)];
      })) +
    "</div>";
  const canvas = container.querySelector("#moduleChart canvas");
  if (canvas) {
    const colors = ["#7fc6b8", "#d9b26a", "#c98a8a", "#6f9fc6", "#9fb87f", "#b28fc0"];
    donutChart(canvas, data.modules.slice(0, 6).map(function (item, index) {
      return { name: item.name, value: item.count, color: colors[index % colors.length] };
    }), { centerLabel: "日志" });
  }
}

export default {
  async render(container) {
    const user = api.user();
    const result = await api.get("/api/dashboard");
    const data = result.dashboard;
    if (data.role === "USER") userDashboard(container, data, user);
    else if (data.role === "EXPERT") expertDashboard(container, data);
    else adminDashboard(container, data);
  }
};
