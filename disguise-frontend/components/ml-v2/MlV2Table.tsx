'use client';

import React from 'react';
import { Button } from '../ui/Button';
import { MlV2StatusBadge } from './MlV2StatusBadge';
import { MlV2InferenceResult } from '../../types/ml-v2';

interface MlV2TableProps {
  data: MlV2InferenceResult[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onViewDetail: (id: string) => void;
}

export const MlV2Table: React.FC<MlV2TableProps> = ({ 
  data, 
  isLoading, 
  page, 
  totalPages, 
  onPageChange, 
  onViewDetail 
}) => {
  if (isLoading) {
    return (
      <div className="bg-[#151c2c] border border-white/5 rounded-xl p-4">
        <div className="animate-pulse flex flex-col gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#151c2c] border border-white/5 rounded-xl p-12 flex flex-col items-center justify-center text-gray-400">
        <svg className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg">No data available</p>
        <p className="text-sm mt-1">Adjust filters or refresh to see recent inferences.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#151c2c] border border-white/5 rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-[#1e2638]">
            <tr>
              <th className="px-4 py-3 font-medium">Created At</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Decision</th>
              <th className="px-4 py-3 font-medium">Candidate ID</th>
              <th className="px-4 py-3 font-medium">Score / Margin</th>
              <th className="px-4 py-3 font-medium text-center">Verification</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <MlV2StatusBadge type="status" status={item.status} />
                </td>
                <td className="px-4 py-3">
                  <MlV2StatusBadge type="frameDecision" frameDecision={item.frameDecision} />
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {item.frameDecision === 'UNKNOWN' ? (
                    <span className="text-gray-500 line-through" title="Nearest candidate telemetry only">{item.candidateId || 'N/A'}</span>
                  ) : (
                    <span className={item.candidateId ? 'text-cyan-400' : 'text-gray-500'}>{item.candidateId || 'N/A'}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">
                  {item.score !== null ? item.score.toFixed(4) : 'N/A'} / {item.margin !== null ? item.margin.toFixed(4) : 'N/A'}
                </td>
                <td className="px-4 py-3 text-center">
                  {item.requiresOperatorVerification ? (
                    <span className="text-yellow-500 font-bold">YES</span>
                  ) : (
                    <span className="text-gray-600">NO</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="secondary" onClick={() => onViewDetail(item.id)} className="px-2 py-1 text-xs">
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="p-4 border-t border-white/5 flex items-center justify-between bg-[#1e2638]">
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              onClick={() => onPageChange(page - 1)} 
              disabled={page <= 1}
              className="px-3 py-1 text-xs"
            >
              Previous
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => onPageChange(page + 1)} 
              disabled={page >= totalPages}
              className="px-3 py-1 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
