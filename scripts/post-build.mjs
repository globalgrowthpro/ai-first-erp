/**
 * Post-Build Script: Generate Static index.html and Prepare cPanel/hPanel Artifacts
 * Author: Mr. Hafez Rahim
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CLIENT_DIR = path.join(ROOT_DIR, "dist", "client");
const SERVER_DIR = path.join(ROOT_DIR, "dist", "server");
const SERVER_FILE = path.join(SERVER_DIR, "server.js");

async function main() {
  console.log("⚡ [Post-Build] Preparing deployment package for cPanel & hPanel...");

  if (!fs.existsSync(CLIENT_DIR)) {
    console.error("❌ [Post-Build] dist/client directory not found! Run vite build first.");
    process.exit(1);
  }

  // 1. Copy .htaccess into dist/client/.htaccess
  const htaccessSource = path.join(ROOT_DIR, ".htaccess");
  const htaccessDest = path.join(CLIENT_DIR, ".htaccess");
  if (fs.existsSync(htaccessSource)) {
    fs.copyFileSync(htaccessSource, htaccessDest);
    console.log("✅ [Post-Build] Copied .htaccess to dist/client/.htaccess");
  } else {
    console.warn("⚠️ [Post-Build] .htaccess not found at root!");
  }

  // 2. Pre-render root route into dist/client/index.html for static/SPA fallback
  if (fs.existsSync(SERVER_FILE)) {
    try {
      const mod = await import(`file://${SERVER_FILE}`);
      const handler = mod.default || mod;
      if (handler && typeof handler.fetch === "function") {
        const res = await handler.fetch(new Request("http://localhost/"));
        if (res.ok) {
          const html = await res.text();
          const indexDest = path.join(CLIENT_DIR, "index.html");
          fs.writeFileSync(indexDest, html, "utf-8");
          console.log(`✅ [Post-Build] Generated dist/client/index.html (${(html.length / 1024).toFixed(1)} KB)`);
        } else {
          console.warn(`⚠️ [Post-Build] SSR fetch returned status ${res.status}`);
        }
      }
    } catch (e) {
      console.error("❌ [Post-Build] Failed to pre-render index.html:", e);
    }
  }

  console.log("\n🚀 [Post-Build] Build Complete!");
  console.log("  Option A (Node.js App on cPanel/hPanel): Upload root files with app.js and dist/");
  console.log("  Option B (Static upload to public_html): Upload contents of dist/client directly!");
}

main().catch((err) => {
  console.error("Fatal error in post-build:", err);
  process.exit(1);
});
