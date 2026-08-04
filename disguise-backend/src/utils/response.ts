import { Response } from 'express';
import { PaginationMeta } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta && { meta }),
  });
};

export const sendCreated = <T>(res: Response, data: T): Response => {
  return sendSuccess(res, data, 201);
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

export const paginate = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export const getPaginationParams = (
  rawPage?: string,
  rawLimit?: string,
  maxLimit = 100
): { page: number; limit: number; skip: number } => {
  const page = Math.max(1, parseInt(rawPage || '1', 10));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(rawLimit || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
