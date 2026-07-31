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

// A minimal, dependency-free migration runner: applies each
// prisma/migrations/*/migration.sql file once, tracked in its own
// bookkeeping table. Deliberately not the full Prisma CLI (which would mean
// bundling its engines/toolchain into the app just to run migrations).
function runMigrations(dbPath) {
  // Load from the standalone build's copy specifically (built for Electron's
  // ABI by scripts/rebuild-native-for-electron.js), not the bare "better-sqlite3"
  // specifier — that would resolve to the root node_modules copy instead, which
  // is deliberately kept on the regular Node ABI for `npm run dev` to work.
  const Database = require(path.join(getStandaloneDir(), "node_modules", "better-sqlite3"));
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

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("FinanceHub server did not start in time."));
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
  runMigrations(dbPath);

  const serverEntry = path.join(getStandaloneDir(), "server.js");

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
  serverProcess.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
  serverProcess.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

  await waitForServer(`http://127.0.0.1:${PORT}`);
}

async function createWindow() {
  await startServer();

  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "FinanceHub",
    backgroundColor: "#e9e9ec",
  });
  win.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(() => {
  createWindow().catch((err) => {
    console.error(err);
    app.quit();
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
