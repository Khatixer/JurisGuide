import { CulturalSensitivityEngine, CulturalContext } from '../../utils/cultural-sensitivity';
import { LegalCategory } from '../../types';

describe('CulturalSensitivityEngine', () => {
  describe('analyzeCulturalContext', () => {
    it('should analyze Hispanic/Latino cultural context', () => {
      const context: CulturalContext = {
        userBackground: 'Hispanic/Latino',
        legalCategory: 'family_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'es',
        urgency: 'medium'
      };

      const adaptation = CulturalSensitivityEngine.analyzeCulturalContext(context);

      expect(adaptation).toBeDefined();
      expect(adaptation.communicationAdjustments).toContain('Use formal language and titles');
      expect(adaptation.processModifications).toContain('Allow time for family/community consultation');
      expect(adaptation.recommendedApproach).toContain('formal');
      expect(adaptation.culturalConsiderations.length).toBeGreaterThan(0);
    });

    it('should analyze Asian cultural context', () => {
      const context: CulturalContext = {
        userBackground: 'Asian',
        legalCategory: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'high'
      };

      const adaptation = CulturalSensitivityEngine.analyzeCulturalContext(context);

      expect(adaptation.communicationAdjustments).toContain('Use diplomatic language to avoid direct confrontation');
      expect(adaptation.processModifications).toContain('Identify and respect decision-making hierarchy');
      expect(adaptation.sensitivityWarnings).toContain('Client may prefer to avoid direct confrontation');
    });

    it('should handle unknown cultural background', () => {
      const context: CulturalContext = {
        userBackground: 'Unknown Culture',
        legalCategory: 'employment_law' as LegalCategory,
        jurisdiction: ['Canada'],
        language: 'en',
        urgency: 'low'
      };

      const adaptation = CulturalSensitivityEngine.analyzeCulturalContext(context);

      expect(adaptation).toBeDefined();
      expect(adaptation.communicationAdjustments.length).toBeGreaterThan(0);
      expect(adaptation.recommendedApproach).toBeDefined();
    });

    it('should provide immigration-specific considerations', () => {
      const context: CulturalContext = {
        userBackground: 'Middle Eastern',
        legalCategory: 'immigration_law' as LegalCategory,
        jurisdiction: ['European Union'],
        language: 'ar',
        urgency: 'critical'
      };

      const adaptation = CulturalSensitivityEngine.analyzeCulturalContext(context);

      expect(adaptation.sensitivityWarnings).toContain('Immigration status may affect family and community');
      expect(adaptation.culturalConsiderations).toContain('Legal terminology may not translate directly');
    });
  });

  describe('adaptGuidanceForCulture', () => {
    it('should adapt guidance for formal communication style', () => {
      const originalGuidance = 'You must contact the court immediately.';
      const culturalAdaptation = CulturalSensitivityEngine.analyzeCulturalContext({
        userBackground: 'Hispanic/Latino',
        legalCategory: 'family_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      });

      const adaptedGuidance = CulturalSensitivityEngine.adaptGuidanceForCulture(
        originalGuidance,
        culturalAdaptation
      );

      expect(adaptedGuidance).toContain('Cultural Considerations:');
      expect(adaptedGuidance).toContain('Recommended Approach:');
      expect(adaptedGuidance).toContain('respectfully contact');
    });

    it('should adapt guidance for diplomatic communication style', () => {
      const originalGuidance = 'You must refuse their demand and take legal action.';
      const culturalAdaptation = CulturalSensitivityEngine.analyzeCulturalContext({
        userBackground: 'Asian',
        legalCategory: 'contract_dispute' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      });

      const adaptedGuidance = CulturalSensitivityEngine.adaptGuidanceForCulture(
        originalGuidance,
        culturalAdaptation
      );

      expect(adaptedGuidance).toContain('should consider');
      expect(adaptedGuidance).not.toContain('must refuse');
    });
  });

  describe('validateCulturalSensitivity', () => {
    it('should identify insensitive language', () => {
      const guidance = 'You must ignore your family and make this decision immediately.';
      const context: CulturalContext = {
        userBackground: 'Hispanic/Latino',
        legalCategory: 'family_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      };

      const validation = CulturalSensitivityEngine.validateCulturalSensitivity(guidance, context);

      expect(validation.isAppropriate).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.suggestions).toContain('Consider family/community consultation time');
    });

    it('should validate appropriate guidance', () => {
      const guidance = 'It is recommended that you respectfully consult with your family before making this important decision.';
      const context: CulturalContext = {
        userBackground: 'Hispanic/Latino',
        legalCategory: 'family_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'medium'
      };

      const validation = CulturalSensitivityEngine.validateCulturalSensitivity(guidance, context);

      expect(validation.isAppropriate).toBe(true);
      expect(validation.issues.length).toBe(0);
    });

    it('should suggest respect for authority when needed', () => {
      const guidance = 'Contact the judge and demand immediate action.';
      const context: CulturalContext = {
        userBackground: 'Asian',
        legalCategory: 'criminal_law' as LegalCategory,
        jurisdiction: ['United States'],
        language: 'en',
        urgency: 'high'
      };

      const validation = CulturalSensitivityEngine.validateCulturalSensitivity(guidance, context);

      expect(validation.suggestions).toContain('Add language showing respect for legal authorities');
    });
  });
});