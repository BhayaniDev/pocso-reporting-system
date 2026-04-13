// crypto.js — Server-side AES-256-GCM decryption (Node.js)
// Mirrors the browser encryption.js on the backend.
// Receives: base64 ciphertext + base64 raw key from the client.

const { createDecipheriv } = require("crypto");

const ALGO     = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * decryptField(b64Ciphertext, rawKeyB64)
 * Decrypts a value encrypted by the browser's encryptField().
 *
 * Layout of combined bytes: iv (12) | ciphertext | GCM auth tag (16)
 */
function decryptField(b64Ciphertext, rawKeyB64) {
  const combined   = Buffer.from(b64Ciphertext, "base64");
  const rawKey     = Buffer.from(rawKeyB64,     "base64");

  const iv         = combined.slice(0, IV_BYTES);
  // GCM tag is the last 16 bytes
  const tag        = combined.slice(combined.length - TAG_BYTES);
  const ciphertext = combined.slice(IV_BYTES, combined.length - TAG_BYTES);

  const decipher = createDecipheriv(ALGO, rawKey, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

/**
 * isEncryptedPayload(body)
 * Returns true if the request body looks like an encrypted submission.
 */
function isEncryptedPayload(body) {
  return !!(body.encrypted && body.keyB64 && body.encUrl && body.encDescription);
}

module.exports = { decryptField, isEncryptedPayload };
