import { decrypt, encrypt, isEncryptedPayload } from '@/lib/encryption';

/** Store a token string: encrypt if plaintext; leave already-encrypted payloads unchanged. */
export function encryptOptionalToken(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return null;
  if (isEncryptedPayload(plain)) return plain;
  return encrypt(plain);
}

/** Read a DB token column: decrypt if wrapped; otherwise return legacy plaintext. */
export function decryptOptionalToken(stored: string | null | undefined): string | null {
  if (stored == null || stored === '') return null;
  if (isEncryptedPayload(stored)) {
    try {
      return decrypt(stored);
    } catch {
      return null;
    }
  }
  return stored;
}
