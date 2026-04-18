import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { api, AuthorizedAppItem } from '../api/client';

export function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [authorizedApps, setAuthorizedApps] = useState<AuthorizedAppItem[]>([]);
  const [xmojBound, setXmojBound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isMerchantView = user?.role === 'merchant' || user?.role === 'admin';

  const activeTokens = useMemo(
    () => authorizedApps.reduce((sum, app) => sum + (app.active_tokens || 0), 0),
    [authorizedApps]
  );

  useEffect(() => {
    if (isMerchantView) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [authResult, bindingResult] = await Promise.all([
          api.getMyAuthorizations(),
          api.getXmojBinding(),
        ]);
        setAuthorizedApps(authResult.authorizations || []);
        setXmojBound(!!bindingResult.binding);
      } catch (e: any) {
        setError(e?.message || t('dashboard.user.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isMerchantView, t]);

  const revokeAuthorization = async (appId: string) => {
    try {
      await api.revokeMyAuthorization(appId);
      setAuthorizedApps(prev => prev.filter(app => app.app_id !== appId));
    } catch (e: any) {
      setError(e?.message || t('dashboard.user.revokeFailed'));
    }
  };

  if (!isMerchantView) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('dashboard.title')}</h1>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium mb-2">{t('dashboard.user.stats.authorizedApps')}</h3>
            <p className="text-3xl font-bold text-gray-900">{authorizedApps.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium mb-2">{t('dashboard.user.stats.activeTokens')}</h3>
            <p className="text-3xl font-bold text-gray-900">{activeTokens}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium mb-2">{t('dashboard.user.stats.xmojBinding')}</h3>
            <p className="text-3xl font-bold text-gray-900">{xmojBound ? t('dashboard.user.bound') : t('dashboard.user.notBound')}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.user.authorizedAppsTitle')}</h2>
            <Link to="/xmoj-binding" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              {t('dashboard.user.manageXmoj')}
            </Link>
          </div>

          {loading ? (
            <p className="text-gray-500">{t('common.loading')}</p>
          ) : authorizedApps.length === 0 ? (
            <p className="text-gray-500">{t('dashboard.user.emptyAuthorizations')}</p>
          ) : (
            <div className="space-y-4">
              {authorizedApps.map(app => (
                <div key={app.app_id} className="rounded-md border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{app.app_name}</h3>
                      {app.app_description && <p className="text-sm text-gray-600 mt-1">{app.app_description}</p>}
                      <p className="text-xs text-gray-500 mt-2">
                        {t('dashboard.user.scope')}: {app.scope || '-'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('dashboard.user.activeTokenCount')}: {app.active_tokens}
                      </p>
                    </div>
                    <button
                      onClick={() => revokeAuthorization(app.app_id)}
                      className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100"
                    >
                      {t('dashboard.user.revokeAuthorization')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('dashboard.title')}</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">{t('dashboard.stats.totalApps')}</h3>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">{t('dashboard.stats.apiCalls')}</h3>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">{t('dashboard.stats.activeTokens')}</h3>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('dashboard.quickStart.title')}</h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">{t('dashboard.quickStart.step1.title')}</h4>
              <p className="text-gray-600">{t('dashboard.quickStart.step1.description')}</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">{t('dashboard.quickStart.step2.title')}</h4>
              <p className="text-gray-600">{t('dashboard.quickStart.step2.description')}</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              3
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">{t('dashboard.quickStart.step3.title')}</h4>
              <p className="text-gray-600">{t('dashboard.quickStart.step3.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
