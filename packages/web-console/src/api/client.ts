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

export type AppValidationStatus = 'unverified' | 'pending' | 'validated' | 'rejected';
export type AppChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ApplicationItem {
  id: string;
  app_id: string;
  name: string;
  description?: string;
  creator_name?: string;
  is_official?: boolean;
  validation_status?: AppValidationStatus;
  validation_submitted_at?: string;
  validation_review_note?: string;
  validation_reviewed_at?: string;
  redirect_uris: string[];
  scopes: string[];
  created_at: string;
}

export interface AppChangeRequestItem {
  id: string;
  app_id: string;
  submitted_by_user_id: string;
  payload: Record<string, unknown>;
  submission_note?: string;
  status: AppChangeRequestStatus;
  review_note?: string;
  reviewed_by_user_id?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export type AdminAccountRole = 'user' | 'merchant' | 'admin';
export type AdminAccountStatus = 'active' | 'disabled';

export interface AdminUserListItem {
  id: string;
  email: string;
  role: AdminAccountRole;
  status: AdminAccountStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminUserListResponse {
  users: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminApplicationListItem {
  app_id: string;
  name: string;
  description?: string;
  creator_name: string;
  is_official: boolean;
  validation_status: AppValidationStatus;
  validation_submitted_at?: string;
  validation_reviewed_at?: string;
  owner_user_id: string;
  owner_email: string;
  redirect_uris: string[];
  scopes: string[];
  is_blocked: boolean;
  blocked_reason?: string;
  blocked_at?: string;
  warning_message?: string;
  warning_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminApplicationsResponse {
  applications: AdminApplicationListItem[];
  total: number;
  limit: number;
  offset: number;
}

export type AdminAuditAction =
  | 'user.role.update'
  | 'user.status.update'
  | 'app.block.update'
  | 'app.warning.update'
  | 'app.delete'
  | 'app.validation.review'
  | 'app.change.review';

export interface AdminAuditLogItem {
  id: string;
  actor_user_id: string;
  actor_role: AdminAccountRole;
  action: AdminAuditAction;
  target_type: 'user' | 'application';
  target_id: string;
  reason?: string;
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AdminAuditLogsResponse {
  logs: AdminAuditLogItem[];
  total: number;
  limit: number;
  offset: number;
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
    creator_name: string;
    is_official?: boolean;
    redirect_uris: string[];
    scopes: string[];
  }) {
    return this.request('/api/v1/apps/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getApplications() {
    return this.request<ApplicationItem[]>('/api/v1/apps', {
      method: 'GET',
    });
  }

  async getApplication(appId: string) {
    return this.request<ApplicationItem>(`/api/v1/apps/${appId}`, {
      method: 'GET',
    });
  }

  async getPublicApplication(appId: string) {
    return this.request<ApplicationItem>(`/api/v1/public/apps/${appId}`, {
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
    data: {
      name: string;
      description?: string;
      creator_name?: string;
      is_official?: boolean;
      redirect_uris: string[];
      scopes: string[];
      submission_note?: string;
    }
  ) {
    return this.request<ApplicationItem | { pending_review: true; request_id: string }>(`/api/v1/apps/${appId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async submitValidationRequest(appId: string, content: string) {
    return this.request<{ message: string }>(`/api/v1/apps/${appId}/validation-request`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getAppChangeRequests(appId: string) {
    return this.request<{ requests: AppChangeRequestItem[] }>(`/api/v1/apps/${appId}/change-requests`, {
      method: 'GET',
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

  async getAdminUsers(params?: {
    limit?: number;
    offset?: number;
    role?: AdminAccountRole;
    status?: AdminAccountStatus;
    email?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) {
      searchParams.set('limit', String(params.limit));
    }
    if (params?.offset !== undefined) {
      searchParams.set('offset', String(params.offset));
    }
    if (params?.role) {
      searchParams.set('role', params.role);
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    if (params?.email) {
      searchParams.set('email', params.email);
    }

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<AdminUserListResponse>(`/api/v1/admin/users${suffix}`, {
      method: 'GET',
    });
  }

  async updateAdminUserRole(userId: string, role: AdminAccountRole) {
    return this.request<{ user: AdminUserListItem }>(`/api/v1/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async updateAdminUserStatus(userId: string, status: AdminAccountStatus, reason?: string) {
    return this.request<{ user: AdminUserListItem; reason?: string; tokens_revoked: boolean }>(
      `/api/v1/admin/users/${userId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }
    );
  }

  async getAdminApplications(params?: {
    limit?: number;
    offset?: number;
    owner_email?: string;
    app_id?: string;
    name?: string;
    is_blocked?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) {
      searchParams.set('limit', String(params.limit));
    }
    if (params?.offset !== undefined) {
      searchParams.set('offset', String(params.offset));
    }
    if (params?.owner_email) {
      searchParams.set('owner_email', params.owner_email);
    }
    if (params?.app_id) {
      searchParams.set('app_id', params.app_id);
    }
    if (params?.name) {
      searchParams.set('name', params.name);
    }
    if (params?.is_blocked !== undefined) {
      searchParams.set('is_blocked', String(params.is_blocked));
    }

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<AdminApplicationsResponse>(`/api/v1/admin/apps${suffix}`, {
      method: 'GET',
    });
  }

  async updateAdminApplicationBlock(appId: string, is_blocked: boolean, reason?: string) {
    return this.request<{ application: AdminApplicationListItem | null }>(`/api/v1/admin/apps/${appId}/block`, {
      method: 'PATCH',
      body: JSON.stringify({ is_blocked, reason }),
    });
  }

  async updateAdminApplicationWarning(appId: string, warning_message?: string) {
    return this.request<{ application: AdminApplicationListItem | null }>(`/api/v1/admin/apps/${appId}/warning`, {
      method: 'PATCH',
      body: JSON.stringify({ warning_message }),
    });
  }

  async reviewAdminApplicationValidation(
    appId: string,
    status: 'validated' | 'rejected',
    review_note?: string
  ) {
    return this.request<{ application: AdminApplicationListItem | null }>(`/api/v1/admin/apps/${appId}/validation-review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, review_note }),
    });
  }

  async getAdminAppChangeRequests(params?: {
    limit?: number;
    offset?: number;
    app_id?: string;
    status?: AppChangeRequestStatus;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) {
      searchParams.set('limit', String(params.limit));
    }
    if (params?.offset !== undefined) {
      searchParams.set('offset', String(params.offset));
    }
    if (params?.app_id) {
      searchParams.set('app_id', params.app_id);
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<{ requests: AppChangeRequestItem[]; total: number; limit: number; offset: number }>(
      `/api/v1/admin/app-change-requests${suffix}`,
      {
        method: 'GET',
      }
    );
  }

  async reviewAdminAppChangeRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    review_note?: string
  ) {
    return this.request<{ request: AppChangeRequestItem; application?: ApplicationItem | null }>(
      `/api/v1/admin/app-change-requests/${requestId}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, review_note }),
      }
    );
  }

  async deleteAdminApplication(appId: string) {
    return this.request<{ message: string }>(`/api/v1/admin/apps/${appId}`, {
      method: 'DELETE',
    });
  }

  async getAdminAuditLogs(params?: {
    limit?: number;
    offset?: number;
    actor_user_id?: string;
    target_type?: 'user' | 'application';
    target_id?: string;
    action?: AdminAuditAction;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) {
      searchParams.set('limit', String(params.limit));
    }
    if (params?.offset !== undefined) {
      searchParams.set('offset', String(params.offset));
    }
    if (params?.actor_user_id) {
      searchParams.set('actor_user_id', params.actor_user_id);
    }
    if (params?.target_type) {
      searchParams.set('target_type', params.target_type);
    }
    if (params?.target_id) {
      searchParams.set('target_id', params.target_id);
    }
    if (params?.action) {
      searchParams.set('action', params.action);
    }

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<AdminAuditLogsResponse>(`/api/v1/admin/audit-logs${suffix}`, {
      method: 'GET',
    });
  }

  logout(): void {
    this.clearToken();
  }
}

export const api = new ApiClient();
