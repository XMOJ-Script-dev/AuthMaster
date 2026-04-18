import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { startRegistration } from '@simplewebauthn/browser';
import { api, PasskeyItem } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { clearPasskeyTrusted, isPasskeyTrusted } from '../utils/passkey';

export function AccountSecurityPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingPasskeyAction, setLoadingPasskeyAction] = useState(false);
  const [trustedOnThisDevice, setTrustedOnThisDevice] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPasskeys();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setTrustedOnThisDevice(false);
      return;
    }

    setTrustedOnThisDevice(isPasskeyTrusted(user.id));
  }, [user?.id]);

  const loadPasskeys = async () => {
    setLoadingPasskeys(true);
    try {
      const result = await api.getPasskeys();
      setPasskeys(result.passkeys || []);
    } catch (err: any) {
      setError(err?.message || t('profile.passkeys.loadFailed'));
    } finally {
      setLoadingPasskeys(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('profile.changePassword.passwordMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('profile.changePassword.passwordTooShort'));
      return;
    }

    setLoadingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess(t('profile.changePassword.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || t('profile.changePassword.failed'));
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleAddPasskey = async () => {
    setError('');
    setSuccess('');
    setLoadingPasskeyAction(true);

    try {
      const name = window.prompt(t('profile.passkeys.addPrompt'))?.trim();
      if (!name) {
        setLoadingPasskeyAction(false);
        return;
      }

      const options = await api.beginPasskeyRegistration();
      const credential = await startRegistration({ optionsJSON: options.options as any });
      await api.completePasskeyRegistration({
        challenge_id: options.challenge_id,
        credential: credential as any,
        name,
      });

      setSuccess(t('profile.passkeys.addSuccess'));
      await loadPasskeys();
    } catch (err: any) {
      setError(err?.message || t('profile.passkeys.addFailed'));
    } finally {
      setLoadingPasskeyAction(false);
    }
  };

  const handleRenamePasskey = async (passkey: PasskeyItem) => {
    const nextName = window.prompt(t('profile.passkeys.renamePrompt'), passkey.name)?.trim();
    if (!nextName || nextName === passkey.name) {
      return;
    }

    setError('');
    setSuccess('');
    setLoadingPasskeyAction(true);

    try {
      await api.updatePasskey(passkey.id, nextName);
      setSuccess(t('profile.passkeys.renameSuccess'));
      await loadPasskeys();
    } catch (err: any) {
      setError(err?.message || t('profile.passkeys.renameFailed'));
    } finally {
      setLoadingPasskeyAction(false);
    }
  };

  const handleDeletePasskey = async (passkey: PasskeyItem) => {
    if (!window.confirm(t('profile.passkeys.revokeConfirm'))) {
      return;
    }

    setError('');
    setSuccess('');
    setLoadingPasskeyAction(true);

    try {
      await api.deletePasskey(passkey.id);
      setSuccess(t('profile.passkeys.revokeSuccess'));
      await loadPasskeys();
    } catch (err: any) {
      setError(err?.message || t('profile.passkeys.revokeFailed'));
    } finally {
      setLoadingPasskeyAction(false);
    }
  };

  const handleRevokeDeviceVerification = () => {
    if (!user?.id) {
      return;
    }

    clearPasskeyTrusted(user.id);
    setTrustedOnThisDevice(false);
    setSuccess(t('profile.security.deviceVerificationRevoked'));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('profile.security.title')}</h1>
      <p className="text-gray-600 mb-8">{t('profile.security.subtitle')}</p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handlePasswordSubmit} className="space-y-5 bg-white rounded-lg shadow p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('profile.changePassword.title')}</h2>
            <p className="text-sm text-gray-500">{t('profile.security.passwordHint')}</p>
          </div>

          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.changePassword.currentPassword')}
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.changePassword.newPassword')}
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.changePassword.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loadingPassword}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingPassword ? t('profile.changePassword.submitting') : t('profile.changePassword.submit')}
          </button>
        </form>

        <section className="space-y-5 bg-white rounded-lg shadow p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('profile.passkeys.title')}</h2>
            <p className="text-sm text-gray-500">{t('profile.passkeys.subtitle')}</p>
          </div>

          <button
            onClick={handleAddPasskey}
            disabled={loadingPasskeyAction}
            className="w-full bg-gray-900 hover:bg-black text-white py-2 px-4 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingPasskeyAction ? t('common.loading') : t('profile.passkeys.add')}
          </button>

          <div className="space-y-3">
            {loadingPasskeys ? (
              <p className="text-sm text-gray-500">{t('common.loading')}</p>
            ) : passkeys.length === 0 ? (
              <p className="text-sm text-gray-500">{t('profile.passkeys.empty')}</p>
            ) : (
              passkeys.map((passkey) => (
                <div key={passkey.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{passkey.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('profile.passkeys.deviceType')}: {t(`profile.passkeys.deviceTypes.${passkey.device_type}`)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('profile.passkeys.backedUp')}: {passkey.backed_up ? t('profile.passkeys.yes') : t('profile.passkeys.no')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRenamePasskey(passkey)}
                        disabled={loadingPasskeyAction}
                        className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 disabled:opacity-50"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDeletePasskey(passkey)}
                        disabled={loadingPasskeyAction}
                        className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50"
                      >
                        {t('profile.passkeys.revoke')}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    {t('profile.passkeys.lastUsed')}: {passkey.last_used_at ? new Date(passkey.last_used_at).toLocaleString() : t('profile.passkeys.neverUsed')}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-5 bg-white rounded-lg shadow p-6 lg:col-span-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('profile.security.deviceVerificationTitle')}</h2>
            <p className="text-sm text-gray-500">{t('profile.security.deviceVerificationHint')}</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-700">
              {t('profile.security.deviceVerificationStatus')}: {trustedOnThisDevice ? t('profile.passkeys.yes') : t('profile.passkeys.no')}
            </p>
            <button
              onClick={handleRevokeDeviceVerification}
              disabled={!trustedOnThisDevice}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('profile.security.revokeDeviceVerification')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}