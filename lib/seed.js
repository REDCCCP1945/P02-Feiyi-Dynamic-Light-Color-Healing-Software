const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const pad = require("./padService");

function hash(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

function makeUser(id, username, password, name, role) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    id: id,
    username: username,
    passwordHash: hash(password, salt),
    salt: salt,
    name: name,
    phone: "",
    role: role,
    status: "active",
    preferences: { sound: true, reduceMotion: false, defaultDuration: 20 },
    createdAt: "2026-06-05T09:00:00.000Z"
  };
}

function svg(inner) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">' + inner + "</svg>";
}

const PATTERNS = {
  wanzi: svg(
    '<g fill="none" stroke="#2F5D8A" stroke-width="10" stroke-linecap="square">' +
    '<path d="M120 30 L120 120 L210 120"/><path d="M120 120 L120 210 L30 210"/>' +
    '<path d="M120 120 L30 120 L30 30"/><path d="M120 120 L210 120 L210 210"/>' +
    '<rect x="42" y="42" width="36" height="36" stroke-width="5"/>' +
    '<rect x="162" y="42" width="36" height="36" stroke-width="5"/>' +
    '<rect x="42" y="162" width="36" height="36" stroke-width="5"/>' +
    '<rect x="162" y="162" width="36" height="36" stroke-width="5"/></g>' +
    '<g fill="#9EC5E8"><circle cx="120" cy="120" r="9"/></g>'
  ),
  tuanhua: svg(
    '<g fill="none" stroke="#8A3B4A" stroke-width="7">' +
    '<circle cx="120" cy="120" r="38"/><circle cx="120" cy="120" r="72" stroke-dasharray="6 10"/>' +
    '<path d="M120 48 C150 78 150 90 120 120 C90 90 90 78 120 48 Z"/>' +
    '<path d="M192 120 C162 150 150 150 120 120 C150 90 162 90 192 120 Z"/>' +
    '<path d="M120 192 C90 162 90 150 120 120 C150 150 150 162 120 192 Z"/>' +
    '<path d="M48 120 C78 90 90 90 120 120 C90 150 78 150 48 120 Z"/></g>' +
    '<g fill="#D9A3A8"><circle cx="120" cy="120" r="10"/><circle cx="120" cy="48" r="5"/><circle cx="192" cy="120" r="5"/><circle cx="120" cy="192" r="5"/><circle cx="48" cy="120" r="5"/></g>'
  ),
  door: svg(
    '<g fill="none" stroke="#B4472F" stroke-width="6">' +
    '<path d="M70 40 L70 200 L120 200 L120 40 Z"/><path d="M170 40 L170 200 L120 200 L120 40 Z"/>' +
    '<path d="M120 52 L120 188"/><circle cx="96" cy="86" r="16"/><circle cx="144" cy="86" r="16"/>' +
    '<path d="M84 130 Q96 150 108 130"/><path d="M132 130 Q144 150 156 130"/>' +
    '<path d="M88 164 L104 176 M152 164 L136 176"/></g>' +
    '<g fill="#7E2C1E"><rect x="52" y="34" width="136" height="10"/><rect x="52" y="196" width="136" height="10"/></g>'
  ),
  yuebai: svg(
    '<defs><radialGradient id="g1" cx="50%" cy="45%" r="60%">' +
    '<stop offset="0%" stop-color="#DDEAF2" stop-opacity="0.95"/>' +
    '<stop offset="55%" stop-color="#7FA6C4" stop-opacity="0.75"/>' +
    '<stop offset="100%" stop-color="#355C7D" stop-opacity="0.35"/></radialGradient></defs>' +
    '<circle cx="120" cy="118" r="96" fill="url(#g1)"/>' +
    '<g fill="none" stroke="#F4F9FC" stroke-width="3" opacity="0.65">' +
    '<circle cx="120" cy="118" r="76"/><circle cx="120" cy="118" r="56"/><circle cx="120" cy="118" r="36"/></g>' +
    '<g fill="none" stroke="#355C7D" stroke-width="4" opacity="0.55">' +
    '<path d="M34 150 Q74 130 118 150 T206 150"/><path d="M34 174 Q74 154 118 174 T206 174"/></g>'
  ),
  banlan: svg(
    '<defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#EEF5FA"/><stop offset="45%" stop-color="#7FA6C4"/><stop offset="100%" stop-color="#22405C"/></linearGradient></defs>' +
    '<rect x="24" y="24" width="192" height="192" rx="12" fill="url(#g2)"/>' +
    '<g fill="none" stroke="#F7FBFD" stroke-width="4" opacity="0.8">' +
    '<path d="M24 92 Q64 60 104 92 T184 92 T216 92"/><path d="M24 124 Q64 92 104 124 T184 124 T216 124"/>' +
    '<path d="M24 156 Q64 124 104 156 T184 156 T216 156"/></g>' +
    '<g fill="#DDEAF2" opacity="0.55"><circle cx="70" cy="62" r="5"/><circle cx="150" cy="68" r="4"/><circle cx="112" cy="190" r="4"/></g>'
  ),
  yunwen: svg(
    '<g fill="none" stroke="#9A6A1C" stroke-width="6" stroke-linecap="round">' +
    '<path d="M40 150 C40 112 78 100 100 122 C112 134 108 154 94 158 C82 162 74 150 82 142"/>' +
    '<path d="M104 122 C116 88 160 82 180 106 C196 126 182 154 162 152 C146 150 142 132 154 126"/>' +
    '<path d="M180 106 C200 96 214 112 210 130 C206 148 186 156 172 146"/>' +
    '<path d="M50 186 C86 174 118 190 150 184 C178 178 198 188 206 196"/></g>' +
    '<g fill="#C99A3E" opacity="0.7"><circle cx="64" cy="196" r="5"/><circle cx="132" cy="198" r="4"/><circle cx="196" cy="200" r="4"/></g>'
  ),
  mask: svg(
    '<g fill="none" stroke="#A63A32" stroke-width="6">' +
    '<path d="M120 30 C78 30 58 66 58 112 C58 168 86 206 120 212 C154 206 182 168 182 112 C182 66 162 30 120 30 Z"/>' +
    '<path d="M120 44 L120 196"/><path d="M84 92 Q100 78 116 92"/><path d="M156 92 Q140 78 124 92"/>' +
    '<path d="M84 132 Q102 150 118 132"/><path d="M156 132 Q138 150 122 132"/>' +
    '<path d="M96 168 Q120 184 144 168"/></g>' +
    '<g fill="#E0B04A"><circle cx="100" cy="104" r="7"/><circle cx="140" cy="104" r="7"/><path d="M110 60 L130 60 L120 76 Z"/></g>'
  ),
  huiwen: svg(
    '<g fill="none" stroke="#6E7B4F" stroke-width="7">' +
    '<path d="M28 36 L212 36 L212 204 L28 204 Z"/>' +
    '<path d="M52 60 L188 60 L188 180 L52 180 Z"/>' +
    '<path d="M76 84 L164 84 L164 156 L76 156 Z"/>' +
    '<path d="M100 108 L140 108 L140 132 L100 132 Z"/>' +
    '<path d="M28 36 L52 60 M212 36 L188 60 M212 204 L188 180 M28 204 L52 180"/></g>' +
    '<g fill="#A9B77E"><rect x="34" y="42" width="8" height="8"/><rect x="198" y="42" width="8" height="8"/><rect x="198" y="190" width="8" height="8"/><rect x="34" y="190" width="8" height="8"/></g>'
  ),
  shuiwen: svg(
    '<g fill="none" stroke="#3C7A8C" stroke-width="5">' +
    '<path d="M24 70 Q56 44 88 70 T152 70 T216 70"/><path d="M24 104 Q56 78 88 104 T152 104 T216 104"/>' +
    '<path d="M24 138 Q56 112 88 138 T152 138 T216 138"/><path d="M24 172 Q56 146 88 172 T152 172 T216 172"/></g>' +
    '<g fill="#8FC0CC" opacity="0.6"><circle cx="58" cy="58" r="4"/><circle cx="122" cy="92" r="3"/><circle cx="186" cy="126" r="4"/></g>'
  ),
  xique: svg(
    '<g fill="none" stroke="#B25A3A" stroke-width="6">' +
    '<path d="M56 170 C80 138 112 132 140 146 C166 158 184 150 196 132"/>' +
    '<path d="M140 146 C146 120 168 108 190 114"/><path d="M140 146 C132 122 112 108 92 112"/>' +
    '<path d="M92 112 C86 96 96 82 110 82 C124 82 132 96 126 110"/></g>' +
    '<g fill="#D98A5F"><circle cx="110" cy="96" r="6"/><path d="M126 90 L138 86 L130 98 Z"/><path d="M56 170 L44 162 L58 156 Z"/></g>'
  )
};

