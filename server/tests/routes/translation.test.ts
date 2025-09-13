import request from 'supertest';
import express from 'express';
import translationRoutes from '../../routes/translation';
import { translationService } from '../../services/translation-service';

// Mock the translation service
jest.mock('../../services/translation-service', () => ({
  translationService: {
    translateText: jest.fn(),
    validateLegalTermTranslation: jest.fn(),
    getSupportedLanguages: jest.fn(),
    getTranslationStats: jest.fn(),
    clearTranslationCache: jest.fn()
  }
}));

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/translation', translationRoutes);

describe('Translation Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/translation/translate', () => {
    it('should translate text successfully', async () => {
      const mockTranslation = 'Hola mundo';
      (translationService.translateText as jest.Mock).mockResolvedValue(mockTranslation);

      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Hello world',
          targetLanguage: 'es',
          sourceLang: 'en',
          isLegalContent: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.translatedText).toBe(mockTranslation);
      expect(response.body.data.originalText).toBe('Hello world');
      expect(response.body.data.targetLanguage).toBe('es');
    });

    it('should handle translation without source language', async () => {
      const mockTranslation = 'Hola mundo';
      (translationService.translateText as jest.Mock).mockResolvedValue(mockTranslation);

      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Hello world',
          targetLanguage: 'es',
          isLegalContent: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(translationService.translateText).toHaveBeenCalledWith(
        'Hello world',
        'es',
        undefined,
        true
      );
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: '', // Empty text
          targetLanguage: 'es'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Hello world'
          // Missing targetLanguage
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle translation service errors', async () => {
      (translationService.translateText as jest.Mock).mockRejectedValue(
        new Error('Translation API error')
      );

      const response = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Hello world',
          targetLanguage: 'es'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Translation failed');
    });
  });

  describe('POST /api/translation/batch-translate', () => {
    it('should translate multiple texts successfully', async () => {
      (translationService.translateText as jest.Mock)
        .mockResolvedValueOnce('Hola')
        .mockResolvedValueOnce('Mundo');

      const response = await request(app)
        .post('/api/translation/batch-translate')
        .send({
          texts: ['Hello', 'World'],
          targetLanguage: 'es',
          sourceLang: 'en'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.translations).toHaveLength(2);
      expect(response.body.data.summary.total).toBe(2);
      expect(response.body.data.summary.successful).toBe(2);
    });

    it('should handle partial failures in batch translation', async () => {
      (translationService.translateText as jest.Mock)
        .mockResolvedValueOnce('Hola')
        .mockRejectedValueOnce(new Error('Translation failed'));

      const response = await request(app)
        .post('/api/translation/batch-translate')
        .send({
          texts: ['Hello', 'World'],
          targetLanguage: 'es'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.translations).toHaveLength(2);
      expect(response.body.data.summary.successful).toBe(1);
      expect(response.body.data.summary.failed).toBe(1);
    });

    it('should return 400 for invalid texts array', async () => {
      const response = await request(app)
        .post('/api/translation/batch-translate')
        .send({
          texts: 'not an array',
          targetLanguage: 'es'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for too many texts', async () => {
      const texts = Array(51).fill('Hello'); // More than 50 texts

      const response = await request(app)
        .post('/api/translation/batch-translate')
        .send({
          texts,
          targetLanguage: 'es'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Maximum 50 texts');
    });
  });

  describe('POST /api/translation/validate-legal-term', () => {
    it('should validate legal term translation', async () => {
      const mockValidation = {
        originalTerm: 'contract',
        translatedTerm: 'contrato',
        confidence: 0.95,
        isAccurate: true
      };

      (translationService.validateLegalTermTranslation as jest.Mock)
        .mockResolvedValue(mockValidation);

      const response = await request(app)
        .post('/api/translation/validate-legal-term')
        .send({
          originalTerm: 'contract',
          translatedTerm: 'contrato',
          sourceLang: 'en',
          targetLang: 'es'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockValidation);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/translation/validate-legal-term')
        .send({
          originalTerm: 'contract',
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/translation/supported-languages', () => {
    it('should return supported languages', async () => {
      const mockLanguages = ['en', 'es', 'fr', 'de'];
      (translationService.getSupportedLanguages as jest.Mock)
        .mockResolvedValue(mockLanguages);

      const response = await request(app)
        .get('/api/translation/supported-languages');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.languages).toEqual(mockLanguages);
      expect(response.body.data.count).toBe(4);
    });

    it('should handle service errors', async () => {
      (translationService.getSupportedLanguages as jest.Mock)
        .mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/translation/supported-languages');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/translation/stats', () => {
    it('should return translation statistics', async () => {
      const mockStats = {
        cacheHits: 100,
        totalTranslations: 150,
        supportedLanguages: 50
      };

      (translationService.getTranslationStats as jest.Mock)
        .mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/translation/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });
  });

  describe('DELETE /api/translation/cache', () => {
    it('should clear translation cache', async () => {
      (translationService.clearTranslationCache as jest.Mock)
        .mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/translation/cache');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(translationService.clearTranslationCache).toHaveBeenCalled();
    });

    it('should handle cache clearing errors', async () => {
      (translationService.clearTranslationCache as jest.Mock)
        .mockRejectedValue(new Error('Cache error'));

      const response = await request(app)
        .delete('/api/translation/cache');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/translation/detect-language', () => {
    it('should detect language successfully', async () => {
      // Mock Google Translate detect method
      const mockDetect = jest.fn().mockResolvedValue([{
        language: 'en',
        confidence: 0.99
      }]);

      // Mock the Translate class
      jest.doMock('@google-cloud/translate', () => ({
        v2: {
          Translate: jest.fn().mockImplementation(() => ({
            detect: mockDetect
          }))
        }
      }));

      const response = await request(app)
        .post('/api/translation/detect-language')
        .send({
          text: 'Hello world'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.detectedLanguage).toBe('en');
      expect(response.body.data.confidence).toBe(0.99);
    });

    it('should return 400 for empty text', async () => {
      const response = await request(app)
        .post('/api/translation/detect-language')
        .send({
          text: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing text', async () => {
      const response = await request(app)
        .post('/api/translation/detect-language')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});