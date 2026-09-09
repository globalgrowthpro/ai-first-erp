/**
 * AI-First ERP - Production Node.js Server Runner
 * Designed for cPanel (Phusion Passenger) & Hostinger (hPanel Node.js)
 * Author: Mr. Hafez Rahim
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const CLIENT_DIR = path.join(__dirname, "dist", "client");
const SERVER_ENTRY_PATH = path.join(__dirname, "dist", "server", "server.js");

// MIME Types Map
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

// Lazy load SSR server entry
let ssrHandler = null;
async function getSsrHandler() {
  if (!ssrHandler) {
    if (fs.existsSync(SERVER_ENTRY_PATH)) {
      const mod = await import(`file://${SERVER_ENTRY_PATH}?t=${Date.now()}`);
      ssrHandler = mod.default || mod;
    } else {
      console.warn(`[Server] Warning: SSR bundle not found at ${SERVER_ENTRY_PATH}`);
    }
  }
  return ssrHandler;
}

// Convert Node IncomingMessage to Web Standard Request
function nodeToWebRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = new URL(req.url || "/", `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }
  }

  const isGetOrHead = req.method === "GET" || req.method === "HEAD";
  const init = {
    method: req.method,
    headers,
    body: isGetOrHead ? null : req,
    // Node.js duplex streaming option
    duplex: isGetOrHead ? undefined : "half",
  };

  return new Request(url.toString(), init);
}

// Pipe Web Standard Response to Node ServerResponse
async function sendWebResponse(webRes, res) {
  res.statusCode = webRes.status;
  res.statusMessage = webRes.statusText;

  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!webRes.body) {
    res.end();
    return;
  }

  const reader = webRes.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

// Try serving static asset from dist/client
function tryServeStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;

  let pathname = req.url.split("?")[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return false;
  }

  // Sanitize path to prevent directory traversal
  const safePath = path.normalize(path.join(CLIENT_DIR, pathname));
  if (!safePath.startsWith(CLIENT_DIR)) return false;

  if (fs.existsSync(safePath)) {
    const stat = fs.statSync(safePath);
    if (stat.isFile()) {
      const ext = path.extname(safePath).toLowerCase();
      const mime = MIME_TYPES[ext] || "application/octet-stream";

      res.statusCode = 200;
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Length", stat.size);

      // Long-term cache for hashed Vite assets
      if (pathname.startsWith("/assets/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }

      if (req.method === "HEAD") {
        res.end();
        return true;
      }

      fs.createReadStream(safePath).pipe(res);
      return true;
    }
  }

  return false;
}

// Main HTTP Request Handler
const server = http.createServer(async (req, res) => {
  try {
    // 1. Check if it is a static file in dist/client
    if (tryServeStatic(req, res)) {
      return;
    }

    // 2. Otherwise, delegate to SSR handler
    const handler = await getSsrHandler();
    if (handler && typeof handler.fetch === "function") {
      const webReq = nodeToWebRequest(req);
      const webRes = await handler.fetch(webReq, {}, {});
      await sendWebResponse(webRes, res);
      return;
    }

    // 3. Fallback to dist/client/index.html if available
    const indexPath = path.join(CLIENT_DIR, "index.html");
    if (fs.existsSync(indexPath)) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    // 4. Catastrophic fallback
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("AI-First ERP: Application Build Pending or Asset Not Found.");
  } catch (err) {
    console.error("[Server Error]", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end("<h1>500 Internal Server Error</h1><p>Please check server logs.</p>");
  }
});

// Phusion Passenger (cPanel) & Standard Node (hPanel / Docker / Local)
if (typeof process.env.PASSENGER_APP_ENV !== "undefined" || typeof globalThis.PhusionPassenger !== "undefined") {
  server.listen("passenger", () => {
    console.log("[Server] AI-First ERP running under Phusion Passenger (cPanel)");
  });
} else {
  server.listen(PORT, HOST, () => {
    console.log(`[Server] AI-First ERP running at http://${HOST}:${PORT}`);
  });
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received, closing HTTP server...");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("[Server] SIGINT received, closing HTTP server...");
  server.close(() => process.exit(0));
});
