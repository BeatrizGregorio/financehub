// electron-builder's "files"/"extraResources" glob filtering appears to treat
// any folder literally named "node_modules" specially, no matter where it
// appears or what "filter" is set on the extraResources entry — it silently
// produced an empty node_modules in the packaged app for `.next/standalone`
// (a Next.js-generated, non-standard npm layout electron-builder's dependency
// resolution can't parse). Copying it ourselves after packaging, with a plain
// recursive fs copy, sidesteps that filtering entirely.
//
// `dereference: true` is essential here, not optional — and replaced an
// earlier `verbatimSymlinks: true` that turned out to be Mac-only-safe (see
// below for why). Next's own build creates internal symlinks inside
// `.next/standalone/.next/node_modules/` (e.g.
// `better-sqlite3-<hash> -> ../../node_modules/better-sqlite3`, used to load
// native "external" packages). `dereference: true` copies the actual file the
// symlink points to, not the symlink itself — so the packaged app gets a real,
// independent copy of whatever's at that path right now, with no symlink left
// to break.
//
// History of what didn't work, in case this needs revisiting:
// 1. Plain `fs.cpSync` (no symlink option) resolves a relative symlink's
//    target to an *absolute* path before recreating it at the destination —
//    so the packaged app's copy of that symlink silently pointed back at this
//    exact build machine's project folder
//    (`/Users/.../FinanceHub/.next/standalone/node_modules/better-sqlite3`)
//    instead of its own bundled copy. It "worked" during development purely
//    because that original path happened to still exist on this machine with
//    *some* build of the binary in it — confirmed broken by moving this
//    project's own `.next/standalone` aside and relaunching the packaged app.
// 2. `verbatimSymlinks: true` (the direct fix for #1) preserves the symlink
//    as a relative link instead of resolving it — correct on Mac, where it's
//    a real, working relative symlink. But a friend's Windows build kept
//    shipping a stale (wrong-ABI) `better_sqlite3.node` at exactly this path
//    even after `scripts/rebuild-native-for-electron.js` was fixed to find
//    and overwrite every binary location under `.next/standalone` (see that
//    script's comments) and verified in CI that the *source* files were
//    correct before packaging. That only makes sense if the symlink itself
//    didn't survive the Windows copy intact — Windows symlink/junction
//    creation is privilege-gated and known to behave inconsistently, unlike
//    a plain file copy. `dereference: true` sidesteps the question of
//    whether Windows can recreate the link at all: there's no link in the
//    output to get wrong, just the real bytes.
// electron-builder's packaged output layout differs by platform: macOS nests
// everything inside a "<AppName>.app/Contents/Resources" bundle, while
// Windows/Linux use a flat "resources" folder directly under appOutDir. Only
// the mac path was ever hand-verified when this project was mac-only (V1.3);
// added the win32/linux branch when the Windows build was set up (see
// CLAUDE.md's Windows build notes) — same afterPack logic, just resolving
// resourcesDir per platform's real layout instead of assuming a .app bundle.
const fs = require("fs");
const path = require("path");

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

  fs.cpSync(path.join(root, ".next", "standalone"), path.join(resourcesDir, "standalone"), {
    recursive: true,
    dereference: true,
  });
  fs.cpSync(path.join(root, "prisma", "migrations"), path.join(resourcesDir, "prisma-migrations"), {
    recursive: true,
    dereference: true,
  });

  console.log(`afterPack: copied standalone build + migrations into ${resourcesDir}`);
};
