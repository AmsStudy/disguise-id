'use client';

import React from 'react';
import { Button } from '../ui/Button';
import { MlV2ReviewQueueItem } from '../../types/ml-v2-review';
import { format } from 'date-fns';

interface MlV2ReviewQueueTableProps {
  data: MlV2ReviewQueueItem[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onViewDetail: (item: MlV2ReviewQueueItem) => void;
  onClaim: (item: MlV2ReviewQueueItem) => void;
  claimingId: string | null;
}

export const MlV2ReviewQueueTable: React.FC<MlV2ReviewQueueTableProps> = ({ 
  data, 
  isLoading, 
  page, 
  totalPages, 
  onPageChange, 
  onViewDetail,
  onClaim,
  claimingId
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg">No reviews found in queue.</p>
        <p className="text-sm mt-1">Adjust filters or check back later.</p>
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
              <th className="px-4 py-3 font-medium">Decision</th>
              <th className="px-4 py-3 font-medium">Candidate ID</th>
              <th className="px-4 py-3 font-medium">State</th>
              <th className="px-4 py-3 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((item) => {
              const isClaimedByOther = item.claimedState === 'CLAIMED_BY_OTHER';
              const isClaiming = claimingId === item.id;
              return (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(item.createdAt), 'dd MMM yyyy HH:mm:ss')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.frameDecision === 'HIGH_PRIORITY_CANDIDATE' ? 'bg-red-500/10 text-red-400' : 
                      item.frameDecision === 'POSSIBLE_MATCH' ? 'bg-orange-500/10 text-orange-400' : 
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {item.frameDecision}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-400">
                    {item.candidateId || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.claimedState === 'UNCLAIMED' ? 'bg-gray-500/10 text-gray-400' :
                      item.claimedState === 'CLAIMED_BY_ME' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-orange-500/10 text-orange-400'
                    }`}>
                      {item.claimedState.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex justify-center items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onViewDetail(item)}
                      >
                        View
                      </Button>
                      {!isClaimedByOther && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isClaiming || item.claimedState === 'CLAIMED_BY_ME'}
                          onClick={() => onClaim(item)}
                        >
                          {isClaiming ? 'Claiming...' : (item.claimedState === 'CLAIMED_BY_ME' ? 'Claimed' : 'Claim')}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
