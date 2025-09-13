# JurisGuide Platform Testing Suite

This comprehensive testing suite ensures the reliability, security, and quality of the JurisGuide platform through multiple layers of testing.

## Test Structure

```
tests/
├── unit/                     # Unit tests for business logic
├── integration/              # Integration tests for APIs and services
├── e2e/                      # End-to-end user workflow tests
├── performance/              # Load and stress testing
├── security/                 # Security and compliance testing
├── setup.ts                  # Test environment setup
├── basic.test.ts            # Basic test validation
└── README.md                # This file
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)

Tests individual components and business logic in isolation.

**Coverage:**
- Business logic validation
- Data transformation functions
- Utility functions
- Service layer methods

**Run Commands:**
```bash
npm run test:unit
```

### 2. Integration Tests (`tests/integration/`)

Tests interaction between different system components.

**Coverage:**
- API endpoint functionality
- Database operations with transactions
- External service integrations (AI, payments, maps)
- Service-to-service communication

**Run Commands:**
```bash
npm run test:integration
npm run test:database    # Database-specific tests
npm run test:api         # API endpoint tests
npm run test:ai          # AI service tests
npm run test:external    # External API tests
```

### 3. End-to-End Tests (`tests/e2e/`)

Tests complete user workflows across the entire application.

**Coverage:**
- Legal guidance workflow
- Lawyer matching and booking
- AI-powered mediation
- Cross-browser compatibility
- Mobile responsiveness

**Run Commands:**
```bash
npm run test:e2e                # Run all E2E tests
npm run test:e2e:headed         # Run with browser UI
npm run test:e2e:debug          # Debug mode
```

**Supported Browsers:**
- Chrome (Desktop)
- Firefox (Desktop)
- Safari (Desktop)
- Chrome Mobile (Pixel 5)
- Safari Mobile (iPhone 12)

### 4. Performance Tests (`tests/performance/`)

Tests system performance under various load conditions.

**Coverage:**
- Load testing with realistic user scenarios
- Stress testing to find breaking points
- AI service performance under load
- Database performance with concurrent users

**Run Commands:**
```bash
npm run test:performance        # Standard load test
npm run test:stress            # Stress test
npm run test:performance:report # Generate detailed report
```

**Test Scenarios:**
- Legal guidance workflow (40% of traffic)
- Lawyer matching workflow (30% of traffic)
- Mediation workflow (20% of traffic)
- AI service load test (10% of traffic)

### 5. Security Tests (`tests/security/`)

Tests security vulnerabilities and compliance requirements.

**Coverage:**
- Authentication and authorization
- Data protection and encryption
- GDPR compliance
- AI bias detection
- Input validation and sanitization

**Run Commands:**
```bash
npm run test:security           # All security tests
npm run test:security:auth      # Authentication tests
npm run test:security:data      # Data protection tests
npm run test:security:bias      # AI bias detection tests
npm run test:security:full      # Full security audit with penetration tests
```

## Test Environment Setup

### Prerequisites

1. **Database:** PostgreSQL test database
2. **Redis:** Redis instance for caching tests
3. **Node.js:** Version 18+ with npm
4. **Browsers:** For E2E testing (automatically installed by Playwright)

### Environment Variables

Create a `.env.test` file with:

```env
NODE_ENV=test
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=jurisguide_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=password
TEST_REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret-key-for-testing-only
```

### Setup Commands

```bash
# Install dependencies
npm install

# Setup test database
npm run migrate

# Run basic test validation
npm test -- tests/basic.test.ts
```

## Running Tests

### Quick Start

```bash
# Run all tests
npm run test:all

# Run specific test category
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance
npm run test:security
```

### Continuous Integration

```bash
# CI-optimized test run
npm run test:ci
```

### Development Workflow

```bash
# Watch mode for development
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Data Management

### Test Database

- Uses separate test database (`jurisguide_test`)
- Automatic cleanup between tests
- Transaction rollbacks for isolation
- Seed data for consistent testing

### Mock Services

External services are mocked for reliable testing:

