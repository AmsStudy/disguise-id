'use client';

import React from 'react';
import { Button } from '../ui/Button';
import { MlV2PromotionQueueItem } from '../../types/ml-v2-promotion';
import { format } from 'date-fns';

interface MlV2PromotionQueueTableProps {
  data: MlV2PromotionQueueItem[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPromote: (item: MlV2PromotionQueueItem) => void;
  canPromote: boolean;
}

export const MlV2PromotionQueueTable: React.FC<MlV2PromotionQueueTableProps> = ({
  data,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onPromote,
  canPromote,
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-lg">No reviews eligible for promotion.</p>
        <p className="text-sm mt-1">Pending or unconfirmed reviews will not appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#151c2c] border border-white/5 rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-[#1e2638]">
            <tr>
              <th className="px-4 py-3 font-medium">Review ID</th>
              <th className="px-4 py-3 font-medium">Reviewed Candidate</th>
              <th className="px-4 py-3 font-medium">Original Decision</th>
              <th className="px-4 py-3 font-medium">Reviewed At</th>
              <th className="px-4 py-3 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-400">
                  {item.id}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono font-medium text-white bg-blue-500/10 px-2 py-0.5 rounded">
                    {item.reviewedCandidateId}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    item.inferenceResult?.frameDecision === 'HIGH_PRIORITY_CANDIDATE' ? 'bg-red-500/10 text-red-400' :
                    item.inferenceResult?.frameDecision === 'POSSIBLE_MATCH' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {item.inferenceResult?.frameDecision || 'UNKNOWN'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {item.reviewedAt ? format(new Date(item.reviewedAt), 'dd MMM yyyy HH:mm:ss') : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onPromote(item)}
                    disabled={!canPromote}
                  >
                    Promote
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 bg-[#1a2133] border-t border-white/5 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Page <span className="font-medium text-white">{page}</span> of <span className="font-medium text-white">{totalPages}</span>
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
