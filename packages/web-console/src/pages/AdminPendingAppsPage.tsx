import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api, AdminApplicationListItem, AppChangeRequestItem } from '../api/client';

export function AdminPendingAppsPage() {
  const { t } = useTranslation();
  const [pendingApps, setPendingApps] = useState<AdminApplicationListItem[]>([]);
  const [pendingChanges, setPendingChanges] = useState<AppChangeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [apps, changes] = await Promise.all([
        api.getAdminApplications({ validation_status: 'pending', limit: 100, offset: 0 }),
        api.getAdminAppChangeRequests({ status: 'pending', limit: 100, offset: 0 }),
      ]);
      setPendingApps(apps.applications || []);
      setPendingChanges(changes.requests || []);
    } catch (err: any) {
      setError(err.message || t('admin.pending.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const reviewValidation = async (appId: string, status: 'validated' | 'rejected') => {
    try {
      const note = window.prompt(t('applications.validation.reviewNotePlaceholder')) || undefined;
      await api.reviewAdminApplicationValidation(appId, status, note);
      await loadData();
    } catch (err: any) {
      setError(err.message || t('applications.validation.reviewFailed'));
    }
  };

  const reviewChange = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const note = window.prompt(t('applications.validation.reviewNotePlaceholder')) || undefined;
      await api.reviewAdminAppChangeRequest(requestId, status, note);
      await loadData();
    } catch (err: any) {
      setError(err.message || t('applications.validation.reviewFailed'));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.pending.title')}</h1>
      <p className="text-gray-600 mb-6">{t('admin.pending.subtitle')}</p>

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      {loading ? (
        <p>{t('common.loading')}</p>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.pending.validationApps')}</h2>
            {pendingApps.length === 0 ? (
              <p className="text-gray-500">{t('admin.pending.empty')}</p>
            ) : (
              <div className="space-y-4">
                {pendingApps.map((app) => (
                  <div key={app.app_id} className="border border-gray-200 rounded p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">{app.name}</p>
                        <p className="text-sm text-gray-600">{app.owner_email}</p>
                        <p className="text-sm text-gray-600 mt-1">{t('applications.creator')}: {app.creator_name}</p>
                        <Link to={`/apps/${app.app_id}`} className="text-blue-600 text-sm hover:underline">
                          {t('applications.viewDetails')}
                        </Link>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => reviewValidation(app.app_id, 'validated')} className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                          {t('applications.validation.approve')}
                        </button>
                        <button onClick={() => reviewValidation(app.app_id, 'rejected')} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                          {t('applications.validation.reject')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.pending.changeRequests')}</h2>
            {pendingChanges.length === 0 ? (
              <p className="text-gray-500">{t('admin.pending.emptyChanges')}</p>
            ) : (
              <div className="space-y-4">
                {pendingChanges.map((req) => (
                  <div key={req.id} className="border border-gray-200 rounded p-4">
                    <p className="text-sm text-gray-700 mb-2">App: {req.app_id}</p>
                    {req.submission_note && <p className="text-sm text-gray-600 mb-2">{req.submission_note}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => reviewChange(req.id, 'approved')} className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        {t('applications.validation.approve')}
                      </button>
                      <button onClick={() => reviewChange(req.id, 'rejected')} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        {t('applications.validation.reject')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
