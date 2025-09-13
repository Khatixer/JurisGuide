import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { connectDatabase } from '../database/config';

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  realTime: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  categories: string[];
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'realtime';
  subject?: string;
  template: string;
  variables: string[];
}

interface NotificationData {
  userId: string;
  type: 'case_update' | 'lawyer_response' | 'mediation_update' | 'payment_confirmation' | 'system_alert';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: readonly ('email' | 'sms' | 'push' | 'realtime')[];
  templateId?: string;
  templateVariables?: Record<string, any>;
}

interface DeliveryStatus {
  id: string;
  userId: string;
  channel: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  externalId?: string;
}

export class NotificationService {
  private twilioClient: twilio.Twilio | null = null;
  private sendGridApiKey: string;
  private io: SocketIOServer | null = null;
  private db: any;

  constructor() {
    // Initialize Twilio
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (twilioAccountSid && twilioAuthToken) {
      this.twilioClient = twilio(twilioAccountSid, twilioAuthToken);
    } else {
      logger.warn('Twilio credentials not configured');
      this.twilioClient = null;
    }

    // Initialize SendGrid
    this.sendGridApiKey = process.env.SENDGRID_API_KEY || '';
    if (this.sendGridApiKey) {
      sgMail.setApiKey(this.sendGridApiKey);
    } else {
      logger.warn('SendGrid API key not configured');
    }

    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.db = await connectDatabase();
    } catch (error) {
      logger.error('Failed to connect to database for notifications:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  setSocketIO(io: SocketIOServer): void {
    this.io = io;
    logger.info('Socket.IO server connected to notification service');
  }

  async sendNotification(notification: NotificationData): Promise<DeliveryStatus[]> {
    try {
      logger.info(`Sending notification to user ${notification.userId}: ${notification.title}`);

      // Get user preferences
      const preferences = await this.getUserNotificationPreferences(notification.userId);
      
      // Filter channels based on user preferences
      const enabledChannels = notification.channels.filter(channel => {
        switch (channel) {
          case 'email': return preferences.email;
          case 'sms': return preferences.sms;
          case 'push': return preferences.push;
          case 'realtime': return preferences.realTime;
          default: return false;
        }
      });

      if (enabledChannels.length === 0) {
        logger.info(`No enabled channels for user ${notification.userId}`);
        return [];
      }

      // Check if user wants this category of notifications
      if (preferences.categories.length > 0 && 
          !preferences.categories.includes(notification.type)) {
        logger.info(`User ${notification.userId} has disabled ${notification.type} notifications`);
        return [];
      }

      // Send notifications through enabled channels
      const deliveryPromises = enabledChannels.map(channel => 
        this.sendThroughChannel(notification, channel)
      );

      const deliveryStatuses = await Promise.allSettled(deliveryPromises);
      
      const results: DeliveryStatus[] = deliveryStatuses.map((result, index) => {
        const channel = enabledChannels[index];
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          logger.error(`Failed to send ${channel} notification:`, result.reason);
          return {
            id: this.generateNotificationId(),
            userId: notification.userId,
            channel,
            status: 'failed',
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
            sentAt: new Date()
          };
        }
      });

      // Store delivery statuses
      await this.storeDeliveryStatuses(results);

      return results;

    } catch (error) {
      logger.error('Error sending notification:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Notification sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async sendThroughChannel(
    notification: NotificationData, 
    channel: 'email' | 'sms' | 'push' | 'realtime'
  ): Promise<DeliveryStatus> {
    const deliveryStatus: DeliveryStatus = {
      id: this.generateNotificationId(),
      userId: notification.userId,
      channel,
      status: 'pending',
      sentAt: new Date()
    };

    try {
      switch (channel) {
        case 'email':
          await this.sendEmailNotification(notification, deliveryStatus);
          break;
        case 'sms':
          await this.sendSMSNotification(notification, deliveryStatus);
          break;
        case 'push':
          await this.sendPushNotification(notification, deliveryStatus);
          break;
        case 'realtime':
          await this.sendRealtimeNotification(notification, deliveryStatus);
          break;
      }

      deliveryStatus.status = 'sent';
      return deliveryStatus;

    } catch (error) {
      deliveryStatus.status = 'failed';
      deliveryStatus.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async sendEmailNotification(
    notification: NotificationData, 
    deliveryStatus: DeliveryStatus
  ): Promise<void> {
    if (!this.sendGridApiKey) {
      throw new Error('SendGrid not configured');
    }

    // Get user email
    const userEmail = await this.getUserEmail(notification.userId);
    if (!userEmail) {
      throw new Error('User email not found');
    }

    // Prepare email content
    let emailContent = notification.message;
    let subject = notification.title;

    // Use template if specified
    if (notification.templateId) {
      const template = await this.getNotificationTemplate(notification.templateId);
      if (template) {
        emailContent = this.processTemplate(template.template, notification.templateVariables || {});
        subject = template.subject || subject;
      }
    }

    const msg = {
      to: userEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@jurisguide.com',
      subject,
      text: emailContent,
      html: this.convertToHTML(emailContent),
      customArgs: {
        userId: notification.userId,
        notificationType: notification.type,
        notificationId: deliveryStatus.id
      }
    };

    const response = await sgMail.send(msg);
    deliveryStatus.externalId = response[0].headers['x-message-id'] as string;
    
    logger.info(`Email sent to ${userEmail} via SendGrid`);
  }

  private async sendSMSNotification(
    notification: NotificationData, 
    deliveryStatus: DeliveryStatus
  ): Promise<void> {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured');
    }

    // Get user phone number
    const userPhone = await this.getUserPhone(notification.userId);
    if (!userPhone) {
      throw new Error('User phone number not found');
    }

    // Prepare SMS content (limit to 160 characters for standard SMS)
    let smsContent = notification.message;
    if (notification.templateId) {
      const template = await this.getNotificationTemplate(notification.templateId);
      if (template && template.type === 'sms') {
        smsContent = this.processTemplate(template.template, notification.templateVariables || {});
      }
    }

    // Truncate if too long
    if (smsContent.length > 160) {
      smsContent = smsContent.substring(0, 157) + '...';
    }

    const message = await this.twilioClient.messages.create({
      body: smsContent,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: userPhone,
      statusCallback: `${process.env.BASE_URL}/api/notifications/twilio-webhook`
    });

    deliveryStatus.externalId = message.sid;
    
    logger.info(`SMS sent to ${userPhone} via Twilio`);
  }

  private async sendPushNotification(
    notification: NotificationData, 
    deliveryStatus: DeliveryStatus
  ): Promise<void> {
    // Push notifications would typically use a service like Firebase Cloud Messaging
    // For now, we'll implement a basic version using Socket.IO
    if (!this.io) {
      throw new Error('Socket.IO not configured for push notifications');
    }

    const pushPayload = {
      id: deliveryStatus.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      data: notification.data,
      timestamp: new Date().toISOString()
    };

    // Send to specific user room
    this.io.to(`user_${notification.userId}`).emit('push_notification', pushPayload);
    
    logger.info(`Push notification sent to user ${notification.userId}`);
  }

  private async sendRealtimeNotification(
    notification: NotificationData, 
    deliveryStatus: DeliveryStatus
  ): Promise<void> {
    if (!this.io) {
      throw new Error('Socket.IO not configured for real-time notifications');
    }

    const realtimePayload = {
      id: deliveryStatus.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      data: notification.data,
      timestamp: new Date().toISOString()
    };

    // Send to specific user room
    this.io.to(`user_${notification.userId}`).emit('notification', realtimePayload);
    
    logger.info(`Real-time notification sent to user ${notification.userId}`);
  }

  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      if (!this.db) {
        throw new Error('Database not connected');
      }

      const query = `
        SELECT notification_preferences 
        FROM users 
        WHERE id = $1
      `;
      
      const result = await this.db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        // Return default preferences
        return {
          email: true,
          sms: false,
          push: true,
          realTime: true,
          frequency: 'immediate',
          categories: []
        };
      }

      return result.rows[0].notification_preferences || {
        email: true,
        sms: false,
        push: true,
        realTime: true,
        frequency: 'immediate',
        categories: []
      };

    } catch (error) {
      logger.error('Error fetching user notification preferences:', error instanceof Error ? error.message : 'Unknown error');
      // Return default preferences on error
      return {
        email: true,
        sms: false,
        push: true,
        realTime: true,
        frequency: 'immediate',
        categories: []
      };
    }
  }

