import { serve } from "bun";
import * as path from "node:path";
import * as fs from "node:fs";

const ROOT = path.resolve(process.argv[2] || ".");
const PORT = Number(process.argv[3] || 5177);

serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    let p = decodeURIComponent(url.pathname);
    if (p === "/") p = "/sidebyside-review.html";
    const full = path.join(ROOT, p);
    if (!full.startsWith(ROOT)) return new Response("forbidden", { status: 403 });
    if (!fs.existsSync(full)) return new Response("not found", { status: 404 });
    const data = fs.readFileSync(full);
    const ext = path.extname(full).toLowerCase();
    const mime = ext === ".html" ? "text/html; charset=utf-8"
      : ext === ".png" ? "image/png"
      : ext === ".css" ? "text/css"
      : "application/octet-stream";
    return new Response(data, { headers: { "Content-Type": mime } });
  },
});
console.log(`SERVE_READY http://127.0.0.1:${PORT}/`);
