import api from './api';
import { ApiResponse, PaginatedResponse } from '../types/ml-v2';
import {
  PromotionQueueQuery,
  PromotionsQuery,
  PromoteReviewPayload,
  MlV2PromotionQueueItem,
  MlV2ReviewedPromotion,
  PromotionDetailResponse
} from '../types/ml-v2-promotion';

export const getMlV2PromotionQueue = async (query: PromotionQueueQuery): Promise<PaginatedResponse<MlV2PromotionQueueItem>> => {
  const { data } = await api.get<ApiResponse<MlV2PromotionQueueItem[]>>('/ml-v2/promotion-queue', { params: query });
  if (!data.success || !data.meta) {
    throw new Error('Failed to fetch ML V2 promotion queue');
  }
  return { items: data.data, meta: data.meta };
};

export const getMlV2Promotions = async (query: PromotionsQuery): Promise<PaginatedResponse<MlV2ReviewedPromotion>> => {
  const { data } = await api.get<ApiResponse<MlV2ReviewedPromotion[]>>('/ml-v2/promotions', { params: query });
  if (!data.success || !data.meta) {
    throw new Error('Failed to fetch ML V2 promotions');
  }
  return { items: data.data, meta: data.meta };
};

export const getMlV2PromotionById = async (id: string): Promise<PromotionDetailResponse> => {
  const { data } = await api.get<ApiResponse<PromotionDetailResponse>>(`/ml-v2/promotions/${id}`);
  if (!data.success) {
    throw new Error('Failed to fetch ML V2 promotion detail');
  }
  return data.data;
};

export const promoteMlV2Review = async (reviewId: string, payload: PromoteReviewPayload): Promise<MlV2ReviewedPromotion> => {
  const { data } = await api.post<any>(`/ml-v2/reviews/${reviewId}/promote`, payload);
  // Special case: This endpoint returns the raw object directly, rather than an envelope.
  if (data && typeof data === 'object' && !('success' in data)) {
    return data;
  }
  if (!data.success) {
    throw new Error('Failed to promote ML V2 review');
  }
  return data.data;
};
