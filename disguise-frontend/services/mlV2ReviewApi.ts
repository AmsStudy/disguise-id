import api from './api';
import { ApiResponse, PaginatedResponse } from '../types/ml-v2';
import {
  MlV2ReviewQueueItem,
  MlV2ReviewHistoryItem,
  ReviewQueueQuery,
  ReviewsQuery,
  CompleteReviewPayload,
  ReviewDetailResponse,
  MlV2OperatorReview
} from '../types/ml-v2-review';

export const getMlV2ReviewQueue = async (query: ReviewQueueQuery): Promise<PaginatedResponse<MlV2ReviewQueueItem>> => {
  const { data } = await api.get<ApiResponse<MlV2ReviewQueueItem[]>>('/api/v1/ml-v2/review-queue', { params: query });
  if (!data.success || !data.meta) {
    throw new Error('Failed to fetch ML V2 review queue');
  }
  return { items: data.data, meta: data.meta };
};

export const getMlV2Reviews = async (query: ReviewsQuery): Promise<PaginatedResponse<MlV2ReviewHistoryItem>> => {
  const { data } = await api.get<ApiResponse<MlV2ReviewHistoryItem[]>>('/api/v1/ml-v2/reviews', { params: query });
  if (!data.success || !data.meta) {
    throw new Error('Failed to fetch ML V2 reviews');
  }
  return { items: data.data, meta: data.meta };
};

export const getMlV2ReviewById = async (id: string): Promise<ReviewDetailResponse> => {
  const { data } = await api.get<ApiResponse<ReviewDetailResponse>>(`/api/v1/ml-v2/reviews/${id}`);
  if (!data.success) {
    throw new Error('Failed to fetch ML V2 review detail');
  }
  return data.data;
};

export const claimMlV2Review = async (inferenceResultId: string): Promise<MlV2OperatorReview> => {
  const { data } = await api.post<ApiResponse<MlV2OperatorReview>>(`/api/v1/ml-v2/inference-results/${inferenceResultId}/review`);
  if (!data.success) {
    throw new Error('Failed to claim ML V2 review');
  }
  return data.data;
};

export const completeMlV2Review = async (reviewId: string, payload: CompleteReviewPayload): Promise<MlV2OperatorReview> => {
  const { data } = await api.post<ApiResponse<MlV2OperatorReview>>(`/api/v1/ml-v2/reviews/${reviewId}/complete`, payload);
  if (!data.success) {
    throw new Error('Failed to complete ML V2 review');
  }
  return data.data;
};
