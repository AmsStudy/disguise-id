'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { MlV2ListQuery, MlV2Status, MlV2FrameDecision } from '../../types/ml-v2';

interface MlV2FiltersProps {
  filters: MlV2ListQuery;
  onChange: (newFilters: MlV2ListQuery) => void;
  onReset: () => void;
}

export const MlV2Filters: React.FC<MlV2FiltersProps> = ({ filters, onChange, onReset }) => {
  const [localTextFilters, setLocalTextFilters] = useState({
    candidateId: filters.candidateId || '',
    cameraSessionId: filters.cameraSessionId || '',
    trackId: filters.trackId || '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      let changed = false;
      const updates: Partial<MlV2ListQuery> = {};

      if (localTextFilters.candidateId !== (filters.candidateId || '')) {
        updates.candidateId = localTextFilters.candidateId === '' ? undefined : localTextFilters.candidateId;
        changed = true;
      }
      if (localTextFilters.cameraSessionId !== (filters.cameraSessionId || '')) {
        updates.cameraSessionId = localTextFilters.cameraSessionId === '' ? undefined : localTextFilters.cameraSessionId;
        changed = true;
      }
      if (localTextFilters.trackId !== (filters.trackId || '')) {
        updates.trackId = localTextFilters.trackId === '' ? undefined : localTextFilters.trackId;
        changed = true;
      }

      if (changed) {
        onChange({ ...filters, ...updates, page: 1 });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localTextFilters, filters, onChange]);

  const handleSelectChange = (key: keyof MlV2ListQuery, value: string) => {
    onChange({ ...filters, [key]: value === '' ? undefined : value, page: 1 });
  };

  const handleCheckboxChange = (key: keyof MlV2ListQuery, checked: boolean) => {
    onChange({ ...filters, [key]: checked ? true : undefined, page: 1 });
  };

  const handleReset = () => {
    setLocalTextFilters({ candidateId: '', cameraSessionId: '', trackId: '' });
    onReset();
  };

  return (
    <div className="bg-[#151c2c] p-4 rounded-xl border border-white/5 mb-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Status</label>
          <select 
            className="w-full bg-[#1e2638] border border-white/10 rounded-md p-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            value={filters.status || ''}
            onChange={(e) => handleSelectChange('status', e.target.value)}
          >
            <option value="">All</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Frame Decision</label>
          <select 
            className="w-full bg-[#1e2638] border border-white/10 rounded-md p-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            value={filters.frameDecision || ''}
            onChange={(e) => handleSelectChange('frameDecision', e.target.value)}
          >
            <option value="">All</option>
            <option value="HIGH_PRIORITY_CANDIDATE">High Priority</option>
            <option value="POSSIBLE_MATCH">Possible Match</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Candidate ID</label>
          <Input 
            placeholder="Search DID..." 
            value={localTextFilters.candidateId}
            onChange={(e) => setLocalTextFilters(prev => ({ ...prev, candidateId: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Camera Session</label>
          <Input 
            placeholder="Session ID..." 
            value={localTextFilters.cameraSessionId}
            onChange={(e) => setLocalTextFilters(prev => ({ ...prev, cameraSessionId: e.target.value }))}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
          <input 
            type="checkbox" 
            className="rounded border-white/10 bg-[#1e2638] text-cyan-500 focus:ring-cyan-500"
            checked={!!filters.requiresOperatorVerification}
            onChange={(e) => handleCheckboxChange('requiresOperatorVerification', e.target.checked)}
          />
          Requires Operator Verification
        </label>
        
        <Button variant="secondary" onClick={handleReset} className="text-xs">
          Reset Filters
        </Button>
      </div>
    </div>
  );
};
