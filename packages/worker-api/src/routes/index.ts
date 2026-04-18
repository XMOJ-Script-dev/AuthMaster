import { Env } from '../types';
import { Router, jsonResponse, corsHeaders } from '../router';
import { AuthService } from '../services/auth';
import { AppService } from '../services/app';
import { OAuthService } from '../services/oauth';
import { XmojService } from '../services/xmoj';
import { requireAuth, isAuthContext, requireRole, requireAdmin } from '../middleware/auth';
import { Database } from '../services/database';
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  changePasswordSchema,
  createApplicationSchema,
  updateApplicationSchema,
  authorizeSchema,
  tokenSchema,
  bindXmojSchema,
  submitValidationSchema,
  adminReviewValidationSchema,
  adminListAppChangeRequestsQuerySchema,
  adminReviewAppChangeRequestSchema,
  adminListUsersQuerySchema,
  adminUpdateUserRoleSchema,
  adminUpdateUserStatusSchema,
  adminListApplicationsQuerySchema,
  adminUpdateAppBlockSchema,
  adminUpdateAppWarningSchema,
  adminListAuditLogsQuerySchema,
  HTTP_STATUS,
} from '@authmaster/shared';

function getAdminRequestMeta(request: Request): { ip_address?: string; user_agent?: string } {
  return {
    ip_address: request.headers.get('CF-Connecting-IP') || undefined,
    user_agent: request.headers.get('User-Agent') || undefined,
  };
}

