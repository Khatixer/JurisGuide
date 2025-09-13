import { GuidanceStep, LegalReference, Resource } from '../types';

export interface FormattedGuidance {
  immediateActions: GuidanceStep[];
  shortTermActions: GuidanceStep[];
  longTermActions: GuidanceStep[];
  summary: {
    keyNextActions: string[];
    professionalHelpNeeded: boolean;
    urgentDeadlines: string[];
    estimatedTimeframe: string;
  };
}

export class GuidanceFormatterService {
  /**
   * Format guidance steps into categorized actions
   */
  static formatGuidanceSteps(steps: GuidanceStep[]): FormattedGuidance {
    const immediateActions: GuidanceStep[] = [];
    const shortTermActions: GuidanceStep[] = [];
    const longTermActions: GuidanceStep[] = [];

    // Categorize steps by timeframe
    for (const step of steps) {
      const timeframe = step.timeframe.toLowerCase();
      
      if (this.isImmediateAction(timeframe)) {
        immediateActions.push(step);
      } else if (this.isShortTermAction(timeframe)) {
        shortTermActions.push(step);
      } else {
        longTermActions.push(step);
      }
    }

    // Generate summary
    const summary = this.generateSummary(steps);

    return {
      immediateActions,
      shortTermActions,
      longTermActions,
      summary
    };
  }

  /**
   * Check if action is immediate (24-48 hours)
   */
  private static isImmediateAction(timeframe: string): boolean {
    const immediateKeywords = [
      'immediate', 'immediately', 'asap', 'urgent', 'now',
      '24 hours', '48 hours', 'today', 'tomorrow',
      'within 1 day', 'within 2 days'
    ];
    
    return immediateKeywords.some(keyword => timeframe.includes(keyword));
  }

  /**
   * Check if action is short-term (1-2 weeks)
   */
  private static isShortTermAction(timeframe: string): boolean {
    const shortTermKeywords = [
      'week', 'weeks', '1-2 weeks', 'within 2 weeks',
      'short term', 'soon', 'next week'
    ];
    
    return shortTermKeywords.some(keyword => timeframe.includes(keyword));
  }

  /**
   * Generate guidance summary
   */
  private static generateSummary(steps: GuidanceStep[]): FormattedGuidance['summary'] {
    const keyNextActions: string[] = [];
    let professionalHelpNeeded = false;
    const urgentDeadlines: string[] = [];
    
    // Extract key actions and identify professional help needs
    for (const step of steps) {
      // Add to key actions if it's high priority
      if (step.order <= 3 || this.isImmediateAction(step.timeframe.toLowerCase())) {
        keyNextActions.push(step.title);
      }

      // Check if professional help is mentioned
      if (this.mentionsProfessionalHelp(step.description)) {
        professionalHelpNeeded = true;
      }

      // Extract urgent deadlines
      const deadlines = this.extractDeadlines(step.description);
      urgentDeadlines.push(...deadlines);
    }

    // Estimate overall timeframe
    const estimatedTimeframe = this.estimateOverallTimeframe(steps);

    return {
      keyNextActions: keyNextActions.slice(0, 5), // Limit to top 5
      professionalHelpNeeded,
      urgentDeadlines,
      estimatedTimeframe
    };
  }

  /**
   * Check if step mentions need for professional help
   */
  private static mentionsProfessionalHelp(description: string): boolean {
    const professionalKeywords = [
      'attorney', 'lawyer', 'legal counsel', 'legal advice',
      'consult', 'professional help', 'legal expert',
      'law firm', 'legal representation'
    ];
    
    const lowerDescription = description.toLowerCase();
    return professionalKeywords.some(keyword => lowerDescription.includes(keyword));
  }

  /**
   * Extract deadlines from step description
   */
  private static extractDeadlines(description: string): string[] {
    const deadlines: string[] = [];
    const deadlinePatterns = [
      /within (\d+) days?/gi,
      /(\d+) day deadline/gi,
      /deadline of ([^.]+)/gi,
      /must be filed by ([^.]+)/gi,
      /statute of limitations: ([^.]+)/gi
    ];

    for (const pattern of deadlinePatterns) {
      const matches = description.match(pattern);
      if (matches) {
        deadlines.push(...matches);
      }
    }

    return deadlines;
  }

