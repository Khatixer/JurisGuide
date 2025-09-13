import { LegalQuery, LegalCategory, Location } from '../types';
import { detectJurisdiction, normalizeJurisdiction } from './legal-processing';
import { categorizeQueryAdvanced, determineUrgencyAdvanced } from './query-categorization';

export interface ProcessedQuery {
  originalQuery: Partial<LegalQuery>;
  enhancedQuery: Partial<LegalQuery>;
  processingMetadata: {
    categoryConfidence: number;
    urgencyConfidence: number;
    jurisdictionSources: string[];
    alternativeCategories: { category: LegalCategory; confidence: number }[];
    urgencyIndicators: string[];
    processingTime: number;
  };
}

export class LegalQueryProcessor {
  /**
   * Process and enhance a legal query with AI-powered categorization and jurisdiction detection
   */
  static async processQuery(
    queryData: {
      description: string;
      category?: LegalCategory;
      jurisdiction?: string[];
      urgency?: 'low' | 'medium' | 'high' | 'critical';
      culturalContext?: string;
      language?: string;
    },
    userLocation?: Location
  ): Promise<ProcessedQuery> {
    const startTime = Date.now();
    
    const originalQuery = { ...queryData };
    const enhancedQuery = { ...queryData };

    // Initialize processing metadata
    const processingMetadata = {
      categoryConfidence: 0,
      urgencyConfidence: 0,
      jurisdictionSources: [] as string[],
      alternativeCategories: [] as { category: LegalCategory; confidence: number }[],
      urgencyIndicators: [] as string[],
      processingTime: 0
    };

    // 1. Enhanced Category Detection
    if (!queryData.category || queryData.category === 'other') {
      const categoryResult = categorizeQueryAdvanced(queryData.description);
      enhancedQuery.category = categoryResult.category;
      processingMetadata.categoryConfidence = categoryResult.confidence;
      processingMetadata.alternativeCategories = categoryResult.alternativeCategories;
    } else {
      // Validate existing category
      const categoryResult = categorizeQueryAdvanced(queryData.description);
      processingMetadata.categoryConfidence = categoryResult.category === queryData.category ? 0.9 : 0.5;
      processingMetadata.alternativeCategories = categoryResult.alternativeCategories;
    }

    // 2. Enhanced Urgency Detection
    if (!queryData.urgency) {
      const urgencyResult = determineUrgencyAdvanced(queryData.description);
      enhancedQuery.urgency = urgencyResult.urgency;
      processingMetadata.urgencyConfidence = urgencyResult.confidence;
      processingMetadata.urgencyIndicators = urgencyResult.indicators;
    } else {
      // Validate existing urgency
      const urgencyResult = determineUrgencyAdvanced(queryData.description);
      processingMetadata.urgencyConfidence = urgencyResult.urgency === queryData.urgency ? 0.9 : 0.5;
      processingMetadata.urgencyIndicators = urgencyResult.indicators;
    }

    // 3. Enhanced Jurisdiction Detection
    let detectedJurisdictions: string[] = [];
    
    if (!queryData.jurisdiction || queryData.jurisdiction.length === 0) {
      detectedJurisdictions = await detectJurisdiction(queryData.description, userLocation);
      processingMetadata.jurisdictionSources.push('description_analysis');
      
      if (userLocation) {
        processingMetadata.jurisdictionSources.push('user_location');
      }
    } else {
      // Enhance existing jurisdictions
      const additionalJurisdictions = await detectJurisdiction(queryData.description, userLocation);
      detectedJurisdictions = [...new Set([...queryData.jurisdiction, ...additionalJurisdictions])];
      processingMetadata.jurisdictionSources.push('user_provided', 'description_analysis');
    }

    // Normalize jurisdictions
    enhancedQuery.jurisdiction = detectedJurisdictions.map(j => normalizeJurisdiction(j));

    // 4. Language Detection and Enhancement
    if (!queryData.language) {
      enhancedQuery.language = this.detectLanguage(queryData.description);
    }

    // 5. Cultural Context Enhancement
    if (queryData.culturalContext) {
      enhancedQuery.culturalContext = this.enhanceCulturalContext(
        queryData.culturalContext,
        enhancedQuery.jurisdiction || [],
        userLocation
      );
    }

    // Calculate processing time
    processingMetadata.processingTime = Date.now() - startTime;

    return {
      originalQuery,
      enhancedQuery,
      processingMetadata
    };
  }

  /**
   * Detect language from text content (simplified implementation)
   */
  private static detectLanguage(text: string): string {
    // Simple language detection based on common words
    const languagePatterns = {
      'es': ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'una'],
      'fr': ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se'],
      'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als'],
      'pt': ['o', 'de', 'a', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as']
    };

    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};

    for (const [lang, patterns] of Object.entries(languagePatterns)) {
      scores[lang] = 0;
      for (const word of words) {
        if (patterns.includes(word)) {
          scores[lang]++;
        }
      }
    }

    // Find language with highest score
    const detectedLang = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
    
    // Return detected language if confidence is high enough, otherwise default to English
    return scores[detectedLang] > words.length * 0.1 ? detectedLang : 'en';
  }

  /**
   * Enhance cultural context based on jurisdiction and user location
   */
  private static enhanceCulturalContext(
    originalContext: string,
    jurisdictions: string[],
    userLocation?: Location
  ): string {
    let enhancedContext = originalContext;

    // Add jurisdiction-specific cultural considerations
    const culturalConsiderations: Record<string, string[]> = {
      'United States': [
        'Common law system',
        'Federal and state jurisdiction considerations',
        'Constitutional rights emphasis'
      ],
      'European Union': [
        'Civil law system',
        'GDPR privacy considerations',
        'Multi-jurisdictional complexity'
      ],
      'United Kingdom': [
        'Common law tradition',
        'Parliamentary sovereignty',
        'Regional law variations (England, Scotland, Wales, Northern Ireland)'
      ],
      'Canada': [
        'Bijural system (common law and civil law)',
        'Charter of Rights and Freedoms',
        'Federal and provincial jurisdiction'
      ],
      'International': [
        'Cross-border legal complexity',
        'Treaty and convention considerations',
        'Conflict of laws issues'
      ]
    };

    for (const jurisdiction of jurisdictions) {
      const considerations = culturalConsiderations[jurisdiction];
      if (considerations) {
        enhancedContext += ` [${jurisdiction}: ${considerations.join(', ')}]`;
      }
    }

    return enhancedContext;
  }

  /**
   * Validate and score the quality of a legal query
   */
  static validateQuery(query: Partial<LegalQuery>): {
    isValid: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Check description quality
    if (!query.description || query.description.length < 10) {
      issues.push('Description too short');
      suggestions.push('Provide more detailed description of your legal issue');
    } else {
      score += 25;
      if (query.description.length > 50) score += 10;
      if (query.description.length > 100) score += 10;
    }

    // Check category
    if (!query.category || query.category === 'other') {
      suggestions.push('Consider specifying a more specific legal category');
    } else {
      score += 20;
    }

    // Check jurisdiction
    if (!query.jurisdiction || query.jurisdiction.length === 0) {
      issues.push('No jurisdiction specified');
      suggestions.push('Specify the relevant jurisdiction(s) for your legal issue');
    } else {
      score += 20;
    }

    // Check urgency
    if (!query.urgency) {
      suggestions.push('Specify the urgency level of your legal issue');
    } else {
      score += 15;
    }

    // Check language
    if (query.language) {
      score += 10;
    }

    const isValid = issues.length === 0 && score >= 50;

    return {
      isValid,
      score,
      issues,
      suggestions
    };
  }
}