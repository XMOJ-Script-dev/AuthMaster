import { generateRandomString } from './crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

export function generateTOTPSecret(byteLength: number = 20): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToBase32(bytes);
}

export function generateRecoveryCodes(count: number = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = generateRandomString(6).slice(0, 10).toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });
}

export function buildOtpAuthUrl(email: string, issuer: string, secret: string): string {
  const label = `${issuer}:${email}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export async function verifyTOTP(secret: string, token: string, window: number = 1): Promise<boolean> {
  const normalized = token.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }

  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = await generateTOTP(secret, Date.now() + offset * TOTP_PERIOD_SECONDS * 1000);
    if (candidate === normalized) {
      return true;
    }
  }

  return false;
}

async function generateTOTP(secret: string, timestamp: number): Promise<string> {
  const counter = Math.floor(timestamp / 1000 / TOTP_PERIOD_SECONDS);
  const key = await crypto.subtle.importKey(
    'raw',
    base32ToBytes(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const counterBytes = new Uint8Array(8);
  let value = counter;
  for (let index = 7; index >= 0; index -= 1) {
    counterBytes[index] = value & 0xff;
    value = Math.floor(value / 256);
  }

  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

function bytesToBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32ToBytes(input: string): Uint8Array {
  const normalized = input.toUpperCase().replace(/=+$/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid TOTP secret');
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}