'use client';

import React, { useState, useEffect, useRef } from 'react';
import LogFilter from './LogFilter';
import { LogEntry as LogEntryType } from '@/lib/logStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DatePicker, ConfigProvider, theme, Modal } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { FilterIcon, Copy, Check } from 'lucide-react';

const NEW_RELIC_GREEN = '#22c55e'; // A nice green similar to New Relic's
const NEW_RELIC_GREEN_DARK = '#16a34a';

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntryType[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntryType[]>([]);
  const [dbSize, setDbSize] = useState<number>(0);
  const [isClearModalVisible, setIsClearModalVisible] = useState<boolean>(false);
  const [clearService, setClearService] = useState<string>('');
  const [clearTimeframe, setClearTimeframe] = useState<string>('7d');

  const [isConnected, setIsConnected] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
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
  
  const [dateRange, setDateRange] = useState('15m');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flattenObject = (obj: any, parentKey = '', res: { [key: string]: any } = {}) => {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const propName = parentKey ? `${parentKey}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          flattenObject(obj[key], propName, res);
        } else {
          res[propName] = obj[key];
        }
      }
    }
    return res;
  };

  const [isFormatted, setIsFormatted] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const getDateRangeValues = () => {
    if (dateRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        const now = dayjs();
        const startDate = now.subtract(15, 'minute');
        return {
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        };
      }
      
      const start = dayjs(customStartDate);
      const end = dayjs(customEndDate);
      
      if (!start.isValid() || !end.isValid() || start.isAfter(end) || start.isSame(end)) {
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

  const fetchLogs = async (searchFilters?: { 
    search?: string; 
    level?: string; 
    service?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
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
        const sortedLogs = [...data.logs].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setLogs(sortedLogs);
        setFilteredLogs(sortedLogs);
        
        if (data.levels) setLevels(data.levels);
        if (data.services) setServices(data.services);
        
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setIsConnected(false);
    }
  };

    const fetchDbSize = async () => {
        try {
            const response = await fetch('/api/db-size');
            const data = await response.json();
            if (data.success) {
                setDbSize(data.size);
            }
        } catch (error) {
            console.error('Error fetching db size:', error);
        }
    };

  useEffect(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMinutes(now.getMinutes() - 15);
    
    const initialFilters = {
      search: '', 
      level: '', 
      service: '', 
      dateRange: '15m',
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
    fetchLogs(initialFilters);
    fetchDbSize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (isPolling) {
      pollingIntervalRef.current = setInterval(() => {
        const currentDateValues = getDateRangeValues();
        const currentFilters = {
          ...filters,
          ...currentDateValues
        };
        fetchLogs(currentFilters);
      }, 3000);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPolling, filters, getDateRangeValues]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const openLogDrawer = (log: LogEntryType) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addFilterFromDrawer = (key: string, value: any) => {
    let formattedValue = value;
    if (typeof value === 'string') {
      formattedValue = `"${value}"`;
    } else if (value === null) {
      formattedValue = 'null';
    } else if (typeof value === 'object') {
      formattedValue = `"${JSON.stringify(value)}"`;
    }

    const searchTerm = `${key}:${formattedValue}`;
    
    const newSearch = filters.search ? `${filters.search} ${searchTerm}` : searchTerm;
    
    const newFilters = {
      ...filters,
      search: newSearch
    };
    
    handleFilterChange(newFilters);
    
    closeDrawer();
  };
  
  const copyToClipboard = (key: string, value: any) => {
    const textToCopy = typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value);
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const handleFilterChange = (newFilters: { 
    search: string; 
    level: string; 
    service: string;
  }) => {
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
    
    fetchLogs(combinedFilters);
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDateRange = e.target.value;
    setDateRange(newDateRange);
    setShowCustomDate(newDateRange === 'custom');
    
    if (newDateRange === 'custom' && (!customStartDate || !customEndDate)) {
      const now = dayjs();
      const oneHourAgo = now.subtract(1, 'hour');
      
      setCustomStartDate(oneHourAgo.toISOString());
      setCustomEndDate(now.toISOString());
      
      return;
    }
    
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

  const showClearModal = () => {
    setIsClearModalVisible(true);
  };

  const handleClearCancel = () => {
    setIsClearModalVisible(false);
  };

  const handleClearOk = async () => {
    try {
      const params = new URLSearchParams();
      if (clearService) {
        params.append('service', clearService);
      }

      if (clearTimeframe !== 'all') {
        const now = dayjs();
        let endDate;
        if (clearTimeframe === '7d') {
          endDate = now.subtract(7, 'day');
        } else if (clearTimeframe === '14d') {
            endDate = now.subtract(14, 'day');
        } else if (clearTimeframe === '30d') {
            endDate = now.subtract(30, 'day');
        }
        if (endDate) {
          params.append('endDate', endDate.toISOString());
        }
      }

      await fetch(`/api/otel?${params.toString()}`, { method: 'DELETE' });
      
      // Refetch logs and db size
      const dateValues = getDateRangeValues();
      const combinedFilters = {
          ...filters,
          dateRange,
          ...dateValues
      };
      fetchLogs(combinedFilters);
      fetchDbSize();

    } catch (error) {
      console.error('Error clearing logs:', error);
    } finally {
      setIsClearModalVisible(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#151515] text-white font-sans">
      <header className="bg-[#151515] p-2 border-b border-[#333333] flex justify-between items-center">
        <div className="flex items-center">
        <svg width="24" height="24" viewBox="0 0 40 40" className="mr-1" fill="none">
          <defs>
            <filter id="glow" x="-10" y="-10" width="60" height="60" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="20" cy="20" r="10" fill="none" stroke="#22c55e" strokeWidth="4" filter="url(#glow)" />
          <circle cx="20" cy="20" r="14" fill="none" stroke="rgb(34,197,94)" strokeWidth="2" opacity="0.3" filter="url(#glow)" />
        </svg>
          <h1 className="text-lg font-bold" style={{ color: NEW_RELIC_GREEN }}>mRelic</h1>
        </div>
        <div className="flex items-center space-x-3">
            <div className="ml-4 text-xs text-gray-400">
                DB Size: {dbSize ? (dbSize / 1024 / 1024).toFixed(2) + ' MB' : '...'}
            </div>
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
                    colorPrimary: NEW_RELIC_GREEN,
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
            onClick={showClearModal}
            className="px-2 py-1 bg-[#ff5555] hover:bg-[#d13b3b] rounded text-xs transition-colors hover:cursor-pointer"
          >
            Clear
          </button>
        </div>
      </header>

      {showGraph && (
        <div className="bg-[#151515] p-2 border-b border-[#333333]">
          <div className="text-xs text-gray-400 mb-1">Log Volume</div>
          <div className="h-48 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(() => {
                  const logsToGraph = filteredLogs.length > 0 ? filteredLogs : [];
                  if (logsToGraph.length === 0) return [];
                  
                  const timeIntervals: { [key: string]: number } = {};
                  let intervalMs = 60000;
                  switch (dateRange) {
                    case '15m': case '30m': intervalMs = 60000; break;
                    case '1h': intervalMs = 300000; break;
                    case '4h': intervalMs = 900000; break;
                    case '24h': intervalMs = 3600000; break;
                    case '7d': intervalMs = 21600000; break;
                    case '30d': intervalMs = 86400000; break;
                    default: intervalMs = 60000;
                  }
                  
                  const dateValues = getDateRangeValues();
                  if (!dateValues.startDate || !dateValues.endDate) return [];
                  
                  const startTime = new Date(dateValues.startDate).getTime();
                  const endTime = new Date(dateValues.endDate).getTime();
                  if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) return [];
                  
                  for (let time = startTime; time <= endTime; time += intervalMs) {
                    if (!isNaN(time)) {
                      timeIntervals[new Date(time).toISOString()] = 0;
                    }
                  }
                  
                  logsToGraph.forEach(log => {
                    const logTime = new Date(log.timestamp).getTime();
                    if (!isNaN(logTime)) {
                      const bucketTime = Math.floor((logTime - startTime) / intervalMs) * intervalMs + startTime;
                      if (!isNaN(bucketTime)) {
                        const timeKey = new Date(bucketTime).toISOString();
                        if (timeIntervals[timeKey] !== undefined) {
                          timeIntervals[timeKey]++;
                        }
                      }
                    }
                  });
                  
                  return Object.keys(timeIntervals)
                    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                    .map(time => {
                      const date = new Date(time);
                      let formattedTime;
                      if (intervalMs >= 86400000) {
                        formattedTime = date.toLocaleDateString();
                      } else if (intervalMs >= 3600000) {
                        formattedTime = date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      } else {
                        formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                      return { time: formattedTime, count: timeIntervals[time], fullTime: time };
                    });
                })()}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                <XAxis dataKey="time" stroke="#666666" tick={{ fill: '#999999', fontSize: 10 }} axisLine={{ stroke: '#333333' }} />
                <YAxis stroke="#666666" tick={{ fill: '#999999', fontSize: 10 }} axisLine={{ stroke: '#333333' }} />
                <Tooltip contentStyle={{ backgroundColor: '#151515', border: 'none', borderRadius: '3px', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} labelStyle={{ color: '#ffffff', fontWeight: 'bold' }} itemStyle={{ color: '#ffffff' }} />
                <Line type="monotone" dataKey="count" stroke={NEW_RELIC_GREEN} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <LogFilter onFilterChange={handleFilterChange} levels={levels} services={services} search={filters.search} />

      <div className="bg-[#151515] p-2 border-b border-[#333333] flex flex-wrap gap-2">
        <div className="text-xs text-gray-400">Columns:</div>
        {availableColumns.map(column => (
          <div key={column} className="flex items-center text-xs">
            <input
              type="checkbox"
              id={`col-${column}`}
              checked={selectedColumns.includes(column)}
              onChange={() => {
                setSelectedColumns(prev => prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]);
              }}
              className="mr-1 h-3 w-3"
            />
            <label htmlFor={`col-${column}`} className="text-gray-300">{column}</label>
          </div>
        ))}
      </div>

      <div className="flex-grow overflow-auto">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">No logs to display.</p>
          </div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#222222] sticky top-0">
              <tr>
                {selectedColumns.includes('timestamp') && <th className="p-2 text-left text-gray-400 font-medium">Time</th>}
                {selectedColumns.includes('service') && <th className="p-2 text-left text-gray-400 font-medium">Service</th>}
                {selectedColumns.includes('level') && <th className="p-2 text-left text-gray-400 font-medium">Level</th>}
                {selectedColumns.includes('message') && <th className="p-2 text-left text-gray-400 font-medium">Message</th>}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const formatTimestamp = (timestamp: string) => {
                  try {
                    const date = new Date(timestamp);
                    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
                  } catch (e) {
                    return timestamp;
                  }
                };
                const getLevelColor = (level?: string) => {
                  if (!level) return 'bg-gray-500';
                  switch (level.toLowerCase()) {
                    case 'error': return 'bg-red-500';
                    case 'warn': case 'warning': return 'bg-yellow-500';
                    case 'info': return 'bg-blue-500';
                    case 'debug': return 'bg-green-500';
                    default: return 'bg-gray-500';
                  }
                };
                return (
                  <tr key={log.id} className="border-b border-[#333333] hover:bg-[#222222] cursor-pointer" onClick={() => openLogDrawer(log)}>
                    {selectedColumns.includes('timestamp') && <td className="p-2 text-gray-300 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>}
                    {selectedColumns.includes('service') && <td className="p-2"><span className="bg-[#333333] text-gray-300 px-2 py-0.5 rounded">{log.service || 'unknown'}</span></td>}
                    {selectedColumns.includes('level') && <td className="p-2"><div className="flex items-center"><div className={`w-2 h-2 rounded-full mr-1 ${getLevelColor(log.level)}`}></div><span className="text-gray-300">{log.level}</span></div></td>}
                    {selectedColumns.includes('message') && <td className="p-2 text-gray-300 truncate max-w-md">{log.message}</td>}
                    <td className="p-2 text-right"><svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div ref={logsEndRef} />
      </div>

      <footer className="bg-[#151515] p-2 border-t border-[#333333] text-center text-xs text-gray-500">
        <p>Displaying {filteredLogs.length} of {logs.length} logs</p>
      </footer>

            <ConfigProvider
                theme={{
                  algorithm: theme.darkAlgorithm,
                  token: {
                    colorPrimary: NEW_RELIC_GREEN,
                    colorBgBase: '#222222',
                    colorTextBase: '#e5e7eb',
                    colorBorder: '#333333',
                  },
                }}
            >
                <Modal
                    title="Clear Logs"
                    open={isClearModalVisible}
                    onOk={handleClearOk}
                    onCancel={handleClearCancel}
                    footer={[
                        <button key="back" onClick={handleClearCancel} className="px-3 py-1.5 bg-[#222222] border border-[#333333] rounded text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00b9ff] mr-2">
                            Cancel
                        </button>,
                        <button key="submit" onClick={handleClearOk} className="px-3 py-1.5 bg-[#ff5555] hover:bg-[#d13b3b] rounded text-sm text-white transition-colors hover:cursor-pointer">
                            Clear
                        </button>,
                    ]}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Service</label>
                            <select
                                value={clearService}
                                onChange={(e) => setClearService(e.target.value)}
                                className="mt-1 block w-full px-3 py-1.5 bg-[#222222] border border-[#333333] rounded text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00b9ff]"
                            >
                                <option value="">All Services</option>
                                {services.map(service => (
                                    <option key={service} value={service}>{service}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Timeframe</label>
                            <select
                                value={clearTimeframe}
                                onChange={(e) => setClearTimeframe(e.target.value)}
                                className="mt-1 block w-full px-3 py-1.5 bg-[#222222] border border-[#333333] rounded text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00b9ff]"
                            >
                                <option value="7d">Older than 7 days</option>
                                <option value="14d">Older than 14 days</option>
                                <option value="30d">Older than 30 days</option>
                                <option value="all">All time</option>
                            </select>
                        </div>
                    </div>
                </Modal>
            </ConfigProvider>

      {drawerOpen && selectedLog && (
        <div className="fixed inset-y-0 right-0 w-1/3 bg-[#222222] border-l border-[#333333] shadow-lg overflow-auto z-10 font-mono">
          <div className="sticky top-0 bg-[#222222] p-3 border-b border-[#333333] flex justify-between items-center">
            <h3 className="text-sm font-semibold" style={{ color: NEW_RELIC_GREEN }}>Log Details</h3>
            <button onClick={closeDrawer} className="text-gray-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="p-3 border-b border-[#333333] bg-[#1a1a1a]">
            <div className="mb-2">
              <div className="text-xs text-gray-400">Timestamp</div>
              <div className="text-sm text-white">{new Date(selectedLog.timestamp).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Message</div>
              <div className="text-sm text-white whitespace-pre-wrap break-words">{selectedLog.message}</div>
            </div>
          </div>
          
          <div className="p-3">
            <div className="text-xs mb-2 flex justify-between items-center" style={{ color: NEW_RELIC_GREEN }}>
              <span>Attributes</span>
              <div className="flex items-center">
                <button
                  onClick={() => setIsFormatted(true)}
                  className={`px-2 py-0.5 text-xs rounded-l-md ${isFormatted ? 'bg-green-500 text-white' : 'bg-[#333333] text-gray-300'}`}
                >
                  Formatted
                </button>
                <button
                  onClick={() => setIsFormatted(false)}
                  className={`px-2 py-0.5 text-xs rounded-r-md ${!isFormatted ? 'bg-green-500 text-white' : 'bg-[#333333] text-gray-300'}`}
                >
                  Unformatted
                </button>
              </div>
            </div>
            <div className="space-y-1 bg-[#1a1a1a] p-2 rounded">
              {Object.entries(
                isFormatted
                  ? flattenObject(Object.fromEntries(Object.entries(selectedLog).filter(([key]) => !['id', 'timestamp', 'message'].includes(key))))
                  : Object.fromEntries(Object.entries(selectedLog).filter(([key]) => !['id', 'timestamp', 'message'].includes(key)))
              ).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center group">
                  <div className="flex-grow overflow-hidden">
                    <span className="text-xs" style={{ color: '#01b9de' }}>{key}: </span>
                    <span className="ml-2 text-xs text-green-400 break-all whitespace-pre-wrap">
                      {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => copyToClipboard(key, value)}
                        className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#333333]"
                        title="Copy value"
                    >
                        {copiedKey === key ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                    <button
                        onClick={() => addFilterFromDrawer(key, value)}
                        className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#333333]"
                        title={`Filter by ${key}`}
                    >
                        <FilterIcon size={14} />
                    </button>
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
