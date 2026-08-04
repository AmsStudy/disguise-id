import { z } from 'zod';

export const createCameraSchema = z.object({
  name: z.string().min(2).max(255),
  location_name: z.string().max(255).optional(),
  ip_address: z.string().max(255).optional(),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  stream_url: z.string().url().optional(),
  model_version: z.string().max(50).optional().default('v1'),
  threshold: z.number().min(0).max(1).optional().default(0.570),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const updateCameraSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  location_name: z.string().max(255).optional(),
  ip_address: z.string().max(255).optional(),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  stream_url: z.string().url().optional(),
  model_version: z.string().max(50).optional(),
  threshold: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(['online', 'offline', 'error']).optional(),
});

export const listCamerasQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['online', 'offline', 'error']).optional(),
  search: z.string().optional(),
});

export type CreateCameraInput = z.infer<typeof createCameraSchema>;
export type UpdateCameraInput = z.infer<typeof updateCameraSchema>;
export type ListCamerasQuery = z.infer<typeof listCamerasQuerySchema>;
