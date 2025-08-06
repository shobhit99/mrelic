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
    <div className="border-b border-[#333333] bg-[#151515] p-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mb-2 w-full flex-grow">
          <div className="relative flex">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={16} color={'#0e74df'} />
            </div>
            <input
              type="text"
              className="flex-grow rounded-l border border-[#333333] bg-[#222222] py-2 pr-10 pl-10 text-sm text-gray-200 focus:outline-none"
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
              className="cursor-pointer rounded-r px-4 py-2 text-sm text-white transition-colors hover:bg-[#36a3ff] hover:text-white focus:ring-1 focus:outline-none"
              style={{ backgroundColor: '#0e74df', borderColor: '#0e74df' }}
            >
              Search
            </button>
            <div className="absolute inset-y-0 right-20 flex items-center pr-3">
              <div className="group relative">
                <svg
                  className="h-4 w-4 cursor-help text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="absolute top-full right-0 z-10 mt-2 hidden w-64 rounded bg-[#333333] p-2 text-xs text-gray-200 shadow-lg group-hover:block">
                  <p className="mb-1 font-bold">Search Syntax:</p>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>
                      <code>key:&quot;value&quot;</code> - Exact match
                    </li>
                    <li>
                      <code>key:*value*</code> - Contains value
                    </li>
                    <li>
                      <code>-key:value</code> - Exclude this value
                    </li>
                    <li>
                      <code>&quot;text&quot;</code> - Search all fields
                    </li>
                    <li>
                      <code>&quot;text1&quot; &quot;text2&quot;</code> -
                      Multiple terms
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2">
          <div className="flex items-center">
            <span className="mr-1 text-xs text-gray-400">Level:</span>
            <select
              className="rounded border border-[#333333] bg-[#222222] px-2 py-1 text-xs text-gray-200 focus:ring-1 focus:ring-[#00b9ff] focus:outline-none"
              value={level}
              onChange={handleLevelChange}
            >
              <option value="">All</option>
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <span className="mr-1 text-xs text-gray-400">Service:</span>
            <select
              className="rounded border border-[#333333] bg-[#222222] px-2 py-1 text-xs text-gray-200 focus:ring-1 focus:ring-[#00b9ff] focus:outline-none"
              value={service}
              onChange={handleServiceChange}
            >
              <option value="">All</option>
              {services.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              className="rounded bg-[#333333] px-2 py-1 text-xs text-gray-200 transition-colors hover:bg-[#444444] focus:ring-1 focus:ring-[#00b9ff] focus:outline-none"
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
