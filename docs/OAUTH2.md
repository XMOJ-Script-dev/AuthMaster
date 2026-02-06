# OAuth2 Flow Guide

This document explains the OAuth2 flows supported by AuthMaster.

## Authorization Code Flow

The most common OAuth2 flow for web and mobile applications.

### Flow Diagram

```
+--------+                               +---------------+
|        |--(A)- Authorization Request ->|   Resource    |
|        |                               |     Owner     |
|        |<-(B)-- Authorization Grant ---|               |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(C)-- Authorization Grant -->| Authorization |
| Client |                               |     Server    |
|        |<-(D)----- Access Token -------|               |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(E)----- Access Token ------>|    Resource   |
|        |                               |     Server    |
|        |<-(F)--- Protected Resource ---|               |
+--------+                               +---------------+
```

### Step-by-Step Implementation

#### 1. Register Your Application

First, register your application to get credentials:

```bash
curl -X POST https://api.auth.example.com/api/v1/apps/register \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "description": "My application description",
    "redirect_uris": ["https://myapp.com/callback"],
    "scopes": ["openid", "profile", "email"]
  }'
```

Save the `app_id` and `app_secret` from the response.

#### 2. Authorization Request

Redirect the user to the authorization endpoint:

```
https://auth.example.com/oauth2/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://myapp.com/callback&
  scope=openid+profile+email&
  state=RANDOM_STATE&
  code_challenge=CODE_CHALLENGE&
  code_challenge_method=S256
```

**Parameters:**
- `response_type`: Must be `code`
- `client_id`: Your application's client ID
- `redirect_uri`: Callback URL (must match registered URI)
- `scope`: Space-separated list of requested scopes
- `state`: Random string to prevent CSRF attacks
- `code_challenge`: PKCE challenge (optional but recommended)
- `code_challenge_method`: PKCE method (`S256` or `plain`)

#### 3. User Authorization

The user will be presented with a login page and consent screen. After authorizing, they will be redirected to:

```
https://myapp.com/callback?code=AUTHORIZATION_CODE&state=RANDOM_STATE
```

#### 4. Token Exchange

Exchange the authorization code for an access token:

```bash
curl -X POST https://api.auth.example.com/oauth2/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTHORIZATION_CODE",
    "redirect_uri": "https://myapp.com/callback",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "code_verifier": "CODE_VERIFIER"
  }'
```

**Response:**
```json
{
  "access_token": "ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "REFRESH_TOKEN",
  "scope": "openid profile email"
}
```

#### 5. Access Protected Resources

Use the access token to access protected resources:

```bash
curl https://api.auth.example.com/oauth2/userinfo \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Response:**
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "email_verified": true
}
```

## Client Credentials Flow

Used for machine-to-machine authentication.

### Flow Diagram

```
+----------+                                  +---------------+
|          |                                  |               |
|  Client  |----(A)- Client Credentials ----->| Authorization |
|          |                                  |     Server    |
|          |<---(B)---- Access Token ---------|               |
|          |                                  |               |
+----------+                                  +---------------+
```

### Implementation

Request an access token using client credentials:

```bash
curl -X POST https://api.auth.example.com/oauth2/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }'
```

**Response:**
```json
{
  "access_token": "ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Refresh Token Flow

Used to obtain a new access token using a refresh token.

### Implementation

```bash
curl -X POST https://api.auth.example.com/oauth2/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "REFRESH_TOKEN",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }'
```

**Response:**
```json
{
  "access_token": "NEW_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "NEW_REFRESH_TOKEN",
  "scope": "openid profile email"
}
```

## PKCE (Proof Key for Code Exchange)

PKCE adds an extra layer of security to the authorization code flow. It's highly recommended for public clients (mobile apps, SPAs).

### Generate Code Verifier

```javascript
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}
```

### Generate Code Challenge

```javascript
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}
```

### Use in Authorization Request

1. Generate a code verifier and challenge before redirecting
2. Store the verifier securely (e.g., sessionStorage)
3. Include `code_challenge` and `code_challenge_method=S256` in authorization request
4. Include `code_verifier` when exchanging the code for tokens

## Scopes

Available scopes:

- `openid` - Required for OpenID Connect
- `profile` - Access to user profile information
- `email` - Access to user email address
- `read` - Read access to user data
- `write` - Write access to user data

## Token Expiration

- Access tokens: 1 hour
- Refresh tokens: 30 days
- Authorization codes: 10 minutes

## Security Best Practices

1. **Always use HTTPS** in production
2. **Validate redirect URIs** - Only redirect to registered URIs
3. **Use PKCE** - Especially for public clients
4. **Implement state parameter** - Prevent CSRF attacks
5. **Store secrets securely** - Never expose client secrets in frontend code
6. **Validate tokens** - Verify token signatures and expiration
7. **Use short-lived tokens** - Implement token refresh
8. **Implement rate limiting** - Prevent abuse
9. **Log security events** - Monitor for suspicious activity
10. **Keep dependencies updated** - Patch security vulnerabilities

## Error Handling

Common OAuth2 errors:

- `invalid_request` - Malformed request
- `unauthorized_client` - Client not authorized for this grant type
- `access_denied` - User denied authorization
- `unsupported_response_type` - Invalid response type
- `invalid_scope` - Invalid or unsupported scope
- `server_error` - Internal server error
- `temporarily_unavailable` - Server temporarily unavailable

## Example Integration

### JavaScript/TypeScript

```typescript
// 1. Generate PKCE values
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// 2. Store verifier
sessionStorage.setItem('code_verifier', codeVerifier);

// 3. Redirect to authorization
const params = new URLSearchParams({
  response_type: 'code',
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: 'https://myapp.com/callback',
  scope: 'openid profile email',
  state: generateRandomState(),
  code_challenge: codeChallenge,
  code_challenge_method: 'S256'
});

window.location.href = `https://auth.example.com/oauth2/authorize?${params}`;

// 4. Handle callback
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const verifier = sessionStorage.getItem('code_verifier');

// 5. Exchange code for tokens
const response = await fetch('https://api.auth.example.com/oauth2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: 'https://myapp.com/callback',
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_CLIENT_SECRET',
    code_verifier: verifier
  })
});

const tokens = await response.json();
```

### Python

```python
import requests
import secrets
import hashlib
import base64

# 1. Generate PKCE values
code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
code_challenge = base64.urlsafe_b64encode(
    hashlib.sha256(code_verifier.encode('utf-8')).digest()
).decode('utf-8').rstrip('=')

# 2. Build authorization URL
auth_url = 'https://auth.example.com/oauth2/authorize'
params = {
    'response_type': 'code',
    'client_id': 'YOUR_CLIENT_ID',
    'redirect_uri': 'https://myapp.com/callback',
    'scope': 'openid profile email',
    'state': secrets.token_urlsafe(32),
    'code_challenge': code_challenge,
    'code_challenge_method': 'S256'
}

# 3. Exchange code for tokens
token_response = requests.post(
    'https://api.auth.example.com/oauth2/token',
    json={
        'grant_type': 'authorization_code',
        'code': authorization_code,
        'redirect_uri': 'https://myapp.com/callback',
        'client_id': 'YOUR_CLIENT_ID',
        'client_secret': 'YOUR_CLIENT_SECRET',
        'code_verifier': code_verifier
    }
)

tokens = token_response.json()
```

## Testing

Use the OpenID Connect Discovery endpoint to test your integration:

```bash
curl https://api.auth.example.com/.well-known/openid-configuration
```

This returns all available endpoints and supported features.