const ELEMENT_SEEDS = [
  { key: "wanzi", code: "ICH-001", name: "剪纸·万字纹", category: "剪纸", file: "wanzi.svg", color: "#2F5D8A", secondary: ["#9EC5E8", "#DCE9F5"], tags: ["秩序感", "平静"], culture: "万字纹由“卍”字连续回旋构成，在民间剪纸中常作为边饰与团花骨架，寄寓绵延不断、安泰有序。", technique: "折剪与阴刻结合，线条连续不断，讲究对称与留白。", symbolism: "连续回旋的结构传递稳定与秩序感，适合在紧张状态下作为视觉锚点。", source: "传统剪纸纹样公开资料整理", place: "陕西关中地区", copyright: "公开领域传统纹样", audit: "approved" },
  { key: "tuanhua", code: "ICH-002", name: "剪纸·团花纹", category: "剪纸", file: "tuanhua.svg", color: "#8A3B4A", secondary: ["#D9A3A8", "#F3E1E3"], tags: ["活力", "平静"], culture: "团花纹以圆形为骨架，四向展开花瓣，常见于窗花、喜花与器物装饰，寓意团圆与丰盛。", technique: "对折剪制，以圆心为轴安排花瓣，讲究疏密与层次。", symbolism: "圆形带来完整感，花瓣向外舒展，适合在低落时提供温和的视觉唤醒。", source: "传统剪纸纹样公开资料整理", place: "陕西陕北地区", copyright: "公开领域传统纹样", audit: "approved" },
  { key: "door", code: "ICH-003", name: "木版年画·门神", category: "木版年画", file: "door.svg", color: "#B4472F", secondary: ["#7E2C1E", "#E0B04A"], tags: ["活力", "安全感"], culture: "门神年画贴于门户，以对称人物与浓烈色彩构成守护意象，是木版套色印刷的代表题材。", technique: "多版套色，先墨线后填色，色块饱满，轮廓硬朗。", symbolism: "对称与正面构图带来守护与安定感，暖色块提升活力。", source: "传统年画纹样公开资料整理", place: "陕西凤翔", copyright: "公开领域传统纹样", audit: "approved" },
  { key: "yuebai", code: "ICH-004", name: "扎染·月白晕染", category: "扎染", file: "yuebai.svg", color: "#4A6B8A", secondary: ["#DDEAF2", "#355C7D"], tags: ["助眠", "平静"], culture: "扎染以线扎、浸染形成自然晕圈，月白色层次柔和，常见于传统服饰与家居织物。", technique: "捆扎后多次浸染，晕圈边缘自然过渡，无法完全复制。", symbolism: "柔和的同心晕圈引导呼吸放缓，适合睡前与深度放松场景。", source: "传统扎染纹样公开资料整理", place: "云南大理", copyright: "公开领域传统纹样", audit: "approved" },
  { key: "banlan", code: "ICH-005", name: "扎染·板蓝渐变", category: "扎染", file: "banlan.svg", color: "#355C7D", secondary: ["#7FA6C4", "#EEF5FA"], tags: ["专注", "平静"], culture: "板蓝根染料呈现由浅入深的蓝色层次，扎染织物上的水波纹样常以渐变方式呈现。", technique: "分段浸染控制深浅，配合折叠形成波纹走向。", symbolism: "蓝色渐变降低视觉刺激，适合专注与情绪整理。", source: "传统扎染纹样公开资料整理", place: "云南大理", copyright: "公开领域传统纹样", audit: "approved" },
  { key: "yunwen", code: "ICH-006", name: "皮影·云纹", category: "皮影", file: "yunwen.svg", color: "#9A6A1C", secondary: ["#C99A3E", "#F0D9A8"], tags: ["秩序感", "安全感"], culture: "皮影戏中的云纹用于表现天界与祥瑞，以流畅曲线和镂空结构形成层次。", technique: "牛皮雕刻后染色，线条圆润，镂空处透光。", symbolism: "云气回旋的曲线带来流动感与安全感，适合焦虑缓解主题。", source: "传统皮影纹样公开资料整理", place: "陕西华县", copyright: "公开领域传统纹样", audit: "approved" },
  { key: "mask", code: "ICH-007", name: "秦腔脸谱·净角", category: "脸谱", file: "mask.svg", color: "#A63A32", secondary: ["#E0B04A", "#2B2B2B"], tags: ["宣泄", "活力"], culture: "秦腔净角脸谱以强烈色块与对称纹样塑造人物性格，红脸多表忠勇。", technique: "对称勾脸，色块边界清晰，金银色点睛。", symbolism: "高对比色块提供情绪宣泄与力量感，适合活力唤醒。", source: "秦腔脸谱公开资料整理", place: "陕西西安", copyright: "公开领域传统纹样", audit: "pending" },
  { key: "huiwen", code: "ICH-008", name: "耀州窑·回纹", category: "陶瓷纹样", file: "huiwen.svg", color: "#6E7B4F", secondary: ["#A9B77E", "#E7EBD8"], tags: ["专注", "秩序感"], culture: "耀州窑青瓷常见回纹边饰，方折连续的线条围合器口与器身，形成稳定的节奏。", technique: "刻花与印花结合，线条深浅一致，转角利落。", symbolism: "重复的方折结构有助于收拢注意力，适合专注提升主题。", source: "耀州窑纹样公开资料整理", place: "陕西铜川", copyright: "公开领域传统纹样", audit: "approved" },
  { key: "shuiwen", code: "ICH-009", name: "皮影·水纹", category: "皮影", file: "shuiwen.svg", color: "#3C7A8C", secondary: ["#8FC0CC", "#E2F0F4"], tags: ["平静", "助眠"], culture: "皮影水纹以连续波线表现江河湖海，常作为人物出行与梦境场景的背景。", technique: "镂空刻线，波峰波谷均匀排列。", symbolism: "连续波线带来节律感，适合呼吸引导。", source: "传统皮影纹样公开资料整理", place: "陕西华县", copyright: "公开领域传统纹样", audit: "pending" },
  { key: "xique", code: "ICH-010", name: "剪纸·喜鹊", category: "剪纸", file: "xique.svg", color: "#B25A3A", secondary: ["#D98A5F", "#F6E3D8"], tags: ["活力"], culture: "喜鹊登梅是常见吉祥题材，喜鹊与花枝组合表达喜事临门。", technique: "阳刻为主，鸟身留大片红，羽毛以细线刻画。", symbolism: "轻盈的鸟形与上扬姿态带来明快情绪。", source: "待补充", place: "陕西关中地区", copyright: "公开领域传统纹样", audit: "rejected" }
];

