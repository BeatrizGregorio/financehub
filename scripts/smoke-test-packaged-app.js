/**
 * Boot the packaged app's own server and load every page.
 *
 * Why this exists, beyond verify-packaged-native-module.js: that script checks
 * the binaries it can *find*. It cannot check the one that is missing. A build
 * shipped with `.next/node_modules/better-sqlite3-<hash>/` containing no binary
 * at all, so the scan found one location, called it good, and every page in the
 * installed app answered 500 on its first database query. The server still
 * started, so main.cjs's waitForServer() was happy too.
 *
 * The only check that catches that is running the thing and asking for a page.
 * That is all this does: start resources/standalone/server.js under the
 * packaged Electron, request each route, and fail on anything that is not 200.
 *
 *   node scripts/smoke-test-packaged-app.js
 *
 * It needs an already-migrated database, so it copies the project's own
 * financehub.db to a temp file and points the server at that. Nothing touches
 * the real one, and the packaged app's user data is never opened.
 */

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const PORT = 4199;
const ROUTES = ["/", "/entries", "/investments", "/reports", "/settings", "/accounts", "/cards"];

function unpackedDir() {
  const candidates = [
    path.join(root, "release", "win-unpacked", "resources", "standalone"),
    path.join(root, "release", "mac-arm64", "FinanceHub.app", "Contents", "Resources", "standalone"),
    path.join(root, "release", "mac", "FinanceHub.app", "Contents", "Resources", "standalone"),
  ];
  const found = candidates.find((dir) => fs.existsSync(path.join(dir, "server.js")));
  if (!found) {
    throw new Error("No packaged output found — run electron-builder first.");
  }
  return found;
}

async function waitForServer(url, child, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let exited = null;
  child.on("exit", (code) => {
    exited = code;
  });

  while (Date.now() < deadline) {
    if (exited !== null) throw new Error(`the server exited with code ${exited} before responding`);
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`the server did not respond within ${timeoutMs}ms`);
}

async function main() {
  const standalone = unpackedDir();
  const electron = require("electron");

  const sourceDb = path.join(root, "financehub.db");
  if (!fs.existsSync(sourceDb)) {
    throw new Error("financehub.db is missing — this needs a migrated database to point the server at.");
  }
  const tmpDb = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "financehub-smoke-")), "financehub.db");
  fs.copyFileSync(sourceDb, tmpDb);

  console.log(`Booting ${path.join(standalone, "server.js")}`);
  const child = spawn(electron, ["server.js"], {
    cwd: standalone,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: `file:${tmpDb}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Keep the server's own output: when a page 500s, the reason is in here and
  // nowhere else.
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));

  let failures = 0;
  try {
    await waitForServer(`http://127.0.0.1:${PORT}/`, child);

    for (const route of ROUTES) {
      const res = await fetch(`http://127.0.0.1:${PORT}${route}`);
      const ok = res.status === 200;
      if (!ok) failures++;
      console.log(`  ${ok ? "OK  " : "FAIL"} ${String(res.status).padEnd(4)} ${route}`);
    }
  } finally {
    child.kill();
  }

  if (failures > 0) {
    console.error(`\n${failures} route(s) failed. Server output:\n${log.slice(-4000)}`);
    process.exit(1);
  }

  // A native-module failure shows up as a logged error even on a page that
  // still renders, so treat it as fatal rather than trusting status codes alone.
  if (/Could not locate the bindings file|ERR_DLOPEN_FAILED|NODE_MODULE_VERSION/.test(log)) {
    console.error(`\nThe native module failed to load. Server output:\n${log.slice(-4000)}`);
    process.exit(1);
  }

  console.log(`\nAll ${ROUTES.length} routes returned 200 from the packaged build.`);
}

main().catch((error) => {
  console.error("Smoke test failed:", error.message);
  process.exit(1);
});
