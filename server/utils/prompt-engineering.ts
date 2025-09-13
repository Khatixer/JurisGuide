import { LegalQuery, LegalCategory } from '../types';

export interface PromptTemplate {
  system: string;
  user: string;
  examples?: PromptExample[];
}

export interface PromptExample {
  input: string;
  output: string;
}

export interface JurisdictionPromptConfig {
  jurisdiction: string;
  legalSystem: 'common_law' | 'civil_law' | 'mixed' | 'religious' | 'customary';
  keyConsiderations: string[];
  commonProcedures: string[];
  culturalFactors: string[];
}

export class PromptEngineeringService {
  private static jurisdictionConfigs: Record<string, JurisdictionPromptConfig> = {
    'United States': {
      jurisdiction: 'United States',
      legalSystem: 'common_law',
      keyConsiderations: [
        'Federal vs state jurisdiction',
        'Constitutional rights (Bill of Rights)',
        'Precedent-based decisions (stare decisis)',
        'Discovery process in litigation',
        'Jury trial rights'
      ],
      commonProcedures: [
        'File complaint in appropriate court',
        'Serve defendant with legal papers',
        'Discovery phase (depositions, interrogatories)',
        'Pre-trial motions and conferences',
        'Trial or settlement negotiations'
      ],
      culturalFactors: [
        'Direct communication style preferred',
        'Individual rights emphasis',
        'Litigation-oriented culture',
        'Time-sensitive legal deadlines'
      ]
    },
    'European Union': {
      jurisdiction: 'European Union',
      legalSystem: 'civil_law',
      keyConsiderations: [
        'EU directives and regulations',
        'GDPR and privacy rights',
        'Cross-border enforcement',
        'Member state law variations',
        'European Court of Justice jurisdiction'
      ],
      commonProcedures: [
        'Determine applicable member state law',
        'Consider EU-wide regulations',
        'File in appropriate national court',
        'Consider alternative dispute resolution',
        'Cross-border enforcement mechanisms'
      ],
      culturalFactors: [
        'Formal communication expected',
        'Collective rights consideration',
        'Mediation and consensus preferred',
        'Multi-language considerations'
      ]
    }
  };

  /**
   * Generate category-specific prompt templates
   */
  static getCategoryPromptTemplate(category: LegalCategory): PromptTemplate {
    const templates: Record<LegalCategory, PromptTemplate> = {
      contract_dispute: {
        system: `You are a legal expert specializing in contract law. Focus on:
- Contract formation and validity
- Breach of contract analysis
- Remedies and damages
- Performance obligations
- Contract interpretation principles`,
        user: `Analyze this contract dispute and provide step-by-step guidance for resolution.`,
        examples: [{
          input: "Vendor failed to deliver goods as specified in contract",
          output: "1. Review contract terms for delivery specifications\n2. Document the breach with evidence\n3. Calculate damages\n4. Send formal notice of breach\n5. Consider remedies: specific performance vs damages"
        }]
      },
      employment_law: {
        system: `You are a legal expert specializing in employment law. Focus on:
- Employment contracts and agreements
- Workplace discrimination and harassment
- Wage and hour compliance
- Termination procedures
- Workers' rights and protections`,
        user: `Analyze this employment law issue and provide guidance on rights and procedures.`
      },
      family_law: {
        system: `You are a legal expert specializing in family law. Focus on:
- Divorce and separation procedures
- Child custody and support
- Property division
- Domestic relations
- Adoption and guardianship`,
        user: `Provide sensitive, family-focused legal guidance for this situation.`
      },
      criminal_law: {
        system: `You are a legal expert specializing in criminal law. Focus on:
- Constitutional rights (Miranda, due process)
- Criminal procedure and evidence
- Charges and penalties
- Defense strategies
- Plea negotiations`,
        user: `Provide guidance on criminal law matters with emphasis on constitutional rights.`
      },
      immigration_law: {
        system: `You are a legal expert specializing in immigration law. Focus on:
- Visa and immigration status
- Deportation and removal proceedings
- Citizenship and naturalization
- Family-based immigration
- Employment-based immigration`,
        user: `Provide guidance on immigration matters with cultural sensitivity.`
      },
      intellectual_property: {
        system: `You are a legal expert specializing in intellectual property law. Focus on:
- Patents, trademarks, and copyrights
- IP infringement and enforcement
- Licensing agreements
- Trade secrets protection
- International IP considerations`,
        user: `Analyze this IP issue and provide protection and enforcement guidance.`
      },
      real_estate: {
        system: `You are a legal expert specializing in real estate law. Focus on:
- Property transactions and contracts
- Title issues and disputes
- Landlord-tenant relationships
- Zoning and land use
- Property development`,
        user: `Provide guidance on this real estate matter with attention to local regulations.`
      },
      personal_injury: {
        system: `You are a legal expert specializing in personal injury law. Focus on:
- Negligence and liability
- Damages calculation
- Insurance claims
- Medical documentation
- Settlement negotiations`,
        user: `Analyze this personal injury case and provide guidance on pursuing compensation.`
      },
      business_law: {
        system: `You are a legal expert specializing in business law. Focus on:
- Business formation and structure
- Corporate governance
- Commercial transactions
- Regulatory compliance
- Business disputes`,
        user: `Provide business law guidance with attention to commercial best practices.`
      },
      tax_law: {
        system: `You are a legal expert specializing in tax law. Focus on:
- Tax compliance and obligations
- Tax disputes and audits
- Tax planning strategies
- International tax issues
- Tax penalties and relief`,
        user: `Analyze this tax matter and provide compliance and resolution guidance.`
      },
      other: {
        system: `You are a general legal expert. Provide comprehensive analysis across multiple legal areas.`,
        user: `Analyze this legal issue and provide appropriate guidance.`
      }
    };

    return templates[category];
  }

