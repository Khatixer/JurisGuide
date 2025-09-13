import { LawyerService } from '../../services/lawyer-service';
import { Lawyer, MatchingCriteria, LegalCategory } from '../../types';

// Mock the database connection
jest.mock('../../database/config', () => ({
  getDatabaseConnection: jest.fn(() => ({
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn()
    }))
  }))
}));

describe('LawyerService', () => {
  let lawyerService: LawyerService;
  let mockClient: any;

  beforeEach(() => {
    lawyerService = new LawyerService();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    // Mock the database connection
    (lawyerService as any).db = {
      connect: jest.fn(() => Promise.resolve(mockClient))
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerLawyer', () => {
    it('should register a new lawyer successfully', async () => {
      const lawyerData = {
        profile: {
          name: 'John Doe',
          barNumber: 'BAR123456',
          jurisdiction: ['NY', 'CA'],
          experience: 5,
          languages: ['English', 'Spanish'],
          bio: 'Experienced lawyer specializing in contract disputes and business law.',
          education: [{
            institution: 'Harvard Law School',
            degree: 'JD',
            year: 2018,
            jurisdiction: 'NY'
          }]
        },
        specializations: ['contract_dispute', 'business_law'] as LegalCategory[],
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
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          emergencyAvailable: false
        },
        pricing: {
          consultationFee: 200,
          hourlyRate: 350,
          currency: 'USD',
          paymentMethods: ['credit_card', 'bank_transfer']
        }
      };

      const mockResult = {
        rows: [{
          id: 'lawyer-123',
          profile: lawyerData.profile,
          specializations: lawyerData.specializations,
          location: lawyerData.location,
          availability: lawyerData.availability,
          pricing: lawyerData.pricing,
          verification_status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await lawyerService.registerLawyer(lawyerData);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lawyers'),
        expect.arrayContaining([
          JSON.stringify(lawyerData.profile),
          lawyerData.specializations,
          JSON.stringify(lawyerData.location),
          JSON.stringify(lawyerData.availability),
          JSON.stringify(lawyerData.pricing)
        ])
      );

      expect(result).toMatchObject({
        id: 'lawyer-123',
        profile: lawyerData.profile,
        specializations: lawyerData.specializations,
        verificationStatus: 'pending'
      });
    });
  });

  describe('getLawyerById', () => {
    it('should return lawyer with ratings', async () => {
      const mockResult = {
        rows: [{
          id: 'lawyer-123',
          profile: { name: 'John Doe' },
          specializations: ['contract_dispute'],
          location: { city: 'New York' },
          availability: { timezone: 'America/New_York' },
          pricing: { hourlyRate: 350 },
          verification_status: 'verified',
          created_at: new Date(),
          updated_at: new Date(),
          ratings: [
            { userId: 'user-1', score: 5, review: 'Excellent lawyer', createdAt: new Date() }
          ]
        }]
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await lawyerService.getLawyerById('lawyer-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT l.*'),
        ['lawyer-123']
      );

      expect(result).toMatchObject({
        id: 'lawyer-123',
        verificationStatus: 'verified',
        ratings: expect.arrayContaining([
          expect.objectContaining({ score: 5 })
        ])
      });
    });

    it('should return null if lawyer not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await lawyerService.getLawyerById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('searchLawyers', () => {
    it('should search lawyers based on criteria', async () => {
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

      const mockResult = {
        rows: [{
          id: 'lawyer-123',
          profile: { name: 'John Doe', languages: ['English'] },
          specializations: ['contract_dispute'],
          location: { latitude: 40.7128, longitude: -74.0060 },
          availability: { timezone: 'America/New_York' },
          pricing: { hourlyRate: 350, consultationFee: 200 },
          verification_status: 'verified',
          created_at: new Date(),
          updated_at: new Date(),
          ratings: [],
          distance_km: 5.2
        }]
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await lawyerService.searchLawyers(criteria);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE l.verification_status = \'verified\''),
        expect.arrayContaining([
          criteria.location.latitude,
          criteria.location.longitude,
          criteria.caseType,
          criteria.budget.max,
          criteria.budget.max,
          criteria.languagePreference,
          criteria.urgency
        ])
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'lawyer-123',
        verificationStatus: 'verified'
      });
    });
  });

  describe('updateVerificationStatus', () => {
    it('should update lawyer verification status', async () => {
      const mockUpdateResult = { rows: [{ id: 'lawyer-123' }] };
      const mockGetResult = {
        rows: [{
          id: 'lawyer-123',
          verification_status: 'verified',
          profile: { name: 'John Doe' },
          specializations: ['contract_dispute'],
          location: { city: 'New York' },
          availability: { timezone: 'America/New_York' },
          pricing: { hourlyRate: 350 },
          created_at: new Date(),
          updated_at: new Date(),
          ratings: []
        }]
      };

      mockClient.query
        .mockResolvedValueOnce(mockUpdateResult)
        .mockResolvedValueOnce(mockGetResult);

      const result = await lawyerService.updateVerificationStatus('lawyer-123', 'verified');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lawyers SET verification_status'),
        ['verified', 'lawyer-123']
      );

      expect(result).toMatchObject({
        id: 'lawyer-123',
        verificationStatus: 'verified'
      });
    });
  });

  describe('addRating', () => {
    it('should add rating for lawyer', async () => {
      const mockResult = {
        rows: [{
          user_id: 'user-123',
          score: 5,
          review: 'Excellent service',
          created_at: new Date()
        }]
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await lawyerService.addRating('lawyer-123', 'user-123', 5, 'Excellent service');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lawyer_ratings'),
        ['lawyer-123', 'user-123', 5, 'Excellent service']
      );

      expect(result).toMatchObject({
        userId: 'user-123',
        score: 5,
        review: 'Excellent service'
      });
    });
  });

  describe('getLawyersBySpecialization', () => {
    it('should return lawyers by specialization', async () => {
      const mockResult = {
        rows: [{
          id: 'lawyer-123',
          profile: { name: 'John Doe' },
          specializations: ['contract_dispute'],
          location: { city: 'New York' },
          availability: { timezone: 'America/New_York' },
          pricing: { hourlyRate: 350 },
          verification_status: 'verified',
          created_at: new Date(),
          updated_at: new Date(),
          ratings: []
        }]
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await lawyerService.getLawyersBySpecialization('contract_dispute');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE l.verification_status = \'verified\''),
        ['contract_dispute']
      );

      expect(result).toHaveLength(1);
      expect(result[0].specializations).toContain('contract_dispute');
    });
  });
});