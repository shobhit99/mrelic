import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { LogEntry } from './logStore';
import { parseSearchQuery, filterLogsBySearchTerms } from './searchParser';

// Create database path
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'logs.db');

// Initialize database
const db = new Database(dbPath);

// Create logs table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    message TEXT NOT NULL,
    level TEXT,
    service TEXT,
    data TEXT -- JSON string for additional log data
  )
`);

// Create indexes for better query performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_timestamp ON logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_level ON logs(level);
  CREATE INDEX IF NOT EXISTS idx_service ON logs(service);
  CREATE INDEX IF NOT EXISTS idx_message ON logs(message);
`);

class DatabaseService {
  getDbSize(): number {
    try {
      const stats = fs.statSync(dbPath);
      return stats.size;
    } catch (error) {
      console.error('Error getting database size:', error);
      return 0;
    }
  }

  // Add a log entry to the database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addLog(log: any, headers?: Headers): LogEntry {
    // Ensure the log has a message property
    const logMessage =
      log.message || log.msg || log.body || JSON.stringify(log);

    // Get service name from headers if available
    let serviceName = log.service || log.serviceName || log.service_name;

    // Check for service.name in headers
    if (headers) {
      const headerServiceName = headers.get('service.name');
      if (headerServiceName) {
        serviceName = headerServiceName;
      }
    }

    // Convert timestamp to ISO string - handle all formats properly
    let logTimestamp;
    if (log.timestamp) {
      if (typeof log.timestamp === 'number') {
        // Convert milliseconds to ISO string
        logTimestamp = new Date(log.timestamp).toISOString();
      } else if (typeof log.timestamp === 'string') {
        // If already a string, check if it's ISO format or needs conversion
        if (log.timestamp.includes('-')) {
          logTimestamp = log.timestamp;
        } else {
          // String number, convert to ISO
          const numTimestamp = parseFloat(log.timestamp);
          logTimestamp = new Date(numTimestamp).toISOString();
        }
      } else {
        logTimestamp = new Date().toISOString();
      }
    } else {
      logTimestamp = new Date().toISOString();
    }

