# Development Guide

This guide will help you set up AuthMaster for local development.

## Prerequisites

- Node.js 18 or later
- pnpm (recommended) or npm
- Cloudflare account (for deployment)

## Project Structure

```
authmaster/
├── packages/
│   ├── shared/           # Shared types and validation
│   ├── worker-api/       # Cloudflare Workers backend
│   └── web-console/      # React frontend
├── docs/                 # Documentation
├── package.json          # Root package.json (monorepo)
└── turbo.json           # Turborepo configuration
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/PythonSmall-Q/AuthMaster.git
cd AuthMaster
```

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for all packages in the monorepo.

### 3. Setup Environment Variables

#### Backend (worker-api)

Create `.dev.vars` in `packages/worker-api/`:

```bash
JWT_SECRET=your-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here
FRONTEND_URL=http://localhost:3000
ISSUER=http://localhost:8787
XMOJ_BASE_URL=https://xmoj.tech
```

`XMOJ_BASE_URL` is used by XMOJ account binding verification. During bind,
the backend sends a request with `PHPSESSID` and verifies by parsing the top-right
profile name from the returned page.

Generate secure random keys:

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Frontend (web-console)

Create `.env` in `packages/web-console/`:

```bash
VITE_API_URL=http://localhost:8787
```

### 4. Setup Database

```bash
cd packages/worker-api

# Create local D1 database
npx wrangler d1 create authmaster-db --local

# Run migrations
npx wrangler d1 migrations apply authmaster-db --local
```

### 5. Start Development Servers

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd packages/worker-api
npm run dev
```

The API will be available at `http://localhost:8787`.

**Terminal 2 - Frontend:**
```bash
cd packages/web-console
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## Development Workflow

### Building Packages

Build all packages:

```bash
npm run build
```

Build specific package:

```bash
cd packages/shared
npm run build
```

### Running Tests

```bash
npm run test
```

### Linting

```bash
npm run lint
```

### Type Checking

TypeScript compilation happens automatically during build. To check types:

```bash
cd packages/worker-api
npx tsc --noEmit

cd packages/web-console
npx tsc --noEmit
```

## Working with the Database

### View Database Tables

```bash
cd packages/worker-api
npx wrangler d1 execute authmaster-db --local --command "SELECT * FROM users"
```

### Create Migration

Create a new migration file in `packages/worker-api/migrations/`:

```sql
-- migrations/0003_add_column.sql
ALTER TABLE users ADD COLUMN last_login TEXT;
```

Apply migration:

```bash
npx wrangler d1 migrations apply authmaster-db --local
```

### Reset Database

```bash
npx wrangler d1 execute authmaster-db --local --command "DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS applications; DROP TABLE IF EXISTS authorizations; DROP TABLE IF EXISTS oauth_tokens; DROP TABLE IF EXISTS api_usage;"
npx wrangler d1 migrations apply authmaster-db --local
```

## API Development

### Adding New Endpoints

1. Define types in `packages/shared/src/types.ts`
2. Add validation schema in `packages/shared/src/validation.ts`
3. Create service method in `packages/worker-api/src/services/`
4. Add route handler in `packages/worker-api/src/routes/index.ts`

Example:

```typescript
// 1. Add type (shared)
export interface MyRequest {
  field: string;
}

// 2. Add validation (shared)
export const mySchema = z.object({
  field: z.string().min(1),
});

// 3. Add service method (worker-api)
async myMethod(input: MyRequest): Promise<void> {
  // Implementation
}

// 4. Add route (worker-api)
router.add('POST', '/api/v1/my-endpoint', async (request, env) => {
  const body = await request.json();
  const input = mySchema.parse(body);
  // Handle request
});
```

### Testing API Endpoints

Use curl or a tool like Postman:

```bash
# Register user
curl -X POST http://localhost:8787/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:8787/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create application (requires token)
curl -X POST http://localhost:8787/api/v1/apps/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name":"My App",
    "redirect_uris":["http://localhost:3000/callback"],
    "scopes":["openid","profile","email"]
  }'
```

## Frontend Development

### Adding New Pages

1. Create page component in `packages/web-console/src/pages/`
2. Add route in `packages/web-console/src/App.tsx`

Example:

```tsx
// 1. Create page component
export function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
    </div>
  );
}

// 2. Add route
<Route path="/my-page" element={<MyPage />} />
```

### Adding API Calls

Add methods to the API client in `packages/web-console/src/api/client.ts`:

```typescript
async myEndpoint(data: any) {
  return this.request('/api/v1/my-endpoint', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

### Styling

The project uses Tailwind CSS. Add utility classes directly to components:

```tsx
<div className="container mx-auto px-4 py-8">
  <h1 className="text-3xl font-bold text-gray-900 mb-4">
    Title
  </h1>
</div>
```

## Debugging

### Backend Debugging

View worker logs:

```bash
cd packages/worker-api
npx wrangler tail --local
```

Add console.log statements:

```typescript
console.log('Debug:', { variable });
```

### Frontend Debugging

Use browser DevTools:

1. Open browser DevTools (F12)
2. Check Console for errors
3. Use Network tab to inspect API requests
4. Use React DevTools extension

## Common Issues

### Port Already in Use

If port 8787 or 3000 is in use:

```bash
# Find process using port
lsof -i :8787
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Issues

Reset local database:

```bash
cd packages/worker-api
rm -rf .wrangler/state
npx wrangler d1 migrations apply authmaster-db --local
```

### CORS Errors

Ensure the backend CORS settings allow the frontend origin:

```typescript
corsHeaders: {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  // ...
}
```

### Module Not Found

Rebuild shared package:

```bash
cd packages/shared
npm run build
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define types for all function parameters and return values
- Use interfaces for object shapes

### Naming Conventions

- Variables/Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase
- Files: kebab-case

### Comments

Add comments for:
- Complex logic
- Non-obvious behavior
- Public APIs
- Security considerations

## Git Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### Commit Messages

Follow conventional commits:

```
feat: add user profile endpoint
fix: resolve CORS issue on login
docs: update API documentation
refactor: simplify token generation
```

### Pull Requests

1. Create feature branch
2. Make changes
3. Write tests
4. Update documentation
5. Submit PR with description

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [OAuth 2.0 Spec](https://oauth.net/2/)
- [OpenID Connect Spec](https://openid.net/connect/)
- [React Docs](https://react.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)

## Getting Help

- GitHub Issues: Report bugs or request features
- Discussions: Ask questions and share ideas
- Documentation: Check docs for guides and API reference
