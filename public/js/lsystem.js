const DEFAULT_RULES = { F: "F[+F]F[-F][F]" };

export function expand(axiom, rules, iterations) {
  let value = axiom || "F";
  const ruleSet = rules || DEFAULT_RULES;
  for (let i = 0; i < iterations; i += 1) {
    let next = "";
    for (const char of value) {
      next += ruleSet[char] || char;
    }
    value = next;
    if (value.length > 20000) break;
  }
  return value;
}

export function turtle(sequence, angleDeg, step) {
  const segments = [];
  let x = 0;
  let y = 0;
  let angle = -Math.PI / 2;
  const stack = [];
  const stepLength = step || 4;
  const angleRad = (angleDeg || 25) * Math.PI / 180;
  let depth = 0;
  for (const char of sequence) {
    if (char === "F") {
      const nx = x + Math.cos(angle) * stepLength;
      const ny = y + Math.sin(angle) * stepLength;
      segments.push({ x1: x, y1: y, x2: nx, y2: ny, depth: depth });
      x = nx;
      y = ny;
    } else if (char === "+") {
      angle += angleRad;
    } else if (char === "-") {
      angle -= angleRad;
    } else if (char === "[") {
      stack.push({ x: x, y: y, angle: angle, depth: depth });
      depth += 1;
    } else if (char === "]") {
      const state = stack.pop();
      if (state) {
        x = state.x;
        y = state.y;
        angle = state.angle;
        depth = state.depth;
      }
    }
  }
  return segments;
}

export function normalizeSegments(segments) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  segments.forEach(function (seg) {
    minX = Math.min(minX, seg.x1, seg.x2);
    minY = Math.min(minY, seg.y1, seg.y2);
    maxX = Math.max(maxX, seg.x1, seg.x2);
    maxY = Math.max(maxY, seg.y1, seg.y2);
  });
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const scale = Math.max(width, height);
  return segments.map(function (seg) {
    return {
      x1: (seg.x1 - minX) / scale - 0.5,
      y1: (seg.y1 - minY) / scale - 0.5,
      x2: (seg.x2 - minX) / scale - 0.5,
      y2: (seg.y2 - minY) / scale - 0.5,
      depth: seg.depth
    };
  });
}

export function generate(options) {
  const opts = options || {};
  const sequence = expand(opts.axiom || "F", opts.rules || DEFAULT_RULES, opts.iterations || 4);
  const segments = turtle(sequence, opts.angle || 25, opts.step || 4);
  const normalized = normalizeSegments(segments);
  return { sequence: sequence, segments: segments, normalized: normalized };
}

export function drawSegments(ctx, segments, cx, cy, size, color, lineWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth || 1;
  ctx.beginPath();
  segments.forEach(function (seg) {
    ctx.moveTo(cx + seg.x1 * size, cy + seg.y1 * size);
    ctx.lineTo(cx + seg.x2 * size, cy + seg.y2 * size);
  });
  ctx.stroke();
}
