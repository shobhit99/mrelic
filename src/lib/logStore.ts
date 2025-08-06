import { emitNewLog } from './socketio';

export type LogEntry = {
  id: string;
  timestamp: string;
  message: string;
  level?: string;
  service?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

class LogStore {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000; // Maximum number of logs to keep in memory

  constructor() {
    // Initialize with empty logs array
    this.logs = [];
  }

  // Add a new log entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addLog(log: any): LogEntry {
    // Ensure the log has a message property
    const message = log.message || log.msg || JSON.stringify(log);

    // Create a log entry with a unique ID
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      message,
      ...log,
    };

    // Add to the beginning of the array for newest-first order
    this.logs.unshift(logEntry);

    // Trim logs if we exceed the maximum
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Emit the new log to all connected clients
    emitNewLog(logEntry);

    return logEntry;
  }

  // Get all logs
  getLogs(): LogEntry[] {
    return this.logs;
  }

  // Clear all logs
  clearLogs(): void {
    this.logs = [];
    emitNewLog({ type: 'clear' });
  }

  // Search logs by query string (searches in message field)
  searchLogs(query: string): LogEntry[] {
    if (!query) return this.logs;

    const lowerQuery = query.toLowerCase();
    return this.logs.filter(
      (log) =>
        log.message.toLowerCase().includes(lowerQuery) ||
        (log.service && log.service.toLowerCase().includes(lowerQuery)) ||
        (log.level && log.level.toLowerCase().includes(lowerQuery)),
    );
  }

  // Filter logs by level
  filterByLevel(level: string): LogEntry[] {
    if (!level) return this.logs;

    return this.logs.filter(
      (log) => log.level && log.level.toLowerCase() === level.toLowerCase(),
    );
  }

  // Filter logs by service
  filterByService(service: string): LogEntry[] {
    if (!service) return this.logs;

    return this.logs.filter(
      (log) =>
        log.service && log.service.toLowerCase() === service.toLowerCase(),
    );
  }
}

// Create a singleton instance
const logStore = new LogStore();

export default logStore;
