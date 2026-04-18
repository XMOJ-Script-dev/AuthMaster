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
    if (!user?.email) {
      return t('nav.account');
    }

    const name = user.email.split('@')[0];
    return name || user.email;
  }, [user?.email, t]);

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold">
            AuthMaster
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="hover:text-blue-200">
                  {t('nav.dashboard')}
                </Link>
                {canManageApps && (
                  <Link to="/apps" className="hover:text-blue-200">
                    {t('nav.applications')}
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin" className="hover:text-blue-200">
                    {t('nav.admin')}
                  </Link>
                )}
                {canBindXmoj && (
                  <Link to="/xmoj-binding" className="hover:text-blue-200">
                    {t('nav.xmojBinding')}
                  </Link>
                )}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(prev => !prev)}
                    className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded"
                  >
                    {displayName}
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white text-gray-800 rounded-md shadow-lg overflow-hidden z-20">
                      <Link
                        to="/change-password"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        {t('nav.changePassword')}
                      </Link>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-blue-200">
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded"
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}
