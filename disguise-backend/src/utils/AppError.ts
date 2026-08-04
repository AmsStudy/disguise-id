export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    code: string,
    message: string,
    statusCode = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factories
export const notFound = (resource: string) =>
  new AppError('NOT_FOUND', `${resource} not found`, 404);

export const unauthorized = (message = 'Unauthorized') =>
  new AppError('UNAUTHORIZED', message, 401);

export const forbidden = (message = 'Access denied') =>
  new AppError('FORBIDDEN', message, 403);

export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new AppError('BAD_REQUEST', message, 400, details);

export const conflict = (message: string) =>
  new AppError('CONFLICT', message, 409);

export const internalError = (message = 'Internal server error') =>
  new AppError('INTERNAL_ERROR', message, 500);