export function setupRoutes(router: Router): void {
  // Health check
  router.add('GET', '/health', async (request, env) => {
    return jsonResponse({ status: 'ok' });
  });

  // OpenID Connect Discovery
  router.add('GET', '/.well-known/openid-configuration', async (request, env) => {
    return jsonResponse({
      issuer: env.ISSUER,
      authorization_endpoint: `${env.ISSUER}/oauth2/authorize`,
      token_endpoint: `${env.ISSUER}/oauth2/token`,
      userinfo_endpoint: `${env.ISSUER}/oauth2/userinfo`,
      jwks_uri: `${env.ISSUER}/.well-known/jwks.json`,
      response_types_supported: ['code', 'token'],
      grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['HS256'],
      scopes_supported: ['openid', 'profile', 'email', 'xmoj_profile', 'read', 'write'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      claims_supported: ['sub', 'email', 'email_verified'],
    });
  });

  // Auth routes
  router.add('POST', '/api/v1/auth/register', async (request, env) => {
    try {
      const body = await request.json();
      const input = registerSchema.parse(body);

      const authService = new AuthService(env);
      const user = await authService.register(input);

      return jsonResponse(user, HTTP_STATUS.CREATED);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('POST', '/api/v1/auth/login', async (request, env) => {
    try {
      const body = await request.json();
      const input = loginSchema.parse(body);

      const authService = new AuthService(env);
      const result = await authService.login(input);

      return jsonResponse(result, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.UNAUTHORIZED);
    }
  });

  router.add('POST', '/api/v1/auth/reset-password', async (request, env) => {
    try {
      const body = await request.json();
      const input = resetPasswordSchema.parse(body);

      const authService = new AuthService(env);
      await authService.resetPassword(input.email);

      return jsonResponse({ message: 'Password reset email sent' }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('POST', '/api/v1/auth/change-password', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    try {
      const body = await request.json();
      const input = changePasswordSchema.parse(body);

      const authService = new AuthService(env);
      await authService.changePassword(authResult.userId, input.current_password, input.new_password);

      return jsonResponse({ message: 'Password changed successfully' }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('GET', '/api/v1/public/apps/:appId', async (request, env, params) => {
    try {
      const appService = new AppService(env);
      const app = await appService.getApplication(params.appId);

      if (!app) {
        return jsonResponse({ error: 'Application not found' }, HTTP_STATUS.NOT_FOUND);
      }

      return jsonResponse(app, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  // Application routes
  router.add('POST', '/api/v1/apps/register', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const roleError = requireRole(authResult, ['merchant', 'admin']);
    if (roleError) {
      return roleError;
    }

    try {
      const body = await request.json();
      const input = createApplicationSchema.parse(body);

      const appService = new AppService(env);
      const result = await appService.createApplication(authResult.userId, authResult.role, input);

      return jsonResponse(result, HTTP_STATUS.CREATED);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('GET', '/api/v1/apps/:appId', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    try {
      const appService = new AppService(env);
      const app = await appService.getApplicationByViewer(params.appId, authResult.userId, authResult.role);

      if (!app) {
        return jsonResponse({ error: 'Application not found' }, HTTP_STATUS.NOT_FOUND);
      }

      return jsonResponse(app, HTTP_STATUS.OK);
    } catch (error: any) {
      if (error?.message === 'Forbidden') {
        return jsonResponse({ error: 'Forbidden' }, HTTP_STATUS.FORBIDDEN);
      }
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('DELETE', '/api/v1/apps/:appId', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const roleError = requireRole(authResult, ['merchant', 'admin']);
    if (roleError) {
      return roleError;
    }

    try {
      const appService = new AppService(env);
      await appService.deleteApplication(params.appId, authResult.userId, authResult.role);

      return jsonResponse({ message: 'Application deleted successfully' }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('PUT', '/api/v1/apps/:appId', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const roleError = requireRole(authResult, ['merchant', 'admin']);
    if (roleError) {
      return roleError;
    }

    try {
      const body = await request.json();
      const input = updateApplicationSchema.parse(body);

      const appService = new AppService(env);
      const app = await appService.updateApplication(params.appId, authResult.userId, authResult.role, input);

      return jsonResponse(app, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('POST', '/api/v1/apps/:appId/validation-request', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const roleError = requireRole(authResult, ['merchant', 'admin']);
    if (roleError) {
      return roleError;
    }

    try {
      const body = await request.json();
      const input = submitValidationSchema.parse(body);

      const appService = new AppService(env);
      await appService.submitValidationRequest(params.appId, authResult.userId, authResult.role, input.content);

      return jsonResponse({ message: 'Validation request submitted' }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('GET', '/api/v1/apps/:appId/change-requests', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const roleError = requireRole(authResult, ['merchant', 'admin']);
    if (roleError) {
      return roleError;
    }

    try {
      const appService = new AppService(env);
      const requests = await appService.getChangeRequestsByApp(params.appId, authResult.userId, authResult.role);

      return jsonResponse({ requests }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  // Admin routes (system management)
  router.add('GET', '/api/v1/admin/users', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return adminError;
    }

    try {
      const url = new URL(request.url);
      const query = adminListUsersQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
      const db = new Database(env.DB);
      const result = await db.listUsers(query);

      return jsonResponse(
        {
          users: result.users,
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
        HTTP_STATUS.OK
      );
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('PATCH', '/api/v1/admin/users/:userId/role', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return adminError;
    }

    try {
      const body = await request.json();
      const input = adminUpdateUserRoleSchema.parse(body);
      const db = new Database(env.DB);
      const targetUser = await db.getUserById(params.userId);

      if (!targetUser) {
        return jsonResponse({ error: 'User not found' }, HTTP_STATUS.NOT_FOUND);
      }

      if (authResult.userId === params.userId && input.role !== 'admin') {
        return jsonResponse({ error: 'Admin cannot remove own admin role' }, HTTP_STATUS.BAD_REQUEST);
      }

      const beforeRole = targetUser.role;
      await db.updateUserRole(params.userId, input.role);
      const updatedUser = await db.getUserById(params.userId);

      await db.createAuditLog({
        actor_user_id: authResult.userId,
        actor_role: authResult.role,
        action: 'user.role.update',
        target_type: 'user',
        target_id: params.userId,
        before_data: { role: beforeRole },
        after_data: { role: input.role },
        ...getAdminRequestMeta(request),
      });

      return jsonResponse({ user: updatedUser }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('PATCH', '/api/v1/admin/users/:userId/status', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return adminError;
    }

    try {
      const body = await request.json();
      const input = adminUpdateUserStatusSchema.parse(body);
      const db = new Database(env.DB);
      const targetUser = await db.getUserById(params.userId);

      if (!targetUser) {
        return jsonResponse({ error: 'User not found' }, HTTP_STATUS.NOT_FOUND);
      }

      if (authResult.userId === params.userId && input.status !== 'active') {
        return jsonResponse({ error: 'Admin cannot disable own account' }, HTTP_STATUS.BAD_REQUEST);
      }

      const beforeStatus = targetUser.status;
      await db.updateUserStatus(params.userId, input.status);

      if (input.status === 'disabled') {
        await db.revokeAllUserTokens(params.userId);
      }

      const updatedUser = await db.getUserById(params.userId);

      await db.createAuditLog({
        actor_user_id: authResult.userId,
        actor_role: authResult.role,
        action: 'user.status.update',
        target_type: 'user',
        target_id: params.userId,
        reason: input.reason,
        before_data: { status: beforeStatus },
        after_data: { status: input.status },
        ...getAdminRequestMeta(request),
      });

      return jsonResponse(
        {
          user: updatedUser,
          reason: input.reason,
          tokens_revoked: input.status === 'disabled',
        },
        HTTP_STATUS.OK
      );
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('GET', '/api/v1/admin/apps', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return adminError;
    }

    try {
      const url = new URL(request.url);
      const query = adminListApplicationsQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
      const db = new Database(env.DB);
      const result = await db.listApplicationsForAdmin(query);

      return jsonResponse(
        {
          applications: result.applications,
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
        HTTP_STATUS.OK
      );
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('PATCH', '/api/v1/admin/apps/:appId/block', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return adminError;
    }

    try {
      const body = await request.json();
      const input = adminUpdateAppBlockSchema.parse(body);
      const db = new Database(env.DB);
      const beforeApp = await db.getApplicationByAppIdWithOwner(params.appId);

      if (!beforeApp) {
        return jsonResponse({ error: 'Application not found' }, HTTP_STATUS.NOT_FOUND);
      }

      await db.updateApplicationBlockStatus(params.appId, input.is_blocked, input.reason);
      const updatedApp = await db.getApplicationByAppIdWithOwner(params.appId);

      await db.createAuditLog({
        actor_user_id: authResult.userId,
        actor_role: authResult.role,
        action: 'app.block.update',
        target_type: 'application',
        target_id: params.appId,
        reason: input.reason,
        before_data: {
          is_blocked: beforeApp.is_blocked,
          blocked_reason: beforeApp.blocked_reason,
          blocked_at: beforeApp.blocked_at,
        },
        after_data: {
          is_blocked: updatedApp?.is_blocked,
          blocked_reason: updatedApp?.blocked_reason,
          blocked_at: updatedApp?.blocked_at,
        },
        ...getAdminRequestMeta(request),
      });

      return jsonResponse({ application: updatedApp }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('PATCH', '/api/v1/admin/apps/:appId/warning', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return adminError;
    }

    try {
      const body = await request.json();
      const input = adminUpdateAppWarningSchema.parse(body);
      const db = new Database(env.DB);
      const beforeApp = await db.getApplicationByAppIdWithOwner(params.appId);

      if (!beforeApp) {
        return jsonResponse({ error: 'Application not found' }, HTTP_STATUS.NOT_FOUND);
      }

      await db.updateApplicationWarning(params.appId, input.warning_message);
      const updatedApp = await db.getApplicationByAppIdWithOwner(params.appId);

      await db.createAuditLog({
        actor_user_id: authResult.userId,
        actor_role: authResult.role,
        action: 'app.warning.update',
        target_type: 'application',
        target_id: params.appId,
        before_data: {
          warning_message: beforeApp.warning_message,
          warning_at: beforeApp.warning_at,
        },
        after_data: {
          warning_message: updatedApp?.warning_message,
          warning_at: updatedApp?.warning_at,
        },
        ...getAdminRequestMeta(request),
      });

      return jsonResponse({ application: updatedApp }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('PATCH', '/api/v1/admin/apps/:appId/validation-review', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return adminError;
    }

    try {
      const body = await request.json();
      const input = adminReviewValidationSchema.parse(body);
      const db = new Database(env.DB);
      const beforeApp = await db.getApplicationByAppIdWithOwner(params.appId);

      if (!beforeApp) {
        return jsonResponse({ error: 'Application not found' }, HTTP_STATUS.NOT_FOUND);
      }

      await db.reviewValidationRequest(params.appId, input.status, input.review_note, authResult.userId);
      const updatedApp = await db.getApplicationByAppIdWithOwner(params.appId);

      await db.createAuditLog({
        actor_user_id: authResult.userId,
        actor_role: authResult.role,
        action: 'app.validation.review',
        target_type: 'application',
        target_id: params.appId,
        reason: input.review_note,
        before_data: {
          validation_status: beforeApp.validation_status,
          validation_submission: beforeApp.validation_submission,
        },
        after_data: {
          validation_status: updatedApp?.validation_status,
          validation_review_note: updatedApp?.validation_review_note,
        },
        ...getAdminRequestMeta(request),
      });

      return jsonResponse({ application: updatedApp }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('GET', '/api/v1/admin/app-change-requests', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return adminError;
    }

    try {
      const url = new URL(request.url);
      const query = adminListAppChangeRequestsQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
      const db = new Database(env.DB);
      const result = await db.listAppChangeRequestsForAdmin(query);
      return jsonResponse(
        {
          requests: result.requests,
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
        HTTP_STATUS.OK
      );
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('PATCH', '/api/v1/admin/app-change-requests/:requestId/review', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return adminError;
    }

    try {
      const body = await request.json();
      const input = adminReviewAppChangeRequestSchema.parse(body);
      const db = new Database(env.DB);
      const appService = new AppService(env);
      const beforeRequest = await db.getAppChangeRequestById(params.requestId);

      if (!beforeRequest) {
        return jsonResponse({ error: 'Change request not found' }, HTTP_STATUS.NOT_FOUND);
      }

      if (beforeRequest.status !== 'pending') {
        return jsonResponse({ error: 'Change request already reviewed' }, HTTP_STATUS.BAD_REQUEST);
      }

      await db.reviewAppChangeRequest(params.requestId, input.status, input.review_note, authResult.userId);

      let application: any = null;
      if (input.status === 'approved') {
        application = await appService.applyApprovedChangeRequest(params.requestId);
      }

      const afterRequest = await db.getAppChangeRequestById(params.requestId);

      await db.createAuditLog({
        actor_user_id: authResult.userId,
        actor_role: authResult.role,
        action: 'app.change.review',
        target_type: 'application',
        target_id: beforeRequest.app_id,
        reason: input.review_note,
        before_data: {
          request_status: beforeRequest.status,
          payload: beforeRequest.payload,
        },
        after_data: {
          request_status: afterRequest?.status,
        },
        ...getAdminRequestMeta(request),
      });

      return jsonResponse({ request: afterRequest, application }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('DELETE', '/api/v1/admin/apps/:appId', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return adminError;
    }

    try {
      const db = new Database(env.DB);
      const beforeApp = await db.getApplicationByAppIdWithOwner(params.appId);

      if (!beforeApp) {
        return jsonResponse({ error: 'Application not found' }, HTTP_STATUS.NOT_FOUND);
      }

      const appService = new AppService(env);
      await appService.deleteApplication(params.appId, authResult.userId, 'admin');

      await db.createAuditLog({
        actor_user_id: authResult.userId,
        actor_role: authResult.role,
        action: 'app.delete',
        target_type: 'application',
        target_id: params.appId,
        before_data: {
          app_id: beforeApp.app_id,
          owner_user_id: beforeApp.user_id,
          owner_email: beforeApp.owner_email,
          name: beforeApp.name,
        },
        ...getAdminRequestMeta(request),
      });

      return jsonResponse({ message: 'Application deleted successfully' }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('GET', '/api/v1/admin/audit-logs', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return adminError;
    }

    try {
      const url = new URL(request.url);
      const query = adminListAuditLogsQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
      const db = new Database(env.DB);
      const result = await db.listAuditLogsForAdmin(query);

      return jsonResponse(
        {
          logs: result.logs,
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
        HTTP_STATUS.OK
      );
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('GET', '/api/v1/apps', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    try {
      const appService = new AppService(env);
      const apps = await appService.getUserApplications(authResult.userId);

      return jsonResponse(apps, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('GET', '/api/v1/me/authorizations', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    try {
      const oauthService = new OAuthService(env);
      const authorizations = await oauthService.getUserAuthorizations(authResult.userId);
      return jsonResponse({ authorizations }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('DELETE', '/api/v1/me/authorizations/:appId', async (request, env, params) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    try {
      const oauthService = new OAuthService(env);
      await oauthService.revokeUserAuthorization(authResult.userId, params.appId);
      return jsonResponse({ message: 'Authorization revoked successfully' }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  // XMOJ account binding (user only)
  router.add('GET', '/api/v1/xmoj/binding', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const roleError = requireRole(authResult, ['user']);
    if (roleError) {
      return roleError;
    }

    try {
      const xmojService = new XmojService(env);
      const binding = await xmojService.getMyBinding(authResult.userId);

      return jsonResponse({ binding }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('POST', '/api/v1/xmoj/bind', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const roleError = requireRole(authResult, ['user']);
    if (roleError) {
      return roleError;
    }

    try {
      const body = await request.json();
      const input = bindXmojSchema.parse(body);

      const xmojService = new XmojService(env);
      const binding = await xmojService.bind(authResult.userId, input);

      return jsonResponse({ binding }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('DELETE', '/api/v1/xmoj/bind', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const roleError = requireRole(authResult, ['user']);
    if (roleError) {
      return roleError;
    }

    try {
      const xmojService = new XmojService(env);
      await xmojService.unbind(authResult.userId);
      return jsonResponse({ message: 'Unbound successfully' }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  // OAuth2 routes
  router.add('GET', '/oauth2/authorize', async (request, env) => {
    // Redirect to frontend authorization page
    const url = new URL(request.url);
    const params = url.searchParams.toString();
    return Response.redirect(`${env.FRONTEND_URL}/authorize?${params}`, 302);
  });

  router.add('POST', '/oauth2/authorize', async (request, env) => {
    const authResult = await requireAuth(request, env);
    if (!isAuthContext(authResult)) {
      return authResult;
    }

    const roleError = requireRole(authResult, ['user']);
    if (roleError) {
      return jsonResponse({ error: 'Only user accounts can authorize applications' }, HTTP_STATUS.FORBIDDEN);
    }

    try {
      const body = await request.json();
      const input = authorizeSchema.parse(body);

      const oauthService = new OAuthService(env);
      const result = await oauthService.authorize(input, authResult.userId);

      // Redirect with code
      const redirectUrl = new URL(result.redirect_uri);
      redirectUrl.searchParams.set('code', result.code);
      if (input.state) {
        redirectUrl.searchParams.set('state', input.state);
      }

      return jsonResponse({ redirect_uri: redirectUrl.toString() }, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('POST', '/oauth2/token', async (request, env) => {
    try {
      const body = await request.json();
      const input = tokenSchema.parse(body);

      const oauthService = new OAuthService(env);
      const result = await oauthService.token(input);

      return jsonResponse(result, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.add('GET', '/oauth2/userinfo', async (request, env) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, HTTP_STATUS.UNAUTHORIZED);
    }

    const accessToken = authHeader.substring(7);

    try {
      const oauthService = new OAuthService(env);
      const userInfo = await oauthService.getUserInfo(accessToken);

      return jsonResponse(userInfo, HTTP_STATUS.OK);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, HTTP_STATUS.UNAUTHORIZED);
    }
  });
}
