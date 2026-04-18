import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import { ensurePasskeyForSensitiveAction } from '../utils/passkeyAction';

const SCOPE_OPTIONS = ['openid', 'profile', 'email', 'xmoj_profile', 'read', 'write'];

export function ApplicationsPage() {
  const { t } = useTranslation();
  const { user, setSession } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canManageApps = user?.role === 'merchant' || user?.role === 'admin';
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    creator_name: '',
    publisher_website: '',
    privacy_policy_url: '',
    children_policy_url: '',
    terms_of_service_url: '',
    is_official: false,
    redirect_uris: '',
    custom_scopes: '',
    scopes: ['openid', 'profile', 'email'],
  });
  const [error, setError] = useState('');
  const [createdApp, setCreatedApp] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, [user?.role]);

  const loadApplications = async () => {
    setLoading(true);
    setError('');
    try {
      if (isAdmin) {
        const data = await api.getAdminApplications({ limit: 100, offset: 0 });
        setApplications(data.applications as any[]);
      } else {
        const data = await api.getApplications();
        setApplications(data as any[]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.scopes.length === 0) {
      setError(t('applications.form.selectScopeRequired'));
      return;
    }

    try {
      if (user?.role === 'merchant' && user) {
        await ensurePasskeyForSensitiveAction({ user, setSession });
      }

      const scopedValues = user?.role === 'admin' && formData.custom_scopes.trim().length > 0
        ? formData.custom_scopes.split(',').map(s => s.trim()).filter(Boolean)
        : formData.scopes;

      const result = await api.createApplication({
        name: formData.name,
        description: formData.description || undefined,
        creator_name: formData.creator_name,
        publisher_website: formData.publisher_website || undefined,
        privacy_policy_url: formData.privacy_policy_url || undefined,
        children_policy_url: formData.children_policy_url || undefined,
        terms_of_service_url: formData.terms_of_service_url || undefined,
        is_official: user?.role === 'admin' ? formData.is_official : undefined,
        redirect_uris: formData.redirect_uris.split(',').map(s => s.trim()),
        scopes: scopedValues,
      });
      setCreatedApp(result);
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        creator_name: '',
        publisher_website: '',
        privacy_policy_url: '',
        children_policy_url: '',
        terms_of_service_url: '',
        is_official: false,
        redirect_uris: '',
        custom_scopes: '',
        scopes: ['openid', 'profile', 'email'],
      });
      loadApplications();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (user) {
        await ensurePasskeyForSensitiveAction({ user, setSession });
      }

      if (isAdmin) {
        await api.deleteAdminApplication(deleteConfirm);
      } else {
        await api.deleteApplication(deleteConfirm);
      }
      setDeleteConfirm(null);
      loadApplications();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleBlock = async (app: any) => {
    if (!isAdmin) {
      return;
    }

    try {
      if (app.is_blocked) {
        await api.updateAdminApplicationBlock(app.app_id, false);
      } else {
        const reason = window.prompt(t('applications.admin.blockReasonPrompt')) || undefined;
        await api.updateAdminApplicationBlock(app.app_id, true, reason);
      }
      await loadApplications();
    } catch (err: any) {
      setError(err.message || t('applications.admin.blockFailed'));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('applications.title')}</h1>
        {canManageApps && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold"
          >
            {showForm ? t('common.cancel') : t('applications.createNew')}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {canManageApps && createdApp && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-green-900">✓ {t('common.success')}!</h2>
            <button
              onClick={() => setCreatedApp(null)}
              className="text-green-700 hover:text-green-900"
            >
              ✕
            </button>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded mb-4">
            <p className="text-sm text-yellow-800 font-semibold">
              {t('applications.detail.secretWarning')}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.detail.clientId')}
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                  {createdApp.app_id}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(createdApp.app_id)}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {t('common.copy')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.detail.clientSecret')}
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                  {createdApp.app_secret}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(createdApp.app_secret)}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {t('common.copy')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {canManageApps && showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('applications.createNew')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="app-name" className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.form.name')}
              </label>
              <input
                id="app-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder={t('applications.form.namePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="app-description" className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.form.description')}
              </label>
              <textarea
                id="app-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('applications.form.descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="app-publisher-website" className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.form.publisherWebsite')}
              </label>
              <input
                id="app-publisher-website"
                type="url"
                value={formData.publisher_website}
                onChange={(e) => setFormData({ ...formData, publisher_website: e.target.value })}
                placeholder={t('applications.form.publisherWebsitePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="app-privacy-policy-url" className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.form.privacyPolicyUrl')}
              </label>
              <input
                id="app-privacy-policy-url"
                type="url"
                value={formData.privacy_policy_url}
                onChange={(e) => setFormData({ ...formData, privacy_policy_url: e.target.value })}
                placeholder={t('applications.form.privacyPolicyUrlPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="app-children-policy-url" className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.form.childrenPolicyUrl')}
              </label>
              <input
                id="app-children-policy-url"
                type="url"
                value={formData.children_policy_url}
                onChange={(e) => setFormData({ ...formData, children_policy_url: e.target.value })}
                placeholder={t('applications.form.childrenPolicyUrlPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="app-terms-of-service-url" className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.form.termsOfServiceUrl')}
              </label>
              <input
                id="app-terms-of-service-url"
                type="url"
                value={formData.terms_of_service_url}
                onChange={(e) => setFormData({ ...formData, terms_of_service_url: e.target.value })}
                placeholder={t('applications.form.termsOfServiceUrlPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="app-creator-name" className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.form.creatorName')}
              </label>
              <input
                id="app-creator-name"
                type="text"
                value={formData.creator_name}
                onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
                required
                placeholder={t('applications.form.creatorNamePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {user?.role === 'admin' && (
              <div className="flex items-center gap-2">
                <input
                  id="app-is-official"
                  type="checkbox"
                  checked={formData.is_official}
                  onChange={(e) => setFormData({ ...formData, is_official: e.target.checked })}
                />
                <label htmlFor="app-is-official" className="text-sm text-gray-700">
                  {t('applications.form.isOfficial')}
                </label>
              </div>
            )}

            <div>
              <label htmlFor="app-redirect-uris" className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.form.redirectUris')}
              </label>
              <input
                id="app-redirect-uris"
                type="text"
                value={formData.redirect_uris}
                onChange={(e) => setFormData({ ...formData, redirect_uris: e.target.value })}
                required
                placeholder={t('applications.form.redirectUrisPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.form.scopes')}
              </label>
              <div className="grid grid-cols-2 gap-2 border border-gray-300 rounded-md p-3">
                {SCOPE_OPTIONS.map(scope => (
                  <label key={scope} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope)}
                      onChange={(e) => {
                        const nextScopes = e.target.checked
                          ? [...formData.scopes, scope]
                          : formData.scopes.filter(s => s !== scope);
                        setFormData({ ...formData, scopes: nextScopes });
                      }}
                    />
                    <span>{t(`scopes.${scope}`)}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">{t('applications.form.scopesHelp')}</p>
            </div>

            {user?.role === 'admin' && (
              <div>
                <label htmlFor="app-custom-scopes" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('applications.form.customScopes')}
                </label>
                <input
                  id="app-custom-scopes"
                  type="text"
                  value={formData.custom_scopes}
                  onChange={(e) => setFormData({ ...formData, custom_scopes: e.target.value })}
                  placeholder={t('applications.form.customScopesPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold"
            >
              {t('applications.createNew')}
            </button>
          </form>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">
            {canManageApps ? t('applications.noApps') : t('applications.noPermission')}
          </p>
          {canManageApps && (
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('applications.createFirst')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {applications.map((app) => (
            <div key={app.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{app.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {app.is_official && (
                      <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        {t('applications.badges.official')}
                      </span>
                    )}
                    {app.validation_status === 'validated' && (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        {t('applications.badges.validated')}
                      </span>
                    )}
                    {app.validation_status === 'pending' && (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        {t('applications.badges.pendingValidation')}
                      </span>
                    )}
                  </div>
                  {app.description && (
                    <p className="text-gray-600 mt-1">{app.description}</p>
                  )}
                  {app.creator_name && (
                    <p className="text-xs text-gray-500 mt-2">
                      {t('applications.creator')}: {app.creator_name}
                    </p>
                  )}
                  {app.publisher_website && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t('applications.publisherWebsite')}: <a className="text-blue-600 hover:underline" href={app.publisher_website} target="_blank" rel="noreferrer">{app.publisher_website}</a>
                    </p>
                  )}
                  {isAdmin && app.is_blocked && (
                    <p className="text-xs text-red-600 mt-1">
                      {t('applications.admin.blocked')}: {app.blocked_reason || '-'}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/apps/${app.app_id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('applications.viewDetails')}
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={() => handleToggleBlock(app)}
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {app.is_blocked ? t('applications.admin.unblock') : t('applications.admin.block')}
                    </button>
                  )}
                  {canManageApps && (
                    <button
                      onClick={() => setDeleteConfirm(app.app_id)}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('applications.appId')}:</span>
                  <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{app.app_id}</code>
                </div>
                <div>
                  <span className="text-gray-500">{t('applications.created')}:</span>
                  <span className="ml-2">{new Date(app.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title={t('modal.deleteApp.title')}
        message={t('modal.deleteApp.message')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        variant="danger"
      />
    </div>
  );
}
