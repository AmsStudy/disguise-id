# ML Service V2 (Stage 20B + ArcFace)

Layanan microservice ini merupakan implementasi V2 dari pipeline AI DISGUISE-ID yang menggunakan *Stage 20B Skip-Connected Autoencoder* dan *ArcFace (buffalo_l)* serta mengaplikasikan *Margin-Max Decision Policy*.

## Instalasi

1. Pastikan Python 3.10+ telah terinstal.
2. Instal dependensi:
   ```bash
   pip install -r requirements.txt
   ```
3. Salin `.env.example` ke `.env` dan konfigurasikan *environment variables*. Khusus untuk `ML_SERVICE_API_KEY`, nilainya wajib diisi agar service mau berjalan.

## Environment Variables

Lihat file `.env.example`. 
Pastikan mengonfigurasi absolute path untuk lokasi checkpoint (`CHECKPOINT_PATH`) dan gallery (`GALLERY_CSV_PATH`) dengan benar untuk *local development*. 

## Lokasi Model
- **Stage 20B**: Ditentukan oleh `CHECKPOINT_PATH`.
- **InsightFace buffalo_l**: Harus diunduh atau disalin ke `INSIGHTFACE_ROOT/models/buffalo_l`. Pada mode `production` (ketika `ENVIRONMENT=production`), layanan tidak akan mengunduh otomatis.

## Menjalankan Service

Menjalankan server FastAPI secara lokal (direkomendasikan *single worker*):
```bash
uvicorn app.main:app --port 8001 --workers 1 --limit-concurrency 1
```

Atau menggunakan Docker Compose (konfigurasi menyusul).

## Health Check
```bash
curl -X GET http://localhost:8001/health
```

## Contoh Request Infer-Face
```bash
curl -X POST http://localhost:8001/v2/infer-face \
  -H "x-api-key: your_secret_key_here" \
  -F "face_crop=@path/to/face.jpg" \
  -F "organization_id=org_123" \
  -F "camera_id=cam_01" \
  -F "camera_session_id=session_01" \
  -F "track_id=track_123" \
  -F "captured_at=2026-08-04T07:29:58Z" \
  -F "frame_number=100" \
  -F "bounding_box_json=[10, 10, 200, 200]"
```

## Parity Test
Untuk menguji bahwa implementasi ini sejalan 100% dengan skrip evaluasi riset *Stage 36*:
```bash
python scripts/parity_check_stage36.py
```

## Keterbatasan Development Threshold
Threshold yang ada saat ini (`POSSIBLE_THRESHOLD=0.288131`, `HIGH_THRESHOLD=0.380334`, `MARGIN_THRESHOLD=0.08`) adalah development threshold yang di-*tuning* berdasarkan evaluasi lab riset. Threshold akhir untuk CCTV *Production* harus dikalibrasi ulang terhadap sudut pandang, tingkat pencahayaan, dan jenis buram (*blur*) kamera aktual.
