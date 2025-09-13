import express from 'express';
import { Pool } from 'pg';
import { MediationService } from '../services/mediation-service';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { Party, DisputeDetails, AIMediator, MediationStatus } from '../types';

const router = express.Router();

export function createMediationRoutes(db: Pool) {
  const mediationService = new MediationService(db);

  // Create new mediation case
  router.post('/cases', authenticateToken, async (req, res) => {
    try {
      const { parties, dispute, mediatorConfig } = req.body;

      // Validate required fields
      const validation = validateRequest(req.body, [
        'parties',
        'dispute',
        'mediatorConfig'
      ]);

      if (!validation.isValid) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', validation.errors.join(', '), req.id)
        );
      }

      // Validate parties array
      if (!Array.isArray(parties) || parties.length < 2) {
        return res.status(400).json(
          errorResponse('INVALID_PARTIES', 'At least 2 parties required for mediation', req.id)
        );
      }

      // Validate dispute details
      if (!dispute.summary || !dispute.category || !dispute.jurisdiction) {
        return res.status(400).json(
          errorResponse('INVALID_DISPUTE', 'Dispute summary, category, and jurisdiction are required', req.id)
        );
      }

      const mediationCase = await mediationService.createMediationCase(
        parties as Party[],
        dispute as DisputeDetails,
        mediatorConfig as AIMediator
      );

      logger.info(`Mediation case created by user ${req.user?.id}: ${mediationCase.id}`);
      
      res.status(201).json(
        successResponse(mediationCase, 'Mediation case created successfully', req.id)
      );

    } catch (error) {
      logger.error('Error creating mediation case:', error);
      res.status(500).json(
        errorResponse('INTERNAL_ERROR', 'Failed to create mediation case', req.id)
      );
    }
  });

  // Get mediation case by ID
  router.get('/cases/:caseId', authenticateToken, async (req, res) => {
    try {
      const { caseId } = req.params;

      if (!caseId) {
        return res.status(400).json(
          errorResponse('MISSING_CASE_ID', 'Case ID is required', req.id)
        );
      }

      const mediationCase = await mediationService.getMediationCase(caseId);

      if (!mediationCase) {
        return res.status(404).json(
          errorResponse('CASE_NOT_FOUND', 'Mediation case not found', req.id)
        );
      }

      // Check if user is authorized to view this case
      const userIsParty = mediationCase.parties.some(
        party => party.userId === req.user?.id
      );

      if (!userIsParty) {
        return res.status(403).json(
          errorResponse('UNAUTHORIZED', 'Not authorized to view this case', req.id)
        );
      }

      res.json(
        successResponse(mediationCase, 'Mediation case retrieved successfully', req.id)
      );

    } catch (error) {
      logger.error('Error fetching mediation case:', error);
      res.status(500).json(
        errorResponse('INTERNAL_ERROR', 'Failed to fetch mediation case', req.id)
      );
    }
  });

  // Get user's mediation cases
  router.get('/cases', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json(
          errorResponse('UNAUTHORIZED', 'User ID not found', req.id)
        );
      }

      const mediationCases = await mediationService.getMediationCasesByUser(userId);

      res.json(
        successResponse(mediationCases, 'Mediation cases retrieved successfully', req.id)
      );

    } catch (error) {
      logger.error('Error fetching user mediation cases:', error);
      res.status(500).json(
        errorResponse('INTERNAL_ERROR', 'Failed to fetch mediation cases', req.id)
      );
    }
  });

  // Update mediation case status
  router.patch('/cases/:caseId/status', authenticateToken, async (req, res) => {
    try {
      const { caseId } = req.params;
      const { status } = req.body;

      if (!caseId || !status) {
        return res.status(400).json(
          errorResponse('MISSING_FIELDS', 'Case ID and status are required', req.id)
        );
      }

      const validStatuses: MediationStatus[] = ['active', 'pending', 'resolved', 'failed', 'escalated'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json(
          errorResponse('INVALID_STATUS', 'Invalid mediation status', req.id)
        );
      }

      // Check if user is authorized to update this case
      const mediationCase = await mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        return res.status(404).json(
          errorResponse('CASE_NOT_FOUND', 'Mediation case not found', req.id)
        );
      }

      const userIsParty = mediationCase.parties.some(
        party => party.userId === req.user?.id
      );

      if (!userIsParty) {
        return res.status(403).json(
          errorResponse('UNAUTHORIZED', 'Not authorized to update this case', req.id)
        );
      }

      await mediationService.updateMediationStatus(caseId, status);

      res.json(
        successResponse(null, 'Mediation status updated successfully', req.id)
      );

    } catch (error) {
      logger.error('Error updating mediation status:', error);
      res.status(500).json(
        errorResponse('INTERNAL_ERROR', 'Failed to update mediation status', req.id)
      );
    }
  });

  // Add event to mediation case
  router.post('/cases/:caseId/events', authenticateToken, async (req, res) => {
    try {
      const { caseId } = req.params;
      const { type, content, metadata } = req.body;

      if (!caseId || !type || !content) {
        return res.status(400).json(
          errorResponse('MISSING_FIELDS', 'Case ID, type, and content are required', req.id)
        );
      }

      const validTypes = ['message', 'document', 'proposal', 'agreement'];
      if (!validTypes.includes(type)) {
        return res.status(400).json(
          errorResponse('INVALID_TYPE', 'Invalid event type', req.id)
        );
      }

      // Check if user is authorized to add events to this case
      const mediationCase = await mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        return res.status(404).json(
          errorResponse('CASE_NOT_FOUND', 'Mediation case not found', req.id)
        );
      }

      const userIsParty = mediationCase.parties.some(
        party => party.userId === req.user?.id
      );

      if (!userIsParty) {
        return res.status(403).json(
          errorResponse('UNAUTHORIZED', 'Not authorized to add events to this case', req.id)
        );
      }

      const event = await mediationService.addMediationEvent(caseId, {
        type,
        content,
        party: req.user?.email || 'unknown',
        metadata
      });

      res.status(201).json(
        successResponse(event, 'Event added successfully', req.id)
      );

    } catch (error) {
      logger.error('Error adding mediation event:', error);
      res.status(500).json(
        errorResponse('INTERNAL_ERROR', 'Failed to add mediation event', req.id)
      );
    }
  });

  // Get mediation case events
  router.get('/cases/:caseId/events', authenticateToken, async (req, res) => {
    try {
      const { caseId } = req.params;

      if (!caseId) {
        return res.status(400).json(
          errorResponse('MISSING_CASE_ID', 'Case ID is required', req.id)
        );
      }

      // Check if user is authorized to view events for this case
      const mediationCase = await mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        return res.status(404).json(
          errorResponse('CASE_NOT_FOUND', 'Mediation case not found', req.id)
        );
      }

      const userIsParty = mediationCase.parties.some(
        party => party.userId === req.user?.id
      );

      if (!userIsParty) {
        return res.status(403).json(
          errorResponse('UNAUTHORIZED', 'Not authorized to view events for this case', req.id)
        );
      }

      const events = await mediationService.getMediationEvents(caseId);

      res.json(
        successResponse(events, 'Events retrieved successfully', req.id)
      );

    } catch (error) {
      logger.error('Error fetching mediation events:', error);
      res.status(500).json(
        errorResponse('INTERNAL_ERROR', 'Failed to fetch mediation events', req.id)
      );
    }
  });

  // Add party to mediation case
  router.post('/cases/:caseId/parties', authenticateToken, async (req, res) => {
    try {
      const { caseId } = req.params;
      const { party } = req.body;

      if (!caseId || !party) {
        return res.status(400).json(
          errorResponse('MISSING_FIELDS', 'Case ID and party information are required', req.id)
        );
      }

      // Validate party structure
      if (!party.userId || !party.role || !party.contactInfo?.email) {
        return res.status(400).json(
          errorResponse('INVALID_PARTY', 'Party must have userId, role, and contactInfo.email', req.id)
        );
      }

      // Check if user is authorized to add parties to this case
      const mediationCase = await mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        return res.status(404).json(
          errorResponse('CASE_NOT_FOUND', 'Mediation case not found', req.id)
        );
      }

      const userIsParty = mediationCase.parties.some(
        p => p.userId === req.user?.id
      );

      if (!userIsParty) {
        return res.status(403).json(
          errorResponse('UNAUTHORIZED', 'Not authorized to add parties to this case', req.id)
        );
      }

      await mediationService.addPartyToCase(caseId, party as Party);

      res.status(201).json(
        successResponse(null, 'Party added successfully', req.id)
      );

    } catch (error) {
      logger.error('Error adding party to case:', error);
      res.status(500).json(
        errorResponse('INTERNAL_ERROR', 'Failed to add party to case', req.id)
      );
    }
  });

  // Generate dispute summary
  router.get('/cases/:caseId/summary', authenticateToken, async (req, res) => {
    try {
      const { caseId } = req.params;

      if (!caseId) {
        return res.status(400).json(
          errorResponse('MISSING_CASE_ID', 'Case ID is required', req.id)
        );
      }

      // Check if user is authorized to view this case
      const mediationCase = await mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        return res.status(404).json(
          errorResponse('CASE_NOT_FOUND', 'Mediation case not found', req.id)
        );
      }

      const userIsParty = mediationCase.parties.some(
        party => party.userId === req.user?.id
      );

      if (!userIsParty) {
        return res.status(403).json(
          errorResponse('UNAUTHORIZED', 'Not authorized to view this case summary', req.id)
        );
      }

      const summary = await mediationService.generateDisputeSummary(caseId);

      res.json(
        successResponse({ summary }, 'Dispute summary generated successfully', req.id)
      );

    } catch (error) {
      logger.error('Error generating dispute summary:', error);
      res.status(500).json(
        errorResponse('INTERNAL_ERROR', 'Failed to generate dispute summary', req.id)
      );
    }
  });

  return router;
}