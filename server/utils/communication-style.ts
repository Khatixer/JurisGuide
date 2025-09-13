import { LegalCategory } from '../types';

export interface CommunicationStyle {
  name: string;
  tone: 'formal' | 'casual' | 'diplomatic' | 'direct';
  vocabulary: 'simple' | 'technical' | 'mixed';
  structure: 'linear' | 'circular' | 'hierarchical';
  culturalMarkers: string[];
}

export interface CommunicationContext {
  culturalBackground: string;
  legalCategory: LegalCategory;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  language: string;
  userPreference: 'formal' | 'casual';
  jurisdiction: string[];
}

export interface StyleAdaptation {
  selectedStyle: CommunicationStyle;
  adaptationRules: string[];
  languagePatterns: Record<string, string>;
  culturalNuances: string[];
  examples: {
    before: string;
    after: string;
    explanation: string;
  }[];
}

export class CommunicationStyleSelector {
  private static communicationStyles: Record<string, CommunicationStyle> = {
    'formal_respectful': {
      name: 'Formal Respectful',
      tone: 'formal',
      vocabulary: 'mixed',
      structure: 'hierarchical',
      culturalMarkers: ['respect for authority', 'hierarchical communication', 'formal titles']
    },
    'diplomatic_indirect': {
      name: 'Diplomatic Indirect',
      tone: 'diplomatic',
      vocabulary: 'simple',
      structure: 'circular',
      culturalMarkers: ['face-saving', 'indirect communication', 'consensus-building']
    },
    'direct_practical': {
      name: 'Direct Practical',
      tone: 'direct',
      vocabulary: 'technical',
      structure: 'linear',
      culturalMarkers: ['efficiency', 'individual rights', 'straightforward communication']
    },
    'accessible_supportive': {
      name: 'Accessible Supportive',
      tone: 'casual',
      vocabulary: 'simple',
      structure: 'linear',
      culturalMarkers: ['accessibility', 'plain language', 'supportive guidance']
    },
    'culturally_sensitive': {
      name: 'Culturally Sensitive',
      tone: 'diplomatic',
      vocabulary: 'mixed',
      structure: 'circular',
      culturalMarkers: ['cultural awareness', 'inclusive language', 'community consideration']
    }
  };

  /**
   * Select appropriate communication style based on context
   */
  static selectCommunicationStyle(context: CommunicationContext): StyleAdaptation {
    // Start with user preference as base
    let workingStyle = this.getBaseStyleForCulture(context.culturalBackground);
    
    // Apply user preference adjustments to vocabulary only
    if (context.userPreference === 'formal') {
      workingStyle.vocabulary = 'technical';
      workingStyle.culturalMarkers.push('formal preference');
    } else if (context.userPreference === 'casual') {
      workingStyle.vocabulary = 'simple';
      workingStyle.culturalMarkers.push('casual preference');
    }
    
    // Adjust for legal category (can override tone for sensitive topics)
    const categoryAdjustedStyle = this.adjustForLegalCategory(workingStyle, context.legalCategory);
    
    // Adjust for urgency (can override tone for critical situations)
    const finalStyle = this.adjustForUrgency(categoryAdjustedStyle, context.urgency);
    
    // Generate adaptation rules
    const adaptationRules = this.generateAdaptationRules(finalStyle, context);
    
    // Generate language patterns
    const languagePatterns = this.generateLanguagePatterns(finalStyle, context);
    
    // Generate cultural nuances
    const culturalNuances = this.generateCulturalNuances(finalStyle, context);
    
    // Generate examples
    const examples = this.generateExamples(finalStyle, context);

    return {
      selectedStyle: finalStyle,
      adaptationRules,
      languagePatterns,
      culturalNuances,
      examples
    };
  }

