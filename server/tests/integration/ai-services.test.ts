import { AILegalGuidance } from '../../utils/ai-legal-guidance';
import { AIMediationEngine } from '../../utils/ai-mediation-engine';
import { CulturalSensitivityEngine } from '../../utils/cultural-sensitivity';
import { mockExternalServices } from '../setup';

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => mockExternalServices.openai)
}));

describe('AI Services Integration Tests', () => {
  let aiLegalGuidance: AILegalGuidance;
  let aiMediationEngine: AIMediationEngine;
  let culturalEngine: CulturalSensitivityEngine;

  beforeEach(() => {
    aiLegalGuidance = new AILegalGuidance();
    aiMediationEngine = new AIMediationEngine();
    culturalEngine = new CulturalSensitivityEngine();
    
    jest.clearAllMocks();
  });

  describe('AI Legal Guidance Service', () => {
    test('should generate comprehensive legal guidance', async () => {
      const mockQuery = {
        id: 'query-123',
        userId: 'user-123',
        description: 'My landlord is trying to evict me without proper notice',
        category: 'housing-law',
        jurisdiction: ['US-CA'],
        urgency: 'high',
        culturalContext: 'Western tenant rights',
        language: 'en'
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              steps: [
                {
                  order: 1,
                  title: 'Review Notice Requirements',
                  description: 'Check if landlord provided proper 30-day notice as required by California law',
                  timeframe: 'Immediate',
                  resources: ['California Civil Code Section 1946'],
                  jurisdictionSpecific: true
                },
                {
                  order: 2,
                  title: 'Document Everything',
                  description: 'Gather all communications and evidence related to the eviction',
                  timeframe: '1-2 days',
                  resources: ['Tenant rights organizations'],
                  jurisdictionSpecific: false
                }
              ],
              applicableLaws: [
                {
                  title: 'California Civil Code Section 1946',
                  description: 'Requires 30-day notice for month-to-month tenancies',
                  jurisdiction: 'US-CA'
                }
              ],
              culturalConsiderations: [
                'Tenant rights vary by cultural background and language barriers',
                'Consider seeking bilingual legal assistance if needed'
              ],
              nextActions: [
                'Contact local tenant rights organization',
                'Prepare response to eviction notice',
                'Gather evidence of improper notice'
              ],
              confidence: 0.88
            })
          }
        }]
      };

      mockExternalServices.openai.chat.completions.create.mockResolvedValue(mockAIResponse);

      const guidance = await aiLegalGuidance.generateGuidance(mockQuery);

      expect(guidance.steps).toHaveLength(2);
      expect(guidance.steps[0].title).toBe('Review Notice Requirements');
      expect(guidance.applicableLaws).toHaveLength(1);
      expect(guidance.culturalConsiderations).toHaveLength(2);
      expect(guidance.confidence).toBe(0.88);
      expect(mockExternalServices.openai.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    test('should handle jurisdiction-specific guidance', async () => {
      const mockQuery = {
        id: 'query-456',
        userId: 'user-456',
        description: 'Cross-border contract dispute between US and UK companies',
        category: 'international-law',
        jurisdiction: ['US-NY', 'UK-ENG'],
        urgency: 'medium',
        culturalContext: 'International business',
        language: 'en'
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              steps: [
                {
                  order: 1,
                  title: 'Determine Governing Law',
                  description: 'Review contract for choice of law and jurisdiction clauses',
                  timeframe: '1-2 days',
                  resources: ['Contract analysis checklist'],
                  jurisdictionSpecific: true
                }
              ],
              applicableLaws: [
                {
                  title: 'New York UCC Article 2',
                  description: 'Governs sale of goods contracts',
                  jurisdiction: 'US-NY'
                },
                {
                  title: 'UK Sale of Goods Act 1979',
                  description: 'UK equivalent for goods contracts',
                  jurisdiction: 'UK-ENG'
                }
              ],
              culturalConsiderations: [
                'Different business practices between US and UK',
                'Consider time zone differences for communications'
              ],
              nextActions: [
                'Identify applicable jurisdiction',
                'Consult international law specialist'
              ],
              confidence: 0.75
            })
          }
        }]
      };

      mockExternalServices.openai.chat.completions.create.mockResolvedValue(mockAIResponse);

      const guidance = await aiLegalGuidance.generateGuidance(mockQuery);

      expect(guidance.applicableLaws).toHaveLength(2);
      expect(guidance.applicableLaws[0].jurisdiction).toBe('US-NY');
      expect(guidance.applicableLaws[1].jurisdiction).toBe('UK-ENG');
    });

    test('should handle AI service errors gracefully', async () => {
      const mockQuery = {
        id: 'query-error',
        userId: 'user-error',
        description: 'Test query',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'low',
        culturalContext: 'Western',
        language: 'en'
      };

      mockExternalServices.openai.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

      await expect(aiLegalGuidance.generateGuidance(mockQuery))
        .rejects.toThrow('OpenAI API rate limit exceeded');
    });

    test('should validate AI response format', async () => {
      const mockQuery = {
        id: 'query-invalid',
        userId: 'user-invalid',
        description: 'Test query',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'low',
        culturalContext: 'Western',
        language: 'en'
      };

      const invalidAIResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockExternalServices.openai.chat.completions.create.mockResolvedValue(invalidAIResponse);

      await expect(aiLegalGuidance.generateGuidance(mockQuery))
        .rejects.toThrow('Invalid AI response format');
    });
  });

  describe('AI Mediation Engine', () => {
    test('should generate neutral dispute summary', async () => {
      const mockDispute = {
        summary: 'Payment dispute between contractor and client over project completion',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        culturalFactors: ['business-practices', 'payment-expectations']
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              neutralSummary: 'A disagreement has arisen between parties regarding project completion and payment terms',
              keyIssues: [
                'Definition of project completion',
                'Payment timeline and conditions',
                'Quality standards and acceptance criteria'
              ],
              recommendedActions: [
                'Review original contract terms',
                'Document current project status',
                'Establish clear completion criteria'
              ],
              culturalConsiderations: [
                'Different expectations around business relationships',
                'Varying approaches to conflict resolution'
              ]
            })
          }
        }]
      };

      mockExternalServices.openai.chat.completions.create.mockResolvedValue(mockAIResponse);

      const summary = await aiMediationEngine.generateDisputeSummary(mockDispute);

      expect(summary.neutralSummary).toContain('disagreement has arisen');
      expect(summary.keyIssues).toHaveLength(3);
      expect(summary.recommendedActions).toHaveLength(3);
      expect(summary.culturalConsiderations).toHaveLength(2);
    });

    test('should facilitate respectful communication', async () => {
      const mockMessage = {
        from: 'party-1',
        to: 'party-2',
        content: 'You never delivered what we agreed on!',
        caseId: 'case-123',
        culturalContext: ['Western-direct', 'Asian-indirect']
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              moderatedMessage: 'I would like to discuss the deliverables as they relate to our original agreement',
              tone: 'respectful',
              culturalAdaptations: [
                'Softened direct language for cross-cultural communication',
                'Focused on facts rather than accusations'
              ],
              suggestions: [
                'Consider scheduling a video call to discuss concerns',
                'Review the original agreement together'
              ]
            })
          }
        }]
      };

      mockExternalServices.openai.chat.completions.create.mockResolvedValue(mockAIResponse);

      const moderated = await aiMediationEngine.moderateMessage(mockMessage);

      expect(moderated.moderatedMessage).not.toContain('never');
      expect(moderated.tone).toBe('respectful');
      expect(moderated.culturalAdaptations).toHaveLength(2);
    });

    test('should generate mediation recommendations', async () => {
      const mockCaseData = {
        parties: [
          { userId: 'user-1', role: 'complainant', culturalBackground: 'Western' },
          { userId: 'user-2', role: 'respondent', culturalBackground: 'Asian' }
        ],
        dispute: {
          summary: 'Service delivery timeline dispute',
          category: 'contract-law',
          jurisdiction: ['US-CA'],
          culturalFactors: ['time-perception', 'communication-styles']
        },
        timeline: [
          { type: 'message', content: 'Initial complaint', timestamp: new Date() }
        ]
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              recommendations: [
                {
                  type: 'process',
                  description: 'Establish clear communication protocols',
                  rationale: 'Different cultural approaches to time and communication'
                },
                {
                  type: 'resolution',
                  description: 'Create revised timeline with buffer periods',
                  rationale: 'Accommodate different cultural time perceptions'
                }
              ],
              nextSteps: [
                'Schedule structured discussion session',
                'Define mutually acceptable timeline',
                'Establish regular check-in points'
              ],
              culturalBridging: [
                'Acknowledge different time management approaches',
                'Find common ground in quality expectations'
              ]
            })
          }
        }]
      };

      mockExternalServices.openai.chat.completions.create.mockResolvedValue(mockAIResponse);

      const recommendations = await aiMediationEngine.generateRecommendations(mockCaseData);

      expect(recommendations.recommendations).toHaveLength(2);
      expect(recommendations.nextSteps).toHaveLength(3);
      expect(recommendations.culturalBridging).toHaveLength(2);
    });
  });

  describe('Cultural Sensitivity Engine', () => {
    test('should adapt communication style for different cultures', () => {
      const adaptations = culturalEngine.adaptCommunicationStyle('Asian', 'business-dispute');

      expect(adaptations.tone).toBeDefined();
      expect(adaptations.directness).toBeDefined();
      expect(adaptations.culturalNorms).toBeInstanceOf(Array);
    });

    test('should identify cross-cultural considerations', () => {
      const considerations = culturalEngine.identifyConsiderations(['US', 'JP'], 'contract-law');

      expect(considerations).toBeInstanceOf(Array);
      expect(considerations.length).toBeGreaterThan(0);
      expect(considerations.some(c => c.includes('communication'))).toBe(true);
    });

    test('should provide cultural context for legal concepts', () => {
      const context = culturalEngine.provideLegalContext('contract-enforcement', 'Middle-Eastern');

      expect(context.culturalFactors).toBeInstanceOf(Array);
      expect(context.adaptations).toBeInstanceOf(Array);
      expect(context.considerations).toBeInstanceOf(Array);
    });

    test('should handle unknown cultural backgrounds gracefully', () => {
      const adaptations = culturalEngine.adaptCommunicationStyle('Unknown', 'general-dispute');

      expect(adaptations.tone).toBe('neutral');
      expect(adaptations.directness).toBe('balanced');
      expect(adaptations.culturalNorms).toContain('universal-respect');
    });
  });

  describe('AI Service Performance', () => {
    test('should handle concurrent AI requests', async () => {
      const mockQueries = Array.from({ length: 5 }, (_, i) => ({
        id: `query-${i}`,
        userId: `user-${i}`,
        description: `Test query ${i}`,
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'low',
        culturalContext: 'Western',
        language: 'en'
      }));

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              steps: [{ order: 1, title: 'Test Step', description: 'Test', timeframe: '1 day', resources: [], jurisdictionSpecific: false }],
              applicableLaws: [],
              culturalConsiderations: [],
              nextActions: [],
              confidence: 0.8
            })
          }
        }]
      };

      mockExternalServices.openai.chat.completions.create.mockResolvedValue(mockAIResponse);

      const promises = mockQueries.map(query => aiLegalGuidance.generateGuidance(query));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockExternalServices.openai.chat.completions.create).toHaveBeenCalledTimes(5);
    });

    test('should implement request timeout', async () => {
      const mockQuery = {
        id: 'query-timeout',
        userId: 'user-timeout',
        description: 'Test query',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'low',
        culturalContext: 'Western',
        language: 'en'
      };

      // Mock a delayed response
      mockExternalServices.openai.chat.completions.create.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 15000))
      );

      await expect(aiLegalGuidance.generateGuidance(mockQuery))
        .rejects.toThrow('Request timeout');
    }, 20000);

    test('should implement retry logic for transient failures', async () => {
      const mockQuery = {
        id: 'query-retry',
        userId: 'user-retry',
        description: 'Test query',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'low',
        culturalContext: 'Western',
        language: 'en'
      };

      // Mock failure then success
      mockExternalServices.openai.chat.completions.create
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                steps: [],
                applicableLaws: [],
                culturalConsiderations: [],
                nextActions: [],
                confidence: 0.8
              })
            }
          }]
        });

      const guidance = await aiLegalGuidance.generateGuidance(mockQuery);

      expect(guidance).toBeDefined();
      expect(mockExternalServices.openai.chat.completions.create).toHaveBeenCalledTimes(2);
    });
  });
});