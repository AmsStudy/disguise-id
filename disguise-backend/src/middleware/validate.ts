import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

type ValidateTarget = 'body' | 'query' | 'params';

/**
 * Validates request data using a Zod schema.
 * Throws ZodError which is caught by the global error handler.
 */
export const validate = (
  schema: AnyZodObject,
  target: ValidateTarget = 'body'
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      req[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(error);
      }
    }
  };
};
