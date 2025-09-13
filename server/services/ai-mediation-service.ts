import { Pool } from 'pg';
import { MediationService } from './mediation-service';
import { AIMediationEngine } from '../utils/ai-mediation-engine';
import { MediationCase, DisputeDetails, Party } from '../types';
import { logger } from '../utils/logger';

interface MediationAnalysisResult {
  caseId: string;
  analysis: any;
  recommendation: any;
  viabilityAssessment: any;
  generatedAt: Date;
}

export class AIMediationService {
  private mediationService: MediationService;
  private aiEngine: AIMediationEngine;

  constructor(private db: Pool) {
    this.mediationService = new MediationService(db);
    this.aiEngine = new AIMediationEngine();
  }

  async createIntelligentMediationCase(
    parties: Party[],
    dispute: DisputeDetails,
    language: string = 'en'
  ): Promise<{ case: MediationCase; analysis: MediationAnalysisResult }> {
    try {
      // First assess if mediation is viable
      const viabilityAssessment = await this.aiEngine.assessMediationViability(dispute);
      
      if (!viabilityAssessment.viable) {
        logger.warn(`Mediation not viable for dispute: ${viabilityAssessment.reasons.join(', ')}`);
        throw new Error(`Mediation not recommended: ${viabilityAssessment.reasons.join(', ')}`);
      }

      // Create AI mediator configuration
      const mediatorConfig = {
        model: 'gpt-4',
        configuration: {
          culturalSensitivity: true,
          jurisdictionAware: true,
          language: language
        }
      };

      // Create the mediation case
      const mediationCase = await this.mediationService.createMediationCase(
        parties,
        dispute,
        mediatorConfig
      );

      // Perform AI analysis
      const analysis = await this.aiEngine.analyzeDispute(dispute);
      const recommendation = await this.aiEngine.generateMediationRecommendation(
        mediationCase,
        analysis
      );

      const analysisResult: MediationAnalysisResult = {
        caseId: mediationCase.id,
        analysis,
        recommendation,
        viabilityAssessment,
        generatedAt: new Date()
      };

      // Add AI analysis as initial event
      await this.mediationService.addMediationEvent(mediationCase.id, {
        type: 'message',
        content: `AI Analysis Complete: ${recommendation.summary}`,
        party: 'ai_mediator',
        metadata: {
          analysis: analysisResult,
          type: 'ai_analysis'
        }
      });

      // Add initial recommendations as events
      for (const solution of recommendation.proposedSolutions) {
        await this.mediationService.addMediationEvent(mediationCase.id, {
          type: 'proposal',
          content: solution,
          party: 'ai_mediator',
          metadata: {
            type: 'ai_recommendation',
            category: 'solution'
          }
        });
      }

      logger.info(`Intelligent mediation case created: ${mediationCase.id}`);
      return { case: mediationCase, analysis: analysisResult };

    } catch (error) {
      logger.error('Error creating intelligent mediation case:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async generateAIResponse(
    caseId: string,
    userMessage: string,
    userCulture: string
  ): Promise<string> {
    try {
      const mediationCase = await this.mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        throw new Error('Mediation case not found');
      }

      // Get other parties' cultural backgrounds for respectful communication
      const otherParties = mediationCase.parties.filter(p => 
        p.contactInfo.email !== userMessage // Assuming userMessage contains sender info
      );

      let response = userMessage;

      // Generate respectful communication for each other party
      for (const party of otherParties) {
        // For now, we'll use a default culture if not specified
        const receiverCulture = 'international'; // This should come from user profiles
        
        response = await this.aiEngine.generateRespectfulCommunication(
          response,
          userCulture,
          receiverCulture,
          'formal'
        );
      }

      // Add the AI-enhanced message as an event
      await this.mediationService.addMediationEvent(caseId, {
        type: 'message',
        content: response,
        party: 'ai_mediator',
        metadata: {
          type: 'ai_enhanced_communication',
          originalMessage: userMessage,
          culturalAdaptation: true
        }
      });

      logger.info(`AI response generated for case ${caseId}`);
      return response;

    } catch (error) {
      logger.error('Error generating AI response:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate AI response');
    }
  }

  async updateMediationWithAIInsights(caseId: string): Promise<MediationAnalysisResult> {
    try {
      const mediationCase = await this.mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        throw new Error('Mediation case not found');
      }

      // Re-analyze the dispute with current timeline
      const analysis = await this.aiEngine.analyzeDispute(mediationCase.dispute);
      const recommendation = await this.aiEngine.generateMediationRecommendation(
        mediationCase,
        analysis
      );

      const analysisResult: MediationAnalysisResult = {
        caseId,
        analysis,
        recommendation,
        viabilityAssessment: await this.aiEngine.assessMediationViability(mediationCase.dispute),
        generatedAt: new Date()
      };

      // Add updated insights as event
      await this.mediationService.addMediationEvent(caseId, {
        type: 'message',
        content: `Updated AI Analysis: ${recommendation.summary}`,
        party: 'ai_mediator',
        metadata: {
          analysis: analysisResult,
          type: 'ai_update'
        }
      });

      logger.info(`AI insights updated for case ${caseId}`);
      return analysisResult;

    } catch (error) {
      logger.error('Error updating mediation with AI insights:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to update AI insights');
    }
  }