function writeUploads(dir) {
  const uploadDir = path.join(dir, "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });
  Object.keys(PATTERNS).forEach(function (key) {
    fs.writeFileSync(path.join(uploadDir, "seed-" + key + ".svg"), PATTERNS[key], "utf8");
  });
}

function buildElements(createdAt) {
  return ELEMENT_SEEDS.map(function (item, index) {
    return {
      id: "E-" + String(index + 1).padStart(3, "0"),
      code: item.code,
      name: item.name,
      category: item.category,
      fileType: "SVG",
      filePath: "/files/seed-" + item.key + ".svg",
      mime: "image/svg+xml",
      primaryColor: item.color,
      secondaryColors: item.secondary,
      emotionTags: item.tags,
      cultureText: item.culture,
      technique: item.technique,
      symbolism: item.symbolism,
      source: item.source,
      collectionPlace: item.place,
      copyrightStatus: item.copyright,
      auditStatus: item.audit,
      auditNote: item.audit === "rejected" ? "纹样来源说明不完整，请补充采集地后重新提交" : "",
      createdBy: "U-002",
      createdByName: "内容管理员",
      createdAt: createdAt,
      auditedBy: item.audit === "pending" ? "" : "系统管理员",
      auditedAt: item.audit === "pending" ? "" : "2026-06-10T10:20:00.000Z"
    };
  });
}

const THEME_SEEDS = [
  { code: "TH-001", name: "深度放松·月白", desc: "以月白扎染晕圈为主视觉，呼吸频率缓慢，适合睡前与长时间屏幕工作后的放松。", elements: ["E-004"], pad: { p: 0.6, a: -0.4, d: 0.4 }, params: { hueMin: 190, hueMax: 220, satMin: 25, satMax: 40, lightMin: 45, lightMax: 60, breathFreq: 0.1, fractalDepth: 4, particleDensity: 35, duration: 20, audioTrack: "guzheng" }, status: "enabled" },
  { code: "TH-002", name: "焦虑缓解·秩序", desc: "以万字纹与云纹的连续结构稳定视线，冷色低饱和，适合紧张与思绪杂乱时使用。", elements: ["E-001", "E-006"], pad: { p: 0.5, a: -0.3, d: 0.3 }, params: { hueMin: 200, hueMax: 240, satMin: 20, satMax: 35, lightMin: 40, lightMax: 55, breathFreq: 0.12, fractalDepth: 5, particleDensity: 45, duration: 15, audioTrack: "bianzhong" }, status: "enabled" },
  { code: "TH-003", name: "快速助眠·蓝染", desc: "以板蓝渐变的低明度蓝色为主，配合雨声与低频呼吸，适合入睡前使用。", elements: ["E-005"], pad: { p: 0.3, a: -0.6, d: 0.2 }, params: { hueMin: 210, hueMax: 240, satMin: 25, satMax: 45, lightMin: 30, lightMax: 45, breathFreq: 0.1, fractalDepth: 3, particleDensity: 25, duration: 25, audioTrack: "rain" }, status: "enabled" },
  { code: "TH-004", name: "专注提升·回纹", desc: "以回纹的方折重复结构收拢注意力，中等色温与较快呼吸节律，适合阅读与写作前。", elements: ["E-008"], pad: { p: 0.2, a: 0.3, d: 0.5 }, params: { hueMin: 120, hueMax: 160, satMin: 30, satMax: 50, lightMin: 35, lightMax: 50, breathFreq: 0.2, fractalDepth: 6, particleDensity: 55, duration: 25, audioTrack: "chiba" }, status: "enabled" },
  { code: "TH-005", name: "活力唤醒·年画", desc: "以门神年画的暖色与对称构图提升活力，适合情绪低落与午后倦怠时使用。", elements: ["E-003", "E-002"], pad: { p: 0.7, a: 0.5, d: 0.5 }, params: { hueMin: 20, hueMax: 45, satMin: 55, satMax: 75, lightMin: 55, lightMax: 70, breathFreq: 0.22, fractalDepth: 4, particleDensity: 60, duration: 10, audioTrack: "bianzhong" }, status: "enabled" }
];

function buildThemes(elements, createdAt) {
  return THEME_SEEDS.map(function (item, index) {
    return {
      id: "TH-" + String(index + 1).padStart(3, "0"),
      code: item.code,
      name: item.name,
      description: item.desc,
      elementIds: item.elements,
      targetPAD: item.pad,
      params: item.params,
      status: item.status,
      createdBy: "U-002",
      createdByName: "内容管理员",
      createdAt: createdAt,
      updatedAt: createdAt
    };
  });
}

function snapshotElements(elements, ids) {
  return ids.map(function (id) {
    const item = elements.find(function (e) { return e.id === id; });
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      primaryColor: item.primaryColor,
      secondaryColors: item.secondaryColors,
      emotionTags: item.emotionTags,
      cultureText: item.cultureText,
      technique: item.technique,
      symbolism: item.symbolism,
      source: item.source,
      collectionPlace: item.collectionPlace,
      copyrightStatus: item.copyrightStatus,
      filePath: item.filePath,
      fileType: item.fileType
    };
  });
}

