# DISGUISE-ID: Panduan Setup & Instalasi (Clone to Run)

Dokumen ini menjelaskan langkah-langkah *end-to-end* yang harus dilakukan jika Anda atau tim *developer* lain meng-*clone* repositori ini dari nol hingga sistem dapat berjalan seutuhnya.

---

## 1. Prasyarat Sistem (Prerequisites)

Sebelum melakukan *clone*, pastikan sistem (server/komputer lokal) Anda sudah menginstal:
- **Git**
- **Docker** (versi terbaru)
- **Docker Compose** (disarankan v2, `docker compose` bukan `docker-compose`)
- *(Opsional)* **NVIDIA Container Toolkit** jika Anda ingin menjalankan model ML dengan akselerasi GPU (CUDA).

## 2. Proses Clone & Setup Awal

Pertama-tama, tarik *source code* dari repositori Git Anda:

```bash
git clone <URL_REPOSITORY_ANDA>
cd fullstack-disguise
```

## 3. Konfigurasi Environment Variables (`.env`)

Sistem ini terbagi menjadi beberapa *service* (Backend, Frontend, ML, Camera). Masing-masing memiliki file contoh konfigurasi (`.env.example`). Anda wajib menggandakannya menjadi `.env` asli.

Buka terminal di *root* folder proyek, lalu jalankan/lakukan penyalinan berikut:

**A. Backend**
Copy `disguise-backend/.env.example` menjadi `disguise-backend/.env`.
Isi minimal parameter `DATABASE_URL` dengan format:
`postgresql://disguise:disguise_secure_password_123!@postgres:5432/disguise_db?schema=public`

**B. Frontend**
Copy `disguise-frontend/.env.example` menjadi `disguise-frontend/.env.local`.
Pastikan `NEXT_PUBLIC_API_URL` mengarah ke URL Backend Anda (secara default `http://localhost:3002/api/v1`).

**C. ML Service V2**
Copy `ml-service-v2/.env.example` menjadi `ml-service-v2/.env`.
(Biarkan nilainya default, atau ubah path checkpoint model jika diperlukan).

**D. Camera Agent**
Copy `camera-agent/.env.example` menjadi `camera-agent/.env`.

---

## 4. Proses Build Docker Images

Karena proyek ini cukup besar (terutama instalasi dependensi Python untuk Machine Learning seperti OpenCV dan ONNXRuntime), lakukan *build* di awal agar Anda bisa memantau jika ada *error*:

```bash
docker compose build
```
> [!NOTE]
> Proses ini bisa memakan waktu 5 hingga 15 menit tergantung kecepatan internet dan spesifikasi server Anda.

## 5. Menjalankan Seluruh Service

Setelah proses *build* selesai tanpa kendala, jalankan semua kontainer di *background*:

```bash
docker compose up -d
```

Anda bisa mengecek apakah semuanya berjalan lancar dengan perintah:
```bash
docker compose ps
```
Semua status harus menunjukkan status `Up` atau `Healthy`.

## 6. Sinkronisasi Skema Database (Migrasi)

Agar tabel di database PostgreSQL (`pgvector`) terbentuk, Anda perlu masuk ke *container* backend dan menjalankan migrasi skema menggunakan Prisma:

```bash
docker exec -it disguise-backend npx prisma db push
```
*(Atau gunakan `npx prisma migrate deploy` jika Anda menggunakan file migrasi).*

Jika Anda memiliki skrip untuk mengisi *data dummy* (seperti admin default), jalankan sekarang, contoh:
```bash
docker exec -it disguise-backend npm run seed
```

---

## 7. Akses ke Sistem

Jika semua langkah di atas sudah dilakukan, layanan Anda akan dapat diakses pada *port* berikut:

- **Aplikasi Web (Frontend):** `http://localhost:3001`
- **REST API (Backend):** `http://localhost:3002`
- **Dashboard MinIO (Storage):** `http://localhost:9001` (Akses menggunakan Minio Root User/Pass yang diatur di docker-compose)
- **MediaMTX API (Kamera):** `http://localhost:9997`

> [!TIP]
> **Akselerasi GPU (NVIDIA)**
> Jika Anda menggunakan server dengan GPU NVIDIA, jangan lupa membuka konfigurasi `docker-compose.yml`, cari bagian `ml-service`, dan hapus tanda pagar (`#`) pada blok `deploy: resources: reservations:` agar *container* ML dapat menggunakan CUDA.

---

## 8. Menjalankan Camera Agent (Lokal)

Service `camera-agent` telah dipisahkan dari konfigurasi Docker dan ditujukan untuk berjalan secara lokal (native) di mesin Anda atau di *edge device* (seperti Raspberry Pi).

**Langkah-langkah menjalankan:**

1. Pastikan Anda telah menginstal Python 3.9+ di mesin Anda.
2. Masuk ke direktori `camera-agent`:
   ```bash
   cd camera-agent
   ```
3. Sesuaikan file `.env`. Karena berjalan di luar jaringan Docker, arahkan backend ke `localhost`:
   ```env
   BACKEND_URL=http://localhost:3002
   WEBSOCKET_URL=ws://localhost:3002
   ```
4. Instal dependensi dan jalankan skrip:
   ```bash
   pip install -r requirements.txt
   python main.py
   ```
