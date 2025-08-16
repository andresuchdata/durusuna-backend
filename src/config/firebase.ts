import logger from '../shared/utils/logger';

export interface FirebaseConfig {
  projectId: string;
  serviceAccountKey: string;
}

export class FirebaseManager {
  private static instance: FirebaseManager;
  private app: any | null = null;
  private messaging: any | null = null;
  private adminModule: any | null = null;

  private constructor() {}

  static getInstance(): FirebaseManager {
    if (!FirebaseManager.instance) {
      FirebaseManager.instance = new FirebaseManager();
    }
    return FirebaseManager.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      const config = this.loadConfig();
      if (!config) {
        logger.warn('🔥 Firebase: Configuration not found, skipping initialization');
        return false;
      }

      // Load firebase-admin lazily so environments without it don't crash
      const admin = await this.loadAdminModule();
      if (!admin) {
        logger.warn('🔥 Firebase: firebase-admin not available, skipping initialization');
        return false;
      }

      if (admin.apps && admin.apps.length > 0) {
        this.app = admin.apps[0]!;
        this.messaging = admin.messaging();
        return true;
      }

      const serviceAccount = this.parseServiceAccount(config.serviceAccountKey);
      if (!serviceAccount) {
        logger.error('🔥 Firebase: Invalid service account key format');
        return false;
      }

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.projectId,
      });

      this.messaging = admin.messaging();
      logger.info('🔥 Firebase: Admin SDK initialized successfully');
      return true;
    } catch (error) {
      logger.error('🔥 Firebase: Initialization failed', error);
      return false;
    }
  }

  getMessaging(): any | null {
    return this.messaging;
  }

  isInitialized(): boolean {
    return this.app !== null && this.messaging !== null;
  }

  private loadConfig(): FirebaseConfig | null {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!projectId || !serviceAccountKey) {
      return null;
    }

    return { projectId, serviceAccountKey };
  }

  private parseServiceAccount(key: string): any | null {
    try {
      // Try parsing as JSON first
      return JSON.parse(key);
    } catch {
      try {
        // Try decoding from base64 then parsing
        const decoded = Buffer.from(key, 'base64').toString('utf-8');
        return JSON.parse(decoded);
      } catch (error) {
        logger.error('🔥 Firebase: Failed to parse service account key', error);
        return null;
      }
    }
  }

  private async loadAdminModule(): Promise<any | null> {
    if (this.adminModule) return this.adminModule;
    try {
      const mod = await import('firebase-admin');
      this.adminModule = mod && 'default' in mod ? (mod as any).default : mod;
      return this.adminModule;
    } catch (err) {
      logger.warn('🔥 Firebase: Failed to load firebase-admin module', err);
      return null;
    }
  }
}
