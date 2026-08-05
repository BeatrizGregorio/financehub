// electron-builder's "files"/"extraResources" glob filtering appears to treat
// any folder literally named "node_modules" specially, no matter where it
// appears or what "filter" is set on the extraResources entry — it silently
// produced an empty node_modules in the packaged app for `.next/standalone`
// (a Next.js-generated, non-standard npm layout electron-builder's dependency
// resolution can't parse). Copying it ourselves after packaging, with a plain
// recursive fs copy, sidesteps that filtering entirely.
//
// `verbatimSymlinks: true` is essential here, not optional: Next's own build
// creates internal symlinks inside `.next/standalone/.next/node_modules/`
// (e.g. `better-sqlite3-<hash> -> ../../node_modules/better-sqlite3`, used to
// load native "external" packages). Without `verbatimSymlinks`, `fs.cpSync`
// resolves a relative symlink's target to an *absolute* path before recreating
// it at the destination — so the packaged app's copy of that symlink silently
// pointed back at this exact build machine's project folder
// (`/Users/.../FinanceHub/.next/standalone/node_modules/better-sqlite3`)
// instead of its own bundled copy. It "worked" during development purely
// because that original path happened to still exist on this machine with
// *some* build of the binary in it (sometimes the right ABI, sometimes not,
// depending on what `npm run dev`/`electron:build` had last touched — which is
// what made this look like an intermittent ABI bug for a while). On a real
// end-user machine without this project folder, it would fail outright with
// "Cannot find module" — confirmed by temporarily moving this project's own
// `.next/standalone` aside and relaunching the packaged app.
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
    verbatimSymlinks: true,
  });
  fs.cpSync(path.join(root, "prisma", "migrations"), path.join(resourcesDir, "prisma-migrations"), {
    recursive: true,
    verbatimSymlinks: true,
  });

  console.log(`afterPack: copied standalone build + migrations into ${resourcesDir}`);
};
