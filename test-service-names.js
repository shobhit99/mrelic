const fetch = require('node-fetch');

// Test different service names
const services = [
  'user-service',
  'payment-service', 
  'inventory-service',
  'notification-service',
  'api-gateway',
  'auth-service',
  'email-service',
  'sms-service'
];

const levels = ['debug', 'info', 'warn', 'error'];

async function sendTestLog(service, level, message) {
  const log = {
    timestamp: new Date().toISOString(),
    level: level,
    service: service,
    service_name: service, // Alternative field name
    message: message,
    environment: 'test',
    version: '1.0.0',
    instance: `instance-${Math.floor(Math.random() * 1000)}`
  };

  try {
    const response = await fetch('http://localhost:5959/api/otel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    });

    if (response.ok) {
      console.log(`✅ Sent log for ${service} (${level}): ${message}`);
    } else {
      console.log(`❌ Failed to send log for ${service}: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Error sending log for ${service}: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting service name tests...\n');

  // Test 1: Send logs with different service names
  console.log('📝 Test 1: Sending logs with different service names');
  for (const service of services) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const message = `Test log from ${service} service`;
    await sendTestLog(service, level, message);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between logs
  }

  // Test 2: Send logs with additional metadata
  console.log('\n📝 Test 2: Sending logs with additional metadata');
  const detailedLog = {
    timestamp: new Date().toISOString(),
    level: 'info',
    service: 'api-gateway',
    service_name: 'api-gateway',
    message: 'Request processed successfully',
    endpoint: '/api/users',
    method: 'GET',
    statusCode: 200,
    responseTime: 150,
    userId: 'user123',
    requestId: 'req-456',
    environment: 'production',
    version: '2.1.0'
  };

  try {
    const response = await fetch('http://localhost:5959/api/otel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(detailedLog),
    });

    if (response.ok) {
      console.log('✅ Sent detailed log with metadata');
    } else {
      console.log(`❌ Failed to send detailed log: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Error sending detailed log: ${error.message}`);
  }

  // Test 3: Send logs without service name (should default to 'system')
  console.log('\n📝 Test 3: Sending logs without service name');
  const logWithoutService = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    message: 'This log has no service name specified'
  };

  try {
    const response = await fetch('http://localhost:5959/api/otel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logWithoutService),
    });

    if (response.ok) {
      console.log('✅ Sent log without service name');
    } else {
      console.log(`❌ Failed to send log without service name: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Error sending log without service name: ${error.message}`);
  }

  console.log('\n✅ All tests completed!');
  console.log('📊 Check your application at http://localhost:5959 to see the logs with service names');
}

// Run the tests
runTests().catch(console.error); 