import { Env } from './types';
import { Router, jsonResponse, corsHeaders } from './router';
import { setupRoutes } from './routes';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // Setup router
    const router = new Router();
    setupRoutes(router);

    try {
      // Handle request
      const response = await router.handle(request, env);
      return response;
    } catch (error: any) {
      console.error('Error:', error);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },
};
