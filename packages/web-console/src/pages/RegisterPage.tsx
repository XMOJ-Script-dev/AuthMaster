import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../utils/usePageTitle';

export function RegisterPage() {
  const { t } = useTranslation();
  usePageTitle(t('nav.register'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<'user' | 'merchant'>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.register.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('profile.changePassword.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const result = await register(email, password, accountType);
      if (result.pendingReview) {
        navigate('/login');
        return;
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || t('auth.register.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gh-canvas flex flex-col items-center justify-center py-12 px-4">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <img src="/favicon.png" alt="AuthMaster" width="48" height="48" className="rounded-md" />
        <h1 className="mt-3 text-2xl font-semibold text-gh-fg">{t('auth.register.title')}</h1>
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
            <label htmlFor="accountType" className="mb-1 block text-sm font-semibold text-gh-fg">
              {t('auth.register.accountTypeLabel')}
            </label>
            <select
              id="accountType"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as 'user' | 'merchant')}
              className="w-full rounded-gh border border-gh-border bg-white px-3 py-1.5 text-sm text-gh-fg shadow-gh-sm focus:border-gh-accent focus:outline-none focus:ring-2 focus:ring-gh-accent/30"
            >
              <option value="user">{t('auth.register.accountTypeUser')}</option>
              <option value="merchant">{t('auth.register.accountTypeMerchant')}</option>
            </select>
            <p className="mt-1.5 text-xs text-gh-fg-muted">
              {accountType === 'merchant'
                ? t('auth.register.accountTypeMerchantHint')
                : t('auth.register.accountTypeUserHint')}
            </p>
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-gh-fg">
              {t('auth.register.email')}
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
              {t('auth.register.password')}
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

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-semibold text-gh-fg">
              {t('auth.register.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? t('auth.register.submitting') : t('auth.register.submit')}
          </button>
        </form>
      </div>

      {/* Footer link */}
      <div className="mt-4 w-full max-w-sm rounded-gh border border-gh-border bg-white px-6 py-4 text-center text-sm text-gh-fg-muted shadow-gh-sm">
        {t('auth.register.hasAccount')}{' '}
        <Link to="/login" className="font-semibold text-gh-accent hover:underline">
          {t('auth.register.signIn')}
        </Link>
      </div>
    </div>
  );
}