const SESSION_SEEDS = [
  { date: "2026-10-21T13:20:00.000Z", theme: 0, pre: { T: 7, D: 5, A: 4, V: 4, F: 7, C: 6 }, post: { T: 4, D: 3, A: 2, V: 7, F: 4, C: 3 }, duration: 1080, rating: 5, note: "呼吸节奏比平时慢，肩颈放松明显。" },
  { date: "2026-10-25T12:40:00.000Z", theme: 1, pre: { T: 8, D: 4, A: 5, V: 5, F: 6, C: 7 }, post: { T: 5, D: 3, A: 3, V: 6, F: 4, C: 4 }, duration: 900, rating: 4, note: "万字纹的重复结构让注意力稳定下来。" },
  { date: "2026-10-29T14:10:00.000Z", theme: 2, pre: { T: 6, D: 5, A: 3, V: 3, F: 8, C: 5 }, post: { T: 3, D: 3, A: 2, V: 6, F: 4, C: 3 }, duration: 1260, rating: 5, note: "蓝色渐变很柔和，适合午休。" },
  { date: "2026-11-02T13:05:00.000Z", theme: 0, pre: { T: 7, D: 6, A: 4, V: 4, F: 7, C: 6 }, post: { T: 4, D: 4, A: 2, V: 7, F: 4, C: 3 }, duration: 1200, rating: 4, note: "中途暂停过一次，整体仍然放松。" },
  { date: "2026-11-05T12:30:00.000Z", theme: 3, pre: { T: 5, D: 4, A: 3, V: 6, F: 5, C: 7 }, post: { T: 4, D: 3, A: 2, V: 7, F: 4, C: 4 }, duration: 1500, rating: 4, note: "回纹让思路更集中，适合写报告前使用。" },
  { date: "2026-11-08T13:50:00.000Z", theme: 1, pre: { T: 8, D: 5, A: 6, V: 4, F: 7, C: 6 }, post: { T: 5, D: 3, A: 3, V: 6, F: 4, C: 3 }, duration: 960, rating: 5, note: "云纹的曲线比纯几何更耐看。" },
  { date: "2026-11-11T14:20:00.000Z", theme: 0, pre: { T: 6, D: 4, A: 3, V: 5, F: 6, C: 5 }, post: { T: 3, D: 3, A: 2, V: 7, F: 3, C: 3 }, duration: 1140, rating: 5, note: "月白晕圈的光色变化很细腻。" },
  { date: "2026-11-13T12:55:00.000Z", theme: 2, pre: { T: 5, D: 5, A: 2, V: 3, F: 8, C: 4 }, post: { T: 3, D: 3, A: 2, V: 5, F: 5, C: 3 }, duration: 1380, rating: 4, note: "雨声与呼吸同步，容易入睡。" },
  { date: "2026-11-15T10:30:00.000Z", theme: 4, pre: { T: 4, D: 7, A: 3, V: 3, F: 6, C: 5 }, post: { T: 3, D: 4, A: 2, V: 7, F: 3, C: 3 }, duration: 720, rating: 4, note: "年画的暖色让人精神一些。" },
  { date: "2026-11-17T13:10:00.000Z", theme: 0, pre: { T: 7, D: 5, A: 4, V: 4, F: 7, C: 6 }, post: { T: 4, D: 3, A: 2, V: 7, F: 4, C: 3 }, duration: 1320, rating: 5, note: "连续使用一周后更容易进入状态。" }
];

