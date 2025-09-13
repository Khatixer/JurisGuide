import request from 'supertest';
import express from 'express';
import lawyerRoutes from '../../routes/lawyers';
import { LawyerService } from '../../services/lawyer-service';
import { LegalCategory, Lawyer } from '../../types';

// Mock the LawyerService
jest.mock('../../services/lawyer-service');
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'user-123' };
    next();
  }
}));

// Mock the database pool
jest.mock('../../database/config', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(() => Promise.resolve({
      query: jest.fn(),
      release: jest.fn()
    }))
  }
}));

const app = express();
app.use(express.json());
app.use('/lawyers', lawyerRoutes);

describe('Lawyer Routes', () => {
  let mockLawyerService: jest.Mocked<LawyerService>;

  beforeEach(() => {
    mockLawyerService = new LawyerService() as jest.Mocked<LawyerService>;
    (LawyerService as jest.Mock).mockImplementation(() => mockLawyerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockLawyer = (overrides: Partial<Lawyer> = {}): Lawyer => ({
    id: 'lawyer-123',
    profile: {
      name: 'John Doe',
      barNumber: 'BAR123',
      jurisdiction: ['NY'],
      experience: 5,
      languages: ['English'],
      bio: 'Test bio',
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
    ratings: [],
    verificationStatus: 'verified',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  describe('POST /lawyers/register', () => {
    const validLawyerData = {
      profile: {
        name: 'John Doe',
        barNumber: 'BAR123456',
        jurisdiction: ['NY'],
        experience: 5,
        languages: ['English'],
        bio: 'Experienced lawyer specializing in contract disputes and business law.',
        education: [{
          institution: 'Harvard Law School',
          degree: 'JD',
          year: 2018,
          jurisdiction: 'NY'
        }]
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
      }
    };

    it('should register lawyer successfully', async () => {
      const mockLawyer = createMockLawyer({
        ...validLawyerData,
        verificationStatus: 'pending'
      });

      mockLawyerService.registerLawyer.mockResolvedValue(mockLawyer);

      const response = await request(app)
        .post('/lawyers/register')
        .send(validLawyerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('lawyer-123');
      expect(mockLawyerService.registerLawyer).toHaveBeenCalledWith(validLawyerData);
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = { ...validLawyerData };
      delete (invalidData as any).profile.name;

      const response = await request(app)
        .post('/lawyers/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /lawyers/:id', () => {
    it('should return lawyer profile', async () => {
      const mockLawyer = createMockLawyer();
      mockLawyerService.getLawyerById.mockResolvedValue(mockLawyer);

      const response = await request(app)
        .get('/lawyers/lawyer-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('lawyer-123');
      expect(mockLawyerService.getLawyerById).toHaveBeenCalledWith('lawyer-123');
    });

    it('should return 404 for non-existent lawyer', async () => {
      mockLawyerService.getLawyerById.mockResolvedValue(null);

      const response = await request(app)
        .get('/lawyers/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LAWYER_NOT_FOUND');
    });
  });

  describe('POST /lawyers/search', () => {
    const validCriteria = {
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
      caseType: 'contract_dispute' as LegalCategory,
      urgency: 'high',
      languagePreference: 'English'
    };

    it('should search lawyers successfully', async () => {
      const mockLawyers = [createMockLawyer()];
      mockLawyerService.searchLawyers.mockResolvedValue(mockLawyers);

      const response = await request(app)
        .post('/lawyers/search')
        .send(validCriteria)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockLawyerService.searchLawyers).toHaveBeenCalledWith(validCriteria);
    });

    it('should return validation error for invalid criteria', async () => {
      const invalidCriteria = { ...validCriteria };
      delete (invalidCriteria as any).budget;

      const response = await request(app)
        .post('/lawyers/search')
        .send(invalidCriteria)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /lawyers/specialization/:category', () => {
    it('should return lawyers by specialization', async () => {
      const mockLawyers = [createMockLawyer()];
      mockLawyerService.getLawyersBySpecialization.mockResolvedValue(mockLawyers);

      const response = await request(app)
        .get('/lawyers/specialization/contract_dispute')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockLawyerService.getLawyersBySpecialization).toHaveBeenCalledWith('contract_dispute');
    });
  });

  describe('PATCH /lawyers/:id/verification', () => {
    it('should update verification status', async () => {
      const mockLawyer = createMockLawyer({ verificationStatus: 'verified' });
      mockLawyerService.updateVerificationStatus.mockResolvedValue(mockLawyer);

      const response = await request(app)
        .patch('/lawyers/lawyer-123/verification')
        .send({ status: 'verified' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verificationStatus).toBe('verified');
      expect(mockLawyerService.updateVerificationStatus).toHaveBeenCalledWith('lawyer-123', 'verified');
    });

    it('should return error for invalid status', async () => {
      const response = await request(app)
        .patch('/lawyers/lawyer-123/verification')
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });

  describe('POST /lawyers/:id/ratings', () => {
    it('should add rating successfully', async () => {
      const mockRating = {
        userId: 'user-123',
        score: 5,
        review: 'Excellent service',
        createdAt: new Date()
      };

      mockLawyerService.addRating.mockResolvedValue(mockRating);

      const response = await request(app)
        .post('/lawyers/lawyer-123/ratings')
        .send({ score: 5, review: 'Excellent service' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.score).toBe(5);
      expect(mockLawyerService.addRating).toHaveBeenCalledWith('lawyer-123', 'user-123', 5, 'Excellent service');
    });

    it('should return error for invalid rating', async () => {
      const response = await request(app)
        .post('/lawyers/lawyer-123/ratings')
        .send({ score: 6 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_RATING');
    });
  });

  describe('GET /lawyers/:id/ratings', () => {
    it('should return lawyer ratings', async () => {
      const mockRatings = [{
        userId: 'user-123',
        score: 5,
        review: 'Excellent service',
        createdAt: new Date()
      }];

      mockLawyerService.getLawyerRatings.mockResolvedValue(mockRatings);

      const response = await request(app)
        .get('/lawyers/lawyer-123/ratings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockLawyerService.getLawyerRatings).toHaveBeenCalledWith('lawyer-123');
    });
  });
});