// The Next.js standalone output (.next/standalone/node_modules) is a pruned
// copy without the usual dependency-graph metadata, so @electron/rebuild's
// own directory scanner can't find better-sqlite3 in it directly (tested:
// `electron-rebuild -m .next/standalone` reports "No native modules found").
//
// Workaround: rebuild the *root* copy of better-sqlite3 against Electron's
// ABI (this works fine — the root node_modules has full dependency metadata),
// copy the resulting binary into the standalone copy, then rebuild the root
// copy back to the regular Node ABI so `npm run dev` keeps working.
//
// Every step is verified by actually trying to load the binary under the
// relevant runtime (Electron vs. plain Node) rather than trusting exit codes —
// `@electron/rebuild -f` was observed to report "Rebuild Complete" without
// actually producing an Electron-ABI binary on a repeat run in this project's
// history, so silent trust here previously shipped a broken .dmg.
const { execFileSync, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const relBinary = "build/Release/better_sqlite3.node";
const rootPkgDir = path.join(root, "node_modules/better-sqlite3");
const rootBinary = path.join(rootPkgDir, relBinary);
const standaloneBinary = path.join(root, ".next/standalone/node_modules/better-sqlite3", relBinary);
// require("electron") resolves to the actual platform binary path (electron.exe
// on Windows, .../Electron.app/Contents/MacOS/Electron on Mac) — not hardcoded
// to "node_modules/.bin/electron", which on Windows is a .cmd shim, not a
// directly execFileSync-able binary.
const electronBin = require("electron");

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

function loadsUnderElectron(binaryPath) {
  try {
    execFileSync(electronBin, ["-e", `require(${JSON.stringify(binaryPath)})`], {
      cwd: root,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

function loadsUnderNode(binaryPath) {
  try {
    execFileSync(process.execPath, ["-e", `require(${JSON.stringify(binaryPath)})`], {
      cwd: root,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

if (!fs.existsSync(standaloneBinary)) {
  console.error(`Expected ${standaloneBinary} — run "next build" + prepare-electron.js first.`);
  process.exit(1);
}

// Force a truly clean rebuild — no stale build/ dir left for node-gyp or
// electron-rebuild's own caching to short-circuit against.
fs.rmSync(path.join(rootPkgDir, "build"), { recursive: true, force: true });
run("npx electron-rebuild -f -w better-sqlite3");

if (!loadsUnderElectron(rootBinary)) {
  console.error(
    "electron-rebuild ran but the resulting binary still doesn't load under Electron's runtime. " +
      "Not copying a broken binary into the standalone build — investigate before re-running.",
  );
  process.exit(1);
}
console.log("Verified: root better-sqlite3 now loads under Electron's runtime.");

fs.copyFileSync(rootBinary, standaloneBinary);
console.log(`Copied Electron-ABI binary into ${standaloneBinary}`);

fs.rmSync(path.join(rootPkgDir, "build"), { recursive: true, force: true });
run("npm rebuild better-sqlite3");

if (!loadsUnderNode(rootBinary)) {
  console.error(
    "npm rebuild ran but the root better-sqlite3 copy still doesn't load under plain Node — " +
      "`npm run dev` will be broken until this is fixed.",
  );
  process.exit(1);
}
console.log("Verified: root better-sqlite3 restored to the regular Node ABI for `npm run dev`.");
