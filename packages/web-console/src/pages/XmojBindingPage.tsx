import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { ensurePasskeyForSensitiveAction } from '../utils/passkeyAction';

function generateBookmarklet(dest: string, loginRequiredText: string): string {
  const code =
    '(function(){' +
    'var s=(document.cookie.match(/(?:^|;\\s*)PHPSESSID=([^;]+)/)||[])[1]||"";' +
    'var el=document.querySelector("a[href*=\\"userinfo.php?user=\\"],#profile");' +
    'var n=el?el.textContent.trim():"";' +
    'if(!s||!n){alert(' + JSON.stringify(loginRequiredText) + ');}' +
    'else{location.href=' +
    JSON.stringify(dest) +
    '+"#session="+encodeURIComponent(n)+":"+encodeURIComponent(s);}' +
    '})();';

  return `javascript:${code}`;
}

function parseSessionHash(hash: string): { username: string; phpsessid: string } | null {
  if (!hash.startsWith('#session=')) {
    return null;
  }

  const raw = decodeURIComponent(hash.slice('#session='.length));
  const idx = raw.indexOf(':');
  if (idx < 1) {
    return null;
  }

  const username = raw.slice(0, idx).trim();
  const phpsessid = raw.slice(idx + 1).trim();
  if (!username || !phpsessid) {
    return null;
  }

  return { username, phpsessid };
}

export function XmojBindingPage() {
  const { t } = useTranslation();
  const { user, setSession } = useAuth();
  const isDesktop =
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer:fine)').matches &&
    !/Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [xmojUsername, setXmojUsername] = useState('');
  const [phpsessid, setPhpsessid] = useState('');
  const [method, setMethod] = useState<'bookmark' | 'manual'>(isDesktop ? 'bookmark' : 'manual');
  const [binding, setBinding] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingHashSession, setPendingHashSession] = useState<{ username: string; phpsessid: string } | null>(null);
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);
  const callbackUrl = `${window.location.origin}/xmoj-binding`;
  const bookmarklet = generateBookmarklet(callbackUrl, t('xmoj.bookmarkLoginRequired'));

  useEffect(() => {
    load();

    const sessionFromHash = parseSessionHash(window.location.hash);
    if (sessionFromHash) {
      setXmojUsername(sessionFromHash.username);
      setPhpsessid(sessionFromHash.phpsessid);
      setSuccess(t('xmoj.autoFillDetected', { username: sessionFromHash.username }));
      setPendingHashSession(sessionFromHash);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!pendingHashSession) {
      return;
    }

    if (loading || submitting) {
      return;
    }

    setSuccess(t('xmoj.autoBinding'));
    bindWithValues(pendingHashSession.username, pendingHashSession.phpsessid);
    setPendingHashSession(null);
  }, [pendingHashSession, loading, submitting]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getXmojBinding();
      setBinding(result.binding);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const bindWithValues = async (username: string, sessid: string) => {
    setSubmitting(true);
    setError('');
    setSuccess('');

    const normalizedUsername = username.trim();
    const normalizedSessid = sessid.trim();

    if (!normalizedUsername) {
      setError(t('xmoj.usernameRequired'));
      setSubmitting(false);
      return;
    }

    try {
      const result = await api.bindXmoj({
        xmoj_username: normalizedUsername,
        phpsessid: normalizedSessid,
        bind_method: method,
      });
      setBinding(result.binding);
      setXmojUsername('');
      setPhpsessid('');
      setSuccess(t('xmoj.bindSuccess', { username: result.binding.xmoj_username }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const bind = async () => {
    await bindWithValues(xmojUsername, phpsessid);
  };

  const copyBookmarklet = async () => {
    try {
      await navigator.clipboard.writeText(bookmarklet);
      setSuccess(t('xmoj.bookmarkCopied'));
    } catch {
      setError(t('xmoj.bookmarkCopyFailed'));
    }
  };

  const unbind = async () => {
    setShowUnbindConfirm(false);
    setSubmitting(true);
    setError('');
    try {
      if (user) {
        await ensurePasskeyForSensitiveAction({ user, setSession });
      }

      await api.unbindXmoj();
      setBinding(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'user') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          {t('xmoj.onlyUserCanBind')}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('xmoj.title')}</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">{t('xmoj.currentBinding')}</h2>
        {binding ? (
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">{t('xmoj.username')}:</span> {binding.xmoj_username}</p>
            <p><span className="text-gray-500">{t('xmoj.userId')}:</span> {binding.xmoj_user_id}</p>
            <p><span className="text-gray-500">{t('xmoj.method')}:</span> {binding.bind_method}</p>
            <button
              onClick={() => setShowUnbindConfirm(true)}
              disabled={submitting}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {t('xmoj.unbind')}
            </button>
          </div>
        ) : (
          <p className="text-gray-600">{t('xmoj.notBound')}</p>
        )}
      </div>

      {!binding && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">{t('xmoj.bindNow')}</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('xmoj.methodSelect')}</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={method === 'bookmark'}
                onChange={() => setMethod('bookmark')}
              />
              {t('xmoj.bookmarkMethod')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={method === 'manual'}
                onChange={() => setMethod('manual')}
              />
              {t('xmoj.manualMethod')}
            </label>
          </div>
          {!isDesktop && (
            <p className="text-xs text-gray-500 mt-2">{t('xmoj.mobileBookmarkHint')}</p>
          )}
        </div>

        {method === 'bookmark' && (
          <div className="space-y-4 mb-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">{t('xmoj.bookmarkStepTitle')}</h3>
              <p className="text-xs text-blue-700 mb-3">{t('xmoj.bookmarkHelp')}</p>

              <div className="flex flex-wrap items-start gap-2 mb-3">
                <a
                  href={bookmarklet}
                  draggable
                  onClick={(e) => e.preventDefault()}
                  className="px-3 py-2 bg-white border border-blue-300 text-blue-800 rounded hover:bg-blue-100 cursor-grab"
                >
                  {t('xmoj.dragBookmarklet')}
                </a>
                <button
                  onClick={copyBookmarklet}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {t('xmoj.copyBookmarklet')}
                </button>
              </div>

              <ol className="list-decimal pl-5 text-xs text-blue-800 space-y-1">
                <li>{t('xmoj.bookmarkStep1')}</li>
                <li>{t('xmoj.bookmarkStep2')}</li>
                <li>{t('xmoj.bookmarkStep3')}</li>
              </ol>
            </div>

            <p className="text-xs text-gray-600">{t('xmoj.profileCheckHint')}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('xmoj.usernameInputLabel')}</label>
          <input
            value={xmojUsername}
            onChange={(e) => setXmojUsername(e.target.value)}
            placeholder={t('xmoj.usernameInputPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('xmoj.phpsessidLabel')}</label>
          <input
            value={phpsessid}
            onChange={(e) => setPhpsessid(e.target.value)}
            placeholder={t('xmoj.phpsessidPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>

          <button
            onClick={bind}
            disabled={submitting || !xmojUsername.trim() || !phpsessid.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? t('xmoj.binding') : t('xmoj.bind')}
          </button>
        </div>
      )}

      {binding && (
        <p className="text-sm text-gray-600 mt-3">{t('xmoj.rebindHint')}</p>
      )}

      <ConfirmModal
        isOpen={showUnbindConfirm}
        title={t('xmoj.unbind')}
        message={t('xmoj.unbindConfirm')}
        onConfirm={unbind}
        onCancel={() => setShowUnbindConfirm(false)}
        variant="danger"
      />
    </div>
  );
}
