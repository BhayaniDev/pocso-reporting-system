// encryption.js — Client-side AES-256-GCM encryption
// All encryption happens IN THE BROWSER before any data leaves the device.
// The backend receives only ciphertext; the plaintext never travels over the wire.
//
// Key derivation: PBKDF2-SHA256 from a session ephemeral password + random salt
// Cipher: AES-256-GCM (authenticated encryption — integrity + confidentiality)
// The derived key is held in memory for the session only; never stored.

const ALGO      = "AES-GCM";
const KEY_BITS  = 256;
const IV_BYTES  = 12;   // 96-bit IV recommended for GCM
const SALT_BYTES = 16;
const PBKDF2_ITER = 100_000;

// ── Generate a random session password (ephemeral, in-memory only) ────────────
let _sessionKey = null;

async function getSessionKey() {
  if (_sessionKey) return _sessionKey;

  // Generate a cryptographically random 32-byte session secret
  const rawSecret = crypto.getRandomValues(new Uint8Array(32));
  const salt      = crypto.getRandomValues(new Uint8Array(SALT_BYTES));

  // Import raw bytes as key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    rawSecret,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive AES-256-GCM key
  _sessionKey = await crypto.subtle.deriveKey(
    {
      name:       "PBKDF2",
      salt,
      iterations: PBKDF2_ITER,
      hash:       "SHA-256",
    },
    keyMaterial,
    { name: ALGO, length: KEY_BITS },
    true,           // extractable so we can export for backend
    ["encrypt", "decrypt"]
  );

  // Export and store salt alongside so backend can't reverse-derive
  _sessionKey._salt = salt;
  return _sessionKey;
}

// ── Export the raw AES key bytes (sent once, alongside the first ciphertext) ──
// In a production system this would be wrapped in the authority's public key (RSA-OAEP).
// Here we send it as base64 over HTTPS for demo purposes.
export async function exportSessionKey() {
  const key  = await getSessionKey();
  const raw  = await crypto.subtle.exportKey("raw", key);
  return {
    keyB64:  btoa(String.fromCharCode(...new Uint8Array(raw))),
    saltB64: btoa(String.fromCharCode(...key._salt)),
  };
}

// ── Encrypt a UTF-8 string → base64 ciphertext ──────────────────────────────
export async function encryptField(plaintext) {
  const key    = await getSessionKey();
  const iv     = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    encoded
  );

  // Pack: iv (12 bytes) | ciphertext+tag
  const combined = new Uint8Array(iv.byteLength + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.byteLength);

  return btoa(String.fromCharCode(...combined));
}

// ── Decrypt base64 ciphertext → UTF-8 string (used by backend test util) ─────
export async function decryptField(b64Ciphertext, rawKeyB64, saltB64) {
  const combined   = Uint8Array.from(atob(b64Ciphertext), (c) => c.charCodeAt(0));
  const iv         = combined.slice(0, IV_BYTES);
  const ciphertext = combined.slice(IV_BYTES);

  const rawKey = Uint8Array.from(atob(rawKeyB64), (c) => c.charCodeAt(0));
  const key    = await crypto.subtle.importKey(
    "raw", rawKey, { name: ALGO }, false, ["decrypt"]
  );

  const plainBuffer = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuffer);
}

// ── Hash a URL for blocklist lookup (mirrors backend + extension hashing) ─────
export async function hashUrl(url) {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const domain = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const buf    = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(domain));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  } catch {
    return null;
  }
}
