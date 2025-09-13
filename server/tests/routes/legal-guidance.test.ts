import request from 'supertest';
import express from 'express';
import legalGuidanceRoutes from '../../routes/legal-guidance';
import { authenticateToken } from '../../middleware/auth';

// Mock dependencies
jest.mock('../../database/operations');
jest.mock('../../services/legal-guidance-service');
jest.mock('../../middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/legal-guidance', legalGuidanceRoutes);

// Mock auth middleware
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
mockAuthenticateToken.mockImplementation(async (req: any, res, next) => {
  req.user = {
    id: 'test-user-id',
    email: 'test@example.com',
    profile: {
      culturalBackground: 'American',
      preferredLanguage: 'en'
    },
    preferences: {
      communicationStyle: 'formal'
    }
  };
  next();
});

// Mock database operations
const mockLegalQueryOperations = require('../../database/operations').LegalQueryOperations;
mockLegalQueryOperations.findById = jest.fn();
mockLegalQueryOperations.updateStatus = jest.fn();

// Mock legal guidance service
const mockLegalGuidanceService = require('../../services/legal-guidance-service').legalGuidanceService;
mockLegalGuidanceService.generateGuidance = jest.fn();
mockLegalGuidanceService.testService = jest.fn();

describe('Legal Guidance Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/legal-guidance/queries/:queryId/guidance', () => {
    const mockQuery = {
      id: 'test-query-id',
      userId: 'test-user-id',
      description: 'Contract dispute',
      category: 'contract_dispute',
      jurisdiction: ['United States'],
      urgency: 'medium',
      status: 'pending'
    };

    const mockGuidanceResponse = {
      guidance: {
        queryId: 'test-query-id',
        steps: [
          {
            order: 1,
            title: 'Document the Issue',
            description: 'Gather all relevant documents',
            timeframe: 'Immediately',
            resources: [],
            jurisdictionSpecific: false
          }
        ],
        applicableLaws: [],
        culturalConsiderations: [],
        nextActions: ['Document evidence'],
        confidence: 0.85,
        createdAt: new Date()
      },
      formatted: {
        immediateActions: [],
        shortTermActions: [],
        longTermActions: [],
        summary: {
          keyNextActions: ['Document evidence'],
          professionalHelpNeeded: true,
          urgentDeadlines: [],
          estimatedTimeframe: '1-2 weeks'
        }
      },
      plainLanguageSummary: 'Here is what you need to do...',
      processingMetadata: {
        processingTime: 1500,
        aiModel: 'gpt-4',
        promptTokens: 500,
        responseTokens: 300
      }
    };

    it('should generate guidance for valid query', async () => {
      mockLegalQueryOperations.findById.mockResolvedValue(mockQuery);
      mockLegalQueryOperations.updateStatus.mockResolvedValue(mockQuery);
      mockLegalGuidanceService.generateGuidance.mockResolvedValue(mockGuidanceResponse);

      const response = await request(app)
        .post('/api/legal-guidance/queries/test-query-id/guidance')
        .send({
          includeFormatted: true,
          includePlainLanguage: true,
          maxSteps: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.guidance).toBeDefined();
      expect(response.body.data.formatted).toBeDefined();
      expect(response.body.data.plainLanguageSummary).toBeDefined();
    });

    it('should return 404 for non-existent query', async () => {
      mockLegalQueryOperations.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/legal-guidance/queries/non-existent-id/guidance')
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for unauthorized access', async () => {
      const unauthorizedQuery = {
        ...mockQuery,
        userId: 'different-user-id'
      };
      mockLegalQueryOperations.findById.mockResolvedValue(unauthorizedQuery);

      const response = await request(app)
        .post('/api/legal-guidance/queries/test-query-id/guidance')
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid query ID', async () => {
      const response = await request(app)
        .post('/api/legal-guidance/queries/invalid-id/guidance')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      mockLegalQueryOperations.findById.mockResolvedValue(mockQuery);
      mockLegalGuidanceService.generateGuidance.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/legal-guidance/queries/test-query-id/guidance')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/legal-guidance/queries/:queryId/guidance', () => {
    it('should return query status for existing query', async () => {
      const mockQuery = {
        id: 'test-query-id',
        userId: 'test-user-id',
        status: 'completed'
      };
      mockLegalQueryOperations.findById.mockResolvedValue(mockQuery);

      const response = await request(app)
        .get('/api/legal-guidance/queries/test-query-id/guidance');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });
  });

  describe('POST /api/legal-guidance/preview', () => {
    it('should generate guidance preview', async () => {
      const mockGuidanceResponse = {
        guidance: {
          queryId: 'preview',
          steps: [
            {
              order: 1,
              title: 'Initial Step',
              description: 'First action to take',
              timeframe: 'Immediately',
              resources: [],
              jurisdictionSpecific: false
            }
          ],
          applicableLaws: [],
          culturalConsiderations: [],
          nextActions: ['Take initial action'],
          confidence: 0.8,
          createdAt: new Date()
        },
        processingMetadata: {
          processingTime: 1000,
          aiModel: 'gpt-4',
          promptTokens: 300,
          responseTokens: 200
        }
      };

      mockLegalGuidanceService.generateGuidance.mockResolvedValue(mockGuidanceResponse);

      const response = await request(app)
        .post('/api/legal-guidance/preview')
        .send({
          description: 'Contract dispute with vendor over delivery terms',
          category: 'contract_dispute',
          jurisdiction: ['United States'],
          urgency: 'medium'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isPreview).toBe(true);
      expect(response.body.data.guidance).toBeDefined();
    });

    it('should return 400 for invalid description', async () => {
      const response = await request(app)
        .post('/api/legal-guidance/preview')
        .send({
          description: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/legal-guidance/test', () => {
    it('should return service status when connected', async () => {
      mockLegalGuidanceService.testService.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/legal-guidance/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('connected');
    });

    it('should return 503 when service unavailable', async () => {
      mockLegalGuidanceService.testService.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/legal-guidance/test');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });
  });
});