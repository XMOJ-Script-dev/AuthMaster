import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

const SCOPE_OPTIONS = ['openid', 'profile', 'email', 'xmoj_profile', 'read', 'write'];

export function ApplicationDetailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [validationContent, setValidationContent] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    creator_name: '',
    publisher_website: '',
    privacy_policy_url: '',
    children_policy_url: '',
    terms_of_service_url: '',
    is_official: false,
    submission_note: '',
    redirect_uris: '',
    custom_scopes: '',
    scopes: ['openid', 'profile', 'email'] as string[],
  });
  const frontendBase = window.location.origin.replace(/\/$/, '');
  const backendBase = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
  const scopeParam = (application?.scopes || ['openid', 'profile', 'email']).join(' ');

  useEffect(() => {
    loadApplication();
  }, [appId]);

  const loadApplication = async () => {
    if (!appId) return;

    try {
      const data: any = await api.getApplication(appId);
      setApplication(data);
      setFormData({
        name: data.name || '',
        description: data.description || '',
        creator_name: data.creator_name || '',
        publisher_website: data.publisher_website || '',
        privacy_policy_url: data.privacy_policy_url || '',
        children_policy_url: data.children_policy_url || '',
        terms_of_service_url: data.terms_of_service_url || '',
        is_official: !!data.is_official,
        submission_note: '',
        redirect_uris: (data.redirect_uris || []).join(', '),
        custom_scopes: '',
        scopes: data.scopes || ['openid', 'profile', 'email'],
      });

      const requests = await api.getAppChangeRequests(appId);
      setChangeRequests(requests.requests || []);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.scopes.length === 0) {
      setError(t('applications.form.selectScopeRequired'));
      return;
    }

    setSaving(true);
    try {
      const scopedValues = isAdmin && formData.custom_scopes.trim().length > 0
        ? formData.custom_scopes.split(',').map(s => s.trim()).filter(Boolean)
        : formData.scopes;

      const updated = await api.updateApplication(appId!, {
        name: formData.name,
        description: formData.description || undefined,
        creator_name: formData.creator_name || undefined,
        publisher_website: formData.publisher_website || undefined,
        privacy_policy_url: formData.privacy_policy_url || undefined,
        children_policy_url: formData.children_policy_url || undefined,
        terms_of_service_url: formData.terms_of_service_url || undefined,
        is_official: isAdmin ? formData.is_official : undefined,
        submission_note: formData.submission_note || undefined,
        redirect_uris: formData.redirect_uris.split(',').map(s => s.trim()).filter(Boolean),
        scopes: scopedValues,
      });
      if ((updated as any).pending_review) {
        setError(t('applications.validation.updatePendingReview'));
      } else {
        setApplication(updated as any);
      }
      setEditing(false);
      await loadApplication();
    } catch (err: any) {
      setError(err.message || t('applications.detail.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const submitValidationRequest = async () => {
    if (!validationContent.trim()) {
      setError(t('applications.validation.contentRequired'));
      return;
    }

    try {
      await api.submitValidationRequest(appId!, validationContent.trim());
      setValidationContent('');
      await loadApplication();
    } catch (err: any) {
      setError(err.message || t('applications.validation.submitFailed'));
    }
  };

  const reviewValidation = async (status: 'validated' | 'rejected') => {
    try {
      await api.reviewAdminApplicationValidation(appId!, status, reviewNote || undefined);
      setReviewNote('');
      await loadApplication();
    } catch (err: any) {
      setError(err.message || t('applications.validation.reviewFailed'));
    }
  };

  const reviewChangeRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await api.reviewAdminAppChangeRequest(requestId, status, reviewNote || undefined);
      setReviewNote('');
      await loadApplication();
    } catch (err: any) {
      setError(err.message || t('applications.validation.reviewFailed'));
    }
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
        <div className="mt-3 flex flex-wrap gap-2">
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
          {application.validation_status === 'pending' && (
            <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
              {t('applications.badges.pendingValidation')}
            </span>
          )}
        </div>
        {application.description && (
          <p className="text-gray-600 mt-2">{application.description}</p>
        )}
        <div className="mt-4">
          <button
            onClick={() => setEditing(prev => !prev)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {editing ? t('common.cancel') : t('common.edit')}
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {editing && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('common.edit')}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="edit-app-name" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('applications.form.name')}
                </label>
                <input
                  id="edit-app-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="edit-app-description" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('applications.form.description')}
                </label>
                <textarea
                  id="edit-app-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="edit-app-publisher-website" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('applications.form.publisherWebsite')}
                </label>
                <input
                  id="edit-app-publisher-website"
                  type="url"
                  value={formData.publisher_website}
                  onChange={(e) => setFormData({ ...formData, publisher_website: e.target.value })}
                  placeholder={t('applications.form.publisherWebsitePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="edit-app-privacy-policy-url" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('applications.form.privacyPolicyUrl')}
                </label>
                <input
                  id="edit-app-privacy-policy-url"
                  type="url"
                  value={formData.privacy_policy_url}
                  onChange={(e) => setFormData({ ...formData, privacy_policy_url: e.target.value })}
                  placeholder={t('applications.form.privacyPolicyUrlPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="edit-app-children-policy-url" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('applications.form.childrenPolicyUrl')}
                </label>
                <input
                  id="edit-app-children-policy-url"
                  type="url"
                  value={formData.children_policy_url}
                  onChange={(e) => setFormData({ ...formData, children_policy_url: e.target.value })}
                  placeholder={t('applications.form.childrenPolicyUrlPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="edit-app-terms-of-service-url" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('applications.form.termsOfServiceUrl')}
                </label>
                <input
                  id="edit-app-terms-of-service-url"
                  type="url"
                  value={formData.terms_of_service_url}
                  onChange={(e) => setFormData({ ...formData, terms_of_service_url: e.target.value })}
                  placeholder={t('applications.form.termsOfServiceUrlPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="edit-app-creator-name" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('applications.form.creatorName')}
                </label>
                <input
                  id="edit-app-creator-name"
                  type="text"
                  value={formData.creator_name}
                  onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <input
                    id="edit-app-is-official"
                    type="checkbox"
                    checked={formData.is_official}
                    onChange={(e) => setFormData({ ...formData, is_official: e.target.checked })}
                  />
                  <label htmlFor="edit-app-is-official" className="text-sm text-gray-700">
                    {t('applications.form.isOfficial')}
                  </label>
                </div>
              )}

              <div>
                <label htmlFor="edit-app-redirect-uris" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('applications.form.redirectUris')}
                </label>
                <input
                  id="edit-app-redirect-uris"
                  type="text"
                  value={formData.redirect_uris}
                  onChange={(e) => setFormData({ ...formData, redirect_uris: e.target.value })}
                  required
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
              </div>

              {isAdmin && (
                <div>
                  <label htmlFor="edit-app-custom-scopes" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('applications.form.customScopes')}
                  </label>
                  <input
                    id="edit-app-custom-scopes"
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
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>

              {application.validation_status === 'validated' && !isAdmin && (
                <div>
                  <label htmlFor="edit-submission-note" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('applications.validation.submissionNote')}
                  </label>
                  <textarea
                    id="edit-submission-note"
                    value={formData.submission_note}
                    onChange={(e) => setFormData({ ...formData, submission_note: e.target.value })}
                    rows={2}
                    placeholder={t('applications.validation.submissionNotePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('applications.validation.title')}</h2>
          <p className="text-sm text-gray-600 mb-3">
            {t('applications.validation.currentStatus')}: {application.validation_status || 'unverified'}
          </p>

          {!isAdmin && (
            <div className="space-y-3">
              <textarea
                value={validationContent}
                onChange={(e) => setValidationContent(e.target.value)}
                rows={3}
                placeholder={t('applications.validation.contentPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={submitValidationRequest}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                {t('applications.validation.submit')}
              </button>
            </div>
          )}

          {isAdmin && application.validation_status === 'pending' && (
            <div className="space-y-3 mt-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.validation_submission || '-'}</p>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={2}
                placeholder={t('applications.validation.reviewNotePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => reviewValidation('validated')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {t('applications.validation.approve')}
                </button>
                <button
                  onClick={() => reviewValidation('rejected')}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  {t('applications.validation.reject')}
                </button>
              </div>
            </div>
          )}
        </div>

        {changeRequests.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('applications.validation.changeRequests')}</h2>
            <div className="space-y-4">
              {changeRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    {t('applications.validation.requestStatus')}: {request.status}
                  </p>
                  {request.submission_note && (
                    <p className="text-sm text-gray-700 mb-2">{request.submission_note}</p>
                  )}
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(request.payload, null, 2)}</pre>
                  {isAdmin && request.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => reviewChangeRequest(request.id, 'approved')}
                        className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        {t('applications.validation.approve')}
                      </button>
                      <button
                        onClick={() => reviewChangeRequest(request.id, 'rejected')}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        {t('applications.validation.reject')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
                {t('applications.creator')}
              </label>
              <p className="text-gray-900">{application.creator_name || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.publisherWebsite')}
              </label>
              {application.publisher_website ? (
                <a href={application.publisher_website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {application.publisher_website}
                </a>
              ) : (
                <p className="text-gray-900">-</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.privacyPolicy')}
              </label>
              {application.privacy_policy_url ? (
                <a href={application.privacy_policy_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {application.privacy_policy_url}
                </a>
              ) : (
                <p className="text-gray-900">-</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.childrenPolicy')}
              </label>
              {application.children_policy_url ? (
                <a href={application.children_policy_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {application.children_policy_url}
                </a>
              ) : (
                <p className="text-gray-900">-</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('applications.termsOfService')}
              </label>
              {application.terms_of_service_url ? (
                <a href={application.terms_of_service_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {application.terms_of_service_url}
                </a>
              ) : (
                <p className="text-gray-900">-</p>
              )}
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
                {frontendBase}/authorize?response_type=code&client_id={application.app_id}&redirect_uri={encodeURIComponent(application.redirect_uris[0])}&scope={encodeURIComponent(scopeParam)}&state=RANDOM_STATE
              </code>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. {t('applications.detail.tokenExchange')}</h3>
              <pre className="bg-gray-100 px-3 py-2 rounded text-sm overflow-x-auto">
{`curl -X POST ${backendBase}/oauth2/token \\
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
{`curl ${backendBase}/oauth2/userinfo \\
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
