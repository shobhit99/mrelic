const fetch = require('node-fetch');

// Configuration
const API_ENDPOINT = 'http://localhost:3000/api/otel';

// Test sending logs with service.name header
async function testServiceNameHeader() {
  console.log('Testing service.name header extraction...');
  
  // Create a simple log entry
  const log = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Test log with service.name header',
    // Note: Not setting service here to test header extraction
  };
  
  try {
    // Send the log with service.name header
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'service.name': 'payments-service' // This should be used as the service name
      },
      body: JSON.stringify(log),
    });
    
    const data = await response.json();
    console.log('Response:', data);
    
    if (data.success && data.logs && data.logs.length > 0) {
      const processedLog = data.logs[0];
      console.log('Processed log:', processedLog);
      
      // Check if the service name was correctly extracted from the header
      if (processedLog.service === 'payments-service') {
        console.log('✅ SUCCESS: service.name header was correctly extracted!');
      } else {
        console.log('❌ FAILED: service.name header was not extracted correctly.');
        console.log(`Expected service: 'payments-service', got: '${processedLog.service}'`);
      }
    } else {
      console.log('❌ FAILED: No logs were returned in the response.');
    }
  } catch (error) {
    console.error('Error testing service.name header:', error);
  }
}

// Test sending logs with both header and body service name
async function testServiceNamePriority() {
  console.log('\nTesting service name priority (header vs body)...');
  
  // Create a log entry with service name in the body
  const log = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Test log with both header and body service names',
    service: 'body-service' // This should be overridden by the header
  };
  
  try {
    // Send the log with service.name header
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'service.name': 'header-service' // This should take priority
      },
      body: JSON.stringify(log),
    });
    
    const data = await response.json();
    
    if (data.success && data.logs && data.logs.length > 0) {
      const processedLog = data.logs[0];
      console.log('Processed log:', processedLog);
      
      // Check if the header service name took priority
      if (processedLog.service === 'header-service') {
        console.log('✅ SUCCESS: Header service.name correctly took priority!');
      } else {
        console.log('❌ FAILED: Header service.name did not take priority.');
        console.log(`Expected service: 'header-service', got: '${processedLog.service}'`);
      }
    } else {
      console.log('❌ FAILED: No logs were returned in the response.');
    }
  } catch (error) {
    console.error('Error testing service name priority:', error);
  }
}

// Run the tests
async function runTests() {
  await testServiceNameHeader();
  await testServiceNamePriority();
  console.log('\nTests completed!');
}

runTests();