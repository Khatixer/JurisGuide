import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import legalQueryRoutes from '../../routes/legal-queries';
import { LegalQueryOperations } from '../../database/operations';
import { authenticateToken } from '../../middleware/auth';
import { LegalQuery, LegalCategory } from '../../types';
import { LegalQueryProcessor } from '../../utils/legal-query-processor';

// Mock dependencies
jest.mock('../../database/operations');
jest.mock('../../middleware/auth');
jest.mock('../../utils/legal-processing');
jest.mock('../../utils/legal-query-processor');

const app = express();
app.use(express.json());
app.use('/api/legal-queries', legalQueryRoutes);

// Mock user for authentication
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  profile: {
    location: {
      country: 'United States',
      state: 'California'
    }
  }
};

// Mock authentication middleware
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
mockAuthenticateToken.mockImplementation(async (req: any, res: any, next: any) => {
  req.user = mockUser;
  next();
});

// Mock database operations
const mockLegalQueryOperations = LegalQueryOperations as jest.Mocked<typeof LegalQueryOperations>;

// Mock LegalQueryProcessor
const mockLegalQueryProcessor = LegalQueryProcessor as jest.Mocked<typeof LegalQueryProcessor>;
mockLegalQueryProcessor.processQuery = jest.fn();
mockLegalQueryProcessor.validateQuery = jest.fn();

describe('Legal Queries API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/legal-queries', () => {
    it('should create a new legal query successfully', async () => {
      const mockQuery: LegalQuery = {
        id: 'query-123',
        userId: 'user-123',
        description: 'Contract dispute with vendor',
        category: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        urgency: 'medium',
        culturalContext: '',
        language: 'en',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock the processor
      mockLegalQueryProcessor.processQuery.mockResolvedValue({
        originalQuery: {
          description: 'Contract dispute with vendor',
          category: 'contract_dispute',
          jurisdiction: ['United States'],
          urgency: 'medium',
          language: 'en'
        },
        enhancedQuery: {
          description: 'Contract dispute with vendor',
          category: 'contract_dispute',
          jurisdiction: ['United States'],
          urgency: 'medium',
          culturalContext: '',
          language: 'en'
        },
        processingMetadata: {
          categoryConfidence: 0.9,
          urgencyConfidence: 0.8,
          jurisdictionSources: ['user_location'],
          alternativeCategories: [],
          urgencyIndicators: [],
          processingTime: 100
        }
      });

      mockLegalQueryProcessor.validateQuery.mockReturnValue({
        isValid: true,
        score: 85,
        issues: [],
        suggestions: []
      });

      mockLegalQueryOperations.create.mockResolvedValue(mockQuery);

      const response = await request(app)
        .post('/api/legal-queries')
        .send({
          description: 'Contract dispute with vendor',
          category: 'contract_dispute',
          jurisdiction: ['United States'],
          urgency: 'medium',
          language: 'en'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.query).toMatchObject({
        id: mockQuery.id,
        userId: mockQuery.userId,
        description: mockQuery.description,
        category: mockQuery.category,
        jurisdiction: mockQuery.jurisdiction,
        urgency: mockQuery.urgency,
        language: mockQuery.language,
        status: mockQuery.status
      });
      expect(response.body.data.processingMetadata).toBeDefined();
      expect(mockLegalQueryOperations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          description: 'Contract dispute with vendor',
          category: 'contract_dispute',
          jurisdiction: ['United States'],
          urgency: 'medium',
          language: 'en',
          status: 'pending'
        })
      );
    });

    it('should return validation error for invalid input', async () => {
      const response = await request(app)
        .post('/api/legal-queries')
        .send({
          description: 'Short', // Too short
          category: 'invalid_category',
          jurisdiction: [],
          urgency: 'invalid_urgency'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database errors gracefully', async () => {
      mockLegalQueryOperations.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/legal-queries')
        .send({
          description: 'Valid contract dispute description',
          category: 'contract_dispute',
          jurisdiction: ['United States'],
          urgency: 'medium'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('GET /api/legal-queries', () => {
    it('should return all queries for authenticated user', async () => {
      const mockQueries: LegalQuery[] = [
        {
          id: 'query-1',
          userId: 'user-123',
          description: 'First query',
          category: 'contract_dispute' as LegalCategory,
          jurisdiction: ['United States'],
          urgency: 'medium',
          culturalContext: '',
          language: 'en',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'query-2',
          userId: 'user-123',
          description: 'Second query',
          category: 'employment_law' as LegalCategory,
          jurisdiction: ['United States'],
          urgency: 'high',
          culturalContext: '',
          language: 'en',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockLegalQueryOperations.findByUserId.mockResolvedValue(mockQueries);

      const response = await request(app)
        .get('/api/legal-queries');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        id: 'query-1',
        userId: 'user-123',
        description: 'First query',
        category: 'contract_dispute'
      });
      expect(mockLegalQueryOperations.findByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should handle database errors', async () => {
      mockLegalQueryOperations.findByUserId.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/legal-queries');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/legal-queries/:id', () => {
    it('should return specific query for authenticated user', async () => {
      const mockQuery: LegalQuery = {
        id: 'query-123',
        userId: 'user-123',
        description: 'Contract dispute',
        category: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        urgency: 'medium',
        culturalContext: '',
        language: 'en',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockLegalQueryOperations.findById.mockResolvedValue(mockQuery);

      const response = await request(app)
        .get('/api/legal-queries/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: mockQuery.id,
        userId: mockQuery.userId,
        description: mockQuery.description,
        category: mockQuery.category
      });
    });

    it('should return 404 for non-existent query', async () => {
      mockLegalQueryOperations.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/legal-queries/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 for query belonging to different user', async () => {
      const mockQuery: LegalQuery = {
        id: 'query-123',
        userId: 'different-user',
        description: 'Contract dispute',
        category: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        urgency: 'medium',
        culturalContext: '',
        language: 'en',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockLegalQueryOperations.findById.mockResolvedValue(mockQuery);

      const response = await request(app)
        .get('/api/legal-queries/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/legal-queries/invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });

  describe('PATCH /api/legal-queries/:id/status', () => {
    it('should update query status successfully', async () => {
      const existingQuery: LegalQuery = {
        id: 'query-123',
        userId: 'user-123',
        description: 'Contract dispute',
        category: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        urgency: 'medium',
        culturalContext: '',
        language: 'en',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedQuery: LegalQuery = { ...existingQuery, status: 'processing' };

      mockLegalQueryOperations.findById.mockResolvedValue(existingQuery);
      mockLegalQueryOperations.updateStatus.mockResolvedValue(updatedQuery);

      const response = await request(app)
        .patch('/api/legal-queries/550e8400-e29b-41d4-a716-446655440000/status')
        .send({ status: 'processing' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('processing');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch('/api/legal-queries/550e8400-e29b-41d4-a716-446655440000/status')
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });
});