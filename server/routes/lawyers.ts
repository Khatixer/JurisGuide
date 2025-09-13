import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { LawyerService } from '../services/lawyer-service';
import { LawyerMatchingService } from '../services/lawyer-matching-service';
import { validateRequest } from '../utils/validation';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { Lawyer, LawyerProfile, MatchingCriteria } from '../types';

const router = express.Router();
const lawyerService = new LawyerService();
const matchingService = new LawyerMatchingService();

// Validation schemas
const lawyerRegistrationSchema = {
  profile: {
    name: { type: 'string', required: true, minLength: 2 },
    barNumber: { type: 'string', required: true },
    jurisdiction: { type: 'array', required: true, minItems: 1 },
    experience: { type: 'number', required: true, min: 0 },
    languages: { type: 'array', required: true, minItems: 1 },
    bio: { type: 'string', required: true, minLength: 50 },
    education: { type: 'array', required: true, minItems: 1 }
  },
  specializations: { type: 'array', required: true, minItems: 1 },
  location: {
    latitude: { type: 'number', required: true },
    longitude: { type: 'number', required: true },
    address: { type: 'string', required: true },
    city: { type: 'string', required: true },
    state: { type: 'string', required: true },
    country: { type: 'string', required: true },
    postalCode: { type: 'string', required: true }
  },
  availability: {
    timezone: { type: 'string', required: true },
    workingHours: {
      start: { type: 'string', required: true },
      end: { type: 'string', required: true }
    },
    workingDays: { type: 'array', required: true, minItems: 1 },
    emergencyAvailable: { type: 'boolean', required: true }
  },
  pricing: {
    consultationFee: { type: 'number', required: true, min: 0 },
    hourlyRate: { type: 'number', required: true, min: 0 },
    currency: { type: 'string', required: true },
    paymentMethods: { type: 'array', required: true, minItems: 1 }
  }
};

const matchingCriteriaSchema = {
  budget: {
    min: { type: 'number', required: true, min: 0 },
    max: { type: 'number', required: true, min: 0 },
    currency: { type: 'string', required: true }
  },
  location: {
    latitude: { type: 'number', required: true },
    longitude: { type: 'number', required: true }
  },
  caseType: { type: 'string', required: true },
  urgency: { type: 'string', required: true },
  languagePreference: { type: 'string', required: true }
};

// Register as a lawyer
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const validation = validateRequest(req.body, lawyerRegistrationSchema);
    if (!validation.isValid) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid lawyer registration data', validation.errors));
    }

    const lawyerData = req.body as Omit<Lawyer, 'id' | 'ratings' | 'verificationStatus' | 'createdAt' | 'updatedAt'>;
    const lawyer = await lawyerService.registerLawyer(lawyerData);

    logger.info('Lawyer registered successfully', undefined, undefined, { lawyerId: lawyer.id });
    res.status(201).json(createSuccessResponse(lawyer));
  } catch (error) {
    logger.error('Error registering lawyer', undefined, undefined, error);
    res.status(500).json(createErrorResponse('REGISTRATION_ERROR', 'Failed to register lawyer'));
  }
});

// Get lawyer profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lawyer = await lawyerService.getLawyerById(id);

    if (!lawyer) {
      return res.status(404).json(createErrorResponse('LAWYER_NOT_FOUND', 'Lawyer not found'));
    }

    res.json(createSuccessResponse(lawyer));
  } catch (error) {
    logger.error('Error fetching lawyer', undefined, undefined, error);
    res.status(500).json(createErrorResponse('FETCH_ERROR', 'Failed to fetch lawyer'));
  }
});

// Update lawyer profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedLawyer = await lawyerService.updateLawyer(id, updates);
    if (!updatedLawyer) {
      return res.status(404).json(createErrorResponse('LAWYER_NOT_FOUND', 'Lawyer not found'));
    }

    logger.info('Lawyer profile updated', undefined, undefined, { lawyerId: id });
    res.json(createSuccessResponse(updatedLawyer));
  } catch (error) {
    logger.error('Error updating lawyer', undefined, undefined, error);
    res.status(500).json(createErrorResponse('UPDATE_ERROR', 'Failed to update lawyer profile'));
  }
});

