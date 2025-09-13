import { Pool } from 'pg';
import { createClient } from 'redis';

export default async function globalSetup() {
  console.log('Setting up test environment...');
  
  // Ensure test database exists
  const adminDb = new Pool({
    user: process.env.TEST_DB_USER || 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    database: 'postgres', // Connect to default database
    password: process.env.TEST_DB_PASSWORD || 'password',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
  });

  try {
    // Create test database if it doesn't exist
    await adminDb.query(`
      SELECT 1 FROM pg_database WHERE datname = '${process.env.TEST_DB_NAME || 'jurisguide_test'}'
    `).then(async (result) => {
      if (result.rows.length === 0) {
        await adminDb.query(`CREATE DATABASE ${process.env.TEST_DB_NAME || 'jurisguide_test'}`);
        console.log('Test database created');
      }
    });
  } catch (error) {
    console.log('Test database already exists or error creating:', error instanceof Error ? error.message : String(error));
  } finally {
    await adminDb.end();
  }

  // Test Redis connection
  const testRedis = createClient({
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1'
  });

  try {
    await testRedis.connect();
    await testRedis.ping();
    console.log('Redis connection successful');
    await testRedis.quit();
  } catch (error) {
    console.warn('Redis connection failed:', error instanceof Error ? error.message : String(error));
    console.warn('Some tests may fail without Redis');
  }

  console.log('Test environment setup complete');
}