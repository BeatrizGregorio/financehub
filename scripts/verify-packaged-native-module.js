// The rebuild script (scripts/rebuild-native-for-electron.js) verifies the
// Electron-ABI binary loads correctly *before* packaging, at every location
// under .next/standalone. That was not enough — a friend's Windows build
// still shipped a broken binary, because the afterPack copy step
// (scripts/after-pack.js) turned out to mangle the fix on the way into the
// packaged app. That class of bug is invisible to the pre-packaging check by
// definition: it only exists in the packaging step itself.
//
// This runs after `electron-builder` (packaging) finishes and dlopens every
// better_sqlite3.node found in the actual unpacked app output, using the
// actual packaged Electron executable — the same "require() it under the
// real runtime, don't trust exit codes" approach as the rebuild script, just
// pointed at the final artifact instead of the intermediate one. This is the
// automated version of the manual "move .next/standalone aside and relaunch
// the packaged app" test described in CLAUDE.md's "Verifying a change"
// section — codified here specifically because that manual test isn't
// possible for the Windows build on a Mac dev machine.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const releaseDir = path.join(root, "release");

function findBinaries(dir, matches = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return matches;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      findBinaries(full, matches);
    } else if (stat.isFile() && entry.name === "better_sqlite3.node") {
      matches.push(full);
    }
  }
  return matches;
}

function findUnpackedDir() {
  const candidates = fs
    .readdirSync(releaseDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.endsWith("-unpacked"))
    .map((e) => path.join(releaseDir, e.name));
  if (candidates.length === 0) {
    console.error(`No "*-unpacked" directory found under ${releaseDir} — did electron-builder run first?`);
    process.exit(1);
  }
  return candidates[0];
}

function findPackagedExecutable(unpackedDir) {
  const exe = fs.readdirSync(unpackedDir).find((f) => f.toLowerCase().endsWith(".exe"));
  if (exe) return path.join(unpackedDir, exe);
  // macOS/Linux fallback, in case this script is ever reused there.
  const app = fs.readdirSync(unpackedDir).find((f) => f.endsWith(".app"));
  if (app) return path.join(unpackedDir, app, "Contents", "MacOS", "FinanceHub");
  console.error(`No packaged executable found in ${unpackedDir}`);
  process.exit(1);
}

const unpackedDir = findUnpackedDir();
const executable = findPackagedExecutable(unpackedDir);
const binaries = findBinaries(path.join(unpackedDir, "resources", "standalone"));

if (binaries.length === 0) {
  console.error(`Found no better_sqlite3.node under ${unpackedDir}/resources/standalone — packaging is broken.`);
  process.exit(1);
}
console.log(`Verifying ${binaries.length} packaged better-sqlite3 binary location(s) against ${executable}`);

let failed = false;
for (const binaryPath of binaries) {
  try {
    execFileSync(executable, ["-e", `require(${JSON.stringify(binaryPath)})`], {
      cwd: root,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: "pipe",
    });
    console.log(`OK: ${binaryPath}`);
  } catch (err) {
    failed = true;
    console.error(`FAILED to load under the packaged app's own runtime: ${binaryPath}`);
    console.error(err.stderr ? err.stderr.toString() : err.message);
  }
}

if (failed) {
  console.error(
    "One or more native module binaries in the packaged app are broken. " +
      "This is the exact class of bug that shipped a NODE_MODULE_VERSION mismatch to a real user before — do not ship this build.",
  );
  process.exit(1);
}
console.log("All packaged native module binaries load correctly under the packaged app's own runtime.");
