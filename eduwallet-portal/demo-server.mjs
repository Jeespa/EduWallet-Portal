import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 8080);
const BACKEND_URL = process.env.PORTAL_BACKEND_URL ?? "http://localhost:4000";
const DIST_DIR = path.join(__dirname, "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function proxyApiRequest(req, res) {
  const originalUrl = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const backendPath = originalUrl.pathname.replace(/^\/api/, "") || "/";
  const backendUrl = `${BACKEND_URL}${backendPath}${originalUrl.search}`;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await readRequestBody(req) : undefined;

  try {
    const response = await fetch(backendUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "content-encoding" && key.toLowerCase() !== "transfer-encoding") {
        responseHeaders[key] = value;
      }
    });

    const responseBody = Buffer.from(await response.arrayBuffer());

    res.writeHead(response.status, responseHeaders);
    res.end(responseBody);
  } catch (error) {
    console.error("API proxy failed:", error);

    send(
      res,
      502,
      JSON.stringify({
        error:
          "Could not reach the portal backend. Make sure portal-backend is running on localhost:4000.",
      }),
      {
        "Content-Type": "application/json; charset=utf-8",
      },
    );
  }
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === "/") {
    pathname = "/index.html";
  }

  let filePath = path.normalize(path.join(DIST_DIR, pathname));

  if (!filePath.startsWith(DIST_DIR)) {
    send(res, 403, "Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch {
    const htmlCandidate = path.join(DIST_DIR, `${pathname}.html`);

    if (existsSync(htmlCandidate)) {
      filePath = htmlCandidate;
    } else {
      filePath = path.join(DIST_DIR, "index.html");
    }
  }

  if (!existsSync(filePath)) {
    send(res, 404, "Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
  });

  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (requestUrl.pathname.startsWith("/api")) {
      await proxyApiRequest(req, res);
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    console.error("Demo server error:", error);
    send(res, 500, "Internal server error");
  }
});

server.listen(PORT, () => {
  console.log(`EduWallet Portal demo server running at http://localhost:${PORT}`);
  console.log(`Proxying /api to ${BACKEND_URL}`);
});