function buildSessions(themes, elements, assessments) {
  return SESSION_SEEDS.map(function (item, index) {
    const theme = themes[item.theme];
    const assessment = assessments[index];
    const preLoad = pad.loadIndex(item.pre);
    const postLoad = pad.loadIndex(item.post);
    return {
      id: "S-" + String(index + 1).padStart(3, "0"),
      code: "SE-" + String(index + 1).padStart(4, "0"),
      userId: "U-001",
      userName: "体验用户",
      assessmentId: assessment.id,
      themeId: theme.id,
      themeCode: theme.code,
      recipeId: null,
      themeName: theme.name,
      params: theme.params,
      elements: snapshotElements(elements, theme.elementIds),
      targetPAD: theme.targetPAD,
      preScores: item.pre,
      preLoad: preLoad,
      postScores: item.post,
      postLoad: postLoad,
      improvement: pad.round(preLoad - postLoad, 1),
      rating: item.rating,
      note: item.note,
      status: "completed",
      startAt: item.date,
      endAt: new Date(new Date(item.date).getTime() + item.duration * 1000).toISOString(),
      durationSec: item.duration,
      pausedMs: 0,
      pauseStartedAt: null,
      deleted: false
    };
  });
}

function buildAssessments() {
  return SESSION_SEEDS.map(function (item, index) {
    const computed = pad.compute(item.pre);
    return {
      id: "A-" + String(index + 1).padStart(3, "0"),
      userId: "U-001",
      scores: item.pre,
      normalized: pad.normalize(item.pre),
      dominant: pad.dominant(item.pre),
      padBefore: computed.before,
      padTarget: computed.target,
      probabilities: computed.probabilities,
      method: "scale",
      voiceFeatures: null,
      createdAt: new Date(new Date(item.date).getTime() - 6 * 60 * 1000).toISOString()
    };
  });
}