  /**
   * Get base communication style for cultural background
   */
  private static getBaseStyleForCulture(culturalBackground: string): CommunicationStyle {
    const culturalStyleMap: Record<string, string> = {
      'Hispanic/Latino': 'formal_respectful',
      'Asian': 'diplomatic_indirect',
      'African': 'culturally_sensitive',
      'Middle Eastern': 'formal_respectful',
      'European': 'direct_practical',
      'American': 'direct_practical',
      'Indigenous': 'culturally_sensitive'
    };

    const styleKey = culturalStyleMap[culturalBackground] || 'accessible_supportive';
    return this.communicationStyles[styleKey];
  }

  /**
   * Adjust style for legal category
   */
  private static adjustForLegalCategory(
    baseStyle: CommunicationStyle,
    category: LegalCategory
  ): CommunicationStyle {
    const adjustedStyle = { ...baseStyle };

    // Sensitive categories require more diplomatic approach
    const sensitiveCategories: LegalCategory[] = [
      'family_law', 'criminal_law', 'immigration_law', 'personal_injury'
    ];

    if (sensitiveCategories.includes(category)) {
      adjustedStyle.tone = 'diplomatic';
      adjustedStyle.culturalMarkers.push('sensitive topic handling');
    }

    // Technical categories may need more structured approach
    const technicalCategories: LegalCategory[] = [
      'intellectual_property', 'business_law', 'tax_law'
    ];

    if (technicalCategories.includes(category)) {
      adjustedStyle.vocabulary = 'technical';
      adjustedStyle.structure = 'linear';
      adjustedStyle.culturalMarkers.push('technical precision');
    }

    return adjustedStyle;
  }

  /**
   * Adjust style for urgency level
   */
  private static adjustForUrgency(
    baseStyle: CommunicationStyle,
    urgency: string
  ): CommunicationStyle {
    const adjustedStyle = { ...baseStyle };

    if (urgency === 'critical') {
      // Critical urgency requires more direct communication
      adjustedStyle.tone = 'direct';
      adjustedStyle.structure = 'linear';
      adjustedStyle.culturalMarkers.push('urgent action required');
    } else if (urgency === 'low') {
      // Low urgency allows for more diplomatic approach
      adjustedStyle.tone = 'diplomatic';
      adjustedStyle.structure = 'circular';
      adjustedStyle.culturalMarkers.push('thoughtful consideration');
    }

    return adjustedStyle;
  }

  /**
   * Adjust style for user preference (vocabulary only, preserve cultural tone)
   */
  private static adjustForUserPreference(
    baseStyle: CommunicationStyle,
    userPreference: 'formal' | 'casual'
  ): CommunicationStyle {
    const adjustedStyle = { ...baseStyle };

    // Only adjust vocabulary, preserve cultural tone and structure
    if (userPreference === 'formal') {
      adjustedStyle.vocabulary = 'technical';
      adjustedStyle.culturalMarkers.push('formal preference');
    } else if (userPreference === 'casual') {
      adjustedStyle.vocabulary = 'simple';
      adjustedStyle.culturalMarkers.push('casual preference');
    }

    return adjustedStyle;
  }

