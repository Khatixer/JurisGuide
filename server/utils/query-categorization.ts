import { LegalCategory } from '../types';

// Enhanced query categorization with confidence scoring
export interface CategoryResult {
  category: LegalCategory;
  confidence: number;
  alternativeCategories: { category: LegalCategory; confidence: number }[];
}

// Advanced categorization with machine learning-like scoring
export function categorizeQueryAdvanced(description: string): CategoryResult {
  const descriptionLower = description.toLowerCase();
  
  // Enhanced category keywords with weights
  const categoryKeywords: Record<LegalCategory, { keywords: string[]; weights: number[] }> = {
    'contract_dispute': {
      keywords: [
        'contract', 'agreement', 'breach', 'terms', 'conditions', 'warranty',
        'service agreement', 'purchase order', 'vendor', 'supplier', 'delivery',
        'payment terms', 'cancellation', 'refund', 'non-performance', 'default',
        'obligation', 'consideration', 'offer', 'acceptance', 'binding'
      ],
      weights: [3, 3, 4, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 4, 3, 2, 2, 2, 3]
    },
    'employment_law': {
      keywords: [
        'employment', 'employee', 'employer', 'workplace', 'job', 'salary',
        'wages', 'overtime', 'discrimination', 'harassment', 'termination',
        'firing', 'hiring', 'benefits', 'vacation', 'sick leave', 'union',
        'workers compensation', 'wrongful termination', 'at-will', 'fmla'
      ],
      weights: [4, 3, 3, 2, 2, 2, 2, 2, 4, 4, 4, 3, 2, 2, 1, 2, 2, 3, 4, 2, 2]
    },
    'family_law': {
      keywords: [
        'divorce', 'marriage', 'custody', 'child support', 'alimony', 'adoption',
        'domestic violence', 'prenuptial', 'separation', 'visitation',
        'parental rights', 'family court', 'spouse', 'children', 'guardian'
      ],
      weights: [4, 3, 4, 4, 3, 3, 4, 2, 3, 3, 3, 3, 2, 2, 2]
    },
    'criminal_law': {
      keywords: [
        'criminal', 'crime', 'arrest', 'police', 'charges', 'prosecution',
        'defense', 'guilty', 'innocent', 'trial', 'sentence', 'prison',
        'jail', 'bail', 'probation', 'felony', 'misdemeanor', 'theft',
        'assault', 'fraud', 'dui', 'drug', 'warrant', 'miranda'
      ],
      weights: [4, 4, 4, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 4, 3, 3, 3, 3, 3, 2, 2, 2]
    },
    'immigration_law': {
      keywords: [
        'immigration', 'visa', 'green card', 'citizenship', 'deportation',
        'asylum', 'refugee', 'border', 'customs', 'naturalization',
        'work permit', 'student visa', 'tourist visa', 'permanent resident',
        'uscis', 'ice', 'daca'
      ],
      weights: [4, 4, 4, 4, 4, 4, 3, 2, 2, 3, 3, 3, 2, 3, 3, 3, 3]
    },
    'intellectual_property': {
      keywords: [
        'patent', 'trademark', 'copyright', 'intellectual property', 'ip',
        'infringement', 'licensing', 'royalty', 'invention', 'brand',
        'logo', 'software', 'trade secret', 'piracy', 'plagiarism',
        'dmca', 'fair use', 'prior art'
      ],
      weights: [4, 4, 4, 4, 3, 4, 3, 2, 3, 2, 2, 2, 3, 3, 3, 3, 2, 2]
    },
    'real_estate': {
      keywords: [
        'real estate', 'property', 'house', 'home', 'apartment', 'land',
        'mortgage', 'rent', 'lease', 'landlord', 'tenant', 'eviction',
        'deed', 'title', 'zoning', 'construction', 'neighbor dispute',
        'hoa', 'easement', 'foreclosure'
      ],
      weights: [4, 3, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 3, 3, 2, 2, 2, 2, 2, 4]
    },
    'personal_injury': {
      keywords: [
        'injury', 'accident', 'medical malpractice', 'negligence', 'damages',
        'compensation', 'insurance claim', 'car accident', 'slip and fall',
        'product liability', 'wrongful death', 'pain and suffering',
        'liability', 'tort', 'settlement'
      ],
      weights: [4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 2]
    },
    'business_law': {
      keywords: [
        'business', 'corporation', 'llc', 'partnership', 'startup',
        'incorporation', 'merger', 'acquisition', 'securities', 'compliance',
        'regulatory', 'commercial', 'corporate governance', 'shareholder',
        'board of directors', 'bylaws', 'operating agreement'
      ],
      weights: [3, 4, 4, 3, 2, 3, 3, 3, 3, 2, 2, 2, 3, 3, 2, 2, 3]
    },
    'tax_law': {
      keywords: [
        'tax', 'taxes', 'irs', 'audit', 'deduction', 'refund', 'penalty',
        'tax return', 'income tax', 'sales tax', 'property tax', 'estate tax',
        'tax planning', 'tax evasion', 'tax fraud', 'withholding'
      ],
      weights: [4, 4, 4, 4, 2, 2, 3, 3, 3, 2, 2, 2, 2, 4, 4, 2]
    },
    'other': { keywords: [], weights: [] }
  };

  // Calculate weighted scores for each category
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

  // Score each category
  for (const [category, { keywords, weights }] of Object.entries(categoryKeywords)) {
    if (category === 'other') continue;
    
    keywords.forEach((keyword, index) => {
      const weight = weights[index] || 1;
      
      if (descriptionLower.includes(keyword)) {
        categoryScores[category as LegalCategory] += weight;
        
        // Bonus for exact word matches
        const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (wordBoundaryRegex.test(description)) {
          categoryScores[category as LegalCategory] += weight * 0.5;
        }
      }
    });
  }

  // Find top categories
  const sortedCategories = Object.entries(categoryScores)
    .filter(([category]) => category !== 'other')
    .sort(([, a], [, b]) => b - a)
    .map(([category, score]) => ({
      category: category as LegalCategory,
      score
    }));

  // Calculate confidence based on score distribution
  const topScore = sortedCategories[0]?.score || 0;
  const secondScore = sortedCategories[1]?.score || 0;
  
  // If no clear winner or score too low, return 'other'
  if (topScore < 2 || (topScore - secondScore) < 1) {
    return {
      category: 'other',
      confidence: 0.1,
      alternativeCategories: sortedCategories.slice(0, 3).map(({ category, score }) => ({
        category,
        confidence: Math.min(score / 10, 0.8)
      }))
    };
  }

  // Calculate confidence (0-1 scale)
  const maxPossibleScore = 20; // Rough estimate
  const confidence = Math.min(topScore / maxPossibleScore, 0.95);
  
  return {
    category: sortedCategories[0].category,
    confidence,
    alternativeCategories: sortedCategories.slice(1, 4).map(({ category, score }) => ({
      category,
      confidence: Math.min(score / maxPossibleScore, 0.8)
    }))
  };
}

