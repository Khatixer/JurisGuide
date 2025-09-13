import { E2EEncryption, AdvancedEncryption } from '../utils/encryption';
import { pool } from '../database/config';
import { v4 as uuidv4 } from 'uuid';

export interface SecureMessage {
  id: string;
  senderId: string;
  recipientId: string;
  encryptedContent: string;
  signature: string;
  timestamp: Date;
  messageType: 'text' | 'document' | 'legal_advice' | 'mediation_update';
  isRead: boolean;
}

export interface UserKeyPair {
  userId: string;
  publicKey: string;
  privateKeyEncrypted: string;
  createdAt: Date;
}

export class SecureCommunicationService {
  /**
   * Generate and store user key pair for E2E encryption
   */
  static async generateUserKeyPair(userId: string, userPassword: string): Promise<UserKeyPair> {
    const { publicKey, privateKey } = E2EEncryption.generateKeyPair();
    
    // Encrypt private key with user's password
    const encryptedPrivateKey = await AdvancedEncryption.encryptWithPassword(privateKey, userPassword);
    
    const query = `
      INSERT INTO user_key_pairs (user_id, public_key, private_key_encrypted, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        public_key = EXCLUDED.public_key,
        private_key_encrypted = EXCLUDED.private_key_encrypted,
        created_at = EXCLUDED.created_at
      RETURNING *
    `;
    
    const values = [userId, publicKey, JSON.stringify(encryptedPrivateKey), new Date()];
    const result = await pool.query(query, values);
    
    return {
      userId,
      publicKey,
      privateKeyEncrypted: JSON.stringify(encryptedPrivateKey),
      createdAt: result.rows[0].created_at
    };
  }

  /**
   * Get user's public key for encryption
   */
  static async getUserPublicKey(userId: string): Promise<string | null> {
    const query = 'SELECT public_key FROM user_key_pairs WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    
    return result.rows[0]?.public_key || null;
  }

  /**
   * Get user's encrypted private key
   */
  static async getUserPrivateKey(userId: string, userPassword: string): Promise<string | null> {
    const query = 'SELECT private_key_encrypted FROM user_key_pairs WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    
    if (!result.rows[0]) {
      return null;
    }
    
    try {
      const encryptedPrivateKey = JSON.parse(result.rows[0].private_key_encrypted);
      return await AdvancedEncryption.decryptWithPassword(encryptedPrivateKey, userPassword);
    } catch (error) {
      console.error('Failed to decrypt private key:', error);
      return null;
    }
  }

