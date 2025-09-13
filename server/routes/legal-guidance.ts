import express from 'express';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { LegalQueryOperations } from '../database/operations';
import { legalGuidanceService } from '../services/legal-guidance-service';
import { 
  sendSuccess, 
  sendError, 
  sendNotFoundError,
  sendInternalServerError 
} from '../utils/response';
import { isValidUUID } from '../utils/validation';
import { logger } from '../utils/logger';

const router = express.Router();

// Generate guidance for a specific legal query
router.post('/queries/:queryId/guidance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { queryId } = req.params;
    const userId = (req as any).user.id;
    const user = (req as any).user;
    const requestId = req.headers['x-request-id'] as string;
    
    const { 
      includeFormatted = true, 
      includePlainLanguage = true, 
      maxSteps = 10 
    } = req.body;

    // Validate query ID
    if (!isValidUUID(queryId)) {
      return sendError(res, 'INVALID_ID', 'Invalid query ID format', 400, undefined, requestId);
    }

    // Get the legal query
    const query = await LegalQueryOperations.findById(queryId);
    if (!query) {
      return sendNotFoundError(res, 'Legal query', requestId);
    }

    // Ensure user owns the query
    if (query.userId !== userId) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this query', 403, undefined, requestId);
    }

    // Update query status to processing
    await LegalQueryOperations.updateStatus(queryId, 'processing');

    logger.info('Generating legal guidance', requestId, userId, {
      queryId,
      category: query.category,
      jurisdiction: query.jurisdiction
    });

    // Generate guidance
    const guidanceResponse = await legalGuidanceService.generateGuidance({
      query,
      user,
      options: {
        includeFormatted,
        includePlainLanguage,
        maxSteps
      }
    });

    // Update query status to completed
    await LegalQueryOperations.updateStatus(queryId, 'completed');

    sendSuccess(res, guidanceResponse, 200, requestId);
  } catch (error) {
    logger.error('Error generating legal guidance', req.headers['x-request-id'] as string, undefined, {
      queryId: req.params.queryId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Update query status to failed
    if (req.params.queryId) {
      try {
        await LegalQueryOperations.updateStatus(req.params.queryId, 'failed');
      } catch (updateError) {
        logger.error('Failed to update query status to failed', undefined, undefined, { updateError });
      }
    }

    sendInternalServerError(res, 'Failed to generate legal guidance', req.headers['x-request-id'] as string);
  }
});

// Get guidance for a query (if already generated)
router.get('/queries/:queryId/guidance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { queryId } = req.params;
    const userId = (req as any).user.id;
    const requestId = req.headers['x-request-id'] as string;

    // Validate query ID
    if (!isValidUUID(queryId)) {
      return sendError(res, 'INVALID_ID', 'Invalid query ID format', 400, undefined, requestId);
    }

    // Get the legal query
    const query = await LegalQueryOperations.findById(queryId);
    if (!query) {
      return sendNotFoundError(res, 'Legal query', requestId);
    }

    // Ensure user owns the query
    if (query.userId !== userId) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this query', 403, undefined, requestId);
    }

    // For now, return query status - in a full implementation, 
    // we would store and retrieve generated guidance from database
    sendSuccess(res, {
      queryId,
      status: query.status,
      message: query.status === 'completed' 
        ? 'Guidance available - use POST endpoint to regenerate'
        : 'Guidance not yet generated - use POST endpoint to generate'
    }, 200, requestId);
  } catch (error) {
    logger.error('Error retrieving legal guidance', req.headers['x-request-id'] as string, undefined, {
      queryId: req.params.queryId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendInternalServerError(res, 'Failed to retrieve legal guidance', req.headers['x-request-id'] as string);
  }
});

// Generate quick guidance preview (without saving)
router.post('/preview', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { description, category, jurisdiction, urgency, culturalContext, language } = req.body;
    const user = (req as any).user;
    const requestId = req.headers['x-request-id'] as string;

    // Validate required fields
    if (!description || description.trim().length < 10) {
      return sendError(res, 'INVALID_DESCRIPTION', 'Description must be at least 10 characters long', 400, undefined, requestId);
    }

    // Create temporary query object for guidance generation
    const tempQuery = {
      id: 'preview',
      userId: user.id,
      description: description.trim(),
      category: category || 'other',
      jurisdiction: jurisdiction || ['United States'],
      urgency: urgency || 'medium',
      culturalContext: culturalContext || '',
      language: language || 'en',
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    logger.info('Generating guidance preview', requestId, user.id, {
      category: tempQuery.category,
      jurisdiction: tempQuery.jurisdiction
    });

    // Generate guidance preview
    const guidanceResponse = await legalGuidanceService.generateGuidance({
      query: tempQuery,
      user,
      options: {
        includeFormatted: true,
        includePlainLanguage: true,
        maxSteps: 5 // Limit steps for preview
      }
    });

    sendSuccess(res, {
      ...guidanceResponse,
      isPreview: true,
      message: 'This is a preview. Create a legal query to save and track your guidance.'
    }, 200, requestId);
  } catch (error) {
    logger.error('Error generating guidance preview', req.headers['x-request-id'] as string, undefined, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendInternalServerError(res, 'Failed to generate guidance preview', req.headers['x-request-id'] as string);
  }
});

// Test AI service connection
router.get('/test', authenticateToken, async (req: Request, res: Response) => {
  try {
    const requestId = req.headers['x-request-id'] as string;
    
    const isConnected = await legalGuidanceService.testService();
    
    if (isConnected) {
      sendSuccess(res, { 
        status: 'connected',
        message: 'AI legal guidance service is operational'
      }, 200, requestId);
    } else {
      sendError(res, 'SERVICE_UNAVAILABLE', 'AI legal guidance service is not available', 503, undefined, requestId);
    }
  } catch (error) {
    logger.error('Error testing legal guidance service', req.headers['x-request-id'] as string, undefined, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendInternalServerError(res, 'Failed to test legal guidance service', req.headers['x-request-id'] as string);
  }
});

export default router;