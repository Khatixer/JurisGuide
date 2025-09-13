import express from 'express';
import { translationService } from '../services/translation-service';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const translateTextSchema = {
  text: { type: 'string', required: true, minLength: 1, maxLength: 5000 },
  targetLanguage: { type: 'string', required: true, minLength: 2, maxLength: 5 },
  sourceLang: { type: 'string', required: false, minLength: 2, maxLength: 5 },
  isLegalContent: { type: 'boolean', required: false }
};

const validateLegalTermSchema = {
  originalTerm: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  translatedTerm: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  sourceLang: { type: 'string', required: true, minLength: 2, maxLength: 5 },
  targetLang: { type: 'string', required: true, minLength: 2, maxLength: 5 }
};

/**
 * @route POST /api/translation/translate
 * @desc Translate text with optional legal content handling
 * @access Private
 */
router.post('/translate', authenticateToken, validateRequest(translateTextSchema), async (req, res) => {
  try {
    const { text, targetLanguage, sourceLang, isLegalContent = false } = req.body;

    logger.info(`Translation request: ${text.length} characters to ${targetLanguage}`);

    const translatedText = await translationService.translateText(
      text,
      targetLanguage,
      sourceLang,
      isLegalContent
    );

    res.json(successResponse({
      originalText: text,
      translatedText,
      targetLanguage,
      sourceLang,
      isLegalContent
    }, 'Text translated successfully'));

  } catch (error) {
    logger.error('Translation error:', error);
    res.status(500).json(errorResponse(
      'Translation failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route POST /api/translation/batch-translate
 * @desc Translate multiple texts in batch
 * @access Private
 */
router.post('/batch-translate', authenticateToken, async (req, res) => {
  try {
    const { texts, targetLanguage, sourceLang, isLegalContent = false } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json(errorResponse('Invalid input', 'texts must be a non-empty array'));
    }

    if (texts.length > 50) {
      return res.status(400).json(errorResponse('Too many texts', 'Maximum 50 texts per batch'));
    }

    logger.info(`Batch translation request: ${texts.length} texts to ${targetLanguage}`);

    const translations = await Promise.all(
      texts.map(async (text: string, index: number) => {
        try {
          const translatedText = await translationService.translateText(
            text,
            targetLanguage,
            sourceLang,
            isLegalContent
          );
          return {
            index,
            originalText: text,
            translatedText,
            success: true
          };
        } catch (error) {
          logger.error(`Translation failed for text ${index}:`, error);
          return {
            index,
            originalText: text,
            translatedText: text, // Fallback to original
            success: false,
            error: error instanceof Error ? error.message : 'Translation failed'
          };
        }
      })
    );

    const successCount = translations.filter(t => t.success).length;
    
    res.json(successResponse({
      translations,
      summary: {
        total: texts.length,
        successful: successCount,
        failed: texts.length - successCount
      }
    }, `Batch translation completed: ${successCount}/${texts.length} successful`));

  } catch (error) {
    logger.error('Batch translation error:', error);
    res.status(500).json(errorResponse(
      'Batch translation failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route POST /api/translation/validate-legal-term
 * @desc Validate accuracy of legal term translation
 * @access Private
 */
router.post('/validate-legal-term', authenticateToken, validateRequest(validateLegalTermSchema), async (req, res) => {
  try {
    const { originalTerm, translatedTerm, sourceLang, targetLang } = req.body;

    logger.info(`Legal term validation: ${originalTerm} -> ${translatedTerm} (${sourceLang} to ${targetLang})`);

    const validation = await translationService.validateLegalTermTranslation(
      originalTerm,
      translatedTerm,
      sourceLang,
      targetLang
    );

    res.json(successResponse(validation, 'Legal term validation completed'));

  } catch (error) {
    logger.error('Legal term validation error:', error);
    res.status(500).json(errorResponse(
      'Legal term validation failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route GET /api/translation/supported-languages
 * @desc Get list of supported languages
 * @access Private
 */
router.get('/supported-languages', authenticateToken, async (req, res) => {
  try {
    const languages = await translationService.getSupportedLanguages();

    res.json(successResponse({
      languages,
      count: languages.length
    }, 'Supported languages retrieved successfully'));

  } catch (error) {
    logger.error('Error fetching supported languages:', error);
    res.status(500).json(errorResponse(
      'Failed to fetch supported languages',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route GET /api/translation/stats
 * @desc Get translation service statistics
 * @access Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await translationService.getTranslationStats();

    res.json(successResponse(stats, 'Translation statistics retrieved successfully'));

  } catch (error) {
    logger.error('Error fetching translation stats:', error);
    res.status(500).json(errorResponse(
      'Failed to fetch translation statistics',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route DELETE /api/translation/cache
 * @desc Clear translation cache
 * @access Private
 */
router.delete('/cache', authenticateToken, async (req, res) => {
  try {
    await translationService.clearTranslationCache();

    res.json(successResponse(null, 'Translation cache cleared successfully'));

  } catch (error) {
    logger.error('Error clearing translation cache:', error);
    res.status(500).json(errorResponse(
      'Failed to clear translation cache',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route POST /api/translation/detect-language
 * @desc Detect language of given text
 * @access Private
 */
router.post('/detect-language', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json(errorResponse('Invalid input', 'text is required and must be non-empty'));
    }

    // Use Google Translate to detect language
    const { Translate } = require('@google-cloud/translate').v2;
    const translate = new Translate({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
    });

    const [detection] = await translate.detect(text);
    const detectedLanguage = Array.isArray(detection) ? detection[0] : detection;

    res.json(successResponse({
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      detectedLanguage: detectedLanguage.language,
      confidence: detectedLanguage.confidence || 1
    }, 'Language detected successfully'));

  } catch (error) {
    logger.error('Language detection error:', error);
    res.status(500).json(errorResponse(
      'Language detection failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

export default router;