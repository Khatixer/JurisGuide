import { LegalCategory } from '../types';

export interface CulturalProfile {
  background: string;
  communicationStyle: 'direct' | 'indirect' | 'formal' | 'casual';
  decisionMaking: 'individual' | 'collective' | 'hierarchical';
  conflictResolution: 'confrontational' | 'mediation' | 'avoidance';
  timeOrientation: 'linear' | 'flexible' | 'relationship-based';
  authorityRespect: 'high' | 'medium' | 'low';
  familyInvolvement: 'high' | 'medium' | 'low';
}

export interface CulturalAdaptation {
  communicationAdjustments: string[];
  processModifications: string[];
  sensitivityWarnings: string[];
  recommendedApproach: string;
  culturalConsiderations: string[];
}

export interface CulturalContext {
  userBackground: string;
  legalCategory: LegalCategory;
  jurisdiction: string[];
  language: string;
  urgency: string;
}

export class CulturalSensitivityEngine {
  private static culturalProfiles: Record<string, CulturalProfile> = {
    'Hispanic/Latino': {
      background: 'Hispanic/Latino',
      communicationStyle: 'formal',
      decisionMaking: 'collective',
      conflictResolution: 'mediation',
      timeOrientation: 'relationship-based',
      authorityRespect: 'high',
      familyInvolvement: 'high'
    },
    'Asian': {
      background: 'Asian',
      communicationStyle: 'indirect',
      decisionMaking: 'hierarchical',
      conflictResolution: 'avoidance',
      timeOrientation: 'relationship-based',
      authorityRespect: 'high',
      familyInvolvement: 'high'
    },
    'African': {
      background: 'African',
      communicationStyle: 'indirect',
      decisionMaking: 'collective',
      conflictResolution: 'mediation',
      timeOrientation: 'relationship-based',
      authorityRespect: 'high',
      familyInvolvement: 'high'
    },
    'Middle Eastern': {
      background: 'Middle Eastern',
      communicationStyle: 'formal',
      decisionMaking: 'hierarchical',
      conflictResolution: 'mediation',
      timeOrientation: 'relationship-based',
      authorityRespect: 'high',
      familyInvolvement: 'high'
    },
    'European': {
      background: 'European',
      communicationStyle: 'direct',
      decisionMaking: 'individual',
      conflictResolution: 'confrontational',
      timeOrientation: 'linear',
      authorityRespect: 'medium',
      familyInvolvement: 'medium'
    },
    'American': {
      background: 'American',
      communicationStyle: 'direct',
      decisionMaking: 'individual',
      conflictResolution: 'confrontational',
      timeOrientation: 'linear',
      authorityRespect: 'low',
      familyInvolvement: 'low'
    },
    'Indigenous': {
      background: 'Indigenous',
      communicationStyle: 'indirect',
      decisionMaking: 'collective',
      conflictResolution: 'mediation',
      timeOrientation: 'relationship-based',
      authorityRespect: 'high',
      familyInvolvement: 'high'
    }
  };

  /**
   * Analyze cultural context and provide adaptation recommendations
   */
  static analyzeCulturalContext(context: CulturalContext): CulturalAdaptation {
    const profile = this.culturalProfiles[context.userBackground] || this.getDefaultProfile();
    
    const adaptation: CulturalAdaptation = {
      communicationAdjustments: this.getCommunicationAdjustments(profile, context),
      processModifications: this.getProcessModifications(profile, context),
      sensitivityWarnings: this.getSensitivityWarnings(profile, context),
      recommendedApproach: this.getRecommendedApproach(profile, context),
      culturalConsiderations: this.getCulturalConsiderations(profile, context)
    };

    return adaptation;
  }

  /**
   * Get communication style adjustments
   */
  private static getCommunicationAdjustments(profile: CulturalProfile, context: CulturalContext): string[] {
    const adjustments: string[] = [];

    switch (profile.communicationStyle) {
      case 'formal':
        adjustments.push('Use formal language and titles');
        adjustments.push('Avoid casual expressions or slang');
        adjustments.push('Show respect for authority and hierarchy');
        break;
      case 'indirect':
        adjustments.push('Use diplomatic language to avoid direct confrontation');
        adjustments.push('Allow time for reflection and consultation');
        adjustments.push('Frame negative information sensitively');
        break;
      case 'direct':
        adjustments.push('Provide clear, straightforward information');
        adjustments.push('Be explicit about expectations and deadlines');
        adjustments.push('Focus on facts and logical arguments');
        break;
      case 'casual':
        adjustments.push('Use accessible, everyday language');
        adjustments.push('Encourage questions and clarification');
        adjustments.push('Maintain friendly but professional tone');
        break;
    }

    // Language-specific adjustments
    if (context.language !== 'en') {
      adjustments.push('Provide translations of key legal terms');
      adjustments.push('Explain legal concepts in simple language');
      adjustments.push('Consider cultural differences in legal systems');
    }

    return adjustments;
  }

