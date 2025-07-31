#!/usr/bin/env node

const http = require('http');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Function to parse fluent-bit config file
function parseFluentConfig(configPath) {
  try {
    const config = fs.readFileSync(configPath, 'utf8');
    const lines = config.split('\n');
    
    let serverHost = 'localhost';
    let serverPort = '3000';
    let serviceName = 'unknown-service';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Host ')) {
        serverHost = trimmed.split(/\s+/)[1];
      } else if (trimmed.startsWith('Port ')) {
        serverPort = trimmed.split(/\s+/)[1];
      } else if (trimmed.startsWith('Header       service.name ')) {
        serviceName = trimmed.split(/\s+/)[2];
      }
    }
    
    return { serverHost, serverPort, serviceName };
  } catch (error) {
    console.error('Error reading fluent config:', error.message);
    return null;
  }
}

// Get configuration from command line arguments or environment variables
let serverHost = process.env.MRELIC_HOST || 'localhost';
let serverPort = process.env.MRELIC_PORT || '3000';
let serviceName = process.argv[2] || process.env.SERVICE_NAME || path.basename(process.cwd());

// Check if we have a fluent-bit config file path as argument
if (process.argv[2] && process.argv[2].endsWith('.conf')) {
  const configPath = process.argv[2];
  const configData = parseFluentConfig(configPath);
  if (configData) {
    serverHost = configData.serverHost;
    serverPort = configData.serverPort;
    serviceName = configData.serviceName;
  }
} else if (process.argv[3]) {
  // If second argument exists, use it as service name
  serviceName = process.argv[3];
}

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