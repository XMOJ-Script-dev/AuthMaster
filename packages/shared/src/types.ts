// User types
export type AccountRole = 'user' | 'merchant' | 'admin';
export type AccountStatus = 'active' | 'disabled' | 'pending';
export type AppValidationStatus = 'unverified' | 'pending' | 'validated' | 'rejected';
export type AppChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface SystemSettings {
  allow_merchant_registration: boolean;
  merchant_registration_requires_review: boolean;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: AccountRole;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  created_at: string;
}

export interface XmojBinding {
  id: string;
  user_id: string;
  xmoj_user_id: string;
  xmoj_username: string;
  phpsessid_encrypted: string;
  bind_method: 'bookmark' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface XmojBindingPublic {
  xmoj_user_id: string;
  xmoj_username: string;
  bind_method: 'bookmark' | 'manual';
  created_at: string;
}

export interface PasskeyCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  name: string;
  device_type: string;
  backed_up: boolean;
  transports?: string;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PasskeyCredentialPublic {
  id: string;
  name: string;
  device_type: string;
  backed_up: boolean;
  transports: string[];
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PasskeyChallenge {
  id: string;
  user_id: string;
  purpose: 'registration' | 'authentication';
  challenge: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface PasskeyListResponse {
  passkeys: PasskeyCredentialPublic[];
}

export interface PasskeyOptionsResponse {
  challenge_id: string;
  options: any;
}

export interface PasskeyRegistrationCompleteRequest {
  challenge_id: string;
  credential: Record<string, unknown>;
  name?: string;
}

export interface PasskeyAuthenticationCompleteRequest {
  challenge_id: string;
  credential: Record<string, unknown>;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminListUsersResponse {
  users: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminApplicationListItem {
  app_id: string;
  name: string;
  description?: string;
  creator_name: string;
  publisher_website?: string;
  privacy_policy_url?: string;
  children_policy_url?: string;
  terms_of_service_url?: string;
  is_official: boolean;
  validation_status: AppValidationStatus;
  validation_submitted_at?: string;
  validation_reviewed_at?: string;
  owner_user_id: string;
  owner_email: string;
  redirect_uris: string[];
  scopes: string[];
  is_blocked: boolean;
  blocked_reason?: string;
  blocked_at?: string;
  warning_message?: string;
  warning_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminListApplicationsResponse {
  applications: AdminApplicationListItem[];
  total: number;
  limit: number;
  offset: number;
}

export type AdminAuditAction =
  | 'user.role.update'
  | 'user.status.update'
  | 'system.settings.update'
  | 'app.block.update'
  | 'app.warning.update'
  | 'app.delete'
  | 'app.validation.review'
  | 'app.change.review';

export interface AdminAuditLogItem {
  id: string;
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
  created_at: string;
}

export interface AdminListAuditLogsResponse {
  logs: AdminAuditLogItem[];
  total: number;
  limit: number;
  offset: number;
}

// Application types
export interface Application {
  id: string;
  user_id: string;
  app_id: string;
  app_secret: string;
  name: string;
  description?: string;
  creator_name?: string;
  publisher_website?: string;
  privacy_policy_url?: string;
  children_policy_url?: string;
  terms_of_service_url?: string;
  is_official?: boolean;
  validation_status?: AppValidationStatus;
  validation_submission?: string;
  validation_submitted_at?: string;
  validation_review_note?: string;
  validation_reviewed_at?: string;
  validation_reviewed_by?: string;
  redirect_uris: string[];
  scopes: string[];
  is_blocked?: boolean;
  blocked_reason?: string;
  blocked_at?: string;
  warning_message?: string;
  warning_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationPublic {
  id: string;
  app_id: string;
  name: string;
  description?: string;
  creator_name?: string;
  publisher_website?: string;
  privacy_policy_url?: string;
  children_policy_url?: string;
  terms_of_service_url?: string;
  is_official?: boolean;
  validation_status?: AppValidationStatus;
  validation_submitted_at?: string;
  validation_review_note?: string;
  validation_reviewed_at?: string;
  redirect_uris: string[];
  scopes: string[];
  created_at: string;
}

export interface AppChangeRequestItem {
  id: string;
  app_id: string;
  submitted_by_user_id: string;
  payload: Record<string, unknown>;
  submission_note?: string;
  status: AppChangeRequestStatus;
  review_note?: string;
  reviewed_by_user_id?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// Authorization types
export interface Authorization {
  id: string;
  app_id: string;
  user_id: string;
  scope: string;
  created_at: string;
}

export interface UserAuthorizationApp {
  app_id: string;
  app_name: string;
  app_description?: string;
  scope: string;
  authorized_at: string;
  last_used_at?: string;
  active_tokens: number;
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
  account_type: Extract<AccountRole, 'user' | 'merchant'>;
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

export interface BindXmojRequest {
  xmoj_username: string;
  phpsessid: string;
  bind_method: 'bookmark' | 'manual';
}

export interface BindXmojResponse {
  binding: XmojBindingPublic;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface CreateApplicationRequest {
  name: string;
  description?: string;
  creator_name: string;
  publisher_website?: string;
  privacy_policy_url?: string;
  children_policy_url?: string;
  terms_of_service_url?: string;
  is_official?: boolean;
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
  role?: AccountRole;
  status?: AccountStatus;
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
  xmoj_bound?: boolean;
  xmoj_user_id?: string;
  xmoj_username?: string;
}