// Search and match lawyers
router.post('/search', async (req, res) => {
  try {
    const validation = validateRequest(req.body, matchingCriteriaSchema);
    if (!validation.isValid) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid search criteria', validation.errors));
    }

    const criteria = req.body as MatchingCriteria;
    const matchingResults = await matchingService.findMatchingLawyers(criteria);

    res.json(createSuccessResponse(matchingResults));
  } catch (error) {
    logger.error('Error searching lawyers', undefined, undefined, error);
    res.status(500).json(createErrorResponse('SEARCH_ERROR', 'Failed to search lawyers'));
  }
});

// Get matching explanation for a specific lawyer
router.post('/match-explanation', async (req, res) => {
  try {
    const { lawyerId, criteria } = req.body;

    if (!lawyerId || !criteria) {
      return res.status(400).json(createErrorResponse('MISSING_PARAMS', 'Lawyer ID and criteria are required'));
    }

    // Get the lawyer details
    const lawyer = await lawyerService.getLawyerById(lawyerId);
    if (!lawyer) {
      return res.status(404).json(createErrorResponse('LAWYER_NOT_FOUND', 'Lawyer not found'));
    }

    // Find matching results to get the score
    const matchingResults = await matchingService.findMatchingLawyers(criteria);
    const matchingScore = matchingResults.find(result => result.lawyer.id === lawyerId);

    if (!matchingScore) {
      return res.status(404).json(createErrorResponse('MATCH_NOT_FOUND', 'Lawyer does not match the criteria'));
    }

    const explanations = await matchingService.getMatchingExplanation(matchingScore, criteria);

    res.json(createSuccessResponse({
      lawyer: matchingScore.lawyer,
      score: matchingScore.score,
      factors: matchingScore.factors,
      explanations
    }));
  } catch (error) {
    logger.error('Error getting match explanation', undefined, undefined, error);
    res.status(500).json(createErrorResponse('EXPLANATION_ERROR', 'Failed to get match explanation'));
  }
});

// Get lawyers by specialization
router.get('/specialization/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const lawyers = await lawyerService.getLawyersBySpecialization(category);

    res.json(createSuccessResponse(lawyers));
  } catch (error) {
    logger.error('Error fetching lawyers by specialization', undefined, undefined, error);
    res.status(500).json(createErrorResponse('FETCH_ERROR', 'Failed to fetch lawyers'));
  }
});

// Update verification status (admin only)
router.patch('/:id/verification', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['verified', 'pending', 'unverified'].includes(status)) {
      return res.status(400).json(createErrorResponse('INVALID_STATUS', 'Invalid verification status'));
    }

    const updatedLawyer = await lawyerService.updateVerificationStatus(id, status);
    if (!updatedLawyer) {
      return res.status(404).json(createErrorResponse('LAWYER_NOT_FOUND', 'Lawyer not found'));
    }

    logger.info('Lawyer verification status updated', undefined, undefined, { lawyerId: id, status });
    res.json(createSuccessResponse(updatedLawyer));
  } catch (error) {
    logger.error('Error updating verification status', undefined, undefined, error);
    res.status(500).json(createErrorResponse('UPDATE_ERROR', 'Failed to update verification status'));
  }
});

// Add rating for lawyer
router.post('/:id/ratings', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { score, review } = req.body;
    const userId = (req as any).user.id;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json(createErrorResponse('INVALID_RATING', 'Rating must be between 1 and 5'));
    }

    const rating = await lawyerService.addRating(id, userId, score, review);
    
    logger.info('Rating added for lawyer', undefined, undefined, { lawyerId: id, userId, score });
    res.status(201).json(createSuccessResponse(rating));
  } catch (error) {
    logger.error('Error adding rating', undefined, undefined, error);
    res.status(500).json(createErrorResponse('RATING_ERROR', 'Failed to add rating'));
  }
});

// Get lawyer ratings
router.get('/:id/ratings', async (req, res) => {
  try {
    const { id } = req.params;
    const ratings = await lawyerService.getLawyerRatings(id);

    res.json(createSuccessResponse(ratings));
  } catch (error) {
    logger.error('Error fetching ratings', undefined, undefined, error);
    res.status(500).json(createErrorResponse('FETCH_ERROR', 'Failed to fetch ratings'));
  }
});

export default router;