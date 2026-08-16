import { Router } from 'express';
import { authMobileRouter } from '../modules/auth/auth.mobile.router';
import { devicesMobileRouter } from '../modules/devices/devices.mobile.router';
import { alertsMobileRouter } from '../modules/alerts/alerts.mobile.router';
import { camerasMobileRouter } from '../modules/cameras/cameras.mobile.router';
import { watchlistMobileRouter } from '../modules/watchlist/watchlist.mobile.router';

export const mobileRouter = Router();

mobileRouter.use('/auth', authMobileRouter);
mobileRouter.use('/devices', devicesMobileRouter);
mobileRouter.use('/alerts', alertsMobileRouter);
mobileRouter.use('/cameras', camerasMobileRouter);
mobileRouter.use('/watchlist', watchlistMobileRouter);
