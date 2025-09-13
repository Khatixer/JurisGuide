import { LegalGuidance, GuidanceStep } from '../types';
import { CulturalSensitivityEngine, CulturalContext, CulturalAdaptation } from './cultural-sensitivity';

export interface AdaptedGuidance extends LegalGuidance {
  culturalAdaptation: CulturalAdaptation;
  originalGuidance: LegalGuidance;
  adaptationMetadata: {
    adaptationsApplied: string[];
    culturalProfile: string;
    adaptationConfidence: number;
  };
}

export class CulturalAdaptationEngine {
  /**
   * Apply cultural adaptations to legal guidance
   */
  static adaptLegalGuidance(
    originalGuidance: LegalGuidance,
    culturalContext: CulturalContext
  ): AdaptedGuidance {
    // Analyze cultural context
    const culturalAdaptation = CulturalSensitivityEngine.analyzeCulturalContext(culturalContext);
    
    // Adapt guidance steps
    const adaptedSteps = this.adaptGuidanceSteps(originalGuidance.steps, culturalAdaptation);
    
    // Enhance cultural considerations
    const enhancedCulturalConsiderations = this.enhanceCulturalConsiderations(
      originalGuidance.culturalConsiderations,
      culturalAdaptation
    );
    
    // Adapt next actions
    const adaptedNextActions = this.adaptNextActions(
      originalGuidance.nextActions,
      culturalAdaptation
    );

    // Track adaptations applied
    const adaptationsApplied = this.getAdaptationsApplied(culturalAdaptation);
    
    // Calculate adaptation confidence
    const adaptationConfidence = this.calculateAdaptationConfidence(
      culturalContext,
      culturalAdaptation
    );

    const adaptedGuidance: AdaptedGuidance = {
      ...originalGuidance,
      steps: adaptedSteps,
      culturalConsiderations: enhancedCulturalConsiderations,
      nextActions: adaptedNextActions,
      culturalAdaptation,
      originalGuidance,
      adaptationMetadata: {
        adaptationsApplied,
        culturalProfile: culturalContext.userBackground,
        adaptationConfidence
      }
    };

    return adaptedGuidance;
  }

  /**
   * Adapt individual guidance steps for cultural sensitivity
   */
  private static adaptGuidanceSteps(
    originalSteps: GuidanceStep[],
    culturalAdaptation: CulturalAdaptation
  ): GuidanceStep[] {
    return originalSteps.map(step => {
      let adaptedStep = { ...step };

      // Adapt step description based on communication style
      adaptedStep.description = this.adaptStepDescription(
        step.description,
        culturalAdaptation
      );

      // Adjust timeframe based on cultural time orientation
      adaptedStep.timeframe = this.adaptTimeframe(
        step.timeframe,
        culturalAdaptation
      );

      // Apply language transformations to timeframe as well
      for (const adjustment of culturalAdaptation.communicationAdjustments) {
        if (adjustment.includes('Use formal language and titles')) {
          adaptedStep.timeframe = this.makeFormalLanguage(adaptedStep.timeframe);
        } else if (adjustment.includes('Use accessible, everyday language')) {
          adaptedStep.timeframe = this.makeAccessibleLanguage(adaptedStep.timeframe);
        }
      }

      // Add cultural resources if needed
      adaptedStep.resources = this.addCulturalResources(
        step.resources,
        culturalAdaptation
      );

      return adaptedStep;
    });
  }

  /**
   * Adapt step description for cultural communication style
   */
  private static adaptStepDescription(
    originalDescription: string,
    culturalAdaptation: CulturalAdaptation
  ): string {
    let adaptedDescription = originalDescription;

    // Apply communication adjustments
    for (const adjustment of culturalAdaptation.communicationAdjustments) {
      if (adjustment.includes('Use formal language and titles')) {
        adaptedDescription = this.makeFormalLanguage(adaptedDescription);
      } else if (adjustment.includes('Use diplomatic language to avoid direct confrontation')) {
        adaptedDescription = this.makeDiplomaticLanguage(adaptedDescription);
      } else if (adjustment.includes('Use accessible, everyday language')) {
        adaptedDescription = this.makeAccessibleLanguage(adaptedDescription);
      }
    }

    // Apply process modifications
    for (const modification of culturalAdaptation.processModifications) {
      if (modification.includes('Allow time for family/community consultation')) {
        adaptedDescription += ' Consider discussing this step with family members or trusted advisors before proceeding.';
      } else if (modification.includes('Allow flexible scheduling for relationship priorities')) {
        adaptedDescription = adaptedDescription.replace(
          /immediately|right away|as soon as possible/gi,
          'when circumstances allow'
        );
      }
    }

    return adaptedDescription;
  }