  /**
   * Generate adaptation rules for the selected style
   */
  private static generateAdaptationRules(
    style: CommunicationStyle,
    context: CommunicationContext
  ): string[] {
    const rules: string[] = [];

    // Tone-based rules
    switch (style.tone) {
      case 'formal':
        rules.push('Use formal titles and respectful language');
        rules.push('Avoid contractions and casual expressions');
        rules.push('Structure information hierarchically');
        break;
      case 'diplomatic':
        rules.push('Use indirect language to avoid confrontation');
        rules.push('Frame negative information sensitively');
        rules.push('Allow for face-saving alternatives');
        break;
      case 'direct':
        rules.push('Provide clear, straightforward information');
        rules.push('Use active voice and specific instructions');
        rules.push('Focus on actionable steps');
        break;
      case 'casual':
        rules.push('Use accessible, everyday language');
        rules.push('Encourage questions and clarification');
        rules.push('Maintain friendly but professional tone');
        break;
    }

    // Vocabulary-based rules
    switch (style.vocabulary) {
      case 'simple':
        rules.push('Explain legal terms in plain language');
        rules.push('Use short sentences and common words');
        rules.push('Provide definitions for technical terms');
        break;
      case 'technical':
        rules.push('Use precise legal terminology');
        rules.push('Include relevant statutes and regulations');
        rules.push('Maintain professional legal language');
        break;
      case 'mixed':
        rules.push('Balance technical accuracy with accessibility');
        rules.push('Explain complex terms when first introduced');
        rules.push('Use technical terms consistently');
        break;
    }

    // Structure-based rules
    switch (style.structure) {
      case 'linear':
        rules.push('Present information in logical sequence');
        rules.push('Use numbered steps and clear progression');
        rules.push('Focus on cause-and-effect relationships');
        break;
      case 'circular':
        rules.push('Provide context before specific instructions');
        rules.push('Allow for iterative understanding');
        rules.push('Connect information to broader implications');
        break;
      case 'hierarchical':
        rules.push('Present most important information first');
        rules.push('Organize by authority and precedence');
        rules.push('Respect decision-making hierarchy');
        break;
    }

    return rules;
  }

  /**
   * Generate language patterns for text transformation
   */
  private static generateLanguagePatterns(
    style: CommunicationStyle,
    context: CommunicationContext
  ): Record<string, string> {
    const patterns: Record<string, string> = {};

    // Formal tone patterns (also apply if user preference is formal)
    if (style.tone === 'formal' || context.userPreference === 'formal') {
      patterns['\\byou should\\b'] = 'it is recommended that you';
      patterns['\\byou need to\\b'] = 'it is necessary for you to';
      patterns['\\bcontact\\b'] = 'formally contact';
      patterns['\\bask\\b'] = 'respectfully inquire';
    }

    // Diplomatic tone patterns
    if (style.tone === 'diplomatic') {
      patterns['\\bmust\\b'] = 'should consider';
      patterns['\\brequired\\b'] = 'recommended';
      patterns['\\bdemand\\b'] = 'respectfully request';
      patterns['\\brefuse\\b'] = 'politely decline';
    }

    // Direct tone patterns
    if (style.tone === 'direct') {
      patterns['might consider'] = 'should';
      patterns['it may be advisable'] = 'you need to';
      patterns['perhaps'] = '';
      patterns['possibly'] = '';
    }

    // Simple vocabulary patterns
    if (style.vocabulary === 'simple') {
      patterns['commence'] = 'start';
      patterns['terminate'] = 'end';
      patterns['utilize'] = 'use';
      patterns['facilitate'] = 'help with';
      patterns['subsequent'] = 'next';
    }

    return patterns;
  }

  /**
   * Generate cultural nuances for the style
   */
  private static generateCulturalNuances(
    style: CommunicationStyle,
    context: CommunicationContext
  ): string[] {
    const nuances: string[] = [];

    // Add cultural background specific nuances
    switch (context.culturalBackground) {
      case 'Hispanic/Latino':
        nuances.push('Consider family involvement in decision-making');
        nuances.push('Show respect for elder authority');
        nuances.push('Use formal titles and respectful address');
        break;
      case 'Asian':
        nuances.push('Avoid direct confrontation or loss of face');
        nuances.push('Allow time for consensus building');
        nuances.push('Respect hierarchical communication patterns');
        break;
      case 'African':
        nuances.push('Consider community and extended family impact');
        nuances.push('Respect oral tradition and storytelling');
        nuances.push('Value collective decision-making processes');
        break;
      case 'Middle Eastern':
        nuances.push('Consider religious and traditional law perspectives');
        nuances.push('Respect family honor and reputation concerns');
        nuances.push('Be mindful of gender role considerations');
        break;
      case 'Indigenous':
        nuances.push('Consider community and extended family impact');
        nuances.push('Respect traditional governance and elder wisdom');
        nuances.push('Value collective decision-making and consensus');
        nuances.push('Honor cultural protocols and traditional law');
        break;
    }

    // Add language-specific nuances
    if (context.language !== 'en') {
      nuances.push('Provide key legal terms in both languages');
      nuances.push('Explain concepts that may not translate directly');
      nuances.push('Consider cultural differences in legal systems');
    }

    return nuances;
  }

