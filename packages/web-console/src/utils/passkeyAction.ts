import { startAuthentication } from '@simplewebauthn/browser';
import { UserPublic } from '@authmaster/shared';
import { api } from '../api/client';
import i18n from '../i18n/config';
import { setPasskeyTrusted } from './passkey';

type SensitiveActionMethod = 'passkey' | 'totp';

interface EnsurePasskeyForActionOptions {
  user: UserPublic;
  setSession: (user: UserPublic, token: string) => void;
}

export async function ensurePasskeyForSensitiveAction({ user, setSession }: EnsurePasskeyForActionOptions): Promise<void> {
  const mfaStatus = await api.getMFAStatus();
  const hasPasskeys = mfaStatus.passkey_count > 0;
  const hasTotp = mfaStatus.totp_enabled;

  if (!hasPasskeys && !hasTotp) {
    return;
  }

  const method = hasPasskeys && hasTotp
    ? await selectSensitiveActionMethod()
    : hasPasskeys
      ? 'passkey'
      : 'totp';

  if (!method) {
    throw new Error(i18n.t('sensitiveAction.cancelled'));
  }

  if (method === 'passkey') {
    const options = await api.beginPasskeyLogin(user.email);
    const credential = await startAuthentication({ optionsJSON: options.options as any });
    const result = await api.completePasskeyLogin({
      challenge_id: options.challenge_id,
      credential: credential as any,
    });

    setSession(result.user, result.token);
    setPasskeyTrusted(result.user.id);
    return;
  }

  const code = (await promptForTotpOrRecoveryCode())?.trim();
  if (!code) {
    throw new Error(i18n.t('sensitiveAction.cancelled'));
  }

  await api.verifyTOTP(code.includes('-') ? { recovery_code: code } : { code });
  setPasskeyTrusted(user.id);
}

async function selectSensitiveActionMethod(): Promise<SensitiveActionMethod | null> {
  return showDialog<SensitiveActionMethod>({
    title: i18n.t('sensitiveAction.title'),
    message: i18n.t('sensitiveAction.chooseMethod'),
    actions: [
      {
        label: i18n.t('sensitiveAction.usePasskey'),
        value: 'passkey',
        className: 'bg-gray-900 text-white hover:bg-black',
      },
      {
        label: i18n.t('sensitiveAction.useTotp'),
        value: 'totp',
        className: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
      },
    ],
  });
}

async function promptForTotpOrRecoveryCode(): Promise<string | null> {
  return showInputDialog({
    title: i18n.t('sensitiveAction.totpTitle'),
    message: i18n.t('sensitiveAction.totpMessage'),
    placeholder: i18n.t('sensitiveAction.totpPlaceholder'),
    submitLabel: i18n.t('common.confirm'),
  });
}

function showDialog<TValue>({
  title,
  message,
  actions,
}: {
  title: string;
  message: string;
  actions: Array<{ label: string; value: TValue; className: string }>;
}): Promise<TValue | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm';

    const panel = document.createElement('div');
    panel.className = 'w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl';

    const titleNode = document.createElement('h3');
    titleNode.className = 'text-lg font-semibold text-gray-900';
    titleNode.textContent = title;

    const messageNode = document.createElement('p');
    messageNode.className = 'mt-2 text-sm leading-6 text-gray-600';
    messageNode.textContent = message;

    const actionRow = document.createElement('div');
    actionRow.className = 'mt-6 flex flex-col gap-3';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'mt-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50';
    cancelButton.textContent = i18n.t('common.cancel');

    const cleanup = (value: TValue | null) => {
      document.removeEventListener('keydown', handleKeydown);
      overlay.remove();
      resolve(value);
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cleanup(null);
      }
    };

    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `rounded-md px-4 py-2 text-sm font-semibold transition-colors ${action.className}`;
      button.textContent = action.label;
      button.addEventListener('click', () => cleanup(action.value));
      actionRow.appendChild(button);
    }

    cancelButton.addEventListener('click', () => cleanup(null));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        cleanup(null);
      }
    });
    document.addEventListener('keydown', handleKeydown);

    panel.appendChild(titleNode);
    panel.appendChild(messageNode);
    panel.appendChild(actionRow);
    panel.appendChild(cancelButton);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  });
}

function showInputDialog({
  title,
  message,
  placeholder,
  submitLabel,
}: {
  title: string;
  message: string;
  placeholder: string;
  submitLabel: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm';

    const panel = document.createElement('div');
    panel.className = 'w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl';

    const titleNode = document.createElement('h3');
    titleNode.className = 'text-lg font-semibold text-gray-900';
    titleNode.textContent = title;

    const messageNode = document.createElement('p');
    messageNode.className = 'mt-2 text-sm leading-6 text-gray-600';
    messageNode.textContent = message;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.className = 'mt-5 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';
    input.addEventListener('input', () => {
      const v = input.value.trim();
      const isTotpCode = /^\d{6}$/.test(v);
      const isRecoveryCode = /^[A-Z0-9]{5}-[A-Z0-9]{5}$/i.test(v);
      if (isTotpCode || isRecoveryCode) {
        submit();
      }
    });

    const actionRow = document.createElement('div');
    actionRow.className = 'mt-5 flex justify-end gap-3';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50';
    cancelButton.textContent = i18n.t('common.cancel');

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black';
    confirmButton.textContent = submitLabel;

    const cleanup = (value: string | null) => {
      document.removeEventListener('keydown', handleKeydown);
      overlay.remove();
      resolve(value);
    };

    const submit = () => {
      cleanup(input.value.trim() || null);
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cleanup(null);
      }
      if (event.key === 'Enter') {
        submit();
      }
    };

    confirmButton.addEventListener('click', submit);
    cancelButton.addEventListener('click', () => cleanup(null));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        cleanup(null);
      }
    });
    document.addEventListener('keydown', handleKeydown);

    actionRow.appendChild(cancelButton);
    actionRow.appendChild(confirmButton);
    panel.appendChild(titleNode);
    panel.appendChild(messageNode);
    panel.appendChild(input);
    panel.appendChild(actionRow);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    input.focus();
  });
}