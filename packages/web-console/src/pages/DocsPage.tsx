import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { usePageTitle } from '../utils/usePageTitle';

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------
const SECTIONS = [
  { id: 'overview',       title: 'Overview' },
  { id: 'quick-start',    title: 'Quick Start' },
  { id: 'oauth-flow',     title: 'OAuth 2.0 Flow' },
  { id: 'pkce',           title: 'PKCE' },
  { id: 'scopes',         title: 'Scopes Reference' },
  { id: 'token-api',      title: 'Token API' },
  { id: 'userinfo-api',   title: 'User Info API' },
  { id: 'xmoj-profile',   title: 'XMOJ Profile' },
  { id: 'callback',       title: 'Callback Handling' },
  { id: 'examples',       title: 'Code Examples' },
  { id: 'errors',         title: 'Error Reference' },
] as const;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function SectionAnchor({ id }: { id: string }) {
  return <div id={id} className="scroll-mt-20" />;
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-semibold text-gh-fg mt-0 mb-4 pb-3 border-b border-gh-border">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-gh-fg mt-6 mb-2">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gh-fg-muted leading-relaxed mb-3">{children}</p>;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-gh border border-[#54aeff66] bg-[#ddf4ff] px-4 py-3 text-sm text-[#0969da] mb-4">
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75zM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
      </svg>
      <div>{children}</div>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-gh border border-[#d4a72c66] bg-[#fff8c5] px-4 py-3 text-sm text-[#633c01] mb-4">
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>
      </svg>
      <div>{children}</div>
    </div>
  );
}

