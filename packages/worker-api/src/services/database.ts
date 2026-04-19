import {
  User,
  SystemSettings,
  Application,
  Authorization,
  OAuthToken,
  APIUsage,
  XmojBinding,
  UserAuthorizationApp,
  PasskeyCredential,
  PasskeyCredentialPublic,
  PasskeyChallenge,
  TOTPCredential,
  TOTPSetupChallenge,
  AccountRole,
  AccountStatus,
  AdminUserListItem,
  AdminApplicationListItem,
  AdminAuditAction,
  AdminAuditLogItem,
  AppValidationStatus,
  AppChangeRequestItem,
  AppChangeRequestStatus,
} from '@authmaster/shared';
import { Env } from '../types';

export class Database {
  constructor(private db: D1Database) {}

  // User methods
  async createUser(
    email: string,
    passwordHash: string,
    accountType: 'user' | 'merchant',
    status: AccountStatus = 'active'
  ): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const role = accountType;
    const initialStatus = status;

    await this.db
      .prepare(
        'INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, email, passwordHash, role, initialStatus, now, now)
      .run();

    return {
      id,
      email,
      password_hash: passwordHash,
      role,
      status: initialStatus,
      created_at: now,
      updated_at: now,
    };
  }

  async getSystemSettings(): Promise<SystemSettings> {
    const result = await this.db
      .prepare(
        `SELECT allow_merchant_registration, merchant_registration_requires_review, updated_at
         FROM system_settings
         WHERE id = 1`
      )
      .first<any>();

    if (!result) {
      const now = new Date().toISOString();
      await this.db
        .prepare(
          `INSERT INTO system_settings (
            id,
            allow_merchant_registration,
            merchant_registration_requires_review,
            updated_at
          ) VALUES (1, 1, 0, ?)`
        )
        .bind(now)
        .run();

      return {
        allow_merchant_registration: true,
        merchant_registration_requires_review: false,
        updated_at: now,
      };
    }

    return {
      allow_merchant_registration: !!result.allow_merchant_registration,
      merchant_registration_requires_review: !!result.merchant_registration_requires_review,
      updated_at: result.updated_at,
    };
  }

  async updateSystemSettings(input: {
    allow_merchant_registration?: boolean;
    merchant_registration_requires_review?: boolean;
  }): Promise<SystemSettings> {
    const current = await this.getSystemSettings();
    const now = new Date().toISOString();
    const nextAllow = input.allow_merchant_registration ?? current.allow_merchant_registration;
    const nextReview =
      input.merchant_registration_requires_review ?? current.merchant_registration_requires_review;

    await this.db
      .prepare(
        `UPDATE system_settings
         SET allow_merchant_registration = ?,
             merchant_registration_requires_review = ?,
             updated_at = ?
         WHERE id = 1`
      )
      .bind(nextAllow ? 1 : 0, nextReview ? 1 : 0, now)
      .run();

    return {
      allow_merchant_registration: nextAllow,
      merchant_registration_requires_review: nextReview,
      updated_at: now,
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<any>();

    if (!result) {
      return null;
    }

    return {
      ...result,
      role: result.role || 'merchant',
      status: result.status || 'active',
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!result) {
      return null;
    }

    return {
      ...result,
      role: result.role || 'merchant',
      status: result.status || 'active',
    };
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(passwordHash, now, userId)
      .run();
  }

  async createPasskeyChallenge(input: {
    user_id: string;
    purpose: PasskeyChallenge['purpose'];
    challenge: string;
    expires_at: string;
  }): Promise<PasskeyChallenge> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO passkey_challenges (
          id,
          user_id,
          purpose,
          challenge,
          expires_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, input.user_id, input.purpose, input.challenge, input.expires_at, now, now)
      .run();

    return {
      id,
      user_id: input.user_id,
      purpose: input.purpose,
      challenge: input.challenge,
      expires_at: input.expires_at,
      created_at: now,
      updated_at: now,
    };
  }

