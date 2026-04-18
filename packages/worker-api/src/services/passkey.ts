import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  WebAuthnCredential,
} from '@simplewebauthn/server';
import { Env } from '../types';
import { Database } from './database';
import {
  PasskeyCredentialPublic,
  PasskeyOptionsResponse,
} from '@authmaster/shared';
import { base64urlToBytes, bytesToBase64url } from '../utils/base64url';
import { generateRandomString } from '../utils/crypto';

const PASSKEY_PURPOSE_REGISTRATION = 'registration' as const;
const PASSKEY_PURPOSE_AUTHENTICATION = 'authentication' as const;

export class PasskeyService {
  private db: Database;
  private rpId: string;
  private origin: string;

  constructor(private env: Env) {
    this.db = new Database(env.DB);
    const frontendUrl = new URL(env.FRONTEND_URL);
    this.rpId = frontendUrl.hostname;
    this.origin = frontendUrl.origin;
  }

  async listPasskeys(userId: string): Promise<PasskeyCredentialPublic[]> {
    return this.db.listPasskeysByUserId(userId);
  }

  async beginRegistration(userId: string): Promise<PasskeyOptionsResponse> {
    const user = await this.db.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const existing = await this.db.getPasskeyCredentialsForUser(userId);
    const options = await generateRegistrationOptions({
      rpName: 'AuthMaster',
      rpID: this.rpId,
      userName: user.email,
      userID: new TextEncoder().encode(user.id) as unknown as Uint8Array<ArrayBuffer>,
      challenge: generateRandomString(32),
      userDisplayName: user.email,
      attestationType: 'none',
      excludeCredentials: existing.map(passkey => ({
        id: passkey.credential_id,
        transports: this.parseTransports(passkey.transports),
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    await this.db.deletePasskeyChallenge(userId, PASSKEY_PURPOSE_REGISTRATION);
    const challenge = await this.db.createPasskeyChallenge({
      user_id: userId,
      purpose: PASSKEY_PURPOSE_REGISTRATION,
      challenge: options.challenge,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    return {
      challenge_id: challenge.id,
      options,
    };
  }

  async completeRegistration(
    userId: string,
    input: { challenge_id: string; credential: RegistrationResponseJSON; name?: string }
  ): Promise<PasskeyCredentialPublic> {
    const challenge = await this.db.getPasskeyChallenge(userId, PASSKEY_PURPOSE_REGISTRATION);
    if (!challenge || challenge.id !== input.challenge_id) {
      throw new Error('Invalid or expired passkey challenge');
    }

    if (new Date(challenge.expires_at) < new Date()) {
      throw new Error('Invalid or expired passkey challenge');
    }

    const verification = await verifyRegistrationResponse({
      response: input.credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('Passkey verification failed');
    }

    const { registrationInfo } = verification;
    const displayName = input.name?.trim() || `Passkey ${new Date().toLocaleDateString()}`;
    await this.db.deletePasskeyChallenge(userId, PASSKEY_PURPOSE_REGISTRATION);
    const stored = await this.db.createPasskeyCredential({
      user_id: userId,
      credential_id: registrationInfo.credential.id,
      public_key: bytesToBase64url(registrationInfo.credential.publicKey),
      counter: registrationInfo.credential.counter,
      name: displayName,
      device_type: registrationInfo.credentialDeviceType,
      backed_up: registrationInfo.credentialBackedUp,
      transports: [],
    });

    return this.toPublic(stored);
  }

  async updateName(userId: string, passkeyId: string, name: string): Promise<PasskeyCredentialPublic> {
    const credential = await this.db.getPasskeyById(passkeyId);
    if (!credential || credential.user_id !== userId) {
      throw new Error('Passkey not found');
    }

    const updated = await this.db.updatePasskeyName(passkeyId, name);
    if (!updated) {
      throw new Error('Passkey not found');
    }

    return this.toPublic(updated);
  }

  async deletePasskey(userId: string, passkeyId: string): Promise<void> {
    const credential = await this.db.getPasskeyById(passkeyId);
    if (!credential || credential.user_id !== userId) {
      throw new Error('Passkey not found');
    }

    await this.db.deletePasskeyCredential(passkeyId);
  }

  async beginAuthentication(email: string): Promise<PasskeyOptionsResponse> {
    const user = await this.db.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const credentials = await this.db.getPasskeyCredentialsForUser(user.id);
    if (credentials.length === 0) {
      throw new Error('No passkeys registered for this account');
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      allowCredentials: credentials.map(passkey => ({
        id: passkey.credential_id,
        transports: this.parseTransports(passkey.transports),
      })),
      userVerification: 'preferred',
      challenge: generateRandomString(32),
    });

    await this.db.deletePasskeyChallenge(user.id, PASSKEY_PURPOSE_AUTHENTICATION);
    const challenge = await this.db.createPasskeyChallenge({
      user_id: user.id,
      purpose: PASSKEY_PURPOSE_AUTHENTICATION,
      challenge: options.challenge,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    return {
      challenge_id: challenge.id,
      options,
    };
  }

  async completeAuthentication(input: { challenge_id: string; credential: AuthenticationResponseJSON }): Promise<{ user_id: string }> {
    const challenge = await this.db.getPasskeyChallengeById(input.challenge_id);
    if (!challenge || challenge.purpose !== PASSKEY_PURPOSE_AUTHENTICATION) {
      throw new Error('Invalid or expired passkey challenge');
    }

    if (new Date(challenge.expires_at) < new Date()) {
      throw new Error('Invalid or expired passkey challenge');
    }

    const credentialId = input.credential.id;
    const stored = await this.db.getPasskeyByCredentialId(credentialId);
    if (!stored) {
      throw new Error('Passkey not found');
    }

    const verification = await verifyAuthenticationResponse({
      response: input.credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
      credential: {
        id: stored.credential_id,
        publicKey: base64urlToBytes(stored.public_key),
        counter: stored.counter,
        transports: this.parseTransports(stored.transports),
      } as WebAuthnCredential,
      requireUserVerification: false,
    });

    if (!verification.verified) {
      throw new Error('Passkey verification failed');
    }

    await this.db.updatePasskeyCounter(stored.credential_id, verification.authenticationInfo.newCounter);
    await this.db.deletePasskeyChallenge(challenge.user_id, PASSKEY_PURPOSE_AUTHENTICATION);

    return { user_id: stored.user_id };
  }

  private parseTransports(value?: string): AuthenticatorTransportFuture[] {
    if (!value) {
      return [];
    }

    try {
      return JSON.parse(value) as AuthenticatorTransportFuture[];
    } catch {
      return [];
    }
  }

  private toPublic(passkey: {
    id: string;
    name: string;
    device_type: string;
    backed_up: boolean;
    transports?: string;
    last_used_at?: string;
    created_at: string;
    updated_at: string;
  }): PasskeyCredentialPublic {
    return {
      id: passkey.id,
      name: passkey.name,
      device_type: passkey.device_type,
      backed_up: passkey.backed_up,
      transports: this.parseTransports(passkey.transports),
      last_used_at: passkey.last_used_at,
      created_at: passkey.created_at,
      updated_at: passkey.updated_at,
    };
  }
}