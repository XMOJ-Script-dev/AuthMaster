import { RegisterInput, LoginInput, LoginResponse, UserPublic, HTTP_STATUS, TOKEN_EXPIRATION } from '@authmaster/shared';
import { Env, AuthContext } from '../types';
import { Database } from './database';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { signJWT, verifyJWT } from '../utils/jwt';

export class AuthService {
  private db: Database;

  constructor(private env: Env) {
    this.db = new Database(env.DB);
  }

  async register(input: RegisterInput): Promise<UserPublic> {
    // Check if user already exists
    const existing = await this.db.getUserByEmail(input.email);
    if (existing) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const user = await this.db.createUser(input.email, passwordHash);

    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    };
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    // Get user
    const user = await this.db.getUserByEmail(input.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const expiresIn = TOKEN_EXPIRATION.ACCESS_TOKEN;
    const token = await signJWT(
      {
        sub: user.id,
        email: user.email,
        iss: this.env.ISSUER,
        exp: Math.floor(Date.now() / 1000) + expiresIn,
        iat: Math.floor(Date.now() / 1000),
      },
      this.env.JWT_SECRET
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      token,
      expires_in: expiresIn,
    };
  }

  async verifyToken(token: string): Promise<AuthContext | null> {
    const payload = await verifyJWT(token, this.env.JWT_SECRET);
    if (!payload) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email || '',
    };
  }

  async resetPassword(email: string): Promise<void> {
    // Check if user exists
    const user = await this.db.getUserByEmail(email);
    if (!user) {
      // Don't reveal that user doesn't exist
      return;
    }

    // In production, send email with reset link
    // For now, just log it
    console.log(`Password reset requested for ${email}`);
  }
}
