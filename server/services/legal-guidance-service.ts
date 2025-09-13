import { LegalQuery, LegalGuidance, User } from '../types';
import { AILegalGuidanceService, PromptContext } from '../utils/ai-legal-guidance';
import { PromptEngineeringService } from '../utils/prompt-engineering';
import { GuidanceFormatterService, FormattedGuidance } from '../utils/guidance-formatter';
import { CulturalAdaptationEngine, AdaptedGuidance } from '../utils/cultural-adaptation';
import { CommunicationStyleSelector, CommunicationContext } from '../utils/communication-style';
import { CulturalSensitivityEngine, CulturalContext } from '../utils/cultural-sensitivity';
import { logger } from '../utils/logger';

export interface GuidanceRequest {
  query: LegalQuery;
  user: User;
  options?: {
    includeFormatted?: boolean;
    includePlainLanguage?: boolean;
    includeCulturalAdaptation?: boolean;
    maxSteps?: number;
  };
}

export interface GuidanceResponse {
  guidance: LegalGuidance;
  culturallyAdaptedGuidance?: AdaptedGuidance;
  formatted?: FormattedGuidance;
  plainLanguageSummary?: string;
  culturalAdaptationSummary?: string;
  processingMetadata: {
    processingTime: number;
    aiModel: string;
    promptTokens: number;
    responseTokens: number;
    culturalAdaptationsApplied: string[];
    communicationStyleUsed: string;
  };
}

export class LegalGuidanceService {
  private aiService: AILegalGuidanceService;

  constructor() {
    this.aiService = new AILegalGuidanceService({
      model: 'gpt-4',
      maxTokens: 2500,
      temperature: 0.2,
      jurisdictionAware: true,
      culturalSensitive: true
    });
  }

