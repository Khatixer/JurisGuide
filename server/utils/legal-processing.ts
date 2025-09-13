import { LegalCategory, Location } from '../types';

// Jurisdiction detection based on description and user location
export async function detectJurisdiction(
  description: string, 
  userLocation?: Location
): Promise<string[]> {
  const jurisdictions: string[] = [];
  
  // Default to user's location if available
  if (userLocation?.country) {
    jurisdictions.push(userLocation.country);
    
    // Add state/province if available for federal countries
    if (userLocation.state && ['United States', 'Canada', 'Australia'].includes(userLocation.country)) {
      jurisdictions.push(`${userLocation.country} - ${userLocation.state}`);
    }
  }

  // Analyze description for jurisdiction keywords
  const descriptionLower = description.toLowerCase();
  
  // Country-specific keywords
  const jurisdictionKeywords = {
    'United States': [
      'usa', 'united states', 'america', 'american', 'federal', 'supreme court',
      'constitution', 'amendment', 'congress', 'senate', 'house of representatives'
    ],
    'Canada': [
      'canada', 'canadian', 'ontario', 'quebec', 'british columbia', 'alberta',
      'charter of rights', 'supreme court of canada'
    ],
    'United Kingdom': [
      'uk', 'united kingdom', 'england', 'scotland', 'wales', 'northern ireland',
      'british', 'parliament', 'house of lords', 'house of commons'
    ],
    'European Union': [
      'eu', 'european union', 'european court', 'gdpr', 'european parliament',
      'brussels', 'strasbourg'
    ],
    'Australia': [
      'australia', 'australian', 'new south wales', 'victoria', 'queensland',
      'high court of australia'
    ],
    'Germany': [
      'germany', 'german', 'bundesgericht', 'bundestag', 'grundgesetz'
    ],
    'France': [
      'france', 'french', 'cour de cassation', 'conseil constitutionnel'
    ],
    'International': [
      'international', 'cross-border', 'treaty', 'convention', 'arbitration',
      'world trade', 'united nations', 'international court'
    ]
  };

  // Check for jurisdiction-specific keywords
  for (const [jurisdiction, keywords] of Object.entries(jurisdictionKeywords)) {
    if (keywords.some(keyword => descriptionLower.includes(keyword))) {
      if (!jurisdictions.includes(jurisdiction)) {
        jurisdictions.push(jurisdiction);
      }
    }
  }

  // If no jurisdictions detected, default to International
  if (jurisdictions.length === 0) {
    jurisdictions.push('International');
  }

  return jurisdictions;
}

// Categorize legal query based on description content
export async function categorizeLegalQuery(description: string): Promise<LegalCategory> {
  const descriptionLower = description.toLowerCase();
  
  // Category keywords mapping
  const categoryKeywords: Record<LegalCategory, string[]> = {
    'contract_dispute': [
      'contract', 'agreement', 'breach', 'terms', 'conditions', 'warranty',
      'service agreement', 'purchase order', 'vendor', 'supplier', 'delivery',
      'payment terms', 'cancellation', 'refund', 'non-performance'
    ],
    'employment_law': [
      'employment', 'employee', 'employer', 'workplace', 'job', 'salary',
      'wages', 'overtime', 'discrimination', 'harassment', 'termination',
      'firing', 'hiring', 'benefits', 'vacation', 'sick leave', 'union',
      'workers compensation', 'wrongful termination'
    ],
    'family_law': [
      'divorce', 'marriage', 'custody', 'child support', 'alimony', 'adoption',
      'domestic violence', 'prenuptial', 'separation', 'visitation',
      'parental rights', 'family court', 'spouse', 'children'
    ],
    'criminal_law': [
      'criminal', 'crime', 'arrest', 'police', 'charges', 'prosecution',
      'defense', 'guilty', 'innocent', 'trial', 'sentence', 'prison',
      'jail', 'bail', 'probation', 'felony', 'misdemeanor', 'theft',
      'assault', 'fraud', 'dui', 'drug'
    ],
    'immigration_law': [
      'immigration', 'visa', 'green card', 'citizenship', 'deportation',
      'asylum', 'refugee', 'border', 'customs', 'naturalization',
      'work permit', 'student visa', 'tourist visa', 'permanent resident'
    ],
    'intellectual_property': [
      'patent', 'trademark', 'copyright', 'intellectual property', 'ip',
      'infringement', 'licensing', 'royalty', 'invention', 'brand',
      'logo', 'software', 'trade secret', 'piracy', 'plagiarism'
    ],
    'real_estate': [
      'real estate', 'property', 'house', 'home', 'apartment', 'land',
      'mortgage', 'rent', 'lease', 'landlord', 'tenant', 'eviction',
      'deed', 'title', 'zoning', 'construction', 'neighbor dispute'
    ],
    'personal_injury': [
      'injury', 'accident', 'medical malpractice', 'negligence', 'damages',
      'compensation', 'insurance claim', 'car accident', 'slip and fall',
      'product liability', 'wrongful death', 'pain and suffering'
    ],
    'business_law': [
      'business', 'corporation', 'llc', 'partnership', 'startup',
      'incorporation', 'merger', 'acquisition', 'securities', 'compliance',
      'regulatory', 'commercial', 'corporate governance', 'shareholder'
    ],
    'tax_law': [
      'tax', 'taxes', 'irs', 'audit', 'deduction', 'refund', 'penalty',
      'tax return', 'income tax', 'sales tax', 'property tax', 'estate tax',
      'tax planning', 'tax evasion', 'tax fraud'
    ],
    'other': []
  };

  // Score each category based on keyword matches
  const categoryScores: Record<LegalCategory, number> = {
    'contract_dispute': 0,
    'employment_law': 0,
    'family_law': 0,
    'criminal_law': 0,
    'immigration_law': 0,
    'intellectual_property': 0,
    'real_estate': 0,
    'personal_injury': 0,
    'business_law': 0,
    'tax_law': 0,
    'other': 0
  };

  // Calculate scores for each category
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (category === 'other') continue;
    
    for (const keyword of keywords) {
      if (descriptionLower.includes(keyword)) {
        categoryScores[category as LegalCategory] += 1;
        
        // Give extra weight to exact matches
        if (descriptionLower.includes(` ${keyword} `) || 
            descriptionLower.startsWith(`${keyword} `) || 
            descriptionLower.endsWith(` ${keyword}`)) {
          categoryScores[category as LegalCategory] += 0.5;
        }
      }
    }
  }

  // Find the category with the highest score
  let bestCategory: LegalCategory = 'other';
  let highestScore = 0;

  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > highestScore) {
      highestScore = score;
      bestCategory = category as LegalCategory;
    }
  }

  // If no clear category is found (score too low), return 'other'
  if (highestScore < 1) {
    return 'other';
  }

  return bestCategory;
}

