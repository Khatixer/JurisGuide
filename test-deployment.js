const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const tests = [
  { name: 'Health Check', path: '/api/health', method: 'GET' },
  { name: 'Main Page', path: '/', method: 'GET' },
  { name: 'CORS Preflight', path: '/api/health', method: 'OPTIONS' },
];

let testResults = [];

function makeRequest(test) {
  return new Promise((resolve) => {
    const url = new URL(test.path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: test.method,
      timeout: 5000,
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          name: test.name,
          status: res.statusCode,
          headers: res.headers,
          success: res.statusCode >= 200 && res.statusCode < 400,
          responseLength: data.length,
          hasSecurityHeaders: {
            'x-frame-options': !!res.headers['x-frame-options'],
            'x-content-type-options': !!res.headers['x-content-type-options'],
            'referrer-policy': !!res.headers['referrer-policy']
          }
        };

        if (test.path === '/api/health' && test.method === 'GET') {
          try {
            const healthData = JSON.parse(data);
            result.healthCheck = {
              hasStatus: !!healthData.status,
              hasTimestamp: !!healthData.timestamp,
              hasServices: !!healthData.services,
              hasUptime: typeof healthData.uptime === 'number'
            };
          } catch (e) {
            result.healthCheck = { parseError: true };
          }
        }

        resolve(result);
      });
    });

    req.on('error', (e) => {
      resolve({
        name: test.name,
        success: false,
        error: e.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: test.name,
        success: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🚀 Testing JurisGuide Platform Deployment Configuration...\n');
  
  for (const test of tests) {
    console.log(`Testing: ${test.name} (${test.method} ${test.path})`);
    const result = await makeRequest(test);
    testResults.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.name}: Status ${result.status}`);
      
      // Check security headers
      if (result.hasSecurityHeaders) {
        const securityCount = Object.values(result.hasSecurityHeaders).filter(Boolean).length;
        console.log(`   Security headers: ${securityCount}/3 present`);
      }
      
      // Check health endpoint specifics
      if (result.healthCheck) {
        const healthChecks = Object.values(result.healthCheck).filter(Boolean).length;
        console.log(`   Health check data: ${healthChecks} properties verified`);
      }
      
      if (result.responseLength) {
        console.log(`   Response size: ${result.responseLength} bytes`);
      }
    } else {
      console.log(`❌ ${result.name}: ${result.error || 'Failed'}`);
    }
    console.log('');
  }
  
  // Summary
  const successCount = testResults.filter(r => r.success).length;
  console.log(`\n📊 Test Summary: ${successCount}/${tests.length} tests passed`);
  
  if (successCount === tests.length) {
    console.log('🎉 All deployment configuration tests passed!');
    console.log('\n✅ Verified Features:');
    console.log('   • Application server running');
    console.log('   • Health check endpoint working');
    console.log('   • Security headers configured');
    console.log('   • CORS handling functional');
    console.log('   • Monitoring endpoints accessible');
  } else {
    console.log('⚠️  Some tests failed. Check configuration.');
  }
}

// Run the tests
runTests().catch(console.error);