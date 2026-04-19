import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { startAuthentication } from '@simplewebauthn/browser';
import { api } from '../api/client';
import { getLastPasskeyEmail, isPasskeyTrusted, setLastPasskeyEmail, setPasskeyTrusted } from '../utils/passkey';

export function LoginPage() {
  const { t } = useTranslation();
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          {t('auth.login.title')}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.login.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('auth.login.emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.login.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>

          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={loading || passkeyLoading}
            className="w-full bg-gray-900 hover:bg-black text-white py-2 px-4 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passkeyLoading ? t('auth.login.passkeySubmitting') : t('auth.login.passkeySubmit')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {t('auth.login.noAccount')}{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
            {t('auth.login.signUp')}
          </Link>
        </div>
      </div>
    </div>
  );
}
