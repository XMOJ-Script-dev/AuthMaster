export function getPasskeyTrustKey(userId: string): string {
  return `mfa_trusted:${userId}`;
}

export function isPasskeyTrusted(userId: string): boolean {
  return localStorage.getItem(getPasskeyTrustKey(userId)) === '1';
}

export function setPasskeyTrusted(userId: string): void {
  localStorage.setItem(getPasskeyTrustKey(userId), '1');
}

export function clearPasskeyTrusted(userId: string): void {
  localStorage.removeItem(getPasskeyTrustKey(userId));
}

const PASSKEY_LAST_EMAIL_KEY = 'passkey_last_email';

export function getLastPasskeyEmail(): string | null {
  const value = localStorage.getItem(PASSKEY_LAST_EMAIL_KEY)?.trim();
  return value || null;
}

export function setLastPasskeyEmail(email: string): void {
  const normalized = email.trim();
  if (!normalized) {
    return;
  }

  localStorage.setItem(PASSKEY_LAST_EMAIL_KEY, normalized);
}