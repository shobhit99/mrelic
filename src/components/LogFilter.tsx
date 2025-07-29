import React, { useState } from 'react';

interface LogFilterProps {
  onFilterChange: (filters: {
    search: string;
    level: string;
    service: string;
  }) => void;
  levels: string[];
  services: string[];
}

const LogFilter: React.FC<LogFilterProps> = ({ onFilterChange, levels, services }) => {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [service, setService] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearch(newSearch);
    onFilterChange({ search: newSearch, level, service });
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel = e.target.value;
    setLevel(newLevel);
    onFilterChange({ search, level: newLevel, service });
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newService = e.target.value;
    setService(newService);
    onFilterChange({ search, level, service: newService });
  };

  const clearFilters = () => {
    setSearch('');
    setLevel('');
    setService('');
    onFilterChange({ search: '', level: '', service: '' });
  };

  return (
    <div className="bg-gray-900 p-2 border-b border-gray-700">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Larger search bar like New Relic */}
        <div className="flex-grow w-full mb-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00b9ff]"
              placeholder="Search logs... (e.g. level:error service:api-gateway contextId:abc123)"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center w-full">

        <div className="flex items-center">
          <span className="text-xs text-gray-400 mr-1">Level:</span>
          <select
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00b9ff]"
            value={level}
            onChange={handleLevelChange}
          >
            <option value="">All</option>
            {levels.map(lvl => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <span className="text-xs text-gray-400 mr-1">Service:</span>
          <select
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00b9ff]"
            value={service}
            onChange={handleServiceChange}
          >
            <option value="">All</option>
            {services.map(svc => (
              <option key={svc} value={svc}>{svc}</option>
            ))}
          </select>
        </div>

          <div>
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#00b9ff] transition-colors"
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogFilter;