const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const port = Number(process.env.PORT || 3000);
const root = __dirname;
const dataFile = path.join(root, "letters.json");
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".mp3":"audio/mpeg"};
const requests = new Map();

function readLetters() {
  try {
    const value = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
function saveLetters(letters) { fs.writeFileSync(dataFile, JSON.stringify(letters, null, 2)); }
function send(res, status, body, type="application/json; charset=utf-8") {
  res.writeHead(status, {"Content-Type": type, "Cache-Control": "no-store"});
  if (status === 204) return res.end();
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}
function readBody(req, limit=100000) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > limit) reject(new Error("Request too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
function rateLimit(req) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (requests.get(key) || []).filter(time => now - time < 60000);
  if (recent.length >= 20) return false;
  recent.push(now); requests.set(key, recent); return true;
}
function authorizeAdmin(req, res) {
  if (!process.env.ADMIN_PASSWORD || Buffer.byteLength(process.env.ADMIN_PASSWORD, "utf8") < 16) {
    send(res, 503, {error:"Mật khẩu quản trị chưa được cấu hình hoặc ngắn hơn 16 ký tự."});
    return false;
  }
  if (!rateLimit(req)) {
    send(res, 429, {error:"Quá nhiều yêu cầu. Vui lòng thử lại sau."});
    return false;
  }
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expected = Buffer.from(process.env.ADMIN_PASSWORD);
  const provided = Buffer.from(token);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    send(res, 401, {error:"Mật khẩu quản trị không đúng."});
    return false;
  }
  return true;
}
function safeFile(requestPath) {
  const file = path.resolve(root, "." + (requestPath === "/" ? "/index.html" : requestPath));
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return file;
}

const server = http.createServer(async (req, res) => {
  const requestPath = new URL(req.url, "http://localhost").pathname;
  try {
    if (requestPath === "/api/letters" && req.method === "GET") {
      return send(res, 200, readLetters().filter(letter => (letter.status || "approved") === "approved"));
    }
    if (requestPath === "/api/admin/letters" && req.method === "GET") {
      if (!authorizeAdmin(req, res)) return;
      return send(res, 200, readLetters());
    }
    if (requestPath === "/api/letters" && req.method === "POST") {
      if (!rateLimit(req)) return send(res, 429, {error:"Bạn gửi quá nhanh. Vui lòng thử lại sau."});
      const input = JSON.parse(await readBody(req));
      const message = String(input.message || "").trim();
      const words = message ? message.split(/\s+/).length : 0;
      if (!message || words > 1000) return send(res, 400, {error:"Tâm thư phải có từ 1 đến 1.000 từ."});
      const item = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: String(input.name || "").trim().slice(0, 40),
        type: String(input.type || "💌 Tâm thư").slice(0, 40),
        message, createdAt: new Date().toISOString(), status: "approved"
      };
      const letters = readLetters(); letters.push(item); saveLetters(letters);
      return send(res, 201, item);
    }
    if (requestPath.startsWith("/api/letters/")) {
      if ((req.method === "DELETE" || req.method === "PATCH") && !authorizeAdmin(req, res)) return;
      const id = Number(decodeURIComponent(requestPath.slice("/api/letters/".length)));
      if (!Number.isInteger(id)) return send(res, 400, {error:"Mã tâm thư không hợp lệ."});
      if (req.method === "DELETE") {
        const letters = readLetters(), remaining = letters.filter(letter => letter.id !== id);
        if (remaining.length === letters.length) return send(res, 404, {error:"Không tìm thấy tâm thư."});
        saveLetters(remaining); return send(res, 204, null);
      }
      if (req.method === "PATCH") {
        const input = JSON.parse(await readBody(req, 10000)), letters = readLetters();
        const letter = letters.find(item => item.id === id);
        if (!letter) return send(res, 404, {error:"Không tìm thấy tâm thư."});
        if (!["approved", "hidden"].includes(input.status)) return send(res, 400, {error:"Trạng thái không hợp lệ."});
        letter.status = input.status; saveLetters(letters); return send(res, 200, letter);
      }
    }
    if (requestPath === "/api/letters" && req.method === "OPTIONS") return send(res, 204, null);

    const file = safeFile(requestPath);
    if (!file) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    fs.readFile(file, (error, content) => {
      if (error) return send(res, 404, "Not found", "text/plain; charset=utf-8");
      send(res, 200, content, mime[path.extname(file)] || "application/octet-stream");
    });
  } catch (error) {
    send(res, error.message === "Request too large" ? 413 : 400, {error:"Yêu cầu không hợp lệ."});
  }
});

server.listen(port, () => {
  console.log(`Góc Tâm Thư đang chạy tại http://localhost:${port}`);
  if (!process.env.ADMIN_PASSWORD || Buffer.byteLength(process.env.ADMIN_PASSWORD, "utf8") < 16) {
    console.warn("Quản trị đang bị khóa: hãy cấu hình ADMIN_PASSWORD (tối thiểu 16 ký tự) trước khi sử dụng.");
  }
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const network of interfaces || []) if (network.family === "IPv4" && !network.internal) console.log(`Điện thoại: http://${network.address}:${port}`);
  }
});
