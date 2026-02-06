import { Env } from './types';

export class Router {
  private routes: Map<string, Map<string, (request: Request, env: Env, params: Record<string, string>) => Promise<Response>>> = new Map();

  add(method: string, path: string, handler: (request: Request, env: Env, params: Record<string, string>) => Promise<Response>): void {
    if (!this.routes.has(method)) {
      this.routes.set(method, new Map());
    }
    this.routes.get(method)!.set(path, handler);
  }

  async handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    const methodRoutes = this.routes.get(method);
    if (!methodRoutes) {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    // Try exact match first
    const exactHandler = methodRoutes.get(pathname);
    if (exactHandler) {
      return exactHandler(request, env, {});
    }

    // Try pattern matching
    for (const [pattern, handler] of methodRoutes.entries()) {
      const params = matchPath(pattern, pathname);
      if (params) {
        return handler(request, env, params);
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }
}

function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathnameParts = pathname.split('/');

  if (patternParts.length !== pathnameParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathnamePart = pathnameParts[i];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = pathnamePart;
    } else if (patternPart !== pathnamePart) {
      return null;
    }
  }

  return params;
}

export function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
