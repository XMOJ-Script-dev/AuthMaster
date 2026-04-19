import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { startRegistration } from '@simplewebauthn/browser';
import QRCode from 'qrcode';
import { api, MFAStatusResponse, PasskeyItem, TOTPSetupResponse } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { clearPasskeyTrusted, isPasskeyTrusted } from '../utils/passkey';
import { usePageTitle } from '../utils/usePageTitle';

export function AccountSecurityPage() {
  const { t } = useTranslation();
  usePageTitle(t('nav.accountSecurity'));
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingPasskeyAction, setLoadingPasskeyAction] = useState(false);
  const [trustedOnThisDevice, setTrustedOnThisDevice] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<MFAStatusResponse | null>(null);
  const [totpSetup, setTotpSetup] = useState<TOTPSetupResponse | null>(null);
  const [totpSetupCode, setTotpSetupCode] = useState('');
  const [totpQrDataUrl, setTotpQrDataUrl] = useState('');
  const [visibleRecoveryCodes, setVisibleRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    void Promise.all([loadPasskeys(), loadMfaStatus()]);
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

  const loadMfaStatus = async () => {
    try {
      const result = await api.getMFAStatus();
      setMfaStatus(result);
    } catch (err: any) {
      setError(err?.message || t('profile.authenticator.loadFailed'));
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
      await Promise.all([loadPasskeys(), loadMfaStatus()]);
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
      await Promise.all([loadPasskeys(), loadMfaStatus()]);
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
      await Promise.all([loadPasskeys(), loadMfaStatus()]);
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

  const handleBeginTotpSetup = async () => {
    setError('');
    setSuccess('');
    setLoadingPasskeyAction(true);

    try {
      const setup = await api.beginTOTPSetup();
      setTotpSetup(setup);
      setVisibleRecoveryCodes(setup.recovery_codes);
      setTotpSetupCode('');
      setTotpQrDataUrl(await QRCode.toDataURL(setup.otpauth_url, { width: 220, margin: 1 }));
    } catch (err: any) {
      setError(err?.message || t('profile.authenticator.setupFailed'));
    } finally {
      setLoadingPasskeyAction(false);
    }
  };

  const handleEnableTotp = async () => {
    if (!totpSetup) {
      return;
    }

    setError('');
    setSuccess('');
    setLoadingPasskeyAction(true);

    try {
      const result = await api.enableTOTP({
        setup_id: totpSetup.setup_id,
        code: totpSetupCode,
      });
      setMfaStatus(result);
      setTotpSetup(null);
      setTotpSetupCode('');
      setSuccess(t('profile.authenticator.enableSuccess'));
    } catch (err: any) {
      setError(err?.message || t('profile.authenticator.enableFailed'));
    } finally {
      setLoadingPasskeyAction(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!window.confirm(t('profile.authenticator.disableConfirm'))) {
      return;
    }

    setError('');
    setSuccess('');
    setLoadingPasskeyAction(true);

    try {
      const result = await api.disableTOTP();
      setMfaStatus(result);
      setVisibleRecoveryCodes([]);
      setSuccess(t('profile.authenticator.disableSuccess'));
    } catch (err: any) {
      setError(err?.message || t('profile.authenticator.disableFailed'));
    } finally {
      setLoadingPasskeyAction(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    const code = window.prompt(t('profile.authenticator.regeneratePrompt'))?.trim();
    if (!code) {
      return;
    }

    setError('');
    setSuccess('');
    setLoadingPasskeyAction(true);

    try {
      const result = await api.regenerateRecoveryCodes(code.includes('-') ? { recovery_code: code } : { code });
      setVisibleRecoveryCodes(result.recovery_codes);
      await loadMfaStatus();
      setSuccess(t('profile.authenticator.recoveryRegenerated'));
    } catch (err: any) {
      setError(err?.message || t('profile.authenticator.recoveryRegenerateFailed'));
    } finally {
      setLoadingPasskeyAction(false);
    }
  };

  const recoveryCodesText = visibleRecoveryCodes.join('\n');

  const copyRecoveryCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodesText);
    setSuccess(t('profile.authenticator.recoveryCopied'));
  };

  const downloadRecoveryCodes = () => {
    const blob = new Blob([recoveryCodesText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'authmaster-recovery-codes.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const printRecoveryCodes = () => {
    const printWindow = window.open('', '_blank', 'width=640,height=720');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`<pre style="font:16px monospace;padding:24px;">${recoveryCodesText}</pre>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('profile.authenticator.title')}</h2>
              <p className="text-sm text-gray-500">{t('profile.authenticator.subtitle')}</p>
            </div>
            {mfaStatus?.totp_enabled ? (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                {t('profile.authenticator.enabled')}
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {t('profile.authenticator.disabled')}
              </span>
            )}
          </div>

          {!mfaStatus?.totp_enabled && !totpSetup && (
            <button
              onClick={handleBeginTotpSetup}
              disabled={loadingPasskeyAction}
              className="rounded-md bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-black disabled:opacity-50"
            >
              {t('profile.authenticator.setup')}
            </button>
          )}

          {totpSetup && (
            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div>
                {totpQrDataUrl && <img src={totpQrDataUrl} alt={t('profile.authenticator.qrAlt')} className="rounded-lg border border-gray-200 bg-white p-3" />}
              </div>
              <div className="space-y-4">
                <p className="text-sm text-gray-700">{t('profile.authenticator.scanHint')}</p>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('profile.authenticator.manualKey')}</p>
                  <code className="block rounded-md bg-white px-3 py-2 text-sm text-gray-800 border border-gray-200 break-all">{totpSetup.secret}</code>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.authenticator.codeLabel')}</label>
                  <input
                    value={totpSetupCode}
                    onChange={(e) => setTotpSetupCode(e.target.value.replace(/\D+/g, '').slice(0, 6))}
                    placeholder={t('profile.authenticator.codePlaceholder')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleEnableTotp}
                    disabled={loadingPasskeyAction || totpSetupCode.length !== 6}
                    className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {t('profile.authenticator.confirmSetup')}
                  </button>
                  <button
                    onClick={() => setTotpSetup(null)}
                    disabled={loadingPasskeyAction}
                    className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-white disabled:opacity-50"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {mfaStatus?.totp_enabled && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-gray-600">
                {t('profile.authenticator.recoveryRemaining')}: <span className="font-semibold text-gray-900">{mfaStatus.recovery_codes_remaining}</span>
              </p>
              <button
                onClick={handleRegenerateRecoveryCodes}
                disabled={loadingPasskeyAction}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('profile.authenticator.regenerateRecoveryCodes')}
              </button>
              <button
                onClick={handleDisableTotp}
                disabled={loadingPasskeyAction}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t('profile.authenticator.disable')}
              </button>
            </div>
          )}

          {visibleRecoveryCodes.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-amber-900">{t('profile.authenticator.recoveryCodesTitle')}</h3>
                  <p className="text-sm text-amber-800">{t('profile.authenticator.recoveryCodesHint')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={copyRecoveryCodes} className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">{t('profile.authenticator.copyRecoveryCodes')}</button>
                  <button onClick={downloadRecoveryCodes} className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">{t('profile.authenticator.downloadRecoveryCodes')}</button>
                  <button onClick={printRecoveryCodes} className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">{t('profile.authenticator.printRecoveryCodes')}</button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {visibleRecoveryCodes.map((code) => (
                  <code key={code} className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800">{code}</code>
                ))}
              </div>
            </div>
          )}
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