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
// 4. A general `resolveSymlinksInPlace()` walk (replace every symlink found
//    via `Dirent.isSymbolicLink()` with a real copy of `fs.realpathSync`'s
//    target) got further — the CI error stopped pointing outside the
//    package entirely — but *still* shipped wrong-ABI bytes. Root cause,
//    finally nailed down: `Dirent.isSymbolicLink()` from
//    `fs.readdirSync(..., { withFileTypes: true })` is not reliable for
//    Windows junctions (a known libuv/Windows rough edge — the fast-path
//    readdir type detection can misreport a junction as a plain directory,
//    where a real `fs.lstatSync` call would correctly identify it). Whatever
//    Node *did* end up resolving through, by the time `after-pack.js` runs
//    (inside the `electron-builder` step, which only starts after
//    `electron:build` — and therefore `rebuild-native-for-electron.js`'s own
//    *last* step, which deliberately resets the **root** `node_modules/better-sqlite3`
//    back to plain Node ABI so `npm run dev` keeps working — has already
//    finished), it resolved to the now-stale root copy, not the still-correct
//    `.next/standalone` copy.
// 5. The actual fix: stop trying to detect or correctly dereference
//    symlinks/junctions at all — for this one file, it doesn't matter how
//    many levels of indirection exist or whether Windows reports them
//    accurately. `.next/standalone/node_modules/better-sqlite3`'s own copy
//    (written directly by `fs.copyFileSync` in
//    `rebuild-native-for-electron.js`, never touched by that script's later
//    root-reset step) is read once as the known-good source, then every
//    `better_sqlite3.node` location `findBinaries()` discovers in the
//    *packaged* output gets unconditionally deleted (`fs.rmSync`, which
//    removes the entry itself — file, symlink, or junction — without
//    following it) and recreated as a brand-new plain file with those exact
//    bytes. No symlink-detection or -dereferencing logic left to get wrong.
//    If `scripts/verify-packaged-native-module.js` (run right after
//    `electron-builder` in CI) ever fails again, this is the exact spot to
//    revisit — it's what caught #2, #3, and #4 before this fix.
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

  // Fix #5 above: don't trust any symlink/junction to resolve correctly on
  // Windows — read the known-good bytes once, then unconditionally delete
  // and recreate every discovered binary location in the packaged output.
  const knownGoodBinary = path.join(
    standaloneSrc,
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node",
  );
  const knownGoodBytes = fs.readFileSync(knownGoodBinary);
  const packagedBinaries = findBinaries(standaloneDest);
  if (packagedBinaries.length === 0) {
    throw new Error(
      `afterPack: found no better_sqlite3.node under ${standaloneDest} after copying — packaging is broken.`,
    );
  }
  for (const binaryPath of packagedBinaries) {
    fs.rmSync(binaryPath, { force: true });
    fs.writeFileSync(binaryPath, knownGoodBytes);
  }
  console.log(
    `afterPack: force-wrote the verified native binary into ${packagedBinaries.length} packaged location(s).`,
  );

  console.log(`afterPack: copied standalone build + migrations into ${resourcesDir}`);
};