  async updateUserNotificationPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      if (!this.db) {
        throw new Error('Database not connected');
      }

      const currentPreferences = await this.getUserNotificationPreferences(userId);
      const updatedPreferences = { ...currentPreferences, ...preferences };

      const query = `
        UPDATE users 
        SET notification_preferences = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      await this.db.query(query, [JSON.stringify(updatedPreferences), userId]);
      
      logger.info(`Updated notification preferences for user ${userId}`);

    } catch (error) {
      logger.error('Error updating notification preferences:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Failed to update notification preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      if (!this.db) return null;

      const query = 'SELECT email FROM users WHERE id = $1';
      const result = await this.db.query(query, [userId]);
      
      return result.rows.length > 0 ? result.rows[0].email : null;
    } catch (error) {
      logger.error('Error fetching user email:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  private async getUserPhone(userId: string): Promise<string | null> {
    try {
      if (!this.db) return null;

      const query = `
        SELECT profile->>'phone' as phone 
        FROM users 
        WHERE id = $1
      `;
      const result = await this.db.query(query, [userId]);
      
      return result.rows.length > 0 ? result.rows[0].phone : null;
    } catch (error) {
      logger.error('Error fetching user phone:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  private async getNotificationTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      if (!this.db) return null;

      const query = `
        SELECT id, name, type, subject, template, variables
        FROM notification_templates 
        WHERE id = $1
      `;
      const result = await this.db.query(query, [templateId]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error fetching notification template:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return processed;
  }

  private convertToHTML(text: string): string {
    // Simple text to HTML conversion
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeDeliveryStatuses(statuses: DeliveryStatus[]): Promise<void> {
    try {
      if (!this.db || statuses.length === 0) return;

      const query = `
        INSERT INTO notification_delivery_log 
        (id, user_id, channel, status, sent_at, delivered_at, error_message, external_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      for (const status of statuses) {
        await this.db.query(query, [
          status.id,
          status.userId,
          status.channel,
          status.status,
          status.sentAt,
          status.deliveredAt,
          status.error,
          status.externalId
        ]);
      }

      logger.info(`Stored ${statuses.length} delivery statuses`);

    } catch (error) {
      logger.error('Error storing delivery statuses:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async getDeliveryStatus(notificationId: string): Promise<DeliveryStatus | null> {
    try {
      if (!this.db) return null;

      const query = `
        SELECT id, user_id, channel, status, sent_at, delivered_at, error_message, external_id
        FROM notification_delivery_log 
        WHERE id = $1
      `;
      
      const result = await this.db.query(query, [notificationId]);
      
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        channel: row.channel,
        status: row.status,
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        error: row.error_message,
        externalId: row.external_id
      };

    } catch (error) {
      logger.error('Error fetching delivery status:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  async getNotificationHistory(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<DeliveryStatus[]> {
    try {
      if (!this.db) return [];

      const query = `
        SELECT id, user_id, channel, status, sent_at, delivered_at, error_message, external_id
        FROM notification_delivery_log 
        WHERE user_id = $1
        ORDER BY sent_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await this.db.query(query, [userId, limit, offset]);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        channel: row.channel,
        status: row.status,
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        error: row.error_message,
        externalId: row.external_id
      }));

    } catch (error) {
      logger.error('Error fetching notification history:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  // Webhook handlers for delivery confirmations
  async handleTwilioWebhook(messageStatus: any): Promise<void> {
    try {
      const { MessageSid, MessageStatus } = messageStatus;
      
      if (!this.db) return;

      let status: 'delivered' | 'failed' | 'sent' = 'sent';
      if (MessageStatus === 'delivered') status = 'delivered';
      if (MessageStatus === 'failed' || MessageStatus === 'undelivered') status = 'failed';

      const query = `
        UPDATE notification_delivery_log 
        SET status = $1, delivered_at = CURRENT_TIMESTAMP
        WHERE external_id = $2
      `;
      
      await this.db.query(query, [status, MessageSid]);
      
      logger.info(`Updated Twilio delivery status: ${MessageSid} -> ${status}`);

    } catch (error) {
      logger.error('Error handling Twilio webhook:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async handleSendGridWebhook(events: any[]): Promise<void> {
    try {
      if (!this.db) return;

      for (const event of events) {
        const { sg_message_id, event: eventType } = event;
        
        let status: 'delivered' | 'failed' | 'sent' = 'sent';
        if (eventType === 'delivered') status = 'delivered';
        if (eventType === 'bounce' || eventType === 'dropped') status = 'failed';

        const query = `
          UPDATE notification_delivery_log 
          SET status = $1, delivered_at = CURRENT_TIMESTAMP
          WHERE external_id = $2
        `;
        
        await this.db.query(query, [status, sg_message_id]);
      }
      
      logger.info(`Processed ${events.length} SendGrid webhook events`);

    } catch (error) {
      logger.error('Error handling SendGrid webhook:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

export const notificationService = new NotificationService();