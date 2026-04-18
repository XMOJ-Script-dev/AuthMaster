import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

export function AuthorizePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authorizing, setAuthorizing] = useState(false);

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');
  const responseType = searchParams.get('response_type');

  useEffect(() => {
    if (!isAuthenticated) {
      // Save the authorization request and redirect to login
      sessionStorage.setItem('oauth_redirect', window.location.href);
      navigate('/login');
      return;
    }

    loadApplication();
  }, [isAuthenticated, clientId]);

  const loadApplication = async () => {
    if (!clientId) {
      setError(t('authorize.invalidClient'));
      setLoading(false);
      return;
    }

    try {
      const app = await api.getPublicApplication(clientId);
      setApplication(app);
    } catch (err: any) {
      setError(t('authorize.invalidClient'));
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    setAuthorizing(true);
    setError('');

    try {
      const result = await api.authorize({
        response_type: responseType || 'code',
        client_id: clientId!,
        redirect_uri: redirectUri!,
        scope: scope || '',
        state: state || '',
      }) as { redirect_uri: string };

      // Redirect to the application's callback URL
      window.location.href = result.redirect_uri;
    } catch (err: any) {
      if (err?.message === 'Only user accounts can authorize applications') {
        setError(t('authorize.merchantForbidden'));
      } else {
        setError(err.message);
      }
      setAuthorizing(false);
    }
  };

  const handleDeny = () => {
    if (redirectUri) {
      const url = new URL(redirectUri);
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('error_description', 'The user denied the request');
      if (state) {
        url.searchParams.set('state', state);
      }
      window.location.href = url.toString();
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('authorize.title')}</h2>
            <p className="text-gray-600 mb-6">{error || t('authorize.appNotFound')}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md"
            >
              {t('nav.dashboard')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const scopes = scope?.split(' ') || [];
  const getScopeLabel = (scopeName: string) => {
    const knownScopes = ['openid', 'profile', 'email', 'xmoj_profile', 'read', 'write'];
    if (knownScopes.includes(scopeName)) {
      return t(`scopes.${scopeName}`);
    }
    return t('authorize.customScope', { scope: scopeName });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-2xl font-bold text-gray-900">{application.name}</h1>
            <div className="mt-2 flex justify-center gap-2">
              {application.is_official && (
                <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  {t('applications.badges.official')}
                </span>
              )}
              {application.validation_status === 'validated' && (
                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  {t('applications.badges.validated')}
                </span>
              )}
            </div>
            {application.description && (
              <p className="text-sm text-gray-600 mt-1">{application.description}</p>
            )}
          </div>
        </div>

        {/* Authorization Card */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {t('authorize.title')}
            </h2>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{application.name}</span> {t('authorize.requesting')}
            </p>
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{user?.email}</span>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('authorize.permissions')}
            </h3>
            <ul className="space-y-2">
              {scopes.map((s, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-gray-700">{getScopeLabel(s)}</span>
                </li>
              ))}
              {scopes.length === 0 && (
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-gray-700">{t('scopes.openid')}</span>
                </li>
              )}
            </ul>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>{t('authorize.redirectingTo')}</strong>
                <br />
                <span className="font-mono break-all">{redirectUri}</span>
              </p>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
            <button
              onClick={handleDeny}
              disabled={authorizing}
              className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-2 px-4 rounded-md font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              {t('authorize.deny')}
            </button>
            <button
              onClick={handleAuthorize}
              disabled={authorizing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-semibold disabled:opacity-50"
            >
              {authorizing ? t('authorize.authorizing') : t('authorize.approve')}
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            {t('authorize.footer')}
          </p>
        </div>
      </div>
    </div>
  );
}
