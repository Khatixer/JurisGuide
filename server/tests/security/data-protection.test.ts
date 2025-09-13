import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { testDb } from '../setup';
import { EncryptionService } from '../../utils/encryption';
import { PrivacyComplianceService } from '../../services/privacy-compliance-service';
import authRoutes from '../../routes/auth';
import privacyRoutes from '../../routes/privacy-compliance';
import authMiddleware from '../../middleware/auth';

describe('Data Protection and Privacy Tests', () => {
  let app: express.Application;
  let encryptionService: EncryptionService;
  let privacyService: PrivacyComplianceService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/privacy', authMiddleware, privacyRoutes);

    encryptionService = new EncryptionService();
    privacyService = new PrivacyComplianceService();

    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `privacy-test-${Date.now()}@example.com`,
        password: 'PrivacyTest123!',
        profile: {
          firstName: 'Privacy',
          lastName: 'Test',
          location: { country: 'US', state: 'CA', city: 'Test' },
          culturalBackground: 'Western',
          preferredLanguage: 'en',
          timezone: 'America/Los_Angeles'
        }
      });

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  describe('Data Encryption', () => {
    test('should encrypt sensitive data at rest', async () => {
      const sensitiveData = {
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111',
        personalNote: 'This is confidential legal information'
      };

      // Store encrypted data
      const encryptedData = await encryptionService.encrypt(JSON.stringify(sensitiveData));
      
      // Verify data is actually encrypted
      expect(encryptedData).not.toContain(sensitiveData.ssn);
      expect(encryptedData).not.toContain(sensitiveData.creditCard);
      expect(encryptedData).not.toContain(sensitiveData.personalNote);

      // Verify we can decrypt it back
      const decryptedData = JSON.parse(await encryptionService.decrypt(encryptedData));
      expect(decryptedData.ssn).toBe(sensitiveData.ssn);
      expect(decryptedData.creditCard).toBe(sensitiveData.creditCard);
      expect(decryptedData.personalNote).toBe(sensitiveData.personalNote);
    });

    test('should use AES-256 encryption', () => {
      const algorithm = encryptionService.getAlgorithm();
      expect(algorithm).toBe('aes-256-gcm');
    });

    test('should generate unique initialization vectors', async () => {
      const data = 'Test data for IV uniqueness';
      
      const encrypted1 = await encryptionService.encrypt(data);
      const encrypted2 = await encryptionService.encrypt(data);
      
      // Same data should produce different encrypted outputs due to unique IVs
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same original data
      const decrypted1 = await encryptionService.decrypt(encrypted1);
      const decrypted2 = await encryptionService.decrypt(encrypted2);
      
      expect(decrypted1).toBe(data);
      expect(decrypted2).toBe(data);
    });

    test('should handle encryption key rotation', async () => {
      const originalData = 'Data encrypted with old key';
      
      // Encrypt with current key
      const encrypted = await encryptionService.encrypt(originalData);
      
      // Simulate key rotation
      await encryptionService.rotateKey();
      
      // Should still be able to decrypt old data
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(originalData);
      
      // New encryptions should use new key
      const newEncrypted = await encryptionService.encrypt(originalData);
      expect(newEncrypted).not.toBe(encrypted);
    });
  });

  describe('Data Anonymization', () => {
    test('should anonymize personally identifiable information', async () => {
      const personalData = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1-555-123-4567',
        address: '123 Main St, Anytown, CA 12345',
        ssn: '123-45-6789'
      };

      const anonymizedData = await privacyService.anonymizeData(personalData);

      // PII should be anonymized
      expect(anonymizedData.email).not.toBe(personalData.email);
      expect(anonymizedData.firstName).not.toBe(personalData.firstName);
      expect(anonymizedData.lastName).not.toBe(personalData.lastName);
      expect(anonymizedData.phone).not.toBe(personalData.phone);
      expect(anonymizedData.ssn).not.toBe(personalData.ssn);

      // Should maintain data structure and types
      expect(typeof anonymizedData.email).toBe('string');
      expect(anonymizedData.email).toMatch(/@/); // Still looks like an email
      expect(typeof anonymizedData.firstName).toBe('string');
      expect(anonymizedData.firstName.length).toBeGreaterThan(0);
    });

    test('should preserve data utility while anonymizing', async () => {
      const userData = {
        age: 35,
        location: { country: 'US', state: 'CA', city: 'San Francisco' },
        caseCategory: 'employment-law',
        urgency: 'high',
        culturalBackground: 'Western'
      };

      const anonymizedData = await privacyService.anonymizeData(userData);

      // Non-PII data should be preserved for analytics
      expect(anonymizedData.age).toBe(userData.age);
      expect(anonymizedData.location.country).toBe(userData.location.country);
      expect(anonymizedData.caseCategory).toBe(userData.caseCategory);
      expect(anonymizedData.urgency).toBe(userData.urgency);
      expect(anonymizedData.culturalBackground).toBe(userData.culturalBackground);
    });

    test('should generate consistent anonymized identifiers', async () => {
      const originalId = 'user-12345';
      
      const anonymized1 = await privacyService.anonymizeIdentifier(originalId);
      const anonymized2 = await privacyService.anonymizeIdentifier(originalId);
      
      // Same input should produce same anonymized output
      expect(anonymized1).toBe(anonymized2);
      
      // But should be different from original
      expect(anonymized1).not.toBe(originalId);
      
      // Should be deterministic but not reversible
      expect(anonymized1).toMatch(/^anon_[a-f0-9]{32}$/);
    });
  });

  describe('GDPR Compliance', () => {
    test('should provide data export functionality', async () => {
      const response = await request(app)
        .get('/api/privacy/export-data')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userData).toBeDefined();
      expect(response.body.userData.profile).toBeDefined();
      expect(response.body.userData.legalQueries).toBeDefined();
      expect(response.body.userData.mediationCases).toBeDefined();
      
      // Should include all user data
      expect(response.body.userData.profile.firstName).toBe('Privacy');
      expect(response.body.userData.profile.lastName).toBe('Test');
    });

    test('should handle data deletion requests', async () => {
      // Create a separate user for deletion test
      const deleteUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: `delete-test-${Date.now()}@example.com`,
          password: 'DeleteTest123!',
          profile: {
            firstName: 'Delete',
            lastName: 'Test',
            location: { country: 'US', state: 'CA', city: 'Test' },
            culturalBackground: 'Western',
            preferredLanguage: 'en',
            timezone: 'America/Los_Angeles'
          }
        });

      const deleteToken = deleteUserResponse.body.token;
      const deleteUserId = deleteUserResponse.body.user.id;

      // Request data deletion
      const deleteResponse = await request(app)
        .delete('/api/privacy/delete-account')
        .set('Authorization', `Bearer ${deleteToken}`)
        .send({ confirmDeletion: true });

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toMatch(/deletion.*scheduled|account.*deleted/i);

      // Verify user data is marked for deletion or removed
      const userCheck = await testDb.query('SELECT * FROM users WHERE id = $1', [deleteUserId]);
      expect(userCheck.rows.length).toBe(0);
    });

    test('should handle data portability requests', async () => {
      const response = await request(app)
        .post('/api/privacy/request-portability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'json' });

      expect(response.status).toBe(202);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.message).toMatch(/portability.*request.*submitted/i);
    });

    test('should provide consent management', async () => {
      const consentData = {
        dataProcessing: true,
        marketing: false,
        analytics: true,
        thirdPartySharing: false
      };

      const response = await request(app)
        .put('/api/privacy/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consentData);

      expect(response.status).toBe(200);
      expect(response.body.consent).toEqual(consentData);

      // Verify consent is stored
      const getConsentResponse = await request(app)
        .get('/api/privacy/consent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getConsentResponse.status).toBe(200);
      expect(getConsentResponse.body.consent).toEqual(consentData);
    });

    test('should maintain audit trail for data access', async () => {
      // Access user data
      await request(app)
        .get('/api/privacy/export-data')
        .set('Authorization', `Bearer ${authToken}`);

      // Check audit trail
      const auditResponse = await request(app)
        .get('/api/privacy/audit-trail')
        .set('Authorization', `Bearer ${authToken}`);

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.body.auditTrail).toBeDefined();
      expect(Array.isArray(auditResponse.body.auditTrail)).toBe(true);

      const latestEntry = auditResponse.body.auditTrail[0];
      expect(latestEntry.action).toBe('data_export');
      expect(latestEntry.timestamp).toBeDefined();
      expect(latestEntry.userId).toBe(userId);
    });
  });

  describe('Data Retention Policies', () => {
    test('should enforce data retention periods', async () => {
      // Create old data that should be purged
      const oldTimestamp = new Date(Date.now() - (366 * 24 * 60 * 60 * 1000)); // 366 days ago
      
      await testDb.query(
        'INSERT INTO audit_logs (user_id, action, timestamp, details) VALUES ($1, $2, $3, $4)',
        [userId, 'test_action', oldTimestamp, JSON.stringify({ test: 'data' })]
      );

      // Run data retention cleanup
      const cleanupResponse = await request(app)
        .post('/api/privacy/cleanup-expired-data')
        .set('Authorization', `Bearer ${authToken}`);

      expect(cleanupResponse.status).toBe(200);
      expect(cleanupResponse.body.deletedRecords).toBeGreaterThan(0);

      // Verify old data is removed
      const auditCheck = await testDb.query(
        'SELECT * FROM audit_logs WHERE user_id = $1 AND timestamp < $2',
        [userId, new Date(Date.now() - (365 * 24 * 60 * 60 * 1000))]
      );
      expect(auditCheck.rows.length).toBe(0);
    });

    test('should preserve data within retention period', async () => {
      const recentTimestamp = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
      
      await testDb.query(
        'INSERT INTO audit_logs (user_id, action, timestamp, details) VALUES ($1, $2, $3, $4)',
        [userId, 'recent_action', recentTimestamp, JSON.stringify({ test: 'recent' })]
      );

      // Run cleanup
      await request(app)
        .post('/api/privacy/cleanup-expired-data')
        .set('Authorization', `Bearer ${authToken}`);

      // Verify recent data is preserved
      const auditCheck = await testDb.query(
        'SELECT * FROM audit_logs WHERE user_id = $1 AND action = $2',
        [userId, 'recent_action']
      );
      expect(auditCheck.rows.length).toBe(1);
    });
  });

  describe('Secure Communication', () => {
    test('should encrypt communications between parties', async () => {
      const message = {
        content: 'This is a confidential legal communication',
        recipientId: 'recipient-user-id',
        caseId: 'test-case-id'
      };

      // Send encrypted message
      const response = await request(app)
        .post('/api/secure-communication/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(message);

      expect(response.status).toBe(201);
      expect(response.body.messageId).toBeDefined();

      // Verify message is encrypted in storage
      const storedMessage = await testDb.query(
        'SELECT encrypted_content FROM secure_messages WHERE id = $1',
        [response.body.messageId]
      );

      const encryptedContent = storedMessage.rows[0]?.encrypted_content;
      expect(encryptedContent).toBeDefined();
      expect(encryptedContent).not.toContain(message.content);
    });

    test('should implement end-to-end encryption for sensitive data', async () => {
      const sensitiveDocument = {
        title: 'Confidential Legal Document',
        content: 'This document contains sensitive legal information',
        caseId: 'test-case-id'
      };

      const response = await request(app)
        .post('/api/secure-communication/upload-document')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sensitiveDocument);

      expect(response.status).toBe(201);
      expect(response.body.documentId).toBeDefined();

      // Verify document is encrypted
      const storedDoc = await testDb.query(
        'SELECT encrypted_content FROM secure_documents WHERE id = $1',
        [response.body.documentId]
      );

      const encryptedContent = storedDoc.rows[0]?.encrypted_content;
      expect(encryptedContent).not.toContain(sensitiveDocument.content);
      expect(encryptedContent).not.toContain(sensitiveDocument.title);
    });
  });

  describe('Access Control and Authorization', () => {
    test('should enforce role-based access control', async () => {
      // Try to access admin endpoint with regular user token
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/forbidden|unauthorized|access.*denied/i);
    });

    test('should validate resource ownership', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other-user-${Date.now()}@example.com`,
          password: 'OtherUser123!',
          profile: {
            firstName: 'Other',
            lastName: 'User',
            location: { country: 'US', state: 'CA', city: 'Test' },
            culturalBackground: 'Western',
            preferredLanguage: 'en',
            timezone: 'America/Los_Angeles'
          }
        });

      const otherUserToken = otherUserResponse.body.token;

      // Try to access first user's data with second user's token
      const response = await request(app)
        .get('/api/privacy/export-data')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(200);
      
      // Should only return the second user's data, not the first user's
      expect(response.body.userData.profile.firstName).toBe('Other');
      expect(response.body.userData.profile.firstName).not.toBe('Privacy');
    });
  });
});