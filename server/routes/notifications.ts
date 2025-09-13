import express from 'express';
import { notificationService } from '../services/notification-service';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const sendNotificationSchema = {
  userId: { type: 'string', required: true },
  type: { 
    type: 'string', 
    required: true, 
    enum: ['case_update', 'lawyer_response', 'mediation_update', 'payment_confirmation', 'system_alert'] 
  },
  title: { type: 'string', required: true, minLength: 1, maxLength: 200 },
  message: { type: 'string', required: true, minLength: 1, maxLength: 1000 },
  priority: { type: 'string', required: false, enum: ['low', 'medium', 'high', 'urgent'] },
  channels: { 
    type: 'array', 
    required: true, 
    items: { type: 'string', enum: ['email', 'sms', 'push', 'realtime'] } 
  },
  templateId: { type: 'string', required: false },
  templateVariables: { type: 'object', required: false },
  data: { type: 'object', required: false }
};

const updatePreferencesSchema = {
  email: { type: 'boolean', required: false },
  sms: { type: 'boolean', required: false },
  push: { type: 'boolean', required: false },
  realTime: { type: 'boolean', required: false },
  frequency: { type: 'string', required: false, enum: ['immediate', 'daily', 'weekly'] },
  categories: { type: 'array', required: false, items: { type: 'string' } }
};

/**
 * @route POST /api/notifications/send
 * @desc Send notification to user through specified channels
 * @access Private
 */
