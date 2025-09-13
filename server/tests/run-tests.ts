#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'unit',
    pattern: 'tests/unit/**/*.test.ts',
    description: 'Unit tests for business logic and utilities'
  },
  {
    name: 'integration',
    pattern: 'tests/integration/**/*.test.ts',
    description: 'Integration tests for APIs and external services'
  },
  {
    name: 'database',
    pattern: 'tests/integration/database-operations.test.ts',
    description: 'Database operations and transaction tests'
  },
  {
    name: 'api',
    pattern: 'tests/integration/api-endpoints.test.ts',
    description: 'API endpoint integration tests'
  },
  {
    name: 'ai',
    pattern: 'tests/integration/ai-services.test.ts',
    description: 'AI service integration tests'
  },
  {
    name: 'external',
    pattern: 'tests/integration/external-apis.test.ts',
    description: 'External API integration tests'
  }
];

function runTestSuite(suite: TestSuite, options: { coverage?: boolean; verbose?: boolean } = {}) {
  console.log(`\n🧪 Running ${suite.name} tests: ${suite.description}`);
  console.log('=' .repeat(60));

  const jestArgs = [
    suite.pattern,
    options.verbose ? '--verbose' : '',
    options.coverage ? '--coverage' : '',
    '--passWithNoTests'
  ].filter(Boolean);

  try {
    execSync(`npx jest ${jestArgs.join(' ')}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`✅ ${suite.name} tests completed successfully`);
  } catch (error) {
    console.error(`❌ ${suite.name} tests failed`);
    throw error;
  }
}

function generateTestReport() {
  console.log('\n📊 Generating comprehensive test report...');
  
  try {
    execSync('npx jest --coverage --coverageReporters=text --coverageReporters=json-summary', {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      
      console.log('\n📈 Coverage Summary:');
      console.log('==================');
      console.log(`Lines: ${coverage.total.lines.pct}%`);
      console.log(`Functions: ${coverage.total.functions.pct}%`);
      console.log(`Branches: ${coverage.total.branches.pct}%`);
      console.log(`Statements: ${coverage.total.statements.pct}%`);
    }
  } catch (error) {
    console.warn('Could not generate coverage report:', error instanceof Error ? error.message : String(error));
  }
}

function validateTestEnvironment() {
  console.log('🔍 Validating test environment...');
  
  const requiredEnvVars = [
    'TEST_DB_NAME',
    'TEST_DB_USER',
    'TEST_REDIS_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Using default values for missing variables');
  }

  // Set default values
  process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'jurisguide_test';
  process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'postgres';
  process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'password';
  process.env.TEST_REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  
  console.log('✅ Test environment validated');
}

async function main() {
  const args = process.argv.slice(2);
  const suiteArg = args.find(arg => !arg.startsWith('--'));
  const coverage = args.includes('--coverage');
  const verbose = args.includes('--verbose');
  const all = args.includes('--all') || !suiteArg;

  console.log('🚀 JurisGuide Platform Test Runner');
  console.log('==================================');

  validateTestEnvironment();

  if (all) {
    console.log('\n🎯 Running all test suites...');
    
    for (const suite of testSuites) {
      try {
        runTestSuite(suite, { coverage: false, verbose });
      } catch (error) {
        console.error(`Test suite ${suite.name} failed, continuing with others...`);
      }
    }
    
    if (coverage) {
      generateTestReport();
    }
  } else {
    const suite = testSuites.find(s => s.name === suiteArg);
    if (!suite) {
      console.error(`❌ Unknown test suite: ${suiteArg}`);
      console.log('\nAvailable test suites:');
      testSuites.forEach(s => console.log(`  - ${s.name}: ${s.description}`));
      process.exit(1);
    }
    
    runTestSuite(suite, { coverage, verbose });
  }

  console.log('\n🎉 Test execution completed!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { runTestSuite, testSuites };