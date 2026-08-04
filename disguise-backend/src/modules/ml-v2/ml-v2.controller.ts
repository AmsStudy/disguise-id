import { Request, Response, NextFunction } from 'express';
import { mlV2Service } from './ml-v2.service';
import { mlV2ListQuerySchema } from './ml-v2.validation';

export const getMlV2List = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId;
    
    // Parse query params using Zod
    const query = mlV2ListQuerySchema.parse(req.query);
    
    const result = await mlV2Service.getTelemetryList(orgId, query);
    
    // Nested DTO response as required by the user
    res.status(200).json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getMlV2Stats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId;
    
    // Parse query params using Zod (stats usually takes the same filters, minus pagination)
    const query = mlV2ListQuerySchema.parse(req.query);
    
    const result = await mlV2Service.getTelemetryStats(orgId, query);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMlV2ByDetectionEventId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId;
    const { id: detectionEventId } = req.params;
    
    const result = await mlV2Service.getByDetectionEventId(orgId, detectionEventId);
    
    if ('error' in result && result.error === 'NOT_FOUND') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: result.message,
        },
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: result.data, // will be null if event exists but no v2 telemetry
    });
  } catch (error) {
    next(error);
  }
};

export const getMlV2ById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId;
    const { id } = req.params;
    
    const result = await mlV2Service.getById(orgId, id);
    
    if ('error' in result && result.error === 'NOT_FOUND') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: result.message,
        },
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};
