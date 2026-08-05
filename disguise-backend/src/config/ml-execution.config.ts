import { z } from 'zod';
import { logger } from './logger';

export const mlExecutionConfigSchema = z.object({
  mode: z.enum(['v1', 'dual', 'v2_shadow']).default('dual'),
});

export type MlExecutionConfig = z.infer<typeof mlExecutionConfigSchema>;

export function parseMlExecutionConfig(env: NodeJS.ProcessEnv): MlExecutionConfig {
  const rawConfig = {
    mode: env.ML_EXECUTION_MODE || 'dual',
  };

  try {
    return mlExecutionConfigSchema.parse(rawConfig);
  } catch (error) {
    logger.error('Invalid ML_EXECUTION_MODE configuration:', error);
    throw new Error(`Invalid ML_EXECUTION_MODE configuration: ${env.ML_EXECUTION_MODE}`);
  }
}

export const mlExecutionConfig = parseMlExecutionConfig(process.env);
