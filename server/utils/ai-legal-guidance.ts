import OpenAI from 'openai';
import { LegalQuery, LegalGuidance, GuidanceStep, LegalReference } from '../types';
import { logger } from './logger';

export interface AIGuidanceConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  jurisdictionAware: boolean;
  culturalSensitive: boolean;
}

export interface PromptContext {
  query: LegalQuery;
  userProfile?: {
    culturalBackground: string;
    preferredLanguage: string;
    communicationStyle: 'formal' | 'casual';
  };
}

export class AILegalGuidanceService {
  private openai: OpenAI;
  private config: AIGuidanceConfig;

  constructor(config?: Partial<AIGuidanceConfig>) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });

    this.config = {
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.3,
      jurisdictionAware: true,
      culturalSensitive: true,
      ...config
    };
  }

  /**
   * Generate comprehensive legal guidance for a query
   */
  async generateGuidance(context: PromptContext): Promise<LegalGuidance> {
    try {
      const prompt = this.buildGuidancePrompt(context);
      
      logger.info('Generating AI legal guidance', undefined, undefined, {
        queryId: context.query.id,
        category: context.query.category,
        jurisdiction: context.query.jurisdiction
      });

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(context)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const guidanceData = JSON.parse(content);
      
      // Validate and structure the response
      const guidance = this.structureGuidanceResponse(guidanceData, context.query.id);
      
      logger.info('AI legal guidance generated successfully', undefined, undefined, {
        queryId: context.query.id,
        stepsCount: guidance.steps.length,
        confidence: guidance.confidence
      });

      return guidance;
    } catch (error) {
      logger.error('Error generating AI legal guidance', undefined, undefined, {
        queryId: context.query.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to generate legal guidance');
    }
  }

  /**
   * Build the main guidance prompt
   */
  private buildGuidancePrompt(context: PromptContext): string {
    const { query, userProfile } = context;
    
    let prompt = `Legal Issue Analysis and Guidance Request:

Description: ${query.description}
Category: ${query.category}
Jurisdiction(s): ${query.jurisdiction.join(', ')}
Urgency Level: ${query.urgency}
Language: ${query.language}`;

    if (query.culturalContext) {
      prompt += `\nCultural Context: ${query.culturalContext}`;
    }

    if (userProfile) {
      prompt += `\nUser Profile:
- Cultural Background: ${userProfile.culturalBackground}
- Preferred Language: ${userProfile.preferredLanguage}
- Communication Style: ${userProfile.communicationStyle}`;
    }

    prompt += `\n\nPlease provide comprehensive legal guidance in JSON format with the following structure:
{
  "steps": [
    {
      "order": 1,
      "title": "Step title",
      "description": "Detailed description",
      "timeframe": "Expected timeframe",
      "resources": [
        {
          "type": "document|link|contact",
          "title": "Resource title",
          "url": "URL if applicable",
          "description": "Resource description"
        }
      ],
      "jurisdictionSpecific": true/false
    }
  ],
  "applicableLaws": [
    {
      "statute": "Law or regulation name",
      "jurisdiction": "Applicable jurisdiction",
      "description": "Brief description",
      "url": "Official URL if available"
    }
  ],
  "culturalConsiderations": [
    "Cultural consideration 1",
    "Cultural consideration 2"
  ],
  "nextActions": [
    "Immediate action 1",
    "Follow-up action 2"
  ],
  "confidence": 0.85
}`;

    return prompt;
  }

  /**
   * Get system prompt based on context
   */
  private getSystemPrompt(context: PromptContext): string {
    const { query, userProfile } = context;
    
    let systemPrompt = `You are an expert legal AI assistant specializing in providing jurisdiction-aware, culturally sensitive legal guidance. Your role is to:

1. Analyze legal issues comprehensively
2. Provide step-by-step guidance tailored to specific jurisdictions
3. Consider cultural context and communication preferences
4. Suggest relevant legal resources and next steps
5. Maintain appropriate legal disclaimers

Key Guidelines:
- Always specify jurisdiction-specific advice when applicable
- Consider cultural norms and communication styles
- Provide practical, actionable steps
- Include relevant legal references and resources
- Maintain professional but accessible language
- Include appropriate legal disclaimers
- Rate your confidence in the guidance provided (0.0 to 1.0)

Jurisdiction Focus: ${query.jurisdiction.join(', ')}
Legal Category: ${query.category}
Language: ${query.language}`;

    if (userProfile?.culturalBackground) {
      systemPrompt += `\nCultural Context: Adapt communication style for ${userProfile.culturalBackground} background`;
    }

    if (userProfile?.communicationStyle) {
      systemPrompt += `\nCommunication Style: Use ${userProfile.communicationStyle} tone`;
    }

    systemPrompt += `\n\nIMPORTANT: Always include a disclaimer that this is general legal information and not legal advice. Recommend consulting with a qualified attorney for specific legal matters.`;

    return systemPrompt;
  }

  /**
   * Structure and validate the AI response
   */
  private structureGuidanceResponse(guidanceData: any, queryId: string): LegalGuidance {
    // Validate required fields
    if (!guidanceData.steps || !Array.isArray(guidanceData.steps)) {
      throw new Error('Invalid guidance response: missing or invalid steps');
    }

    // Structure steps
    const steps: GuidanceStep[] = guidanceData.steps.map((step: any, index: number) => ({
      order: step.order || index + 1,
      title: step.title || `Step ${index + 1}`,
      description: step.description || '',
      timeframe: step.timeframe || 'As needed',
      resources: Array.isArray(step.resources) ? step.resources.map((resource: any) => ({
        type: resource.type || 'link',
        title: resource.title || 'Resource',
        url: resource.url || undefined,
        description: resource.description || ''
      })) : [],
      jurisdictionSpecific: Boolean(step.jurisdictionSpecific)
    }));

    // Structure applicable laws
    const applicableLaws: LegalReference[] = Array.isArray(guidanceData.applicableLaws) 
      ? guidanceData.applicableLaws.map((law: any) => ({
          statute: law.statute || '',
          jurisdiction: law.jurisdiction || '',
          description: law.description || '',
          url: law.url || undefined
        }))
      : [];

    // Structure cultural considerations
    const culturalConsiderations: string[] = Array.isArray(guidanceData.culturalConsiderations)
      ? guidanceData.culturalConsiderations.filter((item: any) => typeof item === 'string')
      : [];

    // Structure next actions
    const nextActions: string[] = Array.isArray(guidanceData.nextActions)
      ? guidanceData.nextActions.filter((item: any) => typeof item === 'string')
      : [];

    // Validate confidence score
    const confidence = typeof guidanceData.confidence === 'number' 
      ? Math.max(0, Math.min(1, guidanceData.confidence))
      : 0.7;

    return {
      queryId,
      steps,
      applicableLaws,
      culturalConsiderations,
      nextActions,
      confidence,
      createdAt: new Date()
    };
  }

  /**
   * Generate jurisdiction-specific prompt enhancements
   */
  private getJurisdictionPromptEnhancement(jurisdictions: string[]): string {
    const jurisdictionGuidelines: Record<string, string> = {
      'United States': 'Consider federal and state law distinctions, constitutional rights, and common law principles.',
      'European Union': 'Consider EU directives, GDPR compliance, and member state variations.',
      'United Kingdom': 'Consider English, Scottish, Welsh, and Northern Irish law variations.',
      'Canada': 'Consider federal and provincial jurisdiction, Charter rights, and bijural system.',
      'Australia': 'Consider federal and state law, common law system, and indigenous law considerations.',
      'International': 'Consider treaty obligations, conflict of laws, and cross-border enforcement issues.'
    };

    let enhancement = '\nJurisdiction-Specific Guidelines:\n';
    
    for (const jurisdiction of jurisdictions) {
      const guideline = jurisdictionGuidelines[jurisdiction];
      if (guideline) {
        enhancement += `- ${jurisdiction}: ${guideline}\n`;
      }
    }

    return enhancement;
  }

  /**
   * Test the AI service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Respond with "OK" if you can process this request.'
          }
        ],
        max_tokens: 10
      });

      return response.choices[0]?.message?.content?.includes('OK') || false;
    } catch (error) {
      logger.error('AI service connection test failed', undefined, undefined, { error });
      return false;
    }
  }
}

// Export class for instantiation
// Note: Singleton instance should be created in the service layer