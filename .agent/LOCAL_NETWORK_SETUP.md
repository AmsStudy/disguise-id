# DISGUISE-ID — Setup Jaringan Lokal (Ubuntu + RTX 4050)

## Topologi

```
Jaringan Lokal 172.125.0.0/21
│
├── Laptop Ubuntu (SERVER UTAMA)
│   IP: 172.125.0.255
│   GPU: RTX 4050 (CUDA)
│   │
│   └── Docker containers:
│       ├── Backend Express     :3000  ← Pi akses via 172.125.0.255:3000
│       ├── Frontend Next.js    :3001  ← Browser akses via 172.125.0.255:3001
│       ├── ML Service FastAPI  :8000  ← internal Docker saja
│       ├── PostgreSQL+pgvector :5432  ← internal Docker saja
│       ├── Redis               :6379  ← internal Docker saja
│       └── MinIO               :9000  ← internal Docker saja
│
├── Raspberry Pi 4
│   IP: 172.125.0.xxx (otomatis dari DHCP router)
│   → Kirim crop wajah ke http://172.125.0.255:3000
│   → Baca RTSP dari Tapo C110
│
├── Tapo C110 (CCTV)
│   IP: 172.125.0.201
│   RTSP: rtsp://disguise:disguise-id123!@172.125.0.201:554/stream2
│
└── Internet (via Cloudflare Tunnel)
    URL: https://disguise.walldev.my.id → localhost:3001
    (untuk akses dashboard dari luar rumah/kantor)
```

---

## LANGKAH 1 — Install NVIDIA Container Toolkit

Wajib dilakukan agar Docker bisa akses RTX 4050:

```bash
# Install toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Konfigurasi Docker runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verifikasi GPU terdeteksi di Docker
docker run --rm --gpus all nvidia/cuda:12.1.1-base-ubuntu22.04 nvidia-smi
```

Output yang diharapkan:
```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI ...   Driver Version: ...   CUDA Version: 12.x                  |
|-------------------------------+----------------------+----------------------+
| GPU 0: NVIDIA GeForce RTX 4050 Laptop GPU         ...                      |
+-----------------------------------------------------------------------------+
```

---

## LANGKAH 2 — Siapkan Model File

Copy model dari hasil training Kaggle ke folder ML Service:

```bash
# Buat folder
mkdir -p ./ml-service/models

# Copy file model (dari hasil training kita)
# Kalau masih di Kaggle, download dulu:
# kaggle ... atau download manual dari Kaggle Files panel

cp /path/ke/best_verification_model.pth ./ml-service/models/

# Verifikasi
ls -lh ./ml-service/models/
# Harus ada: best_verification_model.pth (~100MB)
```

---

## LANGKAH 3 — Struktur Folder Project

```
disguiseid/                   ← root folder project
├── docker-compose.yml        ← file yang sudah kita buat
├── backend/                  ← Express.js backend
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── frontend/                 ← Next.js frontend
│   ├── Dockerfile
│   ├── package.json
│   └── app/
├── ml-service/               ← Python FastAPI ML
│   ├── Dockerfile
│   ├── main.py
│   └── models/
│       └── best_verification_model.pth
└── database/
    └── init/
        └── 01_init.sql
```

---

## LANGKAH 4 — Jalankan Semua Service

```bash
cd disguiseid/

# Build dan jalankan semua container
docker compose up -d --build

# Pantau log semua container
docker compose logs -f

# Atau lihat per service
docker compose logs -f ml-service
docker compose logs -f backend
```

---

## LANGKAH 5 — Verifikasi Semua Service Jalan

```bash
LAPTOP_IP="172.125.0.255"

# 1. Backend health
curl http://$LAPTOP_IP:3000/health

# 2. ML Service health (dari laptop, port internal)
curl http://localhost:8000/health
# Atau dari dalam Docker network:
docker exec disguiseid_backend curl http://ml-service:8000/health

# 3. Frontend bisa dibuka di browser
echo "Buka di browser: http://$LAPTOP_IP:3001"

# 4. MinIO console
echo "MinIO UI: http://$LAPTOP_IP:9001 (minioadmin/minioadmin123)"
```

---

## LANGKAH 6 — Update .env Pi

Di Raspberry Pi, pastikan `.env` menggunakan IP lokal:

```bash
nano /opt/disguiseid-pi/.env
```

Pastikan baris ini:
```
API_BASE_URL=http://172.125.0.255:3000   # ← IP laptop, bukan Cloudflare
```

Bukan:
```
API_BASE_URL=https://api3.walldev.my.id  # ← ini untuk akses luar saja
```

---

## LANGKAH 7 — Test End-to-End dari Pi

```bash
# Di Pi
source ~/disguiseid-venv/bin/activate
python3 /opt/disguiseid-pi/test_kirim.py
```

Output yang diharapkan:
```
✅  Internet aktif
✅  Backend dapat dijangkau — HTTP 200
✅  Kamera terbuka — resolusi 640x480
✅  Frame berhasil: 640x480px
✅  JPEG siap — ukuran: 8.2 KB
✅  SUKSES — Gambar diterima backend (202 Accepted)
```

---

## CATATAN PENTING

### Kenapa Pi harus pakai IP lokal, bukan Cloudflare?

| | IP Lokal | Cloudflare Tunnel |
|---|---|---|
| Latency | <5ms | 100-300ms |
| Reliability | Tidak perlu internet | Butuh internet stabil |
| Bandwidth | 100Mbps+ | Terbatas oleh koneksi internet |
| Privasi | Data tidak keluar jaringan | Data lewat server Cloudflare |

Untuk sistem real-time CCTV, latency <5ms vs 300ms bisa beda antara "alert muncul dalam 1 detik" vs "alert muncul dalam 5+ detik".

### Bagaimana Pi tahu IP laptop?

Pi dan laptop di subnet yang sama (172.125.0.0/21), jadi langsung bisa ping:

```bash
# Dari Pi, test bisa reach laptop
ping 172.125.0.255

# Test backend
curl http://172.125.0.255:3000/health
```

### Kalau IP laptop berubah?

IP dinamis dari DHCP router bisa berubah. Solusi:
```bash
# Di router, set static IP untuk laptop berdasarkan MAC address
# ATAU set static IP di Ubuntu:
# Settings → Network → Wired → IPv4 → Manual
# Address: 172.125.0.255, Netmask: 255.255.248.0, Gateway: 172.125.0.1
```

### GPU tidak terdeteksi di ML Service?

```bash
# Cek log
docker compose logs ml-service

# Test GPU di dalam container
docker exec disguiseid_ml python3 -c "import torch; print(torch.cuda.is_available())"

# Kalau False: nvidia-ctk belum dikonfigurasi atau driver bermasalah
# Re-run: sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker
```