  /**
   * Estimate overall timeframe for resolution
   */
  private static estimateOverallTimeframe(steps: GuidanceStep[]): string {
    const timeframes = steps.map(step => step.timeframe.toLowerCase());
    
    // Check for long-term indicators
    const hasLongTerm = timeframes.some(tf => 
      tf.includes('month') || tf.includes('year') || tf.includes('ongoing')
    );
    
    if (hasLongTerm) {
      return 'Several months to years';
    }

    // Check for medium-term indicators
    const hasMediumTerm = timeframes.some(tf => 
      tf.includes('week') || tf.includes('30 days')
    );
    
    if (hasMediumTerm) {
      return '2-8 weeks';
    }

    // Default to short-term
    return '1-2 weeks';
  }

  /**
   * Format resources for display
   */
  static formatResources(resources: Resource[]): {
    documents: Resource[];
    links: Resource[];
    contacts: Resource[];
  } {
    return {
      documents: resources.filter(r => r.type === 'document'),
      links: resources.filter(r => r.type === 'link'),
      contacts: resources.filter(r => r.type === 'contact')
    };
  }

  /**
   * Format legal references for display
   */
  static formatLegalReferences(references: LegalReference[]): {
    byJurisdiction: Record<string, LegalReference[]>;
    federal: LegalReference[];
    state: LegalReference[];
    international: LegalReference[];
  } {
    const byJurisdiction: Record<string, LegalReference[]> = {};
    const federal: LegalReference[] = [];
    const state: LegalReference[] = [];
    const international: LegalReference[] = [];

    for (const ref of references) {
      // Group by jurisdiction
      if (!byJurisdiction[ref.jurisdiction]) {
        byJurisdiction[ref.jurisdiction] = [];
      }
      byJurisdiction[ref.jurisdiction].push(ref);

      // Categorize by level
      const jurisdiction = ref.jurisdiction.toLowerCase();
      if (jurisdiction.includes('federal') || jurisdiction.includes('united states')) {
        federal.push(ref);
      } else if (jurisdiction.includes('state') || jurisdiction.includes('provincial')) {
        state.push(ref);
      } else if (jurisdiction.includes('international') || jurisdiction.includes('treaty')) {
        international.push(ref);
      }
    }

    return {
      byJurisdiction,
      federal,
      state,
      international
    };
  }

  /**
   * Generate plain language summary
   */
  static generatePlainLanguageSummary(guidance: FormattedGuidance): string {
    let summary = 'Here\'s what you need to do:\n\n';

    // Immediate actions
    if (guidance.immediateActions.length > 0) {
      summary += 'RIGHT NOW (next 1-2 days):\n';
      guidance.immediateActions.forEach((action, index) => {
        summary += `${index + 1}. ${action.title}\n`;
      });
      summary += '\n';
    }

    // Short-term actions
    if (guidance.shortTermActions.length > 0) {
      summary += 'SOON (next 1-2 weeks):\n';
      guidance.shortTermActions.forEach((action, index) => {
        summary += `${index + 1}. ${action.title}\n`;
      });
      summary += '\n';
    }

    // Long-term actions
    if (guidance.longTermActions.length > 0) {
      summary += 'LATER (ongoing or future):\n';
      guidance.longTermActions.forEach((action, index) => {
        summary += `${index + 1}. ${action.title}\n`;
      });
      summary += '\n';
    }

    // Key reminders
    if (guidance.summary.professionalHelpNeeded) {
      summary += '⚠️ IMPORTANT: Consider consulting with a qualified attorney for this matter.\n\n';
    }

    if (guidance.summary.urgentDeadlines.length > 0) {
      summary += '⏰ URGENT DEADLINES:\n';
      guidance.summary.urgentDeadlines.forEach(deadline => {
        summary += `- ${deadline}\n`;
      });
      summary += '\n';
    }

    summary += `Expected timeframe: ${guidance.summary.estimatedTimeframe}`;

    return summary;
  }
}