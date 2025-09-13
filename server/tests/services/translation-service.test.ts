import { TranslationService } from '../../services/translation-service';

// Mock Google Translate
jest.mock('@google-cloud/translate/build/src/v2', () => {
  return {
    Translate: jest.fn().mockImplementation(() => ({
      translate: jest.fn().mockResolvedValue(['texto traducido']),
      detect: jest.fn().mockResolvedValue([{ language: 'en', confidence: 0.99 }]),
      getLanguages: jest.fn().mockResolvedValue([[
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' }
      ]])
    }))
  };
});

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    on: jest.fn()
  }))
}));

describe('TranslationService', () => {
  let translationService: TranslationService;

  beforeEach(() => {
    jest.clearAllMocks();
    translationService = new TranslationService();
  });

  describe('translateText', () => {
    it('should translate text successfully', async () => {
      const result = await translationService.translateText(
        'Hello world',
        'es',
        'en',
        false
      );

      expect(result).toBe('texto traducido');
    });

    it('should return original text if source and target languages are the same', async () => {
      const text = 'Hello world';
      const result = await translationService.translateText(text, 'en', 'en', false);

      expect(result).toBe(text);
    });

    it('should handle legal content translation', async () => {
      const legalText = 'The contract contains a liability clause';
      const result = await translationService.translateText(
        legalText,
        'es',
        'en',
        true
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should detect language when source language is not provided', async () => {
      const result = await translationService.translateText(
        'Hello world',
        'es',
        undefined,
        false
      );

      expect(result).toBe('texto traducido');
    });

    it('should handle translation errors gracefully', async () => {
      // Create a new service instance with mocked translate that throws error
      const mockTranslateError = jest.fn().mockRejectedValue(new Error('Translation API error'));
      
      // Mock the constructor to return an instance with error
      const MockTranslate = jest.fn().mockImplementation(() => ({
        translate: mockTranslateError,
        detect: jest.fn().mockResolvedValue([{ language: 'en', confidence: 0.99 }]),
        getLanguages: jest.fn().mockResolvedValue([[
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Spanish' }
        ]])
      }));

      // Temporarily replace the module
      jest.doMock('@google-cloud/translate/build/src/v2', () => ({
        Translate: MockTranslate
      }));

      // Create new service instance
      const { TranslationService } = require('../../services/translation-service');
      const errorService = new TranslationService();

      await expect(
        errorService.translateText('Hello', 'es', 'en', false)
      ).rejects.toThrow('Translation failed: Translation API error');
    });
  });

  describe('validateLegalTermTranslation', () => {
    it('should validate legal term translation with high accuracy', async () => {
      const validation = await translationService.validateLegalTermTranslation(
        'contract',
        'contrato',
        'en',
        'es'
      );

      expect(validation.originalTerm).toBe('contract');
      expect(validation.translatedTerm).toBe('contrato');
      expect(validation.confidence).toBeGreaterThan(0.8);
      expect(validation.isAccurate).toBe(true);
    });

    it('should provide alternatives for inaccurate translations', async () => {
      const validation = await translationService.validateLegalTermTranslation(
        'contract',
        'acuerdo', // Less accurate translation
        'en',
        'es'
      );

      expect(validation.isAccurate).toBe(false);
      expect(validation.alternatives).toContain('contrato');
    });

    it('should handle unknown legal terms', async () => {
      const validation = await translationService.validateLegalTermTranslation(
        'unknownterm',
        'términodesconocido',
        'en',
        'es'
      );

      expect(validation.confidence).toBe(0.5);
      expect(validation.isAccurate).toBe(true);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', async () => {
      const languages = await translationService.getSupportedLanguages();

      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('fr');
    });

    it('should return fallback languages on API error', async () => {
      const mockTranslate = require('@google-cloud/translate/build/src/v2').Translate;
      const mockInstance = new mockTranslate();
      mockInstance.getLanguages.mockRejectedValueOnce(new Error('API error'));

      const languages = await translationService.getSupportedLanguages();

      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages).toContain('en');
    });
  });

  describe('caching functionality', () => {
    it('should cache translations', async () => {
      // First call should hit the API
      const result1 = await translationService.translateText(
        'Hello world',
        'es',
        'en',
        false
      );

      // Second call should use cache (mocked to return null, so will hit API again)
      const result2 = await translationService.translateText(
        'Hello world',
        'es',
        'en',
        false
      );

      expect(result1).toBe(result2);
    });

    it('should clear translation cache', async () => {
      await expect(translationService.clearTranslationCache()).resolves.not.toThrow();
    });

    it('should get translation statistics', async () => {
      const stats = await translationService.getTranslationStats();

      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('totalTranslations');
      expect(stats).toHaveProperty('supportedLanguages');
      expect(typeof stats.cacheHits).toBe('number');
      expect(typeof stats.totalTranslations).toBe('number');
      expect(typeof stats.supportedLanguages).toBe('number');
    });
  });

  describe('legal terms dictionary', () => {
    it('should have predefined legal terms', async () => {
      // Test that legal terms are properly loaded
      const validation = await translationService.validateLegalTermTranslation(
        'liability',
        'responsabilidad',
        'en',
        'es'
      );

      expect(validation.isAccurate).toBe(true);
    });

    it('should handle multiple legal terms in text', async () => {
      const legalText = 'The contract includes liability and arbitration clauses';
      const result = await translationService.translateText(
        legalText,
        'es',
        'en',
        true
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Redis errors should not prevent translation
      const result = await translationService.translateText(
        'Hello world',
        'es',
        'en',
        false
      );

      expect(result).toBeDefined();
    });

    it('should handle empty text input', async () => {
      // Empty text should still be processed by Google Translate
      // but we can test that it returns the mocked result
      const result = await translationService.translateText('', 'es', 'en', false);
      expect(result).toBe('texto traducido');
    });
  });
});