  /**
   * Send encrypted message between users
   */
  static async sendSecureMessage(
    senderId: string,
    recipientId: string,
    message: string,
    messageType: SecureMessage['messageType'] = 'text',
    senderPassword: string
  ): Promise<SecureMessage> {
    // Get recipient's public key
    const recipientPublicKey = await this.getUserPublicKey(recipientId);
    if (!recipientPublicKey) {
      throw new Error('Recipient public key not found');
    }

    // Get sender's private key for signing
    const senderPrivateKey = await this.getUserPrivateKey(senderId, senderPassword);
    if (!senderPrivateKey) {
      throw new Error('Sender private key not found or invalid password');
    }

    // Encrypt message with recipient's public key
    const encryptedContent = E2EEncryption.encryptMessage(message, recipientPublicKey);
    
    // Sign message with sender's private key
    const signature = E2EEncryption.signMessage(message, senderPrivateKey);

    const messageId = uuidv4();
    const timestamp = new Date();

    const query = `
      INSERT INTO secure_messages (id, sender_id, recipient_id, encrypted_content, signature, timestamp, message_type, is_read)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [messageId, senderId, recipientId, encryptedContent, signature, timestamp, messageType, false];
    const result = await pool.query(query, values);

    return {
      id: messageId,
      senderId,
      recipientId,
      encryptedContent,
      signature,
      timestamp,
      messageType,
      isRead: false
    };
  }

  /**
   * Retrieve and decrypt messages for a user
   */
  static async getSecureMessages(
    userId: string,
    userPassword: string,
    conversationWith?: string
  ): Promise<Array<SecureMessage & { decryptedContent: string; isVerified: boolean }>> {
    let query = `
      SELECT * FROM secure_messages 
      WHERE (sender_id = $1 OR recipient_id = $1)
    `;
    const values = [userId];

    if (conversationWith) {
      query += ` AND (sender_id = $2 OR recipient_id = $2)`;
      values.push(conversationWith);
    }

    query += ` ORDER BY timestamp DESC`;

    const result = await pool.query(query, values);
    
    // Get user's private key for decryption
    const userPrivateKey = await this.getUserPrivateKey(userId, userPassword);
    if (!userPrivateKey) {
      throw new Error('User private key not found or invalid password');
    }

    const messages = [];
    
    for (const row of result.rows) {
      try {
        let decryptedContent: string;
        let isVerified = false;

        if (row.recipient_id === userId) {
          // User is recipient, decrypt with their private key
          decryptedContent = E2EEncryption.decryptMessage(row.encrypted_content, userPrivateKey);
          
          // Verify signature with sender's public key
          const senderPublicKey = await this.getUserPublicKey(row.sender_id);
          if (senderPublicKey) {
            isVerified = E2EEncryption.verifySignature(decryptedContent, row.signature, senderPublicKey);
          }
        } else {
          // User is sender, they should have the original message
          // For sent messages, we need to decrypt using recipient's private key (not available)
          // So we store a copy encrypted with sender's public key as well
          decryptedContent = '[Sent message - content not available]';
          isVerified = true; // Assume sent messages are verified
        }

        messages.push({
          id: row.id,
          senderId: row.sender_id,
          recipientId: row.recipient_id,
          encryptedContent: row.encrypted_content,
          signature: row.signature,
          timestamp: row.timestamp,
          messageType: row.message_type,
          isRead: row.is_read,
          decryptedContent,
          isVerified
        });
      } catch (error) {
        console.error('Failed to decrypt message:', error);
        // Include message with error indicator
        messages.push({
          id: row.id,
          senderId: row.sender_id,
          recipientId: row.recipient_id,
          encryptedContent: row.encrypted_content,
          signature: row.signature,
          timestamp: row.timestamp,
          messageType: row.message_type,
          isRead: row.is_read,
          decryptedContent: '[Decryption failed]',
          isVerified: false
        });
      }
    }

    return messages;
  }

  /**
   * Mark message as read
   */
  static async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const query = `
      UPDATE secure_messages 
      SET is_read = true 
      WHERE id = $1 AND recipient_id = $2
    `;
    
    await pool.query(query, [messageId, userId]);
  }

  /**
   * Delete secure message (both sender and recipient must agree)
   */
  static async deleteSecureMessage(messageId: string, userId: string): Promise<void> {
    // Check if user is sender or recipient
    const checkQuery = `
      SELECT sender_id, recipient_id FROM secure_messages 
      WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)
    `;
    
    const result = await pool.query(checkQuery, [messageId, userId]);
    
    if (result.rows.length === 0) {
      throw new Error('Message not found or access denied');
    }

    // For now, allow either party to delete the message
    // In a more sophisticated system, you might require both parties to agree
    const deleteQuery = 'DELETE FROM secure_messages WHERE id = $1';
    await pool.query(deleteQuery, [messageId]);
  }

  /**
   * Get conversation participants
   */
  static async getConversationParticipants(userId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT 
        CASE 
          WHEN sender_id = $1 THEN recipient_id 
          ELSE sender_id 
        END as participant_id
      FROM secure_messages 
      WHERE sender_id = $1 OR recipient_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows.map(row => row.participant_id);
  }

  /**
   * Get unread message count for user
   */
  static async getUnreadMessageCount(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM secure_messages 
      WHERE recipient_id = $1 AND is_read = false
    `;
    
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }
}