export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  FRONTEND_URL: string;
  ISSUER: string;
}

export interface AuthContext {
  userId: string;
  email: string;
}
