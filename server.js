const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const port = process.env.PORT || 3000;
const root = __dirname;
const dataFile = path.join(root, "letters.json");
const adminToken = process.env.DELETE_ADMIN_TOKEN || "";
const postAttempts = new Map();
const allowedTypes = new Set(["💌 Tâm thư", "🎉 Chúc mừng", "❤️ Lời yêu thương", "🌟 Lời chúc"]);
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".mp3":"audio/mpeg"};

function readLetters() {
  try { return JSON.parse(fs.readFileSync(dataFile, "utf8")); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    return [];
  }
}
function send(res, status, body, type="application/json; charset=utf-8") {
  res.writeHead(status, {"Content-Type": type, "Cache-Control": "no-store"});
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}
function saveLetters(letters) { fs.writeFileSync(dataFile, JSON.stringify(letters, null, 2)); }
function isAdmin(req) {
  const provided = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const expectedBuffer = Buffer.from(adminToken);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length > 0 && providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}
function allowPost(req) {
  const client = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let attempt = postAttempts.get(client);
  if (!attempt || now - attempt.startedAt >= 60_000) {
    attempt = {startedAt: now, count: 0};
    postAttempts.set(client, attempt);
  }
  attempt.count += 1;
  if (postAttempts.size > 1000) {
    for (const [address, entry] of postAttempts) {
      if (now - entry.startedAt >= 60_000) postAttempts.delete(address);
    }
  }
  return attempt.count <= 10;
}

const server = http.createServer((req, res) => {
  if (req.url === "/api/letters" && req.method === "GET") {
    res.setHeader("X-Admin-Delete-Enabled", String(Boolean(adminToken)));
    return send(res, 200, readLetters());
  }
  if (req.url.startsWith("/api/letters/") && req.method === "DELETE") {
    if (!adminToken) return send(res, 503, {error:"Chức năng xóa chưa được cấu hình."});
    if (!isAdmin(req)) return send(res, 401, {error:"Cần mã quản trị để xóa tâm thư."});
    const id = Number(decodeURIComponent(req.url.slice("/api/letters/".length)));
    if (!Number.isInteger(id)) return send(res, 400, {error:"Mã tâm thư không hợp lệ."});
    const letters = readLetters();
    const remaining = letters.filter(letter => letter.id !== id);
    if (remaining.length === letters.length) return send(res, 404, {error:"Không tìm thấy tâm thư."});
    saveLetters(remaining);
    return send(res, 204, null);
  }
  if (req.url === "/api/letters" && req.method === "POST") {
    if (!allowPost(req)) {
      res.setHeader("Retry-After", "60");
      return send(res, 429, {error:"Bạn gửi hơi nhanh. Vui lòng thử lại sau một phút."});
    }
    let body = "";
    let tooLarge = false;
    req.on("data", chunk => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body) > 50000) tooLarge = true;
    });
    req.on("end", () => {
      try {
        if (tooLarge) return send(res, 413, {error:"Nội dung gửi lên quá lớn."});
        const input = JSON.parse(body);
        if (input.privacyConsent !== true) return send(res, 400, {error:"Bạn cần đồng ý với thông tin lưu trữ trước khi gửi."});
        const message = String(input.message || "").trim();
        const words = message ? message.split(/\s+/).length : 0;
        if (!message || words > 1000 || message.length > 20000) return send(res, 400, {error:"Tâm thư phải có từ 1 đến 1.000 từ."});
        const type = String(input.type || "💌 Tâm thư");
        if (!allowedTypes.has(type)) return send(res, 400, {error:"Loại tâm thư không hợp lệ."});
        const item = {
          id: Date.now(),
          name: String(input.name || "").trim().slice(0, 40),
          type,
          message,
          createdAt: new Date().toISOString()
        };
        const letters = readLetters();
        letters.push(item);
        saveLetters(letters);
        return send(res, 201, item);
      } catch (error) { return send(res, 400, {error:"Dữ liệu không hợp lệ."}); }
    });
    return;
  }

  const requested = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.normalize(path.join(root, requested));
  if (!file.startsWith(root)) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  fs.readFile(file, (error, content) => {
    if (error) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    send(res, 200, content, mime[path.extname(file)] || "application/octet-stream");
  });
});

server.listen(port, () => console.log(`Góc Tâm Thư đang chạy tại http://localhost:${port}`));
