import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { startAuthentication } from '@simplewebauthn/browser';
import { api } from '../api/client';
import { getLastPasskeyEmail, isPasskeyTrusted, setLastPasskeyEmail, setPasskeyTrusted } from '../utils/passkey';
import { usePageTitle } from '../utils/usePageTitle';

export function LoginPage() {
  const { t } = useTranslation();
  usePageTitle(t('nav.login'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const lastPasskeyEmail = getLastPasskeyEmail();
    if (lastPasskeyEmail) {
      setEmail(lastPasskeyEmail);
      return;
    }

    const cachedUserRaw = localStorage.getItem('auth_user');
    if (!cachedUserRaw) {
      return;
    }

    try {
      const cachedUser = JSON.parse(cachedUserRaw) as { email?: string };
      if (cachedUser.email) {
        setEmail(cachedUser.email);
      }
    } catch {
      // ignore malformed cache payload
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.login(email, password);
      setSession(result.user, result.token);
      setLastPasskeyEmail(result.user.email);

      const mfaStatus = await api.getMFAStatus();
      const hasMfa = mfaStatus.passkey_count > 0 || mfaStatus.totp_enabled;
      const next = sessionStorage.getItem('oauth_redirect') || '/dashboard';

      if (hasMfa && !isPasskeyTrusted(result.user.id)) {
        navigate(`/passkey-verification?mode=login&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
        return;
      }

      if (next) {
        sessionStorage.removeItem('oauth_redirect');
        window.location.href = next;
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || t('auth.login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    setPasskeyLoading(true);

    try {
      const candidateEmail = email.trim() || getLastPasskeyEmail();
      if (!candidateEmail) {
        setError(t('auth.login.passkeyEmailRequired'));
        return;
      }

      const options = await api.beginPasskeyLogin(candidateEmail);
      const credential = await startAuthentication({ optionsJSON: options.options as any });
      const result = await api.completePasskeyLogin({
        challenge_id: options.challenge_id,
        credential: credential as any,
      });
      setSession(result.user, result.token);
      setPasskeyTrusted(result.user.id);
      setLastPasskeyEmail(result.user.email);

      const oauthRedirect = sessionStorage.getItem('oauth_redirect');
      if (oauthRedirect) {
        sessionStorage.removeItem('oauth_redirect');
        window.location.href = oauthRedirect;
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || t('auth.login.passkeyFailed'));
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gh-canvas flex flex-col items-center justify-center py-12 px-4">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <img src="/favicon.png" alt="AuthMaster" width="48" height="48" className="rounded-md" />
        <h1 className="mt-3 text-2xl font-semibold text-gh-fg">{t('auth.login.title')}</h1>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-gh border border-gh-border bg-white px-6 py-5 shadow-gh-sm">
        {error && (
          <div className="mb-4 rounded-gh border border-gh-danger-border bg-gh-danger-subtle px-3 py-2 text-sm text-gh-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-gh-fg">
              {t('auth.login.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-gh border border-gh-border bg-white px-3 py-1.5 text-sm text-gh-fg placeholder-gh-fg-subtle shadow-gh-sm focus:border-gh-accent focus:outline-none focus:ring-2 focus:ring-gh-accent/30"
              placeholder={t('auth.login.emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-gh-fg">
              {t('auth.login.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-gh border border-gh-border bg-white px-3 py-1.5 text-sm text-gh-fg shadow-gh-sm focus:border-gh-accent focus:outline-none focus:ring-2 focus:ring-gh-accent/30"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-gh border border-gh-btn-primary-border bg-gh-btn-primary px-4 py-1.5 text-sm font-semibold text-white shadow-gh-sm hover:bg-gh-btn-primary-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>
        </form>

        <div className="mt-4 border-t border-gh-border pt-4">
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={loading || passkeyLoading}
            className="w-full rounded-gh border border-gh-border bg-gh-canvas px-4 py-1.5 text-sm font-semibold text-gh-fg shadow-gh-sm hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a4 4 0 100 8A4 4 0 008 0zm0 1.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM2 14a6 6 0 1112 0H2z"/>
            </svg>
            {passkeyLoading ? t('auth.login.passkeySubmitting') : t('auth.login.passkeySubmit')}
          </button>
        </div>
      </div>

      {/* Footer link */}
      <div className="mt-4 w-full max-w-sm rounded-gh border border-gh-border bg-white px-6 py-4 text-center text-sm text-gh-fg-muted shadow-gh-sm">
        {t('auth.login.noAccount')}{' '}
        <Link to="/register" className="font-semibold text-gh-accent hover:underline">
          {t('auth.login.signUp')}
        </Link>
      </div>
    </div>
  );
}
