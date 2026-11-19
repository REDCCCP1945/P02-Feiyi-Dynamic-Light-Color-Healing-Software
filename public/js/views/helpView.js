import api from "../api.js";
import { table, badge } from "../ui.js";

export default {
  async render(container) {
    const meta = await api.get("/api/meta");
    container.innerHTML = '<div class="panel-split">' +
      '<div class="card pad-lg article"><h3>关于本软件</h3>' +
        '<p>' + meta.name + " " + meta.version + "，著作权人：" + meta.owner + "，经办人/负责人：" + meta.contact + "。软件以非遗视觉元素为素材，通过情绪测评、PAD坐标计算、主题匹配、动态光色渲染与环境音合成，提供日常放松与文化体验。</p>" +
        "<h3>使用边界</h3><p>本软件不属于医疗器械，不提供医学诊断、治疗或疗效承诺。测评结果与报告仅用于自我观察和方案匹配；如持续感到情绪困扰，请寻求专业帮助。</p>" +
        "<h3>数据与隐私</h3><p>终端用户只能查看本人的测评、会话与记录；内容管理员只能查看素材与主题的聚合统计，不能读取个人情绪明细；系统管理员查看账号、日志与系统设置，日志不记录情绪分数与备注原文。用户可在记录页删除本人记录，删除后不进入趋势统计。</p>" +
        "<h3>技术说明</h3><p>客户端使用Canvas 2D逐帧渲染L-System纹样，使用Perlin噪声做非机械扰动，HSL与Oklab用于色彩计算与过渡；环境音由Web Audio API实时合成，相位与画面呼吸一致。服务端使用Node.js原生HTTP模块与JSON文件持久化，不依赖外部数据库或云服务。</p>" +
      "</div>" +
      '<div class="card pad-lg"><div class="card-head"><div><h3 class="card-title">版本与运行信息</h3><div class="card-sub">当前服务实例</div></div></div>' +
        '<div class="kv"><dt>软件名称</dt><dd>' + meta.name + "</dd><dt>版本</dt><dd>" + meta.version + "</dd><dt>著作权人</dt><dd>" + meta.owner + "</dd>" +
        "<dt>素材数量</dt><dd>" + meta.elementCount + " 件</dd><dt>主题数量</dt><dd>" + meta.themeCount + " 个</dd><dt>服务器时间</dt><dd>" + meta.serverTime + "</dd></div>" +
        '<div class="split-line"></div><h4 class="small">关键参数边界</h4>' +
        table(["参数", "范围", "作用"], [
          ["呼吸频率", "0.10 - 0.25 Hz", "画面与音频同步节律"],
          ["分形层级", "3 - 6 层", "L-System迭代深度"],
          ["色相", "0 - 360°", "主题色彩区间"],
          ["饱和度", "20% - 80%", "色彩纯度"],
          ["明度", "30% - 80%", "画面明暗基线"],
          ["粒子密度", "0 - 100", "漂浮光点数量"],
          ["体验时长", "5 - 60 分钟", "建议时长"],
          ["灯光亮度", "系统上限", "指令输出约束"]
        ]) +
        '<div class="inline mt-16">' + badge("本地运行", "teal") + badge("无外部数据源", "") + badge("非医疗", "gold") + "</div>" +
      "</div></div>";
  }
};