  async generateComprehensiveMediationReport(caseId: string): Promise<string> {
    try {
      const mediationCase = await this.mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        throw new Error('Mediation case not found');
      }

      // Generate AI-powered comprehensive summary
      const aiSummary = await this.aiEngine.generateMediationSummary(
        mediationCase,
        true // Include recommendations
      );

      // Add report generation event
      await this.mediationService.addMediationEvent(caseId, {
        type: 'document',
        content: 'Comprehensive mediation report generated',
        party: 'ai_mediator',
        metadata: {
          type: 'report_generation',
          reportLength: aiSummary.length
        }
      });

      logger.info(`Comprehensive report generated for case ${caseId}`);
      return aiSummary;

    } catch (error) {
      logger.error('Error generating comprehensive report:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate comprehensive report');
    }
  }

  async facilitatePartyAgreement(
    caseId: string,
    proposedAgreement: string,
    proposingParty: string
  ): Promise<{
    enhancedAgreement: string;
    culturalConsiderations: string[];
    legalConsiderations: string[];
  }> {
    try {
      const mediationCase = await this.mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        throw new Error('Mediation case not found');
      }

      // Analyze the proposed agreement
      const analysis = await this.aiEngine.analyzeDispute({
        ...mediationCase.dispute,
        proposedResolution: proposedAgreement
      });

      // Generate enhanced agreement with AI recommendations
      const recommendation = await this.aiEngine.generateMediationRecommendation(
        mediationCase,
        analysis
      );

      // Create enhanced agreement text
      const enhancedAgreement = `
PROPOSED MEDIATION AGREEMENT

Original Proposal by ${proposingParty}:
${proposedAgreement}

AI-Enhanced Considerations:
${recommendation.proposedSolutions.join('\n')}

Cultural Considerations:
${recommendation.culturalConsiderations.join('\n')}

Jurisdiction-Specific Notes:
${recommendation.jurisdictionSpecificAdvice.join('\n')}

Next Steps:
${recommendation.nextSteps.join('\n')}
      `.trim();

      // Add agreement proposal event
      await this.mediationService.addMediationEvent(caseId, {
        type: 'agreement',
        content: enhancedAgreement,
        party: 'ai_mediator',
        metadata: {
          type: 'enhanced_agreement',
          originalProposal: proposedAgreement,
          proposingParty
        }
      });

      logger.info(`Agreement facilitated for case ${caseId}`);
      return {
        enhancedAgreement,
        culturalConsiderations: recommendation.culturalConsiderations,
        legalConsiderations: recommendation.jurisdictionSpecificAdvice
      };

    } catch (error) {
      logger.error('Error facilitating party agreement:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to facilitate agreement');
    }
  }

  async detectEscalationRisk(caseId: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  }> {
    try {
      const mediationCase = await this.mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        throw new Error('Mediation case not found');
      }

      // Analyze recent timeline for escalation indicators
      const recentEvents = mediationCase.timeline.slice(-10);
      const hostileKeywords = ['angry', 'frustrated', 'unfair', 'refuse', 'demand', 'threat'];
      
      let hostileCount = 0;
      let rapidExchangeCount = 0;
      
      // Simple escalation detection based on content and frequency
      recentEvents.forEach((event, index) => {
        if (hostileKeywords.some(keyword => 
          event.content.toLowerCase().includes(keyword)
        )) {
          hostileCount++;
        }
        
        if (index > 0) {
          const timeDiff = event.timestamp.getTime() - recentEvents[index - 1].timestamp.getTime();
          if (timeDiff < 300000) { // Less than 5 minutes between messages
            rapidExchangeCount++;
          }
        }
      });

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      const factors: string[] = [];
      const recommendations: string[] = [];

      if (hostileCount > 3 || rapidExchangeCount > 5) {
        riskLevel = 'high';
        factors.push('High frequency of hostile language detected');
        factors.push('Rapid message exchanges indicating tension');
        recommendations.push('Consider introducing cooling-off period');
        recommendations.push('Suggest professional mediator intervention');
      } else if (hostileCount > 1 || rapidExchangeCount > 2) {
        riskLevel = 'medium';
        factors.push('Some hostile language detected');
        factors.push('Increased communication frequency');
        recommendations.push('Encourage respectful communication');
        recommendations.push('Focus on common interests');
      } else {
        recommendations.push('Continue current mediation approach');
        recommendations.push('Monitor for any changes in tone');
      }

      // Add escalation assessment event
      await this.mediationService.addMediationEvent(caseId, {
        type: 'message',
        content: `Escalation Risk Assessment: ${riskLevel} risk detected`,
        party: 'ai_mediator',
        metadata: {
          type: 'escalation_assessment',
          riskLevel,
          factors,
          recommendations
        }
      });

      logger.info(`Escalation risk assessed for case ${caseId}: ${riskLevel}`);
      return { riskLevel, factors, recommendations };

    } catch (error) {
      logger.error('Error detecting escalation risk:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to detect escalation risk');
    }
  }
}