# AuthMaster

> Open-source OAuth 2.0 / OpenID Connect authorization server — deployed on Cloudflare Workers.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

- **Full OAuth 2.0 + OIDC** — Authorization Code, Client Credentials, and Refresh Token flows
- **WebAuthn / Passkeys** — Passwordless sign-in with hardware security keys or biometrics
- **TOTP (Authenticator App)** — Time-based one-time passwords for two-factor authentication
- **PKCE support** — Proof Key for Code Exchange for public clients (SPAs, mobile apps)
- **XMOJ integration** — Bind competitive-programming accounts to user profiles
- **Role-based access** — `user`, `merchant`, and `admin` roles with granular permissions
- **Edge-native** — Cloudflare Workers, D1 (SQLite), and KV — no servers to manage
- **30-day sessions** — JWT tokens persist across browser restarts

## Tech Stack

| Layer    | Technology                                   |
|----------|----------------------------------------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS  |
| Backend  | Cloudflare Workers (Hono router)             |
| Database | Cloudflare D1 (SQLite)                       |
| Cache    | Cloudflare KV                                |
| Deploy   | Cloudflare Pages + Workers                   |

## Repository Layout

```
AuthMaster/
├── packages/
│   ├── shared/           # Shared types, constants, validation
│   ├── worker-api/       # Cloudflare Workers backend
│   │   ├── migrations/   # D1 SQL migrations (0001 – 0010)
│   │   └── src/
│   │       ├── routes/   # API route handlers
│   │       └── services/ # Business logic (auth, oauth, passkey, totp…)
│   └── web-console/      # React frontend console
│       └── src/
│           ├── pages/    # Route-level page components
│           ├── components/
│           └── i18n/     # en / zh locale strings
├── docs/                 # Reference documentation
└── turbo.json            # Turborepo pipeline config
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Cloudflare account + [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

**Backend** — create `packages/worker-api/.dev.vars`:

```bash
JWT_SECRET=<random 32-byte hex>
ENCRYPTION_KEY=<random 32-byte hex>
FRONTEND_URL=http://localhost:5173
ISSUER=http://localhost:8787
XMOJ_BASE_URL=https://xmoj.tech
```

Generate random keys:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Frontend** — create `packages/web-console/.env`:

```bash
VITE_API_URL=http://localhost:8787
```

### 3. Set up the local database

```bash
cd packages/worker-api
npx wrangler d1 create authmaster-db --local
npx wrangler d1 migrations apply authmaster-db --local
```

### 4. Start development servers

Open two terminals:

```bash
# Terminal 1 — backend
cd packages/worker-api
npm run dev
# API available at http://localhost:8787

# Terminal 2 — frontend
cd packages/web-console
npm run dev
# Console available at http://localhost:5173
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full walkthrough. Quick reference:

```bash
# Deploy the Worker API
cd packages/worker-api
npx wrangler secret put JWT_SECRET
npx wrangler secret put ENCRYPTION_KEY
npm run deploy

# Deploy the frontend to Cloudflare Pages
cd packages/web-console
npm run build
npx wrangler pages deploy dist --project-name=authmaster
```

After deploying, set environment variables in the Cloudflare dashboard:

- Worker: `FRONTEND_URL`, `ISSUER`, `XMOJ_BASE_URL`
- Pages: `VITE_API_URL`

## Documentation

| Document | Description |
|----------|-------------|
| [Developer Docs](docs/OAUTH2.md) | OAuth 2.0 flow, PKCE, scopes, token API, code examples |
| [API Reference](docs/API.md) | REST endpoint reference |
| [Integration Guide](docs/MERCHANT_USER_CALLBACK_GUIDE.md) | End-to-end merchant integration with callback examples |
| [Deployment Guide](docs/DEPLOYMENT.md) | Cloudflare setup, secrets, migrations |
| [Development Guide](docs/DEVELOPMENT.md) | Local dev environment, project conventions |

## Account Types

| Role | Capabilities |
|------|-------------|
| `user` | Sign in, manage authorizations, bind XMOJ |
| `merchant` | All of the above + create and manage OAuth applications |
| `admin` | All of the above + approve apps, manage users, system settings |

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change. Pull requests should target the `master` branch and include a clear description of the change.

## License

[MIT](LICENSE)
