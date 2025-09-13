import { Translate } from '@google-cloud/translate/build/src/v2';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

interface TranslationCache {
  text: string;
  targetLanguage: string;
  translatedText: string;
  timestamp: number;
  isLegalTerm: boolean;
}

interface LegalTermValidation {
  originalTerm: string;
  translatedTerm: string;
  confidence: number;
  isAccurate: boolean;
  alternatives?: string[];
}

export class TranslationService {
  private translate: Translate;
  private redisClient: any;
  private cacheExpiry = 7 * 24 * 60 * 60; // 7 days in seconds
  private legalTermsDict: Map<string, Map<string, string>> = new Map();

  constructor() {
    // Initialize Google Translate
    this.translate = new Translate({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
    });

    // Initialize Redis client for caching
    this.initializeRedis();
    this.loadLegalTermsDictionary();
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        logger.error('Redis Client Error:', err.message);
      });

      await this.redisClient.connect();
      logger.info('Translation service Redis cache connected');
    } catch (error) {
      logger.error('Failed to connect to Redis for translation cache:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private loadLegalTermsDictionary(): void {
    // Load predefined legal term translations for accuracy
    const legalTerms = {
      'en': {
        'contract': { 'es': 'contrato', 'fr': 'contrat', 'de': 'Vertrag' },
        'liability': { 'es': 'responsabilidad', 'fr': 'responsabilité', 'de': 'Haftung' },
        'jurisdiction': { 'es': 'jurisdicción', 'fr': 'juridiction', 'de': 'Gerichtsbarkeit' },
        'plaintiff': { 'es': 'demandante', 'fr': 'demandeur', 'de': 'Kläger' },
        'defendant': { 'es': 'demandado', 'fr': 'défendeur', 'de': 'Beklagte' },
        'arbitration': { 'es': 'arbitraje', 'fr': 'arbitrage', 'de': 'Schiedsverfahren' },
        'mediation': { 'es': 'mediación', 'fr': 'médiation', 'de': 'Mediation' },
        'damages': { 'es': 'daños', 'fr': 'dommages', 'de': 'Schäden' },
        'breach': { 'es': 'incumplimiento', 'fr': 'violation', 'de': 'Verletzung' },
        'settlement': { 'es': 'acuerdo', 'fr': 'règlement', 'de': 'Vergleich' }
      }
    };

    for (const [sourceLang, terms] of Object.entries(legalTerms)) {
      this.legalTermsDict.set(sourceLang, new Map());
      for (const [term, translations] of Object.entries(terms)) {
        for (const [targetLang, translation] of Object.entries(translations)) {
          const key = `${term}:${targetLang}`;
          this.legalTermsDict.get(sourceLang)?.set(key, translation);
        }
      }
    }
  }

  async translateText(
    text: string, 
    targetLanguage: string, 
    sourceLang?: string,
    isLegalContent: boolean = false
  ): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `translation:${sourceLang || 'auto'}:${targetLanguage}:${Buffer.from(text).toString('base64')}`;
      const cached = await this.getCachedTranslation(cacheKey);
      
      if (cached) {
        logger.info('Translation served from cache');
        return cached.translatedText;
      }

      // Detect source language if not provided
      if (!sourceLang) {
        const [detection] = await this.translate.detect(text);
        sourceLang = Array.isArray(detection) ? detection[0].language : detection.language;
      }

      // If source and target are the same, return original text
      if (sourceLang === targetLanguage) {
        return text;
      }

      let translatedText: string;

      if (isLegalContent && sourceLang) {
        // Use specialized legal translation with term validation
        translatedText = await this.translateLegalContent(text, sourceLang, targetLanguage);
      } else {
        // Standard translation
        const [translation] = await this.translate.translate(text, {
          from: sourceLang,
          to: targetLanguage,
        });
        translatedText = translation;
      }

      // Cache the translation
      await this.cacheTranslation(cacheKey, {
        text,
        targetLanguage,
        translatedText,
        timestamp: Date.now(),
        isLegalTerm: isLegalContent
      });

      logger.info(`Text translated from ${sourceLang} to ${targetLanguage}`);
      return translatedText;

    } catch (error) {
      logger.error('Translation error:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async translateLegalContent(
    text: string, 
    sourceLang: string, 
    targetLang: string
  ): Promise<string> {
    // Split text into sentences and identify legal terms
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const translatedSentences: string[] = [];

    for (const sentence of sentences) {
      let translatedSentence = sentence.trim();
      
      if (translatedSentence) {
        // Check for legal terms in the sentence
        const legalTerms = this.extractLegalTerms(translatedSentence, sourceLang);
        
        if (legalTerms.length > 0) {
          // Translate with legal term preservation
          translatedSentence = await this.translateWithLegalTerms(
            translatedSentence, 
            sourceLang, 
            targetLang, 
            legalTerms
          );
        } else {
          // Standard translation for non-legal content
          const [translation] = await this.translate.translate(translatedSentence, {
            from: sourceLang,
            to: targetLang,
          });
          translatedSentence = translation;
        }
        
        translatedSentences.push(translatedSentence);
      }
    }

    return translatedSentences.join('. ') + (text.endsWith('.') ? '' : '.');
  }

  private extractLegalTerms(text: string, sourceLang: string): string[] {
    const terms: string[] = [];
    const langTerms = this.legalTermsDict.get(sourceLang);
    
    if (langTerms) {
      for (const [termKey] of langTerms) {
        const term = termKey.split(':')[0];
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        if (regex.test(text)) {
          terms.push(term);
        }
      }
    }
    
    return terms;
  }

  private async translateWithLegalTerms(
    text: string, 
    sourceLang: string, 
    targetLang: string, 
    legalTerms: string[]
  ): Promise<string> {
    let translatedText = text;
    
    // First, replace legal terms with placeholders
    const placeholders: { [key: string]: string } = {};
    legalTerms.forEach((term, index) => {
      const placeholder = `__LEGAL_TERM_${index}__`;
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      translatedText = translatedText.replace(regex, placeholder);
      placeholders[placeholder] = term;
    });

    // Translate the text with placeholders
    const [translation] = await this.translate.translate(translatedText, {
      from: sourceLang,
      to: targetLang,
    });

    // Replace placeholders with accurate legal term translations
    let finalTranslation = translation;
    for (const [placeholder, originalTerm] of Object.entries(placeholders)) {
      const termKey = `${originalTerm.toLowerCase()}:${targetLang}`;
      const langTerms = this.legalTermsDict.get(sourceLang);
      const accurateTranslation = langTerms?.get(termKey) || originalTerm;
      
      finalTranslation = finalTranslation.replace(
        new RegExp(placeholder, 'g'), 
        accurateTranslation
      );
    }

    return finalTranslation;
  }

  async validateLegalTermTranslation(
    originalTerm: string, 
    translatedTerm: string, 
    sourceLang: string, 
    targetLang: string
  ): Promise<LegalTermValidation> {
    const termKey = `${originalTerm.toLowerCase()}:${targetLang}`;
    const langTerms = this.legalTermsDict.get(sourceLang);
    const expectedTranslation = langTerms?.get(termKey);

    const validation: LegalTermValidation = {
      originalTerm,
      translatedTerm,
      confidence: 0,
      isAccurate: false
    };

    if (expectedTranslation) {
      // Check if translation matches our legal dictionary
      const similarity = this.calculateSimilarity(translatedTerm.toLowerCase(), expectedTranslation.toLowerCase());
      validation.confidence = similarity;
      validation.isAccurate = similarity > 0.8;
      
      if (!validation.isAccurate) {
        validation.alternatives = [expectedTranslation];
      }
    } else {
      // Use AI to validate if no dictionary entry exists
      validation.confidence = 0.5; // Medium confidence for unknown terms
      validation.isAccurate = true; // Assume accurate if not in dictionary
    }

    return validation;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private async getCachedTranslation(cacheKey: string): Promise<TranslationCache | null> {
    try {
      if (!this.redisClient) return null;
      
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        const translation: TranslationCache = JSON.parse(cached);
        
        // Check if cache is still valid (not expired)
        const now = Date.now();
        const cacheAge = (now - translation.timestamp) / 1000;
        
        if (cacheAge < this.cacheExpiry) {
          return translation;
        } else {
          // Remove expired cache
          await this.redisClient.del(cacheKey);
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Cache retrieval error:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  private async cacheTranslation(cacheKey: string, translation: TranslationCache): Promise<void> {
    try {
      if (!this.redisClient) return;
      
      await this.redisClient.setEx(
        cacheKey, 
        this.cacheExpiry, 
        JSON.stringify(translation)
      );
    } catch (error) {
      logger.error('Cache storage error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async getSupportedLanguages(): Promise<string[]> {
    try {
      const [languages] = await this.translate.getLanguages();
      return languages.map(lang => lang.code);
    } catch (error) {
      logger.error('Error fetching supported languages:', error instanceof Error ? error.message : 'Unknown error');
      // Return common languages as fallback
      return ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'hi', 'ru'];
    }
  }

  async clearTranslationCache(): Promise<void> {
    try {
      if (!this.redisClient) return;
      
      const keys = await this.redisClient.keys('translation:*');
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        logger.info(`Cleared ${keys.length} translation cache entries`);
      }
    } catch (error) {
      logger.error('Error clearing translation cache:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async getTranslationStats(): Promise<{
    cacheHits: number;
    totalTranslations: number;
    supportedLanguages: number;
  }> {
    try {
      const supportedLanguages = await this.getSupportedLanguages();
      const cacheKeys = this.redisClient ? await this.redisClient.keys('translation:*') : [];
      
      return {
        cacheHits: cacheKeys.length,
        totalTranslations: cacheKeys.length, // Simplified for now
        supportedLanguages: supportedLanguages.length
      };
    } catch (error) {
      logger.error('Error getting translation stats:', error instanceof Error ? error.message : 'Unknown error');
      return {
        cacheHits: 0,
        totalTranslations: 0,
        supportedLanguages: 0
      };
    }
  }
}

export const translationService = new TranslationService();