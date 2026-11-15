/**
 * POS APIs - Standalone Node.js HTTP Server Runner
 * Runs high-performance REST API on port 3001 (or process.env.POS_API_PORT).
 * Author: Hafez ERP Engineering
 */

import http from "node:http";
import { URL } from "node:url";
import { handlePosApiRequest, type ApiRequest } from "./routes/router.ts";

export const POS_PORT = parseInt(process.env.POS_API_PORT || "3001", 10);
export const POS_HOST = process.env.POS_API_HOST || "0.0.0.0";

/**
 * Standard HTTP Request Listener
 */
export async function posApiHttpHandler(req: http.IncomingMessage, res: http.ServerResponse) {
  // 1. Set Universal CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Terminal-Id, X-Branch-Id");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const method = req.method || "GET";

  // Fast return for CORS preflight
  if (method.toUpperCase() === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // 2. Parse URL and Query parameters
  const host = req.headers.host || `localhost:${POS_PORT}`;
  const parsedUrl = new URL(req.url || "/", `http://${host}`);
  const query: Record<string, string> = {};
  parsedUrl.searchParams.forEach((val, key) => {
    query[key] = val;
  });

  // 3. Read Request Body
  let rawBody = "";
  req.on("data", (chunk) => {
    rawBody += chunk;
  });

  req.on("end", async () => {
    let parsedBody: any = {};
    if (rawBody.trim()) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: "Invalid JSON request body" }));
        return;
      }
    }

    const apiReq: ApiRequest = {
      method,
      url: req.url || "/",
      pathname: parsedUrl.pathname,
      query,
      body: parsedBody,
      headers: (req.headers as Record<string, string>) || {},
    };

    try {
      const response = await handlePosApiRequest(apiReq);
      res.writeHead(response.status);
      res.end(JSON.stringify(response.body, null, 2));
    } catch (err: any) {
      console.error("[POS-API Error]:", err);
      res.writeHead(500);
      res.end(JSON.stringify({
        success: false,
        error: "Internal POS API server error",
        details: err.message,
      }));
    }
  });
}

/**
 * Creates and starts the HTTP server
 */
export function startPosApiServer(port = POS_PORT, host = POS_HOST): http.Server {
  const server = http.createServer(posApiHttpHandler);
  server.listen(port, host, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 POS REST APIs Server running at http://${host}:${port}`);
    console.log(`   Base URL: http://${host}:${port}/api/pos`);
    console.log(`   Health Check: http://${host}:${port}/api/pos/health`);
    console.log(`   Orders: http://${host}:${port}/api/pos/orders`);
    console.log(`   Shifts: http://${host}:${port}/api/pos/shifts`);
    console.log(`   Catalog: http://${host}:${port}/api/pos/products`);
    console.log(`   Methods: GET | POST | PUT | PATCH | DELETE | OPTIONS`);
    console.log(`=================================================\n`);
  });
  return server;
}

// Auto-run when executed directly via node
const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("pos-apis/server.ts") ||
               process.argv[1]?.replace(/\\/g, "/").endsWith("pos-apis/server.js") ||
               process.argv[1]?.replace(/\\/g, "/").endsWith("pos-apis/index.ts") ||
               process.argv[1]?.replace(/\\/g, "/").endsWith("pos-apis/index.js");

if (isMain) {
  startPosApiServer();
}
