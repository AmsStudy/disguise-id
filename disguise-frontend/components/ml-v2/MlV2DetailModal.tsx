'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { MlV2StatusBadge } from './MlV2StatusBadge';
import { getMlV2TelemetryById } from '../../services/mlV2Api';

interface MlV2DetailModalProps {
  id: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MlV2DetailModal: React.FC<MlV2DetailModalProps> = ({ id, isOpen, onClose }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['mlV2Detail', id],
    queryFn: () => getMlV2TelemetryById(id!),
    enabled: !!id && isOpen,
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#151c2c] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-[#151c2c] border-b border-white/5 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold text-white">ML V2 Telemetry Detail</h2>
          <Button variant="secondary" onClick={onClose} className="px-3 py-1">Close</Button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-white/5 rounded w-1/3"></div>
              <div className="h-24 bg-white/5 rounded"></div>
              <div className="h-24 bg-white/5 rounded"></div>
            </div>
          ) : isError ? (
            <div className="text-center text-red-400 py-8">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error instanceof Error ? error.message : 'Result not found or an error occurred'}</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              
              {/* General Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1e2638] p-3 rounded-lg border border-white/5">
                  <span className="block text-xs text-gray-500 mb-1">Status</span>
                  <MlV2StatusBadge type="status" status={data.status} />
                </div>
                <div className="bg-[#1e2638] p-3 rounded-lg border border-white/5">
                  <span className="block text-xs text-gray-500 mb-1">Decision</span>
                  <MlV2StatusBadge type="frameDecision" frameDecision={data.frameDecision} />
                </div>
                <div className="bg-[#1e2638] p-3 rounded-lg border border-white/5">
                  <span className="block text-xs text-gray-500 mb-1">Selected Branch</span>
                  <span className="text-sm text-cyan-400 font-mono">{data.selectedBranch || 'N/A'}</span>
                </div>
                <div className="bg-[#1e2638] p-3 rounded-lg border border-white/5">
                  <span className="block text-xs text-gray-500 mb-1">Req. Verification</span>
                  <span className={`text-sm font-bold ${data.requiresOperatorVerification ? 'text-yellow-500' : 'text-gray-400'}`}>
                    {data.requiresOperatorVerification ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>

              {/* UNKNOWN Warning */}
              {data.frameDecision === 'UNKNOWN' && (
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg flex items-start gap-3">
                  <span className="text-blue-400 text-xl">ℹ️</span>
                  <p className="text-sm text-blue-200">
                    <strong>Telemetry Only:</strong> The candidate shown below is the nearest gallery candidate for telemetry purposes only and is <strong>not</strong> an accepted identity.
                  </p>
                </div>
              )}

              {/* IDs */}
              <div className="bg-[#1e2638] rounded-lg border border-white/5 overflow-hidden">
                <div className="bg-white/5 px-4 py-2 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-gray-300">Identifiers</h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <div><span className="text-gray-500 w-32 inline-block">Result ID</span> <span className="font-mono text-gray-300">{data.id}</span></div>
                  <div><span className="text-gray-500 w-32 inline-block">Detection Event</span> <span className="font-mono text-gray-300">{data.detectionEventId}</span></div>
                  <div><span className="text-gray-500 w-32 inline-block">Camera Session</span> <span className="font-mono text-gray-300">{data.cameraSessionId || 'N/A'}</span></div>
                  <div><span className="text-gray-500 w-32 inline-block">Track ID</span> <span className="font-mono text-gray-300">{data.trackId || 'N/A'}</span></div>
                  <div><span className="text-gray-500 w-32 inline-block">Job ID</span> <span className="font-mono text-gray-300">{data.jobId || 'N/A'}</span></div>
                  <div><span className="text-gray-500 w-32 inline-block">Request ID</span> <span className="font-mono text-gray-300">{data.requestId || 'N/A'}</span></div>
                </div>
              </div>

              {/* Branches Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Branch */}
                <div className={`bg-[#1e2638] rounded-lg border ${data.selectedBranch === 'ORIGINAL' ? 'border-cyan-500/50' : 'border-white/5'} overflow-hidden`}>
                  <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between">
                    <h3 className="text-sm font-semibold text-gray-300">Original Branch</h3>
                    {data.selectedBranch === 'ORIGINAL' && <span className="text-xs bg-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded">Selected</span>}
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Valid</span> <span className="text-gray-300">{data.originalValid ? 'True' : 'False'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Candidate ID</span> <span className="font-mono text-gray-300">{data.originalCandidateId || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Score</span> <span className="font-mono text-gray-300">{data.originalScore?.toFixed(4) || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Second Score</span> <span className="font-mono text-gray-300">{data.originalSecondScore?.toFixed(4) || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Margin</span> <span className="font-mono text-gray-300">{data.originalMargin?.toFixed(4) || 'N/A'}</span></div>
                  </div>
                </div>

                {/* Reconstructed Branch */}
                <div className={`bg-[#1e2638] rounded-lg border ${data.selectedBranch === 'RECONSTRUCTED' ? 'border-cyan-500/50' : 'border-white/5'} overflow-hidden`}>
                  <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between">
                    <h3 className="text-sm font-semibold text-gray-300">Reconstructed Branch</h3>
                    {data.selectedBranch === 'RECONSTRUCTED' && <span className="text-xs bg-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded">Selected</span>}
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Valid</span> <span className="text-gray-300">{data.reconstructedValid ? 'True' : 'False'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Candidate ID</span> <span className="font-mono text-gray-300">{data.reconstructedCandidateId || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Score</span> <span className="font-mono text-gray-300">{data.reconstructedScore?.toFixed(4) || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Second Score</span> <span className="font-mono text-gray-300">{data.reconstructedSecondScore?.toFixed(4) || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Margin</span> <span className="font-mono text-gray-300">{data.reconstructedMargin?.toFixed(4) || 'N/A'}</span></div>
                  </div>
                </div>
              </div>

              {/* Operations */}
              <div className="bg-[#1e2638] rounded-lg border border-white/5 overflow-hidden">
                <div className="bg-white/5 px-4 py-2 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-gray-300">Operations</h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <div><span className="text-gray-500 w-40 inline-block">Created At</span> <span className="text-gray-300">{new Date(data.createdAt).toLocaleString()}</span></div>
                  <div><span className="text-gray-500 w-40 inline-block">Service Processing</span> <span className="font-mono text-gray-300">{data.serviceProcessingMs} ms</span></div>
                  <div><span className="text-gray-500 w-40 inline-block">Round Trip</span> <span className="font-mono text-gray-300">{data.roundTripLatencyMs} ms</span></div>
                  <div><span className="text-gray-500 w-40 inline-block">Error Code</span> <span className="font-mono text-red-400">{data.errorCode || 'None'}</span></div>
                  <div><span className="text-gray-500 w-40 inline-block">Model Version</span> <span className="font-mono text-gray-300">{data.modelVersion || 'N/A'}</span></div>
                  <div><span className="text-gray-500 w-40 inline-block">Gallery Version</span> <span className="font-mono text-gray-300">{data.galleryVersion || 'N/A'}</span></div>
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
