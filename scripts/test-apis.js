import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "../artifacts/api-server/dist/index.mjs");

console.log("Starting integration test server...");
const child = spawn("node", ["--enable-source-maps", serverPath], {
  env: {
    ...process.env,
    PORT: "8099",
    DATABASE_URL: "", // Simulate database offline mode to test fallbacks!
    RESET_ADMIN_PASSWORD: "false",
    PINO_LOG_LEVEL: "warn"
  },
  stdio: "pipe"
});

let serverReady = false;
let failed = false;

// Handle timeout
const timeoutId = setTimeout(() => {
  console.error("Test timeout. Server did not start in time.");
  child.kill();
  process.exit(1);
}, 15000);

child.stdout.on("data", async (data) => {
  const output = data.toString();
  
  if (output.includes("Server listening") && !serverReady) {
    serverReady = true;
    clearTimeout(timeoutId);
    console.log("\nServer is online. Starting API endpoint verification tests...\n");
    await runTests();
  }
});

child.stderr.on("data", (data) => {
  console.error(`[Server Error]: ${data.toString().trim()}`);
});

child.on("close", (code) => {
  console.log(`\nTest runner completed. Exit code: ${failed ? 1 : 0}`);
  process.exit(failed ? 1 : 0);
});

async function runTests() {
  const tests = [
    { name: "Health Check", url: "http://localhost:8099/health", method: "GET", status: 200 },
    { name: "Public Settings", url: "http://localhost:8099/api/public-settings", method: "GET", status: 200 },
    { name: "List Tools", url: "http://localhost:8099/api/tools", method: "GET", status: 200 },
    { name: "Tools Stats", url: "http://localhost:8099/api/tools/stats", method: "GET", status: 200 },
    { name: "Categories", url: "http://localhost:8099/api/tools/categories", method: "GET", status: 200 },
    { name: "Blog Posts", url: "http://localhost:8099/api/blogs", method: "GET", status: 200 },
    { name: "Articles", url: "http://localhost:8099/api/articles", method: "GET", status: 200 },
    { name: "Track Visit", url: "http://localhost:8099/api/visit", method: "POST", status: 200 },
    { name: "Tool Details", url: "http://localhost:8099/api/tools/merge-pdf", method: "GET", status: 200 },
    { name: "Tool Track", url: "http://localhost:8099/api/tools/merge-pdf/track", method: "POST", status: 200, body: { filesProcessed: 2 } },
    { name: "Ratings Fetch", url: "http://localhost:8099/api/ratings/merge-pdf", method: "GET", status: 200 },
    { name: "Ratings Post", url: "http://localhost:8099/api/ratings/merge-pdf", method: "POST", status: 200, body: { rating: 5 } },
    { name: "Contact Form Submit", url: "http://localhost:8099/api/contact", method: "POST", status: 200, body: { name: "Test User", email: "test@example.com", subject: "Test", message: "Hello world" } },
    { name: "Clipboard Save", url: "http://localhost:8099/api/clipboard", method: "POST", status: 200, body: { content: "Test Clipboard Content" } },
    { name: "Admin Settings Update", url: "http://localhost:8099/api/admin/settings", method: "PUT", status: 200, headers: { Authorization: "Bearer admin123" }, body: { site_title: "Updated Title" } },
    { name: "Admin Tool Update", url: "http://localhost:8099/api/admin/tools/merge-pdf", method: "PUT", status: 200, headers: { Authorization: "Bearer admin123" }, body: { name: "Merged PDF Custom" } },
    { name: "Admin Blog Update", url: "http://localhost:8099/api/admin/blogs/1", method: "PUT", status: 200, headers: { Authorization: "Bearer admin123" }, body: { slug: "test-blog", title: "Updated Blog", content: "Some content", summary: "summary" } },
    { name: "Admin Article Update", url: "http://localhost:8099/api/admin/articles/1", method: "PUT", status: 200, headers: { Authorization: "Bearer admin123" }, body: { slug: "test-article", title: "Updated Article", content: "Some content", summary: "summary" } },
  ];

  for (const t of tests) {
    try {
      const options = {
        method: t.method,
        headers: { "Content-Type": "application/json", ...(t.headers || {}) }
      };
      if (t.body) {
        options.body = JSON.stringify(t.body);
      }
      const start = Date.now();
      const res = await fetch(t.url, options);
      const duration = Date.now() - start;
      
      if (res.status === t.status) {
        console.log(`   ✅ [PASS] ${t.name} (${t.method} ${res.status}) - ${duration}ms`);
      } else {
        console.error(`   ❌ [FAIL] ${t.name} (Expected status ${t.status}, got ${res.status})`);
        failed = true;
      }
    } catch (e) {
      console.error(`   ❌ [FAIL] ${t.name} (Fetch failed: ${e.message})`);
      failed = true;
    }
  }

  console.log("\nAll integration checks complete. Stopping server...");
  child.kill();
}

