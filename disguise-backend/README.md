# DISGUISE-ID — Backend API Specification
## Dokumen Spesifikasi untuk Tim Backend / Vibe Coder

> **Versi:** 1.0.0-draft  
> **Tech Stack:** Node.js + Express.js + PostgreSQL (pgvector) + Redis + MinIO  
> **Tujuan:** Dokumen ini adalah sumber kebenaran tunggal untuk implementasi backend. Tim frontend, mobile, dan ML mengacu ke dokumen ini untuk kontrak API.

---

## Daftar Isi

1. [Gambaran Sistem](#1-gambaran-sistem)
2. [Arsitektur High-Level](#2-arsitektur-high-level)
3. [Tech Stack & Justifikasi](#3-tech-stack--justifikasi)
4. [Skema Database](#4-skema-database)
5. [Spesifikasi API Endpoint](#5-spesifikasi-api-endpoint)
6. [Alur Proses Kritis](#6-alur-proses-kritis)
7. [Strategi Skalabilitas](#7-strategi-skalabilitas)
8. [Environment Variables](#8-environment-variables)
9. [Konvensi & Standar Kode](#9-konvensi--standar-kode)
10. [Roadmap Teknis](#10-roadmap-teknis)

---

## 1. Gambaran Sistem

**DISGUISE-ID** adalah sistem identifikasi wajah berbasis CCTV yang mampu mencocokkan wajah yang **tertutup sebagian** (kacamata, masker, helm, topi) terhadap daftar pencarian (watchlist). 

### Aktor Sistem

| Aktor | Peran |
|---|---|
| `super_admin` | Kelola seluruh sistem, organisasi, konfigurasi model |
| `admin` | Kelola user dan watchlist di dalam satu organisasi |
| `operator` | Pantau alert real-time, kelola kamera CCTV |
| `investigator` | Buka case detail, akses bukti, buat laporan |
| `api_client` | Kamera CCTV / sistem eksternal yang kirim frame untuk diproses |

### Alur Utama

```
CCTV Kamera
    │
    │ POST /api/inference/frame  (kirim gambar)
    ▼
Backend: terima → queue → proses ML → cocokkan ke watchlist
    │
    ├─ MATCH DITEMUKAN ──► buat Alert ──► push notif ke operator (WebSocket)
    │
    └─ TIDAK ADA MATCH ──► simpan sebagai detection event (log saja)
```

---

## 2. Arsitektur High-Level

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  Web Dashboard (React)   Mobile App   CCTV Device / DVR     │
└──────────────┬──────────────────┬──────────────┬────────────┘
               │ HTTPS            │ HTTPS        │ HTTPS/RTSP
┌──────────────▼──────────────────▼──────────────▼────────────┐
│                     API GATEWAY / NGINX                      │
│              (Rate limiting, SSL termination)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   EXPRESS.JS API SERVER                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  REST API   │  │  WebSocket   │  │   Job Queue        │  │
│  │  (modules)  │  │  (real-time) │  │   (Bull/BullMQ)    │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
└──────┬───────────────────┬───────────────────┬──────────────┘
       │                   │                   │
┌──────▼──────┐   ┌────────▼──────┐   ┌────────▼──────────┐
│  PostgreSQL │   │    Redis      │   │  Python ML Service │
│  + pgvector │   │  (cache/queue)│   │  (FastAPI, terpisah│
│  (primary)  │   │               │   │   dari Express)    │
└──────┬──────┘   └───────────────┘   └────────────────────┘
       │
┌──────▼──────┐
│    MinIO    │
│ (object     │
│  storage)   │
└─────────────┘
```

> **Catatan penting**: Inferensi ML (model Python) berjalan sebagai **microservice terpisah** (FastAPI/Python). Express.js memanggil ML service via HTTP internal — ini memisahkan beban komputasi berat dari API utama dan memudahkan scaling independen.

---

## 3. Tech Stack & Justifikasi

### Runtime & Framework

| Teknologi | Versi | Justifikasi |
|---|---|---|
| Node.js | 20 LTS | Even-driven, cocok untuk I/O-intensive (banyak request CCTV concurrent) |
| Express.js | 4.x | Minimal, fleksibel, ekosistem besar |
| TypeScript | 5.x | Type safety wajib untuk sistem keamanan, mengurangi runtime bugs |

### Database

| Database | Versi | Peran | Justifikasi |
|---|---|---|---|
| PostgreSQL | 16 | Primary data store | ACID, relasional, multi-tenant ready |
| pgvector | 0.7+ | Vector similarity search | Cosine similarity langsung di SQL, HNSW index untuk ANN search cepat |
| Redis | 7.x | Cache + Queue + Pub/Sub | Sub-ms response, session, alert real-time, rate limiting |
| MinIO | RELEASE.2024 | Object storage | S3-compatible, self-hosted, mudah migrasi ke AWS S3 |

### Library Utama

```json
{
  "express": "^4.18",
  "typescript": "^5.0",
  "prisma": "^5.0",
  "ioredis": "^5.0",
  "bullmq": "^5.0",
  "socket.io": "^4.0",
  "jsonwebtoken": "^9.0",
  "bcryptjs": "^2.4",
  "zod": "^3.0",
  "winston": "^3.0",
  "multer": "^1.4",
  "@aws-sdk/client-s3": "^3.0",
  "helmet": "^7.0",
  "express-rate-limit": "^7.0"
}
```

### Kenapa bukan Nest.js?

Nest.js sangat bagus untuk enterprise, tapi untuk tim kecil/vibe coder Express + TypeScript lebih cepat dimulai. **Struktur folder kita sudah dirancang modular** sehingga migrasi ke Nest.js di masa depan bisa dilakukan modul per modul tanpa rebuild total.

---

## 4. Skema Database

### Prinsip Desain

- **Multi-tenant**: setiap data diikat ke `organization_id` — sistem bisa melayani banyak instansi kepolisian/keamanan dalam satu deployment
- **Soft delete**: semua tabel pakai `deleted_at` (bukan hapus permanen) — penting untuk audit dan forensik
- **UUID v7**: dipakai sebagai primary key (time-sortable, aman untuk distributed system di masa depan)
- **Audit log**: semua aksi kritis dicatat otomatis via trigger PostgreSQL

---

### Tabel: `organizations`
```sql
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  code          VARCHAR(50) UNIQUE NOT NULL,  -- kode singkat, mis. "POLDA-JATIM"
  plan          VARCHAR(50) DEFAULT 'basic',  -- basic | pro | enterprise
  settings      JSONB DEFAULT '{}',           -- konfigurasi per-org (threshold, dll)
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
```

---

### Tabel: `users`
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  role            VARCHAR(50) NOT NULL,        -- super_admin | admin | operator | investigator
  avatar_url      TEXT,
  last_login_at   TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
```

---

### Tabel: `cctv_sources`
```sql
CREATE TABLE cctv_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name            VARCHAR(255) NOT NULL,        -- "Pintu Masuk Utama Bandara"
  location_name   VARCHAR(255),                 -- "Terminal 2 Bandara Soetta"
  latitude        DECIMAL(10, 8),
  longitude       DECIMAL(11, 8),
  stream_url      TEXT,                         -- RTSP URL (enkripsi saat simpan)
  api_key_hash    VARCHAR(255),                 -- hash dari API key kamera ini
  model_version   VARCHAR(50) DEFAULT 'v1',     -- versi model yang dipakai
  threshold       DECIMAL(4, 3) DEFAULT 0.570,  -- threshold cosine sim (default dari kalibrasi)
  status          VARCHAR(50) DEFAULT 'offline', -- online | offline | error
  last_seen_at    TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',            -- info teknis kamera (merk, resolusi, dll)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_cctv_org ON cctv_sources(organization_id) WHERE deleted_at IS NULL;
```

---

### Tabel: `watchlist_persons`

> Ini tabel inti — orang-orang yang masuk daftar pencarian.

```sql
CREATE TABLE watchlist_persons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  full_name       VARCHAR(255) NOT NULL,
  alias           VARCHAR(255)[],               -- array nama alias
  id_number       VARCHAR(100),                 -- NIK atau nomor identitas lain
  date_of_birth   DATE,
  gender          VARCHAR(20),
  nationality     VARCHAR(100) DEFAULT 'Indonesia',
  description     TEXT,                         -- ciri fisik, catatan khusus
  danger_level    VARCHAR(50) DEFAULT 'medium', -- low | medium | high | critical
  case_reference  VARCHAR(255),                 -- nomor perkara/kasus
  photo_url       TEXT,                         -- foto referensi utama (di MinIO)
  embedding       VECTOR(512),                  -- embedding wajah (InceptionResnetV1)
  embedding_model VARCHAR(50) DEFAULT 'v1',     -- versi model yang dipakai saat buat embedding
  is_active       BOOLEAN DEFAULT true,         -- bisa di-nonaktifkan tanpa hapus data
  added_by        UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- INDEX KRITIS: HNSW untuk vector similarity search yang cepat
-- Ganti ke IVFFlat untuk dataset > 1 juta (trade-off: build time lebih lama, recall sedikit lebih rendah)
CREATE INDEX idx_watchlist_embedding ON watchlist_persons
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX idx_watchlist_org ON watchlist_persons(organization_id)
  WHERE deleted_at IS NULL;
```

---

### Tabel: `watchlist_photos`

> Mendukung multiple foto per orang (beda sudut, beda waktu).

```sql
CREATE TABLE watchlist_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID NOT NULL REFERENCES watchlist_persons(id) ON DELETE CASCADE,
  photo_url       TEXT NOT NULL,
  embedding       VECTOR(512),
  embedding_model VARCHAR(50) DEFAULT 'v1',
  is_primary      BOOLEAN DEFAULT false,
  source          VARCHAR(100),                 -- "manual_upload" | "cctv_confirmed" | "external_db"
  captured_at     TIMESTAMPTZ,
  uploaded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photos_person ON watchlist_photos(person_id);
```

---

### Tabel: `detection_events`

> Setiap wajah yang dideteksi kamera, match atau tidak.

```sql
CREATE TABLE detection_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  source_id       UUID NOT NULL REFERENCES cctv_sources(id),
  frame_url       TEXT,                         -- gambar frame asli (di MinIO)
  face_crop_url   TEXT,                         -- crop wajah hasil deteksi (di MinIO)
  embedding       VECTOR(512),                  -- embedding dari frame ini
  best_match_id   UUID REFERENCES watchlist_persons(id),  -- NULL jika tidak ada match
  best_match_sim  DECIMAL(6, 5),                -- cosine similarity tertinggi yg ditemukan
  is_match        BOOLEAN DEFAULT false,        -- apakah melewati threshold
  processing_ms   INTEGER,                      -- waktu proses dalam milidetik
  model_version   VARCHAR(50) DEFAULT 'v1',
  metadata        JSONB DEFAULT '{}',           -- pose, kualitas gambar, jenis oklusi, dll
  detected_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Partisi per bulan untuk query analytics yang efisien
-- Aktifkan ini saat volume event sudah tinggi
-- PARTITION BY RANGE (detected_at);

CREATE INDEX idx_events_org_date ON detection_events(organization_id, detected_at DESC);
CREATE INDEX idx_events_source ON detection_events(source_id, detected_at DESC);
CREATE INDEX idx_events_match ON detection_events(best_match_id) WHERE is_match = true;
```

---

### Tabel: `alerts`

> Alert yang perlu ditindaklanjuti oleh operator.

```sql
CREATE TABLE alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id),
  detection_event_id UUID NOT NULL REFERENCES detection_events(id),
  person_id         UUID NOT NULL REFERENCES watchlist_persons(id),
  similarity_score  DECIMAL(6, 5) NOT NULL,
  status            VARCHAR(50) DEFAULT 'pending', -- pending | confirmed | dismissed | false_positive
  priority          VARCHAR(50) DEFAULT 'medium',  -- low | medium | high | critical
  assigned_to       UUID REFERENCES users(id),
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  review_notes      TEXT,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_org_status ON alerts(organization_id, status, created_at DESC);
CREATE INDEX idx_alerts_assigned ON alerts(assigned_to) WHERE status = 'pending';
```

---

### Tabel: `cases`

> Kumpulan alert yang membentuk satu kasus investigasi.

```sql
CREATE TABLE cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  case_number     VARCHAR(100) UNIQUE NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  status          VARCHAR(50) DEFAULT 'open',   -- open | investigating | closed | archived
  priority        VARCHAR(50) DEFAULT 'medium',
  lead_investigator_id UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE case_alerts (
  case_id    UUID REFERENCES cases(id),
  alert_id   UUID REFERENCES alerts(id),
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  added_by   UUID REFERENCES users(id),
  PRIMARY KEY (case_id, alert_id)
);

CREATE TABLE case_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES cases(id),
  content     TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',              -- array URL file di MinIO
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Tabel: `audit_logs`

> Rekam jejak semua aksi kritis — tidak bisa diedit/dihapus.

```sql
CREATE TABLE audit_logs (
  id              BIGSERIAL PRIMARY KEY,       -- integer biasa, insert-only
  organization_id UUID,
  user_id         UUID,
  action          VARCHAR(100) NOT NULL,        -- "ALERT_CONFIRMED", "PERSON_ADDED", dll
  resource_type   VARCHAR(100),                 -- "alert", "watchlist_person", dll
  resource_id     UUID,
  old_value       JSONB,
  new_value       JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tidak ada UPDATE/DELETE pada tabel ini (enforce via GRANT di PostgreSQL)
CREATE INDEX idx_audit_org_date ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
```

---

### Tabel: `model_versions`

> Tracking versi model ML yang dipakai — penting untuk reproducibility.

```sql
CREATE TABLE model_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version       VARCHAR(50) UNIQUE NOT NULL,    -- "v1", "v2.1-finetuned", dll
  description   TEXT,
  model_path    TEXT NOT NULL,                  -- path di MinIO
  threshold     DECIMAL(4, 3) NOT NULL,         -- threshold kalibrasi dari penelitian
  roc_auc       DECIMAL(6, 5),
  tpr           DECIMAL(6, 5),
  fpr           DECIMAL(6, 5),
  accuracy      DECIMAL(6, 5),
  is_active     BOOLEAN DEFAULT false,          -- hanya 1 yang aktif
  deployed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data awal (model dari penelitian ini)
INSERT INTO model_versions (version, description, threshold, roc_auc, tpr, fpr, accuracy, is_active)
VALUES ('v1', 'InceptionResnetV1 VGGFace2 finetuned, batch-hard triplet loss',
        0.5703, 0.9927, 0.9549, 0.0243, 0.9653, true);
```

---

## 5. Spesifikasi API Endpoint

### Konvensi

- **Base URL:** `https://api.disguiseid.local/api/v1`
- **Auth:** Bearer JWT di header `Authorization: Bearer <token>`
- **Format:** JSON request/response
- **Error format:**
  ```json
  {
    "success": false,
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "Person tidak ditemukan",
      "details": {}
    }
  }
  ```
- **Success format:**
  ```json
  {
    "success": true,
    "data": {},
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 150
    }
  }
  ```

---

### MODULE 1: AUTH

#### `POST /auth/login`
Login user, dapatkan JWT.

**Request:**
```json
{
  "email": "operator@polda.go.id",
  "password": "secret123"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "full_name": "Budi Santoso",
      "email": "operator@polda.go.id",
      "role": "operator",
      "organization": {
        "id": "uuid",
        "name": "POLDA JAWA TIMUR",
        "code": "POLDA-JATIM"
      }
    }
  }
}
```

#### `POST /auth/refresh`
Refresh access token menggunakan refresh token.

#### `POST /auth/logout`
Invalidate token (blacklist di Redis).

#### `GET /auth/me`
Dapatkan profil user yang sedang login.

---

### MODULE 2: USERS

#### `GET /users`
Daftar user di organisasi. `[role: admin, super_admin]`

**Query params:** `page`, `limit`, `search`, `role`, `is_active`

#### `POST /users`
Buat user baru. `[role: admin, super_admin]`

```json
{
  "email": "investigator@polda.go.id",
  "full_name": "Siti Rahma",
  "role": "investigator",
  "password": "TempPass123!"
}
```

#### `GET /users/:id`
Detail user.

#### `PATCH /users/:id`
Update user (nama, role, status aktif).

#### `DELETE /users/:id`
Soft delete user.

#### `POST /users/:id/reset-password`
Reset password user. `[role: admin]`

---

### MODULE 3: WATCHLIST

#### `GET /watchlist`
Daftar orang dalam watchlist. `[role: semua]`

**Query params:**
```
page=1&limit=20&search=nama&danger_level=high&is_active=true
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "full_name": "Ahmad Basri",
      "alias": ["Ucok", "Si Besar"],
      "danger_level": "high",
      "case_reference": "LP/001/2024",
      "photo_url": "https://minio.../photo.jpg",
      "is_active": true,
      "alert_count_today": 2,
      "last_detected_at": "2024-01-15T08:23:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 47 }
}
```

#### `POST /watchlist`
Tambah orang ke watchlist. `[role: admin, investigator]`

**Request:** `multipart/form-data`
```
full_name: Ahmad Basri
alias: ["Ucok"]
danger_level: high
case_reference: LP/001/2024
description: Tersangka kasus...
photo: [FILE] -- foto wajah, max 5MB, jpg/png
```

**Proses internal (dikerjakan backend):**
1. Upload foto ke MinIO
2. Kirim foto ke ML service → dapat embedding 512-dim
3. Simpan embedding ke `watchlist_persons.embedding`
4. Return data person + notif ke operator via WebSocket

#### `GET /watchlist/:id`
Detail lengkap person + semua foto + riwayat deteksi.

#### `PATCH /watchlist/:id`
Update data person.

#### `DELETE /watchlist/:id`
Soft delete (nonaktifkan dari pencarian).

#### `POST /watchlist/:id/photos`
Tambah foto tambahan untuk person. `multipart/form-data`

#### `DELETE /watchlist/:id/photos/:photoId`
Hapus foto spesifik.

#### `POST /watchlist/:id/deactivate`
Nonaktifkan dari watchlist aktif (tidak muncul di pencarian) tapi data tetap ada.

---

### MODULE 4: CCTV SOURCES

#### `GET /cameras`
Daftar kamera. `[role: admin, operator]`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Pintu Masuk Terminal 2",
      "location_name": "Bandara Soetta",
      "status": "online",
      "last_seen_at": "2024-01-15T08:30:00Z",
      "detections_today": 128,
      "alerts_today": 3
    }
  ]
}
```

#### `POST /cameras`
Tambah kamera baru. `[role: admin]`

**Response** akan mengandung `api_key` (plain text, hanya ditampilkan sekali — hash disimpan di DB).

#### `GET /cameras/:id`
Detail kamera + statistik.

#### `PATCH /cameras/:id`
Update konfigurasi kamera.

#### `DELETE /cameras/:id`
Hapus kamera.

#### `POST /cameras/:id/regenerate-key`
Generate API key baru untuk kamera. `[role: admin]`

---

### MODULE 5: INFERENCE (endpoint untuk kamera CCTV)

> Endpoint ini dipanggil oleh **kamera/device**, bukan user manusia.  
> Auth: **API Key** (bukan JWT) di header `X-Api-Key: <api_key>`.  
> Rate limit: 30 request/detik per kamera (konfigurasi per kamera di `cctv_sources.settings`).

#### `POST /inference/frame`
Submit frame untuk diproses.

**Request:** `multipart/form-data`
```
frame: [FILE] -- gambar frame, max 2MB, jpg/png
timestamp: 2024-01-15T08:30:00.123Z  -- opsional, default NOW()
metadata: {"quality": "high", "resolution": "1920x1080"} -- opsional
```

**Proses internal (async via queue):**
1. Validasi API key → identifikasi kamera source
2. Upload frame ke MinIO
3. Masukkan ke **Bull queue** (`inference-queue`) untuk diproses ML service
4. Langsung return `202 Accepted` + job ID (tidak tunggu hasil)

**Response 202:**
```json
{
  "success": true,
  "data": {
    "job_id": "job-uuid",
    "status": "queued"
  }
}
```

**Callback setelah ML service selesai:**
- Jika match: buat Alert → push ke WebSocket channel `org:{org_id}:alerts`
- Simpan `detection_event` bagaimanapun hasilnya

#### `GET /inference/jobs/:jobId`
Cek status job inferensi (opsional, untuk debugging kamera).

---

### MODULE 6: ALERTS

#### `GET /alerts`
Daftar alert. `[role: operator, investigator, admin]`

**Query params:**
```
status=pending&priority=high&source_id=uuid&
date_from=2024-01-01&date_to=2024-01-31&
page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "pending",
      "priority": "high",
      "similarity_score": 0.812,
      "created_at": "2024-01-15T08:30:00Z",
      "person": {
        "id": "uuid",
        "full_name": "Ahmad Basri",
        "danger_level": "high",
        "photo_url": "..."
      },
      "camera": {
        "id": "uuid",
        "name": "Pintu Masuk Terminal 2",
        "location_name": "Bandara Soetta"
      },
      "detection": {
        "face_crop_url": "...",
        "frame_url": "...",
        "detected_at": "2024-01-15T08:29:58Z"
      }
    }
  ]
}
```

#### `GET /alerts/:id`
Detail lengkap alert + event detection.

#### `PATCH /alerts/:id`
Update status alert.

**Request:**
```json
{
  "status": "confirmed",
  "review_notes": "Dikonfirmasi via rekaman tambahan",
  "assigned_to": "user-uuid"
}
```

Status yang valid: `confirmed` | `dismissed` | `false_positive`

#### `POST /alerts/:id/assign`
Assign alert ke operator/investigator. `[role: admin, operator]`

---

### MODULE 7: CASES

#### `GET /cases`
Daftar kasus. `[role: investigator, admin]`

#### `POST /cases`
Buat kasus baru.

```json
{
  "title": "Operasi Penangkapan DPO A",
  "description": "...",
  "priority": "high",
  "lead_investigator_id": "user-uuid"
}
```

#### `GET /cases/:id`
Detail kasus + semua alert terkait + notes.

#### `PATCH /cases/:id`
Update kasus.

#### `POST /cases/:id/alerts`
Tambahkan alert ke kasus.

```json
{ "alert_ids": ["uuid1", "uuid2"] }
```

#### `POST /cases/:id/notes`
Tambah catatan investigasi. Mendukung upload lampiran.

**Request:** `multipart/form-data`
```
content: Hasil koordinasi dengan...
attachments: [FILE, FILE]
```

#### `PATCH /cases/:id/status`
Update status kasus: `open` → `investigating` → `closed`

---

### MODULE 8: ANALYTICS

#### `GET /analytics/dashboard`
Statistik ringkas untuk dashboard. `[role: admin, operator]`

**Response:**
```json
{
  "data": {
    "today": {
      "total_detections": 1247,
      "total_alerts": 8,
      "confirmed_matches": 3,
      "false_positives": 2,
      "cameras_online": 12,
      "cameras_offline": 2
    },
    "alerts_by_status": {
      "pending": 3,
      "confirmed": 3,
      "dismissed": 2
    },
    "top_active_cameras": [...],
    "hourly_detection_chart": [...]
  }
}
```

#### `GET /analytics/detections`
Data deteksi untuk charting. Query: `period=7d|30d|90d`, `source_id`.

#### `GET /analytics/performance`
Metrik performa model: rata-rata similarity score, distribusi confidence, FP rate.

---

### MODULE 9: AUDIT LOGS

#### `GET /audit-logs`
Riwayat aksi. `[role: admin, super_admin]`

**Query params:** `user_id`, `action`, `resource_type`, `date_from`, `date_to`

---

### MODULE 10: SETTINGS

#### `GET /settings`
Konfigurasi organisasi. `[role: admin]`

#### `PATCH /settings`
Update konfigurasi.

```json
{
  "default_threshold": 0.5703,
  "alert_auto_assign": false,
  "notification_email": "alert@polda.go.id",
  "retention_days_frames": 30,
  "retention_days_events": 365
}
```

#### `GET /settings/model-versions`
Daftar versi model yang tersedia.

#### `POST /settings/model-versions/:id/activate`
Aktifkan versi model tertentu. `[role: super_admin]`

---

### WebSocket Events

**Koneksi:** `wss://api.disguiseid.local/socket`  
**Auth:** JWT di query param `?token=<jwt>`

**Server → Client (push dari server):**

| Event | Payload | Deskripsi |
|---|---|---|
| `alert:new` | `{ alert, person, camera }` | Alert baru masuk |
| `alert:updated` | `{ alert_id, status, updated_by }` | Status alert berubah |
| `camera:status` | `{ camera_id, status }` | Kamera online/offline |
| `detection:live` | `{ camera_id, face_crop_url, similarity }` | Live feed deteksi (opsional, hanya di halaman monitor) |

**Client → Server:**

| Event | Payload | Deskripsi |
|---|---|---|
| `subscribe:camera` | `{ camera_id }` | Subscribe live feed kamera tertentu |
| `unsubscribe:camera` | `{ camera_id }` | Unsubscribe |

---

## 6. Alur Proses Kritis

### 6.1 Alur Tambah Orang ke Watchlist

```
Client → POST /watchlist (foto + data)
  │
  ├─ 1. Validasi input (Zod)
  ├─ 2. Upload foto → MinIO (dapat URL)
  ├─ 3. POST ke ML Service: /embed (kirim gambar, terima vector 512-dim)
  ├─ 4. INSERT ke watchlist_persons (termasuk embedding)
  ├─ 5. INSERT ke watchlist_photos
  ├─ 6. INSERT audit_log
  └─ 7. Return 201 Created

ML Service (Python/FastAPI) terpisah:
  POST /embed → MTCNN crop wajah → InceptionResnetV1 → return vector
```

### 6.2 Alur Inferensi CCTV Frame

```
Kamera → POST /inference/frame (API Key auth)
  │
  ├─ 1. Validasi API Key → dapat camera_id + org_id + threshold
  ├─ 2. Upload frame → MinIO
  ├─ 3. Push ke BullMQ queue (return 202 segera)
  │
  └─ [ASYNC] Worker proses queue:
       ├─ 4. Ambil frame dari MinIO
       ├─ 5. POST ke ML Service: /process-frame
       │       (MTCNN detect → crop → mask deteksi → embedding)
       ├─ 6. SQL: SELECT ... FROM watchlist_persons
       │           ORDER BY embedding <=> $1   (cosine distance pgvector)
       │           WHERE organization_id = $2
       │             AND is_active = true
       │           LIMIT 5;
       ├─ 7. Bandingkan similarity tertinggi vs threshold kamera
       ├─ 8. INSERT detection_event
       │
       ├─ [JIKA MATCH]:
       │    ├─ 9. INSERT alert
       │    ├─ 10. Emit WebSocket: 'alert:new' ke room org:{org_id}
       │    └─ 11. (Opsional) Send push notification / email
       │
       └─ [SELESAI]
```

### 6.3 Query Vector Search (pgvector)

```sql
-- Cari 5 kandidat paling mirip di watchlist organisasi ini
-- $1 = embedding dari frame CCTV (512-dim vector)
-- $2 = organization_id
-- $3 = threshold cosine similarity

SELECT
  id,
  full_name,
  danger_level,
  photo_url,
  1 - (embedding <=> $1::vector) AS similarity  -- cosine similarity
FROM watchlist_persons
WHERE
  organization_id = $2
  AND is_active = true
  AND deleted_at IS NULL
  AND 1 - (embedding <=> $1::vector) >= $3       -- filter di atas threshold
ORDER BY embedding <=> $1                         -- sort by distance (ascending)
LIMIT 5;
```

---

## 7. Strategi Skalabilitas

### Sekarang (MVP, hingga ~50 kamera, ~1000 orang watchlist)
- Single PostgreSQL instance + pgvector
- Single Redis instance
- Single Express app instance
- MinIO single node

### 6 bulan ke depan (~200 kamera, ~10.000 watchlist)
- PostgreSQL connection pooling (PgBouncer)
- Redis Cluster untuk queue
- Partisi tabel `detection_events` per bulan (sudah dipersiapkan di skema)
- Horizontal scaling Express via PM2 cluster mode
- CDN untuk asset MinIO

### 1-2 tahun ke depan (~500+ kamera, ~100.000+ watchlist)
- Read replica PostgreSQL untuk query analytics
- Migrasi vector store dari pgvector → **Milvus** atau **Weaviate** (skema embedding sudah siap migrasi karena formatnya standar 512-dim)
- Kafka menggantikan BullMQ untuk throughput inference queue
- Kubernetes deployment
- Sharding data per organisasi (multi-tenant isolation lebih ketat)

### Pertimbangan yang sudah dibangun dari sekarang

| Keputusan hari ini | Kenapa penting ke depan |
|---|---|
| Multi-tenant dari awal (`organization_id` di semua tabel) | Tidak perlu refactor skema saat sistem dipakai banyak instansi |
| UUID v4 sebagai PK (bukan auto-increment) | Aman untuk distributed system, tidak ada ID clash saat merge database |
| `embedding_model` disimpan per-record | Bisa punya beberapa versi model aktif bersamaan saat migrasi |
| Soft delete di semua tabel | Audit forensik, recovery data, tidak kehilangan riwayat kasus |
| API Key kamera dipisah dari JWT user | Bisa di-revoke per kamera tanpa dampak ke user lain |
| Threshold per-kamera (bukan global) | Kamera di lokasi berbeda bisa punya sensitivity berbeda |

---

## 8. Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/disguiseid
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=disgid:

# MinIO / Object Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_FRAMES=cctv-frames
MINIO_BUCKET_FACES=face-crops
MINIO_BUCKET_WATCHLIST=watchlist-photos
MINIO_BUCKET_MODELS=ml-models

# JWT
JWT_SECRET=ganti-ini-dengan-secret-panjang-dan-random
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=ganti-ini-dengan-secret-lain
JWT_REFRESH_EXPIRES_IN=7d

# ML Service (Python/FastAPI)
ML_SERVICE_URL=http://ml-service:8000
ML_SERVICE_API_KEY=internal-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_CAMERA_MAX=30

# Retention
RETENTION_FRAMES_DAYS=30
RETENTION_EVENTS_DAYS=365
```

---

## 9. Konvensi & Standar Kode

### Struktur Folder

```
src/
├── config/          -- konfigurasi (db, redis, minio, dll)
├── middleware/      -- auth, rate-limit, error handler, logger
├── modules/
│   ├── auth/        -- controller, service, router, schema (Zod)
│   ├── users/
│   ├── watchlist/
│   ├── cameras/
│   ├── inference/
│   ├── alerts/
│   ├── cases/
│   ├── analytics/
│   └── audit/
├── queues/          -- Bull queue workers
├── sockets/         -- WebSocket event handlers
├── utils/           -- helper functions
└── types/           -- TypeScript type definitions
```

### Tiap modul mengikuti pola:
```
modules/watchlist/
  ├── watchlist.router.ts    -- route definitions + middleware chain
  ├── watchlist.controller.ts -- request/response handling
  ├── watchlist.service.ts    -- business logic
  ├── watchlist.schema.ts     -- Zod validation schemas
  └── watchlist.types.ts      -- TypeScript interfaces
```

### Error Handling

Semua error dilempar sebagai `AppError` custom class, di-catch oleh global error middleware:

```typescript
throw new AppError('PERSON_NOT_FOUND', 'Orang tidak ditemukan', 404);
```

### Logging

Winston dengan format JSON ke stdout. Wajib log:
- Semua request (method, path, status, response_time)
- Semua alert yang dibuat
- Semua error 4xx dan 5xx
- Perubahan watchlist (tambah/edit/hapus)

---

## 10. Roadmap Teknis

### Phase 1 — Core (prioritas sekarang)
- [x] Skema database + migrations
- [ ] Auth module (login, JWT, refresh, logout)
- [ ] Users & Organizations CRUD
- [ ] Watchlist CRUD + upload foto + embedding
- [ ] Cameras management + API key generation
- [ ] Inference endpoint + BullMQ queue
- [ ] Alerts CRUD + WebSocket push
- [ ] Basic dashboard analytics

### Phase 2 — Enhanced
- [ ] Cases & investigation management
- [ ] Audit log viewer
- [ ] Advanced analytics & reporting
- [ ] Alert notification (email/push)
- [ ] Data retention & cleanup jobs

### Phase 3 — Production-ready
- [ ] Multi-tenant isolation audit
- [ ] Role-based access control granular
- [ ] API versioning strategy
- [ ] Performance testing (k6)
- [ ] Security audit (OWASP checklist)
- [ ] Data export (CSV/PDF laporan)

---

*Dokumen ini hidup — update setiap ada perubahan desain. Versi terakhir selalu di repository utama.*