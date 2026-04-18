const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface AuthorizedAppItem {
  app_id: string;
  app_name: string;
  app_description?: string;
  scope: string;
  authorized_at: string;
  last_used_at?: string;
  active_tokens: number;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, password: string, accountType: 'user' | 'merchant') {
    return this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, account_type: accountType }),
    });
  }

  async login(email: string, password: string) {
    const result: any = await this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async resetPassword(email: string) {
    return this.request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  // Application endpoints
  async createApplication(data: {
    name: string;
    description?: string;
    redirect_uris: string[];
    scopes: string[];
  }) {
    return this.request('/api/v1/apps/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getApplications() {
    return this.request('/api/v1/apps', {
      method: 'GET',
    });
  }

  async getApplication(appId: string) {
    return this.request(`/api/v1/apps/${appId}`, {
      method: 'GET',
    });
  }

  async deleteApplication(appId: string) {
    return this.request(`/api/v1/apps/${appId}`, {
      method: 'DELETE',
    });
  }

  async updateApplication(
    appId: string,
    data: { name: string; description?: string; redirect_uris: string[]; scopes: string[] }
  ) {
    return this.request(`/api/v1/apps/${appId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async authorize(data: {
    response_type: string;
    client_id: string;
    redirect_uri: string;
    scope: string;
    state: string;
  }) {
    return this.request('/oauth2/authorize', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getXmojBinding() {
    return this.request<{ binding: any | null }>('/api/v1/xmoj/binding', {
      method: 'GET',
    });
  }

  async bindXmoj(data: { xmoj_username: string; phpsessid: string; bind_method: 'bookmark' | 'manual' }) {
    return this.request<{ binding: any }>('/api/v1/xmoj/bind', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async unbindXmoj() {
    return this.request<{ message: string }>('/api/v1/xmoj/bind', {
      method: 'DELETE',
    });
  }

  async getMyAuthorizations() {
    return this.request<{ authorizations: AuthorizedAppItem[] }>('/api/v1/me/authorizations', {
      method: 'GET',
    });
  }

  async revokeMyAuthorization(appId: string) {
    return this.request<{ message: string }>(`/api/v1/me/authorizations/${appId}`, {
      method: 'DELETE',
    });
  }

  logout(): void {
    this.clearToken();
  }
}

export const api = new ApiClient();