  /**
   * Get process modifications based on cultural preferences
   */
  private static getProcessModifications(profile: CulturalProfile, context: CulturalContext): string[] {
    const modifications: string[] = [];

    // Decision-making style modifications
    switch (profile.decisionMaking) {
      case 'collective':
        modifications.push('Allow time for family/community consultation');
        modifications.push('Provide information that can be shared with advisors');
        modifications.push('Respect group decision-making processes');
        break;
      case 'hierarchical':
        modifications.push('Identify and respect decision-making hierarchy');
        modifications.push('Provide information to appropriate authority figures');
        modifications.push('Allow for consultation with elders or leaders');
        break;
      case 'individual':
        modifications.push('Focus on individual rights and responsibilities');
        modifications.push('Provide tools for independent decision-making');
        modifications.push('Respect personal autonomy in choices');
        break;
    }

    // Time orientation modifications
    if (profile.timeOrientation === 'relationship-based') {
      modifications.push('Allow flexible scheduling for relationship priorities');
      modifications.push('Understand that relationship building may take precedence');
      modifications.push('Be patient with process-oriented approaches');
    }

    // Family involvement considerations
    if (profile.familyInvolvement === 'high') {
      modifications.push('Consider impact on extended family members');
      modifications.push('Provide guidance on family communication');
      modifications.push('Respect family privacy and honor concerns');
    }

    return modifications;
  }

  /**
   * Get cultural sensitivity warnings
   */
  private static getSensitivityWarnings(profile: CulturalProfile, context: CulturalContext): string[] {
    const warnings: string[] = [];

    // Conflict resolution style warnings
    if (profile.conflictResolution === 'avoidance') {
      warnings.push('Client may prefer to avoid direct confrontation');
      warnings.push('Consider mediation or alternative dispute resolution');
      warnings.push('Be sensitive to face-saving concerns');
    }

    // Authority respect warnings
    if (profile.authorityRespect === 'high') {
      warnings.push('Show appropriate respect for legal authorities');
      warnings.push('Explain the role and importance of legal procedures');
      warnings.push('Be mindful of power dynamics in legal settings');
    }

    // Category-specific warnings
    switch (context.legalCategory) {
      case 'family_law':
        if (profile.familyInvolvement === 'high') {
          warnings.push('Family law matters may involve extended family considerations');
          warnings.push('Cultural marriage and family customs may be relevant');
          warnings.push('Religious or traditional law may influence perspectives');
        }
        break;
      case 'immigration_law':
        warnings.push('Immigration status may affect family and community');
        warnings.push('Cultural identity and integration concerns may be present');
        warnings.push('Language barriers may complicate legal processes');
        break;
      case 'criminal_law':
        if (profile.authorityRespect === 'high') {
          warnings.push('Cultural attitudes toward law enforcement may vary');
          warnings.push('Community reputation and honor may be significant concerns');
          warnings.push('Family shame and social stigma may be factors');
        }
        break;
    }

    return warnings;
  }

  /**
   * Get recommended approach based on cultural profile
   */
  private static getRecommendedApproach(profile: CulturalProfile, context: CulturalContext): string {
    let approach = '';

    // Base approach on communication and decision-making styles
    if (profile.communicationStyle === 'indirect' && profile.decisionMaking === 'collective') {
      approach = 'Take a patient, consultative approach that allows for group discussion and consensus-building. Use diplomatic language and provide time for reflection.';
    } else if (profile.communicationStyle === 'direct' && profile.decisionMaking === 'individual') {
      approach = 'Provide clear, factual information and empower individual decision-making. Focus on practical steps and personal rights.';
    } else if (profile.communicationStyle === 'formal' && profile.authorityRespect === 'high') {
      approach = 'Maintain formal, respectful communication while clearly explaining legal authority and procedures. Show deference to cultural hierarchy.';
    } else {
      approach = 'Adapt communication style to be respectful and culturally appropriate while ensuring clear understanding of legal processes.';
    }

    // Add urgency considerations
    if (context.urgency === 'critical' && profile.timeOrientation === 'relationship-based') {
      approach += ' Balance urgency with cultural time preferences by explaining the critical nature while respecting relationship priorities.';
    }

    return approach;
  }

