import { Env, AuthContext } from '../types';
import { jsonResponse } from '../router';
import { verifyJWT } from '../utils/jwt';

export async function requireAuth(request: Request, env: Env): Promise<AuthContext | Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, env.JWT_SECRET);

  if (!payload) {
    return jsonResponse({ error: 'Invalid token' }, 401);
  }

  return {
    userId: payload.sub,
    email: payload.email || '',
  };
}

export function isAuthContext(value: AuthContext | Response): value is AuthContext {
  return 'userId' in value;
}
