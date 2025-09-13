import OpenAI from 'openai';
import { MediationCase, DisputeDetails, Party, LegalCategory } from '../types';
import { logger } from './logger';

interface MediationRecommendation {
  summary: string;
  keyIssues: string[];
  proposedSolutions: string[];
  culturalConsiderations: string[];
  jurisdictionSpecificAdvice: string[];
  nextSteps: string[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
}

interface DisputeAnalysis {
  category: LegalCategory;
  complexity: 'simple' | 'moderate' | 'complex';
  emotionalTone: 'neutral' | 'tense' | 'hostile';
  keyFactors: string[];
  culturalFactors: string[];
  legalIssues: string[];
}

export class AIMediationEngine {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeDispute(dispute: DisputeDetails): Promise<DisputeAnalysis> {
    try {
      const prompt = this.buildDisputeAnalysisPrompt(dispute);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert legal mediator and dispute analyst. Analyze the provided dispute and return a structured analysis in JSON format. Be objective, culturally sensitive, and jurisdiction-aware.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI service');
      }

      const analysis = JSON.parse(response) as DisputeAnalysis;
      
      logger.info('Dispute analysis completed successfully');
      return analysis;

    } catch (error) {
      logger.error('Error analyzing dispute:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to analyze dispute');
    }
  }

