import {
  CreateApplicationInput,
  UpdateApplicationInput,
  CreateApplicationResponse,
  ApplicationPublic,
  Application,
  AccountRole,
  AppChangeRequestItem,
} from '@authmaster/shared';
import { Env } from '../types';
import { Database } from './database';
import { generateRandomString } from '../utils/crypto';

export class AppService {
  private db: Database;

  constructor(private env: Env) {
    this.db = new Database(env.DB);
  }

  async createApplication(
    userId: string,
    userRole: AccountRole,
    input: CreateApplicationInput
  ): Promise<CreateApplicationResponse> {
    // Generate app credentials
    const appId = `app_${generateRandomString(16)}`;
    const appSecret = `secret_${generateRandomString(32)}`;

    const isOfficial = userRole === 'admin' ? !!input.is_official : false;

    // Create application
    const app = await this.db.createApplication(
      userId,
      appId,
      appSecret,
      input.name,
      input.description,
      input.creator_name,
      isOfficial,
      input.redirect_uris,
      input.scopes
    );

    return {
      app_id: appId,
      app_secret: appSecret,
      application: this.toPublic(app),
    };
  }

  async getApplication(appId: string): Promise<ApplicationPublic | null> {
    const app = await this.db.getApplicationByAppId(appId);
    if (!app) {
      return null;
    }

    return this.toPublic(app);
  }

  async getApplicationByViewer(appId: string, viewerId: string, viewerRole: AccountRole): Promise<ApplicationPublic | null> {
    const app = await this.db.getApplicationByAppId(appId);
    if (!app) {
      return null;
    }

    if (!this.canManageApplication(app.user_id, viewerId, viewerRole)) {
      throw new Error('Forbidden');
    }

    return this.toPublic(app);
  }

  async getUserApplications(userId: string): Promise<ApplicationPublic[]> {
    const apps = await this.db.getApplicationsByUserId(userId);
    return apps.map(app => this.toPublic(app));
  }

  async verifyApplication(appId: string, appSecret: string): Promise<Application | null> {
    const app = await this.db.getApplicationByAppId(appId);
    if (!app) {
      return null;
    }

    if (app.app_secret !== appSecret) {
      return null;
    }

    return app;
  }

  async deleteApplication(appId: string, userId: string, userRole: AccountRole): Promise<void> {
    const app = await this.db.getApplicationByAppId(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    if (!this.canManageApplication(app.user_id, userId, userRole)) {
      throw new Error('Unauthorized');
    }

    await this.db.deleteApplication(appId);
  }

  async updateApplication(
    appId: string,
    userId: string,
    userRole: AccountRole,
    input: UpdateApplicationInput
  ): Promise<ApplicationPublic | { pending_review: true; request_id: string }> {
    const app = await this.db.getApplicationByAppId(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    if (!this.canManageApplication(app.user_id, userId, userRole)) {
      throw new Error('Unauthorized');
    }

    if (userRole !== 'admin' && input.creator_name && input.creator_name !== app.creator_name) {
      throw new Error('Only admin can edit creator name');
    }

    if (userRole !== 'admin' && typeof input.is_official === 'boolean' && input.is_official !== !!app.is_official) {
      throw new Error('Only admin can edit official flag');
    }

    if (app.validation_status === 'validated') {
      const request = await this.db.createAppChangeRequest({
        app_id: appId,
        submitted_by_user_id: userId,
        payload: {
          name: input.name,
          description: input.description,
          redirect_uris: input.redirect_uris,
          scopes: input.scopes,
          creator_name: input.creator_name,
          is_official: input.is_official,
        },
        submission_note: input.submission_note,
      });

      return {
        pending_review: true,
        request_id: request.id,
      };
    }

    const updated = await this.db.updateApplication(
      appId,
      input.name,
      input.description,
      input.creator_name,
      userRole === 'admin' ? input.is_official : undefined,
      input.redirect_uris,
      input.scopes
    );

    if (!updated) {
      throw new Error('Application not found');
    }

    return this.toPublic(updated);
  }

  async submitValidationRequest(appId: string, userId: string, userRole: AccountRole, content: string): Promise<void> {
    const app = await this.db.getApplicationByAppId(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    if (!this.canManageApplication(app.user_id, userId, userRole)) {
      throw new Error('Unauthorized');
    }

    await this.db.submitValidationRequest(appId, content);
  }

  async getChangeRequestsByApp(appId: string, userId: string, userRole: AccountRole): Promise<AppChangeRequestItem[]> {
    const app = await this.db.getApplicationByAppId(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    if (!this.canManageApplication(app.user_id, userId, userRole)) {
      throw new Error('Unauthorized');
    }

    return this.db.listAppChangeRequestsByAppId(appId);
  }

  async applyApprovedChangeRequest(requestId: string): Promise<ApplicationPublic | null> {
    const request = await this.db.getAppChangeRequestById(requestId);
    if (!request || request.status !== 'approved') {
      return null;
    }

    const payload = request.payload;
    const updated = await this.db.updateApplication(
      request.app_id,
      String(payload.name || ''),
      typeof payload.description === 'string' ? payload.description : undefined,
      typeof payload.creator_name === 'string' ? payload.creator_name : undefined,
      typeof payload.is_official === 'boolean' ? payload.is_official : undefined,
      Array.isArray(payload.redirect_uris) ? (payload.redirect_uris as string[]) : [],
      Array.isArray(payload.scopes) ? (payload.scopes as string[]) : []
    );

    if (!updated) {
      return null;
    }

    return this.toPublic(updated);
  }

  private canManageApplication(ownerUserId: string, actorUserId: string, actorRole: AccountRole): boolean {
    if (actorRole === 'admin') {
      return true;
    }
    return ownerUserId === actorUserId;
  }

  private toPublic(app: Application): ApplicationPublic {
    return {
      id: app.id,
      app_id: app.app_id,
      name: app.name,
      description: app.description,
      creator_name: app.creator_name,
      is_official: app.is_official,
      validation_status: app.validation_status,
      validation_submitted_at: app.validation_submitted_at,
      validation_review_note: app.validation_review_note,
      validation_reviewed_at: app.validation_reviewed_at,
      redirect_uris: app.redirect_uris,
      scopes: app.scopes,
      created_at: app.created_at,
    };
  }
}
