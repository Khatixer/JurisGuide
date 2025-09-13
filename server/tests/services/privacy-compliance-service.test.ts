import { PrivacyComplianceService } from '../../services/privacy-compliance-service';
import { pool } from '../../database/config';

// Mock database
jest.mock('../../database/config', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  }
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('PrivacyComplianceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDataSubjectRequest', () => {
    test('should create data subject request successfully', async () => {
      const userId = 'user-123';
      const requestType = 'export';
      const requestDetails = { reason: 'GDPR compliance' };

      mockPool.query
        .mockResolvedValueOnce({ // Insert request
          rows: [{ id: 'request-123' }]
        } as any)
        .mockResolvedValueOnce({} as any); // Log activity

      const result = await PrivacyComplianceService.createDataSubjectRequest(
        userId,
        requestType,
        requestDetails
      );

      expect(result.userId).toBe(userId);
      expect(result.requestType).toBe(requestType);
      expect(result.status).toBe('pending');
      expect(result.requestDetails).toEqual(requestDetails);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('should handle different request types', async () => {
      const userId = 'user-123';
      const requestTypes = ['export', 'delete', 'anonymize', 'rectify', 'restrict'] as const;

      for (const requestType of requestTypes) {
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ id: `request-${requestType}` }] } as any)
          .mockResolvedValueOnce({} as any);

        const result = await PrivacyComplianceService.createDataSubjectRequest(
          userId,
          requestType
        );

        expect(result.requestType).toBe(requestType);
      }
    });
  });

  describe('recordConsent', () => {
    test('should record user consent successfully', async () => {
      const userId = 'user-123';
      const consentType = 'marketing';
      const purpose = 'Email marketing campaigns';
      const granted = true;
      const legalBasis = 'consent';
      const version = '1.0';

      mockPool.query
        .mockResolvedValueOnce({ // Insert consent
          rows: [{ id: 'consent-123' }]
        } as any)
        .mockResolvedValueOnce({} as any); // Log activity

      const result = await PrivacyComplianceService.recordConsent(
        userId,
        consentType,
        purpose,
        granted,
        legalBasis,
        version
      );

      expect(result.userId).toBe(userId);
      expect(result.consentType).toBe(consentType);
      expect(result.purpose).toBe(purpose);
      expect(result.granted).toBe(granted);
      expect(result.legalBasis).toBe(legalBasis);
      expect(result.version).toBe(version);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('should record consent revocation', async () => {
      const userId = 'user-123';
      const consentType = 'analytics';
      const purpose = 'Website analytics';
      const granted = false;
      const legalBasis = 'consent';

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'consent-456' }] } as any)
        .mockResolvedValueOnce({} as any);

      const result = await PrivacyComplianceService.recordConsent(
        userId,
        consentType,
        purpose,
        granted,
        legalBasis
      );

      expect(result.granted).toBe(false);
      expect(result.revokedAt).toBeInstanceOf(Date);
      expect(result.grantedAt).toBeUndefined();
    });
  });

  describe('revokeConsent', () => {
    test('should revoke user consent successfully', async () => {
      const userId = 'user-123';
      const consentType = 'marketing';

      mockPool.query
        .mockResolvedValueOnce({} as any) // Update consent
        .mockResolvedValueOnce({} as any); // Log activity

      await PrivacyComplianceService.revokeConsent(userId, consentType);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_consents'),
        [userId, consentType]
      );
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserConsents', () => {
    test('should retrieve user consents successfully', async () => {
      const userId = 'user-123';
      const mockConsents = [
        {
          id: 'consent-1',
          user_id: userId,
          consent_type: 'marketing',
          purpose: 'Email marketing',
          granted: true,
          granted_at: new Date(),
          revoked_at: null,
          version: '1.0',
          legal_basis: 'consent',
          metadata: null
        },
        {
          id: 'consent-2',
          user_id: userId,
          consent_type: 'analytics',
          purpose: 'Website analytics',
          granted: false,
          granted_at: null,
          revoked_at: new Date(),
          version: '1.0',
          legal_basis: 'consent',
          metadata: JSON.stringify({ source: 'website' })
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockConsents
      } as any);

      const result = await PrivacyComplianceService.getUserConsents(userId);

      expect(result).toHaveLength(2);
      expect(result[0].consentType).toBe('marketing');
      expect(result[0].granted).toBe(true);
      expect(result[1].consentType).toBe('analytics');
      expect(result[1].granted).toBe(false);
      expect(result[1].metadata).toEqual({ source: 'website' });
    });

    test('should return empty array for user with no consents', async () => {
      const userId = 'user-456';

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      const result = await PrivacyComplianceService.getUserConsents(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('hasValidConsent', () => {
    test('should return true for valid consent', async () => {
      const userId = 'user-123';
      const consentType = 'marketing';

      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '1' }]
      } as any);

      const result = await PrivacyComplianceService.hasValidConsent(userId, consentType);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [userId, consentType]
      );
    });

    test('should return false for no valid consent', async () => {
      const userId = 'user-123';
      const consentType = 'analytics';

      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '0' }]
      } as any);

      const result = await PrivacyComplianceService.hasValidConsent(userId, consentType);

      expect(result).toBe(false);
    });
  });

  describe('logDataProcessingActivity', () => {
    test('should log data processing activity successfully', async () => {
      const userId = 'user-123';
      const activity = 'data_export_requested';
      const details = { requestId: 'request-123', format: 'JSON' };

      mockPool.query.mockResolvedValueOnce({} as any);

      await PrivacyComplianceService.logDataProcessingActivity(userId, activity, details);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO data_processing_log'),
        expect.arrayContaining([
          expect.any(String), // UUID
          userId,
          activity,
          JSON.stringify(details),
          expect.any(Date)
        ])
      );
    });

    test('should handle logging without details', async () => {
      const userId = 'user-123';
      const activity = 'consent_granted';

      mockPool.query.mockResolvedValueOnce({} as any);

      await PrivacyComplianceService.logDataProcessingActivity(userId, activity);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO data_processing_log'),
        expect.arrayContaining([
          expect.any(String),
          userId,
          activity,
          null,
          expect.any(Date)
        ])
      );
    });
  });

  describe('getDataProcessingLog', () => {
    test('should retrieve data processing log successfully', async () => {
      const userId = 'user-123';
      const limit = 50;
      const mockLog = [
        {
          id: 'log-1',
          user_id: userId,
          activity: 'consent_granted',
          details: JSON.stringify({ consentType: 'marketing' }),
          timestamp: new Date()
        },
        {
          id: 'log-2',
          user_id: userId,
          activity: 'data_export_requested',
          details: JSON.stringify({ requestId: 'request-123' }),
          timestamp: new Date()
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockLog
      } as any);

      const result = await PrivacyComplianceService.getDataProcessingLog(userId, limit);

      expect(result).toHaveLength(2);
      expect(result[0].activity).toBe('consent_granted');
      expect(result[1].activity).toBe('data_export_requested');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp DESC'),
        [userId, limit]
      );
    });

    test('should use default limit when not specified', async () => {
      const userId = 'user-123';

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await PrivacyComplianceService.getDataProcessingLog(userId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [userId, 100] // Default limit
      );
    });
  });

  describe('createRetentionPolicy', () => {
    test('should create retention policy successfully', async () => {
      const policy = {
        entityType: 'users',
        retentionPeriodDays: 2555,
        legalBasis: 'GDPR Article 5(1)(e)',
        deletionCriteria: 'Delete after 7 years of inactivity',
        isActive: true
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await PrivacyComplianceService.createRetentionPolicy(policy);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO data_retention_policies'),
        [
          policy.entityType,
          policy.retentionPeriodDays,
          policy.legalBasis,
          policy.deletionCriteria,
          policy.isActive
        ]
      );
    });
  });

  describe('processDataExportRequest', () => {
    test('should process data export request successfully', async () => {
      const requestId = 'request-123';
      const userId = 'user-123';

      // Mock request status updates
      mockPool.query
        .mockResolvedValueOnce({} as any) // Update to processing
        .mockResolvedValueOnce({ // Get request
          rows: [{ 
            id: requestId, 
            user_id: userId, 
            request_type: 'export',
            status: 'processing'
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [{ id: userId }] } as any) // User data
        .mockResolvedValueOnce({ rows: [] } as any) // Legal queries
        .mockResolvedValueOnce({ rows: [] } as any) // Mediation cases
        .mockResolvedValueOnce({ rows: [] } as any) // Messages
        .mockResolvedValueOnce({ rows: [] } as any) // Consents
        .mockResolvedValueOnce({ rows: [] } as any) // Processing log
        .mockResolvedValueOnce({ // Insert export
          rows: [{ id: 'export-123' }]
        } as any)
        .mockResolvedValueOnce({} as any); // Update to completed

      const result = await PrivacyComplianceService.processDataExportRequest(requestId);

      expect(result.exportId).toBeDefined();
      expect(result.downloadUrl).toContain('/api/privacy/export/');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockPool.query).toHaveBeenCalledTimes(9);
    });

    test('should handle request not found', async () => {
      const requestId = 'non-existent-request';

      mockPool.query
        .mockResolvedValueOnce({} as any) // Update to processing
        .mockResolvedValueOnce({ rows: [] } as any); // Get request (not found)

      await expect(
        PrivacyComplianceService.processDataExportRequest(requestId)
      ).rejects.toThrow('Request not found');
    });
  });

  describe('processDataDeletionRequest', () => {
    test('should process data deletion request successfully', async () => {
      const requestId = 'request-123';
      const userId = 'user-123';

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      // Mock request status updates and deletion process
      mockPool.query
        .mockResolvedValueOnce({} as any) // Update to processing
        .mockResolvedValueOnce({ // Get request
          rows: [{ 
            id: requestId, 
            user_id: userId, 
            request_type: 'delete',
            status: 'processing'
          }]
        } as any)
        .mockResolvedValueOnce({} as any); // Update to completed

      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({} as any) // Insert anonymization log
        .mockResolvedValueOnce({} as any) // Delete secure messages
        .mockResolvedValueOnce({} as any) // Delete user key pairs
        .mockResolvedValueOnce({} as any) // Delete user consents
        .mockResolvedValueOnce({} as any) // Delete data subject requests
        .mockResolvedValueOnce({} as any) // Delete processing log
        .mockResolvedValueOnce({} as any) // Delete legal queries
        .mockResolvedValueOnce({} as any) // Delete mediation cases
        .mockResolvedValueOnce({} as any) // Delete encrypted data
        .mockResolvedValueOnce({} as any) // Delete user
        .mockResolvedValueOnce({} as any); // COMMIT

      await PrivacyComplianceService.processDataDeletionRequest(requestId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });
  });
});