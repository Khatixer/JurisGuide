import { AILegalGuidanceService, PromptContext } from '../../utils/ai-legal-guidance';
import { LegalQuery, LegalCategory } from '../../types';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  steps: [
                    {
                      order: 1,
                      title: 'Test Step',
                      description: 'Test description',
                      timeframe: 'Immediate',
                      resources: [],
                      jurisdictionSpecific: true
                    }
                  ],
                  applicableLaws: [
                    {
                      statute: 'Test Statute',
                      jurisdiction: 'United States',
                      description: 'Test law description'
                    }
                  ],
                  culturalConsiderations: ['Test consideration'],
                  nextActions: ['Test action'],
                  confidence: 0.9
                })
              }
            }]
          })
        }
      }
    }))
  };
});

describe('AILegalGuidanceService', () => {
  let service: AILegalGuidanceService;
  let mockContext: PromptContext;

  beforeAll(() => {
    // Set environment variable for testing
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  beforeEach(() => {
    
    service = new AILegalGuidanceService({
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.3
    });

    const mockQuery: LegalQuery = {
      id: 'test-query-id',
      userId: 'test-user-id',
      description: 'Contract dispute with vendor',
      category: 'contract_dispute' as LegalCategory,
      jurisdiction: ['United States'],
      urgency: 'medium',
      culturalContext: 'Business context',
      language: 'en',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockContext = {
      query: mockQuery,
      userProfile: {
        culturalBackground: 'American',
        preferredLanguage: 'en',
        communicationStyle: 'formal'
      }
    };
  });

  afterAll(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should create service with default config', () => {
      expect(service).toBeDefined();
    });

    it('should throw error without API key', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new AILegalGuidanceService()).toThrow('OpenAI API key not configured');
    });
  });

  describe('generateGuidance', () => {
    it('should generate legal guidance successfully', async () => {
      const result = await service.generateGuidance(mockContext);

      expect(result).toBeDefined();
      expect(result.queryId).toBe('test-query-id');
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].title).toBe('Test Step');
      expect(result.applicableLaws).toHaveLength(1);
      expect(result.confidence).toBe(0.9);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should handle different legal categories', async () => {
      const employmentQuery = {
        ...mockContext.query,
        category: 'employment_law' as LegalCategory
      };

      const employmentContext = {
        ...mockContext,
        query: employmentQuery
      };

      const result = await service.generateGuidance(employmentContext);
      expect(result).toBeDefined();
    });

    it('should handle different jurisdictions', async () => {
      const euQuery = {
        ...mockContext.query,
        jurisdiction: ['European Union']
      };

      const euContext = {
        ...mockContext,
        query: euQuery
      };

      const result = await service.generateGuidance(euContext);
      expect(result).toBeDefined();
    });

    it('should handle cultural context', async () => {
      const culturalContext = {
        ...mockContext,
        userProfile: {
          ...mockContext.userProfile!,
          culturalBackground: 'Hispanic/Latino'
        }
      };

      const result = await service.generateGuidance(culturalContext);
      expect(result).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should test OpenAI connection successfully', async () => {
      const result = await service.testConnection();
      expect(result).toBe(true);
    });

    it('should handle connection errors', async () => {
      // Mock OpenAI to throw error
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('Connection failed'))
          }
        }
      }));

      const failingService = new AILegalGuidanceService();
      const result = await failingService.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON response', async () => {
      // Mock OpenAI to return invalid JSON
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'invalid json'
                }
              }]
            })
          }
        }
      }));

      const failingService = new AILegalGuidanceService();
      await expect(failingService.generateGuidance(mockContext)).rejects.toThrow();
    });

    it('should handle empty response', async () => {
      // Mock OpenAI to return empty response
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: []
            })
          }
        }
      }));

      const failingService = new AILegalGuidanceService();
      await expect(failingService.generateGuidance(mockContext)).rejects.toThrow();
    });
  });
});