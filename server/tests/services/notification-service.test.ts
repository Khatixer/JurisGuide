import { NotificationService } from '../../services/notification-service';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock Twilio
jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'test-message-sid'
      })
    }
  }));
});

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{
    headers: {
      'x-message-id': 'test-email-id'
    }
  }])
}));

// Mock Socket.IO
const mockSocketIO = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
};

// Mock database
jest.mock('../../database/config', () => ({
  connectDatabase: jest.fn().mockResolvedValue({
    query: jest.fn()
  })
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mock database
    mockDb = {
      query: jest.fn()
    };
    
    // Mock the database connection
    const { connectDatabase } = require('../../database/config');
    (connectDatabase as jest.Mock).mockResolvedValue(mockDb);
    
    // Set up environment variables
    process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    process.env.TWILIO_PHONE_NUMBER = '+1234567890';
    process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
    process.env.SENDGRID_FROM_EMAIL = 'test@jurisguide.com';
    process.env.BASE_URL = 'https://test.jurisguide.com';

    notificationService = new NotificationService();
    notificationService.setSocketIO(mockSocketIO as any);
  });

  describe('sendNotification', () => {
    it('should send notification through enabled channels', async () => {
      // Mock user preferences
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          notification_preferences: {
            email: true,
            sms: true,
            push: false,
            realTime: true,
            frequency: 'immediate',
            categories: []
          }
        }]
      });

      // Mock user email and phone
      mockDb.query.mockResolvedValueOnce({
        rows: [{ email: 'test@example.com' }]
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ phone: '+1234567890' }]
      });

      // Mock delivery log storage
      mockDb.query.mockResolvedValue({ rows: [] });

      const notification = {
        userId: 'test-user-id',
        type: 'case_update' as const,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium' as const,
        channels: ['email', 'sms', 'realtime'] as const
      };

      const results = await notificationService.sendNotification(notification);

      expect(results).toHaveLength(3); // email, sms, realtime
      expect(results.every(r => r.status === 'sent')).toBe(true);
      expect(sgMail.send).toHaveBeenCalled();
      expect(mockSocketIO.emit).toHaveBeenCalledWith('notification', expect.any(Object));
    });

    it('should filter channels based on user preferences', async () => {
      // Mock user preferences with email disabled
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          notification_preferences: {
            email: false,
            sms: true,
            push: false,
            realTime: true,
            frequency: 'immediate',
            categories: []
          }
        }]
      });

      // Mock user phone
      mockDb.query.mockResolvedValueOnce({
        rows: [{ phone: '+1234567890' }]
      });

      // Mock delivery log storage
      mockDb.query.mockResolvedValue({ rows: [] });

      const notification = {
        userId: 'test-user-id',
        type: 'case_update' as const,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium' as const,
        channels: ['email', 'sms', 'realtime'] as const
      };

      const results = await notificationService.sendNotification(notification);

      expect(results).toHaveLength(2); // sms, realtime (email filtered out)
      expect(sgMail.send).not.toHaveBeenCalled();
    });

    it('should handle notification category filtering', async () => {
      // Mock user preferences with specific categories
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          notification_preferences: {
            email: true,
            sms: true,
            push: true,
            realTime: true,
            frequency: 'immediate',
            categories: ['lawyer_response'] // Only lawyer_response notifications
          }
        }]
      });

      const notification = {
        userId: 'test-user-id',
        type: 'case_update' as const, // Different type, should be filtered
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium' as const,
        channels: ['email'] as const
      };

      const results = await notificationService.sendNotification(notification);

      expect(results).toHaveLength(0); // Filtered out by category
    });

    it('should handle errors gracefully', async () => {
      // Mock user preferences
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          notification_preferences: {
            email: true,
            sms: false,
            push: false,
            realTime: false,
            frequency: 'immediate',
            categories: []
          }
        }]
      });

      // Mock user email
      mockDb.query.mockResolvedValueOnce({
        rows: [{ email: 'test@example.com' }]
      });

      // Mock SendGrid error
      (sgMail.send as jest.Mock).mockRejectedValueOnce(new Error('SendGrid error'));

      // Mock delivery log storage
      mockDb.query.mockResolvedValue({ rows: [] });

      const notification = {
        userId: 'test-user-id',
        type: 'case_update' as const,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium' as const,
        channels: ['email'] as const
      };

      const results = await notificationService.sendNotification(notification);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
      expect(results[0].error).toContain('SendGrid error');
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should return user preferences from database', async () => {
      const mockPreferences = {
        email: true,
        sms: false,
        push: true,
        realTime: true,
        frequency: 'daily',
        categories: ['case_update', 'lawyer_response']
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ notification_preferences: mockPreferences }]
      });

      const preferences = await notificationService.getUserNotificationPreferences('test-user-id');

      expect(preferences).toEqual(mockPreferences);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT notification_preferences'),
        ['test-user-id']
      );
    });

    it('should return default preferences for new user', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [] // No user found
      });

      const preferences = await notificationService.getUserNotificationPreferences('new-user-id');

      expect(preferences).toEqual({
        email: true,
        sms: false,
        push: true,
        realTime: true,
        frequency: 'immediate',
        categories: []
      });
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const preferences = await notificationService.getUserNotificationPreferences('test-user-id');

      // Should return default preferences on error
      expect(preferences).toEqual({
        email: true,
        sms: false,
        push: true,
        realTime: true,
        frequency: 'immediate',
        categories: []
      });
    });
  });

  describe('updateUserNotificationPreferences', () => {
    it('should update user preferences in database', async () => {
      // Mock current preferences
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          notification_preferences: {
            email: true,
            sms: false,
            push: true,
            realTime: true,
            frequency: 'immediate',
            categories: []
          }
        }]
      });

      // Mock update query
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const updates = {
        sms: true,
        frequency: 'daily' as const
      };

      await notificationService.updateUserNotificationPreferences('test-user-id', updates);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [expect.stringContaining('"sms":true'), 'test-user-id']
      );
    });

    it('should handle update errors', async () => {
      // Mock getting current preferences first
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          notification_preferences: {
            email: true,
            sms: false,
            push: true,
            realTime: true,
            frequency: 'immediate',
            categories: []
          }
        }]
      });
      
      // Then mock the update to fail
      mockDb.query.mockRejectedValueOnce(new Error('Update failed'));

      const updates = { email: false };

      await expect(
        notificationService.updateUserNotificationPreferences('test-user-id', updates)
      ).rejects.toThrow('Failed to update notification preferences');
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return delivery status from database', async () => {
      const mockStatus = {
        id: 'test-notification-id',
        user_id: 'test-user-id',
        channel: 'email',
        status: 'delivered',
        sent_at: new Date(),
        delivered_at: new Date(),
        error_message: null,
        external_id: 'test-external-id'
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockStatus]
      });

      const status = await notificationService.getDeliveryStatus('test-notification-id');

      expect(status).toEqual({
        id: mockStatus.id,
        userId: mockStatus.user_id,
        channel: mockStatus.channel,
        status: mockStatus.status,
        sentAt: mockStatus.sent_at,
        deliveredAt: mockStatus.delivered_at,
        error: mockStatus.error_message,
        externalId: mockStatus.external_id
      });
    });

    it('should return null for non-existent notification', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: []
      });

      const status = await notificationService.getDeliveryStatus('nonexistent-id');

      expect(status).toBeNull();
    });
  });

  describe('getNotificationHistory', () => {
    it('should return paginated notification history', async () => {
      const mockHistory = [
        {
          id: 'notif-1',
          user_id: 'test-user-id',
          channel: 'email',
          status: 'delivered',
          sent_at: new Date(),
          delivered_at: new Date(),
          error_message: null,
          external_id: 'ext-1'
        },
        {
          id: 'notif-2',
          user_id: 'test-user-id',
          channel: 'sms',
          status: 'sent',
          sent_at: new Date(),
          delivered_at: null,
          error_message: null,
          external_id: 'ext-2'
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockHistory
      });

      const history = await notificationService.getNotificationHistory('test-user-id', 10, 0);

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('notif-1');
      expect(history[1].id).toBe('notif-2');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['test-user-id', 10, 0]
      );
    });
  });

  describe('webhook handlers', () => {
    it('should handle Twilio webhook correctly', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const webhookData = {
        MessageSid: 'test-message-sid',
        MessageStatus: 'delivered'
      };

      await notificationService.handleTwilioWebhook(webhookData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notification_delivery_log'),
        ['delivered', 'test-message-sid']
      );
    });

    it('should handle SendGrid webhook correctly', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const webhookEvents = [
        {
          sg_message_id: 'test-email-id',
          event: 'delivered'
        },
        {
          sg_message_id: 'test-email-id-2',
          event: 'bounce'
        }
      ];

      await notificationService.handleSendGridWebhook(webhookEvents);

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('template processing', () => {
    it('should process notification templates correctly', async () => {
      // Mock user preferences
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          notification_preferences: {
            email: true,
            sms: false,
            push: false,
            realTime: false,
            frequency: 'immediate',
            categories: []
          }
        }]
      });

      // Mock user email
      mockDb.query.mockResolvedValueOnce({
        rows: [{ email: 'test@example.com' }]
      });

      // Mock template
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'template-1',
          name: 'test-template',
          type: 'email',
          subject: 'Hello {{user_name}}',
          template: 'Dear {{user_name}}, your case {{case_title}} has been updated.',
          variables: ['user_name', 'case_title']
        }]
      });

      // Mock delivery log storage
      mockDb.query.mockResolvedValue({ rows: [] });

      const notification = {
        userId: 'test-user-id',
        type: 'case_update' as const,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium' as const,
        channels: ['email'] as const,
        templateId: 'template-1',
        templateVariables: {
          user_name: 'John Doe',
          case_title: 'Contract Dispute'
        }
      };

      const results = await notificationService.sendNotification(notification);

      expect(results).toHaveLength(1);
      // The template processing should replace variables in both subject and text
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Dear John Doe, your case Contract Dispute has been updated.'
        })
      );
    });
  });
});