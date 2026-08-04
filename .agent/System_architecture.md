# DISGUISE-ID — Dokumentasi Arsitektur Sistem (Revisi Model VAE)

> **Versi:** 2.0 — Setelah integrasi model VAE Identity Disentanglement  
> **Tanggal revisi:** Juli 2026  
> **Perubahan utama:** Model backbone diganti dari InceptionResnetV1 ke VAE kustom tim riset

---

## Daftar Isi

1. [Topologi Jaringan](#1-topologi-jaringan)
2. [Alur Data End-to-End](#2-alur-data-end-to-end)
3. [Arsitektur Model (Inti Sistem)](#3-arsitektur-model-inti-sistem)
4. [Skema Database Setelah Migrasi](#4-skema-database-setelah-migrasi)
5. [Peran Mobile App](#5-peran-mobile-app)
6. [Metrik Performa](#6-metrik-performa)
7. [Ringkasan Perubahan dari v1.0](#7-ringkasan-perubahan-dari-v10)

---

## 1. Topologi Jaringan

```
Jaringan Lokal — 172.125.0.0/21
│
├── TP-Link Tapo C110         172.125.0.201   RTSP :554/stream2
├── Raspberry Pi 4            172.125.0.xxx   Edge capture agent
└── Laptop Ubuntu (Server)    172.125.0.255   Mesin komputasi utama
    │
    ├── Backend Express.js      :3000   ← Pi kirim ke sini langsung (lokal)
    ├── Frontend Next.js        :3001
    ├── ML Service FastAPI      :8000   ← Inferensi model VAE (RTX 4050)
    ├── PostgreSQL + pgvector   :5432
    ├── Redis + BullMQ          :6379
    └── MinIO Object Storage    :9000

Internet
└── Cloudflare Tunnel → api3.walldev.my.id → Backend :3000
    └── Mobile App → REST API via Cloudflare
```

**Mengapa Pi kirim ke IP lokal, bukan Cloudflare:**  
Latensi lokal < 5ms vs Cloudflare 100–300ms. Untuk sistem real-time CCTV, perbedaan ini kritis.

---

## 2. Alur Data End-to-End

### Phase 1 — Edge (Raspberry Pi)

```
Raspberry Pi startup:
  GET /api/v1/iot/cameras
  Header: x-api-key: disguise-iot-secret-key-2026
  → Terima list kamera aktif: [{ id, streamUrl, threshold, status }]
  → Spawn 1 thread per kamera online secara otomatis

Per kamera, secara paralel:
  1. Buka RTSP stream (OpenCV + CAP_FFMPEG + TCP transport)
     rtsp://disguise:pass@172.125.0.201:554/stream2

  2. Setiap 3 frame → YuNet face detection
     Confidence minimum: 0.75

  3. Wajah terdeteksi → crop + padding 25% → resize 224x224
     (bukan 160x160 — disesuaikan dengan input model VAE)

  4. POST /api/v1/inference/frame
     Header : x-api-key: disguise-iot-secret-key-2026
     Body   : face_crop (JPEG 224x224), frame_thumb (JPEG 320x240),
              camera_id, confidence, bbox, frame_w/h, detected_at

  5. Terima 202 Accepted → lanjut capture frame berikutnya

  6. Kalau stream putus:
     PATCH /api/v1/iot/cameras/:id/status { "status": "error" }
```

### Phase 2 — Backend (Express.js)

```
POST /api/v1/inference/frame
  │
  ├── Validasi x-api-key → lookup cctv_sources.api_key_hash
  ├── Update kamera: last_seen_at, status = 'online'
  ├── Upload face_crop → MinIO (bucket: face-crops)
  ├── Upload frame_thumb → MinIO (bucket: cctv-frames)
  ├── Push job ke BullMQ queue 'inference'
  │     Data: { cameraId, orgId, faceCropUrl, frameThumUrl,
  │             detectedAt, confidence, bbox }
  └── Return 202 Accepted { job_id, status: 'queued' }
      (tidak menunggu proses ML selesai)
```

### Phase 3 — Model Integration Pipeline

Dibahas lengkap di Bagian 3.

### Phase 4 — Output dan Distribusi

```
Jika tier TINGGI atau SEDANG:
  → INSERT ke tabel alerts (status: 'pending')
  → Socket.io emit 'alert:new' ke room org:{orgId}
  → Dashboard: alert muncul real-time
  → Mobile App: GET /api/v1/alerts

Selalu (apapun hasilnya):
  → INSERT ke tabel detection_events (is_match: true/false)
  → Berguna untuk analytics dan audit trail forensik
```

---

## 3. Arsitektur Model (Inti Sistem)

### 3.1 Tentang Model

Model yang digunakan adalah **VAE dengan Identity Disentanglement** — dikembangkan oleh tim riset sendiri, berbeda dari model pretrained umum seperti FaceNet atau ArcFace.

Prinsip utama: model ini memisahkan representasi wajah menjadi dua ruang terpisah:
- **Z_identity (128-dim)** — fitur yang stabil meski wajah tertutup (dipakai untuk matching)
- **Z_attribute (64-dim)** — fitur penyamaran (tidak dipakai untuk matching, hanya riset)

### 3.2 Input ke Model

| Properti | Nilai | Catatan |
|---|---|---|
| Format | JPEG / PNG | Dikirim dari Pi |
| Resolusi | **224 × 224 px** | Berbeda dari FaceNet (160×160) |
| Channel | RGB (3 channel) | Konversi BGR→RGB dilakukan di Pi |
| Normalisasi | `/255.0` saja | Menghasilkan rentang **[0.0, 1.0]** |
| Tensor shape | `(1, 3, 224, 224)` | Batch size 1 saat inferensi |

> **KRITIS:** Preprocessing FaceNet-style `(pixel × 255 − 127.5) / 128.0` **tidak boleh** digunakan. Model VAE mengharapkan input `[0, 1]`, bukan `[−1, 1]`. Normalisasi internal sudah tertanam di dalam arsitektur model.

### 3.3 Proses Inferensi di ML Service

```
Input: JPEG 224x224 dari MinIO
  │
  ├── 1. Baca gambar → PIL Image RGB
  ├── 2. Resize ke 224x224
  ├── 3. Konversi ke float32 numpy
  ├── 4. Bagi 255.0 → rentang [0.0, 1.0]
  ├── 5. Reshape: (H,W,C) → (C,H,W) → unsqueeze → (1,3,224,224)
  │
  ├── 6. Forward pass encoder VAE
  │     Output: tuple → ambil elemen pertama = Z_identity
  │
  ├── 7. Squeeze → numpy array (128,)
  │     TIDAK dinormalisasi L2
  │
  └── Response:
        embedding     : [float32 × 128]
        dim           : 128
        metric        : "euclidean"
        preprocessing : "px/255.0"
        processing_ms : int
```

### 3.4 Output Model

```
Z_identity: [f₁, f₂, f₃, ..., f₁₂₈]

Ukuran  : 128 × 4 bytes = 512 bytes per embedding
Sifat   : vektor di ruang Euclidean (TIDAK unit vector)
Metrik  : Euclidean distance = ‖Z_A − Z_B‖₂

Dua foto orang SAMA  → distance kecil  (~1.0 – 3.0)
Dua foto orang BEDA  → distance besar  (~4.5 – 8.0+)
```

### 3.5 Similarity Search di pgvector

```sql
-- Operator : <->  (Euclidean/L2)  — BUKAN <=> (cosine)
-- Index    : HNSW vector_l2_ops   — BUKAN vector_cosine_ops
-- Dimensi  : vector(128)          — BUKAN vector(512)

SELECT
  id, full_name, danger_level, photo_url,
  (embedding <-> $1::vector) AS distance
FROM watchlist_persons
WHERE organization_id = $2
  AND is_active = true
  AND deleted_at IS NULL
  AND embedding IS NOT NULL
  AND (embedding <-> $1::vector) <= 4.5   -- batas threshold SEDANG
ORDER BY embedding <-> $1                 -- ASC: terkecil = paling mirip
LIMIT 3;                                  -- TOP-3 untuk analisis margin
```

### 3.6 Sistem Keputusan 3-Tier + Margin

```
Langkah 1 — Klasifikasi tier berdasarkan distance kandidat #1:

  distance <= 3.5  →  Tier TINGGI   (match kuat)
  distance <= 4.5  →  Tier SEDANG   (perlu verifikasi operator)
  distance  > 4.5  →  Tier RENDAH   (bukan match)


Langkah 2 — Analisis margin relatif antara kandidat #1 dan #2:

  margin (%) = ((distance_#2 − distance_#1) / distance_#2) × 100

  Jika margin < 15%:
    Kandidat #1 dan #2 terlalu berdekatan → hasil ambigu
    → Turunkan tier satu level:
       TINGGI → SEDANG
       SEDANG → RENDAH


Langkah 3 — Keputusan akhir:

  Tier TINGGI → buat alert, priority dari danger_level person
  Tier SEDANG → buat alert, wajib verifikasi operator
  Tier RENDAH → tidak ada alert, hanya log ke detection_events
```

**Contoh kasus nyata:**

| Dist #1 | Dist #2 | Margin | Tier awal | Turun? | Tier final | Alert |
|---|---|---|---|---|---|---|
| 2.8 | 5.6 | 50% | TINGGI | Tidak | TINGGI | Ya |
| 3.2 | 3.5 | 8.6% | TINGGI | Ya (< 15%) | SEDANG | Ya (verif) |
| 4.1 | 4.8 | 14.6% | SEDANG | Ya (< 15%) | RENDAH | Tidak |
| 5.2 | 7.0 | 25.7% | RENDAH | Tidak | RENDAH | Tidak |

### 3.7 Payload Alert ke Dashboard dan Mobile

```json
{
  "tier": "TINGGI",
  "distance": 2.8431,
  "margin_pct": 50.1,
  "person": {
    "id": "uuid",
    "full_name": "Ahmad Basri",
    "danger_level": "high",
    "photo_url": "minio://watchlist-photos/..."
  },
  "top_candidates": [
    { "id": "uuid-1", "name": "Ahmad Basri", "distance": 2.8431 },
    { "id": "uuid-2", "name": "Budi Santoso", "distance": 5.6820 },
    { "id": "uuid-3", "name": "Candra Wibowo", "distance": 6.1034 }
  ],
  "camera_id": "uuid-kamera",
  "face_crop_url": "minio://face-crops/...",
  "detected_at": "2026-07-15T08:30:00.123Z"
}
```

---

## 4. Skema Database Setelah Migrasi

### Perubahan kolom embedding

| Kolom | v1.0 | v2.0 |
|---|---|---|
| `embedding` type | `VECTOR(512)` | `VECTOR(128)` |
| `embedding_model` default | `'v1'` | `'vae-v1'` |
| index type | `vector_cosine_ops` | `vector_l2_ops` |
| `embedding_metric` (kolom baru) | — | `'euclidean'` |

### Tabel `model_versions` — record model VAE

| Field | Nilai |
|---|---|
| `version` | `vae-v1` |
| `threshold` | `3.500` (tier TINGGI, skala Euclidean) |
| `model_path` | `ml-models/disguise_id_encoder.pth` |
| `is_active` | `true` |

### Yang perlu dilakukan setelah migrasi

Semua embedding lama menjadi NULL setelah migrasi karena dimensinya tidak kompatibel. Seluruh entri di `watchlist_persons` harus di-embed ulang menggunakan model VAE sebelum sistem dapat beroperasi.

---

## 5. Peran Mobile App

### Endpoint yang digunakan

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Login, dapatkan JWT |
| `GET` | `/api/v1/alerts` | Daftar alert (filter: status, tier, tanggal) |
| `GET` | `/api/v1/alerts/:id` | Detail: foto, distance, tier, top-3 kandidat |
| `PATCH` | `/api/v1/alerts/:id` | Konfirmasi / dismiss / false_positive |
| `GET` | `/api/v1/watchlist` | Daftar orang dalam DPO |
| `GET` | `/api/v1/watchlist/:id` | Detail person + riwayat deteksi |
| `GET` | `/api/v1/analytics/dashboard` | Statistik ringkas |
| `WebSocket` | `wss://api3.walldev.my.id` | Notifikasi alert real-time |

### Catatan untuk developer mobile

Field `similarity_score` di response alert berisi nilai negatif dari distance (misal `-2.8431`) karena kolom DB lama dipakai ulang. Tampilkan sebagai `Math.abs(similarity_score)` dan beri label **"Jarak"**, bukan "Kesamaan", agar tidak membingungkan operator.

---

## 6. Metrik Performa

### Metrik model (dari evaluasi riset)

| Metrik | Nilai | Keterangan |
|---|---|---|
| TPR (True Positive Rate) | 97.42% | Deteksi benar "orang sama" |
| TNR — evaluasi per-batch | 97.92% | Kurang representatif |
| TNR — evaluasi global | 89.43% | Lebih jujur, gunakan ini |
| Akurasi keseluruhan (global) | 93.43% | Angka yang sebaiknya dilaporkan |
| ROC-AUC | 0.9927 | Mendekati ideal |
| Threshold tier TINGGI | ≤ 3.5 | Euclidean distance |
| Threshold tier SEDANG | ≤ 4.5 | Euclidean distance |
| Margin minimum | 15% | Di bawah ini tier turun satu level |

> Threshold (3.5 dan 4.5) dikalibrasi pada test set riset dengan 23 identitas. Disarankan kalibrasi ulang pada populasi dan kondisi pencahayaan produksi nyata.

### Metrik latensi sistem

| Tahap | Latensi | Catatan |
|---|---|---|
| Pi → Backend (lokal) | < 5ms | Via 172.125.0.x |
| Pi → Backend (Cloudflare) | 100–300ms | Hindari untuk inference |
| ML Inference (RTX 4050) | ~50–150ms | |
| pgvector HNSW search | ~1–5ms | Untuk 10.000+ entri |
| Total end-to-end | ~200–400ms | Capture Pi → alert dashboard |

---

## 7. Ringkasan Perubahan dari v1.0

| Komponen | v1.0 | v2.0 |
|---|---|---|
| Model backbone | InceptionResnetV1 (VGGFace2) | VAE Identity Disentanglement (tim riset) |
| File model | — | `disguise_id_encoder.pth` |
| Resize input Pi | 160×160 px | **224×224 px** |
| Preprocessing | `(px×255−127.5)/128` | **`px/255.0`** saja |
| Dimensi embedding | 512-dim | **128-dim Z_identity** |
| Normalisasi embedding | L2 normalize | **Tidak dinormalisasi** |
| Metrik jarak | Cosine similarity | **Euclidean distance** |
| pgvector operator | `<=>` | **`<->`** |
| pgvector index | `vector_cosine_ops` | **`vector_l2_ops`** |
| Schema DB | `VECTOR(512)` | **`VECTOR(128)`** |
| Threshold | 0.5703 (cosine) | **3-tier: TINGGI ≤3.5, SEDANG ≤4.5** |
| Keputusan | Biner match/no-match | **3-tier + margin 15%** |
| Kandidat dikembalikan | 1 best match | **TOP-3** |
| Trigger alert | Semua match | **Hanya TINGGI dan SEDANG** |