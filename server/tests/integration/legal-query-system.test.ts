import { LegalQueryProcessor } from '../../utils/legal-query-processor';
import { detectJurisdiction, categorizeLegalQuery } from '../../utils/legal-processing';
import { categorizeQueryAdvanced, determineUrgencyAdvanced } from '../../utils/query-categorization';

describe('Legal Query System Integration', () => {
  describe('End-to-end query processing', () => {
    it('should process a complex legal query from start to finish', async () => {
      const complexQuery = {
        description: `I am a software developer who was wrongfully terminated from my job at a tech company. 
        My employer fired me immediately after I reported safety violations and refused to implement 
        unethical data collection practices. I had a signed employment contract that specified a 
        30-day notice period, but they escorted me out the same day. I believe this is retaliation 
        for whistleblowing. I need urgent legal advice as I have a family to support and the 
        company is also withholding my final paycheck and stock options. The company is based 
        in California but I work remotely from New York.`,
        culturalContext: 'Tech industry professional, concerned about ethical practices'
      };

      // Test the complete processing pipeline
      const result = await LegalQueryProcessor.processQuery(complexQuery);

      // Verify category detection
      expect(result.enhancedQuery.category).toBe('employment_law');
      expect(result.processingMetadata.categoryConfidence).toBeGreaterThan(0.5);

      // Verify urgency detection
      expect(['high', 'critical']).toContain(result.enhancedQuery.urgency);
      expect(result.processingMetadata.urgencyConfidence).toBeGreaterThan(0.5);

      // Verify jurisdiction detection
      expect(result.enhancedQuery.jurisdiction).toBeDefined();
      expect(result.enhancedQuery.jurisdiction!.length).toBeGreaterThan(0);
      expect(result.processingMetadata.jurisdictionSources).toContain('description_analysis');

      // Verify language detection
      expect(result.enhancedQuery.language).toBe('en');

      // Verify cultural context enhancement
      expect(result.enhancedQuery.culturalContext).toContain('Tech industry professional');

      // Verify processing metadata
      expect(result.processingMetadata.processingTime).toBeGreaterThan(0);
      expect(result.processingMetadata.alternativeCategories).toBeDefined();
    });

    it('should handle multilingual queries correctly', async () => {
      const spanishQuery = {
        description: 'Necesito ayuda con un problema de inmigración. Mi visa de trabajo está por vencer y mi empleador no quiere renovar mi contrato. Tengo miedo de ser deportado.',
      };

      const result = await LegalQueryProcessor.processQuery(spanishQuery);

      expect(result.enhancedQuery.language).toBe('es');
      expect(result.enhancedQuery.category).toBe('immigration_law');
      expect(result.processingMetadata.categoryConfidence).toBeGreaterThan(0.2);
    });

    it('should detect cross-border legal issues', async () => {
      const internationalQuery = {
        description: 'I have a contract dispute with a European company regarding GDPR compliance and data transfer. The contract was signed in the US but the data processing happens in Germany.',
      };

      const result = await LegalQueryProcessor.processQuery(internationalQuery);

      expect(result.enhancedQuery.jurisdiction).toContain('European Union');
      expect(result.enhancedQuery.category).toBe('contract_dispute');
    });
  });

  describe('Individual component integration', () => {
    it('should integrate jurisdiction detection with categorization', async () => {
      const description = 'Patent infringement case involving US and German companies';
      
      const category = await categorizeLegalQuery(description);
      const jurisdictions = await detectJurisdiction(description);

      expect(category).toBe('intellectual_property');
      expect(jurisdictions).toContain('Germany');
    });

    it('should integrate advanced categorization with urgency detection', () => {
      const description = 'Emergency! My patent application deadline is tomorrow and I need immediate help with prior art search';
      
      const categoryResult = categorizeQueryAdvanced(description);
      const urgencyResult = determineUrgencyAdvanced(description);

      expect(categoryResult.category).toBe('intellectual_property');
      expect(categoryResult.confidence).toBeGreaterThan(0.3);
      expect(urgencyResult.urgency).toBe('critical');
      expect(urgencyResult.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Query validation integration', () => {
    it('should validate processed queries correctly', async () => {
      const goodQuery = {
        description: 'Detailed contract dispute involving breach of software licensing agreement with international vendor',
        category: 'contract_dispute' as const,
        jurisdiction: ['United States', 'International'],
        urgency: 'high' as const,
        language: 'en'
      };

      const validation = LegalQueryProcessor.validateQuery(goodQuery);

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(80);
      expect(validation.issues).toHaveLength(0);
    });

    it('should provide helpful feedback for incomplete queries', () => {
      const incompleteQuery = {
        description: 'Help',
      };

      const validation = LegalQueryProcessor.validateQuery(incompleteQuery);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.suggestions.length).toBeGreaterThan(0);
      expect(validation.score).toBeLessThan(50);
    });
  });

  describe('Performance and reliability', () => {
    it('should process queries within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const result = await LegalQueryProcessor.processQuery({
        description: 'Complex multi-jurisdictional intellectual property dispute involving patents, trademarks, and trade secrets across US, EU, and Asian markets'
      });

      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.processingMetadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle edge cases gracefully', async () => {
      const edgeCases = [
        { description: '' },
        { description: 'a' },
        { description: '!@#$%^&*()' },
        { description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit' }
      ];

      for (const testCase of edgeCases) {
        const result = await LegalQueryProcessor.processQuery(testCase);
        
        expect(result).toBeDefined();
        expect(result.enhancedQuery).toBeDefined();
        expect(result.processingMetadata).toBeDefined();
      }
    });
  });
});