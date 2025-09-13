#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface SecurityTestSuite {
  name: string;
  pattern: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const securityTestSuites: SecurityTestSuite[] = [
  {
    name: 'authentication',
    pattern: 'tests/security/authentication-security.test.ts',
    description: 'Authentication and authorization security tests',
    severity: 'critical'
  },
  {
    name: 'data-protection',
    pattern: 'tests/security/data-protection.test.ts',
    description: 'Data encryption, privacy, and GDPR compliance tests',
    severity: 'critical'
  },
  {
    name: 'ai-bias',
    pattern: 'tests/security/ai-bias-detection.test.ts',
    description: 'AI bias detection and cultural sensitivity tests',
    severity: 'high'
  }
];

interface SecurityTestResult {
  suite: string;
  passed: boolean;
  vulnerabilities: string[];
  recommendations: string[];
}

function runSecurityTestSuite(suite: SecurityTestSuite): SecurityTestResult {
  console.log(`\n🔒 Running ${suite.name} security tests (${suite.severity} severity)`);
  console.log('=' .repeat(70));

  const result: SecurityTestResult = {
    suite: suite.name,
    passed: false,
    vulnerabilities: [],
    recommendations: []
  };

  try {
    execSync(`npx jest ${suite.pattern} --verbose`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    result.passed = true;
    console.log(`✅ ${suite.name} security tests passed`);
  } catch (error) {
    result.passed = false;
    console.error(`❌ ${suite.name} security tests failed`);
    
    // Analyze failures for security implications
    result.vulnerabilities = analyzeSecurityFailures(suite.name, error);
    result.recommendations = generateSecurityRecommendations(suite.name, result.vulnerabilities);
  }

  return result;
}

function analyzeSecurityFailures(suiteName: string, error: any): string[] {
  const vulnerabilities: string[] = [];
  const errorOutput = error.toString();

  // Authentication vulnerabilities
  if (suiteName === 'authentication') {
    if (errorOutput.includes('weak password')) {
      vulnerabilities.push('VULN-001: Weak password policy enforcement');
    }
    if (errorOutput.includes('JWT')) {
      vulnerabilities.push('VULN-002: JWT token security issues');
    }
    if (errorOutput.includes('rate limit')) {
      vulnerabilities.push('VULN-003: Insufficient rate limiting protection');
    }
    if (errorOutput.includes('SQL injection')) {
      vulnerabilities.push('VULN-004: SQL injection vulnerability');
    }
  }

  // Data protection vulnerabilities
  if (suiteName === 'data-protection') {
    if (errorOutput.includes('encryption')) {
      vulnerabilities.push('VULN-005: Data encryption implementation issues');
    }
    if (errorOutput.includes('GDPR')) {
      vulnerabilities.push('VULN-006: GDPR compliance violations');
    }
    if (errorOutput.includes('anonymization')) {
      vulnerabilities.push('VULN-007: Data anonymization failures');
    }
  }

  // AI bias vulnerabilities
  if (suiteName === 'ai-bias') {
    if (errorOutput.includes('bias')) {
      vulnerabilities.push('VULN-008: AI bias detection failures');
    }
    if (errorOutput.includes('cultural')) {
      vulnerabilities.push('VULN-009: Cultural sensitivity issues');
    }
  }

  return vulnerabilities;
}

function generateSecurityRecommendations(suiteName: string, vulnerabilities: string[]): string[] {
  const recommendations: string[] = [];

  vulnerabilities.forEach(vuln => {
    switch (true) {
      case vuln.includes('VULN-001'):
        recommendations.push('Implement stronger password policy with complexity requirements');
        recommendations.push('Add password strength meter to user interface');
        break;
      case vuln.includes('VULN-002'):
        recommendations.push('Review JWT implementation and token expiration policies');
        recommendations.push('Implement token refresh mechanism');
        break;
      case vuln.includes('VULN-003'):
        recommendations.push('Implement progressive rate limiting with exponential backoff');
        recommendations.push('Add CAPTCHA for suspicious activity');
        break;
      case vuln.includes('VULN-004'):
        recommendations.push('Review all database queries for parameterization');
        recommendations.push('Implement input sanitization middleware');
        break;
      case vuln.includes('VULN-005'):
        recommendations.push('Audit encryption implementation and key management');
        recommendations.push('Ensure AES-256 encryption is properly implemented');
        break;
      case vuln.includes('VULN-006'):
        recommendations.push('Review GDPR compliance procedures');
        recommendations.push('Implement data retention and deletion policies');
        break;
      case vuln.includes('VULN-007'):
        recommendations.push('Improve data anonymization algorithms');
        recommendations.push('Implement k-anonymity and differential privacy');
        break;
      case vuln.includes('VULN-008'):
        recommendations.push('Enhance AI bias detection algorithms');
        recommendations.push('Implement bias monitoring dashboard');
        break;
      case vuln.includes('VULN-009'):
        recommendations.push('Improve cultural sensitivity training for AI models');
        recommendations.push('Add cultural context validation');
        break;
    }
  });

  return recommendations;
}

function generateSecurityReport(results: SecurityTestResult[]): void {
  console.log('\n📊 Security Test Report');
  console.log('=' .repeat(50));

  const totalSuites = results.length;
  const passedSuites = results.filter(r => r.passed).length;
  const failedSuites = totalSuites - passedSuites;

  console.log(`\nOverall Results:`);
  console.log(`✅ Passed: ${passedSuites}/${totalSuites}`);
  console.log(`❌ Failed: ${failedSuites}/${totalSuites}`);

  if (failedSuites > 0) {
    console.log('\n🚨 Security Vulnerabilities Found:');
    results.forEach(result => {
      if (!result.passed && result.vulnerabilities.length > 0) {
        console.log(`\n${result.suite.toUpperCase()} SUITE:`);
        result.vulnerabilities.forEach(vuln => {
          console.log(`  ⚠️  ${vuln}`);
        });
      }
    });

    console.log('\n💡 Security Recommendations:');
    results.forEach(result => {
      if (!result.passed && result.recommendations.length > 0) {
        console.log(`\n${result.suite.toUpperCase()} SUITE:`);
        result.recommendations.forEach(rec => {
          console.log(`  🔧 ${rec}`);
        });
      }
    });
  }

  // Generate security score
  const securityScore = (passedSuites / totalSuites) * 100;
  console.log(`\n🛡️  Security Score: ${securityScore.toFixed(1)}%`);

  if (securityScore < 80) {
    console.log('⚠️  Security score is below recommended threshold (80%)');
    console.log('   Immediate action required to address security vulnerabilities');
  } else if (securityScore < 95) {
    console.log('⚡ Security score is good but can be improved');
  } else {
    console.log('🎉 Excellent security score!');
  }

  // Save report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    totalSuites,
    passedSuites,
    failedSuites,
    securityScore,
    results
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'security-report.json'),
    JSON.stringify(reportData, null, 2)
  );

  console.log('\n📄 Detailed report saved to security-report.json');
}