  /**
   * Make language more formal
   */
  private static makeFormalLanguage(text: string): string {
    return text
      .replace(/\bcan't\b/g, 'cannot')
      .replace(/\bwon't\b/g, 'will not')
      .replace(/\bdon't\b/g, 'do not')
      .replace(/\byou should\b/g, 'it is recommended that you')
      .replace(/\bcontact\b/g, 'formally contact')
      .replace(/\bask\b/g, 'respectfully inquire');
  }

  /**
   * Make language more diplomatic
   */
  private static makeDiplomaticLanguage(text: string): string {
    return text
      .replace(/\bmust\b/g, 'should consider')
      .replace(/\brequired\b/g, 'recommended')
      .replace(/\bneed to\b/g, 'may wish to')
      .replace(/\bhave to\b/g, 'might consider')
      .replace(/\bdemand\b/g, 'respectfully request')
      .replace(/\brefuse\b/g, 'politely decline');
  }

  /**
   * Make language more accessible
   */
  private static makeAccessibleLanguage(text: string): string {
    return text
      .replace(/\bcommence\b/g, 'start')
      .replace(/\bterminate\b/g, 'end')
      .replace(/\butilize\b/g, 'use')
      .replace(/\bfacilitate\b/g, 'help with')
      .replace(/\bsubsequent\b/g, 'next')
      .replace(/\bprior to\b/g, 'before');
  }

  /**
   * Adapt timeframe based on cultural time orientation
   */
  private static adaptTimeframe(
    originalTimeframe: string,
    culturalAdaptation: CulturalAdaptation
  ): string {
    // If culture values relationship-based time, add flexibility
    if (culturalAdaptation.processModifications.some(mod => 
      mod.includes('Allow flexible scheduling for relationship priorities') || 
      mod.includes('relationship building may take precedence')
    )) {
      if (originalTimeframe.toLowerCase().includes('immediately')) {
        return originalTimeframe.replace(/immediately/gi, 'when family/personal circumstances allow');
      } else if (originalTimeframe.toLowerCase().includes('within')) {
        return originalTimeframe + ' (allowing time for consultation)';
      }
    }

    return originalTimeframe;
  }

  /**
   * Add cultural resources to guidance steps
   */
  private static addCulturalResources(
    originalResources: any[],
    culturalAdaptation: CulturalAdaptation
  ): any[] {
    const culturalResources = [...originalResources];

    // Add interpretation services if needed
    if (culturalAdaptation.communicationAdjustments.some(adj => 
      adj.includes('translations') || adj.includes('interpretation')
    )) {
      culturalResources.push({
        type: 'contact',
        title: 'Language Interpretation Services',
        description: 'Professional legal interpreters for your language',
        url: 'https://www.courts.gov/interpretation-services'
      });
    }

    // Add cultural legal aid resources
    if (culturalAdaptation.culturalConsiderations.length > 0) {
      culturalResources.push({
        type: 'link',
        title: 'Cultural Legal Aid Resources',
        description: 'Legal assistance organizations serving your community',
        url: 'https://www.legalaid.org/cultural-services'
      });
    }

    return culturalResources;
  }

  /**
   * Enhance cultural considerations
   */
  private static enhanceCulturalConsiderations(
    originalConsiderations: string[],
    culturalAdaptation: CulturalAdaptation
  ): string[] {
    const enhanced = [...originalConsiderations];

    // Add adaptation-specific considerations
    enhanced.push(...culturalAdaptation.culturalConsiderations);

    // Add sensitivity warnings as considerations
    for (const warning of culturalAdaptation.sensitivityWarnings) {
      enhanced.push(`Cultural sensitivity: ${warning}`);
    }

    // Remove duplicates
    return [...new Set(enhanced)];
  }

  /**
   * Adapt next actions for cultural context
   */
  private static adaptNextActions(
    originalActions: string[],
    culturalAdaptation: CulturalAdaptation
  ): string[] {
    const adaptedActions = originalActions.map(action => {
      let adaptedAction = action;

      // Add consultation recommendations for collective decision-making cultures
      if (culturalAdaptation.processModifications.some(mod => 
        mod.includes('Allow time for family/community consultation')
      )) {
        if (action.toLowerCase().includes('decide') || action.toLowerCase().includes('choose')) {
          adaptedAction += ' (after consulting with family/advisors)';
        }
      }

      // Add respect for hierarchy
      if (culturalAdaptation.processModifications.some(mod => 
        mod.includes('Identify and respect decision-making hierarchy')
      )) {
        if (action.toLowerCase().includes('contact') || action.toLowerCase().includes('speak')) {
          adaptedAction = adaptedAction.replace('contact', 'respectfully contact through appropriate channels');
        }
      }

      return adaptedAction;
    });

    // Add cultural-specific next actions
    if (culturalAdaptation.recommendedApproach.includes('consultative')) {
      adaptedActions.push('Schedule time for family/community consultation');
    }

    if (culturalAdaptation.processModifications.some(mod => 
      mod.includes('Allow time for family/community consultation')
    )) {
      adaptedActions.push('Consult with family/advisors before proceeding');
    }

    if (culturalAdaptation.communicationAdjustments.some(adj => 
      adj.includes('interpretation')
    )) {
      adaptedActions.push('Arrange for professional interpretation services if needed');
    }

    return adaptedActions;
  }

  /**
   * Get list of adaptations that were applied
   */
  private static getAdaptationsApplied(culturalAdaptation: CulturalAdaptation): string[] {
    const adaptations: string[] = [];

    if (culturalAdaptation.communicationAdjustments.length > 0) {
      adaptations.push('Communication style adjustments');
    }

    if (culturalAdaptation.processModifications.length > 0) {
      adaptations.push('Process modifications for cultural preferences');
    }

    if (culturalAdaptation.sensitivityWarnings.length > 0) {
      adaptations.push('Cultural sensitivity warnings added');
    }

    if (culturalAdaptation.culturalConsiderations.length > 0) {
      adaptations.push('Cultural considerations enhanced');
    }

    return adaptations;
  }

  /**
   * Calculate confidence in cultural adaptation
   */
  private static calculateAdaptationConfidence(
    culturalContext: CulturalContext,
    culturalAdaptation: CulturalAdaptation
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on known cultural profile
    const knownCultures = [
      'Hispanic/Latino', 'Asian', 'African', 'Middle Eastern', 
      'European', 'American', 'Indigenous'
    ];
    
    if (knownCultures.includes(culturalContext.userBackground)) {
      confidence += 0.3;
    }

    // Increase confidence based on number of adaptations applied
    const totalAdaptations = 
      culturalAdaptation.communicationAdjustments.length +
      culturalAdaptation.processModifications.length +
      culturalAdaptation.culturalConsiderations.length;

    confidence += Math.min(0.2, totalAdaptations * 0.02);

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate cultural adaptation summary
   */
  static generateAdaptationSummary(adaptedGuidance: AdaptedGuidance): string {
    const { culturalAdaptation, adaptationMetadata } = adaptedGuidance;

    let summary = `Cultural Adaptation Summary for ${adaptationMetadata.culturalProfile} Background:\n\n`;

    summary += `Recommended Approach: ${culturalAdaptation.recommendedApproach}\n\n`;

    if (culturalAdaptation.communicationAdjustments.length > 0) {
      summary += `Communication Adjustments:\n`;
      culturalAdaptation.communicationAdjustments.forEach(adj => {
        summary += `• ${adj}\n`;
      });
      summary += '\n';
    }

    if (culturalAdaptation.processModifications.length > 0) {
      summary += `Process Modifications:\n`;
      culturalAdaptation.processModifications.forEach(mod => {
        summary += `• ${mod}\n`;
      });
      summary += '\n';
    }

    if (culturalAdaptation.sensitivityWarnings.length > 0) {
      summary += `Cultural Sensitivity Considerations:\n`;
      culturalAdaptation.sensitivityWarnings.forEach(warning => {
        summary += `⚠️ ${warning}\n`;
      });
      summary += '\n';
    }

    summary += `Adaptation Confidence: ${Math.round(adaptationMetadata.adaptationConfidence * 100)}%\n`;
    summary += `Adaptations Applied: ${adaptationMetadata.adaptationsApplied.join(', ')}`;

    return summary;
  }
}