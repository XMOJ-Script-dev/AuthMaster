const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
  async register(email: string, password: string) {
    return this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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

  logout(): void {
    this.clearToken();
  }
}

export const api = new ApiClient();
