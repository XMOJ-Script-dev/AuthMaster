import {
  CreateApplicationInput,
  UpdateApplicationInput,
  CreateApplicationResponse,
  ApplicationPublic,
  Application,
} from '@authmaster/shared';
import { Env } from '../types';
import { Database } from './database';
import { generateRandomString } from '../utils/crypto';

export class AppService {
  private db: Database;

  constructor(private env: Env) {
    this.db = new Database(env.DB);
  }

  async createApplication(userId: string, input: CreateApplicationInput): Promise<CreateApplicationResponse> {
    // Generate app credentials
    const appId = `app_${generateRandomString(16)}`;
    const appSecret = `secret_${generateRandomString(32)}`;

    // Create application
    const app = await this.db.createApplication(
      userId,
      appId,
      appSecret,
      input.name,
      input.description,
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

  async deleteApplication(appId: string, userId: string): Promise<void> {
    const app = await this.db.getApplicationByAppId(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    if (app.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    await this.db.deleteApplication(appId);
  }

  async updateApplication(appId: string, userId: string, input: UpdateApplicationInput): Promise<ApplicationPublic> {
    const app = await this.db.getApplicationByAppId(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    if (app.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const updated = await this.db.updateApplication(
      appId,
      input.name,
      input.description,
      input.redirect_uris,
      input.scopes
    );

    if (!updated) {
      throw new Error('Application not found');
    }

    return this.toPublic(updated);
  }

  private toPublic(app: Application): ApplicationPublic {
    return {
      id: app.id,
      app_id: app.app_id,
      name: app.name,
      description: app.description,
      redirect_uris: app.redirect_uris,
      scopes: app.scopes,
      created_at: app.created_at,
    };
  }
}
