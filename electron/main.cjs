const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { fork } = require("child_process");

const PORT = 4173;
let serverProcess = null;

// In dev (`npm run electron:start`) resources live in the project folder at
// their normal build-output paths. Once packaged, electron-builder copies
// them under process.resourcesPath using the shorter names given to
// "extraResources" in package.json's "build" config — so the two modes need
// different relative paths, not just a different base directory.
const projectRoot = path.join(__dirname, "..");

function getStandaloneDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "standalone")
    : path.join(projectRoot, ".next", "standalone");
}

function getMigrationsDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "prisma-migrations")
    : path.join(projectRoot, "prisma", "migrations");
}

function getDbPath() {
  return path.join(app.getPath("userData"), "financehub.db");
}

// A packaged GUI app has no visible console, so a startup failure used to be
// completely silent to the end user (see the "This page couldn't load" bug
// report this was added for) — everything that can fail during startup gets
// written here too, not just console.log, so a real error can be read back
// (and screenshotted) without needing dev tools or any extra download.
const logPath = path.join(app.getPath("userData"), "financehub.log");
function log(line) {
  const entry = `[${new Date().toISOString()}] ${line}\n`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, entry);
  } catch {
    // Logging must never itself crash startup.
  }
}

// A minimal, dependency-free migration runner: applies each
// prisma/migrations/*/migration.sql file once, tracked in its own
// bookkeeping table. Deliberately not the full Prisma CLI (which would mean
// bundling its engines/toolchain into the app just to run migrations).
function runMigrations(dbPath) {
  // Load from the standalone build's copy specifically (built for Electron's
  // ABI by scripts/rebuild-native-for-electron.js), not the bare "better-sqlite3"
  // specifier — that would resolve to the root node_modules copy instead, which
  // is deliberately kept on the regular Node ABI for `npm run dev` to work.
  const nativeModulePath = path.join(getStandaloneDir(), "node_modules", "better-sqlite3");
  log(`Loading native SQLite module from ${nativeModulePath}`);
  const Database = require(nativeModulePath);
  const migrationsDir = getMigrationsDir();

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);

  try {
    db.exec(
      "CREATE TABLE IF NOT EXISTS _app_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
    );
    const applied = new Set(db.prepare("SELECT name FROM _app_migrations").all().map((r) => r.name));
    const folders = fs
      .readdirSync(migrationsDir)
      .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory())
      .sort();

    const markApplied = db.prepare("INSERT INTO _app_migrations (name, applied_at) VALUES (?, ?)");

    for (const folder of folders) {
      if (applied.has(folder)) continue;
      log(`Applying migration ${folder}`);
      const sql = fs.readFileSync(path.join(migrationsDir, folder, "migration.sql"), "utf8");
      db.exec("BEGIN");
      try {
        db.exec(sql);
        markApplied.run(folder, new Date().toISOString());
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    }
  } finally {
    db.close();
  }
}

// Resolves only once the server responds with an actual success status —
// previously this resolved on *any* HTTP response, including a 500 error
// page, which made a genuinely broken server look "started" and let a dead
// page get loaded into the window instead of surfacing the real failure.
// Also fails fast if the forked server process exits before ever
// responding, instead of silently retrying for the full timeout.
function waitForServer(url, serverExitPromise, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    let settled = false;
    serverExitPromise.then((exitInfo) => {
      if (settled) return;
      settled = true;
      reject(new Error(`FinanceHub server process exited before starting: ${exitInfo}`));
    });

    const attempt = () => {
      if (settled) return;
      const req = http.get(url, (res) => {
        res.resume();
        if (settled) return;
        if (res.statusCode >= 200 && res.statusCode < 400) {
          settled = true;
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          settled = true;
          reject(new Error(`FinanceHub server responded with HTTP ${res.statusCode} and never recovered.`));
        } else {
          setTimeout(attempt, 200);
        }
      });
      req.on("error", (err) => {
        if (settled) return;
        if (Date.now() - start > timeoutMs) {
          settled = true;
          reject(new Error(`FinanceHub server did not start in time (${err.message}).`));
        } else {
          setTimeout(attempt, 200);
        }
      });
    };
    attempt();
  });
}

async function startServer() {
  const dbPath = getDbPath();
  log(`Using database at ${dbPath}`);
  runMigrations(dbPath);
  log("Migrations applied successfully.");

  const serverEntry = path.join(getStandaloneDir(), "server.js");
  log(`Starting server from ${serverEntry}`);

  serverProcess = fork(serverEntry, [], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: `file:${dbPath}`,
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  serverProcess.stdout.on("data", (d) => log(`[server] ${d.toString().trimEnd()}`));
  serverProcess.stderr.on("data", (d) => log(`[server] ${d.toString().trimEnd()}`));

  const serverExitPromise = new Promise((resolve) => {
    serverProcess.on("exit", (code, signal) => resolve(`code=${code} signal=${signal}`));
    serverProcess.on("error", (err) => resolve(err.message));
  });

  await waitForServer(`http://127.0.0.1:${PORT}`, serverExitPromise);
  log("Server responded successfully.");
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

async function showStartupError(win, err) {
  log(`STARTUP FAILED: ${err && err.stack ? err.stack : err}`);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>FinanceHub</title>
    <style>
      body { font-family: -apple-system, "Segoe UI", sans-serif; background: #eef1f7; color: #111827;
             display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { max-width: 560px; padding: 32px; background: white; border-radius: 16px;
              box-shadow: 0 2px 24px -4px rgba(17,24,39,0.15); }
      h1 { font-size: 18px; margin: 0 0 12px; }
      p { font-size: 13.5px; line-height: 1.5; color: #6b7280; }
      pre { background: #f3f4f6; padding: 12px; border-radius: 8px; font-size: 11.5px;
            overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
      code { font-size: 12px; }
    </style></head><body>
    <div class="card">
      <h1>FinanceHub couldn't start</h1>
      <p>Something went wrong on startup. The details below (and a full log at
      <code>${escapeHtml(logPath)}</code>) are what to send back for help.</p>
      <pre>${escapeHtml(err && err.stack ? err.stack : String(err))}</pre>
    </div>
    </body></html>`;
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "FinanceHub",
    backgroundColor: "#e9e9ec",
  });

  try {
    await startServer();
    await win.loadURL(`http://127.0.0.1:${PORT}`);
  } catch (err) {
    await showStartupError(win, err);
  }
}

app.whenReady().then(() => {
  log(`FinanceHub starting (packaged=${app.isPackaged}, platform=${process.platform})`);
  createWindow().catch((err) => {
    log(`FATAL: ${err && err.stack ? err.stack : err}`);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

app.on("before-quit", stopServer);
app.on("will-quit", stopServer);
