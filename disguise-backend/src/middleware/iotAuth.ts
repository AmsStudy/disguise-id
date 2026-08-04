import { Request, Response, NextFunction } from 'express';
import { unauthorized } from '../utils/AppError';

export const iotAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.IOT_API_KEY || 'disguise-iot-secret-key-2026';

    if (!apiKey || apiKey !== validApiKey) {
      throw unauthorized('Invalid or missing IoT API Key');
    }

    // Set a dummy user payload for IoT device
    req.user = {
      sub: 'iot-device',
      email: 'iot@system.local',
      role: 'operator', // Use operator so it has read access to cameras
      orgId: '25d7772d-35b8-4896-9c3e-d4351790273d', // Default org ID for IoT
    } as any;

    next();
  } catch (err) {
    next(err);
  }
};