  async getPasskeyChallenge(userId: string, purpose: PasskeyChallenge['purpose']): Promise<PasskeyChallenge | null> {
    const result = await this.db
      .prepare('SELECT * FROM passkey_challenges WHERE user_id = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1')
      .bind(userId, purpose)
      .first<any>();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      user_id: result.user_id,
      purpose: result.purpose,
      challenge: result.challenge,
      expires_at: result.expires_at,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  async getPasskeyChallengeById(id: string): Promise<PasskeyChallenge | null> {
    const result = await this.db
      .prepare('SELECT * FROM passkey_challenges WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      user_id: result.user_id,
      purpose: result.purpose,
      challenge: result.challenge,
      expires_at: result.expires_at,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  async deletePasskeyChallenge(userId: string, purpose: PasskeyChallenge['purpose']): Promise<void> {
    await this.db
      .prepare('DELETE FROM passkey_challenges WHERE user_id = ? AND purpose = ?')
      .bind(userId, purpose)
      .run();
  }

  async listPasskeysByUserId(userId: string): Promise<PasskeyCredentialPublic[]> {
    const result = await this.db
      .prepare('SELECT * FROM passkey_credentials WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<any>();

    return result.results.map(record => this.toPasskeyPublic(record));
  }

  async getPasskeyCredentialsForUser(userId: string): Promise<PasskeyCredential[]> {
    const result = await this.db
      .prepare('SELECT * FROM passkey_credentials WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<any>();

    return result.results.map(record => ({
      id: record.id,
      user_id: record.user_id,
      credential_id: record.credential_id,
      public_key: record.public_key,
      counter: Number(record.counter || 0),
      name: record.name,
      device_type: record.device_type,
      backed_up: !!record.backed_up,
      transports: record.transports || undefined,
      last_used_at: record.last_used_at || undefined,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }));
  }

  async getPasskeyByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
    const result = await this.db
      .prepare('SELECT * FROM passkey_credentials WHERE credential_id = ?')
      .bind(credentialId)
      .first<any>();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      user_id: result.user_id,
      credential_id: result.credential_id,
      public_key: result.public_key,
      counter: Number(result.counter || 0),
      name: result.name,
      device_type: result.device_type,
      backed_up: !!result.backed_up,
      transports: result.transports || undefined,
      last_used_at: result.last_used_at || undefined,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  async getPasskeyById(id: string): Promise<PasskeyCredential | null> {
    const result = await this.db
      .prepare('SELECT * FROM passkey_credentials WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      user_id: result.user_id,
      credential_id: result.credential_id,
      public_key: result.public_key,
      counter: Number(result.counter || 0),
      name: result.name,
      device_type: result.device_type,
      backed_up: !!result.backed_up,
      transports: result.transports || undefined,
      last_used_at: result.last_used_at || undefined,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  async createPasskeyCredential(input: {
    user_id: string;
    credential_id: string;
    public_key: string;
    counter: number;
    name: string;
    device_type: string;
    backed_up: boolean;
    transports?: string[];
  }): Promise<PasskeyCredential> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const transports = input.transports && input.transports.length > 0 ? JSON.stringify(input.transports) : null;

    await this.db
      .prepare(
        `INSERT INTO passkey_credentials (
          id,
          user_id,
          credential_id,
          public_key,
          counter,
          name,
          device_type,
          backed_up,
          transports,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.user_id,
        input.credential_id,
        input.public_key,
        input.counter,
        input.name,
        input.device_type,
        input.backed_up ? 1 : 0,
        transports,
        now,
        now
      )
      .run();

    return {
      id,
      user_id: input.user_id,
      credential_id: input.credential_id,
      public_key: input.public_key,
      counter: input.counter,
      name: input.name,
      device_type: input.device_type,
      backed_up: input.backed_up,
      transports: transports || undefined,
      created_at: now,
      updated_at: now,
    };
  }

  async updatePasskeyName(id: string, name: string): Promise<PasskeyCredential | null> {
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE passkey_credentials SET name = ?, updated_at = ? WHERE id = ?')
      .bind(name, now, id)
      .run();

    return this.getPasskeyById(id);
  }

  async updatePasskeyCounter(credentialId: string, counter: number): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE passkey_credentials SET counter = ?, last_used_at = ?, updated_at = ? WHERE credential_id = ?')
      .bind(counter, now, now, credentialId)
      .run();
  }

  async deletePasskeyCredential(id: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM passkey_credentials WHERE id = ?')
      .bind(id)
      .run();
  }

  async getTOTPCredential(userId: string): Promise<TOTPCredential | null> {
    const result = await this.db
      .prepare('SELECT * FROM totp_credentials WHERE user_id = ?')
      .bind(userId)
      .first<any>();

    if (!result) {
      return null;
    }

    return {
      user_id: result.user_id,
      secret_encrypted: result.secret_encrypted,
      enabled_at: result.enabled_at,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  async upsertTOTPCredential(userId: string, secretEncrypted: string): Promise<TOTPCredential> {
    const now = new Date().toISOString();
    const existing = await this.getTOTPCredential(userId);

    if (existing) {
      await this.db
        .prepare('UPDATE totp_credentials SET secret_encrypted = ?, enabled_at = ?, updated_at = ? WHERE user_id = ?')
        .bind(secretEncrypted, now, now, userId)
        .run();
    } else {
      await this.db
        .prepare('INSERT INTO totp_credentials (user_id, secret_encrypted, enabled_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, secretEncrypted, now, now, now)
        .run();
    }

    return {
      user_id: userId,
      secret_encrypted: secretEncrypted,
      enabled_at: now,
      created_at: existing?.created_at || now,
      updated_at: now,
    };
  }

  async deleteTOTPCredential(userId: string): Promise<void> {
    await this.db.prepare('DELETE FROM totp_credentials WHERE user_id = ?').bind(userId).run();
  }

  async createTOTPSetupChallenge(input: {
    user_id: string;
    secret_encrypted: string;
    recovery_code_hashes: string[];
    expires_at: string;
  }): Promise<TOTPSetupChallenge> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        'INSERT INTO totp_setup_challenges (id, user_id, secret_encrypted, recovery_code_hashes, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, input.user_id, input.secret_encrypted, JSON.stringify(input.recovery_code_hashes), input.expires_at, now, now)
      .run();

    return {
      id,
      user_id: input.user_id,
      secret_encrypted: input.secret_encrypted,
      recovery_code_hashes: input.recovery_code_hashes,
      expires_at: input.expires_at,
      created_at: now,
      updated_at: now,
    };
  }

  async getTOTPSetupChallenge(id: string): Promise<TOTPSetupChallenge | null> {
    const result = await this.db.prepare('SELECT * FROM totp_setup_challenges WHERE id = ?').bind(id).first<any>();
    if (!result) {
      return null;
    }

    return {
      id: result.id,
      user_id: result.user_id,
      secret_encrypted: result.secret_encrypted,
      recovery_code_hashes: JSON.parse(result.recovery_code_hashes),
      expires_at: result.expires_at,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  async deleteTOTPSetupChallengesByUserId(userId: string): Promise<void> {
    await this.db.prepare('DELETE FROM totp_setup_challenges WHERE user_id = ?').bind(userId).run();
  }

  async replaceRecoveryCodes(userId: string, hashes: string[]): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').bind(userId).run();

    for (const hash of hashes) {
      await this.db
        .prepare('INSERT INTO recovery_codes (id, user_id, code_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), userId, hash, now, now)
        .run();
    }
  }

  async countRemainingRecoveryCodes(userId: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) AS total FROM recovery_codes WHERE user_id = ? AND used_at IS NULL')
      .bind(userId)
      .first<{ total: number | string }>();

    return Number(result?.total || 0);
  }

  async consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare('UPDATE recovery_codes SET used_at = ?, updated_at = ? WHERE user_id = ? AND code_hash = ? AND used_at IS NULL')
      .bind(now, now, userId, codeHash)
      .run();

    return (result.meta?.changes || 0) > 0;
  }

  async listUsers(options: {
    limit: number;
    offset: number;
    role?: AccountRole;
    status?: AccountStatus;
    email?: string;
  }): Promise<{ users: AdminUserListItem[]; total: number }> {
    const whereClauses: string[] = [];
    const whereBindings: any[] = [];

    if (options.role) {
      whereClauses.push('role = ?');
      whereBindings.push(options.role);
    }

    if (options.status) {
      whereClauses.push('status = ?');
      whereBindings.push(options.status);
    }

    if (options.email) {
      whereClauses.push('email LIKE ?');
      whereBindings.push(`%${options.email}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const listSql = `
      SELECT id, email, role, status, created_at, updated_at
      FROM users
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const listResults = await this.db
      .prepare(listSql)
      .bind(...whereBindings, options.limit, options.offset)
      .all<any>();

    const countSql = `
      SELECT COUNT(*) AS total
      FROM users
      ${whereSql}
    `;

    const countResult = await this.db
      .prepare(countSql)
      .bind(...whereBindings)
      .first<{ total: number | string }>();

    return {
      users: listResults.results.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role || 'merchant',
        status: user.status || 'active',
        created_at: user.created_at,
        updated_at: user.updated_at,
      })),
      total: Number(countResult?.total || 0),
    };
  }

  private toPasskeyPublic(record: any): PasskeyCredentialPublic {
    const transports = record.transports ? JSON.parse(record.transports) : [];
    return {
      id: record.id,
      name: record.name,
      device_type: record.device_type,
      backed_up: !!record.backed_up,
      transports,
      last_used_at: record.last_used_at || undefined,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  async updateUserRole(userId: string, role: AccountRole): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .bind(role, now, userId)
      .run();
  }

  async updateUserStatus(userId: string, status: AccountStatus): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?')
      .bind(status, now, userId)
      .run();
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM oauth_tokens WHERE user_id = ?')
      .bind(userId)
      .run();
  }

  async createOrUpdateXmojBinding(
    userId: string,
    xmojUserId: string,
    xmojUsername: string,
    phpsessidEncrypted: string,
    bindMethod: 'bookmark' | 'manual'
  ): Promise<XmojBinding> {
    const now = new Date().toISOString();
    const existing = await this.getXmojBindingByUserId(userId);

    if (existing) {
      await this.db
        .prepare(
          'UPDATE xmoj_bindings SET xmoj_user_id = ?, xmoj_username = ?, phpsessid_encrypted = ?, bind_method = ?, updated_at = ? WHERE user_id = ?'
        )
        .bind(xmojUserId, xmojUsername, phpsessidEncrypted, bindMethod, now, userId)
        .run();

      return {
        ...existing,
        xmoj_user_id: xmojUserId,
        xmoj_username: xmojUsername,
        phpsessid_encrypted: phpsessidEncrypted,
        bind_method: bindMethod,
        updated_at: now,
      };
    }

    const id = crypto.randomUUID();

    await this.db
      .prepare(
        'INSERT INTO xmoj_bindings (id, user_id, xmoj_user_id, xmoj_username, phpsessid_encrypted, bind_method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, userId, xmojUserId, xmojUsername, phpsessidEncrypted, bindMethod, now, now)
      .run();

    return {
      id,
      user_id: userId,
      xmoj_user_id: xmojUserId,
      xmoj_username: xmojUsername,
      phpsessid_encrypted: phpsessidEncrypted,
      bind_method: bindMethod,
      created_at: now,
      updated_at: now,
    };
  }

  async getXmojBindingByUserId(userId: string): Promise<XmojBinding | null> {
    const result = await this.db
      .prepare('SELECT * FROM xmoj_bindings WHERE user_id = ?')
      .bind(userId)
      .first<XmojBinding>();

    return result;
  }

  async deleteXmojBindingByUserId(userId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM xmoj_bindings WHERE user_id = ?')
      .bind(userId)
      .run();
  }

  // Application methods
  async createApplication(
    userId: string,
    appId: string,
    appSecret: string,
    name: string,
    description: string | undefined,
    creatorName: string,
    publisherWebsite: string | undefined,
    privacyPolicyUrl: string | undefined,
    childrenPolicyUrl: string | undefined,
    termsOfServiceUrl: string | undefined,
    isOfficial: boolean,
    redirectUris: string[],
    scopes: string[]
  ): Promise<Application> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO applications (
          id,
          user_id,
          app_id,
          app_secret,
          name,
          description,
          creator_name,
          publisher_website,
          privacy_policy_url,
          children_policy_url,
          terms_of_service_url,
          is_official,
          validation_status,
          redirect_uris,
          scopes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        appId,
        appSecret,
        name,
        description || null,
        creatorName,
        publisherWebsite || null,
        privacyPolicyUrl || null,
        childrenPolicyUrl || null,
        termsOfServiceUrl || null,
        isOfficial ? 1 : 0,
        isOfficial ? 'validated' : 'unverified',
        JSON.stringify(redirectUris),
        JSON.stringify(scopes),
        now,
        now
      )
      .run();

    return {
      id,
      user_id: userId,
      app_id: appId,
      app_secret: appSecret,
      name,
      description,
      creator_name: creatorName,
      publisher_website: publisherWebsite,
      privacy_policy_url: privacyPolicyUrl,
      children_policy_url: childrenPolicyUrl,
      terms_of_service_url: termsOfServiceUrl,
      is_official: isOfficial,
      validation_status: isOfficial ? 'validated' : 'unverified',
      validation_submission: undefined,
      validation_submitted_at: undefined,
      validation_review_note: undefined,
      validation_reviewed_at: undefined,
      validation_reviewed_by: undefined,
      redirect_uris: redirectUris,
      scopes,
      is_blocked: false,
      blocked_reason: undefined,
      blocked_at: undefined,
      warning_message: undefined,
      warning_at: undefined,
      created_at: now,
      updated_at: now,
    };
  }

  async getApplicationByAppId(appId: string): Promise<Application | null> {
    const result = await this.db
      .prepare('SELECT * FROM applications WHERE app_id = ?')
      .bind(appId)
      .first<any>();

    if (!result) return null;

    return {
      ...result,
      creator_name: result.creator_name || result.name,
      publisher_website: result.publisher_website || undefined,
      privacy_policy_url: result.privacy_policy_url || undefined,
      children_policy_url: result.children_policy_url || undefined,
      terms_of_service_url: result.terms_of_service_url || undefined,
      is_official: !!result.is_official,
      validation_status: (result.validation_status || 'unverified') as AppValidationStatus,
      validation_submission: result.validation_submission || undefined,
      validation_submitted_at: result.validation_submitted_at || undefined,
      validation_review_note: result.validation_review_note || undefined,
      validation_reviewed_at: result.validation_reviewed_at || undefined,
      validation_reviewed_by: result.validation_reviewed_by || undefined,
      redirect_uris: JSON.parse(result.redirect_uris),
      scopes: JSON.parse(result.scopes),
      is_blocked: !!result.is_blocked,
      blocked_reason: result.blocked_reason || undefined,
      blocked_at: result.blocked_at || undefined,
      warning_message: result.warning_message || undefined,
      warning_at: result.warning_at || undefined,
    };
  }

  async getApplicationsByUserId(userId: string): Promise<Application[]> {
    const results = await this.db
      .prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<any>();

    return results.results.map(app => ({
      ...app,
      creator_name: app.creator_name || app.name,
      publisher_website: app.publisher_website || undefined,
      privacy_policy_url: app.privacy_policy_url || undefined,
      children_policy_url: app.children_policy_url || undefined,
      terms_of_service_url: app.terms_of_service_url || undefined,
      is_official: !!app.is_official,
      validation_status: (app.validation_status || 'unverified') as AppValidationStatus,
      validation_submission: app.validation_submission || undefined,
      validation_submitted_at: app.validation_submitted_at || undefined,
      validation_review_note: app.validation_review_note || undefined,
      validation_reviewed_at: app.validation_reviewed_at || undefined,
      validation_reviewed_by: app.validation_reviewed_by || undefined,
      redirect_uris: JSON.parse(app.redirect_uris),
      scopes: JSON.parse(app.scopes),
      is_blocked: !!app.is_blocked,
      blocked_reason: app.blocked_reason || undefined,
      blocked_at: app.blocked_at || undefined,
      warning_message: app.warning_message || undefined,
      warning_at: app.warning_at || undefined,
    }));
  }

  async getApplicationByAppIdWithOwner(appId: string): Promise<(Application & { owner_email: string }) | null> {
    const result = await this.db
      .prepare(
        `SELECT
          app.*,
          usr.email AS owner_email
        FROM applications app
        INNER JOIN users usr ON usr.id = app.user_id
        WHERE app.app_id = ?`
      )
      .bind(appId)
      .first<any>();

    if (!result) {
      return null;
    }

    return {
      ...result,
      creator_name: result.creator_name || result.name,
      publisher_website: result.publisher_website || undefined,
      privacy_policy_url: result.privacy_policy_url || undefined,
      children_policy_url: result.children_policy_url || undefined,
      terms_of_service_url: result.terms_of_service_url || undefined,
      is_official: !!result.is_official,
      validation_status: (result.validation_status || 'unverified') as AppValidationStatus,
      validation_submission: result.validation_submission || undefined,
      validation_submitted_at: result.validation_submitted_at || undefined,
      validation_review_note: result.validation_review_note || undefined,
      validation_reviewed_at: result.validation_reviewed_at || undefined,
      validation_reviewed_by: result.validation_reviewed_by || undefined,
      redirect_uris: JSON.parse(result.redirect_uris),
      scopes: JSON.parse(result.scopes),
      is_blocked: !!result.is_blocked,
      blocked_reason: result.blocked_reason || undefined,
      blocked_at: result.blocked_at || undefined,
      warning_message: result.warning_message || undefined,
      warning_at: result.warning_at || undefined,
      owner_email: result.owner_email,
    };
  }

  async listApplicationsForAdmin(options: {
    limit: number;
    offset: number;
    owner_email?: string;
    app_id?: string;
    name?: string;
    validation_status?: AppValidationStatus;
    is_blocked?: boolean;
  }): Promise<{ applications: AdminApplicationListItem[]; total: number }> {
    const whereClauses: string[] = [];
    const whereBindings: any[] = [];

    if (options.owner_email) {
      whereClauses.push('usr.email LIKE ?');
      whereBindings.push(`%${options.owner_email}%`);
    }

    if (options.app_id) {
      whereClauses.push('app.app_id LIKE ?');
      whereBindings.push(`%${options.app_id}%`);
    }

    if (options.name) {
      whereClauses.push('app.name LIKE ?');
      whereBindings.push(`%${options.name}%`);
    }

    if (options.validation_status) {
      whereClauses.push('app.validation_status = ?');
      whereBindings.push(options.validation_status);
    }

    if (typeof options.is_blocked === 'boolean') {
      whereClauses.push('app.is_blocked = ?');
      whereBindings.push(options.is_blocked ? 1 : 0);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const listSql = `
      SELECT
        app.app_id,
        app.name,
        app.description,
        app.creator_name,
        app.publisher_website,
        app.privacy_policy_url,
        app.children_policy_url,
        app.terms_of_service_url,
        app.is_official,
        app.validation_status,
        app.validation_submitted_at,
        app.validation_reviewed_at,
        app.user_id AS owner_user_id,
        usr.email AS owner_email,
        app.redirect_uris,
        app.scopes,
        app.is_blocked,
        app.blocked_reason,
        app.blocked_at,
        app.warning_message,
        app.warning_at,
        app.created_at,
        app.updated_at
      FROM applications app
      INNER JOIN users usr ON usr.id = app.user_id
      ${whereSql}
      ORDER BY app.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const listResults = await this.db
      .prepare(listSql)
      .bind(...whereBindings, options.limit, options.offset)
      .all<any>();

    const countSql = `
      SELECT COUNT(*) AS total
      FROM applications app
      INNER JOIN users usr ON usr.id = app.user_id
      ${whereSql}
    `;

    const countResult = await this.db
      .prepare(countSql)
      .bind(...whereBindings)
      .first<{ total: number | string }>();

    return {
      applications: listResults.results.map(app => ({
        app_id: app.app_id,
        name: app.name,
        description: app.description || undefined,
        creator_name: app.creator_name || app.name,
        publisher_website: app.publisher_website || undefined,
        privacy_policy_url: app.privacy_policy_url || undefined,
        children_policy_url: app.children_policy_url || undefined,
        terms_of_service_url: app.terms_of_service_url || undefined,
        is_official: !!app.is_official,
        validation_status: (app.validation_status || 'unverified') as AppValidationStatus,
        validation_submitted_at: app.validation_submitted_at || undefined,
        validation_reviewed_at: app.validation_reviewed_at || undefined,
        owner_user_id: app.owner_user_id,
        owner_email: app.owner_email,
        redirect_uris: JSON.parse(app.redirect_uris),
        scopes: JSON.parse(app.scopes),
        is_blocked: !!app.is_blocked,
        blocked_reason: app.blocked_reason || undefined,
        blocked_at: app.blocked_at || undefined,
        warning_message: app.warning_message || undefined,
        warning_at: app.warning_at || undefined,
        created_at: app.created_at,
        updated_at: app.updated_at,
      })),
      total: Number(countResult?.total || 0),
    };
  }

  async updateApplicationBlockStatus(appId: string, isBlocked: boolean, reason?: string): Promise<void> {
    const now = new Date().toISOString();
    const blockedReason = isBlocked ? reason || null : null;
    const blockedAt = isBlocked ? now : null;

    await this.db
      .prepare(
        'UPDATE applications SET is_blocked = ?, blocked_reason = ?, blocked_at = ?, updated_at = ? WHERE app_id = ?'
      )
      .bind(isBlocked ? 1 : 0, blockedReason, blockedAt, now, appId)
      .run();
  }

  async updateApplicationWarning(appId: string, warningMessage?: string): Promise<void> {
    const now = new Date().toISOString();
    const nextMessage = warningMessage || null;
    const warningAt = warningMessage ? now : null;

    await this.db
      .prepare('UPDATE applications SET warning_message = ?, warning_at = ?, updated_at = ? WHERE app_id = ?')
      .bind(nextMessage, warningAt, now, appId)
      .run();
  }

  async createAuditLog(input: {
    actor_user_id: string;
    actor_role: AccountRole;
    action: AdminAuditAction;
    target_type: 'user' | 'application';
    target_id: string;
    reason?: string;
    before_data?: Record<string, unknown>;
    after_data?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO audit_logs (
          id,
          actor_user_id,
          actor_role,
          action,
          target_type,
          target_id,
          reason,
          before_data,
          after_data,
          ip_address,
          user_agent,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.actor_user_id,
        input.actor_role,
        input.action,
        input.target_type,
        input.target_id,
        input.reason || null,
        input.before_data ? JSON.stringify(input.before_data) : null,
        input.after_data ? JSON.stringify(input.after_data) : null,
        input.ip_address || null,
        input.user_agent || null,
        now
      )
      .run();
  }

  async listAuditLogsForAdmin(options: {
    limit: number;
    offset: number;
    actor_user_id?: string;
    target_type?: 'user' | 'application';
    target_id?: string;
    action?: AdminAuditAction;
  }): Promise<{ logs: AdminAuditLogItem[]; total: number }> {
    const whereClauses: string[] = [];
    const whereBindings: any[] = [];

    if (options.actor_user_id) {
      whereClauses.push('actor_user_id = ?');
      whereBindings.push(options.actor_user_id);
    }

    if (options.target_type) {
      whereClauses.push('target_type = ?');
      whereBindings.push(options.target_type);
    }

    if (options.target_id) {
      whereClauses.push('target_id = ?');
      whereBindings.push(options.target_id);
    }

    if (options.action) {
      whereClauses.push('action = ?');
      whereBindings.push(options.action);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const listSql = `
      SELECT *
      FROM audit_logs
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const listResults = await this.db
      .prepare(listSql)
      .bind(...whereBindings, options.limit, options.offset)
      .all<any>();

    const countSql = `
      SELECT COUNT(*) AS total
      FROM audit_logs
      ${whereSql}
    `;

    const countResult = await this.db
      .prepare(countSql)
      .bind(...whereBindings)
      .first<{ total: number | string }>();

    return {
      logs: listResults.results.map(log => ({
        id: log.id,
        actor_user_id: log.actor_user_id,
        actor_role: log.actor_role,
        action: log.action,
        target_type: log.target_type,
        target_id: log.target_id,
        reason: log.reason || undefined,
        before_data: log.before_data ? JSON.parse(log.before_data) : undefined,
        after_data: log.after_data ? JSON.parse(log.after_data) : undefined,
        ip_address: log.ip_address || undefined,
        user_agent: log.user_agent || undefined,
        created_at: log.created_at,
      })),
      total: Number(countResult?.total || 0),
    };
  }

  async updateApplication(
    appId: string,
    name: string,
    description: string | undefined,
    creatorName: string | undefined,
    publisherWebsite: string | undefined,
    privacyPolicyUrl: string | undefined,
    childrenPolicyUrl: string | undefined,
    termsOfServiceUrl: string | undefined,
    isOfficial: boolean | undefined,
    redirectUris: string[],
    scopes: string[]
  ): Promise<Application | null> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE applications
         SET name = ?,
             description = ?,
             creator_name = COALESCE(?, creator_name),
             publisher_website = COALESCE(?, publisher_website),
             privacy_policy_url = COALESCE(?, privacy_policy_url),
             children_policy_url = COALESCE(?, children_policy_url),
             terms_of_service_url = COALESCE(?, terms_of_service_url),
             is_official = COALESCE(?, is_official),
             redirect_uris = ?,
             scopes = ?,
             updated_at = ?
         WHERE app_id = ?`
      )
      .bind(
        name,
        description || null,
        creatorName || null,
        publisherWebsite || null,
        privacyPolicyUrl || null,
        childrenPolicyUrl || null,
        termsOfServiceUrl || null,
        typeof isOfficial === 'boolean' ? (isOfficial ? 1 : 0) : null,
        JSON.stringify(redirectUris),
        JSON.stringify(scopes),
        now,
        appId
      )
      .run();

    return this.getApplicationByAppId(appId);
  }

  async submitValidationRequest(appId: string, content: string): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE applications
         SET validation_status = 'pending',
             validation_submission = ?,
             validation_submitted_at = ?,
             validation_review_note = NULL,
             validation_reviewed_at = NULL,
             validation_reviewed_by = NULL,
             updated_at = ?
         WHERE app_id = ?`
      )
      .bind(content, now, now, appId)
      .run();
  }

  async reviewValidationRequest(
    appId: string,
    status: Extract<AppValidationStatus, 'validated' | 'rejected'>,
    reviewNote: string | undefined,
    reviewedByUserId: string
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE applications
         SET validation_status = ?,
             validation_review_note = ?,
             validation_reviewed_at = ?,
             validation_reviewed_by = ?,
             updated_at = ?
         WHERE app_id = ?`
      )
      .bind(status, reviewNote || null, now, reviewedByUserId, now, appId)
      .run();
  }

  async createAppChangeRequest(input: {
    app_id: string;
    submitted_by_user_id: string;
    payload: Record<string, unknown>;
    submission_note?: string;
  }): Promise<AppChangeRequestItem> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO app_change_requests (
          id,
          app_id,
          submitted_by_user_id,
          payload,
          submission_note,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
      )
      .bind(id, input.app_id, input.submitted_by_user_id, JSON.stringify(input.payload), input.submission_note || null, now, now)
      .run();

    return {
      id,
      app_id: input.app_id,
      submitted_by_user_id: input.submitted_by_user_id,
      payload: input.payload,
      submission_note: input.submission_note,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };
  }

  async listAppChangeRequestsByAppId(appId: string): Promise<AppChangeRequestItem[]> {
    const results = await this.db
      .prepare('SELECT * FROM app_change_requests WHERE app_id = ? ORDER BY created_at DESC')
      .bind(appId)
      .all<any>();

    return results.results.map(row => ({
      id: row.id,
      app_id: row.app_id,
      submitted_by_user_id: row.submitted_by_user_id,
      payload: JSON.parse(row.payload),
      submission_note: row.submission_note || undefined,
      status: row.status as AppChangeRequestStatus,
      review_note: row.review_note || undefined,
      reviewed_by_user_id: row.reviewed_by_user_id || undefined,
      reviewed_at: row.reviewed_at || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async listAppChangeRequestsForAdmin(options: {
    limit: number;
    offset: number;
    app_id?: string;
    status?: AppChangeRequestStatus;
  }): Promise<{ requests: AppChangeRequestItem[]; total: number }> {
    const whereClauses: string[] = [];
    const whereBindings: any[] = [];

    if (options.app_id) {
      whereClauses.push('app_id = ?');
      whereBindings.push(options.app_id);
    }
    if (options.status) {
      whereClauses.push('status = ?');
      whereBindings.push(options.status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const listResults = await this.db
      .prepare(
        `SELECT *
         FROM app_change_requests
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...whereBindings, options.limit, options.offset)
      .all<any>();

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) AS total FROM app_change_requests ${whereSql}`)
      .bind(...whereBindings)
      .first<{ total: number | string }>();

    return {
      requests: listResults.results.map(row => ({
        id: row.id,
        app_id: row.app_id,
        submitted_by_user_id: row.submitted_by_user_id,
        payload: JSON.parse(row.payload),
        submission_note: row.submission_note || undefined,
        status: row.status as AppChangeRequestStatus,
        review_note: row.review_note || undefined,
        reviewed_by_user_id: row.reviewed_by_user_id || undefined,
        reviewed_at: row.reviewed_at || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
      total: Number(countResult?.total || 0),
    };
  }

  async getAppChangeRequestById(requestId: string): Promise<AppChangeRequestItem | null> {
    const row = await this.db
      .prepare('SELECT * FROM app_change_requests WHERE id = ?')
      .bind(requestId)
      .first<any>();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      app_id: row.app_id,
      submitted_by_user_id: row.submitted_by_user_id,
      payload: JSON.parse(row.payload),
      submission_note: row.submission_note || undefined,
      status: row.status as AppChangeRequestStatus,
      review_note: row.review_note || undefined,
      reviewed_by_user_id: row.reviewed_by_user_id || undefined,
      reviewed_at: row.reviewed_at || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async reviewAppChangeRequest(
    requestId: string,
    status: Extract<AppChangeRequestStatus, 'approved' | 'rejected'>,
    reviewNote: string | undefined,
    reviewedByUserId: string
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE app_change_requests
         SET status = ?,
             review_note = ?,
             reviewed_by_user_id = ?,
             reviewed_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(status, reviewNote || null, reviewedByUserId, now, now, requestId)
      .run();
  }

  async deleteApplication(appId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM applications WHERE app_id = ?')
      .bind(appId)
      .run();
  }

  // Authorization methods
  async createAuthorization(appId: string, userId: string, scope: string): Promise<Authorization> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare('INSERT INTO authorizations (id, app_id, user_id, scope, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, appId, userId, scope, now)
      .run();

    return {
      id,
      app_id: appId,
      user_id: userId,
      scope,
      created_at: now,
    };
  }

  async getAuthorization(appId: string, userId: string): Promise<Authorization | null> {
    const result = await this.db
      .prepare('SELECT * FROM authorizations WHERE app_id = ? AND user_id = ?')
      .bind(appId, userId)
      .first<Authorization>();

    return result;
  }

  async getUserAuthorizations(userId: string): Promise<UserAuthorizationApp[]> {
    const now = new Date().toISOString();
    const results = await this.db
      .prepare(
        `SELECT
          au.app_id AS app_id,
          app.name AS app_name,
          app.description AS app_description,
          au.scope AS scope,
          au.created_at AS authorized_at,
          MAX(tok.created_at) AS last_used_at,
          SUM(CASE WHEN tok.expires_at > ? THEN 1 ELSE 0 END) AS active_tokens
        FROM authorizations au
        INNER JOIN applications app ON app.app_id = au.app_id
        LEFT JOIN oauth_tokens tok ON tok.app_id = au.app_id AND tok.user_id = au.user_id
        WHERE au.user_id = ?
        GROUP BY au.app_id, app.name, app.description, au.scope, au.created_at
        ORDER BY au.created_at DESC`
      )
      .bind(now, userId)
      .all<any>();

    return results.results.map(item => ({
      app_id: item.app_id,
      app_name: item.app_name,
      app_description: item.app_description || undefined,
      scope: item.scope || '',
      authorized_at: item.authorized_at,
      last_used_at: item.last_used_at || undefined,
      active_tokens: Number(item.active_tokens || 0),
    }));
  }

  async revokeUserAuthorization(userId: string, appId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM oauth_tokens WHERE user_id = ? AND app_id = ?')
      .bind(userId, appId)
      .run();

    await this.db
      .prepare('DELETE FROM authorizations WHERE user_id = ? AND app_id = ?')
      .bind(userId, appId)
      .run();
  }

  // OAuth Token methods
  async createOAuthToken(
    appId: string,
    userId: string,
    accessToken: string,
    refreshToken: string | undefined,
    tokenType: string,
    expiresAt: string,
    scope: string
  ): Promise<OAuthToken> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        'INSERT INTO oauth_tokens (id, app_id, user_id, access_token, refresh_token, token_type, expires_at, scope, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, appId, userId, accessToken, refreshToken || null, tokenType, expiresAt, scope, now)
      .run();

    return {
      id,
      app_id: appId,
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenType,
      expires_at: expiresAt,
      scope,
      created_at: now,
    };
  }

  async getOAuthTokenByAccessToken(accessToken: string): Promise<OAuthToken | null> {
    const result = await this.db
      .prepare('SELECT * FROM oauth_tokens WHERE access_token = ?')
      .bind(accessToken)
      .first<OAuthToken>();

    return result;
  }

  async getOAuthTokenByRefreshToken(refreshToken: string): Promise<OAuthToken | null> {
    const result = await this.db
      .prepare('SELECT * FROM oauth_tokens WHERE refresh_token = ?')
      .bind(refreshToken)
      .first<OAuthToken>();

    return result;
  }

  // API Usage methods
  async recordAPIUsage(
    appId: string,
    endpoint: string,
    responseTime: number,
    isError: boolean
  ): Promise<void> {
    const now = new Date().toISOString();
    const date = now.split('T')[0];

    await this.db
      .prepare(
        `INSERT INTO api_usage (id, app_id, endpoint, request_count, data_usage, avg_response_time, error_count, created_at)
         VALUES (?, ?, ?, 1, 0, ?, ?, ?)
         ON CONFLICT(app_id, endpoint, created_at) DO UPDATE SET
           request_count = request_count + 1,
           avg_response_time = (avg_response_time * request_count + ?) / (request_count + 1),
           error_count = error_count + ?`
      )
      .bind(
        crypto.randomUUID(),
        appId,
        endpoint,
        responseTime,
        isError ? 1 : 0,
        date,
        responseTime,
        isError ? 1 : 0
      )
      .run();
  }

  async getAPIUsageByAppId(appId: string, limit: number = 30): Promise<APIUsage[]> {
    const results = await this.db
      .prepare('SELECT * FROM api_usage WHERE app_id = ? ORDER BY created_at DESC LIMIT ?')
      .bind(appId, limit)
      .all<APIUsage>();

    return results.results;
  }
}
