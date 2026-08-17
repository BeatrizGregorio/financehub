#!/usr/bin/env node
/**
 * Seller-side license tool. NOT shipped to customers — it needs the private
 * signing key, which must never leave your machine.
 *
 *   node scripts/make-license.js keygen
 *       Creates the Ed25519 signing keypair. Writes the private key to
 *       license-signing-key.pem (gitignored via the existing *.pem rule) and
 *       prints the public key line to paste into src/lib/license.ts.
 *       Run this ONCE. Running it again invalidates every key you've issued.
 *
 *   node scripts/make-license.js sign buyer@example.com
 *       Prints the license key to send that buyer.
 *
 *   node scripts/make-license.js check buyer@example.com <KEY>
 *       Verifies a key against the PUBLIC key embedded in the app — the same
 *       check the app itself runs. Use this to confirm a key works before
 *       emailing it, and to debug "my key won't activate" support requests.
 *
 * Back up license-signing-key.pem somewhere safe (a password manager). If you
 * lose it you cannot issue keys to new customers without shipping a new public
 * key, which would break every existing customer's key.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const PRIVATE_KEY_PATH = path.join(ROOT, "license-signing-key.pem");
const LICENSE_TS_PATH = path.join(ROOT, "src", "lib", "license.ts");

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input) {
  let bits = 0;
  let value = 0;
  const out = [];
  for (const char of input) {
    const idx = B32_ALPHABET.indexOf(char);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Must stay byte-identical to licenseMessage() in src/lib/license.ts. */
function licenseMessage(email) {
  const productId = readProductId();
  return `${email.trim().toLowerCase()}|${productId}`;
}

/** Read PRODUCT_ID out of the app source so the two can't silently diverge. */
function readProductId() {
  const src = fs.readFileSync(LICENSE_TS_PATH, "utf8");
  const m = src.match(/export const PRODUCT_ID = "([^"]+)"/);
  if (!m) {
    console.error("Could not find PRODUCT_ID in src/lib/license.ts.");
    process.exit(1);
  }
  return m[1];
}

function readEmbeddedPublicKey() {
  const src = fs.readFileSync(LICENSE_TS_PATH, "utf8");
  const m = src.match(/-----BEGIN PUBLIC KEY-----\n([\s\S]*?)\n-----END PUBLIC KEY-----/);
  if (!m || m[1].includes("__PUBLIC_KEY_BASE64__")) {
    console.error("No public key embedded in src/lib/license.ts yet — run `keygen` first.");
    process.exit(1);
  }
  return `-----BEGIN PUBLIC KEY-----\n${m[1]}\n-----END PUBLIC KEY-----`;
}

function formatKey(key) {
  return key.match(/.{1,8}/g).join("-");
}

function keygen() {
  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error(
      `Refusing to overwrite ${path.relative(ROOT, PRIVATE_KEY_PATH)}.\n` +
        "That file is the only thing that can issue keys your customers' apps will accept.\n" +
        "Delete it by hand first if you really mean to rotate the signing key — every\n" +
        "license you have already sold will stop working.",
    );
    process.exit(1);
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(
    PRIVATE_KEY_PATH,
    privateKey.export({ type: "pkcs8", format: "pem" }),
    { mode: 0o600 },
  );

  const spki = publicKey.export({ type: "spki", format: "pem" }).toString();
  const body = spki
    .replace(/-----(BEGIN|END) PUBLIC KEY-----/g, "")
    .replace(/\s/g, "");

  console.log(`Private key written to ${path.relative(ROOT, PRIVATE_KEY_PATH)} (gitignored).`);
  console.log("Back it up somewhere safe — it cannot be recovered.\n");
  console.log("Now paste this line into PUBLIC_KEY_PEM in src/lib/license.ts:\n");
  console.log(body);
}

function sign(email) {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error("No signing key yet — run `node scripts/make-license.js keygen` first.");
    process.exit(1);
  }
  const privateKey = crypto.createPrivateKey(fs.readFileSync(PRIVATE_KEY_PATH));
  const signature = crypto.sign(null, Buffer.from(licenseMessage(email), "utf8"), privateKey);
  const key = base32Encode(signature);

  console.log(`Email:   ${email.trim().toLowerCase()}`);
  console.log(`License: ${formatKey(key)}`);
  console.log("\nThe buyer needs BOTH lines — the key only works with that email address.");
}

function check(email, key) {
  const normalized = key.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const signature = base32Decode(normalized);
  if (!signature || signature.length !== 64) {
    console.log(`INVALID — expected a 64-byte signature, got ${signature ? signature.length : 0}.`);
    process.exit(1);
  }
  const ok = crypto.verify(
    null,
    Buffer.from(licenseMessage(email), "utf8"),
    crypto.createPublicKey(readEmbeddedPublicKey()),
    signature,
  );
  console.log(ok ? "VALID — this key activates the app for that email." : "INVALID");
  process.exit(ok ? 0 : 1);
}

const [command, ...args] = process.argv.slice(2);
if (command === "keygen") {
  keygen();
} else if (command === "sign" && args[0]) {
  sign(args[0]);
} else if (command === "check" && args[0] && args[1]) {
  check(args[0], args.slice(1).join(""));
} else {
  console.error(
    "Usage:\n" +
      "  node scripts/make-license.js keygen\n" +
      "  node scripts/make-license.js sign buyer@example.com\n" +
      "  node scripts/make-license.js check buyer@example.com <KEY>",
  );
  process.exit(1);
}