  /**
   * Generate before/after examples of style adaptation
   */
  private static generateExamples(
    style: CommunicationStyle,
    context: CommunicationContext
  ): Array<{ before: string; after: string; explanation: string }> {
    const examples = [];

    // Formal tone example
    if (style.tone === 'formal') {
      examples.push({
        before: "You need to contact the court immediately.",
        after: "It is respectfully recommended that you formally contact the court at your earliest convenience.",
        explanation: "Formal tone shows respect for legal authority and uses respectful language."
      });
    }

    // Diplomatic tone example
    if (style.tone === 'diplomatic') {
      examples.push({
        before: "You must refuse their demand.",
        after: "You should consider politely declining their request while exploring alternative solutions.",
        explanation: "Diplomatic language avoids confrontation and suggests face-saving alternatives."
      });
    }

    // Simple vocabulary example
    if (style.vocabulary === 'simple') {
      examples.push({
        before: "You should commence litigation proceedings to facilitate resolution.",
        after: "You should start a court case to help solve the problem.",
        explanation: "Simple vocabulary makes legal concepts more accessible to non-lawyers."
      });
    }

    // Cultural adaptation example
    if (context.culturalBackground === 'Hispanic/Latino') {
      examples.push({
        before: "Make this decision on your own.",
        after: "Consider discussing this important decision with your family or trusted advisors before proceeding.",
        explanation: "Acknowledges the importance of family consultation in Hispanic/Latino culture."
      });
    }

    return examples;
  }

  /**
   * Apply communication style to text
   */
  static applyStyleToText(
    originalText: string,
    styleAdaptation: StyleAdaptation
  ): string {
    let adaptedText = originalText;

    // Apply language patterns
    for (const [pattern, replacement] of Object.entries(styleAdaptation.languagePatterns)) {
      const regex = new RegExp(pattern, 'gi');
      adaptedText = adaptedText.replace(regex, replacement);
    }

    // Add cultural nuances as context
    if (styleAdaptation.culturalNuances.length > 0) {
      const culturalContext = `\nCultural Considerations:\n${styleAdaptation.culturalNuances.map(n => `• ${n}`).join('\n')}\n\n`;
      adaptedText = culturalContext + adaptedText;
    }

    return adaptedText;
  }

  /**
   * Validate communication style appropriateness
   */
  static validateStyleAppropriateness(
    text: string,
    context: CommunicationContext
  ): {
    isAppropriate: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for cultural insensitivity
    const insensitivePatterns = [
      'you must', 'no choice', 'ignore family', 'individual decision only'
    ];

    for (const pattern of insensitivePatterns) {
      if (text.toLowerCase().includes(pattern.toLowerCase())) {
        issues.push(`Potentially insensitive language: "${pattern}"`);
      }
    }

    // Check for appropriate formality level
    if (context.userPreference === 'formal' && text.includes("can't")) {
      issues.push('Informal contractions used with formal preference');
      suggestions.push('Use "cannot" instead of "can\'t"');
    }

    // Check for cultural appropriateness
    if (context.culturalBackground === 'Asian' && text.includes('must refuse')) {
      issues.push('Direct confrontational language may be inappropriate');
      suggestions.push('Use more diplomatic language like "politely decline"');
    }

    const isAppropriate = issues.length === 0;

    return {
      isAppropriate,
      issues,
      suggestions
    };
  }
}