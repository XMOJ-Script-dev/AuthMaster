import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = user?.role;
  const isAdmin = role === 'admin';
  const canManageApps = role === 'merchant' || role === 'admin';
  const canBindXmoj = role === 'user' || role === undefined;
  const displayName = useMemo(() => {
    if (!user?.email) return t('nav.account');
    const name = user.email.split('@')[0];
    return name || user.email;
  }, [user?.email, t]);

  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <nav className="bg-gh-header text-white">
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
            <img src="/favicon.png" alt="AuthMaster" height="32" width="32" className="rounded-sm" />
            <span className="font-semibold text-sm">AuthMaster</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1 flex-1">
            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  className="px-3 py-1.5 rounded-gh text-sm text-white/80 hover:text-white hover:bg-gh-header-hover transition-colors"
                >
                  {t('nav.dashboard')}
                </Link>
                {canManageApps && (
                  <Link
                    to="/apps"
                    className="px-3 py-1.5 rounded-gh text-sm text-white/80 hover:text-white hover:bg-gh-header-hover transition-colors"
                  >
                    {t('nav.applications')}
                  </Link>
                )}
                {canManageApps && (
                  <Link
                    to="/docs"
                    className="px-3 py-1.5 rounded-gh text-sm text-white/80 hover:text-white hover:bg-gh-header-hover transition-colors"
                  >
                    {t('nav.docs')}
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="px-3 py-1.5 rounded-gh text-sm text-white/80 hover:text-white hover:bg-gh-header-hover transition-colors"
                  >
                    {t('nav.admin')}
                  </Link>
                )}
                {canBindXmoj && (
                  <Link
                    to="/xmoj-binding"
                    className="px-3 py-1.5 rounded-gh text-sm text-white/80 hover:text-white hover:bg-gh-header-hover transition-colors"
                  >
                    {t('nav.xmojBinding')}
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(prev => !prev)}
                  className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-white/30"
                  aria-label="User menu"
                >
                  <div className="h-8 w-8 rounded-full bg-gh-btn-primary text-white text-sm font-semibold flex items-center justify-center select-none">
                    {avatarLetter}
                  </div>
                  <svg className="h-4 w-4 text-white/60" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
                  </svg>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 z-20 rounded-gh border border-gh-border bg-white shadow-gh-overlay overflow-hidden">
                      <div className="border-b border-gh-border px-4 py-3">
                        <p className="text-xs text-gh-fg-muted">
                          {t('nav.signedInAs')}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-gh-fg truncate">{user?.email}</p>
                      </div>
                      <Link
                        to="/account-security"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gh-fg hover:bg-gh-canvas transition-colors"
                      >
                        <svg className="h-4 w-4 text-gh-fg-muted" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM8 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z"/>
                        </svg>
                        {t('nav.accountSecurity')}
                      </Link>
                      <div className="border-t border-gh-border">
                        <button
                          onClick={() => { setMenuOpen(false); logout(); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gh-fg hover:bg-gh-canvas transition-colors"
                        >
                          <svg className="h-4 w-4 text-gh-fg-muted" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 2.75C2 1.784 2.784 1 3.75 1h5.5a.75.75 0 010 1.5h-5.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h5.5a.75.75 0 010 1.5h-5.5A1.75 1.75 0 012 13.25V2.75zm10.44 4.5H6.75a.75.75 0 000 1.5h5.69l-1.97 1.97a.75.75 0 101.06 1.06l3.25-3.25a.75.75 0 000-1.06L11.53 5.22a.75.75 0 00-1.06 1.06l1.97 1.97z"/>
                          </svg>
                          {t('nav.logout')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-gh text-sm text-white/80 hover:text-white hover:bg-gh-header-hover transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-gh border border-white/20 text-sm text-white font-semibold hover:bg-gh-header-hover transition-colors"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