  /**
   * Generate comprehensive legal guidance for a query
   */
  async generateGuidance(request: GuidanceRequest): Promise<GuidanceResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting legal guidance generation', undefined, undefined, {
        queryId: request.query.id,
        userId: request.user.id,
        category: request.query.category
      });

      // Build prompt context
      const promptContext: PromptContext = {
        query: request.query,
        userProfile: {
          culturalBackground: request.user.profile.culturalBackground,
          preferredLanguage: request.user.profile.preferredLanguage,
          communicationStyle: request.user.preferences.communicationStyle
        }
      };

      // Generate AI guidance
      const guidance = await this.aiService.generateGuidance(promptContext);

      // Apply post-processing enhancements
      const enhancedGuidance = await this.enhanceGuidance(guidance, request);

      // Apply cultural adaptations if requested
      let culturallyAdaptedGuidance: AdaptedGuidance | undefined;
      let culturalAdaptationSummary: string | undefined;
      let communicationStyleUsed = 'default';
      let culturalAdaptationsApplied: string[] = [];

      if (request.options?.includeCulturalAdaptation !== false) {
        const culturalContext: CulturalContext = {
          userBackground: request.user.profile.culturalBackground,
          legalCategory: request.query.category,
          jurisdiction: request.query.jurisdiction,
          language: request.query.language,
          urgency: request.query.urgency
        };

        culturallyAdaptedGuidance = CulturalAdaptationEngine.adaptLegalGuidance(
          enhancedGuidance,
          culturalContext
        );

        culturalAdaptationSummary = CulturalAdaptationEngine.generateAdaptationSummary(
          culturallyAdaptedGuidance
        );

        culturalAdaptationsApplied = culturallyAdaptedGuidance.adaptationMetadata.adaptationsApplied;

        // Apply communication style
        const communicationContext: CommunicationContext = {
          culturalBackground: request.user.profile.culturalBackground,
          legalCategory: request.query.category,
          urgency: request.query.urgency,
          language: request.query.language,
          userPreference: request.user.preferences.communicationStyle,
          jurisdiction: request.query.jurisdiction
        };

        const styleAdaptation = CommunicationStyleSelector.selectCommunicationStyle(communicationContext);
        communicationStyleUsed = styleAdaptation.selectedStyle.name;

        // Apply communication style to guidance steps
        culturallyAdaptedGuidance.steps = culturallyAdaptedGuidance.steps.map(step => ({
          ...step,
          description: CommunicationStyleSelector.applyStyleToText(step.description, styleAdaptation)
        }));
      }

      // Format guidance if requested (use culturally adapted version if available)
      let formatted: FormattedGuidance | undefined;
      let plainLanguageSummary: string | undefined;

      const guidanceToFormat = culturallyAdaptedGuidance || enhancedGuidance;

      if (request.options?.includeFormatted) {
        formatted = GuidanceFormatterService.formatGuidanceSteps(guidanceToFormat.steps);
      }

      if (request.options?.includePlainLanguage && formatted) {
        plainLanguageSummary = GuidanceFormatterService.generatePlainLanguageSummary(formatted);
      }

      const processingTime = Date.now() - startTime;

      logger.info('Legal guidance generation completed', undefined, undefined, {
        queryId: request.query.id,
        processingTime,
        stepsGenerated: enhancedGuidance.steps.length,
        confidence: enhancedGuidance.confidence
      });

      return {
        guidance: enhancedGuidance,
        culturallyAdaptedGuidance,
        formatted,
        plainLanguageSummary,
        culturalAdaptationSummary,
        processingMetadata: {
          processingTime,
          aiModel: 'gpt-4',
          promptTokens: 0, // Would be populated from actual API response
          responseTokens: 0, // Would be populated from actual API response
          culturalAdaptationsApplied,
          communicationStyleUsed
        }
      };
    } catch (error) {
      logger.error('Error generating legal guidance', undefined, undefined, {
        queryId: request.query.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to generate legal guidance');
    }
  }

  /**
   * Enhance guidance with additional processing
   */
  private async enhanceGuidance(guidance: LegalGuidance, request: GuidanceRequest): Promise<LegalGuidance> {
    // Add jurisdiction-specific enhancements
    const enhancedSteps = guidance.steps.map(step => ({
      ...step,
      jurisdictionSpecific: this.isJurisdictionSpecific(step, request.query.jurisdiction)
    }));

    // Add cultural considerations if not present
    let enhancedCulturalConsiderations = [...guidance.culturalConsiderations];
    
    if (request.user.profile.culturalBackground && enhancedCulturalConsiderations.length === 0) {
      enhancedCulturalConsiderations = this.generateCulturalConsiderations(
        request.user.profile.culturalBackground,
        request.query.category
      );
    }

    // Enhance legal references with jurisdiction-specific resources
    const enhancedLegalReferences = await this.enhanceLegalReferences(
      guidance.applicableLaws,
      request.query.jurisdiction
    );

    return {
      ...guidance,
      steps: enhancedSteps,
      culturalConsiderations: enhancedCulturalConsiderations,
      applicableLaws: enhancedLegalReferences
    };
  }

  /**
   * Check if a step is jurisdiction-specific
   */
  private isJurisdictionSpecific(step: any, jurisdictions: string[]): boolean {
    const stepText = `${step.title} ${step.description}`.toLowerCase();
    
    // Check for jurisdiction mentions
    const jurisdictionMentions = jurisdictions.some(jurisdiction =>
      stepText.includes(jurisdiction.toLowerCase())
    );

    // Check for jurisdiction-specific keywords
    const jurisdictionKeywords = [
      'federal', 'state', 'provincial', 'local', 'municipal',
      'court', 'statute', 'regulation', 'law', 'code'
    ];

    const hasJurisdictionKeywords = jurisdictionKeywords.some(keyword =>
      stepText.includes(keyword)
    );

    return jurisdictionMentions || hasJurisdictionKeywords;
  }

  /**
   * Generate cultural considerations
   */
  private generateCulturalConsiderations(culturalBackground: string, category: string): string[] {
    const considerations: Record<string, string[]> = {
      'Hispanic/Latino': [
        'Consider family involvement in legal decisions',
        'Respect for authority figures and formal processes',
        'Language interpretation may be needed for legal documents'
      ],
      'Asian': [
        'Face-saving and avoiding public confrontation may be important',
        'Collective decision-making with family or community',
        'Hierarchical communication styles in legal proceedings'
      ],
      'African': [
        'Community consensus and elder involvement in decisions',
        'Oral tradition and storytelling in presenting facts',
        'Extended family considerations in legal matters'
      ],
      'Middle Eastern': [
        'Religious law considerations alongside civil law',
        'Family honor and reputation concerns',
        'Gender role considerations in legal proceedings'
      ]
    };

    return considerations[culturalBackground] || [
      'Consider cultural values and communication preferences',
      'Ensure clear explanation of legal processes and rights',
      'Respect cultural decision-making processes'
    ];
  }

  /**
   * Enhance legal references with jurisdiction-specific resources
   */
  private async enhanceLegalReferences(references: any[], jurisdictions: string[]): Promise<any[]> {
    // Add common legal resources for each jurisdiction
    const enhancedReferences = [...references];

    for (const jurisdiction of jurisdictions) {
      const commonResources = this.getCommonLegalResources(jurisdiction);
      enhancedReferences.push(...commonResources);
    }

    return enhancedReferences;
  }

  /**
   * Get common legal resources for a jurisdiction
   */
  private getCommonLegalResources(jurisdiction: string): any[] {
    const resources: Record<string, any[]> = {
      'United States': [
        {
          statute: 'Legal Aid Services',
          jurisdiction: 'United States',
          description: 'Free or low-cost legal assistance for qualifying individuals',
          url: 'https://www.lsc.gov/find-legal-aid'
        },
        {
          statute: 'Court Self-Help Resources',
          jurisdiction: 'United States',
          description: 'Self-representation resources and forms',
          url: 'https://www.uscourts.gov/forms'
        }
      ],
      'European Union': [
        {
          statute: 'European Legal Aid',
          jurisdiction: 'European Union',
          description: 'Cross-border legal aid in EU member states',
          url: 'https://e-justice.europa.eu/content_legal_aid-55-en.do'
        }
      ]
    };

    return resources[jurisdiction] || [];
  }

  /**
   * Test the service functionality
   */
  async testService(): Promise<boolean> {
    try {
      return await this.aiService.testConnection();
    } catch (error) {
      logger.error('Legal guidance service test failed', undefined, undefined, { error });
      return false;
    }
  }
}

// Export singleton instance
let _legalGuidanceService: LegalGuidanceService | null = null;

export const legalGuidanceService = {
  getInstance(): LegalGuidanceService {
    if (!_legalGuidanceService) {
      _legalGuidanceService = new LegalGuidanceService();
    }
    return _legalGuidanceService;
  },
  
  // Delegate methods
  async generateGuidance(request: GuidanceRequest): Promise<GuidanceResponse> {
    return this.getInstance().generateGuidance(request);
  },
  
  async testService(): Promise<boolean> {
    return this.getInstance().testService();
  }
};