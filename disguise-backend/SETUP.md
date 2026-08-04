# DISGUISE-ID Backend — Setup Guide

## Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose
- PostgreSQL 16 with pgvector (or use docker-compose)
- Redis 7.x (or use docker-compose)
- MinIO (or use docker-compose)

---

## Quick Start

### 1. Clone & Install

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Infrastructure (Docker)

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432) with pgvector extension
- Redis (port 6379)
- MinIO (port 9000, console at 9001)

### 4. Run Database Migration

```bash
npm run db:generate   # generate Prisma client
npm run db:migrate    # run migrations (development)
npm run db:seed       # seed initial data
```

### 5. Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login with email & password |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout (blacklist token) |
| GET | `/auth/me` | Get current user profile |

### Users (admin, super_admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List users in organization |
| POST | `/users` | Create new user |
| GET | `/users/:id` | Get user details |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Soft delete user |
| POST | `/users/:id/reset-password` | Reset user password |

### Watchlist (all roles)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/watchlist` | List watchlist persons |
| POST | `/watchlist` | Add person (multipart with photo) |
| GET | `/watchlist/:id` | Person details + photos + history |
| PATCH | `/watchlist/:id` | Update person data |
| DELETE | `/watchlist/:id` | Soft delete person |
| POST | `/watchlist/:id/deactivate` | Remove from active search |
| POST | `/watchlist/:id/photos` | Add additional photo |
| DELETE | `/watchlist/:id/photos/:photoId` | Delete photo |

### Cameras (admin, operator)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/cameras` | List cameras |
| POST | `/cameras` | Add camera (returns API key once) |
| GET | `/cameras/:id` | Camera details + stats |
| PATCH | `/cameras/:id` | Update camera config |
| DELETE | `/cameras/:id` | Delete camera |
| POST | `/cameras/:id/regenerate-key` | Regenerate API key |

### Inference (CCTV devices — API Key auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/inference/frame` | Submit frame (X-Api-Key header) |
| GET | `/inference/jobs/:jobId` | Check job status |

### Alerts (operator, investigator, admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/alerts` | List alerts with filters |
| GET | `/alerts/:id` | Alert details |
| PATCH | `/alerts/:id` | Update alert status |
| POST | `/alerts/:id/assign` | Assign alert to user |

### Cases (investigator, admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/cases` | List investigation cases |
| POST | `/cases` | Create new case |
| GET | `/cases/:id` | Case details + alerts + notes |
| PATCH | `/cases/:id` | Update case |
| PATCH | `/cases/:id/status` | Update case status |
| POST | `/cases/:id/alerts` | Link alerts to case |
| POST | `/cases/:id/notes` | Add investigation note (with attachments) |

### Analytics (admin, operator)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/dashboard` | Dashboard statistics |
| GET | `/analytics/detections` | Detection chart data |
| GET | `/analytics/performance` | ML model performance metrics |

### Settings (admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings` | Organization settings |
| PATCH | `/settings` | Update settings |
| GET | `/settings/model-versions` | List ML model versions |
| POST | `/settings/model-versions/:id/activate` | Activate model (super_admin) |

### Audit Logs (admin, super_admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/audit-logs` | View audit log with filters |

---

## WebSocket Events

Connect to: `ws://localhost:3000/socket?token=<JWT>`

### Server → Client
| Event | Payload |
|-------|---------|
| `alert:new` | `{ alert, person, camera, detection }` |
| `alert:updated` | `{ alert_id, status, updated_by }` |
| `camera:status` | `{ camera_id, status }` |
| `detection:live` | `{ camera_id, face_crop_url, similarity }` |

### Client → Server
| Event | Payload |
|-------|---------|
| `subscribe:camera` | `{ camera_id }` |
| `unsubscribe:camera` | `{ camera_id }` |

---

## Default Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| super_admin | superadmin@disguiseid.local | SuperAdmin123! |
| admin | admin@polda.go.id | Admin123! |
| operator | operator@polda.go.id | Operator123! |
| investigator | investigator@polda.go.id | Investigator123! |

---

## ML Service Integration

The backend expects a Python/FastAPI ML service at `ML_SERVICE_URL` (default: `http://localhost:8000`).

The service needs to expose:
- `POST /embed` — Accept image file, return `{ embedding: number[], face_detected: bool, confidence: float }`
- `POST /process-frame` — Accept frame file, return `{ embedding: number[] | null, face_detected: bool, face_crop_base64?: string, confidence: float, processing_ms: int }`
- `GET /health` — Health check

---

## Production Checklist

- [ ] Change all JWT secrets in `.env`
- [ ] Use strong passwords for all services
- [ ] Enable TLS for all connections
- [ ] Set `NODE_ENV=production`
- [ ] Enable proper CORS origins
- [ ] Configure log rotation
- [ ] Set up database backups
- [ ] Review rate limiting settings
- [ ] Run `npm run db:migrate:prod` (not `dev`)