  /**
   * Generate jurisdiction-aware prompt enhancements
   */
  static getJurisdictionPromptEnhancement(jurisdictions: string[]): string {
    let enhancement = '\nJURISDICTION-SPECIFIC GUIDANCE:\n';
    
    for (const jurisdiction of jurisdictions) {
      const config = this.jurisdictionConfigs[jurisdiction];
      if (config) {
        enhancement += `\n${jurisdiction.toUpperCase()}:\n`;
        enhancement += `Legal System: ${config.legalSystem.replace('_', ' ').toUpperCase()}\n`;
        enhancement += `Key Considerations:\n${config.keyConsiderations.map(c => `- ${c}`).join('\n')}\n`;
        enhancement += `Common Procedures:\n${config.commonProcedures.map(p => `- ${p}`).join('\n')}\n`;
        enhancement += `Cultural Factors:\n${config.culturalFactors.map(f => `- ${f}`).join('\n')}\n`;
      }
    }

    return enhancement;
  }

  /**
   * Generate cultural sensitivity prompts
   */
  static getCulturalSensitivityPrompt(culturalBackground: string, language: string): string {
    const culturalPrompts: Record<string, string> = {
      'Hispanic/Latino': 'Consider family-oriented decision making, respect for authority, and potential language barriers.',
      'Asian': 'Consider collective decision making, face-saving concerns, and hierarchical communication styles.',
      'African': 'Consider community-oriented approaches, oral tradition importance, and extended family involvement.',
      'Middle Eastern': 'Consider religious law considerations, family honor concepts, and gender role considerations.',
      'European': 'Consider formal communication preferences, individual rights focus, and procedural adherence.',
      'Indigenous': 'Consider traditional law systems, community consensus, and cultural sovereignty issues.'
    };

    let prompt = '\nCULTURAL SENSITIVITY GUIDELINES:\n';
    
    if (culturalPrompts[culturalBackground]) {
      prompt += `Cultural Background (${culturalBackground}): ${culturalPrompts[culturalBackground]}\n`;
    }

    if (language !== 'en') {
      prompt += `Language Consideration: Provide guidance in ${language} when possible, explain legal terms clearly.\n`;
    }

    prompt += 'Always respect cultural values while providing accurate legal information.\n';
    
    return prompt;
  }

  /**
   * Generate step-by-step guidance format prompt
   */
  static getStepByStepFormatPrompt(): string {
    return `
FORMAT REQUIREMENTS:
Provide guidance in clear, numbered steps with:
1. Immediate actions (within 24-48 hours)
2. Short-term actions (within 1-2 weeks)
3. Long-term actions (ongoing or future)

For each step include:
- Clear action description
- Expected timeframe
- Required resources or documents
- Potential costs or considerations
- Jurisdiction-specific requirements

Always conclude with:
- Summary of key next actions
- When to seek professional legal help
- Important deadlines or time limits
- Relevant legal resources or contacts`;
  }
}