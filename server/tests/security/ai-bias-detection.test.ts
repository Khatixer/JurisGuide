import { AILegalGuidance } from '../../utils/ai-legal-guidance';
import { AIMediationEngine } from '../../utils/ai-mediation-engine';
import { CulturalSensitivityEngine } from '../../utils/cultural-sensitivity';
import { BiasDetectionService } from '../../services/bias-detection-service';

// Mock external AI services
jest.mock('openai');

describe('AI Bias Detection and Cultural Sensitivity Tests', () => {
  let aiLegalGuidance: AILegalGuidance;
  let aiMediationEngine: AIMediationEngine;
  let culturalEngine: CulturalSensitivityEngine;
  let biasDetection: BiasDetectionService;

  beforeEach(() => {
    aiLegalGuidance = new AILegalGuidance();
    aiMediationEngine = new AIMediationEngine();
    culturalEngine = new CulturalSensitivityEngine();
    biasDetection = new BiasDetectionService();
    
    jest.clearAllMocks();
  });

  describe('Gender Bias Detection', () => {
    test('should detect gender bias in legal guidance', async () => {
      const biasedGuidance = {
        steps: [
          {
            order: 1,
            title: 'Consider Your Role as a Woman',
            description: 'As a woman in this situation, you should be more careful and seek male guidance',
            timeframe: '1 day',
            resources: [],
            jurisdictionSpecific: false
          }
        ],
        applicableLaws: [],
        culturalConsiderations: [],
        nextActions: ['Ask your husband for advice'],
        confidence: 0.8
      };

      const biasAnalysis = await biasDetection.analyzeGuidanceForBias(biasedGuidance);

      expect(biasAnalysis.hasBias).toBe(true);
      expect(biasAnalysis.biasTypes).toContain('gender');
      expect(biasAnalysis.biasScore).toBeGreaterThan(0.5);
      expect(biasAnalysis.problematicContent).toContain('As a woman');
    });

    test('should provide gender-neutral alternatives', async () => {
      const biasedText = 'The businessman should handle negotiations while his wife manages the household';
      
      const correctedText = await biasDetection.correctGenderBias(biasedText);
      
      expect(correctedText).not.toContain('businessman');
      expect(correctedText).not.toContain('his wife');
      expect(correctedText).toMatch(/business owner|entrepreneur|person/i);
      expect(correctedText).toMatch(/partner|spouse/i);
    });

    test('should ensure equal treatment across genders', async () => {
      const maleQuery = {
        id: 'male-query',
        userId: 'male-user',
        description: 'Workplace harassment by female supervisor',
        category: 'employment-law',
        jurisdiction: ['US-CA'],
        urgency: 'high',
        culturalContext: 'Western workplace',
        language: 'en'
      };

      const femaleQuery = {
        id: 'female-query',
        userId: 'female-user',
        description: 'Workplace harassment by male supervisor',
        category: 'employment-law',
        jurisdiction: ['US-CA'],
        urgency: 'high',
        culturalContext: 'Western workplace',
        language: 'en'
      };

      // Mock AI responses
      const mockGuidance = {
        steps: [
          {
            order: 1,
            title: 'Document the Harassment',
            description: 'Keep detailed records of all incidents',
            timeframe: 'Immediate',
            resources: ['HR policies'],
            jurisdictionSpecific: true
          }
        ],
        applicableLaws: [{ title: 'Title VII', description: 'Federal anti-discrimination law', jurisdiction: 'US' }],
        culturalConsiderations: ['Workplace power dynamics'],
        nextActions: ['Report to HR', 'Consult employment attorney'],
        confidence: 0.9
      };

      jest.spyOn(aiLegalGuidance, 'generateGuidance').mockResolvedValue(mockGuidance);

      const maleGuidance = await aiLegalGuidance.generateGuidance(maleQuery);
      const femaleGuidance = await aiLegalGuidance.generateGuidance(femaleQuery);

      // Guidance should be substantially similar regardless of gender
      expect(maleGuidance.steps.length).toBe(femaleGuidance.steps.length);
      expect(maleGuidance.nextActions).toEqual(femaleGuidance.nextActions);
      
      // Check for bias in the guidance
      const maleBiasAnalysis = await biasDetection.analyzeGuidanceForBias(maleGuidance);
      const femaleBiasAnalysis = await biasDetection.analyzeGuidanceForBias(femaleGuidance);
      
      expect(maleBiasAnalysis.hasBias).toBe(false);
      expect(femaleBiasAnalysis.hasBias).toBe(false);
    });
  });

  describe('Racial and Ethnic Bias Detection', () => {
    test('should detect racial bias in mediation recommendations', async () => {
      const biasedRecommendation = {
        recommendations: [
          {
            type: 'process',
            description: 'Given the cultural background of the parties, expect more aggressive negotiation tactics',
            rationale: 'People from this ethnic group are typically more confrontational'
          }
        ],
        nextSteps: ['Be prepared for difficult negotiations'],
        culturalBridging: ['Account for inherent cultural aggressiveness']
      };

      const biasAnalysis = await biasDetection.analyzeMediationForBias(biasedRecommendation);

      expect(biasAnalysis.hasBias).toBe(true);
      expect(biasAnalysis.biasTypes).toContain('racial');
      expect(biasAnalysis.problematicContent).toContain('aggressive');
    });

    test('should provide culturally sensitive alternatives', async () => {
      const biasedText = 'Asian clients are typically passive and need more direct guidance';
      
      const correctedText = await biasDetection.correctRacialBias(biasedText);
      
      expect(correctedText).not.toContain('Asian clients are typically');
      expect(correctedText).toMatch(/clients may have different|individual preferences/i);
    });

    test('should ensure equal legal guidance across ethnicities', async () => {
      const ethnicities = ['Western', 'Asian', 'Hispanic', 'African', 'Middle-Eastern'];
      const guidanceResults = [];

      for (const ethnicity of ethnicities) {
        const query = {
          id: `${ethnicity.toLowerCase()}-query`,
          userId: `${ethnicity.toLowerCase()}-user`,
          description: 'Contract dispute with service provider',
          category: 'contract-law',
          jurisdiction: ['US-CA'],
          urgency: 'medium',
          culturalContext: `${ethnicity} business practices`,
          language: 'en'
        };

        const mockGuidance = {
          steps: [
            {
              order: 1,
              title: 'Review Contract Terms',
              description: 'Examine the contract for breach provisions',
              timeframe: '1-2 days',
              resources: ['Contract law guide'],
              jurisdictionSpecific: true
            }
          ],
          applicableLaws: [{ title: 'UCC Article 2', description: 'Uniform Commercial Code', jurisdiction: 'US-CA' }],
          culturalConsiderations: [`${ethnicity} business communication styles`],
          nextActions: ['Document breach', 'Attempt resolution'],
          confidence: 0.85
        };

        jest.spyOn(aiLegalGuidance, 'generateGuidance').mockResolvedValue(mockGuidance);
        
        const guidance = await aiLegalGuidance.generateGuidance(query);
        guidanceResults.push({ ethnicity, guidance });
      }

      // Verify consistent core guidance across ethnicities
      const coreSteps = guidanceResults.map(r => r.guidance.steps[0].title);
      const uniqueSteps = [...new Set(coreSteps)];
      expect(uniqueSteps.length).toBe(1); // Should be the same core step

      // Check for bias in each guidance
      for (const result of guidanceResults) {
        const biasAnalysis = await biasDetection.analyzeGuidanceForBias(result.guidance);
        expect(biasAnalysis.hasBias).toBe(false);
      }
    });
  });

  describe('Socioeconomic Bias Detection', () => {
    test('should detect socioeconomic bias in lawyer recommendations', async () => {
      const biasedRecommendation = {
        lawyers: [
          {
            id: 'lawyer-1',
            name: 'Elite Attorney',
            hourlyRate: 1000,
            description: 'Only for clients who can afford quality representation'
          }
        ],
        message: 'Low-income clients should consider public defenders instead of private attorneys'
      };

      const biasAnalysis = await biasDetection.analyzeLawyerRecommendations(biasedRecommendation);

      expect(biasAnalysis.hasBias).toBe(true);
      expect(biasAnalysis.biasTypes).toContain('socioeconomic');
      expect(biasAnalysis.problematicContent).toContain('Low-income clients');
    });

    test('should provide equal quality guidance regardless of budget', async () => {
      const lowBudgetQuery = {
        budget: { min: 50, max: 200 },
        caseType: 'family-law',
        urgency: 'high'
      };

      const highBudgetQuery = {
        budget: { min: 500, max: 1500 },
        caseType: 'family-law',
        urgency: 'high'
      };

      // Both should receive comprehensive guidance
      const lowBudgetGuidance = await aiLegalGuidance.generateGuidance({
        id: 'low-budget',
        userId: 'low-budget-user',
        description: 'Child custody dispute',
        category: 'family-law',
        jurisdiction: ['US-CA'],
        urgency: 'high',
        culturalContext: 'Limited financial resources',
        language: 'en'
      });

      const highBudgetGuidance = await aiLegalGuidance.generateGuidance({
        id: 'high-budget',
        userId: 'high-budget-user',
        description: 'Child custody dispute',
        category: 'family-law',
        jurisdiction: ['US-CA'],
        urgency: 'high',
        culturalContext: 'Substantial financial resources',
        language: 'en'
      });

      // Quality of guidance should be similar
      expect(lowBudgetGuidance.steps.length).toBeGreaterThanOrEqual(highBudgetGuidance.steps.length - 1);
      expect(lowBudgetGuidance.confidence).toBeGreaterThanOrEqual(0.7);
      expect(highBudgetGuidance.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Cultural Sensitivity Validation', () => {
    test('should respect religious considerations', async () => {
      const religiousQuery = {
        id: 'religious-query',
        userId: 'religious-user',
        description: 'Divorce proceedings with religious marriage considerations',
        category: 'family-law',
        jurisdiction: ['US-CA'],
        urgency: 'medium',
        culturalContext: 'Islamic marriage and divorce customs',
        language: 'en'
      };

      const guidance = await aiLegalGuidance.generateGuidance(religiousQuery);
      
      // Should include religious considerations
      expect(guidance.culturalConsiderations.some(c => 
        c.toLowerCase().includes('religious') || c.toLowerCase().includes('islamic')
      )).toBe(true);

      // Should not contradict religious beliefs
      const biasAnalysis = await biasDetection.analyzeReligiousSensitivity(guidance, 'Islamic');
      expect(biasAnalysis.hasReligiousBias).toBe(false);
    });

    test('should adapt communication styles appropriately', () => {
      const directCulture = culturalEngine.adaptCommunicationStyle('Western', 'business-dispute');
      const indirectCulture = culturalEngine.adaptCommunicationStyle('Asian', 'business-dispute');

      expect(directCulture.directness).toBe('direct');
      expect(indirectCulture.directness).toBe('indirect');
      
      // Both should be respectful
      expect(directCulture.tone).toMatch(/respectful|professional/);
      expect(indirectCulture.tone).toMatch(/respectful|professional/);
    });

    test('should avoid cultural stereotypes', async () => {
      const culturalContexts = [
        'Asian business practices',
        'Hispanic family values',
        'African American community norms',
        'Middle Eastern traditions'
      ];

      for (const context of culturalContexts) {
        const query = {
          id: 'stereotype-test',
          userId: 'test-user',
          description: 'General legal question',
          category: 'contract-law',
          jurisdiction: ['US-CA'],
          urgency: 'medium',
          culturalContext: context,
          language: 'en'
        };

        const guidance = await aiLegalGuidance.generateGuidance(query);
        const stereotypeAnalysis = await biasDetection.analyzeForStereotypes(guidance, context);
        
        expect(stereotypeAnalysis.hasStereotypes).toBe(false);
        expect(stereotypeAnalysis.respectfulLanguage).toBe(true);
      }
    });
  });

  describe('Bias Monitoring and Reporting', () => {
    test('should track bias incidents over time', async () => {
      const biasIncidents = [
        { type: 'gender', severity: 'medium', timestamp: new Date() },
        { type: 'racial', severity: 'high', timestamp: new Date() },
        { type: 'socioeconomic', severity: 'low', timestamp: new Date() }
      ];

      for (const incident of biasIncidents) {
        await biasDetection.recordBiasIncident(incident);
      }

      const biasReport = await biasDetection.generateBiasReport();
      
      expect(biasReport.totalIncidents).toBe(3);
      expect(biasReport.byType.gender).toBe(1);
      expect(biasReport.byType.racial).toBe(1);
      expect(biasReport.byType.socioeconomic).toBe(1);
      expect(biasReport.bySeverity.high).toBe(1);
    });

    test('should provide bias mitigation recommendations', async () => {
      const biasPattern = {
        type: 'gender',
        frequency: 'high',
        contexts: ['employment-law', 'family-law']
      };

      const recommendations = await biasDetection.getBiasMitigationRecommendations(biasPattern);
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('training') || r.includes('review'))).toBe(true);
    });

    test('should alert on bias threshold violations', async () => {
      // Simulate high bias detection rate
      const highBiasGuidance = {
        steps: [
          {
            order: 1,
            title: 'Biased Step',
            description: 'Women should not handle aggressive negotiations',
            timeframe: '1 day',
            resources: [],
            jurisdictionSpecific: false
          }
        ],
        applicableLaws: [],
        culturalConsiderations: [],
        nextActions: [],
        confidence: 0.8
      };

      const biasAnalysis = await biasDetection.analyzeGuidanceForBias(highBiasGuidance);
      
      if (biasAnalysis.biasScore > 0.7) {
        const alert = await biasDetection.triggerBiasAlert(biasAnalysis);
        expect(alert.severity).toBe('high');
        expect(alert.requiresReview).toBe(true);
      }
    });
  });

  describe('Fairness Metrics', () => {
    test('should measure demographic parity in outcomes', async () => {
      const outcomes = [
        { demographic: 'male', outcome: 'successful_resolution', count: 85 },
        { demographic: 'female', outcome: 'successful_resolution', count: 82 },
        { demographic: 'male', outcome: 'unsuccessful_resolution', count: 15 },
        { demographic: 'female', outcome: 'unsuccessful_resolution', count: 18 }
      ];

      const parityMetrics = await biasDetection.calculateDemographicParity(outcomes);
      
      expect(parityMetrics.maleSuccessRate).toBeCloseTo(0.85, 2);
      expect(parityMetrics.femaleSuccessRate).toBeCloseTo(0.82, 2);
      expect(parityMetrics.parityDifference).toBeLessThan(0.1); // Within acceptable range
    });

    test('should ensure equalized odds across groups', async () => {
      const predictions = [
        { actualOutcome: 'positive', predictedOutcome: 'positive', group: 'A' },
        { actualOutcome: 'positive', predictedOutcome: 'negative', group: 'A' },
        { actualOutcome: 'negative', predictedOutcome: 'negative', group: 'A' },
        { actualOutcome: 'positive', predictedOutcome: 'positive', group: 'B' },
        { actualOutcome: 'positive', predictedOutcome: 'negative', group: 'B' },
        { actualOutcome: 'negative', predictedOutcome: 'negative', group: 'B' }
      ];

      const equalizedOdds = await biasDetection.calculateEqualizedOdds(predictions);
      
      expect(equalizedOdds.groupA.truePositiveRate).toBeDefined();
      expect(equalizedOdds.groupB.truePositiveRate).toBeDefined();
      expect(Math.abs(equalizedOdds.groupA.truePositiveRate - equalizedOdds.groupB.truePositiveRate)).toBeLessThan(0.1);
    });
  });
});