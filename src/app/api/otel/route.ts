import { NextRequest, NextResponse } from 'next/server';

// In-memory log storage
type LogEntry = {
  id: string;
  timestamp: string;
  message: string;
  level?: string;
  service?: string;
  [key: string]: any;
};

// Store logs in memory (this will be reset when the server restarts)
let logs: LogEntry[] = [];
const MAX_LOGS = 1000;

// Add a log entry
function addLog(log: any): LogEntry {
  // Ensure the log has a message property
  const message = log.message || log.msg || log.body || JSON.stringify(log);
  
  // Create a log entry with a unique ID
  const logEntry: LogEntry = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    timestamp: log.timestamp || new Date().toISOString(),
    message,
    level: log.level || log.severity || 'info',
    service: log.service || log.serviceName || log.service_name || 'system',
    ...log // Include all other properties
  };

  // Add to the beginning of the array for newest-first order
  logs.unshift(logEntry);
  
  // Trim logs if we exceed the maximum
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(0, MAX_LOGS);
  }

  return logEntry;
}

// POST endpoint to receive logs
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Handle different log formats
    let logsToProcess = [];
    
    // Check if the body is an array or a single log entry
    if (Array.isArray(body)) {
      logsToProcess = body;
    } else {
      logsToProcess = [body];
    }
    
    // Process each log entry
    const processedLogs = logsToProcess.map(log => addLog(log));
    
    return NextResponse.json({
      success: true,
      count: processedLogs.length,
      logs: processedLogs
    }, { status: 200 });
  } catch (error) {
    console.error('Error processing logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process logs'
    }, { status: 500 });
  }
}

// GET endpoint to retrieve logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get query parameters for filtering
    const query = searchParams.get('query') || '';
    const level = searchParams.get('level') || '';
    const service = searchParams.get('service') || '';
    
    let filteredLogs = [...logs];
    
    // Apply filters if provided
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.message.toLowerCase().includes(lowerQuery) ||
        (log.service && log.service.toLowerCase().includes(lowerQuery)) ||
        (log.level && log.level.toLowerCase().includes(lowerQuery))
      );
    }
    
    if (level) {
      filteredLogs = filteredLogs.filter(log =>
        log.level && log.level.toLowerCase() === level.toLowerCase()
      );
    }
    
    if (service) {
      filteredLogs = filteredLogs.filter(log =>
        log.service && log.service.toLowerCase() === service.toLowerCase()
      );
    }
    
    return NextResponse.json({
      success: true,
      count: filteredLogs.length,
      logs: filteredLogs
    }, { status: 200 });
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve logs'
    }, { status: 500 });
  }
}

// DELETE endpoint to clear logs
export async function DELETE() {
  try {
    logs = [];
    return NextResponse.json({
      success: true,
      message: 'Logs cleared successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error clearing logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear logs'
    }, { status: 500 });
  }
}