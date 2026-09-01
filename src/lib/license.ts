import { createPublicKey, verify } from "node:crypto";

/**
 * Offline license-key verification.
 *
 * A key is an Ed25519 signature over `"<normalized email>|<PRODUCT_ID>"`,
 * base32-encoded. The app embeds only the *public* key, so it can check a key
 * without any network call and without carrying a secret that would let
 * someone generate their own keys. The private key lives with the seller —
 * see `scripts/make-license.js`.
 *
 * Why this shape:
 * - **No phone-home.** This app makes no network requests by design (see
 *   CLAUDE.md); an activation server would break that and take the app
 *   offline-hostile. Verification is pure local arithmetic.
 * - **Asymmetric, not HMAC.** An HMAC scheme would allow much prettier short
 *   keys, but the secret would have to ship inside the app — anyone who
 *   unpacked it could mint unlimited keys. With Ed25519 the worst an attacker
 *   can do by reading our code is learn the public key.
 * - **Email is part of the signed message**, so a key only works alongside the
 *   address it was issued to. That makes a leaked key traceable and slightly
 *   less casually shareable.
 * - **PRODUCT_ID is signed too**, so if there's ever a paid 2.0 it can require
 *   freshly-issued keys without invalidating the maths here.
 *
 * Honest limitation: any check that runs entirely on the buyer's machine can
 * be patched out by someone determined. This is deterrence for honest
 * customers, not DRM, and it isn't worth spending more complexity on.
 */

export const PRODUCT_ID = "financehub-1";

/**
 * Ed25519 public key (SPKI PEM) matching the seller's signing key.
 *
 * Replace this if you ever rotate the signing key — `scripts/make-license.js
 * keygen` prints the value to paste here. Rotating invalidates every key
 * already issued, so only do it if the private key leaks.
 */
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEADp0EPmwfln+YPEUIRhfvS/ghFA03Bkyc9VzZvEIYPjA=
-----END PUBLIC KEY-----`;

/** RFC 4648 base32, uppercase, no padding — avoids 0/O and 1/I confusion. */
const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
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

export function base32Decode(input: string): Uint8Array | null {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
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
  return new Uint8Array(out);
}

/** Lowercased and trimmed, so "  Me@Example.com " and "me@example.com" match. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Strips everything that isn't a base32 character and uppercases, so the buyer
 * can paste the key with or without the dashes we print, and stray spaces or
 * line breaks from an email client don't matter.
 */
export function normalizeKey(key: string): string {
  return key.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

/** The message the seller signs — keep both sides of this identical. */
export function licenseMessage(email: string): string {
  return `${normalizeEmail(email)}|${PRODUCT_ID}`;
}

/** Groups of 8 with dashes, purely so a human can read it back over the phone. */
export function formatKeyForDisplay(key: string): string {
  return (key.match(/.{1,8}/g) ?? []).join("-");
}

export function verifyLicenseKey(email: string, key: string): boolean {
  const signature = base32Decode(normalizeKey(key));
  // Ed25519 signatures are always exactly 64 bytes; anything else is a typo or
  // a forgery attempt, and crypto.verify would throw rather than return false.
  if (!signature || signature.length !== 64) return false;

  try {
    return verify(
      null,
      Buffer.from(licenseMessage(email), "utf8"),
      createPublicKey(PUBLIC_KEY_PEM),
      signature,
    );
  } catch {
    // A malformed embedded public key would throw here. Failing closed is
    // right: better to refuse activation than to accept anything.
    return false;
  }
}