  /**
   * Get specific cultural considerations
   */
  private static getCulturalConsiderations(profile: CulturalProfile, context: CulturalContext): string[] {
    const considerations: string[] = [];

    // General cultural considerations
    considerations.push(`Communication style: ${profile.communicationStyle}`);
    considerations.push(`Decision-making approach: ${profile.decisionMaking}`);
    considerations.push(`Conflict resolution preference: ${profile.conflictResolution}`);

    // Jurisdiction-specific considerations
    for (const jurisdiction of context.jurisdiction) {
      if (jurisdiction === 'United States' && profile.background !== 'American') {
        considerations.push('U.S. legal system may differ significantly from home country');
        considerations.push('Constitutional rights and common law principles may be unfamiliar');
      } else if (jurisdiction === 'European Union' && !profile.background.includes('European')) {
        considerations.push('EU legal framework emphasizes collective rights and privacy');
        considerations.push('Multi-jurisdictional complexity may require cultural adaptation');
      }
    }

    // Language considerations
    if (context.language !== 'en') {
      considerations.push('Legal terminology may not translate directly');
      considerations.push('Cultural concepts of law and justice may differ');
      considerations.push('Interpretation services may be needed for complex matters');
    }

    return considerations;
  }

  /**
   * Get default cultural profile for unknown backgrounds
   */
  private static getDefaultProfile(): CulturalProfile {
    return {
      background: 'Unknown',
      communicationStyle: 'formal',
      decisionMaking: 'individual',
      conflictResolution: 'mediation',
      timeOrientation: 'linear',
      authorityRespect: 'medium',
      familyInvolvement: 'medium'
    };
  }

  /**
   * Adapt legal guidance based on cultural sensitivity
   */
  static adaptGuidanceForCulture(
    originalGuidance: string,
    culturalAdaptation: CulturalAdaptation
  ): string {
    let adaptedGuidance = originalGuidance;

    // Apply communication adjustments
    if (culturalAdaptation.communicationAdjustments.includes('Use formal language and titles')) {
      adaptedGuidance = adaptedGuidance.replace(/\byou\b/g, 'you (or your family)');
      adaptedGuidance = adaptedGuidance.replace(/\bcontact\b/g, 'respectfully contact');
    }

    if (culturalAdaptation.communicationAdjustments.includes('Use diplomatic language to avoid direct confrontation')) {
      adaptedGuidance = adaptedGuidance.replace(/\bmust\b/g, 'should consider');
      adaptedGuidance = adaptedGuidance.replace(/\brequired\b/g, 'recommended');
    }

    // Add cultural considerations as a prefix
    const culturalPrefix = `Cultural Considerations:\n${culturalAdaptation.culturalConsiderations.map(c => `• ${c}`).join('\n')}\n\nRecommended Approach: ${culturalAdaptation.recommendedApproach}\n\n`;

    return culturalPrefix + adaptedGuidance;
  }

  /**
   * Validate cultural sensitivity of guidance content
   */
  static validateCulturalSensitivity(
    guidance: string,
    culturalContext: CulturalContext
  ): {
    isAppropriate: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const profile = this.culturalProfiles[culturalContext.userBackground] || this.getDefaultProfile();

    // Check for potentially insensitive language
    const insensitiveTerms = [
      'you must', 'required immediately', 'no choice', 'mandatory',
      'ignore family', 'individual decision only'
    ];

    for (const term of insensitiveTerms) {
      if (guidance.toLowerCase().includes(term.toLowerCase())) {
        issues.push(`Potentially insensitive language: "${term}"`);
        
        if (profile.decisionMaking === 'collective') {
          suggestions.push('Consider family/community consultation time');
        }
        if (profile.communicationStyle === 'indirect') {
          suggestions.push('Use more diplomatic language');
        }
      }
    }

    // Check for cultural appropriateness
    if (profile.authorityRespect === 'high' && !guidance.includes('respect')) {
      suggestions.push('Add language showing respect for legal authorities');
    }

    if (profile.familyInvolvement === 'high' && !guidance.includes('family')) {
      suggestions.push('Consider mentioning family consultation or impact');
    }

    const isAppropriate = issues.length === 0;

    return {
      isAppropriate,
      issues,
      suggestions
    };
  }
}