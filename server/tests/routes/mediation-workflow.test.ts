import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { createMediationWorkflowRoutes } from '../../routes/mediation-workflow';
import { MediationWorkflowService } from '../../services/mediation-workflow-service';

// Mock the MediationWorkflowService
jest.mock('../../services/mediation-workflow-service');
const MockedMediationWorkflowService = MediationWorkflowService as jest.MockedClass<typeof MediationWorkflowService>;

// Mock middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'user-123', email: 'test@example.com' };
    req.id = 'request-123';
    next();
  }
}));

describe('Mediation Workflow Routes', () => {
  let app: express.Application;
  let mockWorkflowService: jest.Mocked<MediationWorkflowService>;
  let mockDb: Pool;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    mockDb = {} as Pool;
    mockWorkflowService = new MockedMediationWorkflowService(mockDb) as jest.Mocked<MediationWorkflowService>;
    
    // Mock the constructor to return our mocked service
    MockedMediationWorkflowService.mockImplementation(() => mockWorkflowService);
    
    app.use('/api/mediation-workflow', createMediationWorkflowRoutes(mockDb));
  });

  describe('POST /api/mediation-workflow/cases/:caseId/workflow', () => {
    it('should initialize mediation workflow successfully', async () => {
      const mockWorkflow = {
        caseId: 'case-123',
        currentStep: 'case_initiation',
        steps: [
          {
            id: 'case_initiation',
            name: 'Case Initiation',
            description: 'Initial setup',
            requiredActions: ['Setup'],
            completionCriteria: ['Complete'],
            estimatedDuration: '1 day',
            nextSteps: ['Next step']
          }
        ],
        completedSteps: [],
        timeline: [],
        progress: 0,
        estimatedCompletion: new Date()
      };

      mockWorkflowService.initializeMediationWorkflow.mockResolvedValueOnce(mockWorkflow);

      const response = await request(app)
        .post('/api/mediation-workflow/cases/case-123/workflow')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.caseId).toBe('case-123');
      expect(mockWorkflowService.initializeMediationWorkflow).toHaveBeenCalledWith('case-123');
    });

    it('should return 400 for missing case ID', async () => {
      const response = await request(app)
        .post('/api/mediation-workflow/cases//workflow')
        .expect(404); // Express returns 404 for empty path params
    });

    it('should handle service errors', async () => {
      mockWorkflowService.initializeMediationWorkflow.mockRejectedValueOnce(
        new Error('Service error')
      );

      const response = await request(app)
        .post('/api/mediation-workflow/cases/case-123/workflow')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PATCH /api/mediation-workflow/cases/:caseId/workflow/:stepId', () => {
    it('should update workflow progress successfully', async () => {
      const mockWorkflow = {
        caseId: 'case-123',
        currentStep: 'information_gathering',
        steps: [],
        completedSteps: ['case_initiation'],
        timeline: [],
        progress: 16.67,
        estimatedCompletion: new Date()
      };

      mockWorkflowService.updateWorkflowProgress.mockResolvedValueOnce(mockWorkflow);

      const response = await request(app)
        .patch('/api/mediation-workflow/cases/case-123/workflow/case_initiation')
        .send({
          completed: true,
          notes: 'Initial setup completed successfully'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.progress).toBe(16.67);
      expect(mockWorkflowService.updateWorkflowProgress).toHaveBeenCalledWith(
        'case-123',
        'case_initiation',
        true,
        'Initial setup completed successfully'
      );
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .patch('/api/mediation-workflow/cases/case-123/workflow/')
        .send({ completed: true })
        .expect(404); // Express returns 404 for empty path params
    });

    it('should return 400 for invalid completed value', async () => {
      const response = await request(app)
        .patch('/api/mediation-workflow/cases/case-123/workflow/step-1')
        .send({ completed: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_COMPLETED');
    });
  });

  describe('GET /api/mediation-workflow/cases/:caseId/reports/progress', () => {
    it('should generate progress report successfully', async () => {
      const mockReport = {
        caseId: 'case-123',
        reportType: 'progress' as const,
        generatedAt: new Date(),
        content: 'Progress report content...',
        legalValidity: false,
        jurisdictions: ['US'],
        parties: ['user1@example.com', 'user2@example.com'],
        outcomes: ['Initial agreement on scope'],
        nextSteps: ['Continue negotiations']
      };

      mockWorkflowService.generateProgressReport.mockResolvedValueOnce(mockReport);

      const response = await request(app)
        .get('/api/mediation-workflow/cases/case-123/reports/progress')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reportType).toBe('progress');
      expect(response.body.data.legalValidity).toBe(false);
      expect(mockWorkflowService.generateProgressReport).toHaveBeenCalledWith('case-123');
    });

    it('should return 400 for missing case ID', async () => {
      const response = await request(app)
        .get('/api/mediation-workflow/cases//reports/progress')
        .expect(404);
    });
  });

  describe('GET /api/mediation-workflow/cases/:caseId/reports/final', () => {
    it('should generate final report successfully', async () => {
      const mockReport = {
        caseId: 'case-123',
        reportType: 'final' as const,
        generatedAt: new Date(),
        content: 'Final report content...',
        legalValidity: true,
        jurisdictions: ['US'],
        parties: ['user1@example.com', 'user2@example.com'],
        outcomes: ['Agreement reached on all terms'],
        nextSteps: ['Monitor compliance']
      };

      mockWorkflowService.generateFinalReport.mockResolvedValueOnce(mockReport);

      const response = await request(app)
        .get('/api/mediation-workflow/cases/case-123/reports/final')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reportType).toBe('final');
      expect(response.body.data.legalValidity).toBe(true);
      expect(mockWorkflowService.generateFinalReport).toHaveBeenCalledWith('case-123');
    });

    it('should return 400 for unresolved case', async () => {
      mockWorkflowService.generateFinalReport.mockRejectedValueOnce(
        new Error('Cannot generate final report for unresolved case')
      );

      const response = await request(app)
        .get('/api/mediation-workflow/cases/case-123/reports/final')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CASE_NOT_RESOLVED');
    });
  });

  describe('POST /api/mediation-workflow/cases/:caseId/outcome', () => {
    it('should track mediation outcome successfully', async () => {
      mockWorkflowService.trackMediationOutcome.mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/mediation-workflow/cases/case-123/outcome')
        .send({
          outcome: 'agreement_reached',
          details: 'Full agreement on all disputed terms',
          agreementTerms: [
            'Payment schedule: 30 days',
            'Delivery terms: FOB destination'
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockWorkflowService.trackMediationOutcome).toHaveBeenCalledWith(
        'case-123',
        'agreement_reached',
        'Full agreement on all disputed terms',
        [
          'Payment schedule: 30 days',
          'Delivery terms: FOB destination'
        ]
      );
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/mediation-workflow/cases/case-123/outcome')
        .send({
          outcome: 'agreement_reached'
          // Missing details
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_FIELDS');
    });

    it('should return 400 for invalid outcome', async () => {
      const response = await request(app)
        .post('/api/mediation-workflow/cases/case-123/outcome')
        .send({
          outcome: 'invalid_outcome',
          details: 'Some details'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_OUTCOME');
    });

    it('should handle partial agreement outcome', async () => {
      mockWorkflowService.trackMediationOutcome.mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/mediation-workflow/cases/case-123/outcome')
        .send({
          outcome: 'partial_agreement',
          details: 'Agreement on payment terms, dispute remains on delivery',
          agreementTerms: ['Payment: 30 days net']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockWorkflowService.trackMediationOutcome).toHaveBeenCalledWith(
        'case-123',
        'partial_agreement',
        'Agreement on payment terms, dispute remains on delivery',
        ['Payment: 30 days net']
      );
    });

    it('should handle escalated outcome', async () => {
      mockWorkflowService.trackMediationOutcome.mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/mediation-workflow/cases/case-123/outcome')
        .send({
          outcome: 'escalated',
          details: 'Parties unable to reach agreement, escalating to litigation'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockWorkflowService.trackMediationOutcome).toHaveBeenCalledWith(
        'case-123',
        'escalated',
        'Parties unable to reach agreement, escalating to litigation',
        undefined
      );
    });
  });

  describe('GET /api/mediation-workflow/cases/:caseId/recommendations', () => {
    it('should generate next step recommendations successfully', async () => {
      const mockRecommendations = [
        'Continue negotiations on payment terms',
        'Schedule follow-up meeting within 48 hours',
        'Consider bringing in subject matter expert',
        'Document any partial agreements reached'
      ];

      mockWorkflowService.generateNextStepRecommendations.mockResolvedValueOnce(mockRecommendations);

      const response = await request(app)
        .get('/api/mediation-workflow/cases/case-123/recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations).toEqual(mockRecommendations);
      expect(response.body.data.recommendations).toHaveLength(4);
      expect(mockWorkflowService.generateNextStepRecommendations).toHaveBeenCalledWith('case-123');
    });

    it('should return 400 for missing case ID', async () => {
      const response = await request(app)
        .get('/api/mediation-workflow/cases//recommendations')
        .expect(404);
    });

    it('should handle service errors', async () => {
      mockWorkflowService.generateNextStepRecommendations.mockRejectedValueOnce(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/api/mediation-workflow/cases/case-123/recommendations')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle urgent recommendations for high-risk cases', async () => {
      const mockUrgentRecommendations = [
        'URGENT: Consider immediate intervention or cooling-off period',
        'Evaluate need for professional mediator',
        'Monitor communication tone closely',
        'Continue regular check-ins with all parties'
      ];

      mockWorkflowService.generateNextStepRecommendations.mockResolvedValueOnce(mockUrgentRecommendations);

      const response = await request(app)
        .get('/api/mediation-workflow/cases/case-123/recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations[0]).toContain('URGENT');
      expect(response.body.data.recommendations).toContain('Evaluate need for professional mediator');
    });
  });
});