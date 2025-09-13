import { Pool } from 'pg';
import { createClient } from 'redis';
import fs from 'fs';
import path from 'path';

// Test database configuration
const testDbConfig = {
  user: process.env.TEST_DB_USER || 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  database: process.env.TEST_DB_NAME || 'jurisguide_test',
  password: process.env.TEST_DB_PASSWORD || 'password',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
};

// Test Redis configuration
const testRedisConfig = {
  url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1'
};

let testDb: Pool;
let testRedis: any;

// Global test setup
beforeAll(async () => {
  // Initialize test database
  testDb = new Pool(testDbConfig);
  
  // Initialize test Redis
  testRedis = createClient(testRedisConfig);
  await testRedis.connect();
  
  // Run migrations on test database
  await runTestMigrations();
  
  // Set environment variables for tests
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.GOOGLE_TRANSLATE_API_KEY = 'test-translate-key';
  process.env.STRIPE_SECRET_KEY = 'test-stripe-key';
  process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid';
  process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
  process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
});

// Global test teardown
afterAll(async () => {
  if (testDb) {
    await testDb.end();
  }
  if (testRedis) {
    await testRedis.quit();
  }
});

// Clean database before each test
beforeEach(async () => {
  await cleanTestDatabase();
  await testRedis.flushDb();
});

// Helper function to run migrations
async function runTestMigrations() {
  const migrationsDir = path.join(__dirname, '../database/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await testDb.query(migrationSQL);
  }
}

// Helper function to clean test database
async function cleanTestDatabase() {
  const tables = [
    'mediation_events',
    'mediation_cases',
    'lawyer_ratings',
    'consultation_bookings',
    'lawyers',
    'legal_guidance',
    'legal_queries',
    'user_sessions',
    'users',
    'subscription_plans',
    'user_subscriptions',
    'commission_transactions',
    'white_label_configs',
    'audit_logs',
    'encrypted_data'
  ];

  for (const table of tables) {
    try {
      await testDb.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    } catch (error) {
      // Table might not exist, continue
    }
  }
}

// Helper function to seed test data
export async function seedTestData() {
  // Create test users
  const testUsers = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'test1@example.com',
      password_hash: '$2a$10$test.hash.1',
      profile: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        location: { country: 'US', state: 'CA', city: 'San Francisco' },
        culturalBackground: 'Western',
        preferredLanguage: 'en',
        timezone: 'America/Los_Angeles'
      }),
      preferences: JSON.stringify({
        communicationStyle: 'formal',
        notificationSettings: { email: true, sms: false },
        privacyLevel: 'high'
      })
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      email: 'test2@example.com',
      password_hash: '$2a$10$test.hash.2',
      profile: JSON.stringify({
        firstName: 'Maria',
        lastName: 'Garcia',
        location: { country: 'ES', state: 'Madrid', city: 'Madrid' },
        culturalBackground: 'Hispanic',
        preferredLanguage: 'es',
        timezone: 'Europe/Madrid'
      }),
      preferences: JSON.stringify({
        communicationStyle: 'casual',
        notificationSettings: { email: true, sms: true },
        privacyLevel: 'medium'
      })
    }
  ];

  for (const user of testUsers) {
    await testDb.query(
      'INSERT INTO users (id, email, password_hash, profile, preferences) VALUES ($1, $2, $3, $4, $5)',
      [user.id, user.email, user.password_hash, user.profile, user.preferences]
    );
  }

  // Create test lawyers
  const testLawyers = [
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      profile: JSON.stringify({
        name: 'Sarah Johnson',
        barNumber: 'CA123456',
        jurisdiction: ['US-CA'],
        experience: 10,
        languages: ['en', 'es'],
        bio: 'Experienced family law attorney',
        education: [{ degree: 'JD', school: 'Stanford Law', year: 2013 }]
      }),
      specializations: ['family-law', 'immigration'],
      location: JSON.stringify({ country: 'US', state: 'CA', city: 'San Francisco' }),
      availability: JSON.stringify({ schedule: 'weekdays', timezone: 'America/Los_Angeles' }),
      pricing: JSON.stringify({ hourlyRate: 300, consultationFee: 100 }),
      verification_status: 'verified'
    }
  ];

  for (const lawyer of testLawyers) {
    await testDb.query(
      'INSERT INTO lawyers (id, profile, specializations, location, availability, pricing, verification_status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [lawyer.id, lawyer.profile, lawyer.specializations, lawyer.location, lawyer.availability, lawyer.pricing, lawyer.verification_status]
    );
  }
}

// Export test database and Redis instances
export { testDb, testRedis };

// Mock external services for testing
export const mockExternalServices = {
  openai: {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock AI response' } }]
        })
      }
    }
  },
  stripe: {
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' })
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' })
    }
  },
  twilio: {
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'msg_test123' })
    }
  },
  sendgrid: {
    send: jest.fn().mockResolvedValue([{ statusCode: 202 }])
  }
};