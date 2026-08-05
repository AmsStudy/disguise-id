import api from './api';
import { MlV2InferenceResult, MlV2Stats, MlV2ListQuery, PaginatedResponse, ApiResponse } from '../types/ml-v2';

export const getMlV2TelemetryList = async (query: MlV2ListQuery): Promise<PaginatedResponse<MlV2InferenceResult>> => {
  const { data } = await api.get<ApiResponse<MlV2InferenceResult[]>>('/api/v1/ml-v2', { params: query });
  if (!data.success || !data.meta) {
    throw new Error('Failed to fetch ML V2 telemetry');
  }
  return { items: data.data, meta: data.meta };
};

export const getMlV2TelemetryStats = async (query: Pick<MlV2ListQuery, 'createdFrom' | 'createdTo' | 'cameraSessionId'>): Promise<MlV2Stats> => {
  const { data } = await api.get<ApiResponse<MlV2Stats>>('/api/v1/ml-v2/stats', { params: query });
  if (!data.success) {
    throw new Error('Failed to fetch ML V2 stats');
  }
  return data.data;
};

export const getMlV2TelemetryById = async (id: string): Promise<MlV2InferenceResult> => {
  const { data } = await api.get<ApiResponse<MlV2InferenceResult>>(`/api/v1/ml-v2/${id}`);
  if (!data.success) {
    throw new Error('Failed to fetch ML V2 detail');
  }
  return data.data;
};
