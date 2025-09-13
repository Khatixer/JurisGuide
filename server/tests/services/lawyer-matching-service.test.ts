import { LawyerMatchingService } from '../../services/lawyer-matching-service';
import { MatchingCriteria, LegalCategory } from '../../types';

// Mock the database connection
jest.mock('../../database/config', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(() => Promise.resolve({
      query: jest.fn(),
      release: jest.fn()
    }))
  }
}));

describe('LawyerMatchingService', () => {
  let matchingService: LawyerMatchingService;
  let mockClient: any;

  beforeEach(() => {
    matchingService = new LawyerMatchingService();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    // Mock the database connection
    (matchingService as any).db = {
      connect: jest.fn(() => Promise.resolve(mockClient))
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findMatchingLawyers', () => {
    const mockCriteria: MatchingCriteria = {
      budget: { min: 100, max: 500, currency: 'USD' },
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001'
      },
      caseType: 'contract_dispute',
      urgency: 'high',
      languagePreference: 'English'
    };

    it('should find and score matching lawyers', async () => {
      const mockDbResult = {
        rows: [{
          id: 'lawyer-1',
          profile: {
            name: 'John Doe',
            barNumber: 'BAR123',
            jurisdiction: ['NY'],
            experience: 8,
            languages: ['English', 'Spanish'],
            bio: 'Experienced contract lawyer',
            education: []
          },
          specializations: ['contract_dispute'],
          location: {
            latitude: 40.7500,
            longitude: -73.9857,
            address: '456 Law St',
            city: 'New York',
            state: 'NY',
            country: 'USA',
            postalCode: '10002'
          },
          availability: {
            timezone: 'America/New_York',
            workingHours: { start: '09:00', end: '17:00' },
            workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            emergencyAvailable: true
          },
          pricing: {
            consultationFee: 200,
            hourlyRate: 350,
            currency: 'USD',
            paymentMethods: ['credit_card']
          },
          verification_status: 'verified',
          created_at: new Date(),
          updated_at: new Date(),
          ratings: [
            { userId: 'user-1', score: 5, review: 'Excellent', createdAt: new Date() },
            { userId: 'user-2', score: 4, review: 'Good', createdAt: new Date() }
          ],
          avg_rating: 4.5,
          rating_count: 2,
          distance_km: 5.2
        }]
      };

      mockClient.query.mockResolvedValue(mockDbResult);

      const results = await matchingService.findMatchingLawyers(mockCriteria);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('lawyer');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('factors');
      
      expect(results[0].lawyer.id).toBe('lawyer-1');
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].factors).toHaveProperty('distance');
      expect(results[0].factors).toHaveProperty('rating');
      expect(results[0].factors).toHaveProperty('experience');
      expect(results[0].factors).toHaveProperty('pricing');
    });

    it('should handle empty results', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const results = await matchingService.findMatchingLawyers(mockCriteria);

      expect(results).toHaveLength(0);
    });
  });

  describe('scoring algorithms', () => {
    let service: LawyerMatchingService;

    beforeEach(() => {
      service = new LawyerMatchingService();
    });

    describe('calculateDistanceScore', () => {
      it('should give highest score for closest distance', () => {
        const score1 = (service as any).calculateDistanceScore(2);
        const score2 = (service as any).calculateDistanceScore(50);
        const score3 = (service as any).calculateDistanceScore(150);

        expect(score1).toBeGreaterThan(score2);
        expect(score2).toBeGreaterThan(score3);
        expect(score1).toBe(1.0);
      });
    });

    describe('calculateRatingScore', () => {
      it('should handle no ratings with neutral score', () => {
        const score = (service as any).calculateRatingScore(0, 0);
        expect(score).toBe(0.5);
      });

      it('should give higher scores for better ratings', () => {
        const score1 = (service as any).calculateRatingScore(5, 10);
        const score2 = (service as any).calculateRatingScore(3, 10);
        
        expect(score1).toBeGreaterThan(score2);
      });

      it('should consider rating count for reliability', () => {
        const score1 = (service as any).calculateRatingScore(5, 1);
        const score2 = (service as any).calculateRatingScore(5, 10);
        
        expect(score2).toBeGreaterThan(score1);
      });
    });

    describe('calculateExperienceScore', () => {
      it('should give higher scores for more experience', () => {
        const score1 = (service as any).calculateExperienceScore(1);
        const score2 = (service as any).calculateExperienceScore(5);
        const score3 = (service as any).calculateExperienceScore(15);

        expect(score2).toBeGreaterThan(score1);
        expect(score3).toBeGreaterThan(score2);
        expect(score3).toBe(1.0);
      });
    });

    describe('calculatePricingScore', () => {
      it('should give best score for rates within min budget', () => {
        const budget = { min: 200, max: 500 };
        const score = (service as any).calculatePricingScore(150, budget);
        expect(score).toBe(1.0);
      });

      it('should give zero score for rates over budget', () => {
        const budget = { min: 200, max: 500 };
        const score = (service as any).calculatePricingScore(600, budget);
        expect(score).toBe(0);
      });

      it('should give decreasing score within budget range', () => {
        const budget = { min: 200, max: 500 };
        const score1 = (service as any).calculatePricingScore(250, budget);
        const score2 = (service as any).calculatePricingScore(450, budget);
        
        expect(score1).toBeGreaterThan(score2);
      });
    });

    describe('calculateAvailabilityScore', () => {
      it('should give higher scores for emergency availability on critical cases', () => {
        const availability1 = { emergencyAvailable: true };
        const availability2 = { emergencyAvailable: false };
        
        const score1 = (service as any).calculateAvailabilityScore(availability1, 'critical');
        const score2 = (service as any).calculateAvailabilityScore(availability2, 'critical');
        
        expect(score1).toBeGreaterThan(score2);
        expect(score1).toBe(1.0);
      });
    });

    describe('calculateSpecializationScore', () => {
      it('should give high score for matching specialization', () => {
        const specializations = ['contract_dispute', 'business_law'];
        const score = (service as any).calculateSpecializationScore(specializations, 'contract_dispute');
        
        expect(score).toBeGreaterThan(0.7);
      });

      it('should give low score for non-matching specialization', () => {
        const specializations = ['family_law', 'criminal_law'];
        const score = (service as any).calculateSpecializationScore(specializations, 'contract_dispute');
        
        expect(score).toBe(0.2);
      });

      it('should give bonus for focused specialization', () => {
        const focused = ['contract_dispute'];
        const broad = ['contract_dispute', 'family_law', 'criminal_law', 'business_law', 'tax_law'];
        
        const score1 = (service as any).calculateSpecializationScore(focused, 'contract_dispute');
        const score2 = (service as any).calculateSpecializationScore(broad, 'contract_dispute');
        
        expect(score1).toBeGreaterThan(score2);
      });
    });

    describe('calculateLanguageScore', () => {
      it('should give perfect score for preferred language match', () => {
        const languages = ['English', 'Spanish'];
        const score = (service as any).calculateLanguageScore(languages, 'English');
        
        expect(score).toBe(1.0);
      });

      it('should give fallback score for English when preferred not available', () => {
        const languages = ['English', 'French'];
        const score = (service as any).calculateLanguageScore(languages, 'Spanish');
        
        expect(score).toBe(0.7);
      });

      it('should give low score when no language match', () => {
        const languages = ['French', 'German'];
        const score = (service as any).calculateLanguageScore(languages, 'Spanish');
        
        expect(score).toBe(0.3);
      });
    });
  });

  describe('getMatchingExplanation', () => {
    it('should provide explanations for matching factors', async () => {
      const mockMatchingScore = {
        lawyer: {
          id: 'lawyer-1',
          profile: {
            name: 'John Doe',
            barNumber: 'BAR123',
            jurisdiction: ['NY'],
            experience: 8,
            languages: ['English'],
            bio: 'Test',
            education: []
          },
          specializations: ['contract_dispute'] as LegalCategory[],
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: '123 Main St',
            city: 'New York',
            state: 'NY',
            country: 'USA',
            postalCode: '10001'
          },
          availability: {
            timezone: 'America/New_York',
            workingHours: { start: '09:00', end: '17:00' },
            workingDays: ['Monday'],
            emergencyAvailable: false
          },
          pricing: {
            consultationFee: 200,
            hourlyRate: 350,
            currency: 'USD',
            paymentMethods: ['credit_card']
          },
          ratings: [
            { userId: 'user-1', score: 5, review: 'Great', createdAt: new Date() }
          ],
          verificationStatus: 'verified' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        score: 0.85,
        factors: {
          distance: 0.9,
          rating: 0.8,
          experience: 0.8,
          pricing: 0.7,
          availability: 0.6,
          specialization: 0.9,
          language: 1.0,
          urgency: 0.5
        }
      };

      const criteria: MatchingCriteria = {
        budget: { min: 100, max: 500, currency: 'USD' },
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10001'
        },
        caseType: 'contract_dispute',
        urgency: 'high',
        languagePreference: 'English'
      };

      const explanations = await matchingService.getMatchingExplanation(mockMatchingScore, criteria);

      expect(explanations).toBeInstanceOf(Array);
      expect(explanations.length).toBeGreaterThan(0);
      expect(explanations.some(exp => exp.includes('Located nearby'))).toBe(true);
      expect(explanations.some(exp => exp.includes('Experienced lawyer'))).toBe(true);
    });
  });
});