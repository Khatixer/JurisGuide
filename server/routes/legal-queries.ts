import express from 'express';
import { Request, Response } from 'express';
import { LegalQueryOperations } from '../database/operations';
import { authenticateToken } from '../middleware/auth';
import { 
  validateLegalQuery, 
  sanitizeInput, 
  isValidUUID,
  isValidLegalCategory 
} from '../utils/validation';
import { 
  sendSuccess, 
  sendError, 
  sendValidationError, 
  sendNotFoundError,
  sendInternalServerError 
} from '../utils/response';
import { LegalQuery, LegalCategory } from '../types';
import { detectJurisdiction, categorizeLegalQuery } from '../utils/legal-processing';
import { LegalQueryProcessor } from '../utils/legal-query-processor';

const router = express.Router();

// Create a new legal query
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { description, category, jurisdiction, urgency, culturalContext, language } = req.body;
    const userId = (req as any).user.id;
    const requestId = req.headers['x-request-id'] as string;

    // Sanitize inputs
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedCulturalContext = culturalContext ? sanitizeInput(culturalContext) : '';

    // Create query object for validation
    const queryData = {
      description: sanitizedDescription,
      category,
      jurisdiction,
      urgency,
      language: language || 'en',
      culturalContext: sanitizedCulturalContext
    };

    // Validate the query
    const validationErrors = validateLegalQuery(queryData);
    if (validationErrors.length > 0) {
      return sendValidationError(res, validationErrors, requestId);
    }

    // Use enhanced query processor
    const processedQuery = await LegalQueryProcessor.processQuery(
      {
        description: sanitizedDescription,
        category,
        jurisdiction,
        urgency,
        culturalContext: sanitizedCulturalContext,
        language: queryData.language
      },
      (req as any).user.profile?.location
    );

    // Validate processed query
    const validation = LegalQueryProcessor.validateQuery(processedQuery.enhancedQuery);
    if (!validation.isValid) {
      return sendValidationError(res, validation.issues, requestId);
    }

    // Create the legal query using enhanced data
    const newQuery: Omit<LegalQuery, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      description: sanitizedDescription,
      category: processedQuery.enhancedQuery.category!,
      jurisdiction: processedQuery.enhancedQuery.jurisdiction!,
      urgency: processedQuery.enhancedQuery.urgency!,
      culturalContext: processedQuery.enhancedQuery.culturalContext || sanitizedCulturalContext,
      language: processedQuery.enhancedQuery.language!,
      status: 'pending'
    };

    const createdQuery = await LegalQueryOperations.create(newQuery);
    
    // Include processing metadata in response
    sendSuccess(res, {
      query: createdQuery,
      processingMetadata: processedQuery.processingMetadata
    }, 201, requestId);
  } catch (error) {
    console.error('Error creating legal query:', error);
    sendInternalServerError(res, 'Failed to create legal query', req.headers['x-request-id'] as string);
  }
});

// Get all legal queries for the authenticated user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const requestId = req.headers['x-request-id'] as string;

    const queries = await LegalQueryOperations.findByUserId(userId);
    
    sendSuccess(res, queries, 200, requestId);
  } catch (error) {
    console.error('Error fetching legal queries:', error);
    sendInternalServerError(res, 'Failed to fetch legal queries', req.headers['x-request-id'] as string);
  }
});

// Get a specific legal query by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const requestId = req.headers['x-request-id'] as string;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return sendError(res, 'INVALID_ID', 'Invalid query ID format', 400, undefined, requestId);
    }

    const query = await LegalQueryOperations.findById(id);
    
    if (!query) {
      return sendNotFoundError(res, 'Legal query', requestId);
    }

    // Ensure user can only access their own queries
    if (query.userId !== userId) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this query', 403, undefined, requestId);
    }

    sendSuccess(res, query, 200, requestId);
  } catch (error) {
    console.error('Error fetching legal query:', error);
    sendInternalServerError(res, 'Failed to fetch legal query', req.headers['x-request-id'] as string);
  }
});

// Update legal query status
router.patch('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = (req as any).user.id;
    const requestId = req.headers['x-request-id'] as string;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return sendError(res, 'INVALID_ID', 'Invalid query ID format', 400, undefined, requestId);
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'completed', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      return sendError(res, 'INVALID_STATUS', 'Invalid status value', 400, undefined, requestId);
    }

    // Check if query exists and belongs to user
    const existingQuery = await LegalQueryOperations.findById(id);
    if (!existingQuery) {
      return sendNotFoundError(res, 'Legal query', requestId);
    }

    if (existingQuery.userId !== userId) {
      return sendError(res, 'FORBIDDEN', 'Access denied to this query', 403, undefined, requestId);
    }

    const updatedQuery = await LegalQueryOperations.updateStatus(id, status);
    
    if (!updatedQuery) {
      return sendInternalServerError(res, 'Failed to update query status', requestId);
    }

    sendSuccess(res, updatedQuery, 200, requestId);
  } catch (error) {
    console.error('Error updating legal query status:', error);
    sendInternalServerError(res, 'Failed to update legal query status', req.headers['x-request-id'] as string);
  }
});

// Analyze query without creating it (for preview/validation)
router.post('/analyze', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { description, category, jurisdiction, urgency, culturalContext, language } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    if (!description || description.trim().length < 10) {
      return sendError(res, 'INVALID_DESCRIPTION', 'Description must be at least 10 characters long', 400, undefined, requestId);
    }

    // Sanitize inputs
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedCulturalContext = culturalContext ? sanitizeInput(culturalContext) : '';

    // Process query for analysis
    const processedQuery = await LegalQueryProcessor.processQuery(
      {
        description: sanitizedDescription,
        category,
        jurisdiction,
        urgency,
        culturalContext: sanitizedCulturalContext,
        language: language || 'en'
      },
      (req as any).user.profile?.location
    );

    // Validate processed query
    const validation = LegalQueryProcessor.validateQuery(processedQuery.enhancedQuery);

    sendSuccess(res, {
      originalQuery: processedQuery.originalQuery,
      enhancedQuery: processedQuery.enhancedQuery,
      processingMetadata: processedQuery.processingMetadata,
      validation
    }, 200, requestId);
  } catch (error) {
    console.error('Error analyzing legal query:', error);
    sendInternalServerError(res, 'Failed to analyze legal query', req.headers['x-request-id'] as string);
  }
});

// Search legal queries with filters
router.get('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { category, status, urgency, jurisdiction } = req.query;
    const requestId = req.headers['x-request-id'] as string;

    // Get all user queries first
    let queries = await LegalQueryOperations.findByUserId(userId);

    // Apply filters
    if (category && isValidLegalCategory(category as string)) {
      queries = queries.filter(q => q.category === category);
    }

    if (status) {
      const validStatuses = ['pending', 'processing', 'completed', 'failed'];
      if (validStatuses.includes(status as string)) {
        queries = queries.filter(q => q.status === status);
      }
    }

    if (urgency) {
      const validUrgencies = ['low', 'medium', 'high', 'critical'];
      if (validUrgencies.includes(urgency as string)) {
        queries = queries.filter(q => q.urgency === urgency);
      }
    }

    if (jurisdiction) {
      queries = queries.filter(q => 
        q.jurisdiction.some(j => 
          j.toLowerCase().includes((jurisdiction as string).toLowerCase())
        )
      );
    }

    sendSuccess(res, queries, 200, requestId);
  } catch (error) {
    console.error('Error searching legal queries:', error);
    sendInternalServerError(res, 'Failed to search legal queries', req.headers['x-request-id'] as string);
  }
});

export default router;