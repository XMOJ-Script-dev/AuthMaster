import {
  User,
  Application,
  Authorization,
  OAuthToken,
  APIUsage,
  XmojBinding,
  UserAuthorizationApp,
  AccountRole,
  AccountStatus,
  AdminUserListItem,
  AdminApplicationListItem,
  AdminAuditAction,
  AdminAuditLogItem,
} from '@authmaster/shared';
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
