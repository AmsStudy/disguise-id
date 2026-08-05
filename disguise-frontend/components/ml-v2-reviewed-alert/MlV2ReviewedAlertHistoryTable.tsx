'use client';

import React from 'react';
import { Button } from '../ui/Button';
import { MlV2ReviewedAlert } from '../../types/ml-v2-reviewed-alert';
import { format } from 'date-fns';

interface MlV2ReviewedAlertHistoryTableProps {
  data: MlV2ReviewedAlert[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetail: (item: MlV2ReviewedAlert) => void;
}

export const MlV2ReviewedAlertHistoryTable: React.FC<MlV2ReviewedAlertHistoryTableProps> = ({
  data,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onViewDetail,
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-lg">No reviewed alerts found.</p>
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
              <th className="px-4 py-3 font-medium">Alert ID</th>
              <th className="px-4 py-3 font-medium">Promoted Candidate</th>
              <th className="px-4 py-3 font-medium">Promotion ID</th>
              <th className="px-4 py-3 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  {item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy HH:mm:ss') : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-400">
                  {item.id}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono font-medium text-white bg-blue-500/10 px-2 py-0.5 rounded">
                    {item.promotedCandidateId}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-400">
                  {item.promotionId}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onViewDetail(item)}
                  >
                    View Detail
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
