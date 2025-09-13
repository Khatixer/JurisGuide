import { Pool, PoolClient } from 'pg';
import { testDb, seedTestData } from '../setup';
import { DatabaseOperations } from '../../database/operations';

describe('Database Operations Integration Tests', () => {
  let dbOps: DatabaseOperations;
  let client: PoolClient;

  beforeAll(async () => {
    dbOps = new DatabaseOperations(testDb);
  });

  beforeEach(async () => {
    // Start transaction for each test
    client = await testDb.connect();
    await client.query('BEGIN');
    
    // Seed test data within transaction
    await seedTestData();
  });

  afterEach(async () => {
    // Rollback transaction after each test
    await client.query('ROLLBACK');
    client.release();
  });

  describe('User Operations', () => {
    test('should create user with profile and preferences', async () => {
      const userData = {
        email: 'newuser@test.com',
        passwordHash: '$2a$10$test.hash',
        profile: {
          firstName: 'Test',
          lastName: 'User',
          location: { country: 'US', state: 'NY', city: 'New York' },
          culturalBackground: 'Western',
          preferredLanguage: 'en',
          timezone: 'America/New_York'
        },
        preferences: {
          communicationStyle: 'formal',
          notificationSettings: { email: true, sms: false },
          privacyLevel: 'high'
        }
      };

      const user = await dbOps.createUser(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.profile.firstName).toBe(userData.profile.firstName);
      expect(user.preferences.communicationStyle).toBe(userData.preferences.communicationStyle);
    });

    test('should retrieve user by ID with all related data', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      
      const user = await dbOps.getUserById(userId);

      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.profile).toBeDefined();
      expect(user.preferences).toBeDefined();
    });

    test('should update user profile and preferences', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const updates = {
        profile: {
          firstName: 'Updated',
          lastName: 'Name',
          location: { country: 'CA', state: 'ON', city: 'Toronto' },
          culturalBackground: 'Western',
          preferredLanguage: 'en',
          timezone: 'America/Toronto'
        },
        preferences: {
          communicationStyle: 'casual',
          notificationSettings: { email: false, sms: true },
          privacyLevel: 'medium'
        }
      };

      const updatedUser = await dbOps.updateUser(userId, updates);

      expect(updatedUser.profile.firstName).toBe('Updated');
      expect(updatedUser.preferences.communicationStyle).toBe('casual');
    });

    test('should handle user not found', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-999999999999';
      
      const user = await dbOps.getUserById(nonExistentId);
      
      expect(user).toBeNull();
    });
  });

  describe('Legal Query Operations', () => {
    test('should create legal query with proper validation', async () => {
      const queryData = {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Need help with employment contract',
        category: 'employment-law',
        jurisdiction: ['US-CA', 'US-NY'],
        urgency: 'medium',
        culturalContext: 'Western corporate environment',
        language: 'en'
      };

      const query = await dbOps.createLegalQuery(queryData);

      expect(query.id).toBeDefined();
      expect(query.userId).toBe(queryData.userId);
      expect(query.description).toBe(queryData.description);
      expect(query.jurisdiction).toEqual(queryData.jurisdiction);
      expect(query.status).toBe('pending');
    });

    test('should retrieve queries by user ID', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      
      // Create multiple queries
      await dbOps.createLegalQuery({
        userId,
        description: 'Query 1',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'low',
        language: 'en'
      });

      await dbOps.createLegalQuery({
        userId,
        description: 'Query 2',
        category: 'family-law',
        jurisdiction: ['US-NY'],
        urgency: 'high',
        language: 'en'
      });

      const queries = await dbOps.getLegalQueriesByUserId(userId);

      expect(queries).toHaveLength(2);
      expect(queries[0].userId).toBe(userId);
      expect(queries[1].userId).toBe(userId);
    });

    test('should update query status', async () => {
      const queryData = {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Test query',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'low',
        language: 'en'
      };

      const query = await dbOps.createLegalQuery(queryData);
      const updatedQuery = await dbOps.updateQueryStatus(query.id, 'processed');

      expect(updatedQuery.status).toBe('processed');
    });
  });

  describe('Lawyer Operations', () => {
    test('should create lawyer profile with specializations', async () => {
      const lawyerData = {
        profile: {
          name: 'Jane Doe',
          barNumber: 'NY987654',
          jurisdiction: ['US-NY'],
          experience: 8,
          languages: ['en', 'fr'],
          bio: 'Corporate law specialist',
          education: [{ degree: 'JD', school: 'NYU Law', year: 2015 }]
        },
        specializations: ['corporate-law', 'securities'],
        location: { country: 'US', state: 'NY', city: 'New York' },
        availability: { schedule: 'weekdays', timezone: 'America/New_York' },
        pricing: { hourlyRate: 400, consultationFee: 150 }
      };

      const lawyer = await dbOps.createLawyer(lawyerData);

      expect(lawyer.id).toBeDefined();
      expect(lawyer.profile.name).toBe(lawyerData.profile.name);
      expect(lawyer.specializations).toEqual(lawyerData.specializations);
      expect(lawyer.verificationStatus).toBe('pending');
    });

    test('should search lawyers by criteria', async () => {
      const searchCriteria = {
        specializations: ['family-law'],
        location: { country: 'US', state: 'CA' },
        maxHourlyRate: 350,
        languages: ['en']
      };

      const lawyers = await dbOps.searchLawyers(searchCriteria);

      expect(Array.isArray(lawyers)).toBe(true);
      lawyers.forEach(lawyer => {
        expect(lawyer.specializations.some(spec => 
          searchCriteria.specializations.includes(spec)
        )).toBe(true);
      });
    });

    test('should update lawyer verification status', async () => {
      const lawyerId = '660e8400-e29b-41d4-a716-446655440001';
      
      const updatedLawyer = await dbOps.updateLawyerVerification(lawyerId, 'verified');

      expect(updatedLawyer.verificationStatus).toBe('verified');
    });
  });

  describe('Mediation Case Operations', () => {
    test('should create mediation case with multiple parties', async () => {
      const caseData = {
        parties: [
          { userId: '550e8400-e29b-41d4-a716-446655440001', role: 'complainant' },
          { userId: '550e8400-e29b-41d4-a716-446655440002', role: 'respondent' }
        ],
        disputeDetails: {
          summary: 'Service delivery dispute',
          category: 'contract-law',
          jurisdiction: ['US-CA'],
          culturalFactors: ['business-practices', 'communication-styles']
        },
        aiMediatorConfig: {
          model: 'gpt-4',
          culturalSensitivity: 'high',
          language: 'en'
        }
      };

      const mediationCase = await dbOps.createMediationCase(caseData);

      expect(mediationCase.id).toBeDefined();
      expect(mediationCase.parties).toHaveLength(2);
      expect(mediationCase.status).toBe('active');
      expect(mediationCase.disputeDetails.summary).toBe(caseData.disputeDetails.summary);
    });

    test('should retrieve mediation cases by party', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      
      const cases = await dbOps.getMediationCasesByParty(userId);

      expect(Array.isArray(cases)).toBe(true);
      cases.forEach(case_ => {
        expect(case_.parties.some(party => party.userId === userId)).toBe(true);
      });
    });

    test('should add mediation event to case', async () => {
      // First create a mediation case
      const caseData = {
        parties: [
          { userId: '550e8400-e29b-41d4-a716-446655440001', role: 'complainant' },
          { userId: '550e8400-e29b-41d4-a716-446655440002', role: 'respondent' }
        ],
        disputeDetails: {
          summary: 'Test dispute',
          category: 'contract-law',
          jurisdiction: ['US-CA'],
          culturalFactors: []
        },
        aiMediatorConfig: { model: 'gpt-4', culturalSensitivity: 'medium', language: 'en' }
      };

      const mediationCase = await dbOps.createMediationCase(caseData);

      const eventData = {
        caseId: mediationCase.id,
        type: 'message',
        content: 'Initial mediation message',
        party: '550e8400-e29b-41d4-a716-446655440001'
      };

      const event = await dbOps.addMediationEvent(eventData);

      expect(event.id).toBeDefined();
      expect(event.caseId).toBe(mediationCase.id);
      expect(event.type).toBe('message');
      expect(event.content).toBe(eventData.content);
    });
  });

  describe('Transaction Handling', () => {
    test('should rollback transaction on error', async () => {
      const testClient = await testDb.connect();
      
      try {
        await testClient.query('BEGIN');
        
        // Create a user
        await testClient.query(
          'INSERT INTO users (email, password_hash, profile, preferences) VALUES ($1, $2, $3, $4)',
          ['transaction-test@example.com', 'hash', '{}', '{}']
        );
        
        // Intentionally cause an error (duplicate email)
        await testClient.query(
          'INSERT INTO users (email, password_hash, profile, preferences) VALUES ($1, $2, $3, $4)',
          ['transaction-test@example.com', 'hash', '{}', '{}']
        );
        
        await testClient.query('COMMIT');
      } catch (error) {
        await testClient.query('ROLLBACK');
      } finally {
        testClient.release();
      }

      // Verify no user was created
      const result = await testDb.query(
        'SELECT * FROM users WHERE email = $1',
        ['transaction-test@example.com']
      );
      
      expect(result.rows).toHaveLength(0);
    });

    test('should handle concurrent access correctly', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      
      // Simulate concurrent updates
      const promises = Array.from({ length: 5 }, (_, i) => 
        dbOps.updateUser(userId, {
          profile: {
            firstName: `Concurrent${i}`,
            lastName: 'Test',
            location: { country: 'US', state: 'CA', city: 'Test' },
            culturalBackground: 'Western',
            preferredLanguage: 'en',
            timezone: 'America/Los_Angeles'
          }
        })
      );

      const results = await Promise.allSettled(promises);
      
      // At least one should succeed
      const successful = results.filter(result => result.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    test('should enforce foreign key constraints', async () => {
      const invalidQueryData = {
        userId: '550e8400-e29b-41d4-a716-999999999999', // Non-existent user
        description: 'Test query',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'low',
        language: 'en'
      };

      await expect(dbOps.createLegalQuery(invalidQueryData))
        .rejects.toThrow();
    });

    test('should validate required fields', async () => {
      const incompleteUserData = {
        email: '', // Empty email
        passwordHash: 'hash',
        profile: {},
        preferences: {}
      };

      await expect(dbOps.createUser(incompleteUserData as any))
        .rejects.toThrow();
    });

    test('should enforce unique constraints', async () => {
      const userData = {
        email: 'duplicate@test.com',
        passwordHash: 'hash',
        profile: { firstName: 'Test', lastName: 'User' },
        preferences: {}
      };

      await dbOps.createUser(userData as any);
      
      // Try to create another user with same email
      await expect(dbOps.createUser(userData as any))
        .rejects.toThrow();
    });
  });
});