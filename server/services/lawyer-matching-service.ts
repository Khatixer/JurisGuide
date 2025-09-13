import { Pool } from 'pg';
import pool from '../database/config';
import { Lawyer, MatchingCriteria, LegalCategory } from '../types';
import { logger } from '../utils/logger';

export interface MatchingScore {
  lawyer: Lawyer;
  score: number;
  factors: {
    distance: number;
    rating: number;
    experience: number;
    pricing: number;
    availability: number;
    specialization: number;
    language: number;
    urgency: number;
  };
}

export class LawyerMatchingService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  async findMatchingLawyers(criteria: MatchingCriteria): Promise<MatchingScore[]> {
    const client = await this.db.connect();
    
    try {
      // Get all verified lawyers with the required specialization
      const query = `
        SELECT l.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'userId', lr.user_id,
                     'score', lr.score,
                     'review', lr.review,
                     'createdAt', lr.created_at
                   )
                 ) FILTER (WHERE lr.id IS NOT NULL), 
                 '[]'
               ) as ratings,
               COALESCE(AVG(lr.score), 0) as avg_rating,
               COUNT(lr.id) as rating_count,
               -- Calculate distance using Haversine formula
               (
                 6371 * acos(
                   cos(radians($1)) * cos(radians((l.location->>'latitude')::float)) *
                   cos(radians((l.location->>'longitude')::float) - radians($2)) +
                   sin(radians($1)) * sin(radians((l.location->>'latitude')::float))
                 )
               ) as distance_km
        FROM lawyers l
        LEFT JOIN lawyer_ratings lr ON l.id = lr.lawyer_id
        WHERE l.verification_status = 'verified'
          AND $3 = ANY(l.specializations)
          AND (l.pricing->>'hourlyRate')::float <= $4
          AND (l.pricing->>'consultationFee')::float <= $5
        GROUP BY l.id
        ORDER BY avg_rating DESC, distance_km ASC
        LIMIT 50
      `;

      const values = [
        criteria.location.latitude,
        criteria.location.longitude,
        criteria.caseType,
        criteria.budget.max,
        criteria.budget.max
      ];

      const result = await client.query(query, values);

      const lawyers: (Lawyer & { distance_km: number; avg_rating: number; rating_count: number })[] = 
        result.rows.map(row => ({
          id: row.id,
          profile: row.profile,
          specializations: row.specializations,
          location: row.location,
          availability: row.availability,
          pricing: row.pricing,
          ratings: row.ratings,
          verificationStatus: row.verification_status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          distance_km: parseFloat(row.distance_km) || 0,
          avg_rating: parseFloat(row.avg_rating) || 0,
          rating_count: parseInt(row.rating_count) || 0
        }));

      // Calculate matching scores for each lawyer
      const matchingScores = lawyers.map(lawyer => this.calculateMatchingScore(lawyer, criteria));

      // Sort by total score descending
      matchingScores.sort((a, b) => b.score - a.score);

      return matchingScores.slice(0, 20); // Return top 20 matches
    } finally {
      client.release();
    }
  }

  private calculateMatchingScore(
    lawyer: Lawyer & { distance_km: number; avg_rating: number; rating_count: number }, 
    criteria: MatchingCriteria
  ): MatchingScore {
    const factors = {
      distance: this.calculateDistanceScore(lawyer.distance_km),
      rating: this.calculateRatingScore(lawyer.avg_rating, lawyer.rating_count),
      experience: this.calculateExperienceScore(lawyer.profile.experience),
      pricing: this.calculatePricingScore(lawyer.pricing.hourlyRate, criteria.budget),
      availability: this.calculateAvailabilityScore(lawyer.availability, criteria.urgency),
      specialization: this.calculateSpecializationScore(lawyer.specializations, criteria.caseType),
      language: this.calculateLanguageScore(lawyer.profile.languages, criteria.languagePreference),
      urgency: this.calculateUrgencyScore(lawyer.availability, criteria.urgency)
    };

    // Weighted scoring system
    const weights = {
      distance: 0.15,
      rating: 0.25,
      experience: 0.15,
      pricing: 0.20,
      availability: 0.10,
      specialization: 0.10,
      language: 0.03,
      urgency: 0.02
    };

    const totalScore = Object.entries(factors).reduce((sum, [key, score]) => {
      return sum + (score * weights[key as keyof typeof weights]);
    }, 0);

    return {
      lawyer: {
        id: lawyer.id,
        profile: lawyer.profile,
        specializations: lawyer.specializations,
        location: lawyer.location,
        availability: lawyer.availability,
        pricing: lawyer.pricing,
        ratings: lawyer.ratings,
        verificationStatus: lawyer.verificationStatus,
        createdAt: lawyer.createdAt,
        updatedAt: lawyer.updatedAt
      },
      score: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
      factors
    };
  }

  private calculateDistanceScore(distanceKm: number): number {
    // Score decreases with distance, max score at 0km, min score at 100km+
    if (distanceKm <= 5) return 1.0;
    if (distanceKm <= 10) return 0.9;
    if (distanceKm <= 25) return 0.8;
    if (distanceKm <= 50) return 0.6;
    if (distanceKm <= 100) return 0.4;
    return 0.2;
  }

  private calculateRatingScore(avgRating: number, ratingCount: number): number {
    if (ratingCount === 0) return 0.5; // Neutral score for no ratings
    
    // Adjust rating based on number of reviews (more reviews = more reliable)
    const reliabilityFactor = Math.min(ratingCount / 10, 1); // Max reliability at 10+ reviews
    const adjustedRating = avgRating * reliabilityFactor + (1 - reliabilityFactor) * 3; // Default to 3 stars for new lawyers
    
    return Math.min(adjustedRating / 5, 1); // Normalize to 0-1 scale
  }

  private calculateExperienceScore(experience: number): number {
    // Score increases with experience, plateaus after 15 years
    if (experience >= 15) return 1.0;
    if (experience >= 10) return 0.9;
    if (experience >= 5) return 0.8;
    if (experience >= 2) return 0.6;
    if (experience >= 1) return 0.4;
    return 0.2;
  }

  private calculatePricingScore(hourlyRate: number, budget: { min: number; max: number }): number {
    if (hourlyRate <= budget.min) return 1.0; // Best value
    if (hourlyRate <= budget.max) {
      // Linear decrease from min to max budget
      const range = budget.max - budget.min;
      const position = hourlyRate - budget.min;
      return 1 - (position / range) * 0.5; // Score between 0.5 and 1.0
    }
    return 0; // Over budget
  }

  private calculateAvailabilityScore(availability: any, urgency: string): number {
    const emergencyBonus = availability.emergencyAvailable ? 0.2 : 0;
    
    switch (urgency) {
      case 'critical':
        return availability.emergencyAvailable ? 1.0 : 0.3;
      case 'high':
        return 0.8 + emergencyBonus;
      case 'medium':
        return 0.7 + emergencyBonus;
      case 'low':
        return 0.6 + emergencyBonus;
      default:
        return 0.5;
    }
  }

  private calculateSpecializationScore(specializations: LegalCategory[], caseType: LegalCategory): number {
    if (specializations.includes(caseType)) {
      // Bonus for having fewer specializations (more focused)
      const focusBonus = Math.max(0, (5 - specializations.length) * 0.1);
      return Math.min(1.0, 0.8 + focusBonus);
    }
    return 0.2; // Low score if specialization doesn't match
  }

  private calculateLanguageScore(lawyerLanguages: string[], preferredLanguage: string): number {
    if (lawyerLanguages.includes(preferredLanguage)) {
      return 1.0;
    }
    if (lawyerLanguages.includes('English')) {
      return 0.7; // Fallback to English
    }
    return 0.3; // No language match
  }

  private calculateUrgencyScore(availability: any, urgency: string): number {
    // This could be enhanced with real-time availability data
    const baseScore = 0.5;
    
    if (urgency === 'critical' && availability.emergencyAvailable) {
      return 1.0;
    }
    
    return baseScore;
  }

  async getMatchingExplanation(matchingScore: MatchingScore, criteria: MatchingCriteria): Promise<string[]> {
    const explanations: string[] = [];
    const { factors } = matchingScore;
    const { lawyer } = matchingScore;

    // Distance explanation
    if (factors.distance >= 0.8) {
      explanations.push(`Located nearby (within ${Math.round(factors.distance * 50)}km)`);
    } else if (factors.distance >= 0.4) {
      explanations.push(`Moderate distance from your location`);
    } else {
      explanations.push(`Located further away but available for remote consultation`);
    }

    // Rating explanation
    if (factors.rating >= 0.8) {
      explanations.push(`Highly rated by previous clients (${lawyer.ratings.length} reviews)`);
    } else if (factors.rating >= 0.6) {
      explanations.push(`Good client reviews`);
    } else if (lawyer.ratings.length === 0) {
      explanations.push(`New lawyer with no reviews yet`);
    }

    // Experience explanation
    if (factors.experience >= 0.8) {
      explanations.push(`Experienced lawyer (${lawyer.profile.experience}+ years)`);
    } else if (factors.experience >= 0.4) {
      explanations.push(`Moderate experience in the field`);
    } else {
      explanations.push(`Early career lawyer with fresh perspective`);
    }

    // Pricing explanation
    if (factors.pricing >= 0.8) {
      explanations.push(`Excellent value within your budget`);
    } else if (factors.pricing >= 0.5) {
      explanations.push(`Reasonably priced for your budget`);
    }

    // Specialization explanation
    if (factors.specialization >= 0.8) {
      explanations.push(`Specializes in ${criteria.caseType.replace('_', ' ')}`);
    }

    // Language explanation
    if (factors.language >= 0.9) {
      explanations.push(`Speaks your preferred language (${criteria.languagePreference})`);
    }

    return explanations;
  }
}