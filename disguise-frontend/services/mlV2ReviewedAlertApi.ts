import api from './api';
import { ApiResponse, PaginatedResponse } from '../types/ml-v2';
import {
  AlertCreationQueueQuery,
  ReviewedAlertsQuery,
  CreateReviewedAlertPayload,
  MlV2AlertCreationQueueItem,
  MlV2ReviewedAlert,
  ReviewedAlertDetailResponse
} from '../types/ml-v2-reviewed-alert';

export const getMlV2AlertCreationQueue = async (query: AlertCreationQueueQuery): Promise<PaginatedResponse<MlV2AlertCreationQueueItem>> => {
  const { data } = await api.get<ApiResponse<MlV2AlertCreationQueueItem[]>>('/api/v1/ml-v2/alert-creation-queue', { params: query });
  if (!data.success || !data.meta) {
    throw new Error('Failed to fetch ML V2 alert creation queue');
  }
  return { items: data.data, meta: data.meta };
};

export const getMlV2ReviewedAlerts = async (query: ReviewedAlertsQuery): Promise<PaginatedResponse<MlV2ReviewedAlert>> => {
  const { data } = await api.get<ApiResponse<MlV2ReviewedAlert[]>>('/api/v1/ml-v2/reviewed-alerts', { params: query });
  if (!data.success || !data.meta) {
    throw new Error('Failed to fetch ML V2 reviewed alerts');
  }
  return { items: data.data, meta: data.meta };
};

export const getMlV2ReviewedAlertById = async (id: string): Promise<ReviewedAlertDetailResponse> => {
  const { data } = await api.get<ApiResponse<ReviewedAlertDetailResponse>>(`/api/v1/ml-v2/reviewed-alerts/${id}`);
  if (!data.success) {
    throw new Error('Failed to fetch ML V2 reviewed alert detail');
  }
  return data.data;
};

export const createMlV2ReviewedAlert = async (promotionId: string, payload: CreateReviewedAlertPayload): Promise<MlV2ReviewedAlert> => {
  const { data } = await api.post<ApiResponse<MlV2ReviewedAlert>>(`/api/v1/ml-v2/promotions/${promotionId}/create-alert`, payload);
  if (!data.success) {
    throw new Error('Failed to create ML V2 reviewed alert');
  }
  return data.data;
};
