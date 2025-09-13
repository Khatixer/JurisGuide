import express from 'express';
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { MediationWorkflowService } from '../services/mediation-workflow-service';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

export function createMediationWorkflowRoutes(db: Pool) {
  const workflowService = new MediationWorkflowService(db);

  // Initialize mediation workflow
  router.post('/cases/:caseId/workflow', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const requestId = req.headers['x-request-id'] as string || 'unknown';

      if (!caseId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_CASE_ID', message: 'Case ID is required' },
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      const workflow = await workflowService.initializeMediationWorkflow(caseId);

      res.status(201).json({
        success: true,
        data: workflow,
        timestamp: new Date().toISOString(),
        requestId
      });

    } catch (error) {
      logger.error('Error initializing mediation workflow:', error instanceof Error ? error.message : String(error));
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to initialize mediation workflow' },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }
  });

  // Update workflow progress
  router.patch('/cases/:caseId/workflow/:stepId', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { caseId, stepId } = req.params;
      const { completed, notes } = req.body;
      const requestId = req.headers['x-request-id'] as string || 'unknown';

      if (!caseId || !stepId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMETERS', message: 'Case ID and step ID are required' },
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      if (typeof completed !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_COMPLETED', message: 'Completed must be a boolean value' },
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      const workflow = await workflowService.updateWorkflowProgress(
        caseId,
        stepId,
        completed,
        notes
      );

      res.json({
        success: true,
        data: workflow,
        timestamp: new Date().toISOString(),
        requestId
      });

    } catch (error) {
      logger.error('Error updating workflow progress:', error instanceof Error ? error.message : String(error));
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update workflow progress' },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }
  });

  // Generate progress report
  router.get('/cases/:caseId/reports/progress', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const requestId = req.headers['x-request-id'] as string || 'unknown';

      if (!caseId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_CASE_ID', message: 'Case ID is required' },
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      const report = await workflowService.generateProgressReport(caseId);

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
        requestId
      });

    } catch (error) {
      logger.error('Error generating progress report:', error instanceof Error ? error.message : String(error));
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate progress report' },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }
  });

  // Generate final report
  router.get('/cases/:caseId/reports/final', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const requestId = req.headers['x-request-id'] as string || 'unknown';

      if (!caseId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_CASE_ID', message: 'Case ID is required' },
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      const report = await workflowService.generateFinalReport(caseId);

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
        requestId
      });

    } catch (error) {
      logger.error('Error generating final report:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof Error && error.message.includes('unresolved case')) {
        res.status(400).json({
          success: false,
          error: { code: 'CASE_NOT_RESOLVED', message: 'Cannot generate final report for unresolved case' },
          timestamp: new Date().toISOString(),
          requestId
        });
      } else {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to generate final report' },
          timestamp: new Date().toISOString(),
          requestId
        });
      }
    }
  });

  // Track mediation outcome
  router.post('/cases/:caseId/outcome', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const { outcome, details, agreementTerms } = req.body;
      const requestId = req.headers['x-request-id'] as string || 'unknown';

      if (!caseId || !outcome || !details) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Case ID, outcome, and details are required' },
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      const validOutcomes = ['agreement_reached', 'partial_agreement', 'no_agreement', 'escalated'];
      if (!validOutcomes.includes(outcome)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OUTCOME', message: 'Invalid outcome type' },
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      await workflowService.trackMediationOutcome(
        caseId,
        outcome,
        details,
        agreementTerms
      );

      res.json({
        success: true,
        data: null,
        timestamp: new Date().toISOString(),
        requestId
      });

    } catch (error) {
      logger.error('Error tracking mediation outcome:', error instanceof Error ? error.message : String(error));
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to track mediation outcome' },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }
  });

  // Get next step recommendations
  router.get('/cases/:caseId/recommendations', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const requestId = req.headers['x-request-id'] as string || 'unknown';

      if (!caseId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_CASE_ID', message: 'Case ID is required' },
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      const recommendations = await workflowService.generateNextStepRecommendations(caseId);

      res.json({
        success: true,
        data: { recommendations },
        timestamp: new Date().toISOString(),
        requestId
      });

    } catch (error) {
      logger.error('Error generating next step recommendations:', error instanceof Error ? error.message : String(error));
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate next step recommendations' },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }
  });

  return router;
}