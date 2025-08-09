const fetch = require('node-fetch');

// Configuration
const API_ENDPOINT = 'http://localhost:5959/api/otel';
const LOG_INTERVAL_MS = 1000; // 1 second between logs
const SERVICES = [
  'api-gateway',
  'user-service',
  'payment-service',
  'inventory-service',
  'notification-service',
];
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

// Generate a random log entry
function generateRandomLog() {
  const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
  const level = LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)];
  const timestamp = new Date().toISOString();

  // Generate different types of log messages based on the service and level
  let message = '';
  let additionalData = {};

  switch (service) {
    case 'api-gateway':
      const endpoints = [
        '/api/users',
        '/api/products',
        '/api/orders',
        '/api/payments',
      ];
      const methods = ['GET', 'POST', 'PUT', 'DELETE'];
      const statusCodes = [200, 201, 400, 401, 403, 404, 500];

      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const method = methods[Math.floor(Math.random() * methods.length)];
      const statusCode =
        statusCodes[Math.floor(Math.random() * statusCodes.length)];
      const responseTime = Math.floor(Math.random() * 500);

      message = `${method} ${endpoint} - ${statusCode} (${responseTime}ms)`;
      additionalData = {
        method,
        endpoint,
        statusCode,
        responseTime,
        clientIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      };
      break;

    case 'user-service':
      const userActions = [
        'login',
        'logout',
        'register',
        'update_profile',
        'reset_password',
      ];
      const userIds = ['user123', 'user456', 'user789', 'user101', 'user202'];

      const action =
        userActions[Math.floor(Math.random() * userActions.length)];
      const userId = userIds[Math.floor(Math.random() * userIds.length)];

      message = `User ${action} - ${userId}`;
      additionalData = {
        action,
        userId,
        email: `${userId}@example.com`,
        timestamp,
      };
      break;

    case 'payment-service':
      const paymentMethods = [
        'credit_card',
        'paypal',
        'bank_transfer',
        'crypto',
      ];
      const amounts = [19.99, 49.99, 99.99, 199.99, 499.99];
      const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
      const statuses = ['success', 'pending', 'failed'];

      const paymentMethod =
        paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      const currency =
        currencies[Math.floor(Math.random() * currencies.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      message = `Payment ${status} - ${amount} ${currency} via ${paymentMethod}`;
      additionalData = {
        paymentMethod,
        amount,
        currency,
        status,
        transactionId: `txn_${Math.random().toString(36).substring(2, 10)}`,
        timestamp,
      };
      break;

    case 'inventory-service':
      const actions = [
        'item_added',
        'item_removed',
        'stock_updated',
        'inventory_check',
      ];
      const items = [
        'laptop',
        'smartphone',
        'headphones',
        'monitor',
        'keyboard',
      ];
      const quantities = [1, 2, 5, 10, 20, 50];

      const inventoryAction =
        actions[Math.floor(Math.random() * actions.length)];
      const item = items[Math.floor(Math.random() * items.length)];
      const quantity =
        quantities[Math.floor(Math.random() * quantities.length)];

      message = `Inventory ${inventoryAction} - ${item} (${quantity})`;
      additionalData = {
        inventory: {
          item,
          action: inventoryAction,
          quantity,
        },
        warehouseId: `wh_${Math.floor(Math.random() * 10)}`,
        timestamp,
      };
      break;

    case 'notification-service':
      const notificationTypes = ['email', 'sms', 'push', 'in_app'];
      const notificationStatuses = ['sent', 'delivered', 'failed', 'queued'];

      const notificationType =
        notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const notificationStatus =
        notificationStatuses[
          Math.floor(Math.random() * notificationStatuses.length)
        ];

      message = `Notification ${notificationStatus} - ${notificationType}`;
      additionalData = {
        type: notificationType,
        status: notificationStatus,
        recipient: `user${Math.floor(Math.random() * 1000)}@example.com`,
        templateId: `template_${Math.floor(Math.random() * 20)}`,
        timestamp,
      };
      break;
  }

  // Add some random errors for error level logs
  if (level === 'error') {
    const errors = [
      'Connection refused',
      'Timeout exceeded',
      'Invalid authentication token',
      'Database query failed',
      'Resource not found',
      'Permission denied',
      'Rate limit exceeded',
    ];

    const error = errors[Math.floor(Math.random() * errors.length)];
    message = `ERROR: ${error} - ${message}`;
    additionalData.error = error;
    additionalData.stackTrace = `Error: ${error}\n    at processRequest (${service}.js:42:15)\n    at handleRequest (${service}.js:102:10)\n    at processTicksAndRejections (internal/process/task_queues.js:95:5)`;
  }

  return {
    timestamp,
    level,
    service, // This is already set correctly from the SERVICES array
    service_name: service, // Add an alternative field for service name
    message,
    ...additionalData,
  };
}

// Send a log to the API
async function sendLog() {
  const log = generateRandomLog();

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    });

    const data = await response.json();
    console.log(
      `Log sent: ${log.service} - ${log.level} - ${log.message.substring(0, 50)}...`,
    );

    return data;
  } catch (error) {
    console.error('Error sending log:', error);
  }
}

// Send logs at regular intervals
console.log(
  `Starting to send logs to ${API_ENDPOINT} every ${LOG_INTERVAL_MS}ms...`,
);
console.log('Press Ctrl+C to stop');

// Send an initial batch of 10 logs
Promise.all(
  Array(10)
    .fill()
    .map(() => sendLog()),
).then(() => {
  // Then continue sending logs at regular intervals
  setInterval(sendLog, LOG_INTERVAL_MS);
});
