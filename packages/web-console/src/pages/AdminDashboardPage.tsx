import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const [userTotal, setUserTotal] = useState(0);
  const [appTotal, setAppTotal] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [users, apps, logs] = await Promise.all([
          api.getAdminUsers({ limit: 1, offset: 0 }),
          api.getAdminApplications({ limit: 1, offset: 0 }),
          api.getAdminAuditLogs({ limit: 1, offset: 0 }),
        ]);

        setUserTotal(users.total || 0);
        setAppTotal(apps.total || 0);
        setAuditTotal(logs.total || 0);
      } catch (e: any) {
        setError(e?.message || t('admin.dashboard.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [t]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.dashboard.title')}</h1>
      <p className="text-gray-600 mb-8">{t('admin.dashboard.subtitle')}</p>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">{t('admin.dashboard.stats.totalUsers')}</h3>
          <p className="text-3xl font-bold text-gray-900">{loading ? '-' : userTotal}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">{t('admin.dashboard.stats.totalApps')}</h3>
          <p className="text-3xl font-bold text-gray-900">{loading ? '-' : appTotal}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">{t('admin.dashboard.stats.auditLogs')}</h3>
          <p className="text-3xl font-bold text-gray-900">{loading ? '-' : auditTotal}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.dashboard.quickActions.title')}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link
            to="/apps"
            className="rounded-md border border-gray-200 px-4 py-3 hover:border-blue-500 hover:bg-blue-50"
          >
            <p className="font-semibold text-gray-900">{t('admin.dashboard.quickActions.manageApps')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('admin.dashboard.quickActions.manageAppsHint')}</p>
          </Link>
          <Link
            to="/admin/pending-apps"
            className="rounded-md border border-gray-200 px-4 py-3 hover:border-blue-500 hover:bg-blue-50"
          >
            <p className="font-semibold text-gray-900">{t('admin.dashboard.quickActions.pendingApps')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('admin.dashboard.quickActions.pendingAppsHint')}</p>
          </Link>
          <Link
            to="/admin/users"
            className="rounded-md border border-gray-200 px-4 py-3 hover:border-blue-500 hover:bg-blue-50"
          >
            <p className="font-semibold text-gray-900">{t('admin.dashboard.quickActions.manageUsers')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('admin.dashboard.quickActions.manageUsersHint')}</p>
          </Link>
          <Link
            to="/admin/settings"
            className="rounded-md border border-gray-200 px-4 py-3 hover:border-blue-500 hover:bg-blue-50"
          >
            <p className="font-semibold text-gray-900">{t('admin.dashboard.quickActions.systemSettings')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('admin.dashboard.quickActions.systemSettingsHint')}</p>
          </Link>
          <Link
            to="/dashboard"
            className="rounded-md border border-gray-200 px-4 py-3 hover:border-blue-500 hover:bg-blue-50"
          >
            <p className="font-semibold text-gray-900">{t('admin.dashboard.quickActions.refreshStats')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('admin.dashboard.quickActions.refreshStatsHint')}</p>
          </Link>
          <Link
            to="/change-password"
            className="rounded-md border border-gray-200 px-4 py-3 hover:border-blue-500 hover:bg-blue-50"
          >
            <p className="font-semibold text-gray-900">{t('admin.dashboard.quickActions.accountSecurity')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('admin.dashboard.quickActions.accountSecurityHint')}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
