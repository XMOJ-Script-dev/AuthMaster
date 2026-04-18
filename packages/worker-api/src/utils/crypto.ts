/**
 * Hash password using Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // In production, use bcrypt or argon2. This is a simplified version.
  // For Workers, consider using a library like @noble/hashes
  return hashHex;
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Encrypt sensitive text using AES-GCM.
 * Key accepts plain text or hex string.
 */
export async function encryptText(plainText: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyBytes = parseSecret(secret);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(plainText)
  );

  return `${toBase64(iv)}:${toBase64(new Uint8Array(encrypted))}`;
}

/**
 * Decrypt text encrypted by encryptText.
 */
export async function decryptText(cipherText: string, secret: string): Promise<string> {
  const [ivBase64, dataBase64] = cipherText.split(':');
  if (!ivBase64 || !dataBase64) {
    throw new Error('Invalid encrypted payload format');
  }

  const keyBytes = parseSecret(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivBase64) },
    cryptoKey,
    fromBase64(dataBase64)
  );

  return new TextDecoder().decode(decrypted);
}

function parseSecret(secret: string): Uint8Array {
  const isHex = /^[0-9a-fA-F]+$/.test(secret) && secret.length % 2 === 0;
  if (isHex) {
    const bytes = new Uint8Array(secret.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(secret.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  return new TextEncoder().encode(secret);
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
