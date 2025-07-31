'use client';

import React, { useState, useEffect, useRef } from 'react';
import LogFilter from './LogFilter';
import { LogEntry as LogEntryType } from '@/lib/logStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DatePicker, ConfigProvider, theme } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntryType[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntryType[]>([]);

  const [isConnected, setIsConnected] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false); // Default to false as requested
  const [levels, setLevels] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [filters, setFilters] = useState({ 
    search: '', 
    level: '', 
    service: '', 
    dateRange: '15m',
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined
  });
  
  // Date range state
  const [dateRange, setDateRange] = useState('15m');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Date range presets
  const dateRangePresets = [
    { value: '15m', label: 'Last 15 minutes' },
    { value: '30m', label: 'Last 30 minutes' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '4h', label: 'Last 4 hours' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'custom', label: 'Custom range' }
  ];

  // Helper function to get date range values
  const getDateRangeValues = () => {
    if (dateRange === 'custom') {
      // For custom range, validate that both dates are set and valid
      if (!customStartDate || !customEndDate) {
        // Fall back to default 15m range if custom dates are not properly set
        const now = dayjs();
        const startDate = now.subtract(15, 'minute');
        return {
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        };
      }
      
      // Validate that the custom dates are valid
      const start = dayjs(customStartDate);
      const end = dayjs(customEndDate);
      
      if (!start.isValid() || !end.isValid() || start.isAfter(end) || start.isSame(end)) {
        // Fall back to default if dates are invalid
        const now = dayjs();
        const startDate = now.subtract(15, 'minute');
        return {
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        };
      }
      
      return {
        startDate: customStartDate,
        endDate: customEndDate
      };
    }
    
    const now = dayjs();
    let startDate = now;
    
    switch (dateRange) {
      case '15m':
        startDate = now.subtract(15, 'minute');
        break;
      case '30m':
        startDate = now.subtract(30, 'minute');
        break;
      case '1h':
        startDate = now.subtract(1, 'hour');
        break;
      case '4h':
        startDate = now.subtract(4, 'hour');
        break;
      case '24h':
        startDate = now.subtract(1, 'day');
        break;
      case '7d':
        startDate = now.subtract(7, 'day');
        break;
      case '30d':
        startDate = now.subtract(30, 'day');
        break;
      default:
        startDate = now.subtract(15, 'minute');
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  };
  const [isPolling, setIsPolling] = useState(true);
  const [showGraph, setShowGraph] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['timestamp', 'service', 'level', 'message']);
  const availableColumns = ['timestamp', 'service', 'level', 'message'];
  const [selectedLog, setSelectedLog] = useState<LogEntryType | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch logs from the server with search parameters
  const fetchLogs = async (searchFilters?: { 
    search?: string; 
    level?: string; 
    service?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (searchFilters?.search) params.append('query', searchFilters.search);
      if (searchFilters?.level) params.append('level', searchFilters.level);
      if (searchFilters?.service) params.append('service', searchFilters.service);
      if (searchFilters?.startDate) params.append('startDate', searchFilters.startDate);
      if (searchFilters?.endDate) params.append('endDate', searchFilters.endDate);
      
      const url = `/api/otel${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
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
        setFilteredLogs(sortedLogs); // Set filtered logs directly from API
        
        // Update available levels and services from API response
        if (data.levels) setLevels(data.levels);
        if (data.services) setServices(data.services);
        
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setIsConnected(false);
    }
  };

  // Initial data load on component mount only
  useEffect(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMinutes(now.getMinutes() - 15); // Default 15m range
    
    const initialFilters = {
      search: '', 
      level: '', 
      service: '', 
      dateRange: '15m',
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
    fetchLogs(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  
  // Handle polling start/stop separately  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Clean up existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Set up polling interval only if polling is enabled
    if (isPolling) {
      pollingIntervalRef.current = setInterval(() => {
        const currentDateValues = getDateRangeValues();
        const currentFilters = {
          ...filters,
          ...currentDateValues
        };
        fetchLogs(currentFilters);
      }, 3000); // Poll every 5 seconds
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPolling]); // Only run when polling state changes

  // We no longer need client-side filtering since we're doing it on the server
  // Remove the useEffect for extracting levels/services and applying filters

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    
    // Create a new filters object
    const newFilters = {
      ...filters,
      search: newSearch
    };
    
    // Update the filters and trigger search
    handleFilterChange(newFilters);
    
    // Log the new search term for debugging
    console.log("Added filter:", searchTerm);
    console.log("New search:", newSearch);
    
    // Close the drawer
    closeDrawer();
  };

  // Handle filter changes - now triggers API call
  const handleFilterChange = (newFilters: { 
    search: string; 
    level: string; 
    service: string;
  }) => {
    console.log("Filter changed:", newFilters);
    
    // Get current date range values
    const dateValues = getDateRangeValues();
    
    const combinedFilters = {
      ...newFilters,
      dateRange,
      ...dateValues
    };
    
    setFilters({
      search: combinedFilters.search,
      level: combinedFilters.level,
      service: combinedFilters.service,
      dateRange: combinedFilters.dateRange,
      startDate: combinedFilters.startDate,
      endDate: combinedFilters.endDate
    });
    
    // Fetch logs with new filters from API
    fetchLogs(combinedFilters);
  };

  // Handle date range changes
  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDateRange = e.target.value;
    setDateRange(newDateRange);
    setShowCustomDate(newDateRange === 'custom');
    
    // Initialize custom dates with reasonable defaults when switching to custom
    if (newDateRange === 'custom' && (!customStartDate || !customEndDate)) {
      const now = dayjs();
      const oneHourAgo = now.subtract(1, 'hour');
      
      setCustomStartDate(oneHourAgo.toISOString());
      setCustomEndDate(now.toISOString());
      
      // Don't trigger search immediately for custom range - wait for user to set dates
      return;
    }
    
    // Trigger search immediately for date range changes
    if (newDateRange !== 'custom') {
      const now = new Date();
      const startDate = new Date();
      
      switch (newDateRange) {
        case '15m':
          startDate.setMinutes(now.getMinutes() - 15);
          break;
        case '30m':
          startDate.setMinutes(now.getMinutes() - 30);
          break;
        case '1h':
          startDate.setHours(now.getHours() - 1);
          break;
        case '4h':
          startDate.setHours(now.getHours() - 4);
          break;
        case '24h':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        default:
          startDate.setMinutes(now.getMinutes() - 15);
      }
      
      const dateValues = {
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      };
      
      const combinedFilters = {
        search: filters.search,
        level: filters.level,
        service: filters.service,
        dateRange: newDateRange,
        ...dateValues
      };
      
      setFilters({
        search: combinedFilters.search,
        level: combinedFilters.level,
        service: combinedFilters.service,
        dateRange: combinedFilters.dateRange,
        startDate: combinedFilters.startDate,
        endDate: combinedFilters.endDate
      });
      
      fetchLogs(combinedFilters);
    }
  };

  const handleCustomDateChange = () => {
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      // Validate dates before using them
      const start = dayjs(customStartDate);
      const end = dayjs(customEndDate);
      
      if (start.isValid() && end.isValid() && start.isBefore(end)) {
        const combinedFilters = {
          search: filters.search,
          level: filters.level,
          service: filters.service,
          dateRange,
          startDate: customStartDate,
          endDate: customEndDate
        };
        
        setFilters({
          search: combinedFilters.search,
          level: combinedFilters.level,
          service: combinedFilters.service,
          dateRange: combinedFilters.dateRange,
          startDate: combinedFilters.startDate,
          endDate: combinedFilters.endDate
        });
        
        fetchLogs(combinedFilters);
      }
    }
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
        <div className="flex items-center">
          {/* Simple logo */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className="mr-2"
          >
            <rect width="24" height="24" rx="4" fill="#00b9ff" />
            <path
              d="M6 12L10 8L14 12L18 8V16H6V12Z"
              fill="white"
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          <h1 className="text-lg font-bold text-[#00b9ff]">mRelic</h1>
        </div>
        <div className="flex items-center space-x-3">
          {/* Date Range Filter - New Relic style in header */}
          <div className="flex items-center gap-2">
            <select
              className="px-3 py-1.5 bg-[#222222] border border-[#333333] rounded text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00b9ff] min-w-[140px]"
              value={dateRange}
              onChange={handleDateRangeChange}
            >
              {dateRangePresets.map(preset => (
                <option key={preset.value} value={preset.value}>{preset.label}</option>
              ))}
            </select>
            
            {showCustomDate && (
              <ConfigProvider
                theme={{
                  algorithm: theme.darkAlgorithm,
                  token: {
                    colorPrimary: '#00b9ff',
                    colorBgBase: '#222222',
                    colorTextBase: '#e5e7eb',
                    colorBorder: '#333333',
                  },
                }}
              >
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="MMM D, YYYY HH:mm"
                  value={customStartDate ? dayjs(customStartDate) : null}
                  onChange={(date: Dayjs | null) => {
                    if (date) {
                      setCustomStartDate(date.toISOString());
                      // Only trigger change if both dates are set and valid
                      if (customEndDate && dayjs(customEndDate).isValid() && date.isBefore(dayjs(customEndDate))) {
                        setTimeout(handleCustomDateChange, 100);
                      }
                    }
                  }}
                  placeholder="From date"
                  size="small"
                  style={{ width: 160 }}
                  disabledDate={(current) => 
                    customEndDate ? current && current.isAfter(dayjs(customEndDate)) : false
                  }
                />
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="MMM D, YYYY HH:mm"
                  value={customEndDate ? dayjs(customEndDate) : null}
                  onChange={(date: Dayjs | null) => {
                    if (date) {
                      setCustomEndDate(date.toISOString());
                      // Only trigger change if both dates are set and valid
                      if (customStartDate && dayjs(customStartDate).isValid() && date.isAfter(dayjs(customStartDate))) {
                        setTimeout(handleCustomDateChange, 100);
                      }
                    }
                  }}
                  placeholder="To date"
                  size="small"
                  style={{ width: 160 }}
                  disabledDate={(current) => 
                    customStartDate ? current && current.isBefore(dayjs(customStartDate)) : false
                  }
                />
              </ConfigProvider>
            )}
          </div>
          
          <div className="h-4 w-px bg-[#333333]"></div>
          
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
                  // Use filtered logs instead of all logs for the graph
                  const logsToGraph = filteredLogs.length > 0 ? filteredLogs : [];
                  
                  if (logsToGraph.length === 0) {
                    return [];
                  }
                  
                  // Group logs by time intervals based on the current date range
                  const timeIntervals: { [key: string]: number } = {};
                  
                  // Determine time interval based on date range
                  let intervalMs = 60000; // Default 1 minute
                  switch (dateRange) {
                    case '15m':
                    case '30m':
                      intervalMs = 60000; // 1 minute intervals
                      break;
                    case '1h':
                      intervalMs = 300000; // 5 minute intervals
                      break;
                    case '4h':
                      intervalMs = 900000; // 15 minute intervals
                      break;
                    case '24h':
                      intervalMs = 3600000; // 1 hour intervals
                      break;
                    case '7d':
                      intervalMs = 21600000; // 6 hour intervals
                      break;
                    case '30d':
                      intervalMs = 86400000; // 1 day intervals
                      break;
                    default:
                      intervalMs = 60000;
                  }
                  
                  // Get time range bounds
                  const dateValues = getDateRangeValues();
                  
                  // Validate date values
                  if (!dateValues.startDate || !dateValues.endDate) {
                    return [];
                  }
                  
                  const startTime = new Date(dateValues.startDate).getTime();
                  const endTime = new Date(dateValues.endDate).getTime();
                  
                  // Check if dates are valid
                  if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
                    return [];
                  }
                  
                  // Initialize time intervals
                  for (let time = startTime; time <= endTime; time += intervalMs) {
                    if (!isNaN(time)) {
                      const timeKey = new Date(time).toISOString();
                      timeIntervals[timeKey] = 0;
                    }
                  }
                  
                  // Count logs for each time interval
                  logsToGraph.forEach(log => {
                    const logTime = new Date(log.timestamp).getTime();
                    
                    if (!isNaN(logTime)) {
                      // Find the appropriate time bucket
                      const bucketTime = Math.floor((logTime - startTime) / intervalMs) * intervalMs + startTime;
                      
                      if (!isNaN(bucketTime)) {
                        const timeKey = new Date(bucketTime).toISOString();
                        
                        if (timeIntervals[timeKey] !== undefined) {
                          timeIntervals[timeKey]++;
                        }
                      }
                    }
                  });
                  
                  // Convert to array for Recharts and sort by time
                  return Object.keys(timeIntervals)
                    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                    .map(time => {
                      const date = new Date(time);
                      let formattedTime;
                      
                      // Format time based on interval
                      if (intervalMs >= 86400000) {
                        formattedTime = date.toLocaleDateString(); // Date only for day intervals
                      } else if (intervalMs >= 3600000) {
                        formattedTime = date.toLocaleString([], { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        });
                      } else {
                        formattedTime = date.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        });
                      }
                      
                      return {
                        time: formattedTime,
                        count: timeIntervals[time],
                        fullTime: time
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
        search={filters.search}
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
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                        className="w-3 h-3 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
            <div className="flex items-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="mr-2"
              >
                <rect width="24" height="24" rx="4" fill="#00b9ff" />
                <path
                  d="M6 12L10 8L14 12L18 8V16H6V12Z"
                  fill="white"
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
              <h3 className="text-sm font-semibold text-[#00b9ff]">mRelic Log Details</h3>
            </div>
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
              <div className="text-xs text-white">{selectedLog.timestamp}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Message</div>
              <div className="text-xs text-white break-words">{selectedLog.message}</div>
            </div>
          </div>
          
          {/* Key-Value pairs - Organized by categories */}
          <div className="p-3">
            {/* Service Tags Section */}
            <div className="mb-4">
              <div className="text-xs text-[#00b9ff] mb-2">Service Tags</div>
              <div className="space-y-2 bg-[#1a1a1a] p-2 rounded">
                {Object.entries(selectedLog).filter(([key]) =>
                  ['service', 'service_name'].includes(key)
                ).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#00b9ff]">{key}</span>
                      <button
                        onClick={() => addFilterFromDrawer(key, value)}
                        className="text-xs text-gray-400 hover:text-white px-1 py-0.5 rounded hover:bg-[#333333]"
                        title="Filter by this value"
                      >
                        Filter
                      </button>
                    </div>
                    <div className="text-xs text-white break-words">
                      {typeof value === 'object' && value !== null
                        ? JSON.stringify(value, null, 2)
                        : String(value)
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Log Details Section */}
            <div className="mb-4">
              <div className="text-xs text-[#00b9ff] mb-2">Log Details</div>
              <div className="space-y-2 bg-[#1a1a1a] p-2 rounded">
                {Object.entries(selectedLog).filter(([key]) =>
                  ['level', 'message'].includes(key)
                ).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#00b9ff]">{key}</span>
                      <button
                        onClick={() => addFilterFromDrawer(key, value)}
                        className="text-xs text-gray-400 hover:text-white px-1 py-0.5 rounded hover:bg-[#333333]"
                        title="Filter by this value"
                      >
                        Filter
                      </button>
                    </div>
                    <div className="text-xs text-white break-words">
                      {typeof value === 'object' && value !== null
                        ? JSON.stringify(value, null, 2)
                        : String(value)
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Meta Section - Special handling for JSON data */}
            {selectedLog.meta && (
              <div className="mb-4">
                <div className="text-xs text-[#00b9ff] mb-2">Meta Data</div>
                <div className="space-y-2 bg-[#1a1a1a] p-2 rounded">
                  {(() => {
                    // Try to parse meta as JSON if it's a string
                    let metaData = selectedLog.meta;
                    if (typeof metaData === 'string') {
                      try {
                        metaData = JSON.parse(metaData);
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      } catch (e) {
                        // If parsing fails, keep as string
                        return (
                          <div className="flex flex-col">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-[#00b9ff]">meta</span>
                              <button
                                onClick={() => addFilterFromDrawer('meta', selectedLog.meta)}
                                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-[#333333]"
                                title="Filter by this value"
                              >
                                Filter
                              </button>
                            </div>
                            <div className="text-sm text-white break-words">
                              {String(selectedLog.meta)}
                            </div>
                          </div>
                        );
                      }
                    }
                    
                    // If meta is an object, display its properties as key-value pairs
                    if (typeof metaData === 'object' && metaData !== null) {
                      return Object.entries(metaData).map(([metaKey, metaValue]) => (
                        <div key={`meta-${metaKey}`} className="flex flex-col">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[#00b9ff]">{metaKey}</span>
                            <button
                              onClick={() => addFilterFromDrawer(`meta.${metaKey}`, metaValue)}
                              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-[#333333]"
                              title="Filter by this value"
                            >
                              Filter
                            </button>
                          </div>
                          <div className="text-sm text-white break-words">
                            {typeof metaValue === 'object' && metaValue !== null
                              ? JSON.stringify(metaValue, null, 2)
                              : String(metaValue)
                            }
                          </div>
                        </div>
                      ));
                    }
                    
                    return null;
                  })()}
                </div>
              </div>
            )}
            
            {/* Tags Section - All other attributes */}
            <div>
              <div className="text-xs text-[#00b9ff] mb-2">Tags</div>
              <div className="space-y-2 bg-[#1a1a1a] p-2 rounded">
                {Object.entries(selectedLog).filter(([key]) =>
                  !['id', 'timestamp', 'service', 'service_name', 'level', 'message', 'meta'].includes(key)
                ).map(([key, value]) => {
                  // Try to parse value as JSON if it's a string
                  let displayValue = value;
                  if (typeof value === 'string') {
                    try {
                      // Check if the string looks like JSON
                      if ((value.startsWith('{') && value.endsWith('}')) ||
                          (value.startsWith('[') && value.endsWith(']'))) {
                        const parsedValue = JSON.parse(value);
                        if (typeof parsedValue === 'object' && parsedValue !== null) {
                          // If it's a complex object, render nested key-value pairs
                          return (
                            <div key={key} className="flex flex-col">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-[#00b9ff] font-semibold">{key}</span>
                                <button
                                  onClick={() => addFilterFromDrawer(key, value)}
                                  className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-[#333333]"
                                  title="Filter by this value"
                                >
                                  Filter
                                </button>
                              </div>
                              <div className="ml-2 mt-1 space-y-1 border-l-2 border-[#333333] pl-2">
                                {Object.entries(parsedValue).map(([nestedKey, nestedValue]) => (
                                  <div key={`${key}-${nestedKey}`} className="flex flex-col">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-[#00b9ff]">{nestedKey}</span>
                                      <button
                                        onClick={() => addFilterFromDrawer(`${key}.${nestedKey}`, nestedValue)}
                                        className="text-xs text-gray-400 hover:text-white px-1 py-0.5 rounded hover:bg-[#333333]"
                                        title="Filter by this value"
                                      >
                                        Filter
                                      </button>
                                    </div>
                                    <div className="text-xs text-white break-words">
                                      {typeof nestedValue === 'object' && nestedValue !== null
                                        ? JSON.stringify(nestedValue, null, 2)
                                        : String(nestedValue)
                                      }
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                                              }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    } catch (e) {
                      // If parsing fails, use the original value
                      displayValue = value;
                    }
                  }
                  
                  // Default rendering for non-JSON values
                  return (
                    <div key={key} className="flex flex-col">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#00b9ff]">{key}</span>
                        <button
                          onClick={() => addFilterFromDrawer(key, displayValue)}
                          className="text-xs text-gray-400 hover:text-white px-1 py-0.5 rounded hover:bg-[#333333]"
                          title="Filter by this value"
                        >
                          Filter
                        </button>
                      </div>
                      <div className="text-xs text-white break-words">
                        {typeof displayValue === 'object' && displayValue !== null
                          ? JSON.stringify(displayValue, null, 2)
                          : String(displayValue)
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;