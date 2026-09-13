// Offline, cryptographically-random restore key generation + offline SHA-256 hashing.
// No network calls. Each key carries 96 bits of entropy — unique per user.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // Crockford base32 (no ambiguous chars)

function randomBase32Block(len) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Format: WV-XXXX-XXXX-XXXX-XXXX-XXXX (5 blocks of 5 = 25 chars, ~117 bits of entropy)
export function generateRestoreKey() {
  const blocks = Array.from({ length: 5 }, () => randomBase32Block(5));
  return "WV-" + blocks.join("-");
}

// Offline SHA-256 of the restore key — only the hash is ever stored, never the key.
export async function hashRestoreKey(key) {
  const data = new TextEncoder().encode(key);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}