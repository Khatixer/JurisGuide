import express, { Request, Response } from 'express';
import { SecureCommunicationService } from '../services/secure-communication-service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { auditDataAccess, validateEncryptionRequirements } from '../middleware/encryption';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { validateRequest } from '../utils/validation';

const router = express.Router();

// Apply authentication and encryption validation to all routes
router.use(authenticateToken);
router.use(validateEncryptionRequirements);

/**
 * Generate user key pair for end-to-end encryption
 * POST /api/secure-communication/keypair
 */
router.post('/keypair', 
  auditDataAccess('user_key_pairs', 'create'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { password } = req.body;
      const userId = req.user!.userId;

      // Validate request
      const validation = validateRequest(req.body, {
        password: { type: 'string', required: true, minLength: 8 }
      });

      if (!validation.isValid) {
        res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          validation.errors!.join(', '),
          req.headers['x-request-id'] as string
        ));
        return;
      }

      const keyPair = await SecureCommunicationService.generateUserKeyPair(userId, password);

      res.json(createSuccessResponse({
        userId: keyPair.userId,
        publicKey: keyPair.publicKey,
        createdAt: keyPair.createdAt
      }, 'Key pair generated successfully'));
    } catch (error) {
      console.error('Key pair generation error:', error);
      res.status(500).json(createErrorResponse(
        'KEYPAIR_GENERATION_ERROR',
        'Failed to generate key pair',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Get user's public key
 * GET /api/secure-communication/public-key/:userId
 */
router.get('/public-key/:userId',
  auditDataAccess('user_key_pairs', 'read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const publicKey = await SecureCommunicationService.getUserPublicKey(userId);

      if (!publicKey) {
        res.status(404).json(createErrorResponse(
          'PUBLIC_KEY_NOT_FOUND',
          'Public key not found for user',
          req.headers['x-request-id'] as string
        ));
        return;
      }

      res.json(createSuccessResponse({
        userId,
        publicKey
      }, 'Public key retrieved successfully'));
    } catch (error) {
      console.error('Public key retrieval error:', error);
      res.status(500).json(createErrorResponse(
        'PUBLIC_KEY_ERROR',
        'Failed to retrieve public key',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Send secure message
 * POST /api/secure-communication/messages
 */
router.post('/messages',
  auditDataAccess('secure_messages', 'create'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { recipientId, message, messageType = 'text', password } = req.body;
      const senderId = req.user!.userId;

      // Validate request
      const validation = validateRequest(req.body, {
        recipientId: { type: 'string', required: true },
        message: { type: 'string', required: true, minLength: 1 },
        messageType: { type: 'string', required: false },
        password: { type: 'string', required: true, minLength: 8 }
      });

      if (!validation.isValid) {
        res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          validation.errors!.join(', '),
          req.headers['x-request-id'] as string
        ));
        return;
      }

      // Validate message type
      const validMessageTypes = ['text', 'document', 'legal_advice', 'mediation_update'];
      if (!validMessageTypes.includes(messageType)) {
        res.status(400).json(createErrorResponse(
          'INVALID_MESSAGE_TYPE',
          'Invalid message type',
          req.headers['x-request-id'] as string
        ));
        return;
      }

      const secureMessage = await SecureCommunicationService.sendSecureMessage(
        senderId,
        recipientId,
        message,
        messageType,
        password
      );

      res.status(201).json(createSuccessResponse({
        id: secureMessage.id,
        recipientId: secureMessage.recipientId,
        messageType: secureMessage.messageType,
        timestamp: secureMessage.timestamp,
        isRead: secureMessage.isRead
      }, 'Secure message sent successfully'));
    } catch (error) {
      console.error('Secure message sending error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('public key not found')) {
          res.status(404).json(createErrorResponse(
            'RECIPIENT_NOT_FOUND',
            'Recipient not found or not configured for secure messaging',
            req.headers['x-request-id'] as string
          ));
          return;
        }
        
        if (error.message.includes('private key not found')) {
          res.status(401).json(createErrorResponse(
            'INVALID_PASSWORD',
            'Invalid password or sender not configured for secure messaging',
            req.headers['x-request-id'] as string
          ));
          return;
        }
      }

      res.status(500).json(createErrorResponse(
        'MESSAGE_SEND_ERROR',
        'Failed to send secure message',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Get secure messages
 * GET /api/secure-communication/messages
 */
router.get('/messages',
  auditDataAccess('secure_messages', 'read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { conversationWith, password } = req.query;
      const userId = req.user!.userId;

      if (!password || typeof password !== 'string') {
        res.status(400).json(createErrorResponse(
          'PASSWORD_REQUIRED',
          'Password is required to decrypt messages',
          req.headers['x-request-id'] as string
        ));
        return;
      }

      const messages = await SecureCommunicationService.getSecureMessages(
        userId,
        password,
        conversationWith as string | undefined
      );

      res.json(createSuccessResponse({
        messages: messages.map(msg => ({
          id: msg.id,
          senderId: msg.senderId,
          recipientId: msg.recipientId,
          decryptedContent: msg.decryptedContent,
          messageType: msg.messageType,
          timestamp: msg.timestamp,
          isRead: msg.isRead,
          isVerified: msg.isVerified
        })),
        count: messages.length
      }, 'Messages retrieved successfully'));
    } catch (error) {
      console.error('Message retrieval error:', error);
      
      if (error instanceof Error && error.message.includes('private key not found')) {
        res.status(401).json(createErrorResponse(
          'INVALID_PASSWORD',
          'Invalid password or user not configured for secure messaging',
          req.headers['x-request-id'] as string
        ));
        return;
      }

      res.status(500).json(createErrorResponse(
        'MESSAGE_RETRIEVAL_ERROR',
        'Failed to retrieve messages',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Mark message as read
 * PUT /api/secure-communication/messages/:messageId/read
 */
router.put('/messages/:messageId/read',
  auditDataAccess('secure_messages', 'update'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { messageId } = req.params;
      const userId = req.user!.userId;

      await SecureCommunicationService.markMessageAsRead(messageId, userId);

      res.json(createSuccessResponse(
        { messageId, isRead: true },
        'Message marked as read'
      ));
    } catch (error) {
      console.error('Mark message as read error:', error);
      res.status(500).json(createErrorResponse(
        'MESSAGE_UPDATE_ERROR',
        'Failed to mark message as read',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Delete secure message
 * DELETE /api/secure-communication/messages/:messageId
 */
router.delete('/messages/:messageId',
  auditDataAccess('secure_messages', 'delete'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { messageId } = req.params;
      const userId = req.user!.userId;

      await SecureCommunicationService.deleteSecureMessage(messageId, userId);

      res.json(createSuccessResponse(
        { messageId, deleted: true },
        'Message deleted successfully'
      ));
    } catch (error) {
      console.error('Message deletion error:', error);
      
      if (error instanceof Error && error.message.includes('access denied')) {
        res.status(403).json(createErrorResponse(
          'ACCESS_DENIED',
          'Access denied or message not found',
          req.headers['x-request-id'] as string
        ));
        return;
      }

      res.status(500).json(createErrorResponse(
        'MESSAGE_DELETE_ERROR',
        'Failed to delete message',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Get conversation participants
 * GET /api/secure-communication/conversations
 */
router.get('/conversations',
  auditDataAccess('secure_messages', 'read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const participants = await SecureCommunicationService.getConversationParticipants(userId);

      res.json(createSuccessResponse({
        participants,
        count: participants.length
      }, 'Conversation participants retrieved successfully'));
    } catch (error) {
      console.error('Conversation participants error:', error);
      res.status(500).json(createErrorResponse(
        'CONVERSATIONS_ERROR',
        'Failed to retrieve conversation participants',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Get unread message count
 * GET /api/secure-communication/unread-count
 */
router.get('/unread-count',
  auditDataAccess('secure_messages', 'read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const unreadCount = await SecureCommunicationService.getUnreadMessageCount(userId);

      res.json(createSuccessResponse({
        unreadCount
      }, 'Unread message count retrieved successfully'));
    } catch (error) {
      console.error('Unread count error:', error);
      res.status(500).json(createErrorResponse(
        'UNREAD_COUNT_ERROR',
        'Failed to retrieve unread message count',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

export default router;