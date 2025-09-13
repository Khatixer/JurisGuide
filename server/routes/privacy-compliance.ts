import express, { Request, Response } from 'express';
import { PrivacyComplianceService } from '../services/privacy-compliance-service';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import { auditDataAccess, handleDataSubjectRequest } from '../middleware/encryption';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { validateRequest } from '../utils/validation';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Create data subject request (GDPR Articles 15-22)
 * POST /api/privacy/data-subject-request
 */
router.post('/data-subject-request',
  auditDataAccess('data_subject_requests', 'create'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { requestType, requestDetails } = req.body;
      const userId = req.user!.userId;

      // Validate request
      const validation = validateRequest(req.body, {
        requestType: { 
          type: 'string', 
          required: true,
          enum: ['export', 'delete', 'anonymize', 'rectify', 'restrict']
        },
        requestDetails: { type: 'object', required: false }
      });

      if (!validation.isValid) {
        res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          validation.errors!.join(', '),
          req.headers['x-request-id'] as string
        ));
        return;
      }

      const request = await PrivacyComplianceService.createDataSubjectRequest(
        userId,
        requestType,
        requestDetails
      );

      res.status(201).json(createSuccessResponse(
        request,
        'Data subject request created successfully'
      ));
    } catch (error) {
      console.error('Data subject request creation error:', error);
      res.status(500).json(createErrorResponse(
        'REQUEST_CREATION_ERROR',
        'Failed to create data subject request',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Process data export request
 * POST /api/privacy/process-export/:requestId
 */
router.post('/process-export/:requestId',
  requireAdmin,
  auditDataAccess('data_exports', 'create'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;

      const exportResult = await PrivacyComplianceService.processDataExportRequest(requestId);

      res.json(createSuccessResponse(
        exportResult,
        'Data export processed successfully'
      ));
    } catch (error) {
      console.error('Data export processing error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(
          'REQUEST_NOT_FOUND',
          'Data subject request not found',
          req.headers['x-request-id'] as string
        ));
        return;
      }

      res.status(500).json(createErrorResponse(
        'EXPORT_PROCESSING_ERROR',
        'Failed to process data export request',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Process data deletion request
 * POST /api/privacy/process-deletion/:requestId
 */
router.post('/process-deletion/:requestId',
  requireAdmin,
  auditDataAccess('users', 'delete'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;

      await PrivacyComplianceService.processDataDeletionRequest(requestId);

      res.json(createSuccessResponse(
        { requestId, status: 'completed' },
        'Data deletion processed successfully'
      ));
    } catch (error) {
      console.error('Data deletion processing error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(
          'REQUEST_NOT_FOUND',
          'Data subject request not found',
          req.headers['x-request-id'] as string
        ));
        return;
      }

      res.status(500).json(createErrorResponse(
        'DELETION_PROCESSING_ERROR',
        'Failed to process data deletion request',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Process data anonymization request
 * POST /api/privacy/process-anonymization/:requestId
 */
router.post('/process-anonymization/:requestId',
  requireAdmin,
  auditDataAccess('users', 'update'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;

      await PrivacyComplianceService.processDataAnonymizationRequest(requestId);

      res.json(createSuccessResponse(
        { requestId, status: 'completed' },
        'Data anonymization processed successfully'
      ));
    } catch (error) {
      console.error('Data anonymization processing error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(
          'REQUEST_NOT_FOUND',
          'Data subject request not found',
          req.headers['x-request-id'] as string
        ));
        return;
      }

      res.status(500).json(createErrorResponse(
        'ANONYMIZATION_PROCESSING_ERROR',
        'Failed to process data anonymization request',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Record user consent
 * POST /api/privacy/consent
 */
router.post('/consent',
  auditDataAccess('user_consents', 'create'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { consentType, purpose, granted, legalBasis, version, metadata } = req.body;
      const userId = req.user!.userId;

      // Validate request
      const validation = validateRequest(req.body, {
        consentType: { type: 'string', required: true },
        purpose: { type: 'string', required: true },
        granted: { type: 'boolean', required: true },
        legalBasis: { type: 'string', required: true },
        version: { type: 'string', required: false },
        metadata: { type: 'object', required: false }
      });

      if (!validation.isValid) {
        res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          validation.errors!.join(', '),
          req.headers['x-request-id'] as string
        ));
        return;
      }

      const consent = await PrivacyComplianceService.recordConsent(
        userId,
        consentType,
        purpose,
        granted,
        legalBasis,
        version,
        metadata
      );

      res.status(201).json(createSuccessResponse(
        consent,
        'Consent recorded successfully'
      ));
    } catch (error) {
      console.error('Consent recording error:', error);
      res.status(500).json(createErrorResponse(
        'CONSENT_RECORDING_ERROR',
        'Failed to record consent',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Revoke user consent
 * POST /api/privacy/consent/revoke
 */
router.post('/consent/revoke',
  auditDataAccess('user_consents', 'update'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { consentType } = req.body;
      const userId = req.user!.userId;

      if (!consentType) {
        res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          'Consent type is required',
          req.headers['x-request-id'] as string
        ));
        return;
      }

      await PrivacyComplianceService.revokeConsent(userId, consentType);

      res.json(createSuccessResponse(
        { consentType, revoked: true },
        'Consent revoked successfully'
      ));
    } catch (error) {
      console.error('Consent revocation error:', error);
      res.status(500).json(createErrorResponse(
        'CONSENT_REVOCATION_ERROR',
        'Failed to revoke consent',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Get user consents
 * GET /api/privacy/consent
 */
router.get('/consent',
  auditDataAccess('user_consents', 'read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const consents = await PrivacyComplianceService.getUserConsents(userId);

      res.json(createSuccessResponse(
        { consents, count: consents.length },
        'Consents retrieved successfully'
      ));
    } catch (error) {
      console.error('Consent retrieval error:', error);
      res.status(500).json(createErrorResponse(
        'CONSENT_RETRIEVAL_ERROR',
        'Failed to retrieve consents',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Check if user has valid consent
 * GET /api/privacy/consent/check/:consentType
 */
router.get('/consent/check/:consentType',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { consentType } = req.params;
      const userId = req.user!.userId;

      const hasConsent = await PrivacyComplianceService.hasValidConsent(userId, consentType);

      res.json(createSuccessResponse(
        { consentType, hasConsent },
        'Consent status checked successfully'
      ));
    } catch (error) {
      console.error('Consent check error:', error);
      res.status(500).json(createErrorResponse(
        'CONSENT_CHECK_ERROR',
        'Failed to check consent status',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Get data processing log for user
 * GET /api/privacy/processing-log
 */
router.get('/processing-log',
  auditDataAccess('data_processing_log', 'read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 100;

      const processingLog = await PrivacyComplianceService.getDataProcessingLog(userId, limit);

      res.json(createSuccessResponse(
        { processingLog, count: processingLog.length },
        'Processing log retrieved successfully'
      ));
    } catch (error) {
      console.error('Processing log retrieval error:', error);
      res.status(500).json(createErrorResponse(
        'PROCESSING_LOG_ERROR',
        'Failed to retrieve processing log',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Handle GDPR data subject requests (middleware integration)
 * POST /api/privacy/gdpr-request
 */
router.post('/gdpr-request',
  handleDataSubjectRequest,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // This endpoint is handled by the middleware
    // Response is sent by the middleware
  }
);

/**
 * Create retention policy (Admin only)
 * POST /api/privacy/retention-policy
 */
router.post('/retention-policy',
  requireAdmin,
  auditDataAccess('data_retention_policies', 'create'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { entityType, retentionPeriodDays, legalBasis, deletionCriteria, isActive } = req.body;

      // Validate request
      const validation = validateRequest(req.body, {
        entityType: { type: 'string', required: true },
        retentionPeriodDays: { type: 'number', required: true, min: 1 },
        legalBasis: { type: 'string', required: true },
        deletionCriteria: { type: 'string', required: true },
        isActive: { type: 'boolean', required: false }
      });

      if (!validation.isValid) {
        res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          validation.errors!.join(', '),
          req.headers['x-request-id'] as string
        ));
        return;
      }

      await PrivacyComplianceService.createRetentionPolicy({
        entityType,
        retentionPeriodDays,
        legalBasis,
        deletionCriteria,
        isActive: isActive !== undefined ? isActive : true
      });

      res.status(201).json(createSuccessResponse(
        { entityType, retentionPeriodDays, isActive },
        'Retention policy created successfully'
      ));
    } catch (error) {
      console.error('Retention policy creation error:', error);
      res.status(500).json(createErrorResponse(
        'RETENTION_POLICY_ERROR',
        'Failed to create retention policy',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

/**
 * Apply retention policies (Admin only)
 * POST /api/privacy/apply-retention-policies
 */
router.post('/apply-retention-policies',
  requireAdmin,
  auditDataAccess('data_retention_policies', 'update'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await PrivacyComplianceService.applyRetentionPolicies();

      res.json(createSuccessResponse(
        { applied: true },
        'Retention policies applied successfully'
      ));
    } catch (error) {
      console.error('Retention policy application error:', error);
      res.status(500).json(createErrorResponse(
        'RETENTION_POLICY_APPLICATION_ERROR',
        'Failed to apply retention policies',
        req.headers['x-request-id'] as string
      ));
    }
  }
);

export default router;