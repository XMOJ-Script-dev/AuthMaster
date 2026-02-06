# Deployment Guide

This guide will help you deploy AuthMaster to Cloudflare.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [Cloudflare Account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Wrangler

Login to your Cloudflare account:

```bash
npx wrangler login
```

### 3. Create D1 Database

Create a new D1 database:

```bash
cd packages/worker-api
npx wrangler d1 create authmaster-db
```

Copy the database ID from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "authmaster-db"
database_id = "your-database-id-here"
```

### 4. Run Database Migrations

Apply the database schema:

```bash
npx wrangler d1 migrations apply authmaster-db
```

### 5. Create KV Namespace

Create a KV namespace for caching:

```bash
npx wrangler kv:namespace create "CACHE"
```

Update `wrangler.toml` with the KV namespace ID:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id-here"
```

### 6. Set Secrets

Generate and set secret keys:

```bash
# Generate a random JWT secret
npx wrangler secret put JWT_SECRET

# Generate an encryption key
npx wrangler secret put ENCRYPTION_KEY
```

### 7. Configure Environment Variables

#### Backend Configuration

Update `wrangler.toml` with your domain information:

```toml
[vars]
FRONTEND_URL = "https://auth.yourdomain.com"
ISSUER = "https://api.auth.yourdomain.com"
```

For local development, create `.dev.vars` file in `packages/worker-api/`:

```bash
JWT_SECRET=your-generated-jwt-secret-32-bytes-hex
ENCRYPTION_KEY=your-generated-encryption-key-32-bytes-hex
FRONTEND_URL=http://localhost:3000
```

#### Frontend Configuration

Create `.env` file in `packages/web-console/`:

```bash
VITE_API_URL=http://localhost:8787
```

For production, update the environment variable during deployment:

```bash
# Via Cloudflare Pages dashboard: Settings > Environment variables
VITE_API_URL=https://api.auth.yourdomain.com
```

## Deploy Backend

### Development

Configure local environment variables first by creating `.dev.vars`:

```bash
cd packages/worker-api
cat > .dev.vars << EOF
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
FRONTEND_URL=http://localhost:3000
EOF
```

Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:8787`.

### Production

Deploy to Cloudflare Workers:

```bash
Create `.env` file with your backend API URL:

```bash
cd packages/web-console
cat > .env << EOF
VITE_API_URL=http://localhost:8787
EOF
```

Start the development server:

```bash
Your API will be deployed to a `*.workers.dev` domain. You can configure a custom domain in the Cloudflare dashboard.

## Deploy Frontend

### Development

Start the development server:

```bash
cd pacthe frontend:

```bash
cd packages/web-console
npm run build
```

Deploy to Cloudflare Pages:

```bash
npx wrangler pages deploy dist --project-name=authmaster
```

**Important**: After deployment, configure the `VITE_API_URL` environment variable in Cloudflare Pages dashboard:

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
2. Select your project
3. Go to "Settings" > "Environment variables"
4. Add variable: `VITE_API_URL` = `https://api.auth.yourdomain.com`
5. Redeploy for changes to take effect

Alternatively, you can connect your GitHub repository to Cloudflare Pages for automatic deployments:

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
2. Click "Create a project"
3. Connect your GitHub repository
4. Set build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `packages/web-console`
5. Set environment variables:
   - `VITE_API_URL` = `https://api.auth.yourdomain.com repository to Cloudflare Pages for automatic deployments:

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
2. Click "Create a project"
3. Connect your GitHub repository
4. Set build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `packages/web-console`

## Configure Custom Domain

### Backend (Workers)

1. Go to [Cloudflare Workers](https://dash.cloudflare.com/workers)
2. Select your worker
3. Click "Triggers" > "Custom Domains"
4. Add your custom domain (e.g., `api.auth.yourdomain.com`)

### Frontend (Pages)

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
2. Select your project
3. Click "Custom domains"
4. Add your custom domain (e.g., `auth.yourdomain.com`)

## Environment-Specific Deployments

### Staging

Create a staging environment:

```bash
# Deploy backend to staging
cd packages/worker-api
npx wrangler deploy --env staging

# Deploy frontend to staging
cd packages/web-console
npx wrangler pages deploy dist --project-name=authmaster-staging
```

### Production

Deploy to production:

```bash
# Deploy backend to production
cd packages/worker-api
npx wrangler deploy --env production

# Deploy frontend to production
cd packages/web-console
npx wrangler pages deploy dist --project-name=authmaster
```

## Monitoring

### View Logs

View real-time logs:

```bash
npx wrangler tail
```

### Analytics

Cloudflare provides built-in analytics for Workers and Pages:

- Workers: https://dash.cloudflare.com/workers
- Pages: https://dash.cloudflare.com/pages

## Troubleshooting

### Database Connection Issues

Verify your database connection:

```bash
npx wrangler d1 execute authmaster-db --command "SELECT * FROM users LIMIT 1"
```

### KV Issues

List KV namespaces:

```bash
npx wrangler kv:namespace list
```

### Deployment Errors

Check deployment status:

```bash
npx wrangler deployments list
```

View deployment logs:

```bash
npx wrangler tail --format pretty
```

## Security Considerations

1. **Secrets**: Never commit `JWT_SECRET` or `ENCRYPTION_KEY` to version control
2. **Environment Variables**: Use different API URLs and secrets for development, staging, and production
3. **CORS**: Configure appropriate CORS settings in production by setting `FRONTEND_URL` correctly
4. **Rate Limiting**: Enable Cloudflare rate limiting rules
5. **WAF**: Enable Cloudflare Web Application Firewall
6. **SSL**: Always use HTTPS in production
7. **Secret Rotation**: Rotate secrets periodically and after any suspected compromise

## Environment Variables Reference

### Backend (Worker API)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JWT_SECRET` | Yes | Secret key for JWT signing (32 bytes hex) | `abc123...` |
| `ENCRYPTION_KEY` | Yes | Secret key for data encryption (32 bytes hex) | `def456...` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS and redirects | `https://auth.yourdomain.com` |
| `ISSUER` | Optional | OAuth issuer identifier | `https://api.auth.yourdomain.com` |

**Configuration Files:**
- Local development: `.dev.vars` (not committed to git)
- Production: Cloudflare Workers secrets + `wrangler.toml` vars

### Frontend (Web Console)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API base URL | `https://api.auth.yourdomain.com` |

**Configuration Files:**
- Local development: `.env` (not committed to git)
- Production: Cloudflare Pages environment variables

## Backup and Recovery

### Backup Database

Export database data:

```bash
npx wrangler d1 export authmaster-db --output backup.sql
```

### Restore Database

Import database data:

```bash
npx wrangler d1 execute authmaster-db --file backup.sql
```

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - name: Deploy Worker
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Support

For issues or questions:

- GitHub Issues: https://github.com/PythonSmall-Q/AuthMaster/issues
- Documentation: https://github.com/PythonSmall-Q/AuthMaster/docs
