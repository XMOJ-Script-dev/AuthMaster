import { startAuthentication } from '@simplewebauthn/browser';
import { UserPublic } from '@authmaster/shared';
import { api } from '../api/client';
import { setPasskeyTrusted } from './passkey';

interface EnsurePasskeyForActionOptions {
  user: UserPublic;
  setSession: (user: UserPublic, token: string) => void;
}

export async function ensurePasskeyForSensitiveAction({ user, setSession }: EnsurePasskeyForActionOptions): Promise<void> {
  const passkeyList = await api.getPasskeys();
  const hasPasskeys = (passkeyList.passkeys || []).length > 0;

  if (!hasPasskeys) {
    return;
  }

  const options = await api.beginPasskeyLogin(user.email);
  const credential = await startAuthentication({ optionsJSON: options.options as any });
  const result = await api.completePasskeyLogin({
    challenge_id: options.challenge_id,
    credential: credential as any,
  });

  setSession(result.user, result.token);
  setPasskeyTrusted(result.user.id);
}