import axios from 'axios';
import { logger } from '../config/logger';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_SERVICE_API_KEY = process.env.ML_SERVICE_API_KEY || 'internal-api-key';

export interface EmbeddingResult {
  embedding: number[];
  face_detected: boolean;
  confidence: number;
}

export interface FrameProcessResult {
  embedding: number[] | null;
  face_detected: boolean;
  face_crop_base64?: string;
  confidence: number;
  processing_ms: number;
}

export class MlServiceClient {
  private readonly client = axios.create({
    baseURL: ML_SERVICE_URL,
    timeout: 30000,
    headers: {
      'X-Api-Key': ML_SERVICE_API_KEY,
    },
  });

  /**
   * Get 512-dim face embedding from an image
   * @param imageBuffer Raw image buffer
   * @param filename Original filename (for content type detection)
   */
  async getEmbedding(imageBuffer: Buffer, filename: string): Promise<EmbeddingResult> {
    try {
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('image', imageBuffer, { filename });

      const response = await this.client.post<EmbeddingResult>('/embed', form, {
        headers: form.getHeaders(),
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error('ML service error (embed)', {
          status: error.response?.status,
          data: error.response?.data,
        });
        if (error.code === 'ECONNREFUSED') {
          throw new Error('ML service is not available');
        }
        throw new Error(`ML service error: ${error.response?.data?.detail || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Process a CCTV frame: detect face, crop, get embedding
   */
  async processFrame(imageBuffer: Buffer, filename: string): Promise<FrameProcessResult> {
    try {
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('frame', imageBuffer, { filename });

      const response = await this.client.post<FrameProcessResult>('/process-frame', form, {
        headers: form.getHeaders(),
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error('ML service error (process-frame)', {
          status: error.response?.status,
          data: error.response?.data,
        });
        if (error.code === 'ECONNREFUSED') {
          // Return no-face result instead of throwing to allow graceful degradation
          return {
            embedding: null,
            face_detected: false,
            confidence: 0,
            processing_ms: 0,
          };
        }
        throw new Error(`ML service error: ${error.response?.data?.detail || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Health check for ML service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const mlService = new MlServiceClient();
