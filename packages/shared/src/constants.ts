// OAuth2 scopes
export const SCOPES = {
  OPENID: 'openid',
  PROFILE: 'profile',
  EMAIL: 'email',
  READ: 'read',
  WRITE: 'write',
} as const;

// OAuth2 grant types
export const GRANT_TYPES = {
  AUTHORIZATION_CODE: 'authorization_code',
  CLIENT_CREDENTIALS: 'client_credentials',
  REFRESH_TOKEN: 'refresh_token',
} as const;

// Response types
export const RESPONSE_TYPES = {
  CODE: 'code',
  TOKEN: 'token',
} as const;

// Token expiration times (in seconds)
export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN: 3600, // 1 hour
  REFRESH_TOKEN: 2592000, // 30 days
  AUTHORIZATION_CODE: 600, // 10 minutes
} as const;

// Error codes
export const ERROR_CODES = {
  INVALID_REQUEST: 'invalid_request',
  INVALID_CLIENT: 'invalid_client',
  INVALID_GRANT: 'invalid_grant',
  UNAUTHORIZED_CLIENT: 'unauthorized_client',
  UNSUPPORTED_GRANT_TYPE: 'unsupported_grant_type',
  INVALID_SCOPE: 'invalid_scope',
  ACCESS_DENIED: 'access_denied',
  SERVER_ERROR: 'server_error',
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;
