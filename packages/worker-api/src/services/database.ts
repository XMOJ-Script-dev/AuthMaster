import { User, Application, Authorization, OAuthToken, APIUsage } from '@authmaster/shared';
import { Env } from '../types';

export class Database {
  constructor(private db: D1Database) {}

  // User methods
  async createUser(email: string, passwordHash: string): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare('INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, email, passwordHash, now, now)
      .run();

    return {
      id,
      email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<User>();

    return result;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();

    return result;
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
