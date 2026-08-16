import { z } from 'zod';

export const edgeEmbeddingMetadataSchema = z.object({
  source: z.literal('edge'),
  model: z.string(),
  model_package: z.string(),
  model_sha256: z.string(),
  dimension: z.number().int().positive(),
  metric: z.string(),
  normalized: z.boolean(),
  preprocessing_version: z.string(),
  extraction_ms: z.number().optional()
});

export type EdgeEmbeddingMetadata = z.infer<typeof edgeEmbeddingMetadataSchema>;
