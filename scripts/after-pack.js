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
// 5. Force-writing the known-good bytes into the leaf `.node` *file* (no
//    symlink detection, no dereferencing) still failed, with the exact same
//    "resolved to the CI checkout's root `node_modules`" error as #3. The
//    reason: the thing that's actually a junction here is the *directory*
//    (`better-sqlite3-<hash>`), not the file inside it. Windows transparently
//    redirects *every* file operation that passes through a junctioned path
//    component — reads, writes, deletes, all of it, at the OS/filesystem-driver
//    level, regardless of which API or tool performs them. So "deleting and
//    recreating" the leaf file was actually deleting and recreating a file
//    inside the junction's *target* (the CI checkout's root `node_modules`),
//    not a genuinely separate file under the packaged output at all — our own
//    fix was unknowingly operating on the wrong location. And that root copy
//    gets reset back to plain Node ABI by the workflow's own final safety-net
//    step (`npm rebuild better-sqlite3`, which runs *after* `electron-builder`
//    — and therefore after this hook — as part of the same `electron:dist:win`
//    command, specifically so `npm run dev` keeps working), which is why the
//    exact same wrong-ABI failure kept reappearing no matter how carefully the
//    leaf file was "fixed": there was never a real, independent packaged file
//    to fix in the first place.
// 6. The actual fix: `breakJunctionsInPlace()` walks the packaged output using
//    `fs.lstatSync` (not `fs.readdirSync(..., { withFileTypes: true })`'s
//    Dirent info — the exact detection gap that made fix #4 miss this) to
//    authoritatively detect *directory-level* reparse points too, not just
//    file-level ones. For each one found, it reads/copies the junction's
//    *current* target content, deletes the junction entry itself (which,
//    like `rm`/`rmdir` on any symlink, removes only the link — confirmed via
//    Node's own documented `fs.rm` behavior, not an assumption specific to
//    Windows this time), and recreates a real, independent directory in its
//    place — so nothing under the packaged `standalone` folder shares storage
//    with root `node_modules` anymore, and the later ABI-reset step can't
//    reach it. The existing force-write-known-good-bytes pass (fix #5) then
//    runs on top of that as defense in depth, and a final walk-up-the-path
//    assertion throws loudly if any reparse point somehow survives, instead
//    of silently shipping a broken build a fifth time. If
//    `scripts/verify-packaged-native-module.js` (run right after
//    `electron-builder` in CI) ever fails again, this is the exact spot to
//    revisit — it's what caught #2, #3, #4, and #5 before this fix.
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

// Authoritative reparse-point check — deliberately uses a real fs.lstatSync
// call, not fs.readdirSync(..., { withFileTypes: true })'s Dirent info,
// which has a known reliability gap for Windows junctions (see point 4 in
// the comment above).
function isReparsePoint(entryPath) {
  try {
    return fs.lstatSync(entryPath).isSymbolicLink();
  } catch {
    return false;
  }
}

// Recursively replaces every symlink/junction under `dir` — directories and
// files alike — with a real, independent copy of whatever it currently
// resolves to. Must handle directory-level reparse points, not just leaf
// files: see point 5 in the comment above for why fixing only the file
// inside a junctioned directory doesn't actually separate it from whatever
// the junction points to.
function breakJunctionsInPlace(dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const entryPath = path.join(dir, name);
    if (isReparsePoint(entryPath)) {
      const realTarget = fs.realpathSync(entryPath);
      const targetIsDirectory = fs.statSync(realTarget).isDirectory();
      const targetBytes = targetIsDirectory ? null : fs.readFileSync(realTarget);
      // Removes the reparse point entry itself, not whatever it points to —
      // matches Node's documented fs.rm behavior for symlinks, and Windows'
      // own RemoveDirectory/DeleteFile semantics for junctions.
      fs.rmSync(entryPath, { recursive: true, force: true });
      if (targetIsDirectory) {
        fs.cpSync(realTarget, entryPath, { recursive: true });
        breakJunctionsInPlace(entryPath); // the copied-in content may itself contain further junctions
      } else {
        fs.writeFileSync(entryPath, targetBytes);
      }
    } else if (fs.statSync(entryPath).isDirectory()) {
      breakJunctionsInPlace(entryPath);
    }
  }
}

function assertNoReparsePointsAlongPath(fullPath, root) {
  let current = fullPath;
  while (current !== root && current !== path.dirname(current)) {
    if (isReparsePoint(current)) {
      throw new Error(
        `afterPack: ${current} is still a symlink/junction after breakJunctionsInPlace — packaging is broken.`,
      );
    }
    current = path.dirname(current);
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

  // Fix #6 above: break every directory-level (not just file-level) junction
  // under the packaged output first, so the packaged copy no longer shares
  // storage with root node_modules at all.
  breakJunctionsInPlace(standaloneDest);

  // Fix #5 above, now actually landing on independent files: read the
  // known-good bytes once, then unconditionally delete and recreate every
  // discovered binary location in the packaged output.
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
    assertNoReparsePointsAlongPath(binaryPath, standaloneDest);
  }
  console.log(
    `afterPack: force-wrote the verified native binary into ${packagedBinaries.length} packaged location(s), confirmed independent of any symlink/junction.`,
  );

  console.log(`afterPack: copied standalone build + migrations into ${resourcesDir}`);
};
