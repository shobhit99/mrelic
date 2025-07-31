import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const NEW_RELIC_GREEN = '#22c55e';

interface LogFilterProps {
  onFilterChange: (filters: {
    search: string;
    level: string;
    service: string;
  }) => void;
  levels: string[];
  services: string[];
  search?: string;
}

const LogFilter: React.FC<LogFilterProps> = (props) => {
  const { onFilterChange, levels, services } = props;
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [service, setService] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearch(newSearch);
  };

  const handleSearchClick = () => {
    onFilterChange({ search, level, service });
  };
  
  const clearSearch = () => {
    setSearch('');
    onFilterChange({ search: '', level, service });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };
  
  useEffect(() => {
    if (search !== props.search && props.search !== undefined) {
      setSearch(props.search);
    }
  }, [props.search]);

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
    <div className="bg-[#151515] p-2 border-b border-[#333333]">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-grow w-full mb-2">
            <div className="relative flex">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={16} color={'#0e74df'} />
              </div>
              <input
                type="text"
                className="flex-grow pl-10 pr-10 py-2 bg-[#222222] border border-[#333333] rounded-l text-sm text-gray-200 focus:outline-none"
                placeholder='Search (e.g., key:"value", key:*value*, -key:value, "text")'
                value={search}
                onChange={handleSearchChange}
                onKeyPress={handleKeyPress}
              />
              {search && (
                <div className="absolute inset-y-0 right-28 flex items-center pr-3">
                    <button
                        onClick={clearSearch}
                        className="text-gray-400 hover:text-white"
                        title="Clear search"
                    >
                        <X size={16} />
                    </button>
                </div>
              )}
              <button
                onClick={handleSearchClick}
                className="px-4 py-2 text-white text-sm rounded-r focus:outline-none focus:ring-1 transition-colors hover:bg-[#36a3ff] hover:text-white cursor-pointer"
                style={{ backgroundColor: '#0e74df',  borderColor: '#0e74df'}}
              >
                Search
              </button>
              <div className="absolute inset-y-0 right-20 flex items-center pr-3">
                <div className="group relative">
                  <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute hidden group-hover:block right-0 top-full mt-2 w-64 p-2 bg-[#333333] text-xs text-gray-200 rounded shadow-lg z-10">
                    <p className="font-bold mb-1">Search Syntax:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><code>key:&quot;value&quot;</code> - Exact match</li>
                      <li><code>key:*value*</code> - Contains value</li>
                      <li><code>-key:value</code> - Exclude this value</li>
                      <li><code>&quot;text&quot;</code> - Search all fields</li>
                      <li><code>&quot;text1&quot; &quot;text2&quot;</code> - Multiple terms</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center w-full">

          <div className="flex items-center">
            <span className="text-xs text-gray-400 mr-1">Level:</span>
            <select
              className="px-2 py-1 bg-[#222222] border border-[#333333] rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00b9ff]"
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
              className="px-2 py-1 bg-[#222222] border border-[#333333] rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00b9ff]"
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
                className="px-2 py-1 bg-[#333333] hover:bg-[#444444] text-xs text-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#00b9ff] transition-colors"
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