  async generateMediationRecommendation(
    mediationCase: MediationCase,
    analysis: DisputeAnalysis
  ): Promise<MediationRecommendation> {
    try {
      const prompt = this.buildMediationRecommendationPrompt(mediationCase, analysis);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert AI mediator specializing in cross-cultural, multi-jurisdictional dispute resolution. Generate comprehensive mediation recommendations that are culturally sensitive, legally sound, and practically actionable. Return your response in JSON format.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1500
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI service');
      }

      const recommendation = JSON.parse(response) as MediationRecommendation;
      
      logger.info(`Mediation recommendation generated for case ${mediationCase.id}`);
      return recommendation;

    } catch (error) {
      logger.error('Error generating mediation recommendation:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate mediation recommendation');
    }
  }

  async generateRespectfulCommunication(
    message: string,
    senderCulture: string,
    receiverCulture: string,
    context: 'formal' | 'informal' = 'formal'
  ): Promise<string> {
    try {
      const prompt = `
Please rewrite the following message to be more respectful and culturally appropriate for cross-cultural mediation:

Original message: "${message}"
Sender's cultural background: ${senderCulture}
Receiver's cultural background: ${receiverCulture}
Communication context: ${context}

Guidelines:
- Maintain the core meaning and intent
- Use respectful, non-confrontational language
- Consider cultural communication styles
- Avoid inflammatory or accusatory language
- Focus on facts and solutions rather than blame
- Use "I" statements where appropriate

Return only the rewritten message, without explanations.
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in cross-cultural communication and conflict resolution. Help rewrite messages to be more respectful and culturally appropriate.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI service');
      }

      logger.info('Respectful communication generated successfully');
      return response.trim();

    } catch (error) {
      logger.error('Error generating respectful communication:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate respectful communication');
    }
  }

  async generateMediationSummary(
    mediationCase: MediationCase,
    includeRecommendations: boolean = true
  ): Promise<string> {
    try {
      const prompt = this.buildMediationSummaryPrompt(mediationCase, includeRecommendations);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert legal mediator creating neutral, comprehensive mediation summaries. Be objective, factual, and culturally sensitive. Ensure the summary is legally appropriate for the specified jurisdictions.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1200
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI service');
      }

      logger.info(`Mediation summary generated for case ${mediationCase.id}`);
      return response;

    } catch (error) {
      logger.error('Error generating mediation summary:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate mediation summary');
    }
  }

  async assessMediationViability(dispute: DisputeDetails): Promise<{
    viable: boolean;
    confidence: number;
    reasons: string[];
    alternatives?: string[];
  }> {
    try {
      const prompt = `
Assess whether the following dispute is suitable for AI-assisted mediation:

Dispute Category: ${dispute.category}
Summary: ${dispute.summary}
Jurisdictions: ${dispute.jurisdiction.join(', ')}
Cultural Factors: ${dispute.culturalFactors.join(', ')}

Consider:
- Legal complexity
- Emotional intensity
- Cultural sensitivity requirements
- Jurisdiction compatibility
- Likelihood of successful mediation

Return assessment in JSON format with:
{
  "viable": boolean,
  "confidence": number (0-1),
  "reasons": ["reason1", "reason2"],
  "alternatives": ["alternative1", "alternative2"] (if not viable)
}
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in dispute resolution and mediation assessment. Provide objective, practical assessments of mediation viability.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 600
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI service');
      }

      const assessment = JSON.parse(response);
      
      logger.info('Mediation viability assessment completed');
      return assessment;

    } catch (error) {
      logger.error('Error assessing mediation viability:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to assess mediation viability');
    }
  }

  private buildDisputeAnalysisPrompt(dispute: DisputeDetails): string {
    return `
Analyze the following legal dispute:

Category: ${dispute.category}
Summary: ${dispute.summary}
Jurisdictions: ${dispute.jurisdiction.join(', ')}
Cultural Factors: ${dispute.culturalFactors.join(', ')}
${dispute.proposedResolution ? `Proposed Resolution: ${dispute.proposedResolution}` : ''}

Provide analysis in this JSON format:
{
  "category": "${dispute.category}",
  "complexity": "simple|moderate|complex",
  "emotionalTone": "neutral|tense|hostile",
  "keyFactors": ["factor1", "factor2"],
  "culturalFactors": ["cultural_factor1", "cultural_factor2"],
  "legalIssues": ["issue1", "issue2"]
}
    `;
  }

  private buildMediationRecommendationPrompt(
    mediationCase: MediationCase,
    analysis: DisputeAnalysis
  ): string {
    return `
Generate mediation recommendations for this case:

Case ID: ${mediationCase.id}
Status: ${mediationCase.status}
Parties: ${mediationCase.parties.map(p => `${p.role} (${p.contactInfo.email})`).join(', ')}

Dispute Analysis:
- Category: ${analysis.category}
- Complexity: ${analysis.complexity}
- Emotional Tone: ${analysis.emotionalTone}
- Key Factors: ${analysis.keyFactors.join(', ')}
- Cultural Factors: ${analysis.culturalFactors.join(', ')}
- Legal Issues: ${analysis.legalIssues.join(', ')}

Dispute Details:
- Summary: ${mediationCase.dispute.summary}
- Jurisdictions: ${mediationCase.dispute.jurisdiction.join(', ')}
- Cultural Considerations: ${mediationCase.dispute.culturalFactors.join(', ')}

Recent Timeline Events: ${mediationCase.timeline.slice(-3).map(e => 
  `${e.type}: ${e.content} (by ${e.party})`
).join('; ')}

Provide recommendations in this JSON format:
{
  "summary": "Brief overview of the situation and recommended approach",
  "keyIssues": ["issue1", "issue2"],
  "proposedSolutions": ["solution1", "solution2"],
  "culturalConsiderations": ["consideration1", "consideration2"],
  "jurisdictionSpecificAdvice": ["advice1", "advice2"],
  "nextSteps": ["step1", "step2"],
  "riskAssessment": {
    "level": "low|medium|high",
    "factors": ["factor1", "factor2"]
  }
}
    `;
  }

  private buildMediationSummaryPrompt(
    mediationCase: MediationCase,
    includeRecommendations: boolean
  ): string {
    return `
Create a comprehensive mediation summary for this case:

Case Information:
- ID: ${mediationCase.id}
- Status: ${mediationCase.status}
- Created: ${mediationCase.createdAt.toISOString()}
- Parties: ${mediationCase.parties.map(p => 
    `${p.role}: ${p.contactInfo.email}`
  ).join(', ')}

Dispute Details:
- Category: ${mediationCase.dispute.category}
- Summary: ${mediationCase.dispute.summary}
- Jurisdictions: ${mediationCase.dispute.jurisdiction.join(', ')}
- Cultural Factors: ${mediationCase.dispute.culturalFactors.join(', ')}
${mediationCase.dispute.proposedResolution ? 
  `- Proposed Resolution: ${mediationCase.dispute.proposedResolution}` : ''}

Timeline Events:
${mediationCase.timeline.map(event => 
  `- ${event.timestamp.toISOString()}: ${event.type} by ${event.party}: ${event.content}`
).join('\n')}

Documents: ${mediationCase.documents.length} document(s) attached

Requirements:
- Create a neutral, factual summary
- Highlight key developments and agreements
- Note any cultural considerations
- Include jurisdiction-specific observations
${includeRecommendations ? '- Provide next step recommendations' : ''}
- Maintain professional, respectful tone
- Ensure legal appropriateness for all jurisdictions

Format as a professional mediation report.
    `;
  }
}