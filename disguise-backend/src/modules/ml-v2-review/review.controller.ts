import { Request, Response } from 'express';
import { mlV2ReviewService } from './review.service';
import { reviewQueueQuerySchema, reviewsQuerySchema, completeReviewPayloadSchema } from './review.validation';

export class MlV2ReviewController {
  
  async getReviewQueue(req: Request, res: Response) {
    try {
      const orgId = req.user!.orgId;
      const actorUserId = req.user!.sub;
      const actorRole = req.user!.role;
      
      const query = reviewQueueQuerySchema.parse(req.query);
      const result = await mlV2ReviewService.getReviewQueue(orgId, actorUserId, actorRole, query);
      
      if (result.error) {
         return res.status(403).json({
            success: false,
            error: { code: result.error, message: result.message },
         });
      }

      return res.status(200).json({
        success: true,
        data: result.data!.items,
        meta: result.data!.meta,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.errors } });
      }
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred' } });
    }
  }

  async getReviews(req: Request, res: Response) {
    try {
      const orgId = req.user!.orgId;
      
      const query = reviewsQuerySchema.parse(req.query);
      const result = await mlV2ReviewService.getReviews(orgId, query);
      
      return res.status(200).json({
        success: true,
        data: result.data.items,
        meta: result.data.meta,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.errors } });
      }
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred' } });
    }
  }

  async getReviewById(req: Request, res: Response) {
    try {
      const orgId = req.user!.orgId;
      const { id } = req.params;
      
      const result = await mlV2ReviewService.getReviewById(orgId, id);
      if (result.error) {
        return res.status(404).json({ success: false, error: { code: result.error, message: result.message } });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred' } });
    }
  }

  async claimReview(req: Request, res: Response) {
    try {
      const orgId = req.user!.orgId;
      const reviewerId = req.user!.sub;
      const inferenceResultId = req.params.id; // from /inference-results/:id/review

      const result = await mlV2ReviewService.claimReview(orgId, reviewerId, inferenceResultId);
      
      if (result.error) {
        let status = 400;
        if (result.error === 'NOT_FOUND') status = 404;
        if (result.error === 'CONFLICT') status = 409;
        
        return res.status(status).json({ success: false, error: { code: result.error, message: result.message } });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred' } });
    }
  }

  async completeReview(req: Request, res: Response) {
    try {
      const orgId = req.user!.orgId;
      const actorUserId = req.user!.sub;
      const actorRole = req.user!.role;
      const reviewId = req.params.id;

      const payload = completeReviewPayloadSchema.parse(req.body);

      const result = await mlV2ReviewService.completeReview({
        orgId,
        actorUserId,
        actorRole,
        reviewId,
        payload,
      });
      
      if (result.error) {
        let status = 400;
        if (result.error === 'NOT_FOUND') status = 404;
        if (result.error === 'CONFLICT') status = 409;
        if (result.error === 'FORBIDDEN') status = 403;
        
        return res.status(status).json({ success: false, error: { code: result.error, message: result.message } });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.errors } });
      }
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred' } });
    }
  }
}

export const mlV2ReviewController = new MlV2ReviewController();