// Extract urgency indicators with confidence
export interface UrgencyResult {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  indicators: string[];
}

export function determineUrgencyAdvanced(description: string): UrgencyResult {
  const descriptionLower = description.toLowerCase();
  
  const urgencyIndicators = {
    critical: {
      keywords: [
        'emergency', 'urgent', 'immediate', 'asap', 'deadline today',
        'court tomorrow', 'arrest', 'eviction notice', 'foreclosure',
        'deportation', 'restraining order', 'injunction', 'warrant',
        'time sensitive', 'expires today', 'due today'
      ],
      weights: [5, 5, 4, 3, 5, 5, 5, 5, 5, 5, 4, 4, 4, 3, 4, 4]
    },
    high: {
      keywords: [
        'deadline', 'court date', 'hearing', 'trial', 'statute of limitations',
        'filing deadline', 'response required', 'summons', 'subpoena', 'notice',
        'within days', 'this week', 'next week', 'soon'
      ],
      weights: [4, 4, 4, 4, 5, 4, 3, 4, 4, 3, 3, 3, 2, 2]
    },
    medium: {
      keywords: [
        'within weeks', 'planning', 'preparing', 'advice needed',
        'consultation', 'review', 'guidance', 'next month', 'upcoming'
      ],
      weights: [2, 2, 2, 2, 2, 2, 2, 2, 2]
    },
    low: {
      keywords: [
        'general', 'information', 'curious', 'wondering', 'someday',
        'eventually', 'future', 'hypothetical'
      ],
      weights: [1, 1, 1, 1, 1, 1, 1, 1]
    }
  };

  let bestUrgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let bestScore = 0;
  const foundIndicators: string[] = [];

  // Check each urgency level
  for (const [urgency, { keywords, weights }] of Object.entries(urgencyIndicators)) {
    let score = 0;
    
    keywords.forEach((keyword, index) => {
      if (descriptionLower.includes(keyword)) {
        score += weights[index];
        foundIndicators.push(keyword);
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestUrgency = urgency as 'low' | 'medium' | 'high' | 'critical';
    }
  }

  // Calculate confidence based on score
  const maxScore = 10; // Rough estimate
  const confidence = Math.min(bestScore / maxScore, 0.9);

  return {
    urgency: bestUrgency,
    confidence: Math.max(confidence, 0.1), // Minimum confidence
    indicators: [...new Set(foundIndicators)] // Remove duplicates
  };
}