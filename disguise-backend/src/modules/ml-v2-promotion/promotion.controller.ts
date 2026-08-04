import { Request, Response } from 'express';
import { mlV2PromotionService } from './promotion.service';
import {
  promotionQueueQuerySchema,
  promotionsQuerySchema,
  promoteReviewPayloadSchema,
} from './promotion.validation';

export class MlV2PromotionController {
  async getPromotionQueue(req: Request, res: Response) {
    try {
      const query = promotionQueueQuerySchema.parse(req.query);
      const result = await mlV2PromotionService.getPromotionQueue(req.user!.orgId, query);
      return res.status(200).json({
        success: true,
        data: result.data!.items,
        meta: result.data!.meta,
      });
    } catch (error: any) {
      console.error('getPromotionQueue error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.errors } });
      }
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred' } });
    }
  }

  async getPromotions(req: Request, res: Response) {
    try {
      const query = promotionsQuerySchema.parse(req.query);
      const result = await mlV2PromotionService.getPromotions(req.user!.orgId, query);
      return res.status(200).json({
        success: true,
        data: result.data!.items,
        meta: result.data!.meta,
      });
    } catch (error: any) {
      console.error('getPromotions error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.errors } });
      }
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred' } });
    }
  }

  async getPromotionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await mlV2PromotionService.getPromotionById(req.user!.orgId, id);

      if (result.error) {
        return res.status(404).json({ success: false, error: { code: result.error, message: result.message } });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error: any) {
      console.error('getPromotionById error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred' } });
    }
  }

  async promoteReview(req: Request, res: Response) {
    try {
      const { reviewId } = req.params;
      const payload = promoteReviewPayloadSchema.parse(req.body);

      const result = await mlV2PromotionService.promoteReview({
        orgId: req.user!.orgId,
        actorUserId: req.user!.sub, // JwtPayload uses sub
        reviewId,
        payload,
      });

      if (result.error) {
        let status = 400;
        if (result.error === 'NOT_FOUND') status = 404;
        if (result.error === 'CONFLICT') status = 409;
        
        return res.status(status).json({ success: false, error: { code: result.error, message: result.message } });
      }

      return res.status(201).json(result.data); // Return the raw object or standard response if required
      // The tests expect res.body.reviewId directly!
      // I should update it to match the expected format. Let's return result.data.
    } catch (error: any) {
      console.error('promoteReview error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.errors } });
      }
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred' } });
    }
  }
}

export const mlV2PromotionController = new MlV2PromotionController();
