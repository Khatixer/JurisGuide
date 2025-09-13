import { Pool } from 'pg';
import { AIMediationService } from '../../services/ai-mediation-service';
import { MediationService } from '../../services/mediation-service';
import { AIMediationEngine } from '../../utils/ai-mediation-engine';
import { Party, DisputeDetails, MediationCase } from '../../types';

// Mock dependencies
jest.mock('../../services/mediation-service');
jest.mock('../../utils/ai-mediation-engine');

const MockedMediationService = MediationService as jest.MockedClass<typeof MediationService>;
const MockedAIMediationEngine = AIMediationEngine as jest.MockedClass<typeof AIMediationEngine>;

describe('AIMediationService', () => {
  let aiMediationService: AIMediationService;
  let mockMediationService: jest.Mocked<MediationService>;
  let mockAIEngine: jest.Mocked<AIMediationEngine>;
  let mockDb: Pool;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {} as Pool;
    mockMediationService = new MockedMediationService(mockDb) as jest.Mocked<MediationService>;
    mockAIEngine = new MockedAIMediationEngine() as jest.Mocked<AIMediationEngine>;
    
    // Mock the constructors
    MockedMediationService.mockImplementation(() => mockMediationService);
    MockedAIMediationEngine.mockImplementation(() => mockAIEngine);
    
    aiMediationService = new AIMediationService(mockDb);
  });

  describe('createIntelligentMediationCase', () => {
    const mockParties: Party[] = [
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
    ];

    const mockDispute: DisputeDetails = {
      summary: 'Contract dispute over payment terms',
      category: 'contract_dispute',
      jurisdiction: ['US', 'CA'],
      culturalFactors: ['business_culture'],
      proposedResolution: 'Negotiate payment schedule'
    };

    it('should create intelligent mediation case successfully', async () => {
      const mockViabilityAssessment = {
        viable: true,
        confidence: 0.8,
        reasons: ['suitable_for_mediation'],
        alternatives: []
      };

      const mockMediationCase: MediationCase = {
        id: 'case-123',
        parties: mockParties,
        dispute: mockDispute,
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
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockAnalysis = {
        category: 'contract_dispute' as const,
        complexity: 'moderate' as const,
        emotionalTone: 'neutral' as const,
        keyFactors: ['payment_terms'],
        culturalFactors: ['business_culture'],
        legalIssues: ['contract_interpretation']
      };

      const mockRecommendation = {
        summary: 'Focus on payment schedule negotiation',
        keyIssues: ['payment_terms'],
        proposedSolutions: ['structured_payment_plan'],
        culturalConsiderations: ['business_relationship'],
        jurisdictionSpecificAdvice: ['US_contract_law'],
        nextSteps: ['schedule_meeting'],
        riskAssessment: {
          level: 'medium' as const,
          factors: ['payment_dispute']
        }
      };

      mockAIEngine.assessMediationViability.mockResolvedValueOnce(mockViabilityAssessment);
      mockMediationService.createMediationCase.mockResolvedValueOnce(mockMediationCase);
      mockAIEngine.analyzeDispute.mockResolvedValueOnce(mockAnalysis);
      mockAIEngine.generateMediationRecommendation.mockResolvedValueOnce(mockRecommendation);
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-1',
        timestamp: new Date(),
        type: 'message',
        content: 'Test event',
        party: 'ai_mediator'
      });

      const result = await aiMediationService.createIntelligentMediationCase(
        mockParties,
        mockDispute,
        'en'
      );

      expect(result.case).toEqual(mockMediationCase);
      expect(result.analysis.caseId).toBe('case-123');
      expect(result.analysis.analysis).toEqual(mockAnalysis);
      expect(result.analysis.recommendation).toEqual(mockRecommendation);

      expect(mockAIEngine.assessMediationViability).toHaveBeenCalledWith(mockDispute);
      expect(mockMediationService.createMediationCase).toHaveBeenCalledWith(
        mockParties,
        mockDispute,
        expect.objectContaining({
          model: 'gpt-4',
          configuration: expect.objectContaining({
            language: 'en'
          })
        })
      );
      expect(mockMediationService.addMediationEvent).toHaveBeenCalledTimes(2); // Analysis + solutions
    });

    it('should throw error if mediation is not viable', async () => {
      const mockViabilityAssessment = {
        viable: false,
        confidence: 0.9,
        reasons: ['criminal_matter', 'requires_court'],
        alternatives: ['litigation']
      };

      mockAIEngine.assessMediationViability.mockResolvedValueOnce(mockViabilityAssessment);

      await expect(
        aiMediationService.createIntelligentMediationCase(mockParties, mockDispute)
      ).rejects.toThrow('Mediation not recommended: criminal_matter, requires_court');

      expect(mockMediationService.createMediationCase).not.toHaveBeenCalled();
    });
  });

  describe('generateAIResponse', () => {
    it('should generate AI-enhanced respectful communication', async () => {
      const mockCase: MediationCase = {
        id: 'case-123',
        parties: [
          { userId: 'user1', role: 'plaintiff', contactInfo: { email: 'user1@example.com' } },
          { userId: 'user2', role: 'defendant', contactInfo: { email: 'user2@example.com' } }
        ],
        dispute: { summary: 'Test dispute', category: 'contract_dispute', jurisdiction: ['US'], culturalFactors: [] },
        status: 'active',
        mediator: { model: 'gpt-4', configuration: { culturalSensitivity: true, jurisdictionAware: true, language: 'en' } },
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const originalMessage = 'You are wrong about this!';
      const enhancedMessage = 'I have a different perspective on this matter.';

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);
      mockAIEngine.generateRespectfulCommunication.mockResolvedValueOnce(enhancedMessage);
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-1',
        timestamp: new Date(),
        type: 'message',
        content: enhancedMessage,
        party: 'ai_mediator'
      });

      const result = await aiMediationService.generateAIResponse(
        'case-123',
        originalMessage,
        'western'
      );

      expect(result).toBe(enhancedMessage);
      expect(mockAIEngine.generateRespectfulCommunication).toHaveBeenCalledWith(
        originalMessage,
        'western',
        'international',
        'formal'
      );
      expect(mockMediationService.addMediationEvent).toHaveBeenCalledWith(
        'case-123',
        expect.objectContaining({
          type: 'message',
          content: enhancedMessage,
          party: 'ai_mediator',
          metadata: expect.objectContaining({
            type: 'ai_enhanced_communication',
            originalMessage,
            culturalAdaptation: true
          })
        })
      );
    });

    it('should throw error for non-existent case', async () => {
      mockMediationService.getMediationCase.mockResolvedValueOnce(null);

      await expect(
        aiMediationService.generateAIResponse('non-existent', 'message', 'culture')
      ).rejects.toThrow('Mediation case not found');
    });
  });

  describe('updateMediationWithAIInsights', () => {
    it('should update mediation with fresh AI insights', async () => {
      const mockCase: MediationCase = {
        id: 'case-123',
        parties: [],
        dispute: { summary: 'Test dispute', category: 'contract_dispute', jurisdiction: ['US'], culturalFactors: [] },
        status: 'active',
        mediator: { model: 'gpt-4', configuration: { culturalSensitivity: true, jurisdictionAware: true, language: 'en' } },
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockAnalysis = {
        category: 'contract_dispute' as const,
        complexity: 'moderate' as const,
        emotionalTone: 'neutral' as const,
        keyFactors: ['updated_factors'],
        culturalFactors: [],
        legalIssues: []
      };

      const mockRecommendation = {
        summary: 'Updated recommendation',
        keyIssues: [],
        proposedSolutions: [],
        culturalConsiderations: [],
        jurisdictionSpecificAdvice: [],
        nextSteps: [],
        riskAssessment: { level: 'low' as const, factors: [] }
      };

      const mockViabilityAssessment = {
        viable: true,
        confidence: 0.8,
        reasons: [],
        alternatives: []
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);
      mockAIEngine.analyzeDispute.mockResolvedValueOnce(mockAnalysis);
      mockAIEngine.generateMediationRecommendation.mockResolvedValueOnce(mockRecommendation);
      mockAIEngine.assessMediationViability.mockResolvedValueOnce(mockViabilityAssessment);
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-1',
        timestamp: new Date(),
        type: 'message',
        content: 'Updated insights',
        party: 'ai_mediator'
      });

      const result = await aiMediationService.updateMediationWithAIInsights('case-123');

      expect(result.caseId).toBe('case-123');
      expect(result.analysis).toEqual(mockAnalysis);
      expect(result.recommendation).toEqual(mockRecommendation);
      expect(mockMediationService.addMediationEvent).toHaveBeenCalledWith(
        'case-123',
        expect.objectContaining({
          type: 'message',
          content: 'Updated AI Analysis: Updated recommendation',
          party: 'ai_mediator'
        })
      );
    });
  });

  describe('generateComprehensiveMediationReport', () => {
    it('should generate comprehensive mediation report', async () => {
      const mockCase: MediationCase = {
        id: 'case-123',
        parties: [],
        dispute: { summary: 'Test dispute', category: 'contract_dispute', jurisdiction: ['US'], culturalFactors: [] },
        status: 'resolved',
        mediator: { model: 'gpt-4', configuration: { culturalSensitivity: true, jurisdictionAware: true, language: 'en' } },
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockReport = 'Comprehensive mediation report for case-123...';

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);
      mockAIEngine.generateMediationSummary.mockResolvedValueOnce(mockReport);
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-1',
        timestamp: new Date(),
        type: 'document',
        content: 'Report generated',
        party: 'ai_mediator'
      });

      const result = await aiMediationService.generateComprehensiveMediationReport('case-123');

      expect(result).toBe(mockReport);
      expect(mockAIEngine.generateMediationSummary).toHaveBeenCalledWith(mockCase, true);
      expect(mockMediationService.addMediationEvent).toHaveBeenCalledWith(
        'case-123',
        expect.objectContaining({
          type: 'document',
          content: 'Comprehensive mediation report generated',
          party: 'ai_mediator'
        })
      );
    });
  });

  describe('facilitatePartyAgreement', () => {
    it('should facilitate and enhance party agreement', async () => {
      const mockCase: MediationCase = {
        id: 'case-123',
        parties: [],
        dispute: { summary: 'Test dispute', category: 'contract_dispute', jurisdiction: ['US'], culturalFactors: [] },
        status: 'active',
        mediator: { model: 'gpt-4', configuration: { culturalSensitivity: true, jurisdictionAware: true, language: 'en' } },
        documents: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const proposedAgreement = 'We agree to split costs 50/50';
      const mockAnalysis = {
        category: 'contract_dispute' as const,
        complexity: 'simple' as const,
        emotionalTone: 'neutral' as const,
        keyFactors: [],
        culturalFactors: [],
        legalIssues: []
      };

      const mockRecommendation = {
        summary: 'Agreement looks fair',
        keyIssues: [],
        proposedSolutions: ['Document the agreement'],
        culturalConsiderations: ['Consider cultural payment norms'],
        jurisdictionSpecificAdvice: ['Ensure legal compliance'],
        nextSteps: ['Finalize documentation'],
        riskAssessment: { level: 'low' as const, factors: [] }
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);
      mockAIEngine.analyzeDispute.mockResolvedValueOnce(mockAnalysis);
      mockAIEngine.generateMediationRecommendation.mockResolvedValueOnce(mockRecommendation);
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-1',
        timestamp: new Date(),
        type: 'agreement',
        content: 'Enhanced agreement',
        party: 'ai_mediator'
      });

      const result = await aiMediationService.facilitatePartyAgreement(
        'case-123',
        proposedAgreement,
        'user1@example.com'
      );

      expect(result.enhancedAgreement).toContain(proposedAgreement);
      expect(result.enhancedAgreement).toContain('Document the agreement');
      expect(result.culturalConsiderations).toEqual(['Consider cultural payment norms']);
      expect(result.legalConsiderations).toEqual(['Ensure legal compliance']);
    });
  });

  describe('detectEscalationRisk', () => {
    it('should detect high escalation risk', async () => {
      const mockCase: MediationCase = {
        id: 'case-123',
        parties: [],
        dispute: { summary: 'Test dispute', category: 'contract_dispute', jurisdiction: ['US'], culturalFactors: [] },
        status: 'active',
        mediator: { model: 'gpt-4', configuration: { culturalSensitivity: true, jurisdictionAware: true, language: 'en' } },
        documents: [],
        timeline: [
          {
            id: 'event-1',
            timestamp: new Date(Date.now() - 60000), // 1 minute ago
            type: 'message',
            content: 'I am very angry about this unfair treatment!',
            party: 'user1'
          },
          {
            id: 'event-2',
            timestamp: new Date(Date.now() - 30000), // 30 seconds ago
            type: 'message',
            content: 'This is completely unacceptable and I refuse to continue!',
            party: 'user1'
          },
          {
            id: 'event-3',
            timestamp: new Date(), // Now
            type: 'message',
            content: 'I demand immediate action or I will take legal action!',
            party: 'user1'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-4',
        timestamp: new Date(),
        type: 'message',
        content: 'Escalation assessment',
        party: 'ai_mediator'
      });

      const result = await aiMediationService.detectEscalationRisk('case-123');

      expect(result.riskLevel).toBe('high');
      expect(result.factors).toContain('High frequency of hostile language detected');
      expect(result.recommendations).toContain('Consider introducing cooling-off period');
    });

    it('should detect low escalation risk', async () => {
      const mockCase: MediationCase = {
        id: 'case-123',
        parties: [],
        dispute: { summary: 'Test dispute', category: 'contract_dispute', jurisdiction: ['US'], culturalFactors: [] },
        status: 'active',
        mediator: { model: 'gpt-4', configuration: { culturalSensitivity: true, jurisdictionAware: true, language: 'en' } },
        documents: [],
        timeline: [
          {
            id: 'event-1',
            timestamp: new Date(),
            type: 'message',
            content: 'Thank you for your perspective on this matter.',
            party: 'user1'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockMediationService.getMediationCase.mockResolvedValueOnce(mockCase);
      mockMediationService.addMediationEvent.mockResolvedValue({
        id: 'event-2',
        timestamp: new Date(),
        type: 'message',
        content: 'Escalation assessment',
        party: 'ai_mediator'
      });

      const result = await aiMediationService.detectEscalationRisk('case-123');

      expect(result.riskLevel).toBe('low');
      expect(result.recommendations).toContain('Continue current mediation approach');
    });
  });
});