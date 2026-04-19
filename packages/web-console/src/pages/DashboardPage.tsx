import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { api, AuthorizedAppItem } from '../api/client';
import { usePageTitle } from '../utils/usePageTitle';

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-gh border border-gh-border bg-white p-5 shadow-gh-sm">
      <p className="text-xs font-medium text-gh-fg-muted uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gh-fg">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  usePageTitle(t('nav.dashboard'));
  const [authorizedApps, setAuthorizedApps] = useState<AuthorizedAppItem[]>([]);
  const [xmojBound, setXmojBound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';
  const isMerchantView = user?.role === 'merchant';

  const activeTokens = useMemo(
    () => authorizedApps.reduce((sum, app) => sum + (app.active_tokens || 0), 0),
    [authorizedApps]
  );

  useEffect(() => {
    if (isMerchantView || isAdmin) return;

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
  }, [isMerchantView, isAdmin, t]);

  const revokeAuthorization = async (appId: string) => {
    try {
      await api.revokeMyAuthorization(appId);
      setAuthorizedApps(prev => prev.filter(app => app.app_id !== appId));
    } catch (e: any) {
      setError(e?.message || t('dashboard.user.revokeFailed'));
    }
  };

  const errorBanner = error && (
    <div className="mb-4 rounded-gh border border-gh-danger-border bg-gh-danger-subtle px-3 py-2 text-sm text-gh-danger">
      {error}
    </div>
  );

  if (isAdmin) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gh-fg">{t('dashboard.admin.title')}</h1>
          <p className="mt-1 text-sm text-gh-fg-muted">{t('dashboard.admin.subtitle')}</p>
        </div>
        <Link
          to="/admin"
          className="inline-flex items-center rounded-gh border border-gh-btn-primary-border bg-gh-btn-primary px-4 py-1.5 text-sm font-semibold text-white shadow-gh-sm hover:bg-gh-btn-primary-hover transition-colors"
        >
          {t('dashboard.admin.enterConsole')}
        </Link>
      </div>
    );
  }

  if (!isMerchantView) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gh-fg">{t('dashboard.title')}</h1>
        </div>

        {errorBanner}

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <StatCard label={t('dashboard.user.stats.authorizedApps')} value={authorizedApps.length} />
          <StatCard label={t('dashboard.user.stats.activeTokens')} value={activeTokens} />
          <StatCard
            label={t('dashboard.user.stats.xmojBinding')}
            value={
              <span className={xmojBound ? 'text-gh-btn-primary' : 'text-gh-fg-muted'}>
                {xmojBound ? t('dashboard.user.bound') : t('dashboard.user.notBound')}
              </span>
            }
          />
        </div>

        <div className="rounded-gh border border-gh-border bg-white shadow-gh-sm">
          <div className="flex items-center justify-between border-b border-gh-border px-4 py-3">
            <h2 className="text-sm font-semibold text-gh-fg">{t('dashboard.user.authorizedAppsTitle')}</h2>
            <Link to="/xmoj-binding" className="text-xs font-medium text-gh-accent hover:underline">
              {t('dashboard.user.manageXmoj')}
            </Link>
          </div>

          {loading ? (
            <p className="px-4 py-6 text-sm text-gh-fg-muted">{t('common.loading')}</p>
          ) : authorizedApps.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gh-fg-muted">{t('dashboard.user.emptyAuthorizations')}</p>
          ) : (
            <ul>
              {authorizedApps.map((app, i) => (
                <li
                  key={app.app_id}
                  className={`flex items-start justify-between gap-4 px-4 py-4 ${i !== 0 ? 'border-t border-gh-border' : ''}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gh-fg">{app.app_name}</p>
                    {app.app_description && (
                      <p className="mt-0.5 text-xs text-gh-fg-muted">{app.app_description}</p>
                    )}
                    <p className="mt-1 text-xs text-gh-fg-subtle">
                      {t('dashboard.user.scope')}: {app.scope || '-'} &nbsp;·&nbsp;
                      {t('dashboard.user.activeTokenCount')}: {app.active_tokens}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeAuthorization(app.app_id)}
                    className="shrink-0 rounded-gh border border-gh-danger-border bg-gh-danger-subtle px-3 py-1 text-xs font-medium text-gh-danger hover:bg-red-100 transition-colors"
                  >
                    {t('dashboard.user.revokeAuthorization')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // Merchant view
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gh-fg">{t('dashboard.title')}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard label={t('dashboard.stats.totalApps')} value={0} />
        <StatCard label={t('dashboard.stats.apiCalls')} value={0} />
        <StatCard label={t('dashboard.stats.activeTokens')} value={0} />
      </div>

      <div className="rounded-gh border border-gh-border bg-white shadow-gh-sm">
        <div className="border-b border-gh-border px-4 py-3">
          <h2 className="text-sm font-semibold text-gh-fg">{t('dashboard.quickStart.title')}</h2>
        </div>
        <div className="divide-y divide-gh-border">
          {[1, 2, 3].map(step => (
            <div key={step} className="flex gap-4 px-4 py-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gh-btn-primary text-xs font-semibold text-white">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-gh-fg">{t(`dashboard.quickStart.step${step}.title`)}</p>
                <p className="mt-0.5 text-xs text-gh-fg-muted">{t(`dashboard.quickStart.step${step}.description`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

