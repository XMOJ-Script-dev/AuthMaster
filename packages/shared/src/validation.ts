import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

// Application validation schemas
export const createApplicationSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  redirect_uris: z.array(z.string().url()).min(1).max(10),
  scopes: z.array(z.string()).min(1).max(20),
});

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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type AuthorizeInput = z.infer<typeof authorizeSchema>;
export type TokenInput = z.infer<typeof tokenSchema>;
