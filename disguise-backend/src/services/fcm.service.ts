import axios from 'axios';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { formatBiometricScore } from '../utils/biometric';

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
  private serverKey?: string;

  constructor() {
    this.init();
  }

  private init() {
    this.serverKey = process.env.FIREBASE_SERVER_KEY || process.env.FCM_SERVER_KEY;
    if (this.serverKey) {
      logger.info('FCM Service: FCM Server Key configured. Background push notifications active.');
    } else {
      logger.info('FCM Service: No FIREBASE_SERVER_KEY set. In-app Socket.io realtime events will handle foreground alerts.');
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

      const tokens = deviceTokens.map(d => d.token);
      const scoreInfo = formatBiometricScore(alert.similarity);
      const similarityPct = scoreInfo.display_text;

      logger.info('Dispatching FCM push notification to field devices', {
        orgId,
        alertId: alert.alertId,
        deviceCount: tokens.length,
      });

      if (!this.serverKey) {
        logger.debug('Skipping FCM HTTP dispatch (FIREBASE_SERVER_KEY not set)');
        return;
      }

      // 2. Dispatch FCM Multicast / Batch via FCM Legacy / v1 Endpoint
      const payload = {
        registration_ids: tokens,
        priority: 'high',
        notification: {
          title: `🚨 TARGET DPO TERDETEKSI: ${alert.personName}`,
          body: `Kemiripan: ${similarityPct}% di ${alert.cameraName} (Status: ${alert.dangerLevel.toUpperCase()})`,
          sound: 'alarm_high_priority',
          android_channel_id: 'disguise_critical_alerts',
        },
        data: {
          id: alert.alertId,
          alert_id: alert.alertId,
          person_name: alert.personName,
          camera_name: alert.cameraName,
          similarity: alert.similarity.toString(),
          danger_level: alert.dangerLevel,
          face_crop_url: alert.faceCropUrl || '',
          photo_url: alert.photoUrl || '',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      };

      const response = await axios.post('https://fcm.googleapis.com/fcm/send', payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${this.serverKey}`,
        },
        timeout: 8000,
      });

      // 3. Prune invalid tokens if FCM reported failures
      if (response.data && response.data.results) {
        const results = response.data.results as Array<{ error?: string }>;
        const invalidTokens: string[] = [];
        results.forEach((res, idx) => {
          if (res.error === 'NotRegistered' || res.error === 'InvalidRegistration') {
            invalidTokens.push(tokens[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          logger.info(`Pruning ${invalidTokens.length} stale FCM device token(s)`);
          await prisma.deviceToken.deleteMany({
            where: { token: { in: invalidTokens } },
          });
        }
      }

      logger.info(`✅ Alert push notification sent to ${tokens.length} device(s)`);
    } catch (err) {
      logger.error('Failed to send FCM push notification', { error: err });
    }
  }
}

export const fcmService = new FCMService();
