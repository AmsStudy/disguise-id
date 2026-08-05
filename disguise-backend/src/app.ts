import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { watchlistRouter } from './modules/watchlist/watchlist.router';
import { camerasRouter } from './modules/cameras/cameras.router';
import { inferenceRouter } from './modules/inference/inference.router';
import { alertsRouter } from './modules/alerts/alerts.router';
import { casesRouter } from './modules/cases/cases.router';
import { analyticsRouter } from './modules/analytics/analytics.router';
import { auditRouter } from './modules/audit/audit.router';
import { settingsRouter } from './modules/settings/settings.router';
import { iotRouter } from './modules/iot/iot.router';
import { mlV2Router, detectionEventMlV2Router } from './modules/ml-v2/ml-v2.router';
import { mlV2ReviewRouter } from './modules/ml-v2-review/review.router';
import promotionRouter from './modules/ml-v2-promotion/promotion.router';
import { mlV2ReviewedAlertRouter } from './modules/ml-v2-reviewed-alert/reviewed-alert.routes';
import gallerySyncRouter from './modules/gallery-sync/gallery-sync.router';
import candidateMappingRouter from './modules/candidate-mapping/candidate-mapping.router';

const app = express();

// ─── Security Middleware ─────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// ─── Rate Limiting ───────────────────────────────────────────
const globalRateLimit = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});

app.use(globalRateLimit);

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ─────────────────────────────────────────────────
app.use(requestLogger);

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || 'v1',
    },
  });
});

// ─── API Routes ──────────────────────────────────────────────
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/watchlist`, watchlistRouter);
app.use(`${API_PREFIX}/cameras`, camerasRouter);
app.use(`${API_PREFIX}/inference`, inferenceRouter);
app.use(`${API_PREFIX}/alerts`, alertsRouter);
app.use(`${API_PREFIX}/cases`, casesRouter);
app.use(`${API_PREFIX}/analytics`, analyticsRouter);
app.use(`${API_PREFIX}/audit-logs`, auditRouter);
app.use(`${API_PREFIX}/settings`, settingsRouter);
app.use(`${API_PREFIX}/iot`, iotRouter);
app.use(`${API_PREFIX}/ml-v2`, mlV2ReviewRouter);
app.use(`${API_PREFIX}/ml-v2`, promotionRouter);
app.use(`${API_PREFIX}/ml-v2`, mlV2ReviewedAlertRouter);
app.use(`${API_PREFIX}/ml-v2/gallery`, gallerySyncRouter);
app.use(`${API_PREFIX}/ml-v2/candidate-mappings`, candidateMappingRouter);
app.use(`${API_PREFIX}/ml-v2`, mlV2Router);
app.use(`${API_PREFIX}/detection-events`, detectionEventMlV2Router);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist.',
    },
  });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

export default app;
