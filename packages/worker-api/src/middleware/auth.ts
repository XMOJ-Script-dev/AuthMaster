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

  if ((payload.status || 'active') !== 'active') {
    return jsonResponse({ error: 'Account is disabled' }, 403);
  }

  return {
    userId: payload.sub,
    email: payload.email || '',
    role: payload.role || 'merchant',
    status: payload.status || 'active',
  };
}

export function isAuthContext(value: AuthContext | Response): value is AuthContext {
  return 'userId' in value;
}

export function requireRole(auth: AuthContext, roles: Array<'user' | 'merchant' | 'admin'>): Response | null {
  if (!roles.includes(auth.role)) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  return null;
}

export function requireAdmin(auth: AuthContext): Response | null {
  return requireRole(auth, ['admin']);
}
