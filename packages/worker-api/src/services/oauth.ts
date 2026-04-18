import {
  AuthorizeInput,
  TokenInput,
  TokenResponse,
  UserAuthorizationApp,
  ERROR_CODES,
  TOKEN_EXPIRATION,
  GRANT_TYPES,
} from '@authmaster/shared';
import { Env } from '../types';
import { Database } from './database';
import { AppService } from './app';
import { generateRandomString } from '../utils/crypto';
import { signJWT } from '../utils/jwt';

export class OAuthService {
  private db: Database;
  private appService: AppService;

  constructor(private env: Env) {
    this.db = new Database(env.DB);
    this.appService = new AppService(env);
  }

  async authorize(input: AuthorizeInput, userId: string): Promise<{ code: string; redirect_uri: string }> {
    // Verify application
    const app = await this.db.getApplicationByAppId(input.client_id);
    if (!app) {
      throw new Error(ERROR_CODES.INVALID_CLIENT);
    }

    if (app.is_blocked) {
      throw new Error(ERROR_CODES.INVALID_CLIENT);
    }

    // Verify redirect URI
    if (!app.redirect_uris.includes(input.redirect_uri)) {
      throw new Error(ERROR_CODES.INVALID_REQUEST);
    }

    // Verify scopes
    const requestedScopes = input.scope?.split(' ') || [];
    const invalidScopes = requestedScopes.filter(scope => !app.scopes.includes(scope));
    if (invalidScopes.length > 0) {
      throw new Error(ERROR_CODES.INVALID_SCOPE);
    }

    // Check or create authorization
    let authorization = await this.db.getAuthorization(input.client_id, userId);
    if (!authorization) {
      authorization = await this.db.createAuthorization(input.client_id, userId, input.scope || '');
    }

    // Generate authorization code
    const code = `code_${generateRandomString(32)}`;
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION.AUTHORIZATION_CODE * 1000).toISOString();

    // Store code in KV (temporary storage)
    await this.env.CACHE.put(
      `auth_code:${code}`,
      JSON.stringify({
        app_id: input.client_id,
        user_id: userId,
        redirect_uri: input.redirect_uri,
        scope: input.scope || '',
        code_challenge: input.code_challenge,
        code_challenge_method: input.code_challenge_method,
      }),
      { expirationTtl: TOKEN_EXPIRATION.AUTHORIZATION_CODE }
    );

    return {
      code,
      redirect_uri: input.redirect_uri,
    };
  }

  async token(input: TokenInput): Promise<TokenResponse> {
    // Verify application
    const app = await this.appService.verifyApplication(input.client_id, input.client_secret);
    if (!app) {
      throw new Error(ERROR_CODES.INVALID_CLIENT);
    }

    if (app.is_blocked) {
      throw new Error(ERROR_CODES.INVALID_CLIENT);
    }

    switch (input.grant_type) {
      case GRANT_TYPES.AUTHORIZATION_CODE:
        return this.handleAuthorizationCode(input, app.app_id);
      case GRANT_TYPES.CLIENT_CREDENTIALS:
        return this.handleClientCredentials(app.app_id);
      case GRANT_TYPES.REFRESH_TOKEN:
        return this.handleRefreshToken(input, app.app_id);
      default:
        throw new Error(ERROR_CODES.UNSUPPORTED_GRANT_TYPE);
    }
  }

  private async handleAuthorizationCode(input: TokenInput, appId: string): Promise<TokenResponse> {
    if (!input.code || !input.redirect_uri) {
      throw new Error(ERROR_CODES.INVALID_REQUEST);
    }

    // Get authorization code from cache
    const codeData = await this.env.CACHE.get(`auth_code:${input.code}`);
    if (!codeData) {
      throw new Error(ERROR_CODES.INVALID_GRANT);
    }

    const authData = JSON.parse(codeData);

    // Verify app and redirect URI
    if (authData.app_id !== appId || authData.redirect_uri !== input.redirect_uri) {
      throw new Error(ERROR_CODES.INVALID_GRANT);
    }

    // Verify PKCE if present
    if (authData.code_challenge) {
      if (!input.code_verifier) {
        throw new Error(ERROR_CODES.INVALID_REQUEST);
      }
      // In production, verify code_verifier against code_challenge
    }

    // Delete authorization code (one-time use)
    await this.env.CACHE.delete(`auth_code:${input.code}`);

    // Generate tokens
    return this.generateTokens(appId, authData.user_id, authData.scope);
  }

  private async handleClientCredentials(appId: string): Promise<TokenResponse> {
    // Generate access token for machine-to-machine communication
    const expiresIn = TOKEN_EXPIRATION.ACCESS_TOKEN;
    const accessToken = await signJWT(
      {
        sub: appId,
        aud: appId,
        iss: this.env.ISSUER,
        exp: Math.floor(Date.now() / 1000) + expiresIn,
        iat: Math.floor(Date.now() / 1000),
      },
      this.env.JWT_SECRET
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    };
  }

  private async handleRefreshToken(input: TokenInput, appId: string): Promise<TokenResponse> {
    if (!input.refresh_token) {
      throw new Error(ERROR_CODES.INVALID_REQUEST);
    }

    // Get token from database
    const token = await this.db.getOAuthTokenByRefreshToken(input.refresh_token);
    if (!token || token.app_id !== appId) {
      throw new Error(ERROR_CODES.INVALID_GRANT);
    }

    // Generate new tokens
    return this.generateTokens(appId, token.user_id, token.scope);
  }

  private async generateTokens(appId: string, userId: string, scope: string): Promise<TokenResponse> {
    const expiresIn = TOKEN_EXPIRATION.ACCESS_TOKEN;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Generate access token
    const accessToken = await signJWT(
      {
        sub: userId,
        aud: appId,
        iss: this.env.ISSUER,
        exp: Math.floor(Date.now() / 1000) + expiresIn,
        iat: Math.floor(Date.now() / 1000),
        scope,
      },
      this.env.JWT_SECRET
    );

    // Generate refresh token
    const refreshToken = `refresh_${generateRandomString(32)}`;

    // Store tokens in database
    await this.db.createOAuthToken(appId, userId, accessToken, refreshToken, 'Bearer', expiresAt, scope);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope,
    };
  }

  async getUserInfo(accessToken: string): Promise<any> {
    // Get token from database
    const token = await this.db.getOAuthTokenByAccessToken(accessToken);
    if (!token) {
      throw new Error('Invalid token');
    }

    // Check expiration
    if (new Date(token.expires_at) < new Date()) {
      throw new Error('Token expired');
    }

    // Get user
    const user = await this.db.getUserById(token.user_id);
    if (!user) {
      throw new Error('User not found');
    }

    const scopes = new Set((token.scope || '').split(/\s+/).filter(Boolean));

    const userInfo: any = {
      sub: user.id,
      email: user.email,
      email_verified: true,
    };

    if (scopes.has('xmoj_profile')) {
      const binding = await this.db.getXmojBindingByUserId(user.id);
      userInfo.xmoj_bound = !!binding;
      if (binding) {
        userInfo.xmoj_user_id = binding.xmoj_user_id;
        userInfo.xmoj_username = binding.xmoj_username;
      }
    }

    return userInfo;
  }

  async getUserAuthorizations(userId: string): Promise<UserAuthorizationApp[]> {
    return this.db.getUserAuthorizations(userId);
  }

  async revokeUserAuthorization(userId: string, appId: string): Promise<void> {
    await this.db.revokeUserAuthorization(userId, appId);
  }
}
