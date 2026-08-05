// electron-builder's "files"/"extraResources" glob filtering appears to treat
// any folder literally named "node_modules" specially, no matter where it
// appears or what "filter" is set on the extraResources entry — it silently
// produced an empty node_modules in the packaged app for `.next/standalone`
// (a Next.js-generated, non-standard npm layout electron-builder's dependency
// resolution can't parse). Copying it ourselves after packaging, with a plain
// recursive fs copy, sidesteps that filtering entirely.
//
// Two things below exist because of a chain of Windows-only symlink bugs in
// this exact copy, each confirmed broken by the CI verification step
// (scripts/verify-packaged-native-module.js) before being replaced — worth
// reading in full if this needs touching again:
//
// 1. Plain `fs.cpSync` (no symlink option) resolves a relative symlink's
//    target to an *absolute* path before recreating it at the destination.
//    Next's own build creates internal symlinks inside
//    `.next/standalone/.next/node_modules/` (e.g.
//    `better-sqlite3-<hash> -> ../../node_modules/better-sqlite3`, used to
//    load native "external" packages) — so the packaged app's copy of that
//    symlink silently pointed back at this exact build machine's project
//    folder (`/Users/.../FinanceHub/.next/standalone/node_modules/better-sqlite3`)
//    instead of its own bundled copy. It "worked" during development purely
//    because that original path happened to still exist on this machine —
//    confirmed broken by moving this project's own `.next/standalone` aside
//    and relaunching the packaged app.
// 2. `verbatimSymlinks: true` (the direct fix for #1) preserves the symlink
//    as a relative link instead of resolving it — correct on Mac, where it's
//    a real, working relative symlink. A friend's Windows build kept
//    shipping a stale (wrong-ABI) binary at exactly this path even after
//    `scripts/rebuild-native-for-electron.js` was fixed and CI-verified to
//    write the correct binary to every location under `.next/standalone`
//    *before* packaging — Windows symlink/junction creation is
//    privilege-gated and known to behave inconsistently.
// 3. `dereference: true` (the direct fix for #2, copies the symlink's target
//    content instead of the link) turned out to be *insufficient* on its
//    own: the CI verification step still caught a broken binary after this
//    change, with the dlopen error reporting the module's real identity as
//    the CI checkout's root `node_modules` path — meaning `fs.cpSync`
//    didn't fully collapse this nested symlinked-directory case on Windows
//    even with `dereference: true` (Node has known rough edges here around
//    symlinks-within-symlinked-directories). Worse, writing new bytes
//    *through* a path that's still secretly a symlink (an early attempt at
//    fixing this — `fs.writeFileSync(pathThatMightBeASymlink, ...)`) writes
//    to whatever the link currently resolves to, not to the packaged path
//    itself — on this build machine that "worked" by accident (the link
//    still resolved to somewhere real), but the packaged artifact would
//    still contain a link pointing outside itself, which is broken for
//    anyone who isn't this exact CI job.
// 4. The actual fix: `resolveSymlinksInPlace()` below walks the packaged
//    `standalone` output *after* the copy and, for literally every symlink
//    it finds anywhere in that tree (not just ones related to
//    better-sqlite3 — this is a general fix, not a one-file patch), deletes
//    the link itself (`fs.rmSync`, which removes the link, not its target)
//    and replaces it with a real, independent copy of whatever
//    `fs.realpathSync` resolves it to at that moment. `realpathSync`
//    collapses a symlink chain of any depth in one call, so this doesn't
//    depend on knowing how many levels of indirection Next's build created.
//    After this runs, the packaged `standalone` folder is guaranteed to
//    contain zero symlinks — nothing left that could resolve to a path that
//    only exists on the machine that built it. If
//    `scripts/verify-packaged-native-module.js` (run right after
//    `electron-builder` in CI) ever fails again, this is the exact spot to
//    revisit — it's what actually caught #2 and #3 before this fix.
//
// electron-builder's packaged output layout differs by platform: macOS nests
// everything inside a "<AppName>.app/Contents/Resources" bundle, while
// Windows/Linux use a flat "resources" folder directly under appOutDir. Only
// the mac path was ever hand-verified when this project was mac-only (V1.3);
// added the win32/linux branch when the Windows build was set up (see
// CLAUDE.md's Windows build notes) — same afterPack logic, just resolving
// resourcesDir per platform's real layout instead of assuming a .app bundle.
const fs = require("fs");
const path = require("path");
const { findBinaries } = require("./lib/find-native-binaries");

// Recursively replaces every symlink under `dir` with a real, independent
// copy of whatever it currently resolves to — directories and files alike.
// See point 4 in the comment above for why this exists.
function resolveSymlinksInPlace(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const realTarget = fs.realpathSync(entryPath);
      const targetStat = fs.statSync(realTarget);
      fs.rmSync(entryPath, { recursive: true, force: true });
      if (targetStat.isDirectory()) {
        fs.cpSync(realTarget, entryPath, { recursive: true });
        resolveSymlinksInPlace(entryPath); // the copied target may itself contain further symlinks
      } else {
        fs.writeFileSync(entryPath, fs.readFileSync(realTarget));
      }
    } else if (entry.isDirectory()) {
      resolveSymlinksInPlace(entryPath);
    }
  }
}

function assertNoSymlinksRemain(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`afterPack: ${entryPath} is still a symlink after resolveSymlinksInPlace — packaging is broken.`);
    }
    if (entry.isDirectory()) assertNoSymlinksRemain(entryPath);
  }
}

module.exports = async function afterPack(context) {
  const root = path.join(__dirname, "..");
  const resourcesDir =
    context.electronPlatformName === "darwin"
      ? path.join(
          context.appOutDir,
          fs.readdirSync(context.appOutDir).find((f) => f.endsWith(".app")),
          "Contents",
          "Resources",
        )
      : path.join(context.appOutDir, "resources");

  const standaloneSrc = path.join(root, ".next", "standalone");
  const standaloneDest = path.join(resourcesDir, "standalone");

  fs.cpSync(standaloneSrc, standaloneDest, {
    recursive: true,
    dereference: true,
  });
  fs.cpSync(path.join(root, "prisma", "migrations"), path.join(resourcesDir, "prisma-migrations"), {
    recursive: true,
    dereference: true,
  });

  // Fix #4 above: eliminate every symlink left over from the copy (whatever
  // Windows did or didn't manage to preserve/dereference correctly), then
  // fail loudly rather than silently ship a build if any survive.
  resolveSymlinksInPlace(standaloneDest);
  assertNoSymlinksRemain(standaloneDest);

  const packagedBinaries = findBinaries(standaloneDest);
  if (packagedBinaries.length === 0) {
    throw new Error(
      `afterPack: found no better_sqlite3.node under ${standaloneDest} after copying — packaging is broken.`,
    );
  }
  console.log(
    `afterPack: confirmed ${packagedBinaries.length} native binary location(s) are real files, not symlinks.`,
  );

  console.log(`afterPack: copied standalone build + migrations into ${resourcesDir}`);
};