- **OpenAI API:** Mock responses for AI guidance
- **Stripe:** Mock payment processing
- **Google Maps:** Mock location services
- **Twilio/SendGrid:** Mock notifications

### Test Users

Predefined test users for different scenarios:

```javascript
// Standard test user
{
  email: 'test@example.com',
  password: 'password123',
  profile: { /* ... */ }
}

// Multi-cultural test users
{
  email: 'test-es@example.com',
  culturalBackground: 'Hispanic',
  preferredLanguage: 'es'
}
```

## Coverage Requirements

### Minimum Coverage Thresholds

- **Lines:** 80%
- **Functions:** 80%
- **Branches:** 80%
- **Statements:** 80%

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## Performance Benchmarks

### Response Time Targets

- **API Endpoints:** < 200ms (95th percentile)
- **AI Guidance Generation:** < 30 seconds
- **Database Queries:** < 100ms
- **Page Load Times:** < 3 seconds

### Load Testing Targets

- **Concurrent Users:** 200+ users
- **Requests per Second:** 1000+ RPS
- **Error Rate:** < 1%
- **Uptime:** 99.9%

## Security Testing

### Security Test Categories

1. **Authentication Security**
   - Password policy enforcement
   - JWT token security
   - Session management
   - Rate limiting

2. **Data Protection**
   - Encryption at rest and in transit
   - Data anonymization
   - GDPR compliance
   - Access control

3. **AI Bias Detection**
   - Gender bias detection
   - Racial/ethnic bias detection
   - Socioeconomic bias detection
   - Cultural sensitivity validation

### Security Metrics

- **Security Score:** Target 95%+
- **Vulnerability Count:** 0 critical, < 5 medium
- **Bias Detection Rate:** > 90%
- **Compliance Score:** 100% for GDPR requirements

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check PostgreSQL is running
   pg_isready -h localhost -p 5432
   
   # Verify test database exists
   psql -h localhost -U postgres -l | grep jurisguide_test
   ```

2. **Redis Connection Errors**
   ```bash
   # Check Redis is running
   redis-cli ping
   
   # Verify Redis database 1 is accessible
   redis-cli -n 1 ping
   ```

3. **E2E Test Failures**
   ```bash
   # Install Playwright browsers
   npx playwright install
   
   # Run E2E tests in headed mode for debugging
   npm run test:e2e:headed
   ```

4. **Performance Test Issues**
   ```bash
   # Ensure server is running
   npm run dev
   
   # Check server is accessible
   curl http://localhost:5000/health
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm test

# Run specific test with verbose output
npm test -- --verbose tests/specific-test.ts
```

## Contributing

### Adding New Tests

1. **Unit Tests:** Add to `tests/unit/`
2. **Integration Tests:** Add to `tests/integration/`
3. **E2E Tests:** Add to `tests/e2e/`
4. **Security Tests:** Add to `tests/security/`

### Test Naming Conventions

- **Files:** `*.test.ts` or `*.spec.ts`
- **Describe blocks:** Feature or component name
- **Test cases:** "should [expected behavior]"

### Best Practices

1. **Isolation:** Each test should be independent
2. **Cleanup:** Always clean up test data
3. **Mocking:** Mock external dependencies
4. **Assertions:** Use descriptive assertion messages
5. **Documentation:** Comment complex test logic

## Reporting

### Test Reports

- **Jest:** JSON and HTML reports
- **Playwright:** HTML reports with screenshots
- **Artillery:** Performance reports with metrics
- **Security:** Vulnerability and compliance reports

### Metrics Dashboard

Key metrics tracked:

- Test pass/fail rates
- Coverage percentages
- Performance benchmarks
- Security scores
- Bias detection rates

## Automation

### CI/CD Integration

Tests are automatically run on:

- Pull request creation
- Code commits to main branch
- Scheduled nightly runs
- Release deployments

### Notifications

Test results are reported via:

- GitHub status checks
- Slack notifications
- Email alerts for failures
- Dashboard updates

## Support

For testing support and questions:

1. Check this documentation
2. Review test logs and error messages
3. Consult the troubleshooting section
4. Contact the development team

---

**Last Updated:** January 2024
**Version:** 1.0.0