router.post('/send', authenticateToken, validateRequest(sendNotificationSchema), async (req, res) => {
  try {
    const {
      userId,
      type,
      title,
      message,
      priority = 'medium',
      channels,
      templateId,
      templateVariables,
      data
    } = req.body;

    logger.info(`Sending notification to user ${userId}: ${title}`);

    const notificationData = {
      userId,
      type,
      title,
      message,
      priority,
      channels,
      templateId,
      templateVariables,
      data
    };

    const deliveryStatuses = await notificationService.sendNotification(notificationData);

    const successCount = deliveryStatuses.filter(s => s.status === 'sent').length;
    const failureCount = deliveryStatuses.filter(s => s.status === 'failed').length;

    res.json(successResponse({
      deliveryStatuses,
      summary: {
        total: deliveryStatuses.length,
        successful: successCount,
        failed: failureCount
      }
    }, `Notification sent: ${successCount}/${deliveryStatuses.length} channels successful`));

  } catch (error) {
    logger.error('Error sending notification:', error);
    res.status(500).json(errorResponse(
      'Notification sending failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route GET /api/notifications/preferences
 * @desc Get user notification preferences
 * @access Private
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('Unauthorized', 'User ID not found'));
    }

    logger.info(`Fetching notification preferences for user ${userId}`);

    const preferences = await notificationService.getUserNotificationPreferences(userId);

    res.json(successResponse({
      preferences,
      userId
    }, 'Notification preferences retrieved successfully'));

  } catch (error) {
    logger.error('Error fetching notification preferences:', error);
    res.status(500).json(errorResponse(
      'Failed to fetch notification preferences',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route PUT /api/notifications/preferences
 * @desc Update user notification preferences
 * @access Private
 */
router.put('/preferences', authenticateToken, validateRequest(updatePreferencesSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('Unauthorized', 'User ID not found'));
    }

    const preferences = req.body;

    logger.info(`Updating notification preferences for user ${userId}`);

    await notificationService.updateUserNotificationPreferences(userId, preferences);

    const updatedPreferences = await notificationService.getUserNotificationPreferences(userId);

    res.json(successResponse({
      preferences: updatedPreferences,
      userId
    }, 'Notification preferences updated successfully'));

  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    res.status(500).json(errorResponse(
      'Failed to update notification preferences',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route GET /api/notifications/history
 * @desc Get user notification history
 * @access Private
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('Unauthorized', 'User ID not found'));
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (limit > 100) {
      return res.status(400).json(errorResponse('Invalid limit', 'Limit cannot exceed 100'));
    }

    logger.info(`Fetching notification history for user ${userId}`);

    const history = await notificationService.getNotificationHistory(userId, limit, offset);

    res.json(successResponse({
      history,
      pagination: {
        limit,
        offset,
        count: history.length
      },
      userId
    }, `Retrieved ${history.length} notification records`));

  } catch (error) {
    logger.error('Error fetching notification history:', error);
    res.status(500).json(errorResponse(
      'Failed to fetch notification history',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route GET /api/notifications/status/:id
 * @desc Get delivery status of specific notification
 * @access Private
 */
router.get('/status/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Fetching delivery status for notification ${id}`);

    const status = await notificationService.getDeliveryStatus(id);

    if (!status) {
      return res.status(404).json(errorResponse(
        'Notification not found',
        `No notification found with ID ${id}`
      ));
    }

    res.json(successResponse({
      status,
      notificationId: id
    }, 'Delivery status retrieved successfully'));

  } catch (error) {
    logger.error('Error fetching delivery status:', error);
    res.status(500).json(errorResponse(
      'Failed to fetch delivery status',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route POST /api/notifications/test
 * @desc Send test notification (for development/testing)
 * @access Private
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('Unauthorized', 'User ID not found'));
    }

    const { channels = ['realtime'] } = req.body;

    logger.info(`Sending test notification to user ${userId}`);

    const testNotification = {
      userId,
      type: 'system_alert' as const,
      title: 'Test Notification',
      message: 'This is a test notification to verify your notification settings are working correctly.',
      priority: 'low' as const,
      channels,
      data: {
        isTest: true,
        timestamp: new Date().toISOString()
      }
    };

    const deliveryStatuses = await notificationService.sendNotification(testNotification);

    res.json(successResponse({
      deliveryStatuses,
      testNotification: {
        title: testNotification.title,
        message: testNotification.message,
        channels: testNotification.channels
      }
    }, 'Test notification sent successfully'));

  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json(errorResponse(
      'Test notification failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route POST /api/notifications/webhooks/twilio
 * @desc Webhook endpoint for Twilio delivery status updates
 * @access Public (webhook)
 */
router.post('/webhooks/twilio', async (req, res) => {
  try {
    logger.info('Received Twilio webhook');

    await notificationService.handleTwilioWebhook(req.body);

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Error handling Twilio webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

/**
 * @route POST /api/notifications/webhooks/sendgrid
 * @desc Webhook endpoint for SendGrid delivery status updates
 * @access Public (webhook)
 */
router.post('/webhooks/sendgrid', async (req, res) => {
  try {
    logger.info('Received SendGrid webhook');

    const events = Array.isArray(req.body) ? req.body : [req.body];
    await notificationService.handleSendGridWebhook(events);

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Error handling SendGrid webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

/**
 * @route POST /api/notifications/bulk-send
 * @desc Send notification to multiple users
 * @access Private
 */
router.post('/bulk-send', authenticateToken, async (req, res) => {
  try {
    const {
      userIds,
      type,
      title,
      message,
      priority = 'medium',
      channels,
      templateId,
      templateVariables,
      data
    } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json(errorResponse(
        'Invalid user IDs',
        'userIds must be a non-empty array'
      ));
    }

    if (userIds.length > 1000) {
      return res.status(400).json(errorResponse(
        'Too many recipients',
        'Maximum 1000 users per bulk send'
      ));
    }

    logger.info(`Sending bulk notification to ${userIds.length} users: ${title}`);

    const results = await Promise.allSettled(
      userIds.map(async (userId: string) => {
        const notificationData = {
          userId,
          type,
          title,
          message,
          priority,
          channels,
          templateId,
          templateVariables,
          data
        };

        return notificationService.sendNotification(notificationData);
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json(successResponse({
      summary: {
        total: userIds.length,
        successful,
        failed
      },
      results: results.map((result, index) => ({
        userId: userIds[index],
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? result.reason?.message : null
      }))
    }, `Bulk notification completed: ${successful}/${userIds.length} successful`));

  } catch (error) {
    logger.error('Error sending bulk notification:', error);
    res.status(500).json(errorResponse(
      'Bulk notification failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

export default router;