// Extract key legal concepts from description
export function extractLegalConcepts(description: string): string[] {
  const concepts: string[] = [];
  const descriptionLower = description.toLowerCase();
  
  // Common legal concepts to identify
  const legalConcepts = [
    'liability', 'negligent', 'negligence', 'damages', 'compensation', 'breach',
    'violation', 'violated', 'rights', 'obligations', 'remedy', 'settlement',
    'arbitration', 'mediation', 'litigation', 'jurisdiction', 'statute',
    'regulation', 'compliance', 'due process', 'evidence', 'testimony',
    'precedent', 'case law', 'statutory', 'constitutional', 'procedural'
  ];

  for (const concept of legalConcepts) {
    if (descriptionLower.includes(concept)) {
      concepts.push(concept);
    }
  }

  return concepts;
}

// Determine urgency level based on description content
export function determineUrgency(description: string): 'low' | 'medium' | 'high' | 'critical' {
  const descriptionLower = description.toLowerCase();
  
  // Critical urgency indicators
  const criticalKeywords = [
    'emergency', 'urgent', 'immediate', 'asap', 'deadline today',
    'court tomorrow', 'arrest', 'eviction notice', 'foreclosure',
    'deportation', 'restraining order', 'injunction'
  ];

  // High urgency indicators
  const highKeywords = [
    'deadline', 'court date', 'hearing', 'trial', 'time sensitive',
    'statute of limitations', 'filing deadline', 'response required',
    'summons', 'subpoena', 'notice'
  ];

  // Medium urgency indicators
  const mediumKeywords = [
    'soon', 'within weeks', 'planning', 'preparing', 'advice needed',
    'consultation', 'review', 'guidance'
  ];

  // Check for urgency indicators
  if (criticalKeywords.some(keyword => descriptionLower.includes(keyword))) {
    return 'critical';
  }

  if (highKeywords.some(keyword => descriptionLower.includes(keyword))) {
    return 'high';
  }

  if (mediumKeywords.some(keyword => descriptionLower.includes(keyword))) {
    return 'medium';
  }

  return 'low';
}

// Validate jurisdiction format and normalize
export function normalizeJurisdiction(jurisdiction: string): string {
  const normalized = jurisdiction.trim();
  
  // Common jurisdiction mappings
  const jurisdictionMappings: Record<string, string> = {
    'usa': 'United States',
    'us': 'United States',
    'america': 'United States',
    'uk': 'United Kingdom',
    'britain': 'United Kingdom',
    'eu': 'European Union',
    'europe': 'European Union'
  };

  const lowerNormalized = normalized.toLowerCase();
  return jurisdictionMappings[lowerNormalized] || normalized;
}