'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MlV2ReviewDecision, CompleteReviewPayload } from '../../types/ml-v2-review';

interface MlV2CompleteReviewFormProps {
  originalCandidateId?: string;
  isSubmitting: boolean;
  onSubmit: (payload: CompleteReviewPayload) => void;
}

export const MlV2CompleteReviewForm: React.FC<MlV2CompleteReviewFormProps> = ({
  originalCandidateId,
  isSubmitting,
  onSubmit,
}) => {
  const [decision, setDecision] = useState<MlV2ReviewDecision | ''>('');
  const [reviewedCandidateId, setReviewedCandidateId] = useState(originalCandidateId || '');
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Sync initial candidate ID when it changes
  useEffect(() => {
    if (originalCandidateId && !reviewedCandidateId) {
      setReviewedCandidateId(originalCandidateId);
    }
  }, [originalCandidateId, reviewedCandidateId]);

  // Clear invalid fields when decision changes
  useEffect(() => {
    if (decision === 'REJECTED' || decision === 'INCONCLUSIVE') {
      setReviewedCandidateId('');
    } else if (decision === 'CONFIRMED' && !reviewedCandidateId) {
      setReviewedCandidateId(originalCandidateId || '');
    }
  }, [decision, originalCandidateId]);

  const isValid = () => {
    if (!decision) return false;
    
    const trimmedNotes = notes.trim();

    if (decision === 'CONFIRMED') {
      if (!reviewedCandidateId.trim() || reviewedCandidateId.length > 128) return false;
      if (trimmedNotes && trimmedNotes.length > 2000) return false;
    } else {
      if (trimmedNotes.length < 3 || trimmedNotes.length > 2000) return false;
    }

    return true;
  };

  const handleSubmitClick = () => {
    if (isValid()) {
      setShowConfirm(true);
    }
  };

  const handleConfirmSubmit = () => {
    const trimmedNotes = notes.trim();
    
    if (decision === 'CONFIRMED') {
      onSubmit({
        decision,
        reviewedCandidateId: reviewedCandidateId.trim(),
        notes: trimmedNotes || undefined,
      });
    } else if (decision === 'REJECTED' || decision === 'INCONCLUSIVE') {
      onSubmit({
        decision,
        notes: trimmedNotes,
      });
    }
    setShowConfirm(false);
  };

  return (
    <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)]">
      <h3 className="text-lg font-medium text-white mb-2">Complete Review</h3>
      
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input 
            type="radio" 
            name="decision" 
            value="CONFIRMED" 
            checked={decision === 'CONFIRMED'}
            onChange={() => setDecision('CONFIRMED')}
            className="accent-blue-500"
          />
          Confirmed
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input 
            type="radio" 
            name="decision" 
            value="REJECTED" 
            checked={decision === 'REJECTED'}
            onChange={() => setDecision('REJECTED')}
            className="accent-red-500"
          />
          Rejected
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input 
            type="radio" 
            name="decision" 
            value="INCONCLUSIVE" 
            checked={decision === 'INCONCLUSIVE'}
            onChange={() => setDecision('INCONCLUSIVE')}
            className="accent-orange-500"
          />
          Inconclusive
        </label>
      </div>

      {decision === 'CONFIRMED' && (
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-sm text-gray-400">
            Selected Candidate ID <span className="text-red-400">*</span>
          </label>
          <Input 
            value={reviewedCandidateId}
            onChange={(e) => setReviewedCandidateId(e.target.value)}
            placeholder="e.g. DID001"
            maxLength={128}
          />
          <p className="text-xs text-blue-400/80 mt-1">
            Changing this value does not modify the original ML telemetry candidate.
          </p>
        </div>
      )}

      {decision !== '' && (
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-sm text-gray-400">
            Notes {decision !== 'CONFIRMED' && <span className="text-red-400">*</span>}
          </label>
          <textarea
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[100px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add review notes or justification..."
            maxLength={2000}
          />
          <div className="text-right text-xs text-gray-500">
            {notes.length} / 2000
          </div>
        </div>
      )}

      {showConfirm ? (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-4 flex flex-col gap-3">
          <h4 className="text-yellow-400 font-medium">Confirm Final Decision</h4>
          <div className="text-sm text-gray-300">
            <p><span className="text-gray-500">Decision:</span> <strong className="text-white">{decision}</strong></p>
            {decision === 'CONFIRMED' && (
              <p><span className="text-gray-500">Selected Candidate:</span> <strong className="text-white">{reviewedCandidateId}</strong></p>
            )}
            {notes && (
              <p className="mt-1"><span className="text-gray-500">Notes:</span> {notes.substring(0, 100)}{notes.length > 100 ? '...' : ''}</p>
            )}
          </div>
          <p className="text-xs text-yellow-400/80 mt-1">This action cannot be undone. The review will be finalized.</p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Yes, Submit Review'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end mt-4">
          <Button 
            variant="primary" 
            onClick={handleSubmitClick}
            disabled={!isValid() || isSubmitting}
          >
            Review & Submit
          </Button>
        </div>
      )}
    </div>
  );
};
