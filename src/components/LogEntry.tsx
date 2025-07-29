import React from 'react';
import { LogEntry as LogEntryType } from '@/lib/logStore';

interface LogEntryProps {
  log: LogEntryType;
  expanded: boolean;
  onToggleExpand: () => void;
}

const LogEntry: React.FC<LogEntryProps> = ({ log, expanded, onToggleExpand }) => {
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
      return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
    } catch (e) {
      return timestamp;
    }
  };

  // Get all keys except the common ones
  const detailKeys = Object.keys(log).filter(
    key => !['id', 'timestamp', 'message', 'level', 'service'].includes(key)
  );

  return (
    <div className="border-b border-gray-700 hover:bg-gray-800 transition-colors">
      {/* Main log row - always visible */}
      <div 
        className="p-2 flex items-start cursor-pointer" 
        onClick={onToggleExpand}
      >
        <div className="flex-shrink-0 flex items-center space-x-2 mr-2">
          <div className={`w-2 h-2 rounded-full ${getLevelColor(log.level)}`}></div>
          <div className="text-xs text-gray-400 w-24 truncate">
            {formatTimestamp(log.timestamp)}
          </div>
        </div>
        
        {log.service && (
          <div className="flex-shrink-0 bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded mr-2 w-24 truncate">
            {log.service}
          </div>
        )}
        
        <div className="flex-grow font-mono text-sm text-gray-200 break-all">
          {log.message}
        </div>
        
        <div className="flex-shrink-0 ml-2">
          <svg 
            className={`w-4 h-4 text-gray-400 transform transition-transform ${expanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {/* Expanded details */}
      {expanded && detailKeys.length > 0 && (
        <div className="p-3 bg-gray-900 border-t border-gray-700 font-mono">
          <div className="grid grid-cols-1 gap-1">
            {detailKeys.map(key => (
              <div key={key} className="flex">
                <span className="text-gray-400 text-xs mr-2">{key}:</span>
                <span className="text-gray-300 text-xs break-all">
                  {typeof log[key] === 'object' 
                    ? JSON.stringify(log[key], null, 2) 
                    : String(log[key])
                  }
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