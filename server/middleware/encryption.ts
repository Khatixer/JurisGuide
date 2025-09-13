import { Request, Response, NextFunction } from 'express';
import { FieldEncryption, DataAnonymization } from '../utils/encryption';
import { pool } from '../database/config';
import { AuthenticatedRequest } from './auth';

// Configuration for field encryption
const ENCRYPTION_CONFIG = {
  users: {
    sensitiveFields: ['ssn', 'taxId', 'bankAccount', 'creditCard', 'phone'],
    anonymizableFields: ['firstName', 'lastName', 'email', 'phone', 'address']
  },
  legal_queries: {
    sensitiveFields: ['description', 'personalDetails'],
    anonymizableFields: ['description', 'personalDetails']
  },
  mediation_cases: {
    sensitiveFields: ['disputeDetails', 'personalInformation'],
    anonymizableFields: ['disputeDetails', 'personalInformation']
  },
  lawyers: {
    sensitiveFields: ['bankAccount', 'taxId', 'personalPhone'],
    anonymizableFields: ['personalPhone', 'personalEmail']
  }
};

/**
 * Middleware to automatically encrypt sensitive fields before database storage
 */
export const encryptSensitiveFields = (entityType: keyof typeof ENCRYPTION_CONFIG) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const config = ENCRYPTION_CONFIG[entityType];
      if (!config || !req.body) {
        return next();
      }

      // Encrypt sensitive fields
      if (config.sensitiveFields.length > 0) {
        req.body = FieldEncryption.encryptFields(req.body, config.sensitiveFields);
      }

      next();
    } catch (error) {
      console.error('Encryption middleware error:', error);
      res.status(500).json({
        error: {
          code: 'ENCRYPTION_ERROR',
          message: 'Failed to encrypt sensitive data',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Middleware to automatically decrypt sensitive fields after database retrieval
 */
export const decryptSensitiveFields = (entityType: keyof typeof ENCRYPTION_CONFIG) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      try {
        const config = ENCRYPTION_CONFIG[entityType];
        if (config && config.sensitiveFields.length > 0) {
          let parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          
          // Handle arrays of objects
          if (Array.isArray(parsedData)) {
            parsedData = parsedData.map(item => 
              FieldEncryption.decryptFields(item, config.sensitiveFields)
            );
          } else if (parsedData && typeof parsedData === 'object') {
            // Handle single object
            parsedData = FieldEncryption.decryptFields(parsedData, config.sensitiveFields);
          }
          
          data = typeof data === 'string' ? JSON.stringify(parsedData) : parsedData;
        }
      } catch (error) {
        console.error('Decryption middleware error:', error);
        // Continue with original data if decryption fails
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware to log data access for audit purposes
 */
export const auditDataAccess = (entityType: string, action: 'create' | 'read' | 'update' | 'delete') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Log the data access after response is sent
      setImmediate(async () => {
        try {
          const entityId = req.params.id || req.body?.id || 'unknown';
          const success = res.statusCode < 400;
          const responseTime = Date.now() - startTime;
          
          await logDataAccess({
            userId: req.user?.userId || null,
            entityType,
            entityId,
            action,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            success,
            errorMessage: success ? null : 'Request failed',
            additionalMetadata: {
              responseTime,
              statusCode: res.statusCode,
              method: req.method,
              path: req.path
            }
          });
        } catch (error) {
          console.error('Audit logging error:', error);
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware to anonymize data for analytics and compliance
 */
export const anonymizeForAnalytics = (entityType: keyof typeof ENCRYPTION_CONFIG) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Add anonymization flag to request for later processing
    (req as any).shouldAnonymize = true;
    (req as any).anonymizationConfig = ENCRYPTION_CONFIG[entityType];
    next();
  };
};

/**
 * Helper function to log data access
 */
async function logDataAccess(logData: {
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string | null;
  additionalMetadata?: any;
}): Promise<void> {
  try {
    const query = `
      INSERT INTO data_access_audit 
      (user_id, entity_type, entity_id, action, ip_address, user_agent, success, error_message, additional_metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    const values = [
      logData.userId,
      logData.entityType,
      logData.entityId,
      logData.action,
      logData.ipAddress || null,
      logData.userAgent || null,
      logData.success,
      logData.errorMessage,
      logData.additionalMetadata ? JSON.stringify(logData.additionalMetadata) : null
    ];
    
    await pool.query(query, values);
  } catch (error) {
    console.error('Failed to log data access:', error);
  }
}

/**
 * Middleware to enforce data retention policies
 */
export const enforceDataRetention = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for data that should be deleted based on retention policies
    const query = `
      SELECT id, original_entity_type, original_entity_id 
      FROM anonymized_data_log 
      WHERE scheduled_deletion_at <= CURRENT_TIMESTAMP 
      AND is_deleted = FALSE
      LIMIT 100
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length > 0) {
      // Process deletions in background
      setImmediate(async () => {
        for (const row of result.rows) {
          try {
            await deleteExpiredData(row.original_entity_type, row.original_entity_id);
            
            // Mark as deleted in log
            await pool.query(
              'UPDATE anonymized_data_log SET is_deleted = TRUE WHERE id = $1',
              [row.id]
            );
          } catch (error) {
            console.error('Failed to delete expired data:', error);
          }
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('Data retention enforcement error:', error);
    next(); // Continue with request even if retention check fails
  }
};

/**
 * Helper function to delete expired data
 */
async function deleteExpiredData(entityType: string, entityId: string): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete from main entity table
    await client.query(`DELETE FROM ${entityType} WHERE id = $1`, [entityId]);
    
    // Delete from encrypted data store
    await client.query(
      'DELETE FROM encrypted_data_store WHERE entity_type = $1 AND entity_id = $2',
      [entityType, entityId]
    );
    
    // Delete related secure messages
    if (entityType === 'users') {
      await client.query(
        'DELETE FROM secure_messages WHERE sender_id = $1 OR recipient_id = $1',
        [entityId]
      );
      
      await client.query(
        'DELETE FROM user_key_pairs WHERE user_id = $1',
        [entityId]
      );
    }
    
    await client.query('COMMIT');
    
    console.log(`Successfully deleted expired data for ${entityType}:${entityId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Middleware to validate encryption requirements
 */
export const validateEncryptionRequirements = (req: Request, res: Response, next: NextFunction): void => {
  // Check if encryption is properly configured
  if (!process.env.ENCRYPTION_MASTER_KEY) {
    return res.status(500).json({
      error: {
        code: 'ENCRYPTION_NOT_CONFIGURED',
        message: 'Encryption system not properly configured',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next();
};

/**
 * Middleware to handle GDPR data subject requests
 */
export const handleDataSubjectRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { action } = req.body;
  const userId = req.user?.userId;
  
  if (!userId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'User authentication required',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  try {
    switch (action) {
      case 'export_data':
        await exportUserData(userId, res);
        return;
        
      case 'delete_data':
        await initiateDataDeletion(userId);
        res.json({
          message: 'Data deletion initiated. Process will complete within 30 days.',
          timestamp: new Date().toISOString()
        });
        return;
        
      case 'anonymize_data':
        await anonymizeUserData(userId);
        res.json({
          message: 'Data anonymization completed.',
          timestamp: new Date().toISOString()
        });
        return;
        
      default:
        next();
    }
  } catch (error) {
    console.error('Data subject request error:', error);
    res.status(500).json({
      error: {
        code: 'DATA_REQUEST_ERROR',
        message: 'Failed to process data subject request',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Export all user data for GDPR compliance
 */
async function exportUserData(userId: string, res: Response): Promise<void> {
  const userData = {
    user: await pool.query('SELECT * FROM users WHERE id = $1', [userId]),
    legalQueries: await pool.query('SELECT * FROM legal_queries WHERE user_id = $1', [userId]),
    mediationCases: await pool.query('SELECT * FROM mediation_cases WHERE parties @> $1', [JSON.stringify([{ userId }])]),
    messages: await pool.query('SELECT * FROM secure_messages WHERE sender_id = $1 OR recipient_id = $1', [userId]),
    auditLog: await pool.query('SELECT * FROM data_access_audit WHERE user_id = $1', [userId])
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="user_data_${userId}.json"`);
  res.json(userData);
}

/**
 * Initiate user data deletion process
 */
async function initiateDataDeletion(userId: string): Promise<void> {
  const anonymizedData = DataAnonymization.anonymizePersonalData({ id: userId });
  
  await pool.query(
    `INSERT INTO anonymized_data_log 
     (original_entity_type, original_entity_id, anonymized_id, retention_period_days)
     VALUES ($1, $2, $3, $4)`,
    ['users', userId, anonymizedData.hashedId, 30] // 30 days for deletion
  );
}

/**
 * Anonymize user data immediately
 */
async function anonymizeUserData(userId: string): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Anonymize user profile
    const anonymizedData = DataAnonymization.anonymizePersonalData({ id: userId });
    
    await client.query(
      `UPDATE users SET 
       data_anonymized = TRUE, 
       anonymization_date = CURRENT_TIMESTAMP,
       profile = $1
       WHERE id = $2`,
      [JSON.stringify(anonymizedData.anonymizedFields), userId]
    );
    
    // Log anonymization
    await client.query(
      `INSERT INTO anonymized_data_log 
       (original_entity_type, original_entity_id, anonymized_id)
       VALUES ($1, $2, $3)`,
      ['users', userId, anonymizedData.hashedId]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export {
  ENCRYPTION_CONFIG,
  logDataAccess,
  deleteExpiredData,
  exportUserData,
  initiateDataDeletion,
  anonymizeUserData
};