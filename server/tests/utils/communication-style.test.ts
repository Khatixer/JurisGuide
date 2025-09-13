import { CommunicationStyleSelector, CommunicationContext } from '../../utils/communication-style';
import { LegalCategory } from '../../types';

describe('CommunicationStyleSelector', () => {
  describe('selectCommunicationStyle', () => {
    it('should select formal respectful style for Hispanic/Latino background', () => {
      const context: CommunicationContext = {
        culturalBackground: 'Hispanic/Latino',
        legalCategory: 'business_law' as LegalCategory, // Use non-sensitive category
        urgency: 'medium',
        language: 'es',
        userPreference: 'formal',
        jurisdiction: ['United States']
      };

      const styleAdaptation = CommunicationStyleSelector.selectCommunicationStyle(context);

      expect(styleAdaptation.selectedStyle.name).toBe('Formal Respectful');
      expect(styleAdaptation.selectedStyle.tone).toBe('formal');
      expect(styleAdaptation.adaptationRules).toContain('Use formal titles and respectful language');
      expect(styleAdaptation.culturalNuances).toContain('Consider family involvement in decision-making');
    });

    it('should select diplomatic indirect style for Asian background', () => {
      const context: CommunicationContext = {
        culturalBackground: 'Asian',
        legalCategory: 'contract_dispute' as LegalCategory,
        urgency: 'low',
        language: 'en',
        userPreference: 'formal',
        jurisdiction: ['United States']
      };

      const styleAdaptation = CommunicationStyleSelector.selectCommunicationStyle(context);

      expect(styleAdaptation.selectedStyle.tone).toBe('diplomatic');
      expect(styleAdaptation.adaptationRules).toContain('Use indirect language to avoid confrontation');
      expect(styleAdaptation.culturalNuances).toContain('Avoid direct confrontation or loss of face');
    });

    it('should adjust style for critical urgency', () => {
      const context: CommunicationContext = {
        culturalBackground: 'Asian',
        legalCategory: 'criminal_law' as LegalCategory,
        urgency: 'critical',
        language: 'en',
        userPreference: 'formal',
        jurisdiction: ['United States']
      };

      const styleAdaptation = CommunicationStyleSelector.selectCommunicationStyle(context);

      expect(styleAdaptation.selectedStyle.tone).toBe('direct');
      expect(styleAdaptation.selectedStyle.structure).toBe('linear');
      expect(styleAdaptation.selectedStyle.culturalMarkers).toContain('urgent action required');
    });

    it('should adjust style for sensitive legal categories', () => {
      const context: CommunicationContext = {
        culturalBackground: 'American',
        legalCategory: 'family_law' as LegalCategory,
        urgency: 'medium',
        language: 'en',
        userPreference: 'casual',
        jurisdiction: ['United States']
      };

      const styleAdaptation = CommunicationStyleSelector.selectCommunicationStyle(context);

      expect(styleAdaptation.selectedStyle.tone).toBe('diplomatic');
      expect(styleAdaptation.selectedStyle.culturalMarkers).toContain('sensitive topic handling');
    });

    it('should include language patterns for formal tone', () => {
      const context: CommunicationContext = {
        culturalBackground: 'European',
        legalCategory: 'business_law' as LegalCategory,
        urgency: 'medium',
        language: 'en',
        userPreference: 'formal',
        jurisdiction: ['European Union']
      };

      const styleAdaptation = CommunicationStyleSelector.selectCommunicationStyle(context);

      expect(styleAdaptation.languagePatterns['\\byou should\\b']).toBe('it is recommended that you');
      expect(styleAdaptation.languagePatterns['\\bcontact\\b']).toBe('formally contact');
    });

    it('should include examples for style adaptation', () => {
      const context: CommunicationContext = {
        culturalBackground: 'Hispanic/Latino',
        legalCategory: 'immigration_law' as LegalCategory,
        urgency: 'medium',
        language: 'en',
        userPreference: 'formal',
        jurisdiction: ['United States']
      };

      const styleAdaptation = CommunicationStyleSelector.selectCommunicationStyle(context);

      expect(styleAdaptation.examples.length).toBeGreaterThan(0);
      expect(styleAdaptation.examples[0]).toHaveProperty('before');
      expect(styleAdaptation.examples[0]).toHaveProperty('after');
      expect(styleAdaptation.examples[0]).toHaveProperty('explanation');
    });
  });

  describe('applyStyleToText', () => {
    it('should apply formal language patterns', () => {
      const originalText = "You should contact the court and ask for help.";
      const styleAdaptation = CommunicationStyleSelector.selectCommunicationStyle({
        culturalBackground: 'Hispanic/Latino',
        legalCategory: 'family_law' as LegalCategory,
        urgency: 'medium',
        language: 'en',
        userPreference: 'formal',
        jurisdiction: ['United States']
      });

      const adaptedText = CommunicationStyleSelector.applyStyleToText(originalText, styleAdaptation);

      expect(adaptedText).toContain('it is recommended that you');
      expect(adaptedText).toContain('formally contact');
      expect(adaptedText).toContain('respectfully inquire');
      expect(adaptedText).toContain('Cultural Considerations:');
    });

    it('should apply diplomatic language patterns', () => {
      const originalText = "You must refuse their demand and take action.";
      const styleAdaptation = CommunicationStyleSelector.selectCommunicationStyle({
        culturalBackground: 'Asian',
        legalCategory: 'contract_dispute' as LegalCategory,
        urgency: 'medium',
        language: 'en',
        userPreference: 'formal',
        jurisdiction: ['United States']
      });

      const adaptedText = CommunicationStyleSelector.applyStyleToText(originalText, styleAdaptation);

      expect(adaptedText).toContain('should consider');
      expect(adaptedText).not.toContain('must refuse');
    });

    it('should simplify vocabulary when appropriate', () => {
      const originalText = "You should commence litigation proceedings to facilitate resolution.";
      const styleAdaptation = CommunicationStyleSelector.selectCommunicationStyle({
        culturalBackground: 'American',
        legalCategory: 'personal_injury' as LegalCategory,
        urgency: 'medium',
        language: 'en',
        userPreference: 'casual',
        jurisdiction: ['United States']
      });

      const adaptedText = CommunicationStyleSelector.applyStyleToText(originalText, styleAdaptation);

      expect(adaptedText).toContain('start');
      expect(adaptedText).toContain('help with');
      expect(adaptedText).not.toContain('commence');
      expect(adaptedText).not.toContain('facilitate');
    });
  });

  describe('validateStyleAppropriateness', () => {
    it('should identify inappropriate formal language usage', () => {
      const text = "You can't do this and won't be able to proceed.";
      const context: CommunicationContext = {
        culturalBackground: 'European',
        legalCategory: 'business_law' as LegalCategory,
        urgency: 'medium',
        language: 'en',
        userPreference: 'formal',
        jurisdiction: ['European Union']
      };

      const validation = CommunicationStyleSelector.validateStyleAppropriateness(text, context);

      expect(validation.isAppropriate).toBe(false);
      expect(validation.issues).toContain('Informal contractions used with formal preference');
      expect(validation.suggestions).toContain('Use "cannot" instead of "can\'t"');
    });

    it('should identify culturally inappropriate language', () => {
      const text = "You must refuse their offer immediately.";
      const context: CommunicationContext = {
        culturalBackground: 'Asian',
        legalCategory: 'contract_dispute' as LegalCategory,
        urgency: 'medium',
        language: 'en',
        userPreference: 'formal',
        jurisdiction: ['United States']
      };

      const validation = CommunicationStyleSelector.validateStyleAppropriateness(text, context);

      expect(validation.isAppropriate).toBe(false);
      expect(validation.issues).toContain('Direct confrontational language may be inappropriate');
      expect(validation.suggestions).toContain('Use more diplomatic language like "politely decline"');
    });

    it('should validate appropriate text', () => {
      const text = "It is recommended that you respectfully consider your options and consult with advisors.";
      const context: CommunicationContext = {
        culturalBackground: 'Hispanic/Latino',
        legalCategory: 'family_law' as LegalCategory,
        urgency: 'medium',
        language: 'en',
        userPreference: 'formal',
        jurisdiction: ['United States']
      };

      const validation = CommunicationStyleSelector.validateStyleAppropriateness(text, context);

      expect(validation.isAppropriate).toBe(true);
      expect(validation.issues.length).toBe(0);
    });
  });
});