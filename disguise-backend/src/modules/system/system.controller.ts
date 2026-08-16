import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import axios from 'axios';

export class SystemController {
  async getMediaMtxHealth(req: Request, res: Response, next: NextFunction) {
    try {
      let available = false;
      let reason = 'MEDIAMTX_UNAVAILABLE';
      
      try {
        const mtxApiUrl = process.env.MEDIAMTX_API_URL || 'http://127.0.0.1:9997';
        // Backend proxies the health check to MediaMTX
        await axios.get(`${mtxApiUrl}/v3/paths/list`, { timeout: 2000 });
        available = true;
        reason = 'OK';
      } catch (err: any) {
        available = false;
        reason = err.code === 'ECONNREFUSED' ? 'MEDIAMTX_OFFLINE' : 'MEDIAMTX_TIMEOUT';
      }

      sendSuccess(res, {
        preview: {
          available,
          reason
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export const systemController = new SystemController();
