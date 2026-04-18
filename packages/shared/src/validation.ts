import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  account_type: z.enum(['user', 'merchant']).default('user'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(128),
});

// Application validation schemas
export const createApplicationSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  redirect_uris: z.array(z.string().url()).min(1).max(10),
  scopes: z.array(z.string()).min(1).max(20),
});

export const updateApplicationSchema = createApplicationSchema;

// OAuth2 validation schemas
export const authorizeSchema = z.object({
  response_type: z.enum(['code', 'token']),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(['S256', 'plain']).optional(),
});

export const tokenSchema = z.object({
  grant_type: z.enum(['authorization_code', 'client_credentials', 'refresh_token']),
  code: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  refresh_token: z.string().optional(),
  code_verifier: z.string().optional(),
});

export const bindXmojSchema = z.object({
  xmoj_username: z.string().min(1).max(64),
  phpsessid: z.string().min(16).max(256),
  bind_method: z.enum(['bookmark', 'manual']),
});

export const adminListUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  role: z.enum(['user', 'merchant', 'admin']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  email: z.string().min(1).max(255).optional(),
});

export const adminUpdateUserRoleSchema = z.object({
  role: z.enum(['user', 'merchant', 'admin']),
});

export const adminUpdateUserStatusSchema = z.object({
  status: z.enum(['active', 'disabled']),
  reason: z.string().min(1).max(500).optional(),
});

export const adminListApplicationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  owner_email: z.string().min(1).max(255).optional(),
  app_id: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(255).optional(),
  is_blocked: z.coerce.boolean().optional(),
});

export const adminUpdateAppBlockSchema = z.object({
  is_blocked: z.boolean(),
  reason: z.string().min(1).max(500).optional(),
});

export const adminUpdateAppWarningSchema = z.object({
  warning_message: z.string().min(1).max(500).optional(),
});

export const adminListAuditLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  actor_user_id: z.string().min(1).max(255).optional(),
  target_type: z.enum(['user', 'application']).optional(),
  target_id: z.string().min(1).max(255).optional(),
  action: z
    .enum([
      'user.role.update',
      'user.status.update',
      'app.block.update',
      'app.warning.update',
      'app.delete',
    ])
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type AuthorizeInput = z.infer<typeof authorizeSchema>;
export type TokenInput = z.infer<typeof tokenSchema>;
export type BindXmojInput = z.infer<typeof bindXmojSchema>;
export type AdminListUsersQueryInput = z.infer<typeof adminListUsersQuerySchema>;
export type AdminUpdateUserRoleInput = z.infer<typeof adminUpdateUserRoleSchema>;
export type AdminUpdateUserStatusInput = z.infer<typeof adminUpdateUserStatusSchema>;
export type AdminListApplicationsQueryInput = z.infer<typeof adminListApplicationsQuerySchema>;
export type AdminUpdateAppBlockInput = z.infer<typeof adminUpdateAppBlockSchema>;
export type AdminUpdateAppWarningInput = z.infer<typeof adminUpdateAppWarningSchema>;
export type AdminListAuditLogsQueryInput = z.infer<typeof adminListAuditLogsQuerySchema>;
