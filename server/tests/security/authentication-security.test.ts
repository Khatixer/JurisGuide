import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { testDb } from '../setup';
import authRoutes from '../../routes/auth';
import authMiddleware from '../../middleware/auth';

describe('Authentication Security Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    
    // Protected route for testing
    app.get('/api/protected', authMiddleware, (req, res) => {
      res.json({ message: 'Protected resource accessed', userId: req.user?.id });
    });
  });

  describe('Password Security', () => {
    test('should reject weak passwords', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'abc123',
        '12345678',
        'password123'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test-${Date.now()}@example.com`,
            password,
            profile: {
              firstName: 'Test',
              lastName: 'User',
              location: { country: 'US', state: 'CA', city: 'Test' },
              culturalBackground: 'Western',
              preferredLanguage: 'en',
              timezone: 'America/Los_Angeles'
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/password.*weak|password.*requirements/i);
      }
    });

    test('should accept strong passwords', async () => {
      const strongPasswords = [
        'MyStr0ng!P@ssw0rd',
        'C0mpl3x#P@ssw0rd!',
        'S3cur3$P@ssw0rd2024!'
      ];

      for (const password of strongPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `strong-${Date.now()}-${Math.random()}@example.com`,
            password,
            profile: {
              firstName: 'Test',
              lastName: 'User',
              location: { country: 'US', state: 'CA', city: 'Test' },
              culturalBackground: 'Western',
              preferredLanguage: 'en',
              timezone: 'America/Los_Angeles'
            }
          });

        expect(response.status).toBe(201);
        expect(response.body.token).toBeDefined();
      }
    });

    test('should properly hash passwords', async () => {
      const password = 'TestPassword123!';
      const email = `hash-test-${Date.now()}@example.com`;

      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password,
          profile: {
            firstName: 'Test',
            lastName: 'User',
            location: { country: 'US', state: 'CA', city: 'Test' },
            culturalBackground: 'Western',
            preferredLanguage: 'en',
            timezone: 'America/Los_Angeles'
          }
        });

      // Check that password is hashed in database
      const result = await testDb.query('SELECT password_hash FROM users WHERE email = $1', [email]);
      const storedHash = result.rows[0]?.password_hash;

      expect(storedHash).toBeDefined();
      expect(storedHash).not.toBe(password);
      expect(storedHash.startsWith('$2a$')).toBe(true); // bcrypt hash format
      
      // Verify hash can be validated
      const isValid = await bcrypt.compare(password, storedHash);
      expect(isValid).toBe(true);
    });
  });

  describe('JWT Token Security', () => {
    test('should generate secure JWT tokens', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `jwt-test-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
          profile: {
            firstName: 'JWT',
            lastName: 'Test',
            location: { country: 'US', state: 'CA', city: 'Test' },
            culturalBackground: 'Western',
            preferredLanguage: 'en',
            timezone: 'America/Los_Angeles'
          }
        });

      const token = response.body.token;
      expect(token).toBeDefined();

      // Verify token structure
      const decoded = jwt.decode(token, { complete: true });
      expect(decoded?.header.alg).toBe('HS256');
      expect(decoded?.payload.exp).toBeDefined();
      expect(decoded?.payload.iat).toBeDefined();
      expect(decoded?.payload.userId).toBeDefined();

      // Verify token expiration is reasonable (not too long)
      const exp = decoded?.payload.exp as number;
      const iat = decoded?.payload.iat as number;
      const tokenLifetime = exp - iat;
      expect(tokenLifetime).toBeLessThanOrEqual(24 * 60 * 60); // Max 24 hours
    });

    test('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid.token.here',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        'Bearer invalid-token',
        'malformed-token'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/protected')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      }
    });

    test('should reject expired JWT tokens', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: 'test-user-id', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/expired|invalid/i);
    });

    test('should reject tokens with invalid signatures', async () => {
      const tokenWithWrongSecret = jwt.sign(
        { userId: 'test-user-id', exp: Math.floor(Date.now() / 1000) + 3600 },
        'wrong-secret'
      );

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${tokenWithWrongSecret}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Rate Limiting and Brute Force Protection', () => {
    test('should implement rate limiting on login attempts', async () => {
      const email = 'rate-limit-test@example.com';
      const wrongPassword = 'wrongpassword';

      // Make multiple failed login attempts
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({ email, password: wrongPassword })
        );
      }

      const responses = await Promise.all(attempts);
      
      // Should start blocking after several attempts
      const blockedResponses = responses.filter(r => r.status === 429);
      expect(blockedResponses.length).toBeGreaterThan(0);
    });

    test('should implement account lockout after multiple failed attempts', async () => {
      const email = `lockout-test-${Date.now()}@example.com`;
      const correctPassword = 'CorrectPassword123!';
      const wrongPassword = 'wrongpassword';

      // First create the account
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: correctPassword,
          profile: {
            firstName: 'Lockout',
            lastName: 'Test',
            location: { country: 'US', state: 'CA', city: 'Test' },
            culturalBackground: 'Western',
            preferredLanguage: 'en',
            timezone: 'America/Los_Angeles'
          }
        });

      // Make multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email, password: wrongPassword });
      }

      // Try with correct password - should be locked
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password: correctPassword });

      expect(response.status).toBe(423); // Locked
      expect(response.body.error).toMatch(/locked|blocked/i);
    });
  });

  describe('Session Security', () => {
    test('should invalidate tokens on logout', async () => {
      // Register and login
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: `logout-test-${Date.now()}@example.com`,
          password: 'LogoutTest123!',
          profile: {
            firstName: 'Logout',
            lastName: 'Test',
            location: { country: 'US', state: 'CA', city: 'Test' },
            culturalBackground: 'Western',
            preferredLanguage: 'en',
            timezone: 'America/Los_Angeles'
          }
        });

      const token = registerResponse.body.token;

      // Verify token works
      let response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Verify token no longer works
      response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(401);
    });

    test('should handle concurrent sessions securely', async () => {
      const email = `concurrent-${Date.now()}@example.com`;
      const password = 'ConcurrentTest123!';

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password,
          profile: {
            firstName: 'Concurrent',
            lastName: 'Test',
            location: { country: 'US', state: 'CA', city: 'Test' },
            culturalBackground: 'Western',
            preferredLanguage: 'en',
            timezone: 'America/Los_Angeles'
          }
        });

      // Login multiple times to create multiple sessions
      const loginPromises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({ email, password })
      );

      const loginResponses = await Promise.all(loginPromises);
      const tokens = loginResponses.map(r => r.body.token);

      // All tokens should be valid initially
      for (const token of tokens) {
        const response = await request(app)
          .get('/api/protected')
          .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
      }

      // Logout from one session
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens[0]}`);

      // First token should be invalid, others should still work
      const firstTokenResponse = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${tokens[0]}`);
      expect(firstTokenResponse.status).toBe(401);

      const secondTokenResponse = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${tokens[1]}`);
      expect(secondTokenResponse.status).toBe(200);
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should prevent SQL injection in login', async () => {
      const sqlInjectionAttempts = [
        "admin'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin' UNION SELECT * FROM users --",
        "'; INSERT INTO users (email) VALUES ('hacked'); --"
      ];

      for (const maliciousInput of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: maliciousInput,
            password: 'password'
          });

        // Should not cause server error or successful login
        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      }
    });

    test('should sanitize user input in registration', async () => {
      const maliciousInputs = {
        email: '<script>alert("xss")</script>@example.com',
        firstName: '<img src=x onerror=alert("xss")>',
        lastName: 'javascript:alert("xss")',
        bio: '<script>document.location="http://evil.com"</script>'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: maliciousInputs.email,
          password: 'SecurePassword123!',
          profile: {
            firstName: maliciousInputs.firstName,
            lastName: maliciousInputs.lastName,
            location: { country: 'US', state: 'CA', city: 'Test' },
            culturalBackground: 'Western',
            preferredLanguage: 'en',
            timezone: 'America/Los_Angeles'
          }
        });

      if (response.status === 201) {
        // If registration succeeds, verify data is sanitized
        const user = response.body.user;
        expect(user.profile.firstName).not.toContain('<script>');
        expect(user.profile.firstName).not.toContain('onerror');
        expect(user.profile.lastName).not.toContain('javascript:');
      } else {
        // Should reject malicious input
        expect(response.status).toBe(400);
      }
    });

    test('should validate email format strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com',
        'user@domain',
        'user name@domain.com',
        'user@domain..com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email,
            password: 'ValidPassword123!',
            profile: {
              firstName: 'Test',
              lastName: 'User',
              location: { country: 'US', state: 'CA', city: 'Test' },
              culturalBackground: 'Western',
              preferredLanguage: 'en',
              timezone: 'America/Los_Angeles'
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/email.*invalid|invalid.*email/i);
      }
    });
  });
});