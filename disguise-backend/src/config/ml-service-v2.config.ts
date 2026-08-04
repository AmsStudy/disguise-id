import { z } from 'zod';
import { logger } from './logger';

export const mlServiceV2ConfigSchema = z.object({
  enabled: z.boolean().default(false),
  shadowMode: z.boolean().default(true),
  url: z.string().url().default('http://127.0.0.1:8001'),
  apiKey: z.string().optional(),
  timeoutMs: z.number().positive().default(30000),
  failJob: z.boolean().default(false),
  shadowLogPath: z.string().default('logs/ml-v2-shadow.jsonl'),
  persistenceEnabled: z.boolean().default(false),
  persistenceFailJob: z.boolean().default(false),
});

export type MlServiceV2Config = z.infer<typeof mlServiceV2ConfigSchema>;

function loadConfig(): MlServiceV2Config {
  const rawConfig = {
    enabled: process.env.ML_SERVICE_V2_ENABLED === 'true',
    shadowMode: process.env.ML_SERVICE_V2_SHADOW_MODE === 'true',
    url: process.env.ML_SERVICE_V2_URL || 'http://127.0.0.1:8001',
    apiKey: process.env.ML_SERVICE_V2_API_KEY,
    timeoutMs: process.env.ML_SERVICE_V2_TIMEOUT_MS ? parseInt(process.env.ML_SERVICE_V2_TIMEOUT_MS, 10) : 30000,
    failJob: process.env.ML_SERVICE_V2_FAIL_JOB === 'true',
    shadowLogPath: process.env.ML_SERVICE_V2_SHADOW_LOG_PATH || 'logs/ml-v2-shadow.jsonl',
    persistenceEnabled: process.env.ML_SERVICE_V2_PERSISTENCE_ENABLED === 'true',
    persistenceFailJob: process.env.ML_SERVICE_V2_PERSISTENCE_FAIL_JOB === 'true',
  };

  try {
    const config = mlServiceV2ConfigSchema.parse(rawConfig);
    
    // Custom validation: apiKey is required if enabled
    if (config.enabled && !config.apiKey) {
      throw new Error('ML_SERVICE_V2_API_KEY is required when ML_SERVICE_V2_ENABLED is true');
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Invalid ML Service V2 configuration:', error.message);
      // Fallback to disabled if configuration is invalid
      return mlServiceV2ConfigSchema.parse({ ...rawConfig, enabled: false });
    }
    throw error;
  }
}

export const mlServiceV2Config = loadConfig();
