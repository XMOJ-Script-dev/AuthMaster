import { MFAStatusResponse, RecoveryCodesResponse, TOTPSetupResponse } from '@authmaster/shared';
import { Env } from '../types';
import { Database } from './database';
import { decryptText, encryptText, hashPassword } from '../utils/crypto';
import { buildOtpAuthUrl, generateRecoveryCodes, generateTOTPSecret, verifyTOTP } from '../utils/totp';

export class TOTPService {
  private db: Database;

  constructor(private env: Env) {
    this.db = new Database(env.DB);
  }

  async getMFAStatus(userId: string): Promise<MFAStatusResponse> {
    const [passkeys, totp, recoveryCodesRemaining] = await Promise.all([
      this.db.listPasskeysByUserId(userId),
      this.db.getTOTPCredential(userId),
      this.db.countRemainingRecoveryCodes(userId),
    ]);

    return {
      passkey_count: passkeys.length,
      totp_enabled: !!totp,
      recovery_codes_remaining: recoveryCodesRemaining,
    };
  }

  async beginSetup(userId: string, email: string): Promise<TOTPSetupResponse> {
    const secret = generateTOTPSecret();
    const recoveryCodes = generateRecoveryCodes();
    const recoveryCodeHashes = await Promise.all(recoveryCodes.map(code => hashPassword(this.normalizeRecoveryCode(code))));
    const secretEncrypted = await encryptText(secret, this.env.ENCRYPTION_KEY);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await this.db.deleteTOTPSetupChallengesByUserId(userId);
    const challenge = await this.db.createTOTPSetupChallenge({
      user_id: userId,
      secret_encrypted: secretEncrypted,
      recovery_code_hashes: recoveryCodeHashes,
      expires_at: expiresAt,
    });

    return {
      setup_id: challenge.id,
      secret,
      otpauth_url: buildOtpAuthUrl(email, 'AuthMaster', secret),
      recovery_codes: recoveryCodes,
      expires_at: expiresAt,
    };
  }

  async enable(userId: string, input: { setup_id: string; code: string }): Promise<MFAStatusResponse> {
    const challenge = await this.db.getTOTPSetupChallenge(input.setup_id);
    if (!challenge || challenge.user_id !== userId || new Date(challenge.expires_at) < new Date()) {
      throw new Error('Invalid or expired TOTP setup');
    }

    const secret = await decryptText(challenge.secret_encrypted, this.env.ENCRYPTION_KEY);
    const verified = await verifyTOTP(secret, input.code);
    if (!verified) {
      throw new Error('Invalid authenticator code');
    }

    await this.db.upsertTOTPCredential(userId, challenge.secret_encrypted);
    await this.db.replaceRecoveryCodes(userId, challenge.recovery_code_hashes);
    await this.db.deleteTOTPSetupChallengesByUserId(userId);

    return this.getMFAStatus(userId);
  }

  async verify(userId: string, input: { code?: string; recovery_code?: string }): Promise<void> {
    if (input.recovery_code) {
      const hashed = await hashPassword(this.normalizeRecoveryCode(input.recovery_code));
      const consumed = await this.db.consumeRecoveryCode(userId, hashed);
      if (!consumed) {
        throw new Error('Invalid recovery code');
      }
      return;
    }

    const credential = await this.db.getTOTPCredential(userId);
    if (!credential) {
      throw new Error('Authenticator app is not enabled');
    }

    const secret = await decryptText(credential.secret_encrypted, this.env.ENCRYPTION_KEY);
    const verified = await verifyTOTP(secret, input.code || '');
    if (!verified) {
      throw new Error('Invalid authenticator code');
    }
  }

  async regenerateRecoveryCodes(userId: string, input: { code?: string; recovery_code?: string }): Promise<RecoveryCodesResponse> {
    await this.verify(userId, input);
    const recoveryCodes = generateRecoveryCodes();
    const hashes = await Promise.all(recoveryCodes.map(code => hashPassword(this.normalizeRecoveryCode(code))));
    await this.db.replaceRecoveryCodes(userId, hashes);
    return { recovery_codes: recoveryCodes };
  }

  async disable(userId: string): Promise<MFAStatusResponse> {
    await this.db.deleteTOTPCredential(userId);
    await this.db.replaceRecoveryCodes(userId, []);
    await this.db.deleteTOTPSetupChallengesByUserId(userId);
    return this.getMFAStatus(userId);
  }

  private normalizeRecoveryCode(value: string): string {
    return value.trim().toUpperCase();
  }
}