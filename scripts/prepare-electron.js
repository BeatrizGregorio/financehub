// Runs after `next build`. Next's standalone output doesn't include the
// public/ and .next/static/ folders (it expects a CDN to serve those in a
// normal deployment), so for a self-contained desktop app we copy them in
// manually, per https://nextjs.org/docs/app/api-reference/config/next-config-js/output
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.error('.next/standalone not found — run "next build" first.');
  process.exit(1);
}

fs.cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
fs.cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), {
  recursive: true,
});

console.log("Copied public/ and .next/static/ into .next/standalone/");
