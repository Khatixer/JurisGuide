import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { createMediationRoutes } from '../../routes/mediation';
import { MediationService } from '../../services/mediation-service';

// Mock the MediationService
jest.mock('../../services/mediation-service');
const MockedMediationService = MediationService as jest.MockedClass<typeof MediationService>;

// Mock middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'user-123', email: 'test@example.com' };
    req.id = 'request-123';
    next();
  }
}));

describe('Mediation Routes', () => {
  let app: express.Application;
  let mockMediationService: jest.Mocked<MediationService>;
  let mockDb: Pool;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    mockDb = {} as Pool;
    mockMediationService = new MockedMediationService(mockDb) as jest.Mocked<MediationService>;
    
    // Mock the constructor to return our mocked service
    MockedMediationService.mockImplementation(() => mockMediationService);
    
    app.use('/api/mediation', createMediationRoutes(mockDb));
  });

  describe('POST /api/mediation/cases', () => {
    const validCaseData = {
      parties: [
        {
          userId: 'user1',
          role: 'plaintiff',
          contactInfo: { email: 'user1@example.com' }
        },
        {
          userId: 'user2',
          role: 'defendant',
          contactInfo: { email: 'user2@example.com' }
        }
      ],
      dispute: {
        summary: 'Contract dispute over payment terms',
        category: 'contract_dispute',
        jurisdiction: ['US', 'CA'],
        culturalFactors: ['business_culture']
      },
      mediatorConfig: {
        model: 'gpt-4',
        configuration: {
          culturalSensitivity: true,
          jurisdictionAware: true,
          language: 'en'
        }
      }
    };

    it('should create mediation case successfully', async () => {
      const mockCase = {
        id: 'case-123',
        ...validCaseData,
        status: 'active',
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockMediationService.createMediationCase.mockResolvedValueOnce(mockCase);

      const response = await request(app)
        .post('/api/mediation/cases')
        .send(validCaseData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('case-123');
      expect(mockMediationService.createMediationCase).toHaveBeenCalledWith(
        validCaseData.parties,
        validCaseData.dispute,
        validCaseData.mediatorConfig
      );
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = { parties: [] };

      const response = await request(app)
        .post('/api/mediation/cases')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for insufficient parties', async () => {
      const invalidData = {
        ...validCaseData,
        parties: [validCaseData.parties[0]] // Only one party
      };

      const response = await request(app)
        .post('/api/mediation/cases')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PARTIES');
    });

    it('should return 400 for invalid dispute details', async () => {
      const invalidData = {
        ...validCaseData,
        dispute: { summary: 'Test' } // Missing required fields
      };

      const response = await request(app)
        .post('/api/mediation/cases')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_DISPUTE');
    });

    it('should handle service errors', async () => {
      mockMediationService.createMediationCase.mockRejectedValueOnce(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/mediation/cases')
        .send(validCaseData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/mediation/cases/:caseId', () => {
    it('should return mediation case for authorized user', async () => {
      const mockCase = {
        id: 'case-123',
        parties: [
          { userId: 'user-123', role: 'plaintiff', contactInfo: { email: 'test@example.com' } }
        ],
        dispute: { summary: 'Test dispute' },
        status: 'active',
        mediator: { model: 'gpt-4' },
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);

      const response = await request(app)
        .get('/api/mediation/cases/case-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('case-123');
    });

    it('should return 404 for non-existent case', async () => {
      mockMediationService.getMediationCase.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/mediation/cases/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CASE_NOT_FOUND');
    });

    it('should return 403 for unauthorized user', async () => {
      const mockCase = {
        id: 'case-123',
        parties: [
          { userId: 'other-user', role: 'plaintiff', contactInfo: { email: 'other@example.com' } }
        ],
        dispute: { summary: 'Test dispute' },
        status: 'active',
        mediator: { model: 'gpt-4' },
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);

      const response = await request(app)
        .get('/api/mediation/cases/case-123')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/mediation/cases', () => {
    it('should return user mediation cases', async () => {
      const mockCases = [
        {
          id: 'case-1',
          parties: [{ userId: 'user-123', role: 'plaintiff' }],
          dispute: { summary: 'Dispute 1' },
          status: 'active',
          mediator: { model: 'gpt-4' },
          documents: [],
          timeline: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockMediationService.getMediationCasesByUser.mockResolvedValueOnce(mockCases);

      const response = await request(app)
        .get('/api/mediation/cases')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockMediationService.getMediationCasesByUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('PATCH /api/mediation/cases/:caseId/status', () => {
    it('should update mediation status for authorized user', async () => {
      const mockCase = {
        id: 'case-123',
        parties: [
          { userId: 'user-123', role: 'plaintiff', contactInfo: { email: 'test@example.com' } }
        ],
        dispute: { summary: 'Test dispute' },
        status: 'active',
        mediator: { model: 'gpt-4' },
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);
      mockMediationService.updateMediationStatus.mockResolvedValueOnce();

      const response = await request(app)
        .patch('/api/mediation/cases/case-123/status')
        .send({ status: 'resolved' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockMediationService.updateMediationStatus).toHaveBeenCalledWith('case-123', 'resolved');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch('/api/mediation/cases/case-123/status')
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });

  describe('POST /api/mediation/cases/:caseId/events', () => {
    it('should add event to mediation case', async () => {
      const mockCase = {
        id: 'case-123',
        parties: [
          { userId: 'user-123', role: 'plaintiff', contactInfo: { email: 'test@example.com' } }
        ],
        dispute: { summary: 'Test dispute' },
        status: 'active',
        mediator: { model: 'gpt-4' },
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockEvent = {
        id: 'event-123',
        timestamp: new Date(),
        type: 'message' as const,
        content: 'Test message',
        party: 'test@example.com'
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);
      mockMediationService.addMediationEvent.mockResolvedValueOnce(mockEvent);

      const response = await request(app)
        .post('/api/mediation/cases/case-123/events')
        .send({
          type: 'message',
          content: 'Test message',
          metadata: { source: 'web' }
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('event-123');
    });

    it('should return 400 for invalid event type', async () => {
      const response = await request(app)
        .post('/api/mediation/cases/case-123/events')
        .send({
          type: 'invalid_type',
          content: 'Test message'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TYPE');
    });
  });

  describe('GET /api/mediation/cases/:caseId/events', () => {
    it('should return mediation events for authorized user', async () => {
      const mockCase = {
        id: 'case-123',
        parties: [
          { userId: 'user-123', role: 'plaintiff', contactInfo: { email: 'test@example.com' } }
        ],
        dispute: { summary: 'Test dispute' },
        status: 'active',
        mediator: { model: 'gpt-4' },
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockEvents = [
        {
          id: 'event-1',
          timestamp: new Date(),
          type: 'message' as const,
          content: 'First message',
          party: 'user1'
        }
      ];

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);
      mockMediationService.getMediationEvents.mockResolvedValueOnce(mockEvents);

      const response = await request(app)
        .get('/api/mediation/cases/case-123/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('POST /api/mediation/cases/:caseId/parties', () => {
    it('should add party to mediation case', async () => {
      const mockCase = {
        id: 'case-123',
        parties: [
          { userId: 'user-123', role: 'plaintiff', contactInfo: { email: 'test@example.com' } }
        ],
        dispute: { summary: 'Test dispute' },
        status: 'active',
        mediator: { model: 'gpt-4' },
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const newParty = {
        userId: 'user2',
        role: 'defendant',
        contactInfo: { email: 'user2@example.com' }
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);
      mockMediationService.addPartyToCase.mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/mediation/cases/case-123/parties')
        .send({ party: newParty })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockMediationService.addPartyToCase).toHaveBeenCalledWith('case-123', newParty);
    });

    it('should return 400 for invalid party data', async () => {
      const invalidParty = {
        userId: 'user2',
        // Missing role and contactInfo
      };

      const response = await request(app)
        .post('/api/mediation/cases/case-123/parties')
        .send({ party: invalidParty })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PARTY');
    });
  });

  describe('GET /api/mediation/cases/:caseId/summary', () => {
    it('should generate dispute summary for authorized user', async () => {
      const mockCase = {
        id: 'case-123',
        parties: [
          { userId: 'user-123', role: 'plaintiff', contactInfo: { email: 'test@example.com' } }
        ],
        dispute: { summary: 'Test dispute' },
        status: 'active',
        mediator: { model: 'gpt-4' },
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockSummary = 'Dispute Summary for Case case-123...';

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);
      mockMediationService.generateDisputeSummary.mockResolvedValueOnce(mockSummary);

      const response = await request(app)
        .get('/api/mediation/cases/case-123/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBe(mockSummary);
    });
  });
});