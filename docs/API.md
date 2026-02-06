# API Documentation

## Base URL

- Development: `http://localhost:8787`
- Production: `https://api.auth.example.com`

## Authentication

Most endpoints require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Register

Register a new user account.

**Request:**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "created_at": "2026-02-06T00:00:00Z"
}
```

#### Login

Authenticate and receive an access token.

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "created_at": "2026-02-06T00:00:00Z"
  },
  "token": "jwt-token",
  "expires_in": 3600
}
```

#### Reset Password

Request a password reset email.

**Request:**
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent"
}
```

### Applications

#### Create Application

Register a new OAuth application.

**Request:**
```http
POST /api/v1/apps/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Application",
  "description": "Application description",
  "redirect_uris": ["https://example.com/callback"],
  "scopes": ["openid", "profile", "email"]
}
```

**Response:**
```json
{
  "app_id": "app_abc123",
  "app_secret": "secret_xyz789",
  "application": {
    "id": "app-internal-id",
    "app_id": "app_abc123",
    "name": "My Application",
    "description": "Application description",
    "redirect_uris": ["https://example.com/callback"],
    "scopes": ["openid", "profile", "email"],
    "created_at": "2026-02-06T00:00:00Z"
  }
}
```

#### Get Applications

List all applications for the authenticated user.

**Request:**
```http
GET /api/v1/apps
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "app-internal-id",
    "app_id": "app_abc123",
    "name": "My Application",
    "description": "Application description",
    "redirect_uris": ["https://example.com/callback"],
    "scopes": ["openid", "profile", "email"],
    "created_at": "2026-02-06T00:00:00Z"
  }
]
```

#### Get Application

Get details of a specific application.

**Request:**
```http
GET /api/v1/apps/:appId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "app-internal-id",
  "app_id": "app_abc123",
  "name": "My Application",
  "description": "Application description",
  "redirect_uris": ["https://example.com/callback"],
  "scopes": ["openid", "profile", "email"],
  "created_at": "2026-02-06T00:00:00Z"
}
```

### OAuth2

#### Authorization

Request authorization from a user.

**Request:**
```http
POST /oauth2/authorize
Authorization: Bearer <token>
Content-Type: application/json

{
  "response_type": "code",
  "client_id": "app_abc123",
  "redirect_uri": "https://example.com/callback",
  "scope": "openid profile email",
  "state": "random-state",
  "code_challenge": "challenge-string",
  "code_challenge_method": "S256"
}
```

**Response:**
```json
{
  "redirect_uri": "https://example.com/callback?code=authorization-code&state=random-state"
}
```

#### Token Exchange

Exchange authorization code for access token.

**Request:**
```http
POST /oauth2/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "authorization-code",
  "redirect_uri": "https://example.com/callback",
  "client_id": "app_abc123",
  "client_secret": "secret_xyz789",
  "code_verifier": "verifier-string"
}
```

**Response:**
```json
{
  "access_token": "access-token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token",
  "scope": "openid profile email"
}
```

#### Client Credentials

Get access token using client credentials.

**Request:**
```http
POST /oauth2/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "app_abc123",
  "client_secret": "secret_xyz789"
}
```

**Response:**
```json
{
  "access_token": "access-token",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### Refresh Token

Get new access token using refresh token.

**Request:**
```http
POST /oauth2/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "refresh-token",
  "client_id": "app_abc123",
  "client_secret": "secret_xyz789"
}
```

**Response:**
```json
{
  "access_token": "new-access-token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new-refresh-token",
  "scope": "openid profile email"
}
```

#### User Info

Get user information using access token.

**Request:**
```http
GET /oauth2/userinfo
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "email_verified": true
}
```

### OpenID Connect Discovery

Get OpenID Connect configuration.

**Request:**
```http
GET /.well-known/openid-configuration
```

**Response:**
```json
{
  "issuer": "https://api.auth.example.com",
  "authorization_endpoint": "https://api.auth.example.com/oauth2/authorize",
  "token_endpoint": "https://api.auth.example.com/oauth2/token",
  "userinfo_endpoint": "https://api.auth.example.com/oauth2/userinfo",
  "jwks_uri": "https://api.auth.example.com/.well-known/jwks.json",
  "response_types_supported": ["code", "token"],
  "grant_types_supported": ["authorization_code", "client_credentials", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["HS256"],
  "scopes_supported": ["openid", "profile", "email", "read", "write"],
  "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic"],
  "claims_supported": ["sub", "email", "email_verified"]
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "error_code",
  "error_description": "Human readable error description"
}
```

### Common Error Codes

- `invalid_request` - The request is missing a required parameter
- `invalid_client` - Client authentication failed
- `invalid_grant` - The authorization grant is invalid
- `unauthorized_client` - The client is not authorized
- `unsupported_grant_type` - The grant type is not supported
- `invalid_scope` - The requested scope is invalid
- `access_denied` - The resource owner denied the request
- `server_error` - Internal server error

## Rate Limiting

API requests are rate limited per application. Current limits:

- 1000 requests per hour per application
- 10,000 requests per day per application

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```
