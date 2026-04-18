import { BindXmojInput, XmojBindingPublic } from '@authmaster/shared';
import { Env } from '../types';
import { Database } from './database';
import { encryptText } from '../utils/crypto';

export class XmojService {
  private db: Database;

  constructor(private env: Env) {
    this.db = new Database(env.DB);
  }

  async bind(userId: string, input: BindXmojInput): Promise<XmojBindingPublic> {
    const providedUsername = this.normalizeUsername(input.xmoj_username);
    if (!providedUsername) {
      throw new Error('XMOJ username is required');
    }

    const existingBinding = await this.db.getXmojBindingByUserId(userId);
    if (existingBinding) {
      if (existingBinding.xmoj_user_id !== providedUsername) {
        throw new Error('You have already bound an XMOJ account. Please unbind first before binding another account.');
      }

      return {
        xmoj_user_id: existingBinding.xmoj_user_id,
        xmoj_username: existingBinding.xmoj_username,
        bind_method: existingBinding.bind_method,
        created_at: existingBinding.created_at,
      };
    }

    const normalized = input.phpsessid.trim();
    if (!/^[a-zA-Z0-9_-]{16,256}$/.test(normalized)) {
      throw new Error('Invalid PHPSESSID format');
    }

    const verified = await this.verifyByProfileUserId(normalized);
    if (!verified.ok) {
      throw new Error('Invalid or expired PHPSESSID');
    }

    if (providedUsername !== verified.userId) {
      throw new Error('Username does not match user_id from XMOJ profile');
    }

    const encrypted = await encryptText(normalized, this.env.ENCRYPTION_KEY);
    const xmojUserId = verified.userId;
    const xmojUsername = providedUsername;

    const binding = await this.db.createOrUpdateXmojBinding(
      userId,
      xmojUserId,
      xmojUsername,
      encrypted,
      input.bind_method
    );

    return {
      xmoj_user_id: binding.xmoj_user_id,
      xmoj_username: binding.xmoj_username,
      bind_method: binding.bind_method,
      created_at: binding.created_at,
    };
  }

  async getMyBinding(userId: string): Promise<XmojBindingPublic | null> {
    const binding = await this.db.getXmojBindingByUserId(userId);
    if (!binding) {
      return null;
    }

    return {
      xmoj_user_id: binding.xmoj_user_id,
      xmoj_username: binding.xmoj_username,
      bind_method: binding.bind_method,
      created_at: binding.created_at,
    };
  }

  async unbind(userId: string): Promise<void> {
    await this.db.deleteXmojBindingByUserId(userId);
  }

  private async verifyByProfileUserId(phpsessid: string): Promise<{ ok: boolean; userId: string }> {
    const base = (this.env as Env & { XMOJ_BASE_URL?: string }).XMOJ_BASE_URL || 'https://xmoj.tech';
    const target = `${base.replace(/\/$/, '')}/template/bs3/profile.php`;

    const response = await fetch(target, {
      method: 'GET',
      headers: {
        Cookie: `PHPSESSID=${encodeURIComponent(phpsessid)}`,
        'User-Agent': 'AuthMaster-XMOJ-Bind/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return { ok: false, userId: '' };
    }

    const finalUrl = response.url.toLowerCase();
    if (finalUrl.includes('/login') || finalUrl.includes('/signin')) {
      return { ok: false, userId: '' };
    }

    const html = await response.text();
    const normalizedHtml = html.replace(/\s+/g, ' ');
    const userId = this.extractProfileUserId(normalizedHtml);
    if (!userId) {
      return { ok: false, userId: '' };
    }

    return { ok: true, userId };
  }

  private extractProfileUserId(html: string): string | null {
    const patterns = [
      /name=["']user_id["'][^>]*value=["']([^"']{1,64})["']/i,
      /id=["']user_id["'][^>]*value=["']([^"']{1,64})["']/i,
      /<td[^>]*>\s*user_id\s*<\/td>\s*<td[^>]*>\s*([^<\s]{1,64})\s*<\/td>/i,
      /user_id\s*[:=]\s*["']?([a-zA-Z0-9_\-.]{1,64})["']?/i,
    ];

    for (const pattern of patterns) {
      const matched = html.match(pattern);
      if (matched && matched[1]) {
        const userId = this.normalizeUsername(matched[1]);
        if (userId) {
          return userId;
        }
      }
    }

    return null;
  }

  private normalizeUsername(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }
}