function buildLogs() {
  const defs = [
    ["2026-11-10T09:12:00.000Z", "U-003", "系统管理员", "ADMIN", "账号", "登录", "admin01", "登录成功"],
    ["2026-11-10T09:20:00.000Z", "U-002", "内容管理员", "EXPERT", "素材", "上传素材", "ICH-009 皮影·水纹", "类别：皮影，待审核"],
    ["2026-11-10T09:26:00.000Z", "U-003", "系统管理员", "ADMIN", "审核", "通过素材", "ICH-008 耀州窑·回纹", "审核通过"],
    ["2026-11-11T14:20:00.000Z", "U-001", "体验用户", "USER", "疗愈", "开始会话", "SE-0007", "主题：深度放松·月白，素材1个"],
    ["2026-11-11T14:39:00.000Z", "U-001", "体验用户", "USER", "疗愈", "完成会话", "SE-0007", "时长1140秒，改善度25"],
    ["2026-11-12T10:05:00.000Z", "U-002", "内容管理员", "EXPERT", "主题", "编辑主题", "TH-002 焦虑缓解·秩序", "状态：enabled"],
    ["2026-11-13T12:55:00.000Z", "U-001", "体验用户", "USER", "疗愈", "开始会话", "SE-0008", "主题：快速助眠·蓝染，素材1个"],
    ["2026-11-13T13:18:00.000Z", "U-001", "体验用户", "USER", "疗愈", "完成会话", "SE-0008", "时长1380秒，改善度20"],
    ["2026-11-14T16:40:00.000Z", "U-003", "系统管理员", "ADMIN", "用户", "新建账号", "expert02", "角色：EXPERT"],
    ["2026-11-15T10:30:00.000Z", "U-001", "体验用户", "USER", "疗愈", "开始会话", "SE-0009", "主题：活力唤醒·年画，素材2个"],
    ["2026-11-15T10:42:00.000Z", "U-001", "体验用户", "USER", "疗愈", "完成会话", "SE-0009", "时长720秒，改善度24"],
    ["2026-11-16T09:10:00.000Z", "U-003", "系统管理员", "ADMIN", "设置", "修改系统设置", "全局参数", "亮度上限70%，保留365天"],
    ["2026-11-17T13:10:00.000Z", "U-001", "体验用户", "USER", "疗愈", "开始会话", "SE-0010", "主题：深度放松·月白，素材1个"],
    ["2026-11-17T13:32:00.000Z", "U-001", "体验用户", "USER", "疗愈", "完成会话", "SE-0010", "时长1320秒，改善度26"]
  ];
  return defs.map(function (item, index) {
    return {
      id: "L-" + String(index + 1).padStart(3, "0"),
      userId: item[1],
      actorName: item[2],
      role: item[3],
      module: item[4],
      action: item[5],
      target: item[6],
      detail: item[7],
      ip: "127.0.0.1",
      createdAt: item[0]
    };
  });
}

