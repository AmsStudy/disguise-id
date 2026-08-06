import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import axios from 'axios';

export class SystemController {
  async getMediaMtxHealth(req: Request, res: Response, next: NextFunction) {
    try {
      let available = false;
      let reason = 'MEDIAMTX_UNAVAILABLE';
      
      try {
        // Backend proxies the health check to MediaMTX
        await axios.get('http://localhost:9997/v3/config/global/read', { timeout: 2000 });
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
