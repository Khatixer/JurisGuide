import { pool } from '../database/config';
import { DataAnonymization } from '../utils/encryption';
import { v4 as uuidv4 } from 'uuid';

export interface DataSubjectRequest {
  id: string;
  userId: string;
  requestType: 'export' | 'delete' | 'anonymize' | 'rectify' | 'restrict';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  requestDetails?: any;
  processingNotes?: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: string;
  purpose: string;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  version: string;
  legalBasis: string;
  metadata?: any;
}

export interface DataRetentionPolicy {
  entityType: string;
  retentionPeriodDays: number;
  legalBasis: string;
  deletionCriteria: string;
  isActive: boolean;
}

export class PrivacyComplianceService {
  /**
   * Create a data subject request (GDPR Article 15-22)
   */
  static async createDataSubjectRequest(
    userId: string,
    requestType: DataSubjectRequest['requestType'],
    requestDetails?: any
  ): Promise<DataSubjectRequest> {
    const requestId = uuidv4();
    const requestedAt = new Date();

    const query = `
      INSERT INTO data_subject_requests 
      (id, user_id, request_type, status, requested_at, request_details)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      requestId,
      userId,
      requestType,
      'pending',
      requestedAt,
      requestDetails ? JSON.stringify(requestDetails) : null
    ];

    const result = await pool.query(query, values);
    
    // Log the request for audit purposes
    await this.logDataProcessingActivity(
      userId,
      'data_subject_request_created',
      { requestType, requestId }
    );

    return {
      id: requestId,
      userId,
      requestType,
      status: 'pending',
      requestedAt,
      requestDetails
    };
  }

  /**
   * Process data export request (GDPR Article 15 - Right of Access)
   */
  static async processDataExportRequest(requestId: string): Promise<any> {
    // Update request status
    await this.updateRequestStatus(requestId, 'processing');

    const request = await this.getDataSubjectRequest(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    try {
      // Collect all user data from various tables
      const userData = await this.collectUserData(request.userId);
      
      // Create export package
      const exportData = {
        exportedAt: new Date().toISOString(),
        userId: request.userId,
        requestId,
        data: userData,
        metadata: {
          exportFormat: 'JSON',
          gdprArticle: 'Article 15 - Right of Access',
          retentionNotice: 'This data export is provided for your personal use only.'
        }
      };

      // Store export file reference
      const exportQuery = `
        INSERT INTO data_exports (id, user_id, request_id, export_data, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const exportId = uuidv4();
      await pool.query(exportQuery, [
        exportId,
        request.userId,
        requestId,
        JSON.stringify(exportData),
        new Date()
      ]);

      await this.updateRequestStatus(requestId, 'completed');
      
      return {
        exportId,
        downloadUrl: `/api/privacy/export/${exportId}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
    } catch (error) {
      await this.updateRequestStatus(requestId, 'rejected', `Export failed: ${error}`);
      throw error;
    }
  }

  /**
   * Process data deletion request (GDPR Article 17 - Right to Erasure)
   */
  static async processDataDeletionRequest(requestId: string): Promise<void> {
    await this.updateRequestStatus(requestId, 'processing');

    const request = await this.getDataSubjectRequest(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Anonymize data first (for audit trail)
      const anonymizedData = DataAnonymization.anonymizePersonalData({ id: request.userId });
      
      // Log anonymization
      await client.query(
        `INSERT INTO anonymized_data_log 
         (original_entity_type, original_entity_id, anonymized_id, retention_period_days)
         VALUES ($1, $2, $3, $4)`,
        ['users', request.userId, anonymizedData.hashedId, 0] // 0 days = immediate deletion
      );

      // Delete user data from all tables
      await this.deleteUserDataCompletely(client, request.userId);

      await client.query('COMMIT');
      await this.updateRequestStatus(requestId, 'completed');

      console.log(`User data deleted for user: ${request.userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      await this.updateRequestStatus(requestId, 'rejected', `Deletion failed: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process data anonymization request
   */
  static async processDataAnonymizationRequest(requestId: string): Promise<void> {
    await this.updateRequestStatus(requestId, 'processing');

    const request = await this.getDataSubjectRequest(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Anonymize user profile
      const anonymizedData = DataAnonymization.anonymizePersonalData({ id: request.userId });
      
      await client.query(
        `UPDATE users SET 
         data_anonymized = TRUE, 
         anonymization_date = CURRENT_TIMESTAMP,
         profile = $1
         WHERE id = $2`,
        [JSON.stringify(anonymizedData.anonymizedFields), request.userId]
      );

      // Anonymize legal queries
      const legalQueries = await client.query(
        'SELECT * FROM legal_queries WHERE user_id = $1',
        [request.userId]
      );

      for (const query of legalQueries.rows) {
        const anonymizedQuery = DataAnonymization.anonymizeLegalCase(query);
        await client.query(
          'UPDATE legal_queries SET description = $1 WHERE id = $2',
          [anonymizedQuery.description, query.id]
        );
      }

      // Log anonymization
      await client.query(
        `INSERT INTO anonymized_data_log 
         (original_entity_type, original_entity_id, anonymized_id)
         VALUES ($1, $2, $3)`,
        ['users', request.userId, anonymizedData.hashedId]
      );

      await client.query('COMMIT');
      await this.updateRequestStatus(requestId, 'completed');
    } catch (error) {
      await client.query('ROLLBACK');
      await this.updateRequestStatus(requestId, 'rejected', `Anonymization failed: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Record user consent (GDPR Article 7)
   */
  static async recordConsent(
    userId: string,
    consentType: string,
    purpose: string,
    granted: boolean,
    legalBasis: string,
    version: string = '1.0',
    metadata?: any
  ): Promise<ConsentRecord> {
    const consentId = uuidv4();
    const timestamp = new Date();

    const query = `
      INSERT INTO user_consents 
      (id, user_id, consent_type, purpose, granted, granted_at, revoked_at, version, legal_basis, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      consentId,
      userId,
      consentType,
      purpose,
      granted,
      granted ? timestamp : null,
      granted ? null : timestamp,
      version,
      legalBasis,
      metadata ? JSON.stringify(metadata) : null
    ];

    const result = await pool.query(query, values);

    // Log consent activity
    await this.logDataProcessingActivity(
      userId,
      granted ? 'consent_granted' : 'consent_revoked',
      { consentType, purpose, legalBasis }
    );

    return {
      id: consentId,
      userId,
      consentType,
      purpose,
      granted,
      grantedAt: granted ? timestamp : undefined,
      revokedAt: granted ? undefined : timestamp,
      version,
      legalBasis,
      metadata
    };
  }

  /**
   * Revoke user consent
   */
  static async revokeConsent(userId: string, consentType: string): Promise<void> {
    const query = `
      UPDATE user_consents 
      SET granted = FALSE, revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND consent_type = $2 AND granted = TRUE
    `;

    await pool.query(query, [userId, consentType]);

    await this.logDataProcessingActivity(
      userId,
      'consent_revoked',
      { consentType }
    );
  }

  /**
   * Get user consents
   */
  static async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    const query = `
      SELECT * FROM user_consents 
      WHERE user_id = $1 
      ORDER BY granted_at DESC, revoked_at DESC
    `;

    const result = await pool.query(query, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      consentType: row.consent_type,
      purpose: row.purpose,
      granted: row.granted,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      version: row.version,
      legalBasis: row.legal_basis,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  /**
   * Check if user has valid consent for specific purpose
   */
  static async hasValidConsent(userId: string, consentType: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count 
      FROM user_consents 
      WHERE user_id = $1 AND consent_type = $2 AND granted = TRUE
    `;

    const result = await pool.query(query, [userId, consentType]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Log data processing activity for audit trail
   */
  static async logDataProcessingActivity(
    userId: string,
    activity: string,
    details?: any
  ): Promise<void> {
    const query = `
      INSERT INTO data_processing_log 
      (id, user_id, activity, details, timestamp)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [
      uuidv4(),
      userId,
      activity,
      details ? JSON.stringify(details) : null,
      new Date()
    ];

    await pool.query(query, values);
  }

  /**
   * Get data processing audit log for user
   */
  static async getDataProcessingLog(userId: string, limit: number = 100): Promise<any[]> {
    const query = `
      SELECT * FROM data_processing_log 
      WHERE user_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Set up data retention policies
   */
  static async createRetentionPolicy(policy: Omit<DataRetentionPolicy, 'id'>): Promise<void> {
    const query = `
      INSERT INTO data_retention_policies 
      (entity_type, retention_period_days, legal_basis, deletion_criteria, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (entity_type) 
      DO UPDATE SET 
        retention_period_days = EXCLUDED.retention_period_days,
        legal_basis = EXCLUDED.legal_basis,
        deletion_criteria = EXCLUDED.deletion_criteria,
        is_active = EXCLUDED.is_active
    `;

    await pool.query(query, [
      policy.entityType,
      policy.retentionPeriodDays,
      policy.legalBasis,
      policy.deletionCriteria,
      policy.isActive
    ]);
  }

  /**
   * Apply data retention policies (cleanup old data)
   */
  static async applyRetentionPolicies(): Promise<void> {
    const policies = await pool.query(
      'SELECT * FROM data_retention_policies WHERE is_active = TRUE'
    );

    for (const policy of policies.rows) {
      try {
        await this.applyRetentionPolicy(policy);
      } catch (error) {
        console.error(`Failed to apply retention policy for ${policy.entity_type}:`, error);
      }
    }
  }

  // Helper methods

  private static async updateRequestStatus(
    requestId: string, 
    status: DataSubjectRequest['status'], 
    notes?: string
  ): Promise<void> {
    const query = `
      UPDATE data_subject_requests 
      SET status = $1, processed_at = CURRENT_TIMESTAMP, processing_notes = $2
      WHERE id = $3
    `;

    await pool.query(query, [status, notes, requestId]);
  }

  private static async getDataSubjectRequest(requestId: string): Promise<DataSubjectRequest | null> {
    const query = 'SELECT * FROM data_subject_requests WHERE id = $1';
    const result = await pool.query(query, [requestId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      requestType: row.request_type,
      status: row.status,
      requestedAt: row.requested_at,
      processedAt: row.processed_at,
      completedAt: row.completed_at,
      requestDetails: row.request_details ? JSON.parse(row.request_details) : undefined,
      processingNotes: row.processing_notes
    };
  }

  private static async collectUserData(userId: string): Promise<any> {
    const userData: any = {};

    // User profile
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    userData.profile = userResult.rows[0];

    // Legal queries
    const queriesResult = await pool.query('SELECT * FROM legal_queries WHERE user_id = $1', [userId]);
    userData.legalQueries = queriesResult.rows;

    // Mediation cases
    const mediationResult = await pool.query(
      'SELECT * FROM mediation_cases WHERE parties @> $1',
      [JSON.stringify([{ userId }])]
    );
    userData.mediationCases = mediationResult.rows;

    // Secure messages
    const messagesResult = await pool.query(
      'SELECT * FROM secure_messages WHERE sender_id = $1 OR recipient_id = $1',
      [userId]
    );
    userData.messages = messagesResult.rows;

    // Consents
    userData.consents = await this.getUserConsents(userId);

    // Processing log
    userData.processingLog = await this.getDataProcessingLog(userId);

    return userData;
  }

  private static async deleteUserDataCompletely(client: any, userId: string): Promise<void> {
    // Delete in order to respect foreign key constraints
    await client.query('DELETE FROM secure_messages WHERE sender_id = $1 OR recipient_id = $1', [userId]);
    await client.query('DELETE FROM user_key_pairs WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_consents WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM data_subject_requests WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM data_processing_log WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM legal_queries WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM mediation_cases WHERE parties @> $1', [JSON.stringify([{ userId }])]);
    await client.query('DELETE FROM encrypted_data_store WHERE entity_type = $1 AND entity_id = $2', ['users', userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
  }

  private static async applyRetentionPolicy(policy: any): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_period_days);

    // This is a simplified implementation - in practice, you'd need more sophisticated logic
    const query = `
      DELETE FROM ${policy.entity_type} 
      WHERE created_at < $1 AND data_anonymized = FALSE
    `;

    await pool.query(query, [cutoffDate]);
  }
}