function build(secret, dir) {
  writeUploads(dir);
  const users = [
    makeUser("U-001", "user01", "User@2026", "体验用户", "USER"),
    makeUser("U-002", "expert01", "Expert@2026", "内容管理员", "EXPERT"),
    makeUser("U-003", "admin01", "Admin@2026", "系统管理员", "ADMIN")
  ];
  const elements = buildElements("2026-06-08T09:30:00.000Z");
  const themes = buildThemes(elements, "2026-06-10T10:30:00.000Z");
  const assessments = buildAssessments();
  const sessions = buildSessions(themes, elements, assessments);
  const latest = assessments[assessments.length - 1];
  const latestSessions = sessions[sessions.length - 1];
  const items = themes.slice(0, 3).map(function (theme, index) {
    const prox = 1 / (1 + pad.distance(latest.padTarget, theme.targetPAD));
    const weight = 1.0 + index * 0.1;
    const score = pad.round(0.6 * prox + 0.4 * (weight / 5), 4);
    return {
      themeId: theme.id,
      code: theme.code,
      name: theme.name,
      description: theme.description,
      targetPAD: theme.targetPAD,
      params: theme.params,
      elementIds: theme.elementIds,
      score: score,
      proximity: pad.round(prox, 4),
      cfWeight: pad.round(weight, 2),
      reason: "主导情绪为" + latest.dominant.label + "，当前目标PAD与主题目标的距离为" + pad.round(1 / prox - 1, 3) + "，接近度" + pad.round(prox, 3) + "，协同权重" + pad.round(weight, 2)
    };
  }).sort(function (a, b) { return b.score - a.score; });
  const recommendation = {
    id: "R-001",
    userId: "U-001",
    assessmentId: latest.id,
    smart: true,
    items: items,
    createdAt: latestSessions.startAt
  };
  const cfWeights = [
    { userId: "U-001", themeId: "TH-001", weight: 1.35, updatedAt: "2026-11-17T13:40:00.000Z" },
    { userId: "U-001", themeId: "TH-002", weight: 1.2, updatedAt: "2026-11-08T14:10:00.000Z" },
    { userId: "U-001", themeId: "TH-003", weight: 1.25, updatedAt: "2026-11-13T13:20:00.000Z" },
    { userId: "U-001", themeId: "TH-004", weight: 1.1, updatedAt: "2026-11-05T12:55:00.000Z" },
    { userId: "U-001", themeId: "TH-005", weight: 1.15, updatedAt: "2026-11-15T10:50:00.000Z" }
  ];
  const feedbacks = [
    {
      id: "F-001",
      userId: "U-001",
      userName: "体验用户",
      role: "USER",
      type: "功能建议",
      content: "希望增加更多扎染类主题，并支持把喜欢的配色保存为常用配方。",
      status: "pending",
      reply: "",
      repliedBy: "",
      repliedAt: "",
      createdAt: "2026-11-16T15:20:00.000Z"
    },
    {
      id: "F-002",
      userId: "U-001",
      userName: "体验用户",
      role: "USER",
      type: "内容纠错",
      content: "耀州窑回纹的说明里可以补充器型信息，方便理解纹样位置。",
      status: "resolved",
      reply: "已补充器型说明，感谢反馈。",
      repliedBy: "系统管理员",
      repliedAt: "2026-11-14T09:35:00.000Z",
      createdAt: "2026-11-13T18:05:00.000Z"
    }
  ];
  return {
    version: 1,
    meta: { createdAt: "2026-06-05T09:00:00.000Z", seededAt: new Date().toISOString(), secretLength: secret.length },
    users: users,
    ichElements: elements,
    themes: themes,
    assessments: assessments,
    recommendations: [recommendation],
    recipes: [],
    sessions: sessions,
    cfWeights: cfWeights,
    auditLogs: buildLogs(),
    feedbacks: feedbacks,
    settings: {
      defaultBreathFreq: 0.12,
      maxBrightness: 70,
      smartMatchDefault: 1,
      retentionDays: 365,
      colorIntensity: 100,
      notice: "欢迎使用动态光色疗愈体验，本软件用于日常放松与文化体验，不提供医学诊断或治疗。",
      updatedBy: "系统管理员",
      updatedAt: "2026-11-16T09:10:00.000Z"
    }
  };
}

module.exports = { build: build };
