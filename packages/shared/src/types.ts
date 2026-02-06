// User types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: string;
  email: string;
  created_at: string;
}

// Application types
export interface Application {
  id: string;
  user_id: string;
  app_id: string;
  app_secret: string;
  name: string;
  description?: string;
  redirect_uris: string[];
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export interface ApplicationPublic {
  id: string;
  app_id: string;
  name: string;
  description?: string;
  redirect_uris: string[];
  scopes: string[];
  created_at: string;
}

// Authorization types
export interface Authorization {
  id: string;
  app_id: string;
  user_id: string;
  scope: string;
  created_at: string;
}

// OAuth Token types
export interface OAuthToken {
  id: string;
  app_id: string;
  user_id: string;
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at: string;
  scope: string;
  created_at: string;
}

// API Usage types
export interface APIUsage {
  id: string;
  app_id: string;
  endpoint: string;
  request_count: number;
  data_usage: number;
  avg_response_time: number;
  error_count: number;
  created_at: string;
}

// Request/Response types
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserPublic;
  token: string;
  expires_in: number;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface CreateApplicationRequest {
  name: string;
  description?: string;
  redirect_uris: string[];
  scopes: string[];
}

export interface CreateApplicationResponse {
  app_id: string;
  app_secret: string;
  application: ApplicationPublic;
}

// OAuth2 types
export interface AuthorizeRequest {
  response_type: 'code' | 'token';
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: 'S256' | 'plain';
}

export interface TokenRequest {
  grant_type: 'authorization_code' | 'client_credentials' | 'refresh_token';
  code?: string;
  redirect_uri?: string;
  client_id: string;
  client_secret: string;
  refresh_token?: string;
  code_verifier?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface ErrorResponse {
  error: string;
  error_description?: string;
}

// JWT Payload
export interface JWTPayload {
  sub: string;
  email?: string;
  aud?: string;
  iss: string;
  exp: number;
  iat: number;
  scope?: string;
}

// OpenID Connect UserInfo
export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
}