function runPenetrationTests(): void {
  console.log('\n🎯 Running Penetration Tests');
  console.log('=' .repeat(40));

  const penTestCommands = [
    {
      name: 'SQL Injection Test',
      command: 'npm run test:security:sql-injection',
      description: 'Test for SQL injection vulnerabilities'
    },
    {
      name: 'XSS Test',
      command: 'npm run test:security:xss',
      description: 'Test for cross-site scripting vulnerabilities'
    },
    {
      name: 'CSRF Test',
      command: 'npm run test:security:csrf',
      description: 'Test for cross-site request forgery vulnerabilities'
    }
  ];

  penTestCommands.forEach(test => {
    console.log(`\nRunning ${test.name}...`);
    try {
      execSync(test.command, { stdio: 'inherit', cwd: process.cwd() });
      console.log(`✅ ${test.name} passed`);
    } catch (error) {
      console.error(`❌ ${test.name} failed - potential vulnerability detected`);
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  const runPenTests = args.includes('--penetration');
  const suiteArg = args.find(arg => !arg.startsWith('--'));

  console.log('🔐 JurisGuide Security Test Suite');
  console.log('==================================');

  if (suiteArg) {
    const suite = securityTestSuites.find(s => s.name === suiteArg);
    if (!suite) {
      console.error(`❌ Unknown security test suite: ${suiteArg}`);
      console.log('\nAvailable security test suites:');
      securityTestSuites.forEach(s => {
        console.log(`  - ${s.name} (${s.severity}): ${s.description}`);
      });
      process.exit(1);
    }

    const result = runSecurityTestSuite(suite);
    generateSecurityReport([result]);
  } else {
    console.log('\n🎯 Running all security test suites...');
    
    const results: SecurityTestResult[] = [];
    
    for (const suite of securityTestSuites) {
      const result = runSecurityTestSuite(suite);
      results.push(result);
    }

    generateSecurityReport(results);

    if (runPenTests) {
      runPenetrationTests();
    }
  }

  console.log('\n🎉 Security testing completed!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('Security test runner failed:', error);
    process.exit(1);
  });
}

export { runSecurityTestSuite, securityTestSuites };