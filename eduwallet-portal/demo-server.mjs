import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = Number(process.env.PORT ?? 8080);
const backendUrl = process.env.PORTAL_BACKEND_URL ?? "http://localhost:4000";
const distDir = path.join(__dirname, "dist");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function getStaticFilePath(requestUrl) {
  const cleanPath = decodeURIComponent(requestUrl.split("?")[0] ?? "/");
  const requestedPath = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.join(distDir, requestedPath);

  if (filePath.startsWith(distDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }

  return path.join(distDir, "index.html");
}

async function proxyApiRequest(req, res) {
  const targetPath = req.url?.replace(/^\/api/, "") || "/";
  const targetUrl = new URL(targetPath, backendUrl);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
  });

  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(Buffer.from(await response.arrayBuffer()));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url?.startsWith("/api")) {
      await proxyApiRequest(req, res);
      return;
    }

    const filePath = getStaticFilePath(req.url ?? "/");
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] ?? "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("Demo server error:", error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Demo server error");
  }
});

server.listen(port, () => {
  console.log(`EduWallet Portal demo server running on http://localhost:${port}`);
  console.log(`Proxying /api to ${backendUrl}`);
});