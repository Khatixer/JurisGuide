import { CulturalSensitivityEngine, CulturalContext } from '../../utils/cultural-sensitivity';
import { CulturalAdaptationEngine } from '../../utils/cultural-adaptation';
import { CommunicationStyleSelector } from '../../utils/communication-style';
import { LegalGuidance, LegalCategory } from '../../types';

describe('Cultural Sensitivity Integration Tests', () => {
  const mockLegalGuidance: LegalGuidance = {
    queryId: 'test-query-123',
    steps: [
      {
        order: 1,
        title: 'File Legal Complaint',
        description: 'You must contact the court immediately and demand action on your case.',
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
        title: 'Prepare Documentation',
        description: 'You need to gather all evidence and refuse any settlement offers.',
        timeframe: 'within 1 week',
        resources: [],
        jurisdictionSpecific: false
      }
    ],
    applicableLaws: [
      {
        statute: 'Civil Procedure Code Section 123',
        description: 'Rules for filing complaints',
        jurisdiction: 'United States',
        url: 'https://law.gov/civil-procedure'
      }
    ],
    culturalConsiderations: ['Consider local court procedures'],
    nextActions: ['File complaint', 'Schedule hearing'],
    confidence: 0.85,
    createdAt: new Date()
  };

  describe('End-to-End Cultural Adaptation Workflow', () => {
    it('should provide culturally sensitive guidance for Hispanic/Latino family law case', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Hispanic/Latino',
        legalCategory: 'family_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'es',
        urgency: 'medium'
      };

      // Step 1: Analyze cultural context
      const culturalAnalysis = CulturalSensitivityEngine.analyzeCulturalContext(culturalContext);
      
      expect(culturalAnalysis.communicationAdjustments).toContain('Use formal language and titles');
      expect(culturalAnalysis.processModifications).toContain('Allow time for family/community consultation');
      expect(culturalAnalysis.recommendedApproach).toContain('formal');

      // Step 2: Adapt legal guidance
      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      expect(adaptedGuidance.steps[0].description).toContain('formally contact');
      expect(adaptedGuidance.steps[0].description).toContain('Consider discussing this step with family members');
      expect(adaptedGuidance.culturalConsiderations.length).toBeGreaterThan(mockLegalGuidance.culturalConsiderations.length);
      expect(adaptedGuidance.nextActions.some(action => action.includes('family/advisors'))).toBe(true);

      // Step 3: Validate cultural sensitivity
      const validation = CulturalSensitivityEngine.validateCulturalSensitivity(
        adaptedGuidance.steps[0].description,
        culturalContext
      );

      // The adapted guidance should be more appropriate than original
      expect(validation.issues.length).toBeLessThan(2); // May still have some issues but fewer than original

      // Step 4: Generate adaptation summary
      const summary = CulturalAdaptationEngine.generateAdaptationSummary(adaptedGuidance);
      
      expect(summary).toContain('Hispanic/Latino Background');
      expect(summary).toContain('Communication Adjustments');
      expect(summary).toContain('Process Modifications');
    });

    it('should provide culturally sensitive guidance for Asian business dispute', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Asian',
        legalCategory: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'high'
      };

      // Analyze and adapt
      const culturalAnalysis = CulturalSensitivityEngine.analyzeCulturalContext(culturalContext);
      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      // Should use diplomatic language to avoid confrontation
      expect(culturalAnalysis.communicationAdjustments).toContain('Use diplomatic language to avoid direct confrontation');
      expect(adaptedGuidance.steps[0].description).toContain('should consider');
      expect(adaptedGuidance.steps[1].description).toContain('may wish to');
      
      // Should not contain confrontational language
      expect(adaptedGuidance.steps[0].description).not.toContain('must contact');
      expect(adaptedGuidance.steps[1].description).not.toContain('refuse');

      // Should include face-saving considerations
      expect(culturalAnalysis.sensitivityWarnings).toContain('Client may prefer to avoid direct confrontation');
    });

    it('should handle cross-cultural mediation scenario', () => {
      const party1Context: CulturalContext = {
        userBackground: 'American',
        legalCategory: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      };

      const party2Context: CulturalContext = {
        userBackground: 'Middle Eastern',
        legalCategory: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'ar',
        urgency: 'medium'
      };

      // Analyze both cultural contexts
      const americanAnalysis = CulturalSensitivityEngine.analyzeCulturalContext(party1Context);
      const middleEasternAnalysis = CulturalSensitivityEngine.analyzeCulturalContext(party2Context);

      // American context should be direct
      expect(americanAnalysis.communicationAdjustments).toContain('Provide clear, straightforward information');
      
      // Middle Eastern context should be formal and respectful
      expect(middleEasternAnalysis.communicationAdjustments).toContain('Use formal language and titles');
      expect(middleEasternAnalysis.processModifications).toContain('Identify and respect decision-making hierarchy');

      // Adapt guidance for both parties
      const americanGuidance = CulturalAdaptationEngine.adaptLegalGuidance(mockLegalGuidance, party1Context);
      const middleEasternGuidance = CulturalAdaptationEngine.adaptLegalGuidance(mockLegalGuidance, party2Context);

      // Should have different communication styles
      expect(americanGuidance.steps[0].description).not.toEqual(middleEasternGuidance.steps[0].description);
      
      // Middle Eastern guidance should be more formal
      expect(middleEasternGuidance.steps[0].description).toContain('formally contact');
      
      // Should include interpretation resources for non-English speaker
      const hasInterpretationResource = middleEasternGuidance.steps.some(step =>
        step.resources.some(resource => resource.title.includes('Interpretation'))
      );
      expect(hasInterpretationResource).toBe(true);
    });

    it('should integrate with communication style selection', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Indigenous',
        legalCategory: 'family_law' as LegalCategory,
        jurisdiction: ['Canada'],
        language: 'en',
        urgency: 'low'
      };

      // Select communication style
      const communicationContext = {
        culturalBackground: culturalContext.userBackground,
        legalCategory: culturalContext.legalCategory,
        urgency: culturalContext.urgency as 'low' | 'medium' | 'high' | 'critical',
        language: culturalContext.language,
        userPreference: 'formal' as const,
        jurisdiction: culturalContext.jurisdiction
      };

      const styleAdaptation = CommunicationStyleSelector.selectCommunicationStyle(communicationContext);
      
      // Indigenous culture should get culturally sensitive style
      expect(styleAdaptation.selectedStyle.name).toBe('Culturally Sensitive');
      expect(styleAdaptation.culturalNuances.length).toBeGreaterThan(0);
      // Check for any cultural nuances related to community or family
      const hasCommunityNuance = styleAdaptation.culturalNuances.some(nuance => 
        nuance.toLowerCase().includes('community') || 
        nuance.toLowerCase().includes('family') ||
        nuance.toLowerCase().includes('collective')
      );
      expect(hasCommunityNuance).toBe(true);

      // Apply cultural adaptation
      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      // Should include community consultation
      expect(adaptedGuidance.steps[0].description).toContain('Consider discussing this step with family members');
      expect(adaptedGuidance.nextActions.some(action => action.includes('family/advisors'))).toBe(true);

      // Apply communication style to text
      const styledText = CommunicationStyleSelector.applyStyleToText(
        adaptedGuidance.steps[0].description,
        styleAdaptation
      );

      expect(styledText).toContain('Cultural Considerations:');
      expect(styledText).toContain('Consider community and extended family impact');
    });

    it('should handle urgent cases while maintaining cultural sensitivity', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Asian',
        legalCategory: 'criminal_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'critical'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      // Should balance urgency with cultural sensitivity
      expect(adaptedGuidance.culturalAdaptation.recommendedApproach).toContain('urgency');
      expect(adaptedGuidance.culturalAdaptation.recommendedApproach).toContain('cultural');

      // Should still include cultural considerations even in urgent cases
      expect(adaptedGuidance.culturalConsiderations.some(c => 
        c.includes('Cultural sensitivity')
      )).toBe(true);

      // Should maintain respectful language even with urgency
      expect(adaptedGuidance.steps[0].description).not.toContain('must contact');
      expect(adaptedGuidance.steps[0].description).toContain('should consider');
    });

    it('should provide appropriate guidance for non-English speakers', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Hispanic/Latino',
        legalCategory: 'immigration_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'es',
        urgency: 'high'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      // Should include language-specific resources
      const hasTranslationResource = adaptedGuidance.steps.some(step =>
        step.resources.some(resource => 
          resource.title.includes('Interpretation') || resource.title.includes('Translation')
        )
      );
      expect(hasTranslationResource).toBe(true);

      // Should include language considerations
      expect(adaptedGuidance.culturalConsiderations.some(c => 
        c.includes('Legal terminology may not translate directly')
      )).toBe(true);

      // Should include next action for interpretation (check both communication adjustments and next actions)
      const hasInterpretationSupport = 
        adaptedGuidance.nextActions.some(action => 
          action.toLowerCase().includes('interpretation')
        ) ||
        adaptedGuidance.culturalAdaptation.communicationAdjustments.some(adj =>
          adj.toLowerCase().includes('interpretation') || adj.toLowerCase().includes('translation')
        );
      expect(hasInterpretationSupport).toBe(true);
    });

    it('should validate and suggest improvements for insensitive guidance', () => {
      const insensitiveGuidance = 'You must ignore your family and make this decision immediately without consultation.';
      
      const culturalContext: CulturalContext = {
        userBackground: 'Hispanic/Latino',
        legalCategory: 'family_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      };

      const validation = CulturalSensitivityEngine.validateCulturalSensitivity(
        insensitiveGuidance,
        culturalContext
      );

      expect(validation.isAppropriate).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.suggestions).toContain('Consider family/community consultation time');

      // Test adaptation of the insensitive guidance
      const culturalAdaptation = CulturalSensitivityEngine.analyzeCulturalContext(culturalContext);
      const adaptedText = CulturalSensitivityEngine.adaptGuidanceForCulture(
        insensitiveGuidance,
        culturalAdaptation
      );

      expect(adaptedText).toContain('Cultural Considerations:');
      expect(adaptedText).toContain('Recommended Approach:');
      // The original insensitive text should be included but with cultural context added
      expect(adaptedText.length).toBeGreaterThan(insensitiveGuidance.length);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle unknown cultural backgrounds gracefully', () => {
      const culturalContext: CulturalContext = {
        userBackground: 'Martian', // Unknown culture
        legalCategory: 'business_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        mockLegalGuidance,
        culturalContext
      );

      expect(adaptedGuidance).toBeDefined();
      expect(adaptedGuidance.adaptationMetadata.culturalProfile).toBe('Martian');
      expect(adaptedGuidance.adaptationMetadata.adaptationConfidence).toBeLessThan(0.8);
      expect(adaptedGuidance.culturalAdaptation.recommendedApproach).toBeDefined();
    });

    it('should handle empty guidance gracefully', () => {
      const emptyGuidance: LegalGuidance = {
        queryId: 'empty-query',
        steps: [],
        applicableLaws: [],
        culturalConsiderations: [],
        nextActions: [],
        confidence: 0,
        createdAt: new Date()
      };

      const culturalContext: CulturalContext = {
        userBackground: 'Asian',
        legalCategory: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      };

      const adaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
        emptyGuidance,
        culturalContext
      );

      expect(adaptedGuidance).toBeDefined();
      expect(adaptedGuidance.steps).toEqual([]);
      expect(adaptedGuidance.culturalAdaptation).toBeDefined();
    });

    it('should maintain performance with multiple adaptations', () => {
      const culturalContexts: CulturalContext[] = [
        {
          userBackground: 'Hispanic/Latino',
          legalCategory: 'family_law' as LegalCategory,
          jurisdiction: ['United States'],
          language: 'es',
          urgency: 'medium'
        },
        {
          userBackground: 'Asian',
          legalCategory: 'contract_dispute' as LegalCategory,
          jurisdiction: ['United States'],
          language: 'en',
          urgency: 'high'
        },
        {
          userBackground: 'African',
          legalCategory: 'employment_law' as LegalCategory,
          jurisdiction: ['Canada'],
          language: 'fr',
          urgency: 'low'
        }
      ];

      const startTime = Date.now();
      
      const adaptations = culturalContexts.map(context =>
        CulturalAdaptationEngine.adaptLegalGuidance(mockLegalGuidance, context)
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(adaptations.length).toBe(3);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Each adaptation should be unique
      expect(adaptations[0].steps[0].description).not.toEqual(adaptations[1].steps[0].description);
      expect(adaptations[1].steps[0].description).not.toEqual(adaptations[2].steps[0].description);
    });
  });
});