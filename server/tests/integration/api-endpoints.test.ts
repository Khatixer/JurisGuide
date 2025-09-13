import request from 'supertest';
import express from 'express';
import { seedTestData, testDb } from '../setup';
import authRoutes from '../../routes/auth';
import legalQueriesRoutes from '../../routes/legal-queries';
import legalGuidanceRoutes from '../../routes/legal-guidance';
import lawyersRoutes from '../../routes/lawyers';
import mediationRoutes from '../../routes/mediation';
import authMiddleware from '../../middleware/auth';

describe('API Endpoints Integration Tests', () => {
  let app: express.Application;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    
    // Add routes
    app.use('/api/auth', authRoutes);
    app.use('/api/legal-queries', authMiddleware, legalQueriesRoutes);
    app.use('/api/legal-guidance', authMiddleware, legalGuidanceRoutes);
    app.use('/api/lawyers', authMiddleware, lawyersRoutes);
    app.use('/api/mediation', authMiddleware, mediationRoutes);
  });

  beforeEach(async () => {
    await seedTestData();
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test1@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
    userId = loginResponse.body.user.id;
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/register - should create new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          profile: {
            firstName: 'New',
            lastName: 'User',
            location: { country: 'US', state: 'NY', city: 'New York' },
            culturalBackground: 'Western',
            preferredLanguage: 'en',
            timezone: 'America/New_York'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.token).toBeDefined();
    });

    test('POST /api/auth/login - should authenticate user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test1@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test1@example.com');
    });

    test('POST /api/auth/login - should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test1@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Legal Queries Endpoints', () => {
    test('POST /api/legal-queries - should create legal query', async () => {
      const queryData = {
        description: 'I need help with a contract dispute',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'medium',
        culturalContext: 'Western business practices',
        language: 'en'
      };

      const response = await request(app)
        .post('/api/legal-queries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(queryData);

      expect(response.status).toBe(201);
      expect(response.body.query.description).toBe(queryData.description);
      expect(response.body.query.userId).toBe(userId);
    });

    test('GET /api/legal-queries - should retrieve user queries', async () => {
      // First create a query
      await request(app)
        .post('/api/legal-queries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test query',
          category: 'contract-law',
          jurisdiction: ['US-CA'],
          urgency: 'low',
          language: 'en'
        });

      const response = await request(app)
        .get('/api/legal-queries')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.queries)).toBe(true);
      expect(response.body.queries.length).toBeGreaterThan(0);
    });
  });

  describe('Legal Guidance Endpoints', () => {
    test('POST /api/legal-guidance/generate - should generate guidance', async () => {
      // First create a legal query
      const queryResponse = await request(app)
        .post('/api/legal-queries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Contract breach issue',
          category: 'contract-law',
          jurisdiction: ['US-CA'],
          urgency: 'medium',
          language: 'en'
        });

      const queryId = queryResponse.body.query.id;

      const response = await request(app)
        .post('/api/legal-guidance/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ queryId });

      expect(response.status).toBe(200);
      expect(response.body.guidance).toBeDefined();
      expect(response.body.guidance.steps).toBeDefined();
      expect(Array.isArray(response.body.guidance.steps)).toBe(true);
    });
  });

  describe('Lawyers Endpoints', () => {
    test('GET /api/lawyers/search - should search lawyers', async () => {
      const searchCriteria = {
        budget: { min: 100, max: 500 },
        location: { country: 'US', state: 'CA' },
        caseType: 'family-law',
        urgency: 'medium',
        languagePreference: 'en'
      };

      const response = await request(app)
        .post('/api/lawyers/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send(searchCriteria);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.lawyers)).toBe(true);
    });

    test('GET /api/lawyers/:id - should get lawyer profile', async () => {
      const lawyerId = '660e8400-e29b-41d4-a716-446655440001';
      
      const response = await request(app)
        .get(`/api/lawyers/${lawyerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.lawyer.id).toBe(lawyerId);
      expect(response.body.lawyer.profile).toBeDefined();
    });
  });

  describe('Mediation Endpoints', () => {
    test('POST /api/mediation/cases - should create mediation case', async () => {
      const caseData = {
        parties: [
          { userId: userId, role: 'complainant' },
          { userId: '550e8400-e29b-41d4-a716-446655440002', role: 'respondent' }
        ],
        dispute: {
          summary: 'Contract payment dispute',
          category: 'contract-law',
          jurisdiction: ['US-CA'],
          culturalFactors: ['business-practices']
        }
      };

      const response = await request(app)
        .post('/api/mediation/cases')
        .set('Authorization', `Bearer ${authToken}`)
        .send(caseData);

      expect(response.status).toBe(201);
      expect(response.body.case.parties).toHaveLength(2);
      expect(response.body.case.dispute.summary).toBe(caseData.dispute.summary);
    });

    test('GET /api/mediation/cases - should retrieve user mediation cases', async () => {
      const response = await request(app)
        .get('/api/mediation/cases')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.cases)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle unauthorized requests', async () => {
      const response = await request(app)
        .get('/api/legal-queries')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    test('should handle invalid request data', async () => {
      const response = await request(app)
        .post('/api/legal-queries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          description: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should handle non-existent resources', async () => {
      const response = await request(app)
        .get('/api/lawyers/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
  });
});