import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

export function AdminSystemSettingsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    allow_merchant_registration: true,
    merchant_registration_requires_review: false,
  });

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getAdminSystemSettings();
      setForm({
        allow_merchant_registration: result.settings.allow_merchant_registration,
        merchant_registration_requires_review: result.settings.merchant_registration_requires_review,
      });
    } catch (err: any) {
      setError(err.message || t('admin.settings.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateAdminSystemSettings(form);
      setSuccess(t('admin.settings.saveSuccess'));
    } catch (err: any) {
      setError(err.message || t('admin.settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.settings.title')}</h1>
      <p className="text-gray-600 mb-6">{t('admin.settings.subtitle')}</p>

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-green-700">{success}</div>}

      {loading ? (
        <p>{t('common.loading')}</p>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-start gap-3">
            <input
              id="allow-merchant-registration"
              type="checkbox"
              checked={form.allow_merchant_registration}
              onChange={(e) => setForm({ ...form, allow_merchant_registration: e.target.checked })}
              className="mt-1"
            />
            <div>
              <label htmlFor="allow-merchant-registration" className="font-semibold text-gray-900">
                {t('admin.settings.allowMerchantRegistration')}
              </label>
              <p className="text-sm text-gray-600 mt-1">{t('admin.settings.allowMerchantRegistrationHint')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="merchant-review-required"
              type="checkbox"
              checked={form.merchant_registration_requires_review}
              disabled={!form.allow_merchant_registration}
              onChange={(e) => setForm({ ...form, merchant_registration_requires_review: e.target.checked })}
              className="mt-1"
            />
            <div>
              <label htmlFor="merchant-review-required" className="font-semibold text-gray-900">
                {t('admin.settings.merchantReviewRequired')}
              </label>
              <p className="text-sm text-gray-600 mt-1">{t('admin.settings.merchantReviewRequiredHint')}</p>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      )}
    </div>
  );
}
