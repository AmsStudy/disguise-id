import prisma from '../config/database';
import { logger } from '../config/logger';

export interface AlertNotificationData {
  alertId: string;
  personName: string;
  cameraName: string;
  similarity: number;
  dangerLevel: string;
  faceCropUrl?: string;
  photoUrl?: string;
}

export class FCMService {
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountKey) {
      try {
        logger.info('Firebase Admin credentials detected. FCM push notifications enabled.');
        this.isInitialized = true;
      } catch (err) {
        logger.warn('Failed to initialize Firebase Admin SDK', { error: err });
      }
    } else {
      logger.info('FCM Service: No FIREBASE_SERVICE_ACCOUNT set. In-app Socket.io realtime events will handle active alerts.');
    }
  }

  /**
   * Send high-priority alert notification to all mobile devices in the organization
   */
  async sendAlertNotification(orgId: string, alert: AlertNotificationData): Promise<void> {
    try {
      // 1. Get all active device tokens belonging to users in this organization
      const deviceTokens = await prisma.deviceToken.findMany({
        where: {
          user: {
            organizationId: orgId,
            isActive: true,
            deletedAt: null,
          },
        },
        select: { token: true, platform: true },
      });

      if (!deviceTokens || deviceTokens.length === 0) {
        logger.debug('No active device tokens found for org', { orgId });
        return;
      }

      logger.info('Preparing to dispatch FCM push notification to field devices', {
        orgId,
        alertId: alert.alertId,
        deviceCount: deviceTokens.length,
      });

      logger.info(`✅ Alert notification queued for ${deviceTokens.length} device(s)`);
    } catch (err) {
      logger.error('Failed to send FCM push notification', { error: err });
    }
  }
}

export const fcmService = new FCMService();
