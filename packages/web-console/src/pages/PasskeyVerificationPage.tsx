import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startAuthentication } from '@simplewebauthn/browser';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { setPasskeyTrusted } from '../utils/passkey';
import { usePageTitle } from '../utils/usePageTitle';

type VerificationMethod = 'passkey' | 'totp';

export function PasskeyVerificationPage() {
  const { t } = useTranslation();
  usePageTitle(t('passkeyVerification.loginTitle'));
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setSession, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState<VerificationMethod>('passkey');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<{ passkey_count: number; totp_enabled: boolean } | null>(null);

  const mode = searchParams.get('mode') || 'login';
  const next = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    if (!isAuthenticated && mode === 'authorize') {
      sessionStorage.setItem('oauth_redirect', window.location.href);
      navigate('/login');
      return;
    }

    if (user?.email) {
      setEmail(user.email);
    } else {
      setEmail(searchParams.get('email') || '');
    }
  }, [isAuthenticated, mode, navigate, searchParams, user?.email]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const loadMfaStatus = async () => {
      try {
        const status = await api.getMFAStatus();
        setMfaStatus(status);
        setMethod(status.passkey_count > 0 ? 'passkey' : 'totp');
      } catch (err: any) {
        setError(err?.message || t('passkeyVerification.failed'));
      }
    };

    loadMfaStatus();
  }, [isAuthenticated, t]);

  const title = useMemo(() => {
    if (mode === 'authorize') {
      return t('passkeyVerification.authorizeTitle');
    }
    return t('passkeyVerification.loginTitle');
  }, [mode, t]);

  const subtitle = useMemo(() => {
    if (mode === 'authorize') {
      return t('passkeyVerification.authorizeSubtitle');
    }
    return t('passkeyVerification.loginSubtitle');
  }, [mode, t]);

  const handleVerify = async () => {
    setError('');
    setLoading(true);

    try {
      const verifyEmail = (email || user?.email || '').trim() || undefined;
      const options = await api.beginPasskeyLogin(verifyEmail);
      const credential = await startAuthentication({ optionsJSON: options.options as any });
      const result = await api.completePasskeyLogin({
        challenge_id: options.challenge_id,
        credential: credential as any,
      });

      setSession(result.user, result.token);
      setPasskeyTrusted(result.user.id);
      navigate(next, { replace: true });
    } catch (err: any) {
      setError(err?.message || t('passkeyVerification.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleTotpVerify = async () => {
    setError('');
    setLoading(true);

    try {
      await api.verifyTOTP(useRecoveryCode ? { recovery_code: recoveryCode } : { code: totpCode });
      if (user?.id) {
        setPasskeyTrusted(user.id);
      }
      navigate(next, { replace: true });
    } catch (err: any) {
      setError(err?.message || t('passkeyVerification.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white border border-gray-300 rounded-xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">AuthMaster</p>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-gray-900 text-white flex items-center justify-center text-lg font-semibold">
              🔑
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              <p className="text-xs text-gray-500 mt-2">
                {t('passkeyVerification.account')}: <span className="font-medium text-gray-700">{email || user?.email || '-'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-4">
          {mfaStatus && (mfaStatus.passkey_count > 0 || mfaStatus.totp_enabled) && (
            <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
              {mfaStatus.passkey_count > 0 && (
                <button
                  onClick={() => setMethod('passkey')}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${method === 'passkey' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                >
                  {t('passkeyVerification.usePasskey')}
                </button>
              )}
              {mfaStatus.totp_enabled && (
                <button
                  onClick={() => setMethod('totp')}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${method === 'totp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                >
                  {t('passkeyVerification.useTotp')}
                </button>
              )}
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2"><span className="text-green-700">✓</span><span>{method === 'totp' ? t('passkeyVerification.totpItem1') : t('passkeyVerification.item1')}</span></li>
              <li className="flex items-start gap-2"><span className="text-green-700">✓</span><span>{method === 'totp' ? t('passkeyVerification.totpItem2') : t('passkeyVerification.item2')}</span></li>
              <li className="flex items-start gap-2"><span className="text-green-700">✓</span><span>{method === 'totp' ? t('passkeyVerification.totpItem3') : t('passkeyVerification.item3')}</span></li>
            </ul>
          </div>

          {method === 'totp' && (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
              <label className="block text-sm font-medium text-gray-700">
                {useRecoveryCode ? t('passkeyVerification.recoveryCodeLabel') : t('passkeyVerification.totpCodeLabel')}
              </label>
              <input
                value={useRecoveryCode ? recoveryCode : totpCode}
                onChange={(e) => {
                  const v = e.target.value;
                  if (useRecoveryCode) {
                    setRecoveryCode(v);
                  } else {
                    const digits = v.replace(/\D+/g, '').slice(0, 6);
                    setTotpCode(digits);
                    if (digits.length === 6 && !loading) {
                      setTimeout(handleTotpVerify, 0);
                    }
                  }
                }}
                placeholder={useRecoveryCode ? t('passkeyVerification.recoveryCodePlaceholder') : t('passkeyVerification.totpCodePlaceholder')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                onClick={() => setUseRecoveryCode(prev => !prev)}
                type="button"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {useRecoveryCode ? t('passkeyVerification.useTotpInstead') : t('passkeyVerification.lostTotp')}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              {t('passkeyVerification.back')}
            </button>
            <button
              onClick={method === 'totp' ? handleTotpVerify : handleVerify}
              disabled={loading}
              className="flex-1 bg-gray-900 hover:bg-black text-white py-2 px-4 rounded-md font-semibold disabled:opacity-50"
            >
              {loading ? t('passkeyVerification.verifying') : method === 'totp' ? t('passkeyVerification.verifyTotp') : t('passkeyVerification.verify')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}