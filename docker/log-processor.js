#!/usr/bin/env node

const http = require('http');
const readline = require('readline');
const path = require('path');

// Get configuration from environment variables or command line arguments
const serverHost = process.env.MRELIC_HOST || 'localhost';
const serverPort = process.env.MRELIC_PORT || '3000';
const serviceName = process.argv[2] || process.env.SERVICE_NAME || path.basename(process.cwd());

console.log(`📡 Connecting to mrelic server on port ${serverPort}`);
console.log(`🏷️  Service: ${serviceName}`);
console.log(`Sending logs to: http://${serverHost}:${serverPort}/api/otel`);

// Create readline interface for stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Process each log line
rl.on('line', (line) => {
  try {
    // Try to parse as JSON
    let logData;
    try {
      logData = JSON.parse(line);
    } catch (e) {
      // If not JSON, create a simple log entry
      logData = {
        timestamp: Date.now(),
        level: 'info',
        message: line,
        service: serviceName
      };
    }

    // Ensure service name is set
    if (!logData.service) {
      logData.service = serviceName;
    }

    // Format timestamp if needed
    if (logData.timestamp && logData.timestamp > 1000000000000) {
      logData.timestamp = logData.timestamp / 1000;
    } else if (!logData.timestamp) {
      logData.timestamp = Date.now() / 1000;
    }

    // Format the log entry in the expected format
    const formattedLog = {
      timestamp: logData.timestamp,
      level: logData.level || 'info',
      message: logData.message || logData.msg || '',  // Handle both 'message' and 'msg' (logrus)
      meta: {}
    };

    // Move all other fields to meta
    for (const [key, value] of Object.entries(logData)) {
      if (key !== 'timestamp' && key !== 'level' && key !== 'message' && key !== 'msg') {
        formattedLog.meta[key] = value;
      }
    }

    // Send to server
    sendLogToServer(formattedLog);

    // Also output to stdout for debugging
    console.log(JSON.stringify(formattedLog));

  } catch (error) {
    console.error('Error processing log line:', error);
  }
});

// Handle end of input
rl.on('close', () => {
  console.log('📝 Log processing completed');
});

// Function to send log to server
function sendLogToServer(logData) {
  const postData = JSON.stringify(logData);
  
  const options = {
    hostname: serverHost,
    port: parseInt(serverPort),
    path: '/api/otel',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'service.name': serviceName
    }
  };

  const req = http.request(options, (res) => {
    // Consume response data
    res.on('data', () => {});
    res.on('end', () => {});
  });

  req.on('error', (error) => {
    console.error('Error sending log to server:', error.message);
  });

  req.write(postData);
  req.end();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping log processor');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping log processor');
  process.exit(0);
}); 