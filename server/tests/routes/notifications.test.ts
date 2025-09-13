import request from 'supertest';
import express from 'express';
import notificationRoutes from '../../routes/notifications';
import { notificationService } from '../../services/notification-service';

// Mock the notification service
jest.mock('../../services/notification-service', () => ({
  notificationService: {
    sendNotification: jest.fn(),
    getUserNotificationPreferences: jest.fn(),
    updateUserNotificationPreferences: jest.fn(),
    getNotificationHistory: jest.fn(),
    getDeliveryStatus: jest.fn(),
    handleTwilioWebhook: jest.fn(),
    handleSendGridWebhook: jest.fn()
  }
}));

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

describe('Notification Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/notifications/send', () => {
    it('should send notification successfully', async () => {
      const mockDeliveryStatuses = [
        {
          id: 'notif-1',
          userId: 'test-user-id',
          channel: 'email',
          status: 'sent',
          sentAt: new Date()
        },
        {
          id: 'notif-2',
          userId: 'test-user-id',
          channel: 'realtime',
          status: 'sent',
          sentAt: new Date()
        }
      ];

      (notificationService.sendNotification as jest.Mock).mockResolvedValue(mockDeliveryStatuses);

      const response = await request(app)
        .post('/api/notifications/send')
        .send({
          userId: 'test-user-id',
          type: 'case_update',
          title: 'Case Updated',
          message: 'Your case has been updated with new information.',
          priority: 'medium',
          channels: ['email', 'realtime']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deliveryStatuses).toEqual(mockDeliveryStatuses);
      expect(response.body.data.summary.successful).toBe(2);
      expect(response.body.data.summary.failed).toBe(0);
    });

    it('should return 400 for invalid notification type', async () => {
      const response = await request(app)
        .post('/api/notifications/send')
        .send({
          userId: 'test-user-id',
          type: 'invalid_type',
          title: 'Test',
          message: 'Test message',
          channels: ['email']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/notifications/send')
        .send({
          userId: 'test-user-id',
          type: 'case_update',
          // Missing title and message
          channels: ['email']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service errors', async () => {
      (notificationService.sendNotification as jest.Mock).mockRejectedValue(
        new Error('Notification service error')
      );

      const response = await request(app)
        .post('/api/notifications/send')
        .send({
          userId: 'test-user-id',
          type: 'case_update',
          title: 'Test',
          message: 'Test message',
          channels: ['email']
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Notification sending failed');
    });

    it('should handle partial delivery failures', async () => {
      const mockDeliveryStatuses = [
        {
          id: 'notif-1',
          userId: 'test-user-id',
          channel: 'email',
          status: 'sent',
          sentAt: new Date()
        },
        {
          id: 'notif-2',
          userId: 'test-user-id',
          channel: 'sms',
          status: 'failed',
          sentAt: new Date(),
          error: 'Phone number not found'
        }
      ];

      (notificationService.sendNotification as jest.Mock).mockResolvedValue(mockDeliveryStatuses);

      const response = await request(app)
        .post('/api/notifications/send')
        .send({
          userId: 'test-user-id',
          type: 'case_update',
          title: 'Test',
          message: 'Test message',
          channels: ['email', 'sms']
        });

      expect(response.status).toBe(200);
      expect(response.body.data.summary.successful).toBe(1);
      expect(response.body.data.summary.failed).toBe(1);
    });
  });

  describe('GET /api/notifications/preferences', () => {
    it('should return user notification preferences', async () => {
      const mockPreferences = {
        email: true,
        sms: false,
        push: true,
        realTime: true,
        frequency: 'immediate',
        categories: ['case_update', 'lawyer_response']
      };

      (notificationService.getUserNotificationPreferences as jest.Mock)
        .mockResolvedValue(mockPreferences);

      const response = await request(app)
        .get('/api/notifications/preferences');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences).toEqual(mockPreferences);
      expect(response.body.data.userId).toBe('test-user-id');
    });

    it('should handle service errors', async () => {
      (notificationService.getUserNotificationPreferences as jest.Mock)
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/notifications/preferences');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    it('should update user notification preferences', async () => {
      const mockUpdatedPreferences = {
        email: true,
        sms: true,
        push: false,
        realTime: true,
        frequency: 'daily',
        categories: ['case_update']
      };

      (notificationService.updateUserNotificationPreferences as jest.Mock)
        .mockResolvedValue(undefined);
      (notificationService.getUserNotificationPreferences as jest.Mock)
        .mockResolvedValue(mockUpdatedPreferences);

      const response = await request(app)
        .put('/api/notifications/preferences')
        .send({
          sms: true,
          frequency: 'daily',
          categories: ['case_update']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences).toEqual(mockUpdatedPreferences);
      expect(notificationService.updateUserNotificationPreferences).toHaveBeenCalledWith(
        'test-user-id',
        {
          sms: true,
          frequency: 'daily',
          categories: ['case_update']
        }
      );
    });

    it('should return 400 for invalid frequency', async () => {
      const response = await request(app)
        .put('/api/notifications/preferences')
        .send({
          frequency: 'invalid_frequency'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/notifications/history', () => {
    it('should return user notification history', async () => {
      const mockHistory = [
        {
          id: 'notif-1',
          userId: 'test-user-id',
          channel: 'email',
          status: 'delivered',
          sentAt: new Date(),
          deliveredAt: new Date()
        },
        {
          id: 'notif-2',
          userId: 'test-user-id',
          channel: 'sms',
          status: 'sent',
          sentAt: new Date()
        }
      ];

      (notificationService.getNotificationHistory as jest.Mock)
        .mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/notifications/history?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toEqual(mockHistory);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.offset).toBe(0);
      expect(notificationService.getNotificationHistory).toHaveBeenCalledWith(
        'test-user-id',
        10,
        0
      );
    });

    it('should use default pagination values', async () => {
      (notificationService.getNotificationHistory as jest.Mock)
        .mockResolvedValue([]);

      const response = await request(app)
        .get('/api/notifications/history');

      expect(response.status).toBe(200);
      expect(notificationService.getNotificationHistory).toHaveBeenCalledWith(
        'test-user-id',
        50,
        0
      );
    });

    it('should return 400 for limit exceeding maximum', async () => {
      const response = await request(app)
        .get('/api/notifications/history?limit=150');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Limit cannot exceed 100');
    });
  });

  describe('GET /api/notifications/status/:id', () => {
    it('should return delivery status for notification', async () => {
      const mockStatus = {
        id: 'notif-1',
        userId: 'test-user-id',
        channel: 'email',
        status: 'delivered',
        sentAt: new Date(),
        deliveredAt: new Date()
      };

      (notificationService.getDeliveryStatus as jest.Mock)
        .mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/notifications/status/notif-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toEqual(mockStatus);
      expect(response.body.data.notificationId).toBe('notif-1');
    });

    it('should return 404 for non-existent notification', async () => {
      (notificationService.getDeliveryStatus as jest.Mock)
        .mockResolvedValue(null);

      const response = await request(app)
        .get('/api/notifications/status/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Notification not found');
    });
  });

  describe('POST /api/notifications/test', () => {
    it('should send test notification', async () => {
      const mockDeliveryStatuses = [
        {
          id: 'test-notif-1',
          userId: 'test-user-id',
          channel: 'realtime',
          status: 'sent',
          sentAt: new Date()
        }
      ];

      (notificationService.sendNotification as jest.Mock).mockResolvedValue(mockDeliveryStatuses);

      const response = await request(app)
        .post('/api/notifications/test')
        .send({
          channels: ['realtime', 'email']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deliveryStatuses).toEqual(mockDeliveryStatuses);
      expect(response.body.data.testNotification.title).toBe('Test Notification');
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id',
          type: 'system_alert',
          title: 'Test Notification',
          channels: ['realtime', 'email'],
          data: expect.objectContaining({
            isTest: true
          })
        })
      );
    });

    it('should use default channels if not specified', async () => {
      (notificationService.sendNotification as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .post('/api/notifications/test')
        .send({});

      expect(response.status).toBe(200);
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: ['realtime']
        })
      );
    });
  });

  describe('POST /api/notifications/bulk-send', () => {
    it('should send bulk notifications successfully', async () => {
      const mockDeliveryStatuses = [
        {
          id: 'notif-1',
          userId: 'user-1',
          channel: 'email',
          status: 'sent',
          sentAt: new Date()
        }
      ];

      (notificationService.sendNotification as jest.Mock)
        .mockResolvedValue(mockDeliveryStatuses);

      const response = await request(app)
        .post('/api/notifications/bulk-send')
        .send({
          userIds: ['user-1', 'user-2'],
          type: 'system_alert',
          title: 'System Maintenance',
          message: 'System will be down for maintenance',
          channels: ['email']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.total).toBe(2);
      expect(notificationService.sendNotification).toHaveBeenCalledTimes(2);
    });

    it('should return 400 for invalid userIds', async () => {
      const response = await request(app)
        .post('/api/notifications/bulk-send')
        .send({
          userIds: 'not-an-array',
          type: 'system_alert',
          title: 'Test',
          message: 'Test message',
          channels: ['email']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid user IDs');
    });

    it('should return 400 for too many recipients', async () => {
      const userIds = Array(1001).fill(0).map((_, i) => `user-${i}`);

      const response = await request(app)
        .post('/api/notifications/bulk-send')
        .send({
          userIds,
          type: 'system_alert',
          title: 'Test',
          message: 'Test message',
          channels: ['email']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Maximum 1000 users');
    });

    it('should handle partial failures in bulk send', async () => {
      (notificationService.sendNotification as jest.Mock)
        .mockResolvedValueOnce([{ status: 'sent' }])
        .mockRejectedValueOnce(new Error('Send failed'));

      const response = await request(app)
        .post('/api/notifications/bulk-send')
        .send({
          userIds: ['user-1', 'user-2'],
          type: 'system_alert',
          title: 'Test',
          message: 'Test message',
          channels: ['email']
        });

      expect(response.status).toBe(200);
      expect(response.body.data.summary.successful).toBe(1);
      expect(response.body.data.summary.failed).toBe(1);
    });
  });

  describe('Webhook endpoints', () => {
    describe('POST /api/notifications/webhooks/twilio', () => {
      it('should handle Twilio webhook', async () => {
        (notificationService.handleTwilioWebhook as jest.Mock)
          .mockResolvedValue(undefined);

        const response = await request(app)
          .post('/api/notifications/webhooks/twilio')
          .send({
            MessageSid: 'test-message-sid',
            MessageStatus: 'delivered'
          });

        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
        expect(notificationService.handleTwilioWebhook).toHaveBeenCalledWith({
          MessageSid: 'test-message-sid',
          MessageStatus: 'delivered'
        });
      });

      it('should handle webhook errors', async () => {
        (notificationService.handleTwilioWebhook as jest.Mock)
          .mockRejectedValue(new Error('Webhook error'));

        const response = await request(app)
          .post('/api/notifications/webhooks/twilio')
          .send({
            MessageSid: 'test-message-sid',
            MessageStatus: 'delivered'
          });

        expect(response.status).toBe(500);
        expect(response.text).toBe('Error processing webhook');
      });
    });

    describe('POST /api/notifications/webhooks/sendgrid', () => {
      it('should handle SendGrid webhook with single event', async () => {
        (notificationService.handleSendGridWebhook as jest.Mock)
          .mockResolvedValue(undefined);

        const response = await request(app)
          .post('/api/notifications/webhooks/sendgrid')
          .send({
            sg_message_id: 'test-email-id',
            event: 'delivered'
          });

        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
        expect(notificationService.handleSendGridWebhook).toHaveBeenCalledWith([{
          sg_message_id: 'test-email-id',
          event: 'delivered'
        }]);
      });

      it('should handle SendGrid webhook with multiple events', async () => {
        (notificationService.handleSendGridWebhook as jest.Mock)
          .mockResolvedValue(undefined);

        const events = [
          { sg_message_id: 'test-1', event: 'delivered' },
          { sg_message_id: 'test-2', event: 'bounce' }
        ];

        const response = await request(app)
          .post('/api/notifications/webhooks/sendgrid')
          .send(events);

        expect(response.status).toBe(200);
        expect(notificationService.handleSendGridWebhook).toHaveBeenCalledWith(events);
      });
    });
  });
});