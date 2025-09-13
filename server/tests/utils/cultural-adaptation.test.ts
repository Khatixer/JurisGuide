import { CulturalAdaptationEngine } from '../../utils/cultural-adaptation';
import { CulturalContext } from '../../utils/cultural-sensitivity';
import { LegalGuidance, LegalCategory } from '../../types';

describe('CulturalAdaptationEngine', () => {
  const mockLegalGuidance: LegalGuidance = {
    queryId: 'test-query-123',
    steps: [
      {
        order: 1,
        title: 'Contact Legal Authority',
        description: 'You must contact the court immediately to file your complaint.',
        timeframe: 'within 24 hours',
        resources: [
          {
            type: 'link',
            title: 'Court Filing System',
            description: 'Online court filing portal',
            url: 'https://courts.gov/filing'
          }
        ],
        jurisdictionSpecific: true
      },
      {
        order: 2,
        title: 'Gather Documentation',
        description: 'You need to collect all relevant documents for your case.',
        timeframe: 'within 1 week',
        resources: [],
        jurisdictionSpecific: false
      }
    ],
    applicableLaws: [
      {
        statute: 'Civil Procedure Code',
        description: 'Rules governing civil litigation',
        jurisdiction: 'United States',
        url: 'https://law.gov/civil-procedure'
      }
    ],
    culturalConsiderations: ['Consider local legal customs'],
    nextActions: ['File complaint', 'Schedule hearing'],
    confidence: 0.85,
    createdAt: new Date()
  };

  describe('adaptLegalGuidance', () => {
    it('should adapt guidance for Hispanic/Latino cultural context', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Hispanic/Latino',
        legalCategory: 'family_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'es',
        urgency: 'medium'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      expect(adaptedGuidance.culturalAdaptation).toBeDefined();
      expect(adaptedGuidance.originalGuidance).toEqual(mockLegalGuidance);
      expect(adaptedGuidance.adaptationMetadata.culturalProfile).toBe('Hispanic/Latino');
      expect(adaptedGuidance.adaptationMetadata.adaptationConfidence).toBeGreaterThan(0);
      
      // Check that steps are adapted
      expect(adaptedGuidance.steps[0].description).toContain('Consider discussing this step with family members');
      expect(adaptedGuidance.steps[0].description).toContain('formally contact');
      
      // Check enhanced cultural considerations
      expect(adaptedGuidance.culturalConsiderations.length).toBeGreaterThan(mockLegalGuidance.culturalConsiderations.length);
      
      // Check adapted next actions
      expect(adaptedGuidance.nextActions.some(action => action.includes('family/advisors'))).toBe(true);
    });

    it('should adapt guidance for Asian cultural context with urgency', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Asian',
        legalCategory: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'critical'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      // Check diplomatic language adaptation
      expect(adaptedGuidance.steps[0].description).toContain('should consider');
      expect(adaptedGuidance.steps[0].description).not.toContain('must contact');
      
      // Check cultural resources added
      expect(adaptedGuidance.steps[0].resources.length).toBeGreaterThan(mockLegalGuidance.steps[0].resources.length);
      
      // Check sensitivity warnings in cultural considerations
      expect(adaptedGuidance.culturalConsiderations.some(c => c.includes('Cultural sensitivity'))).toBe(true);
    });

    it('should adapt timeframes for relationship-based cultures', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Indigenous',
        legalCategory: 'employment_law' as LegalCategory,
        jurisdiction: ['Canada'],
        language: 'en',
        urgency: 'low'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      // Check timeframe adaptation
      expect(adaptedGuidance.steps[0].timeframe).toContain('allowing time for consultation');
      expect(adaptedGuidance.steps[1].timeframe).toContain('allowing time for consultation');
    });

    it('should add interpretation resources for non-English speakers', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Middle Eastern',
        legalCategory: 'immigration_law' as LegalCategory,
        jurisdiction: ['European Union'],
        language: 'ar',
        urgency: 'high'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      // Check interpretation resources added
      const hasInterpretationResource = adaptedGuidance.steps.some(step =>
        step.resources.some(resource => resource.title.includes('Interpretation'))
      );
      expect(hasInterpretationResource).toBe(true);

      // Check cultural legal aid resources
      const hasCulturalResource = adaptedGuidance.steps.some(step =>
        step.resources.some(resource => resource.title.includes('Cultural Legal Aid'))
      );
      expect(hasCulturalResource).toBe(true);
    });

    it('should calculate adaptation confidence correctly', () => {
      const knownCultureContext: CulturalContext = {
        userBackground: 'Hispanic/Latino',
        legalCategory: 'family_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'es',
        urgency: 'medium'
      };

      const unknownCultureContext: CulturalContext = {
        userBackground: 'Unknown Culture',
        legalCategory: 'family_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      };

      const knownAdaptation = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        knownCultureContext
      );

      const unknownAdaptation = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        unknownCultureContext
      );

      expect(knownAdaptation.adaptationMetadata.adaptationConfidence)
        .toBeGreaterThan(unknownAdaptation.adaptationMetadata.adaptationConfidence);
    });

    it('should track adaptations applied', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'African',
        legalCategory: 'criminal_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'high'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      expect(adaptedGuidance.adaptationMetadata.adaptationsApplied.length).toBeGreaterThan(0);
      expect(adaptedGuidance.adaptationMetadata.adaptationsApplied).toContain('Communication style adjustments');
    });
  });

  describe('generateAdaptationSummary', () => {
    it('should generate comprehensive adaptation summary', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Hispanic/Latino',
        legalCategory: 'family_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'es',
        urgency: 'medium'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      const summary = CulturalAdaptationEngine.generateAdaptationSummary(adaptedGuidance);

      expect(summary).toContain('Cultural Adaptation Summary for Hispanic/Latino Background');
      expect(summary).toContain('Recommended Approach:');
      expect(summary).toContain('Communication Adjustments:');
      expect(summary).toContain('Process Modifications:');
      expect(summary).toContain('Cultural Sensitivity Considerations:');
      expect(summary).toContain('Adaptation Confidence:');
      expect(summary).toContain('Adaptations Applied:');
    });

    it('should include percentage in confidence display', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Asian',
        legalCategory: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      const summary = CulturalAdaptationEngine.generateAdaptationSummary(adaptedGuidance);

      expect(summary).toMatch(/Adaptation Confidence: \d+%/);
    });
  });

  describe('language and communication adaptations', () => {
    it('should make language more formal for formal cultures', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Middle Eastern',
        legalCategory: 'business_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      };

      // Create guidance with informal language
      const informalGuidance: LegalGuidance = {
        ...mockLegalGuidance,
        steps: [
          {
            order: 1,
            title: 'Contact Legal Authority',
            description: "You can't contact the court directly. You should ask the clerk for help.",
            timeframe: 'within 24 hours',
            resources: [],
            jurisdictionSpecific: true
          }
        ]
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        informalGuidance,
        culturalContext
      );

      expect(adaptedGuidance.steps[0].description).toContain('cannot');
      expect(adaptedGuidance.steps[0].description).toContain('formally contact');
      expect(adaptedGuidance.steps[0].description).toContain('respectfully inquire');
    });

    it('should make language more diplomatic for indirect cultures', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Asian',
        legalCategory: 'employment_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      expect(adaptedGuidance.steps[0].description).toContain('should consider');
      expect(adaptedGuidance.steps[1].description).toContain('may wish to');
    });

    it('should make language more formal for default profile', () => {
      // Use unknown culture which gets default formal profile
      const culturalContext: CulturalContext = {
        userBackground: 'Unknown Culture',
        legalCategory: 'business_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      };

      // Create guidance with informal language
      const informalGuidance: LegalGuidance = {
        ...mockLegalGuidance,
        steps: [
          {
            order: 1,
            title: 'Contact Legal Authority',
            description: "You can't contact the court directly. You should ask the clerk for help.",
            timeframe: 'prior to the deadline',
            resources: [],
            jurisdictionSpecific: true
          }
        ]
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        informalGuidance,
        culturalContext
      );

      expect(adaptedGuidance.steps[0].description).toContain('cannot');
      expect(adaptedGuidance.steps[0].description).toContain('formally contact');
      expect(adaptedGuidance.steps[0].description).toContain('respectfully inquire');
    });
  });
});