    // Create a log entry with a unique ID - DO NOT spread log after setting timestamp
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      timestamp: logTimestamp,
      message: logMessage,
      level: log.level || log.severity || 'info',
      service: serviceName || 'system',
    };

    // Add other properties from log except timestamp (to avoid overwriting)
    Object.keys(log).forEach((key) => {
      if (
        key !== 'timestamp' &&
        key !== 'message' &&
        key !== 'level' &&
        key !== 'service'
      ) {
        logEntry[key] = log[key];
      }
    });

    // Separate the core fields from additional data
    const {
      id,
      timestamp,
      message: entryMessage,
      level,
      service,
      ...additionalData
    } = logEntry;

    // Insert into database
    const insertStmt = db.prepare(`
      INSERT INTO logs (id, timestamp, message, level, service, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      timestamp,
      entryMessage,
      level,
      service,
      JSON.stringify(additionalData),
    );

    return logEntry;
  }

  // Helper function to check if query contains advanced search syntax
  private isAdvancedQuery(query: string): boolean {
    // Check for advanced search patterns: key:value, key:"value", key:*value*, -key:value, "text"
    return /[:\-*"]/.test(query);
  }

  // Get logs with filtering
  getLogs(
    filters: {
      query?: string;
      level?: string;
      service?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): LogEntry[] {
    let sql = `
      SELECT id, timestamp, message, level, service, data
      FROM logs
    `;

    const conditions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    // Add level and service filters (these are always applied at database level)
    if (filters.level) {
      conditions.push('level = ?');
      params.push(filters.level);
    }

    if (filters.service) {
      conditions.push('service = ?');
      params.push(filters.service);
    }

    // Add date range filters
    if (filters.startDate) {
      conditions.push('timestamp >= ?');
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push('timestamp <= ?');
      params.push(filters.endDate);
    }

    // For advanced queries, we'll fetch all matching level/service records and filter in memory
    // For simple queries, we can filter at database level
    if (filters.query && !this.isAdvancedQuery(filters.query)) {
      conditions.push(`(
        message LIKE ? OR 
        service LIKE ? OR 
        level LIKE ? OR
        data LIKE ?
      )`);
      const queryPattern = `%${filters.query}%`;
      params.push(queryPattern, queryPattern, queryPattern, queryPattern);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Order by timestamp descending (newest first)
    sql += ' ORDER BY timestamp DESC';

    // For advanced queries, we might need more records to filter from
    const effectiveLimit =
      filters.query && this.isAdvancedQuery(filters.query)
        ? Math.max(filters.limit || 1000, 5000) // Get more records for advanced filtering
        : filters.limit;

    // Add limit and offset
    if (effectiveLimit) {
      sql += ' LIMIT ?';
      params.push(effectiveLimit);

      if (
        filters.offset &&
        (!filters.query || !this.isAdvancedQuery(filters.query))
      ) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);

    // Convert rows back to LogEntry format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let logs = rows.map((row: any) => {
      const additionalData = JSON.parse(row.data || '{}');
      return {
        id: row.id,
        timestamp: row.timestamp,
        message: row.message,
        level: row.level,
        service: row.service,
        ...additionalData,
      } as LogEntry;
    });

    // Apply advanced search filtering if needed
    if (filters.query && this.isAdvancedQuery(filters.query)) {
      const searchTerms = parseSearchQuery(filters.query);
      logs = filterLogsBySearchTerms(logs, searchTerms);

      // Apply limit and offset after advanced filtering
      if (filters.offset) {
        logs = logs.slice(filters.offset);
      }
      if (filters.limit) {
        logs = logs.slice(0, filters.limit);
      }
    }

    return logs;
  }

  // Get unique levels
  getLevels(): string[] {
    const stmt = db.prepare(
      'SELECT DISTINCT level FROM logs WHERE level IS NOT NULL ORDER BY level',
    );
    const rows = stmt.all();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((row: any) => row.level);
  }

  // Get unique services
  getServices(): string[] {
    const stmt = db.prepare(
      'SELECT DISTINCT service FROM logs WHERE service IS NOT NULL ORDER BY service',
    );
    const rows = stmt.all();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((row: any) => row.service);
  }

  // Clear all logs
  clearLogs(filters: { service?: string; endDate?: string } = {}): void {
    let sql = 'DELETE FROM logs';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters.service) {
      conditions.push('service = ?');
      params.push(filters.service);
    }

    if (filters.endDate) {
      conditions.push('timestamp < ?');
      params.push(filters.endDate);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const stmt = db.prepare(sql);
    stmt.run(...params);
  }

  // Get total count of logs - updated to handle advanced queries
  getLogCount(
    filters: {
      query?: string;
      level?: string;
      service?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): number {
    // For advanced queries, we need to get the actual filtered results to count them
    if (filters.query && this.isAdvancedQuery(filters.query)) {
      const logs = this.getLogs({
        ...filters,
        limit: undefined,
        offset: undefined,
      });
      return logs.length;
    }

    // For simple queries, use database COUNT
    let sql = 'SELECT COUNT(*) as count FROM logs';

    const conditions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    // Add filter conditions (same as getLogs)
    if (filters.level) {
      conditions.push('level = ?');
      params.push(filters.level);
    }

    if (filters.service) {
      conditions.push('service = ?');
      params.push(filters.service);
    }

    // Add date range filters
    if (filters.startDate) {
      conditions.push('timestamp >= ?');
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push('timestamp <= ?');
      params.push(filters.endDate);
    }

    if (filters.query) {
      conditions.push(`(
        message LIKE ? OR 
        service LIKE ? OR 
        level LIKE ? OR
        data LIKE ?
      )`);
      const queryPattern = `%${filters.query}%`;
      params.push(queryPattern, queryPattern, queryPattern, queryPattern);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const stmt = db.prepare(sql);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();

// Graceful shutdown
process.on('exit', () => db.close());
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
