'use client';

import React, { useState, useEffect, useRef } from 'react';
import LogEntry from './LogEntry';
import LogFilter from './LogFilter';
import { LogEntry as LogEntryType } from '@/lib/logStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntryType[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntryType[]>([]);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false); // Default to false as requested
  const [levels, setLevels] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [filters, setFilters] = useState({ search: '', level: '', service: '' });
  const [isPolling, setIsPolling] = useState(true);
  const [showGraph, setShowGraph] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['timestamp', 'service', 'level', 'message']);
  const [availableColumns, setAvailableColumns] = useState<string[]>(['timestamp', 'service', 'level', 'message']);
  const [selectedLog, setSelectedLog] = useState<LogEntryType | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch logs from the server
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/otel');
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const data = await response.json();
      if (data.success && data.logs) {
        // Sort logs by timestamp (oldest first)
        const sortedLogs = [...data.logs].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setLogs(sortedLogs);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setIsConnected(false);
    }
  };

  // Set up polling for logs
  useEffect(() => {
    // Fetch logs immediately
    fetchLogs();
    
    // Set up polling interval
    if (isPolling) {
      pollingIntervalRef.current = setInterval(fetchLogs, 2000); // Poll every 2 seconds
    }
    
    // Clean up on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPolling]);

  // Extract unique levels and services from logs
  useEffect(() => {
    const uniqueLevels = new Set<string>();
    const uniqueServices = new Set<string>();
    
    logs.forEach(log => {
      if (log.level) uniqueLevels.add(log.level);
      if (log.service) uniqueServices.add(log.service);
    });
    
    setLevels(Array.from(uniqueLevels));
    setServices(Array.from(uniqueServices));
  }, [logs]);

  // Apply filters
  useEffect(() => {
    let result = [...logs];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        (log.service && log.service.toLowerCase().includes(searchLower)) ||
        (log.level && log.level.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.level) {
      result = result.filter(log => 
        log.level && log.level.toLowerCase() === filters.level.toLowerCase()
      );
    }
    
    if (filters.service) {
      result = result.filter(log => 
        log.service && log.service.toLowerCase() === filters.service.toLowerCase()
      );
    }
    
    setFilteredLogs(result);
  }, [logs, filters]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  // Open drawer with log details
  const openLogDrawer = (log: LogEntryType) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  // Close drawer
  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  // Add filter from drawer
  const addFilterFromDrawer = (key: string, value: any) => {
    // Format the value based on its type
    let formattedValue = value;
    if (typeof value === 'string') {
      formattedValue = `"${value}"`;
    } else if (value === null) {
      formattedValue = 'null';
    } else if (typeof value === 'object') {
      formattedValue = `"${JSON.stringify(value)}"`;
    }

    // Create the search term
    const searchTerm = `${key}:${formattedValue}`;
    
    // Add to the search filter
    const newSearch = filters.search ? `${filters.search} ${searchTerm}` : searchTerm;
    
    // Update the filters state
    const newFilters = {...filters, search: newSearch};
    setFilters(newFilters);
    
    // Also call the filter change handler to ensure it's applied immediately
    handleFilterChange(newFilters);
    
    // Close the drawer
    closeDrawer();
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: { search: string; level: string; service: string }) => {
    setFilters(newFilters);
  };

  // Clear all logs
  const clearLogs = async () => {
    try {
      await fetch('/api/otel', { method: 'DELETE' });
      setLogs([]);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#151515] text-white relative">
      {/* Header - New Relic style */}
      <header className="bg-[#151515] p-2 border-b border-[#333333] flex justify-between items-center">
        <h1 className="text-lg font-bold text-[#00b9ff]">All logs</h1>
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-[#13ba00]' : 'bg-[#ff0000]'}`}></span>
            <span className="text-xs text-gray-300">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="flex items-center text-xs">
            <input
              type="checkbox"
              id="autoScroll"
              checked={autoScroll}
              onChange={() => setAutoScroll(!autoScroll)}
              className="mr-1 h-3 w-3"
            />
            <label htmlFor="autoScroll" className="text-gray-300">Auto-scroll</label>
          </div>
          <div className="flex items-center text-xs">
            <input
              type="checkbox"
              id="polling"
              checked={isPolling}
              onChange={() => setIsPolling(!isPolling)}
              className="mr-1 h-3 w-3"
            />
            <label htmlFor="polling" className="text-gray-300">Auto-refresh</label>
          </div>
          <div className="flex items-center text-xs">
            <input
              type="checkbox"
              id="showGraph"
              checked={showGraph}
              onChange={() => setShowGraph(!showGraph)}
              className="mr-1 h-3 w-3"
            />
            <label htmlFor="showGraph" className="text-gray-300">Show Graph</label>
          </div>
          <button
            onClick={clearLogs}
            className="px-2 py-1 bg-[#ff0000] hover:bg-[#cc0000] rounded text-xs transition-colors"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Graph Section - New Relic style with Recharts */}
      {showGraph && (
        <div className="bg-[#151515] p-2 border-b border-[#333333]">
          <div className="text-xs text-gray-400 mb-1">Log Volume</div>
          <div className="h-48 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(() => {
                  // Group logs by time intervals
                  const timeIntervals: { [key: string]: number } = {};
                  
                  // Initialize with at least 10 time points if we have logs
                  if (logs.length > 0) {
                    const oldestLog = new Date(logs[0].timestamp);
                    const newestLog = new Date(logs[logs.length - 1].timestamp);
                    const timeRange = newestLog.getTime() - oldestLog.getTime();
                    const interval = Math.max(60000, Math.floor(timeRange / 10)); // At least 1 minute
                    
                    for (let time = oldestLog.getTime(); time <= newestLog.getTime(); time += interval) {
                      const timeKey = new Date(time).toISOString();
                      timeIntervals[timeKey] = 0;
                    }
                  }
                  
                  // Count logs for each time interval
                  logs.forEach(log => {
                    const logTime = new Date(log.timestamp);
                    // Find the closest time interval
                    const timeKeys = Object.keys(timeIntervals);
                    if (timeKeys.length === 0) {
                      // If no intervals yet, create one
                      const timeKey = logTime.toISOString();
                      timeIntervals[timeKey] = 0;
                    }
                    
                    const closestTimeKey = timeKeys.reduce((prev, curr) => {
                      const prevDiff = Math.abs(new Date(prev).getTime() - logTime.getTime());
                      const currDiff = Math.abs(new Date(curr).getTime() - logTime.getTime());
                      return prevDiff < currDiff ? prev : curr;
                    }, timeKeys[0]);
                    
                    timeIntervals[closestTimeKey]++;
                  });
                  
                  // Convert to array for Recharts
                  return Object.keys(timeIntervals).map(time => {
                    const formattedTime = new Date(time).toLocaleTimeString();
                    return {
                      time: formattedTime,
                      count: timeIntervals[time]
                    };
                  });
                })()}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                <XAxis
                  dataKey="time"
                  stroke="#666666"
                  tick={{ fill: '#999999', fontSize: 10 }}
                  axisLine={{ stroke: '#333333' }}
                />
                <YAxis
                  stroke="#666666"
                  tick={{ fill: '#999999', fontSize: 10 }}
                  axisLine={{ stroke: '#333333' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151515',
                    border: 'none',
                    borderRadius: '3px',
                    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                  }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#00b9ff"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <LogFilter
        onFilterChange={handleFilterChange}
        levels={levels}
        services={services}
      />

      {/* Column Selection */}
      <div className="bg-[#151515] p-2 border-b border-[#333333] flex flex-wrap gap-2">
        <div className="text-xs text-gray-400">Columns:</div>
        {availableColumns.map(column => (
          <div key={column} className="flex items-center text-xs">
            <input
              type="checkbox"
              id={`col-${column}`}
              checked={selectedColumns.includes(column)}
              onChange={() => {
                if (selectedColumns.includes(column)) {
                  setSelectedColumns(selectedColumns.filter(c => c !== column));
                } else {
                  setSelectedColumns([...selectedColumns, column]);
                }
              }}
              className="mr-1 h-3 w-3"
            />
            <label htmlFor={`col-${column}`} className="text-gray-300">{column}</label>
          </div>
        ))}
      </div>

      {/* Log Table - New Relic style */}
      <div className="flex-grow overflow-auto">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">No logs to display. Send some logs to the OpenTelemetry endpoint.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-[#222222] sticky top-0">
              <tr>
                {selectedColumns.includes('timestamp') && (
                  <th className="p-2 text-left text-gray-400 font-medium">Time</th>
                )}
                {selectedColumns.includes('service') && (
                  <th className="p-2 text-left text-gray-400 font-medium">Service</th>
                )}
                {selectedColumns.includes('level') && (
                  <th className="p-2 text-left text-gray-400 font-medium">Level</th>
                )}
                {selectedColumns.includes('message') && (
                  <th className="p-2 text-left text-gray-400 font-medium">Message</th>
                )}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                // Format timestamp
                const formatTimestamp = (timestamp: string) => {
                  try {
                    const date = new Date(timestamp);
                    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
                  } catch (e) {
                    return timestamp;
                  }
                };

                // Determine log level color
                const getLevelColor = (level?: string) => {
                  if (!level) return 'bg-gray-500';
                  
                  switch (level.toLowerCase()) {
                    case 'error': return 'bg-red-500';
                    case 'warn':
                    case 'warning': return 'bg-yellow-500';
                    case 'info': return 'bg-blue-500';
                    case 'debug': return 'bg-green-500';
                    default: return 'bg-gray-500';
                  }
                };

                return (
                  <tr
                    key={log.id}
                    className="border-b border-[#333333] hover:bg-[#222222] cursor-pointer"
                    onClick={() => openLogDrawer(log)}
                  >
                    {selectedColumns.includes('timestamp') && (
                      <td className="p-2 text-gray-300 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                    )}
                    {selectedColumns.includes('service') && (
                      <td className="p-2">
                        <span className="bg-[#333333] text-gray-300 px-2 py-0.5 rounded">{log.service || 'unknown'}</span>
                      </td>
                    )}
                    {selectedColumns.includes('level') && (
                      <td className="p-2">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-1 ${getLevelColor(log.level)}`}></div>
                          <span className="text-gray-300">{log.level}</span>
                        </div>
                      </td>
                    )}
                    {selectedColumns.includes('message') && (
                      <td className="p-2 text-gray-300 truncate max-w-md">{log.message}</td>
                    )}
                    <td className="p-2 text-right">
                      <svg
                        className={`w-3 h-3 text-gray-400 transform transition-transform ${expandedLogIds.has(log.id) ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      <footer className="bg-[#151515] p-2 border-t border-[#333333] text-center text-xs text-gray-500">
        <p>Displaying {filteredLogs.length} of {logs.length} logs</p>
      </footer>

      {/* Log Detail Drawer - New Relic style */}
      {drawerOpen && selectedLog && (
        <div className="fixed inset-y-0 right-0 w-1/3 bg-[#222222] border-l border-[#333333] shadow-lg overflow-auto z-10">
          <div className="sticky top-0 bg-[#222222] p-3 border-b border-[#333333] flex justify-between items-center">
            <h3 className="text-sm font-semibold text-[#00b9ff]">Log Details</h3>
            <button
              onClick={closeDrawer}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Message and Timestamp at the top */}
          <div className="p-3 border-b border-[#333333] bg-[#1a1a1a]">
            <div className="mb-2">
              <div className="text-xs text-gray-400">Timestamp</div>
              <div className="text-sm text-white">{selectedLog.timestamp}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Message</div>
              <div className="text-sm text-white break-words">{selectedLog.message}</div>
            </div>
          </div>
          
          {/* Key-Value pairs */}
          <div className="p-3">
            <div className="text-xs text-[#00b9ff] mb-2">Attributes</div>
            <div className="space-y-2">
              {Object.entries(selectedLog).filter(([key]) =>
                !['id', 'timestamp'].includes(key)
              ).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#00b9ff]">{key}</span>
                    <button
                      onClick={() => addFilterFromDrawer(key, value)}
                      className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-[#333333]"
                      title="Filter by this value"
                    >
                      Filter
                    </button>
                  </div>
                  <div className="text-sm text-white break-words">
                    {typeof value === 'object' && value !== null
                      ? JSON.stringify(value, null, 2)
                      : String(value)
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;