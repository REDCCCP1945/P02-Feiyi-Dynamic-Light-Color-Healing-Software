function sendJson(res, code, payload) {
  const text = JSON.stringify(payload);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store"
  });
  res.end(text);
}

function readBody(req, limit, callback) {
  const chunks = [];
  let size = 0;
  let done = false;
  req.on("data", function (chunk) {
    size += chunk.length;
    if (size > limit) {
      if (!done) {
        done = true;
        callback(new Error("too large"));
        req.destroy();
      }
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", function () {
    if (done) return;
    done = true;
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) {
      callback(null, {});
      return;
    }
    try {
      callback(null, JSON.parse(raw));
    } catch (e) {
      callback(new Error("invalid json"));
    }
  });
  req.on("error", function (err) {
    if (!done) {
      done = true;
      callback(err);
    }
  });
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "127.0.0.1";
}

module.exports = { sendJson, readBody, clientIp };
