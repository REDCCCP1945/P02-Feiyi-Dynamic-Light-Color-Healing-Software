const ANCHORS = {
  anxiety: { label: "紧张焦虑", pad: [-0.65, 0.70, -0.50] },
  depression: { label: "抑郁低落", pad: [-0.75, -0.60, -0.45] },
  fatigue: { label: "疲劳迟钝", pad: [-0.30, -0.65, -0.20] },
  stress: { label: "压力负荷", pad: [-0.55, 0.60, -0.30] },
  relaxation: { label: "平静放松", pad: [0.60, -0.40, 0.40] }
};

const DIMENSIONS = [
  { key: "T", name: "紧张焦虑", short: "紧张" },
  { key: "D", name: "抑郁低落", short: "低落" },
  { key: "A", name: "愤怒敌意", short: "愤怒" },
  { key: "V", name: "活力精力", short: "活力" },
  { key: "F", name: "疲劳迟钝", short: "疲劳" },
  { key: "C", name: "困惑迷茫", short: "困惑" }
];

function probabilities(scores) {
  const T = scores.T / 10;
  const D = scores.D / 10;
  const A = scores.A / 10;
  const V = scores.V / 10;
  const F = scores.F / 10;
  const C = scores.C / 10;
  return {
    anxiety: Math.max(0.02, T * 0.7 + C * 0.3),
    depression: Math.max(0.02, D * 0.8 + (1 - V) * 0.2),
    fatigue: Math.max(0.02, F * 0.8 + (1 - V) * 0.2),
    stress: Math.max(0.02, A * 0.5 + T * 0.3 + C * 0.2),
    relaxation: Math.max(0.02, V * 0.6 * (1 - T * 0.5))
  };
}

function round(value, digits) {
  const factor = Math.pow(10, digits === undefined ? 3 : digits);
  return Math.round(value * factor) / factor;
}

function compute(scores) {
  const probs = probabilities(scores);
  let sumWeight = 0;
  let p = 0;
  let a = 0;
  let d = 0;
  Object.keys(probs).forEach(function (key) {
    const weight = Math.pow(probs[key], 1.5);
    const anchor = ANCHORS[key].pad;
    sumWeight += weight;
    p += anchor[0] * weight;
    a += anchor[1] * weight;
    d += anchor[2] * weight;
  });
  p = p / sumWeight;
  a = a / sumWeight;
  d = d / sumWeight;
  const before = { p: round(p), a: round(a), d: round(d) };
  const target = {
    p: round(Math.min(before.p + 0.5, 0.8)),
    a: round(before.a > 0 ? Math.max(before.a - 0.4, 0) : Math.min(before.a + 0.4, 0.3)),
    d: round(Math.min(before.d + 0.4, 0.6))
  };
  return { before: before, target: target, probabilities: probs };
}

function distance(x, y) {
  const dp = x.p - y.p;
  const da = x.a - y.a;
  const dd = x.d - y.d;
  return Math.sqrt(dp * dp + da * da + dd * dd);
}

function dominant(scores) {
  let maxKey = "T";
  let maxValue = -1;
  DIMENSIONS.forEach(function (item) {
    if (scores[item.key] > maxValue) {
      maxValue = scores[item.key];
      maxKey = item.key;
    }
  });
  if (maxValue * 10 < 30) {
    return { key: "neutral", label: "平稳", score: maxValue * 10 };
  }
  const found = DIMENSIONS.find(function (item) { return item.key === maxKey; });
  return { key: maxKey, label: found.name, score: maxValue * 10 };
}

function normalize(scores) {
  const out = {};
  DIMENSIONS.forEach(function (item) {
    out[item.key] = scores[item.key] * 10;
  });
  return out;
}

function loadIndex(scores) {
  const total = (scores.T + scores.D + scores.A + scores.F + scores.C) / 5 * 10;
  return round(total, 1);
}

module.exports = {
  ANCHORS: ANCHORS,
  DIMENSIONS: DIMENSIONS,
  compute: compute,
  distance: distance,
  dominant: dominant,
  normalize: normalize,
  loadIndex: loadIndex,
  round: round,
  probabilities: probabilities
};
