import { User, Application, Authorization, OAuthToken, APIUsage, XmojBinding, UserAuthorizationApp } from '@authmaster/shared';
import { Env } from '../types';

export class Database {
  constructor(private db: D1Database) {}

  // User methods
  async createUser(
    email: string,
    passwordHash: string,
    accountType: 'user' | 'merchant'
  ): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const role = accountType;
    const status = 'active';

    await this.db
      .prepare(
        'INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, email, passwordHash, role, status, now, now)
      .run();

    return {
      id,
      email,
      password_hash: passwordHash,
      role,
      status,
      created_at: now,
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
    redirectUris: string[],
    scopes: string[]
  ): Promise<Application> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        'INSERT INTO applications (id, user_id, app_id, app_secret, name, description, redirect_uris, scopes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        id,
        userId,
        appId,
        appSecret,
        name,
        description || null,
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
      redirect_uris: redirectUris,
      scopes,
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
      redirect_uris: JSON.parse(result.redirect_uris),
      scopes: JSON.parse(result.scopes),
    };
  }

  async getApplicationsByUserId(userId: string): Promise<Application[]> {
    const results = await this.db
      .prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<any>();

    return results.results.map(app => ({
      ...app,
      redirect_uris: JSON.parse(app.redirect_uris),
      scopes: JSON.parse(app.scopes),
    }));
  }

  async updateApplication(
    appId: string,
    name: string,
    description: string | undefined,
    redirectUris: string[],
    scopes: string[]
  ): Promise<Application | null> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        'UPDATE applications SET name = ?, description = ?, redirect_uris = ?, scopes = ?, updated_at = ? WHERE app_id = ?'
      )
      .bind(name, description || null, JSON.stringify(redirectUris), JSON.stringify(scopes), now, appId)
      .run();

    return this.getApplicationByAppId(appId);
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
