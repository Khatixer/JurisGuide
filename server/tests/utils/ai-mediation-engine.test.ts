import { AIMediationEngine } from '../../utils/ai-mediation-engine';
import { DisputeDetails, MediationCase, Party } from '../../types';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

describe('AIMediationEngine', () => {
  let aiEngine: AIMediationEngine;
  let mockOpenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    // Get the mocked OpenAI instance
    const OpenAI = require('openai').default;
    mockOpenAI = new OpenAI();
    
    aiEngine = new AIMediationEngine();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should throw error if OPENAI_API_KEY is not set', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => new AIMediationEngine()).toThrow('OPENAI_API_KEY environment variable is required');
    });
  });

  describe('analyzeDispute', () => {
    const mockDispute: DisputeDetails = {
      summary: 'Contract dispute over payment terms',
      category: 'contract_dispute',
      jurisdiction: ['US', 'CA'],
      culturalFactors: ['business_culture'],
      proposedResolution: 'Negotiate payment schedule'
    };

    it('should analyze dispute successfully', async () => {
      const mockAnalysis = {
        category: 'contract_dispute',
        complexity: 'moderate',
        emotionalTone: 'tense',
        keyFactors: ['payment_terms', 'contract_interpretation'],
        culturalFactors: ['business_culture'],
        legalIssues: ['breach_of_contract', 'payment_obligations']
      };

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify(mockAnalysis)
          }
        }]
      });

      const result = await aiEngine.analyzeDispute(mockDispute);

      expect(result).toEqual(mockAnalysis);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('expert legal mediator')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Contract dispute over payment terms')
          })
        ]),
        temperature: 0.3,
        max_tokens: 1000
      });
    });

    it('should handle API errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API Error'));

      await expect(aiEngine.analyzeDispute(mockDispute)).rejects.toThrow('Failed to analyze dispute');
    });

    it('should handle empty response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: null
          }
        }]
      });

      await expect(aiEngine.analyzeDispute(mockDispute)).rejects.toThrow('Failed to analyze dispute');
    });
  });

  describe('generateMediationRecommendation', () => {
    const mockCase: MediationCase = {
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
      mediator: { model: 'gpt-4', configuration: { culturalSensitivity: true, jurisdictionAware: true, language: 'en' } },
      documents: [],
      timeline: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockAnalysis = {
      category: 'contract_dispute' as const,
      complexity: 'moderate' as const,
      emotionalTone: 'tense' as const,
      keyFactors: ['payment_terms'],
      culturalFactors: ['business_culture'],
      legalIssues: ['breach_of_contract']
    };

    it('should generate mediation recommendation successfully', async () => {
      const mockRecommendation = {
        summary: 'Focus on payment schedule negotiation',
        keyIssues: ['payment_terms', 'contract_interpretation'],
        proposedSolutions: ['structured_payment_plan', 'contract_amendment'],
        culturalConsiderations: ['business_relationship_preservation'],
        jurisdictionSpecificAdvice: ['US_contract_law_applies'],
        nextSteps: ['schedule_negotiation_session'],
        riskAssessment: {
          level: 'medium',
          factors: ['payment_dispute']
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify(mockRecommendation)
          }
        }]
      });

      const result = await aiEngine.generateMediationRecommendation(mockCase, mockAnalysis);

      expect(result).toEqual(mockRecommendation);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('expert AI mediator')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('case-123')
          })
        ]),
        temperature: 0.4,
        max_tokens: 1500
      });
    });
  });

  describe('generateRespectfulCommunication', () => {
    it('should generate respectful communication', async () => {
      const originalMessage = 'You are completely wrong about this!';
      const respectfulMessage = 'I have a different perspective on this matter that I would like to discuss.';

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: respectfulMessage
          }
        }]
      });

      const result = await aiEngine.generateRespectfulCommunication(
        originalMessage,
        'western',
        'eastern',
        'formal'
      );

      expect(result).toBe(respectfulMessage);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('cross-cultural communication')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(originalMessage)
          })
        ]),
        temperature: 0.3,
        max_tokens: 500
      });
    });
  });

  describe('generateMediationSummary', () => {
    const mockCase: MediationCase = {
      id: 'case-123',
      parties: [
        { userId: 'user1', role: 'plaintiff', contactInfo: { email: 'user1@example.com' } }
      ] as Party[],
      dispute: {
        summary: 'Contract dispute',
        category: 'contract_dispute',
        jurisdiction: ['US'],
        culturalFactors: ['business_culture']
      },
      status: 'active',
      mediator: { model: 'gpt-4', configuration: { culturalSensitivity: true, jurisdictionAware: true, language: 'en' } },
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

    it('should generate mediation summary', async () => {
      const mockSummary = 'Comprehensive mediation summary for case-123...';

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: mockSummary
          }
        }]
      });

      const result = await aiEngine.generateMediationSummary(mockCase, true);

      expect(result).toBe(mockSummary);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('expert legal mediator')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('case-123')
          })
        ]),
        temperature: 0.2,
        max_tokens: 1200
      });
    });
  });

  describe('assessMediationViability', () => {
    const mockDispute: DisputeDetails = {
      summary: 'Simple contract dispute',
      category: 'contract_dispute',
      jurisdiction: ['US'],
      culturalFactors: ['business_culture']
    };

    it('should assess mediation as viable', async () => {
      const mockAssessment = {
        viable: true,
        confidence: 0.8,
        reasons: ['straightforward_contract_issue', 'single_jurisdiction'],
        alternatives: []
      };

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify(mockAssessment)
          }
        }]
      });

      const result = await aiEngine.assessMediationViability(mockDispute);

      expect(result).toEqual(mockAssessment);
      expect(result.viable).toBe(true);
      expect(result.confidence).toBe(0.8);
    });

    it('should assess mediation as not viable', async () => {
      const mockAssessment = {
        viable: false,
        confidence: 0.9,
        reasons: ['criminal_matter', 'requires_court_intervention'],
        alternatives: ['litigation', 'arbitration']
      };

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify(mockAssessment)
          }
        }]
      });

      const result = await aiEngine.assessMediationViability(mockDispute);

      expect(result).toEqual(mockAssessment);
      expect(result.viable).toBe(false);
      expect(result.alternatives).toContain('litigation');
    });
  });
});