function Method({ method }: { method: 'GET' | 'POST' | 'DELETE' | 'PUT' }) {
  const colors: Record<string, string> = {
    GET:    'bg-[#dafbe1] text-[#116329] border-[#4ac26b66]',
    POST:   'bg-[#ddf4ff] text-[#0550ae] border-[#54aeff66]',
    DELETE: 'bg-[#fff0ee] text-[#d1242f] border-[#ff818266]',
    PUT:    'bg-[#fff8c5] text-[#7d4e00] border-[#d4a72c66]',
  };
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-mono font-semibold ${colors[method]}`}>
      {method}
    </span>
  );
}

function EndpointRow({ method, path, description }: { method: 'GET' | 'POST'; path: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-gh border border-gh-border bg-white px-4 py-3 mb-2">
      <Method method={method} />
      <code className="text-sm font-mono text-gh-fg flex-1">{path}</code>
      <span className="text-sm text-gh-fg-muted">{description}</span>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gh-accent text-white text-sm font-bold">
        {number}
      </div>
      <div>
        <div className="text-sm font-semibold text-gh-fg mb-1">{title}</div>
        <div className="text-sm text-gh-fg-muted leading-relaxed">{description}</div>
      </div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gh-border">
            {headers.map(h => (
              <th key={h} className="py-2 px-3 text-left text-xs font-semibold text-gh-fg-muted uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gh-border last:border-0 hover:bg-gh-canvas">
              {row.map((cell, j) => (
                <td key={j} className="py-2.5 px-3 text-gh-fg align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function DocsPage() {
  usePageTitle('Developer Docs');

  const [activeId, setActiveId] = useState<string>('overview');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const ids = SECTIONS.map(s => s.id);
    const elements = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => {
          const ai = ids.indexOf(a.target.id as typeof ids[number]);
          const bi = ids.indexOf(b.target.id as typeof ids[number]);
          return ai - bi;
        });
        if (visible.length > 0) setActiveId(visible[0].target.id as typeof ids[number]);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );
    elements.forEach(el => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  const frontendBase = window.location.origin.replace(/\/$/, '');
  const backendBase = (
    (window as any).__VITE_API_URL__ ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
    window.location.origin
  ).replace(/\/$/, '');

  return (
    <div className="min-h-screen bg-gh-canvas">
      <div className="mx-auto max-w-screen-xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gh-fg-muted">
          <Link to="/apps" className="hover:text-gh-accent transition-colors">Applications</Link>
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
          </svg>
          <span className="text-gh-fg font-medium">Developer Docs</span>
        </nav>

        <div className="flex gap-8">
          {/* ----------------------------------------------------------------
              Sidebar
          ---------------------------------------------------------------- */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gh-fg-muted">
                On This Page
              </p>
              <nav className="flex flex-col gap-0.5">
                {SECTIONS.map(s => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={e => {
                      e.preventDefault();
                      document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                      setActiveId(s.id);
                    }}
                    className={`
                      block rounded-gh px-3 py-1.5 text-sm transition-colors
                      ${activeId === s.id
                        ? 'bg-[#ddf4ff] text-gh-accent font-medium border-l-2 border-gh-accent pl-[10px]'
                        : 'text-gh-fg-muted hover:text-gh-fg hover:bg-white'
                      }
                    `}
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* ----------------------------------------------------------------
              Main content
          ---------------------------------------------------------------- */}
          <main className="min-w-0 flex-1">
            <div className="bg-white rounded-gh border border-gh-border p-8 space-y-12">

              {/* ============================================================
                  Overview
              ============================================================ */}
              <section>
                <SectionAnchor id="overview" />
                <H2>Overview</H2>
                <P>
                  <strong>AuthMaster</strong> is an open-source OAuth 2.0 / OpenID Connect authorization server
                  running on Cloudflare Workers. It lets you add "Sign in with AuthMaster" to any application
                  in minutes.
                </P>

                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { icon: '🔑', title: 'OAuth 2.0 / OIDC', desc: 'Authorization Code, Client Credentials, Refresh Token flows' },
                    { icon: '🌍', title: 'Edge-native', desc: 'Deployed globally on Cloudflare Workers — no cold starts' },
                    { icon: '🛡️', title: 'Secure by default', desc: 'PKCE, HTTPS-only, CSRF state validation, 30-day JWT sessions' },
                  ].map(f => (
                    <div key={f.title} className="rounded-gh border border-gh-border p-4">
                      <div className="text-2xl mb-2">{f.icon}</div>
                      <div className="text-sm font-semibold text-gh-fg mb-1">{f.title}</div>
                      <div className="text-xs text-gh-fg-muted leading-relaxed">{f.desc}</div>
                    </div>
                  ))}
                </div>

                <H3>Base URLs</H3>
                <Table
                  headers={['Environment', 'API (Worker)', 'Console (Pages)']}
                  rows={[
                    ['Production', backendBase, frontendBase],
                    ['Local dev', 'http://localhost:8787', 'http://localhost:5173'],
                  ]}
                />
              </section>

              {/* ============================================================
                  Quick Start
              ============================================================ */}
              <section>
                <SectionAnchor id="quick-start" />
                <H2>Quick Start</H2>
                <P>Get a working OAuth integration in four steps.</P>

                <StepCard number={1} title="Register a merchant account"
                  description={<>Go to <a href="/register" className="text-gh-accent hover:underline">/register</a> and choose <em>Merchant</em> as your account type.</>}
                />
                <StepCard number={2} title="Create an application"
                  description={<>Navigate to <a href="/apps" className="text-gh-accent hover:underline">Applications → Create Application</a>. Enter your app name, description, and at least one redirect URI.</>}
                />
                <StepCard number={3} title="Save your credentials"
                  description="After creation, copy the App ID and Client Secret from the Credentials section. The secret is shown only once — store it securely."
                />
                <StepCard number={4} title="Build the authorization URL"
                  description={
                    <>
                      Redirect your users to the authorization endpoint shown in the <em>Integration Guide</em> tab of your application. Handle the callback, exchange the code for tokens, and call <code className="bg-gh-canvas px-1 rounded text-xs">/oauth2/userinfo</code>.
                    </>
                  }
                />

                <Note>
                  <strong>Merchant accounts only</strong> — Merchant accounts can create and manage OAuth
                  applications. Regular user accounts cannot. Admin accounts can also manage apps.
                </Note>
              </section>

              {/* ============================================================
                  OAuth 2.0 Flow
              ============================================================ */}
              <section>
                <SectionAnchor id="oauth-flow" />
                <H2>OAuth 2.0 Flow</H2>
                <P>
                  AuthMaster implements the <strong>Authorization Code</strong> flow as defined in
                  {' '}<a href="https://www.rfc-editor.org/rfc/rfc6749" target="_blank" rel="noopener noreferrer" className="text-gh-accent hover:underline">RFC 6749</a>.
                </P>

                {/* Flow diagram */}
                <div className="rounded-gh border border-gh-border bg-gh-canvas font-mono text-xs p-4 mb-5 overflow-x-auto text-gh-fg-muted leading-relaxed">
                  <pre>{`Your App                   AuthMaster                   User
   │                           │                           │
   │── (1) redirect ──────────►│                           │
   │   /oauth2/authorize        │── show login + consent ──►│
   │                           │◄────── approve ───────────│
   │◄── (2) callback ──────────│                           │
   │   ?code=AUTH_CODE&state=  │                           │
   │                           │                           │
   │── (3) POST /oauth2/token ─►│                           │
   │   {code, client_secret}    │                           │
   │◄── access_token ──────────│                           │
   │                           │                           │
   │── (4) GET /oauth2/userinfo ►│                          │
   │   Authorization: Bearer    │                          │
   │◄── user JSON ─────────────│                           │`}</pre>
                </div>

                <H3>Step 1 — Build the authorization URL</H3>
                <P>Construct the URL and redirect the user's browser to it.</P>
                <CodeBlock code={`const params = new URLSearchParams({
  response_type: 'code',
  client_id:     'YOUR_APP_ID',
  redirect_uri:  'https://yourapp.com/oauth/callback',
  scope:         'openid profile email',
  state:         crypto.randomUUID(), // store in session for CSRF check
});
window.location.href = \`${frontendBase}/authorize?\${params}\`;`} />

                <H3>Step 2 — User authenticates and approves</H3>
                <P>
                  AuthMaster shows a login page (if the user isn't already signed in) followed by a
                  consent screen listing the requested scopes. On approval, the browser is redirected to
                  your <code className="bg-gh-canvas px-1 rounded text-xs font-mono">redirect_uri</code>.
                </P>

                <H3>Step 3 — Handle the callback and exchange the code</H3>
                <P>Your server receives <code className="bg-gh-canvas px-1 rounded text-xs font-mono">?code=…&state=…</code>. Validate the state, then POST to the token endpoint.</P>
                <CodeBlock code={`// Verify state matches what you stored
if (req.query.state !== session.oauthState) throw new Error('State mismatch');

const tokenRes = await fetch('${backendBase}/oauth2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type:    'authorization_code',
    code:          req.query.code,
    redirect_uri:  'https://yourapp.com/oauth/callback',
    client_id:     process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,   // server-side only!
  }),
});
const { access_token, refresh_token, expires_in } = await tokenRes.json();`} />

                <H3>Step 4 — Fetch user info</H3>
                <CodeBlock code={`const userRes = await fetch('${backendBase}/oauth2/userinfo', {
  headers: { Authorization: \`Bearer \${access_token}\` },
});
const user = await userRes.json();
// { sub, email, email_verified, name?, xmoj_bound?, xmoj_username? }`} />

                <Warning>
                  <strong>Never expose <code>client_secret</code> in browser/frontend code.</strong>{' '}
                  Token exchange must always happen on your server.
                </Warning>
              </section>

              {/* ============================================================
                  PKCE
              ============================================================ */}
              <section>
                <SectionAnchor id="pkce" />
                <H2>PKCE</H2>
                <P>
                  PKCE (Proof Key for Code Exchange, <a href="https://www.rfc-editor.org/rfc/rfc7636" target="_blank" rel="noopener noreferrer" className="text-gh-accent hover:underline">RFC 7636</a>)
                  is strongly recommended for Single-Page Apps and mobile clients that cannot keep a
                  <code className="bg-gh-canvas px-1 rounded text-xs font-mono"> client_secret</code> confidential.
                </P>

                <StepCard number={1} title="Generate a code verifier"
                  description={
                    <CodeBlock code={`function generateVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
}`} />
                  }
                />
                <StepCard number={2} title="Derive the code challenge"
                  description={
                    <CodeBlock code={`async function deriveChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
}`} />
                  }
                />
                <StepCard number={3} title="Include in the authorization request"
                  description={
                    <>
                      Add <code className="bg-gh-canvas px-1 rounded text-xs font-mono">code_challenge</code> and{' '}
                      <code className="bg-gh-canvas px-1 rounded text-xs font-mono">code_challenge_method=S256</code>{' '}
                      to the authorization URL. Store the verifier in <code className="bg-gh-canvas px-1 rounded text-xs font-mono">sessionStorage</code>.
                    </>
                  }
                />
                <StepCard number={4} title="Send the verifier during token exchange"
                  description={
                    <>
                      Add <code className="bg-gh-canvas px-1 rounded text-xs font-mono">code_verifier</code> to the token POST body instead of (or alongside) the client secret.
                    </>
                  }
                />
              </section>

              {/* ============================================================
                  Scopes Reference
              ============================================================ */}
              <section>
                <SectionAnchor id="scopes" />
                <H2>Scopes Reference</H2>
                <P>Request only the scopes your application actually needs. Users see these during the consent screen.</P>
                <Table
                  headers={['Scope', 'Description', 'Claims returned']}
                  rows={[
                    [<code className="font-mono text-xs bg-gh-canvas px-1 rounded">openid</code>,       'Required for OpenID Connect — issues an ID token',         <code className="font-mono text-xs">sub</code>],
                    [<code className="font-mono text-xs bg-gh-canvas px-1 rounded">profile</code>,      'Basic profile information',                                 <code className="font-mono text-xs">name, updated_at</code>],
                    [<code className="font-mono text-xs bg-gh-canvas px-1 rounded">email</code>,        'Email address',                                            <code className="font-mono text-xs">email, email_verified</code>],
                    [<code className="font-mono text-xs bg-gh-canvas px-1 rounded">xmoj_profile</code>, 'XMOJ competitive-programming account (if bound)',          <code className="font-mono text-xs">xmoj_bound, xmoj_user_id, xmoj_username</code>],
                    [<code className="font-mono text-xs bg-gh-canvas px-1 rounded">read</code>,         'Read access to user-specific data in your application',    '—'],
                    [<code className="font-mono text-xs bg-gh-canvas px-1 rounded">write</code>,        'Write access to user-specific data in your application',   '—'],
                  ]}
                />
                <Note>
                  <code className="font-mono text-xs">openid</code> must always be included when using OIDC flows.
                  Applications cannot request scopes they haven't been granted during registration.
                </Note>
              </section>

              {/* ============================================================
                  Token API
              ============================================================ */}
              <section>
                <SectionAnchor id="token-api" />
                <H2>Token API</H2>
                <EndpointRow method="POST" path="/oauth2/token" description="Exchange code or refresh token" />

                <H3>Authorization Code grant</H3>
                <CodeBlock code={`POST ${backendBase}/oauth2/token
Content-Type: application/json

{
  "grant_type":    "authorization_code",
  "code":          "AUTHORIZATION_CODE",
  "redirect_uri":  "https://yourapp.com/oauth/callback",
  "client_id":     "YOUR_APP_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}`} />
                <H3>Refresh Token grant</H3>
                <CodeBlock code={`POST ${backendBase}/oauth2/token
Content-Type: application/json

{
  "grant_type":    "refresh_token",
  "refresh_token": "REFRESH_TOKEN",
  "client_id":     "YOUR_APP_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}`} />

                <H3>Response</H3>
                <CodeBlock code={`{
  "access_token":  "eyJ...",
  "token_type":    "Bearer",
  "expires_in":    2592000,
  "refresh_token": "eyJ...",
  "scope":         "openid profile email"
}`} />

                <Table
                  headers={['Field', 'Type', 'Description']}
                  rows={[
                    ['access_token',  'string',  'Bearer token for API calls'],
                    ['token_type',    '"Bearer"', 'Always "Bearer"'],
                    ['expires_in',    'number',  'Seconds until token expires (2 592 000 = 30 days)'],
                    ['refresh_token', 'string',  'Use to obtain a new access_token'],
                    ['scope',         'string',  'Space-separated granted scopes'],
                  ]}
                />
              </section>

              {/* ============================================================
                  User Info API
              ============================================================ */}
              <section>
                <SectionAnchor id="userinfo-api" />
                <H2>User Info API</H2>
                <EndpointRow method="GET" path="/oauth2/userinfo" description="Fetch the authenticated user's profile" />

                <CodeBlock code={`GET ${backendBase}/oauth2/userinfo
Authorization: Bearer ACCESS_TOKEN`} />

                <H3>Response (standard claims)</H3>
                <CodeBlock code={`{
  "sub":            "user-uuid",
  "email":          "alice@example.com",
  "email_verified": true
}`} />

                <H3>Additional claims when <code className="font-mono text-xs">xmoj_profile</code> scope is granted</H3>
                <CodeBlock code={`{
  "sub":              "user-uuid",
  "email":            "alice@example.com",
  "email_verified":   true,
  "xmoj_bound":       true,
  "xmoj_user_id":     "12345",
  "xmoj_username":    "alice_xmoj"
}`} />
              </section>

              {/* ============================================================
                  XMOJ Profile
              ============================================================ */}
              <section>
                <SectionAnchor id="xmoj-profile" />
                <H2>XMOJ Profile</H2>
                <P>
                  The <code className="bg-gh-canvas px-1 rounded text-xs font-mono">xmoj_profile</code> scope
                  exposes data from a user's XMOJ (competitive-programming platform) account,{' '}
                  <strong>if and only if</strong> the user has bound their XMOJ account in the AuthMaster console.
                </P>

                <Table
                  headers={['Claim', 'Type', 'Description']}
                  rows={[
                    ['xmoj_bound',     'boolean', 'Whether the user has linked an XMOJ account'],
                    ['xmoj_user_id',   'string',  'XMOJ numeric user ID'],
                    ['xmoj_username',  'string',  'XMOJ display name'],
                  ]}
                />

                <Note>
                  If a user has not bound their XMOJ account,{' '}
                  <code className="font-mono text-xs">xmoj_bound</code> is <code className="font-mono text-xs">false</code>{' '}
                  and the other fields will be absent. Your application should handle both cases gracefully.
                  You can prompt the user to bind at:{' '}
                  <a href="/xmoj-binding" className="text-gh-accent hover:underline">{frontendBase}/xmoj-binding</a>.
                </Note>
              </section>

              {/* ============================================================
                  Callback Handling
              ============================================================ */}
              <section>
                <SectionAnchor id="callback" />
                <H2>Callback Handling</H2>
                <P>After the user interacts with the consent screen, their browser is redirected to your registered redirect URI.</P>

                <H3>Success callback</H3>
                <CodeBlock inline code={`https://yourapp.com/oauth/callback?code=AUTH_CODE&state=YOUR_STATE`} />
                <Table
                  headers={['Parameter', 'Description']}
                  rows={[
                    ['code',  'Short-lived authorization code (10 minutes). Exchange it for tokens immediately.'],
                    ['state', 'The value you passed in the authorization request. Always validate before proceeding.'],
                  ]}
                />

                <H3>Error callback</H3>
                <CodeBlock inline code={`https://yourapp.com/oauth/callback?error=access_denied&error_description=The+user+denied+the+request&state=YOUR_STATE`} />
                <Table
                  headers={['Parameter', 'Description']}
                  rows={[
                    ['error',             'Machine-readable error code (see Error Reference).'],
                    ['error_description', 'Human-readable explanation.'],
                    ['state',             'Echo of the state you provided.'],
                  ]}
                />

                <Warning>
                  <strong>Always validate the <code>state</code> parameter</strong> before exchanging the code.
                  A mismatch indicates a potential CSRF attack — discard the request and show an error.
                </Warning>
              </section>

              {/* ============================================================
                  Code Examples
              ============================================================ */}
              <section>
                <SectionAnchor id="examples" />
                <H2>Code Examples</H2>

                <H3>Complete Node.js / Express callback handler</H3>
                <CodeBlock code={`import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';

const app = express();
const sessions = new Map<string, string>(); // replace with real session store

const AUTH_BASE    = '${backendBase}';
const FRONTEND     = '${frontendBase}';
const CLIENT_ID    = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const REDIRECT_URI = 'https://yourapp.com/oauth/callback';

// Step 1: redirect user to AuthMaster
app.get('/auth/login', (req, res) => {
  const state = crypto.randomUUID();
  sessions.set(req.sessionID, state);         // persist for CSRF check

  const url = new URL(\`\${FRONTEND}/authorize\`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', 'openid profile email xmoj_profile');
  url.searchParams.set('state', state);

  res.redirect(url.toString());
});

// Step 2: handle the callback
app.get('/oauth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query as Record<string, string>;

  // CSRF check
  if (!state || state !== sessions.get(req.sessionID)) {
    return res.status(400).json({ error: 'State mismatch — possible CSRF attack' });
  }
  sessions.delete(req.sessionID);

  // User denied
  if (error) {
    return res.status(403).json({ error, error_description });
  }

  // Exchange code for tokens (server-side only)
  const tokenRes = await fetch(\`\${AUTH_BASE}/oauth2/token\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return res.status(400).json({ error: 'token_exchange_failed', detail: err });
  }

  const { access_token, refresh_token, expires_in } =
    await tokenRes.json() as { access_token: string; refresh_token: string; expires_in: number };

  // Fetch user info
  const userRes = await fetch(\`\${AUTH_BASE}/oauth2/userinfo\`, {
    headers: { Authorization: \`Bearer \${access_token}\` },
  });
  const user = userRes.ok ? await userRes.json() : null;

  // TODO: create your own session here, store tokens securely
  res.json({ user, access_token, refresh_token, expires_in });
});

app.listen(3000);`} />

                <H3>Frontend — initiate OAuth login (TypeScript)</H3>
                <CodeBlock code={`export function startAuthMasterLogin() {
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);

  const url = new URL('${frontendBase}/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id',    'YOUR_APP_ID');   // public — safe in frontend
  url.searchParams.set('redirect_uri', 'https://yourapp.com/oauth/callback');
  url.searchParams.set('scope',        'openid profile email');
  url.searchParams.set('state',        state);

  window.location.href = url.toString();
}`} />
              </section>

              {/* ============================================================
                  Error Reference
              ============================================================ */}
              <section>
                <SectionAnchor id="errors" />
                <H2>Error Reference</H2>
                <P>OAuth errors are returned either as query-string parameters on the callback URL or as JSON bodies from the token/userinfo endpoints.</P>
                <Table
                  headers={['Error code', 'HTTP', 'Cause & fix']}
                  rows={[
                    ['invalid_client',   '401', 'client_id or client_secret is wrong. Check your credentials.'],
                    ['invalid_grant',    '400', 'Authorization code has expired (>10 min), already been used, or redirect_uri doesn\'t match.'],
                    ['invalid_request',  '400', 'A required parameter is missing or malformed.'],
                    ['invalid_scope',    '400', 'You requested a scope that isn\'t registered for your application.'],
                    ['access_denied',    '—',   'The user clicked "Deny" on the consent screen.'],
                    ['unauthorized_client', '403', 'This grant type is not permitted for your application.'],
                    ['server_error',     '500', 'Internal server error. Retry with exponential backoff.'],
                    ['Only user accounts can authorize applications', '403', 'The currently logged-in account is a merchant/admin. Ask the end-user to log in with a regular user account.'],
                  ]}
                />

                <H3>Token endpoint error shape</H3>
                <CodeBlock code={`HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error":             "invalid_grant",
  "error_description": "Authorization code has expired"
}`} />
              </section>

            </div>{/* /card */}
          </main>
        </div>
      </div>
    </div>
  );
}
