import { LegalQueryProcessor } from '../../utils/legal-query-processor';
import { Location } from '../../types';

describe('LegalQueryProcessor', () => {
  const mockUserLocation: Location = {
    latitude: 40.7128,
    longitude: -74.0060,
    address: '123 Main St',
    city: 'New York',
    state: 'New York',
    country: 'United States',
    postalCode: '10001'
  };

  describe('processQuery', () => {
    it('should enhance a basic contract dispute query', async () => {
      const queryData = {
        description: 'My vendor breached our service agreement and failed to deliver the software on time. I need urgent legal advice.',
      };

      const result = await LegalQueryProcessor.processQuery(queryData, mockUserLocation);

      expect(result.enhancedQuery.category).toBe('contract_dispute');
      expect(result.enhancedQuery.urgency).toBe('critical');
      expect(result.enhancedQuery.jurisdiction).toContain('United States');
      expect(result.enhancedQuery.language).toBe('en');
      expect(result.processingMetadata.categoryConfidence).toBeGreaterThan(0.5);
      expect(result.processingMetadata.urgencyConfidence).toBeGreaterThan(0.3);
    });

    it('should detect employment law issues correctly', async () => {
      const queryData = {
        description: 'I was wrongfully terminated from my job due to discrimination. My employer fired me without proper notice.',
      };

      const result = await LegalQueryProcessor.processQuery(queryData, mockUserLocation);

      expect(result.enhancedQuery.category).toBe('employment_law');
      expect(result.processingMetadata.categoryConfidence).toBeGreaterThan(0.6);
      expect(result.processingMetadata.alternativeCategories).toBeDefined();
    });

    it('should handle critical urgency cases', async () => {
      const queryData = {
        description: 'Emergency! I have a court hearing tomorrow and need immediate legal representation for my criminal case.',
      };

      const result = await LegalQueryProcessor.processQuery(queryData, mockUserLocation);

      expect(result.enhancedQuery.urgency).toBe('critical');
      expect(result.enhancedQuery.category).toBe('criminal_law');
      expect(result.processingMetadata.urgencyConfidence).toBeGreaterThan(0.7);
      expect(result.processingMetadata.urgencyIndicators).toContain('emergency');
    });

    it('should preserve user-provided data when accurate', async () => {
      const queryData = {
        description: 'Contract dispute with vendor over software delivery',
        category: 'contract_dispute' as const,
        jurisdiction: ['United States', 'California'],
        urgency: 'medium' as const,
        language: 'en'
      };

      const result = await LegalQueryProcessor.processQuery(queryData, mockUserLocation);

      expect(result.enhancedQuery.category).toBe('contract_dispute');
      expect(result.enhancedQuery.urgency).toBe('medium');
      expect(result.enhancedQuery.jurisdiction).toContain('United States');
      expect(result.enhancedQuery.jurisdiction).toContain('California');
    });

    it('should detect Spanish language content', async () => {
      const queryData = {
        description: 'Necesito ayuda legal con un problema de inmigración. Mi visa está por vencer y no sé qué hacer.',
      };

      const result = await LegalQueryProcessor.processQuery(queryData, mockUserLocation);

      expect(result.enhancedQuery.language).toBe('es');
      expect(result.enhancedQuery.category).toBe('immigration_law');
    });

    it('should handle international jurisdiction cases', async () => {
      const queryData = {
        description: 'Cross-border contract dispute between US and EU companies regarding GDPR compliance',
      };

      const result = await LegalQueryProcessor.processQuery(queryData, mockUserLocation);

      expect(result.enhancedQuery.jurisdiction).toContain('United States');
      expect(result.enhancedQuery.jurisdiction).toContain('European Union');
      expect(result.enhancedQuery.jurisdiction).toContain('International');
    });

    it('should enhance cultural context based on jurisdiction', async () => {
      const queryData = {
        description: 'Business law question about corporate governance',
        culturalContext: 'Small family business'
      };

      const result = await LegalQueryProcessor.processQuery(queryData, mockUserLocation);

      expect(result.enhancedQuery.culturalContext).toContain('Small family business');
      expect(result.enhancedQuery.culturalContext).toContain('United States');
    });
  });

  describe('validateQuery', () => {
    it('should validate a complete query as valid', () => {
      const query = {
        description: 'Detailed description of my contract dispute with a vendor over software delivery',
        category: 'contract_dispute' as const,
        jurisdiction: ['United States'],
        urgency: 'medium' as const,
        language: 'en'
      };

      const validation = LegalQueryProcessor.validateQuery(query);

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(80);
      expect(validation.issues).toHaveLength(0);
    });

    it('should identify issues with incomplete query', () => {
      const query = {
        description: 'Short',
        category: 'other' as const
      };

      const validation = LegalQueryProcessor.validateQuery(query);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Description too short');
      expect(validation.issues).toContain('No jurisdiction specified');
      expect(validation.suggestions.length).toBeGreaterThan(0);
    });

    it('should provide helpful suggestions', () => {
      const query = {
        description: 'I have a legal problem that needs attention',
        category: 'other' as const
      };

      const validation = LegalQueryProcessor.validateQuery(query);

      expect(validation.suggestions).toContain('Consider specifying a more specific legal category');
      expect(validation.suggestions).toContain('Specify the relevant jurisdiction(s) for your legal issue');
    });

    it('should score queries based on completeness', () => {
      const basicQuery = {
        description: 'Basic legal question'
      };

      const detailedQuery = {
        description: 'Detailed description of my complex legal issue involving multiple parties and jurisdictions',
        category: 'contract_dispute' as const,
        jurisdiction: ['United States'],
        urgency: 'high' as const,
        language: 'en'
      };

      const basicValidation = LegalQueryProcessor.validateQuery(basicQuery);
      const detailedValidation = LegalQueryProcessor.validateQuery(detailedQuery);

      expect(detailedValidation.score).toBeGreaterThan(basicValidation.score);
    });
  });
});