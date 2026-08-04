import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { logger } from '../config/logger';
import { mlServiceV2Config } from '../config/ml-service-v2.config';
import {
  v2InferenceResponseSchema,
  MLServiceV2Error,
  V2ErrorCode,
  V2ShadowLogEntry,
  V2InferenceResponse
} from '../types/ml-service-v2.types';
import { mlServiceV2Logger } from './mlServiceV2Logger';

class MLServiceV2Client {
  private client = axios.create({
    baseURL: mlServiceV2Config.url,
    timeout: mlServiceV2Config.timeoutMs,
  });

  /**
   * Safely calls the V2 shadow API. Never crashes the application.
   */
  public async shadowInfer(
    jobId: string,
    frameBuffer: Buffer,
    metadata: {
      organization_id: string;
      camera_id: string;
      camera_session_id: string;
      track_id: string;
      captured_at: string;
      frame_number: number;
      bounding_box_json: string;
      landmarks_json?: string;
      detection_score?: number;
      quality_score?: number;
    }
  ): Promise<V2InferenceResponse | Error | null> {
    if (!mlServiceV2Config.enabled) {
      return null;
    }

    const startTime = Date.now();
    const logEntry: V2ShadowLogEntry = {
      timestamp: new Date().toISOString(),
      jobId,
      cameraId: metadata.camera_id,
      status: 'FAILED',
      latency_ms: 0,
    };

    try {
      if (!mlServiceV2Config.apiKey) {
        throw new MLServiceV2Error(V2ErrorCode.V2_CONFIG_ERROR, 'API key missing');
      }

      const form = new FormData();
      form.append('face_crop', frameBuffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });
      form.append('organization_id', metadata.organization_id);
      form.append('camera_id', metadata.camera_id);
      form.append('camera_session_id', metadata.camera_session_id);
      form.append('track_id', metadata.track_id);
      form.append('captured_at', metadata.captured_at);
      form.append('frame_number', metadata.frame_number.toString());
      form.append('bounding_box_json', metadata.bounding_box_json);
      
      if (metadata.landmarks_json) form.append('landmarks_json', metadata.landmarks_json);
      if (metadata.detection_score !== undefined) form.append('detection_score', metadata.detection_score.toString());
      if (metadata.quality_score !== undefined) form.append('quality_score', metadata.quality_score.toString());

      const response = await this.client.post('/v2/infer-face', form, {
        headers: {
          ...form.getHeaders(),
          'x-api-key': mlServiceV2Config.apiKey,
        },
      });

      // Runtime schema validation
      const validationResult = v2InferenceResponseSchema.safeParse(response.data);
      if (!validationResult.success) {
        throw new MLServiceV2Error(
          V2ErrorCode.V2_INVALID_RESPONSE,
          'Response validation failed',
          response.status,
          validationResult.error.format()
        );
      }

      const data = validationResult.data;
      
      logEntry.status = 'SUCCESS';
      logEntry.modelVersion = data.model_version;
      logEntry.galleryVersion = data.gallery_version;
      
      // Dual-branch fields
      logEntry.original_valid = data.original.valid;
      logEntry.original_score = this.cleanNumber(data.original.score);
      logEntry.original_margin = this.cleanNumber(data.original.margin);
      
      logEntry.reconstructed_valid = data.reconstructed.valid;
      logEntry.reconstructed_score = this.cleanNumber(data.reconstructed.score);
      logEntry.reconstructed_margin = this.cleanNumber(data.reconstructed.margin);
      
      // Final decision
      logEntry.decision = data.frame_decision;
      logEntry.candidate_id = data.candidate_id;
      logEntry.selected_branch = data.selected_branch;
      logEntry.score = this.cleanNumber(data.score);
      logEntry.margin = this.cleanNumber(data.margin);

      return data;
    } catch (error) {
      const v2Error = this.handleAxiosError(error);
      logEntry.errorCode = v2Error.code;
      logEntry.reason = v2Error.message;
      // Intentionally do not throw further unless explicitly requested, 
      // as this is a shadow worker that shouldn't disrupt V1 pipeline.
      if (mlServiceV2Config.failJob) {
        logger.error(`V2 shadow inference explicitly failed job ${jobId}`, v2Error);
        throw v2Error;
      }
      return v2Error;
    } finally {
      logEntry.latency_ms = Date.now() - startTime;
      mlServiceV2Logger.log(logEntry);
    }
  }

  private cleanNumber(val: unknown): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') {
      if (isNaN(val) || !isFinite(val)) return null;
      return val;
    }
    return null;
  }

  private handleAxiosError(error: unknown): MLServiceV2Error {
    if (error instanceof MLServiceV2Error) {
      return error;
    }
    
    if (axios.isAxiosError(error)) {
      const axiosErr = error as AxiosError;
      const status = axiosErr.response?.status;
      
      if (axiosErr.code === 'ECONNABORTED') {
        return new MLServiceV2Error(V2ErrorCode.V2_TIMEOUT, 'Request timed out');
      }
      
      if (!axiosErr.response) {
        return new MLServiceV2Error(V2ErrorCode.V2_UNAVAILABLE, 'Service unreachable or network error');
      }

      if (status === 401 || status === 403) {
        return new MLServiceV2Error(V2ErrorCode.V2_AUTH_ERROR, 'Authentication failed', status);
      }
      
      return new MLServiceV2Error(
        V2ErrorCode.V2_INTERNAL_ERROR,
        `V2 Service Error: ${status}`,
        status,
        axiosErr.response.data
      );
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new MLServiceV2Error(V2ErrorCode.V2_INTERNAL_ERROR, msg);
  }
}

export const mlServiceV2Client = new MLServiceV2Client();
