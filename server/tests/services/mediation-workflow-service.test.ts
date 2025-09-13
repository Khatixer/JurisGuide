import { Pool } from 'pg';
import { MediationWorkflowService } from '../../services/mediation-workflow-service';
import { MediationService } from '../../services/mediation-service';
import { AIMediationService } from '../../services/ai-mediation-service';
import { MediationCase, Party } from '../../types';

// Mock dependencies
jest.mock('../../services/mediation-service');
jest.mock('../../services/ai-mediation-service');

const MockedMediationService = MediationService as jest.MockedClass<typeof MediationService>;
const MockedAIMediationService = AIMediationService as jest.MockedClass<typeof AIMediationService>;

describe('MediationWorkflowService', () => {
  let workflowService: MediationWorkflowService;
  let mockMediationService: jest.Mocked<MediationService>;
  let mockAIMediationService: jest.Mocked<AIMediationService>;
  let mockDb: Pool;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {} as Pool;
    mockMediationService = new MockedMediationService(mockDb) as jest.Mocked<MediationService>;
    mockAIMediationService = new MockedAIMediationService(mockDb) as jest.Mocked<AIMediationService>;
    
    // Mock the constructors
    MockedMediationService.mockImplementation(() => mockMediationService);
    MockedAIMediationService.mockImplementation(() => mockAIMediationService);
    
    workflowService = new MediationWorkflowService(mockDb);
  });

  const mockMediationCase: MediationCase = {
    id: 'case-123',
    parties: [
      { userId: 'user1', role: 'plaintiff', contactInfo: { email: 'user1@example.com' } },
      { userId: 'user2', role: 'defendant', contactInfo: { email: 'user2@example.com' } }
    ] as Party[],
    dispute: {
      summary: 'Contract dispute',
      category: 'contract_dispute',
      jurisdiction: ['US'],
      culturalFactors: ['business_culture']
    },
    status: 'active',
    mediator: {
      model: 'gpt-4',
      configuration: {
        culturalSensitivity: true,
        jurisdictionAware: true,
        language: 'en'
      }
    },
    documents: [],
    timeline: [
      {
        id: 'event-1',
        timestamp: new Date(),
        type: 'message',
        content: 'Case created',
        party: 'system'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('initializeMediationWorkflow', () => {
    it('should initialize workflow successfully', async () => {
      mockMediationService.getMediationCase.mockResolvedValueOnce(mockMediationCase);
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-2',
        timestamp: new Date(),
        type: 'message',
        content: 'Workflow initialized',
        party: 'system'
      });

      const result = await workflowService.initializeMediationWorkflow('case-123');

      expect(result.caseId).toBe('case-123');
      expect(result.steps).toHaveLength(6); // Standard workflow has 6 steps
      expect(result.currentStep).toBe('information_gathering'); // Based on timeline having message
      expect(result.progress).toBeGreaterThan(0);
      expect(mockMediationService.addMediationEvent).toHaveBeenCalledWith(
        'case-123',
        expect.objectContaining({
          type: 'message',
          content: 'Mediation workflow initialized with standard process steps',
          party: 'system'
        })
      );
    });

    it('should throw error for non-existent case', async () => {
      mockMediationService.getMediationCase.mockResolvedValueOnce(null);

      await expect(
        workflowService.initializeMediationWorkflow('non-existent')
      ).rejects.toThrow('Mediation case not found');
    });
  });

  describe('updateWorkflowProgress', () => {
    it('should update workflow progress successfully', async () => {
      mockMediationService.getMediationCase.mockResolvedValueOnce(mockMediationCase);
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-2',
        timestamp: new Date(),
        type: 'message',
        content: 'Progress updated',
        party: 'system'
      });

      const result = await workflowService.updateWorkflowProgress(
        'case-123',
        'case_initiation',
        true,
        'Initial setup completed'
      );

      expect(result.completedSteps).toContain('case_initiation');
      expect(result.progress).toBeGreaterThan(0);
      expect(mockMediationService.addMediationEvent).toHaveBeenCalledWith(
        'case-123',
        expect.objectContaining({
          type: 'message',
          content: 'Workflow step completed: case_initiation - Initial setup completed',
          party: 'system',
          metadata: expect.objectContaining({
            type: 'workflow_progress',
            stepId: 'case_initiation',
            completed: true,
            notes: 'Initial setup completed'
          })
        })
      );
    });

    it('should complete mediation when workflow reaches 100%', async () => {
      const resolvedCase = {
        ...mockMediationCase,
        status: 'resolved' as const
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(resolvedCase);
      mockMediationService.updateMediationStatus.mockResolvedValueOnce();
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-2',
        timestamp: new Date(),
        type: 'message',
        content: 'Completed',
        party: 'system'
      });

      const result = await workflowService.updateWorkflowProgress(
        'case-123',
        'finalization',
        true
      );

      expect(result.progress).toBe(100);
      expect(result.currentStep).toBe('completed');
    });
  });

  describe('generateProgressReport', () => {
    it('should generate progress report successfully', async () => {
      mockMediationService.getMediationCase.mockResolvedValueOnce(mockMediationCase);
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-2',
        timestamp: new Date(),
        type: 'document',
        content: 'Report generated',
        party: 'system'
      });

      const result = await workflowService.generateProgressReport('case-123');

      expect(result.caseId).toBe('case-123');
      expect(result.reportType).toBe('progress');
      expect(result.legalValidity).toBe(false); // Progress reports are not legally binding
      expect(result.content).toContain('MEDIATION PROGRESS REPORT');
      expect(result.content).toContain('case-123');
      expect(result.jurisdictions).toEqual(['US']);
      expect(result.parties).toEqual(['user1@example.com', 'user2@example.com']);
    });
  });

  describe('generateFinalReport', () => {
    it('should generate final report for resolved case', async () => {
      const resolvedCase = {
        ...mockMediationCase,
        status: 'resolved' as const
      };

      const mockAIReport = 'Comprehensive AI analysis of the mediation...';

      mockMediationService.getMediationCase.mockResolvedValueOnce(resolvedCase);
      mockAIMediationService.generateComprehensiveMediationReport.mockResolvedValueOnce(mockAIReport);
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-2',
        timestamp: new Date(),
        type: 'document',
        content: 'Final report generated',
        party: 'system'
      });

      const result = await workflowService.generateFinalReport('case-123');

      expect(result.caseId).toBe('case-123');
      expect(result.reportType).toBe('final');
      expect(result.legalValidity).toBe(true); // Final reports have legal validity
      expect(result.content).toContain('FINAL MEDIATION REPORT');
      expect(result.content).toContain(mockAIReport);
      expect(mockAIMediationService.generateComprehensiveMediationReport).toHaveBeenCalledWith('case-123');
    });

    it('should throw error for unresolved case', async () => {
      mockMediationService.getMediationCase.mockResolvedValueOnce(mockMediationCase); // Status is 'active'

      await expect(
        workflowService.generateFinalReport('case-123')
      ).rejects.toThrow('Cannot generate final report for unresolved case');
    });
  });

  describe('trackMediationOutcome', () => {
    it('should track agreement reached outcome', async () => {
      mockMediationService.updateMediationStatus.mockResolvedValueOnce();
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-2',
        timestamp: new Date(),
        type: 'agreement',
        content: 'Outcome tracked',
        party: 'system'
      });

      await workflowService.trackMediationOutcome(
        'case-123',
        'agreement_reached',
        'Full agreement on all terms',
        ['Payment schedule agreed', 'Delivery terms finalized']
      );

      expect(mockMediationService.updateMediationStatus).toHaveBeenCalledWith('case-123', 'resolved');
      expect(mockMediationService.addMediationEvent).toHaveBeenCalledWith(
        'case-123',
        expect.objectContaining({
          type: 'agreement',
          content: 'Mediation outcome: agreement_reached - Full agreement on all terms',
          party: 'system',
          metadata: expect.objectContaining({
            type: 'outcome_tracking',
            outcome: 'agreement_reached',
            details: 'Full agreement on all terms',
            agreementTerms: ['Payment schedule agreed', 'Delivery terms finalized']
          })
        })
      );
    });

    it('should track escalated outcome', async () => {
      mockMediationService.updateMediationStatus.mockResolvedValueOnce();
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-2',
        timestamp: new Date(),
        type: 'agreement',
        content: 'Outcome tracked',
        party: 'system'
      });

      await workflowService.trackMediationOutcome(
        'case-123',
        'escalated',
        'Parties unable to reach agreement, escalating to litigation'
      );

      expect(mockMediationService.updateMediationStatus).toHaveBeenCalledWith('case-123', 'escalated');
    });
  });

  describe('generateNextStepRecommendations', () => {
    it('should generate comprehensive next step recommendations', async () => {
      const mockEscalationRisk = {
        riskLevel: 'medium' as const,
        factors: ['Some tension detected'],
        recommendations: ['Monitor communication']
      };

      const mockAIInsights = {
        caseId: 'case-123',
        analysis: {},
        recommendation: {
          nextSteps: ['Continue negotiations', 'Focus on common interests']
        },
        viabilityAssessment: {},
        generatedAt: new Date()
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockMediationCase);
      mockAIMediationService.detectEscalationRisk.mockResolvedValueOnce(mockEscalationRisk);
      mockAIMediationService.updateMediationWithAIInsights.mockResolvedValueOnce(mockAIInsights);

      const result = await workflowService.generateNextStepRecommendations('case-123');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Continue negotiations');
      expect(result).toContain('Monitor communication tone closely');
      expect(result).toContain('Continue regular check-ins with all parties'); // Status-specific for active case
    });

    it('should include urgent recommendations for high escalation risk', async () => {
      const mockEscalationRisk = {
        riskLevel: 'high' as const,
        factors: ['Hostile language detected'],
        recommendations: ['Immediate intervention needed']
      };

      const mockAIInsights = {
        caseId: 'case-123',
        analysis: {},
        recommendation: {
          nextSteps: ['Consider professional mediator']
        },
        viabilityAssessment: {},
        generatedAt: new Date()
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockMediationCase);
      mockAIMediationService.detectEscalationRisk.mockResolvedValueOnce(mockEscalationRisk);
      mockAIMediationService.updateMediationWithAIInsights.mockResolvedValueOnce(mockAIInsights);

      const result = await workflowService.generateNextStepRecommendations('case-123');

      expect(result[0]).toContain('URGENT');
      expect(result).toContain('Evaluate need for professional mediator');
    });

    it('should provide status-specific recommendations for failed case', async () => {
      const failedCase = {
        ...mockMediationCase,
        status: 'failed' as const
      };

      const mockEscalationRisk = {
        riskLevel: 'low' as const,
        factors: [],
        recommendations: []
      };

      const mockAIInsights = {
        caseId: 'case-123',
        analysis: {},
        recommendation: {
          nextSteps: []
        },
        viabilityAssessment: {},
        generatedAt: new Date()
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(failedCase);
      mockAIMediationService.detectEscalationRisk.mockResolvedValueOnce(mockEscalationRisk);
      mockAIMediationService.updateMediationWithAIInsights.mockResolvedValueOnce(mockAIInsights);

      const result = await workflowService.generateNextStepRecommendations('case-123');

      expect(result).toContain('Consider alternative dispute resolution methods');
      expect(result).toContain('Provide litigation guidance if appropriate');
    });
  });
});