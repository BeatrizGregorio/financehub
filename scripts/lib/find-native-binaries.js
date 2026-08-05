// Shared by scripts/rebuild-native-for-electron.js and scripts/after-pack.js.
//
// Next's build doesn't just leave one copy of better-sqlite3 under
// .next/standalone/node_modules — for native "external" packages it also
// creates a second, content-hashed copy under
// .next/standalone/.next/node_modules/better-sqlite3-<hash>/ (how Turbopack
// loads native externals at runtime). On Mac this has resolved correctly via
// what looked like a relative symlink back to the first copy; on Windows a
// packaged build was observed still running the *original* plain-Node-ABI
// binary from that hashed copy. Rather than assume there's exactly one
// binary location (accurate on Mac, evidently not guaranteed on Windows),
// find every `better_sqlite3.node` anywhere under a given root and let the
// caller overwrite/verify all of them — correct whether a given copy is a
// symlink target or a fully independent file.
const fs = require("fs");
const path = require("path");

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
      stat = fs.statSync(full); // follows symlinks, unlike lstatSync
    } catch {
      continue; // broken symlink — nothing to copy into
    }
    if (stat.isDirectory()) {
      findBinaries(full, matches);
    } else if (stat.isFile() && entry.name === "better_sqlite3.node") {
      matches.push(full);
    }
  }
  return matches;
}

module.exports = { findBinaries };
