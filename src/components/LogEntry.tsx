import React from 'react';
import { LogEntry as LogEntryType } from '@/lib/logStore';

interface LogEntryProps {
  log: LogEntryType;
  expanded: boolean;
  onToggleExpand: () => void;
}

const LogEntry: React.FC<LogEntryProps> = ({
  log,
  expanded,
  onToggleExpand,
}) => {
  // Determine log level color
  const getLevelColor = (level?: string) => {
    if (!level) return 'bg-gray-500';

    switch (level.toLowerCase()) {
      case 'error':
        return 'bg-red-500';
      case 'warn':
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      case 'debug':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return (
        date.toLocaleTimeString() +
        '.' +
        date.getMilliseconds().toString().padStart(3, '0')
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      return timestamp;
    }
  };

  // Get all keys except the common ones
  const detailKeys = Object.keys(log).filter(
    (key) => !['id', 'timestamp', 'message', 'level', 'service'].includes(key),
  );

  return (
    <div className="border-b border-gray-700 transition-colors hover:bg-gray-800">
      {/* Main log row - always visible */}
      <div
        className="flex cursor-pointer items-start p-2"
        onClick={onToggleExpand}
      >
        <div className="mr-2 flex flex-shrink-0 items-center space-x-2">
          <div
            className={`h-2 w-2 rounded-full ${getLevelColor(log.level)}`}
          ></div>
          <div className="w-24 truncate text-xs text-gray-400">
            {formatTimestamp(log.timestamp)}
          </div>
        </div>

        {log.service && (
          <div className="mr-2 max-w-48 min-w-24 flex-shrink-0 truncate rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
            <span className="font-semibold">{log.service}</span>
            {/* Display the most relevant tag based on service type */}
            {log.service === 'api-gateway' && log.endpoint && (
              <span className="ml-1 opacity-80">{log.endpoint}</span>
            )}
            {log.service === 'user-service' && log.action && (
              <span className="ml-1 opacity-80">{log.action}</span>
            )}
            {log.service === 'payment-service' && log.status && (
              <span className="ml-1 opacity-80">{log.status}</span>
            )}
            {log.service === 'inventory-service' && log.action && (
              <span className="ml-1 opacity-80">{log.action}</span>
            )}
            {log.service === 'notification-service' && log.type && (
              <span className="ml-1 opacity-80">{log.type}</span>
            )}
          </div>
        )}

        <div className="flex-grow font-mono text-sm break-all text-gray-200">
          {log.message}
        </div>

        <div className="ml-2 flex-shrink-0">
          <svg
            className={`h-4 w-4 transform text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && detailKeys.length > 0 && (
        <div className="border-t border-gray-700 bg-gray-900 p-3 font-mono">
          <div className="grid grid-cols-1 gap-1">
            {detailKeys.map((key) => (
              <div key={key} className="flex">
                <span className="mr-2 text-xs text-gray-400">{key}:</span>
                <span className="text-xs break-all text-gray-300">
                  {typeof log[key] === 'object'
                    ? JSON.stringify(log[key], null, 2)
                    : String(log[key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LogEntry;
