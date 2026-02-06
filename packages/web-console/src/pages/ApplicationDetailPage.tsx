import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { ConfirmModal } from '../components/ConfirmModal';

export function ApplicationDetailPage() {
  const { t } = useTranslation();
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadApplication();
  }, [appId]);

  const loadApplication = async () => {
    if (!appId) return;

    try {
      const data = await api.getApplication(appId);
      setApplication(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await api.deleteApplication(appId!);
      navigate('/apps');
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error || t('authorize.appNotFound')}
        </div>
        <Link to="/apps" className="text-blue-600 hover:text-blue-700">
          ← {t('common.back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/apps" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← {t('common.back')}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{application.name}</h1>
        {application.description && (
          <p className="text-gray-600 mt-2">{application.description}</p>
        )}
      </div>

      <div className="grid gap-6">
        {/* Credentials */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('applications.detail.credentials')}</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.detail.clientId')}
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm">
                  {application.app_id}
                </code>
                <button
                  onClick={() => handleCopy(application.app_id)}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {t('common.copy')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.detail.clientSecret')}
              </label>
              <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded mb-2">
                <p className="text-sm text-yellow-800">
                  {t('applications.detail.secretWarning')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm">
                  {showSecret ? 'secret_••••••••••••••••' : '••••••••••••••••••••••••••••••••'}
                </code>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  {showSecret ? t('applications.detail.hide') : t('applications.detail.show')}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {t('applications.detail.secretNote')}
              </p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('applications.detail.configuration')}</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.detail.redirectUris')}
              </label>
              <ul className="space-y-2">
                {application.redirect_uris.map((uri: string, index: number) => (
                  <li key={index} className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm">
                      {uri}
                    </code>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.detail.allowedScopes')}
              </label>
              <div className="flex flex-wrap gap-2">
                {application.scopes.map((scope: string, index: number) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.created')}
              </label>
              <p className="text-gray-900">
                {new Date(application.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Integration Guide */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('applications.detail.integrationGuide')}</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. {t('applications.detail.authUrl')}</h3>
              <code className="block bg-gray-100 px-3 py-2 rounded text-sm overflow-x-auto">
                http://localhost:3000/authorize?response_type=code&client_id={application.app_id}&redirect_uri={encodeURIComponent(application.redirect_uris[0])}&scope=openid+profile+email&state=RANDOM_STATE
              </code>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. {t('applications.detail.tokenExchange')}</h3>
              <pre className="bg-gray-100 px-3 py-2 rounded text-sm overflow-x-auto">
{`curl -X POST http://localhost:8787/oauth2/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTHORIZATION_CODE",
    "redirect_uri": "${application.redirect_uris[0]}",
    "client_id": "${application.app_id}",
    "client_secret": "YOUR_CLIENT_SECRET"
  }'`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">3. {t('applications.detail.getUserInfo')}</h3>
              <pre className="bg-gray-100 px-3 py-2 rounded text-sm overflow-x-auto">
{`curl http://localhost:8787/oauth2/userinfo \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('applications.detail.dangerZone')}</h2>
          
          <div className="border border-red-200 rounded p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900">{t('applications.detail.deleteApp')}</h3>
              <p className="text-sm text-gray-600">
                {t('applications.detail.deleteWarning')}
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? t('applications.detail.deleting') : t('applications.detail.deleteApp')}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showCopied && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{t('common.copied')}</span>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={t('modal.deleteApp.title')}
        message={t('modal.deleteApp.message')}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />
    </div>
  );
}
