/**
 * User secret encryption (server-only).
 *
 * Uses AES-256-GCM via @noble/ciphers. Set **ENCRYPTION_KEY** (preferred) or
 * **ENCRYPTION_SECRET** to a 64-character hex string (32 random bytes):
 *
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Never log or return decrypted values to the client.
 */
import crypto from 'crypto';
import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/ciphers/webcrypto';

/** Current format: AES-256-GCM (nonce + ciphertext + tag), base64 after prefix */
const PREFIX_GCM = 'fe256gcm:v1:';
/** Legacy format: AES-256-CBC (still decrypted for existing rows) */
const PREFIX_CBC = 'fe256cbc:v1:';

function keyBytes(): Uint8Array {
  const raw = (process.env.ENCRYPTION_KEY ?? process.env.ENCRYPTION_SECRET)?.trim();
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY or ENCRYPTION_SECRET is not set. Generate a 32-byte hex key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return new Uint8Array(Buffer.from(raw, 'hex'));
  }
  return new Uint8Array(crypto.createHash('sha256').update(raw).digest());
}

export function isEncryptedPayload(value: string): boolean {
  return (
    typeof value === 'string' &&
    (value.startsWith(PREFIX_GCM) || value.startsWith(PREFIX_CBC))
  );
}

/** Encrypt UTF-8 text; returns opaque ASCII string safe for TEXT columns */
export function encrypt(text: string): string {
  const key = keyBytes();
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (use a 64-character hex string)');
  }
  const nonce = randomBytes(12);
  const cipher = gcm(key, nonce);
  const enc = cipher.encrypt(new TextEncoder().encode(text));
  const combined = new Uint8Array(12 + enc.length);
  combined.set(nonce);
  combined.set(enc, 12);
  const b64 = Buffer.from(combined).toString('base64');
  return `${PREFIX_GCM}${b64}`;
}

function decryptGcmPayload(b64: string): string {
  const key = keyBytes();
  const combined = Buffer.from(b64, 'base64');
  if (combined.length < 12 + 16 + 1) {
    throw new Error('Invalid GCM ciphertext');
  }
  const nonce = new Uint8Array(combined.subarray(0, 12));
  const ct = new Uint8Array(combined.subarray(12));
  const decipher = gcm(key, nonce);
  const plain = decipher.decrypt(ct);
  return new TextDecoder().decode(plain);
}

function decryptCbcPayload(encrypted: string): string {
  const keyBuf = Buffer.from(keyBytes());
  const rest = encrypted.slice(PREFIX_CBC.length);
  const colon = rest.indexOf(':');
  if (colon < 32) throw new Error('Malformed payload');
  const ivHex = rest.slice(0, colon);
  const b64 = rest.slice(colon + 1);
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(b64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** Decrypt payload produced by encrypt() or legacy CBC encrypt. Throws if invalid or tampered. */
export function decrypt(encrypted: string): string {
  if (encrypted.startsWith(PREFIX_GCM)) {
    return decryptGcmPayload(encrypted.slice(PREFIX_GCM.length));
  }
  if (encrypted.startsWith(PREFIX_CBC)) {
    return decryptCbcPayload(encrypted);
  }
  throw new Error('Invalid encrypted payload');
}

/** Same as encrypt(); async shape matches common vault call sites. */
export async function encryptApiKey(plaintext: string): Promise<string> {
  return encrypt(plaintext);
}

/** Same as decrypt(); async for symmetry with encryptApiKey. */
export async function decryptApiKey(ciphertext: string): Promise<string> {
  return decrypt(ciphertext);
}
