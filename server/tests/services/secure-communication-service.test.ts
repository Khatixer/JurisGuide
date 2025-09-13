import { SecureCommunicationService } from '../../services/secure-communication-service';
import { pool } from '../../database/config';
import { initializeEncryption } from '../../utils/encryption';

// Mock environment variables
process.env.ENCRYPTION_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.ANONYMIZATION_SALT = 'test-salt-for-anonymization';

// Mock database queries
jest.mock('../../database/config', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  }
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('SecureCommunicationService', () => {
  beforeAll(() => {
    initializeEncryption();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateUserKeyPair', () => {
    test('should generate and store user key pair', async () => {
      const userId = 'user-123';
      const userPassword = 'SecurePassword123!';
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ created_at: new Date() }]
      } as any);

      const result = await SecureCommunicationService.generateUserKeyPair(userId, userPassword);

      expect(result.userId).toBe(userId);
      expect(result.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result.privateKeyEncrypted).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_key_pairs'),
        expect.arrayContaining([userId, expect.any(String), expect.any(String), expect.any(Date)])
      );
    });

    test('should handle database errors', async () => {
      const userId = 'user-123';
      const userPassword = 'SecurePassword123!';
      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        SecureCommunicationService.generateUserKeyPair(userId, userPassword)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getUserPublicKey', () => {
    test('should retrieve user public key', async () => {
      const userId = 'user-123';
      const publicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----';
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ public_key: publicKey }]
      } as any);

      const result = await SecureCommunicationService.getUserPublicKey(userId);

      expect(result).toBe(publicKey);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT public_key FROM user_key_pairs WHERE user_id = $1',
        [userId]
      );
    });

    test('should return null for non-existent user', async () => {
      const userId = 'non-existent-user';
      
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      const result = await SecureCommunicationService.getUserPublicKey(userId);

      expect(result).toBeNull();
    });
  });

  describe('getUserPrivateKey', () => {
    test('should retrieve and decrypt user private key', async () => {
      const userId = 'user-123';
      const userPassword = 'SecurePassword123!';
      
      // First generate a key pair to get valid encrypted private key
      const keyPair = await SecureCommunicationService.generateUserKeyPair(userId, userPassword);
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ private_key_encrypted: keyPair.privateKeyEncrypted }]
      } as any);

      const result = await SecureCommunicationService.getUserPrivateKey(userId, userPassword);

      expect(result).toContain('-----BEGIN PRIVATE KEY-----');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT private_key_encrypted FROM user_key_pairs WHERE user_id = $1',
        [userId]
      );
    });

    test('should return null for wrong password', async () => {
      const userId = 'user-123';
      const correctPassword = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword123!';
      
      // Generate key pair with correct password
      const keyPair = await SecureCommunicationService.generateUserKeyPair(userId, correctPassword);
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ private_key_encrypted: keyPair.privateKeyEncrypted }]
      } as any);

      const result = await SecureCommunicationService.getUserPrivateKey(userId, wrongPassword);

      expect(result).toBeNull();
    });

    test('should return null for non-existent user', async () => {
      const userId = 'non-existent-user';
      const userPassword = 'Password123!';
      
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      const result = await SecureCommunicationService.getUserPrivateKey(userId, userPassword);

      expect(result).toBeNull();
    });
  });

  describe('sendSecureMessage', () => {
    test('should send encrypted message between users', async () => {
      const senderId = 'sender-123';
      const recipientId = 'recipient-456';
      const message = 'This is a confidential legal message';
      const senderPassword = 'SenderPassword123!';
      
      // Setup: Generate key pairs for both users
      const senderKeyPair = await SecureCommunicationService.generateUserKeyPair(senderId, senderPassword);
      const recipientKeyPair = await SecureCommunicationService.generateUserKeyPair(recipientId, 'RecipientPassword123!');
      
      // Mock database calls
      mockPool.query
        .mockResolvedValueOnce({ // Get recipient public key
          rows: [{ public_key: recipientKeyPair.publicKey }]
        } as any)
        .mockResolvedValueOnce({ // Get sender private key
          rows: [{ private_key_encrypted: senderKeyPair.privateKeyEncrypted }]
        } as any)
        .mockResolvedValueOnce({ // Insert message
          rows: [{ id: 'message-123' }]
        } as any);

      const result = await SecureCommunicationService.sendSecureMessage(
        senderId,
        recipientId,
        message,
        'text',
        senderPassword
      );

      expect(result.senderId).toBe(senderId);
      expect(result.recipientId).toBe(recipientId);
      expect(result.encryptedContent).toBeDefined();
      expect(result.encryptedContent).not.toBe(message);
      expect(result.signature).toBeDefined();
      expect(result.messageType).toBe('text');
      expect(result.isRead).toBe(false);

      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    test('should throw error if recipient public key not found', async () => {
      const senderId = 'sender-123';
      const recipientId = 'non-existent-recipient';
      const message = 'Test message';
      const senderPassword = 'Password123!';
      
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await expect(
        SecureCommunicationService.sendSecureMessage(senderId, recipientId, message, 'text', senderPassword)
      ).rejects.toThrow('Recipient public key not found');
    });

    test('should throw error if sender private key not found', async () => {
      const senderId = 'sender-123';
      const recipientId = 'recipient-456';
      const message = 'Test message';
      const senderPassword = 'WrongPassword123!';
      
      const recipientKeyPair = await SecureCommunicationService.generateUserKeyPair(recipientId, 'RecipientPassword123!');
      
      mockPool.query
        .mockResolvedValueOnce({ // Get recipient public key
          rows: [{ public_key: recipientKeyPair.publicKey }]
        } as any)
        .mockResolvedValueOnce({ // Get sender private key (empty result)
          rows: []
        } as any);

      await expect(
        SecureCommunicationService.sendSecureMessage(senderId, recipientId, message, 'text', senderPassword)
      ).rejects.toThrow('Sender private key not found or invalid password');
    });
  });

  describe('getSecureMessages', () => {
    test('should retrieve and decrypt messages for user', async () => {
      const userId = 'user-123';
      const userPassword = 'UserPassword123!';
      const otherUserId = 'other-user-456';
      
      // Generate key pairs
      const userKeyPair = await SecureCommunicationService.generateUserKeyPair(userId, userPassword);
      const otherUserKeyPair = await SecureCommunicationService.generateUserKeyPair(otherUserId, 'OtherPassword123!');
      
      // Mock message data
      const mockMessages = [
        {
          id: 'message-1',
          sender_id: otherUserId,
          recipient_id: userId,
          encrypted_content: 'encrypted-content-1',
          signature: 'signature-1',
          timestamp: new Date(),
          message_type: 'text',
          is_read: false
        }
      ];
      
      mockPool.query
        .mockResolvedValueOnce({ // Get messages
          rows: mockMessages
        } as any)
        .mockResolvedValueOnce({ // Get user private key
          rows: [{ private_key_encrypted: userKeyPair.privateKeyEncrypted }]
        } as any)
        .mockResolvedValueOnce({ // Get sender public key for verification
          rows: [{ public_key: otherUserKeyPair.publicKey }]
        } as any);

      const result = await SecureCommunicationService.getSecureMessages(userId, userPassword);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('message-1');
      expect(result[0].senderId).toBe(otherUserId);
      expect(result[0].recipientId).toBe(userId);
      expect(result[0].decryptedContent).toBeDefined();
      expect(result[0].isVerified).toBeDefined();
    });

    test('should filter messages by conversation partner', async () => {
      const userId = 'user-123';
      const userPassword = 'UserPassword123!';
      const conversationWith = 'other-user-456';
      
      const userKeyPair = await SecureCommunicationService.generateUserKeyPair(userId, userPassword);
      
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any) // Get messages
        .mockResolvedValueOnce({ // Get user private key
          rows: [{ private_key_encrypted: userKeyPair.privateKeyEncrypted }]
        } as any);

      await SecureCommunicationService.getSecureMessages(userId, userPassword, conversationWith);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND (sender_id = $2 OR recipient_id = $2)'),
        [userId, conversationWith]
      );
    });
  });

  describe('markMessageAsRead', () => {
    test('should mark message as read', async () => {
      const messageId = 'message-123';
      const userId = 'user-123';
      
      mockPool.query.mockResolvedValueOnce({} as any);

      await SecureCommunicationService.markMessageAsRead(messageId, userId);

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE secure_messages SET is_read = true WHERE id = $1 AND recipient_id = $2',
        [messageId, userId]
      );
    });
  });

  describe('deleteSecureMessage', () => {
    test('should delete message if user has access', async () => {
      const messageId = 'message-123';
      const userId = 'user-123';
      
      mockPool.query
        .mockResolvedValueOnce({ // Check access
          rows: [{ sender_id: userId, recipient_id: 'other-user' }]
        } as any)
        .mockResolvedValueOnce({} as any); // Delete message

      await SecureCommunicationService.deleteSecureMessage(messageId, userId);

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM secure_messages WHERE id = $1',
        [messageId]
      );
    });

    test('should throw error if user has no access', async () => {
      const messageId = 'message-123';
      const userId = 'unauthorized-user';
      
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await expect(
        SecureCommunicationService.deleteSecureMessage(messageId, userId)
      ).rejects.toThrow('Message not found or access denied');
    });
  });

  describe('getConversationParticipants', () => {
    test('should return list of conversation participants', async () => {
      const userId = 'user-123';
      const participants = ['user-456', 'user-789'];
      
      mockPool.query.mockResolvedValueOnce({
        rows: participants.map(id => ({ participant_id: id }))
      } as any);

      const result = await SecureCommunicationService.getConversationParticipants(userId);

      expect(result).toEqual(participants);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DISTINCT'),
        [userId]
      );
    });
  });

  describe('getUnreadMessageCount', () => {
    test('should return unread message count', async () => {
      const userId = 'user-123';
      const unreadCount = 5;
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: unreadCount.toString() }]
      } as any);

      const result = await SecureCommunicationService.getUnreadMessageCount(userId);

      expect(result).toBe(unreadCount);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [userId]
      );
    });
  });
});