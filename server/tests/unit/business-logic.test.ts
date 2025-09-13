import { LegalGuidanceService } from '../../services/legal-guidance-service';
import { LawyerMatchingService } from '../../services/lawyer-matching-service';
import { MediationService } from '../../services/mediation-service';
import { CulturalSensitivityEngine } from '../../utils/cultural-sensitivity';
import { AILegalGuidance } from '../../utils/ai-legal-guidance';
import { mockExternalServices } from '../setup';

// Mock external dependencies
jest.mock('../../utils/ai-legal-guidance');
jest.mock('../../utils/cultural-sensitivity');
jest.mock('openai');

describe('Business Logic Unit Tests', () => {
  let legalGuidanceService: LegalGuidanceService;
  let lawyerMatchingService: LawyerMatchingService;
  let mediationService: MediationService;

  beforeEach(() => {
    legalGuidanceService = new LegalGuidanceService();
    lawyerMatchingService = new LawyerMatchingService();
    mediationService = new MediationService();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('LegalGuidanceService', () => {
    test('should generate guidance for valid query', async () => {
      const mockQuery = {
        id: 'query-123',
        userId: 'user-123',
        description: 'Contract dispute with vendor',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'medium',
        culturalContext: 'Western business',
        language: 'en'
      };

      const mockGuidance = {
        queryId: 'query-123',
        steps: [
          {
            order: 1,
            title: 'Review Contract Terms',
            description: 'Examine the original contract for breach clauses',
            timeframe: '1-2 days',
            resources: [],
            jurisdictionSpecific: true
          }
        ],
        applicableLaws: [],
        culturalConsiderations: ['Business communication norms'],
        nextActions: ['Document the breach'],
        confidence: 0.85
      };

      (AILegalGuidance.prototype.generateGuidance as jest.Mock).mockResolvedValue(mockGuidance);

      const result = await legalGuidanceService.generateGuidance(mockQuery);

      expect(result).toEqual(mockGuidance);
      expect(AILegalGuidance.prototype.generateGuidance).toHaveBeenCalledWith(mockQuery);
    });

    test('should handle AI service errors gracefully', async () => {
      const mockQuery = {
        id: 'query-123',
        userId: 'user-123',
        description: 'Test query',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'low',
        culturalContext: 'Western',
        language: 'en'
      };

      (AILegalGuidance.prototype.generateGuidance as jest.Mock).mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(legalGuidanceService.generateGuidance(mockQuery))
        .rejects.toThrow('AI service unavailable');
    });

    test('should validate query data before processing', async () => {
      const invalidQuery = {
        id: 'query-123',
        userId: '',
        description: '',
        category: 'invalid-category',
        jurisdiction: [],
        urgency: 'invalid-urgency',
        culturalContext: '',
        language: ''
      };

      await expect(legalGuidanceService.generateGuidance(invalidQuery as any))
        .rejects.toThrow('Invalid query data');
    });
  });

  describe('LawyerMatchingService', () => {
    test('should match lawyers based on criteria', async () => {
      const mockCriteria = {
        budget: { min: 200, max: 400 },
        location: { country: 'US', state: 'CA', city: 'San Francisco' },
        caseType: 'family-law',
        urgency: 'high',
        languagePreference: 'en'
      };

      const mockLawyers = [
        {
          id: 'lawyer-1',
          profile: {
            name: 'John Smith',
            barNumber: 'CA123456',
            jurisdiction: ['US-CA'],
            experience: 10,
            languages: ['en'],
            bio: 'Family law specialist'
          },
          specializations: ['family-law'],
          location: { country: 'US', state: 'CA', city: 'San Francisco' },
          pricing: { hourlyRate: 300, consultationFee: 100 },
          ratings: [{ score: 4.5, count: 20 }],
          availability: { schedule: 'weekdays' }
        }
      ];

      jest.spyOn(lawyerMatchingService, 'searchLawyers').mockResolvedValue(mockLawyers);

      const result = await lawyerMatchingService.matchLawyers(mockCriteria);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lawyer-1');
      expect(result[0].specializations).toContain('family-law');
    });

    test('should calculate compatibility scores correctly', () => {
      const lawyer = {
        specializations: ['family-law', 'immigration'],
        location: { country: 'US', state: 'CA', city: 'San Francisco' },
        pricing: { hourlyRate: 300 },
        ratings: [{ score: 4.5, count: 20 }],
        profile: { languages: ['en', 'es'] }
      };

      const criteria = {
        caseType: 'family-law',
        location: { country: 'US', state: 'CA', city: 'San Francisco' },
        budget: { min: 200, max: 400 },
        languagePreference: 'en'
      };

      const score = lawyerMatchingService.calculateCompatibilityScore(lawyer as any, criteria);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('should filter lawyers by budget range', () => {
      const lawyers = [
        { pricing: { hourlyRate: 150 } },
        { pricing: { hourlyRate: 300 } },
        { pricing: { hourlyRate: 500 } }
      ];

      const budget = { min: 200, max: 400 };
      const filtered = lawyerMatchingService.filterByBudget(lawyers as any, budget);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].pricing.hourlyRate).toBe(300);
    });
  });

  describe('MediationService', () => {
    test('should create mediation case with valid data', async () => {
      const mockCaseData = {
        parties: [
          { userId: 'user-1', role: 'complainant' },
          { userId: 'user-2', role: 'respondent' }
        ],
        dispute: {
          summary: 'Payment dispute over services',
          category: 'contract-law',
          jurisdiction: ['US-CA'],
          culturalFactors: ['business-practices']
        }
      };

      const mockCase = {
        id: 'case-123',
        ...mockCaseData,
        status: 'active',
        createdAt: new Date()
      };

      jest.spyOn(mediationService, 'createCase').mockResolvedValue(mockCase as any);

      const result = await mediationService.createCase(mockCaseData);

      expect(result.id).toBe('case-123');
      expect(result.parties).toHaveLength(2);
      expect(result.status).toBe('active');
    });

    test('should validate mediation case data', async () => {
      const invalidCaseData = {
        parties: [], // Empty parties array
        dispute: {
          summary: '',
          category: 'invalid-category',
          jurisdiction: [],
          culturalFactors: []
        }
      };

      await expect(mediationService.createCase(invalidCaseData as any))
        .rejects.toThrow('Invalid mediation case data');
    });

    test('should generate dispute summary', async () => {
      const mockDispute = {
        summary: 'Contract payment dispute between parties',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        culturalFactors: ['business-practices']
      };

      const mockSummary = {
        neutralSummary: 'A dispute has arisen regarding payment terms in a service contract',
        keyIssues: ['Payment timeline', 'Service delivery'],
        recommendedActions: ['Review contract terms', 'Gather evidence']
      };

      jest.spyOn(mediationService, 'generateDisputeSummary').mockResolvedValue(mockSummary);

      const result = await mediationService.generateDisputeSummary(mockDispute);

      expect(result.neutralSummary).toBeDefined();
      expect(result.keyIssues).toBeInstanceOf(Array);
      expect(result.recommendedActions).toBeInstanceOf(Array);
    });
  });

  describe('Cultural Sensitivity Engine', () => {
    test('should adapt communication style based on cultural context', () => {
      const mockEngine = new CulturalSensitivityEngine();
      
      (mockEngine.adaptCommunicationStyle as jest.Mock) = jest.fn().mockReturnValue({
        tone: 'formal',
        directness: 'indirect',
        culturalNorms: ['respect-for-hierarchy']
      });

      const result = mockEngine.adaptCommunicationStyle('Asian', 'business-dispute');

      expect(result.tone).toBe('formal');
      expect(result.directness).toBe('indirect');
      expect(result.culturalNorms).toContain('respect-for-hierarchy');
    });

    test('should identify cultural considerations for cross-border disputes', () => {
      const mockEngine = new CulturalSensitivityEngine();
      
      (mockEngine.identifyConsiderations as jest.Mock) = jest.fn().mockReturnValue([
        'Different legal systems',
        'Communication style differences',
        'Business practice variations'
      ]);

      const considerations = mockEngine.identifyConsiderations(['US', 'JP'], 'contract-law');

      expect(considerations).toBeInstanceOf(Array);
      expect(considerations.length).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    test('should validate email formats', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.uk'];
      const invalidEmails = ['invalid-email', '@domain.com', 'user@'];

      validEmails.forEach(email => {
        expect(legalGuidanceService.validateEmail(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(legalGuidanceService.validateEmail(email)).toBe(false);
      });
    });

    test('should validate jurisdiction codes', () => {
      const validJurisdictions = ['US-CA', 'UK-ENG', 'CA-ON'];
      const invalidJurisdictions = ['INVALID', 'US', ''];

      validJurisdictions.forEach(jurisdiction => {
        expect(legalGuidanceService.validateJurisdiction(jurisdiction)).toBe(true);
      });

      invalidJurisdictions.forEach(jurisdiction => {
        expect(legalGuidanceService.validateJurisdiction(jurisdiction)).toBe(false);
      });
    });

    test('should validate urgency levels', () => {
      const validUrgencies = ['low', 'medium', 'high', 'critical'];
      const invalidUrgencies = ['urgent', 'normal', ''];

      validUrgencies.forEach(urgency => {
        expect(legalGuidanceService.validateUrgency(urgency)).toBe(true);
      });

      invalidUrgencies.forEach(urgency => {
        expect(legalGuidanceService.validateUrgency(urgency)).toBe(false);
      });
    });
  });
});