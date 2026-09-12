# 🛡️ Panduan Konfigurasi Keamanan v2.1 & Cloudflare Tunnel
> **Tujuan:** Mengamankan seluruh sistem DISGUISE-ID agar **TIDAK DAPAT DIAKSES** melalui alamat IP langsung (baik IP lokal seperti `172.125.0.0/21`, IP LAN, maupun IP publik host), dan **HANYA DAPAT DIAKSES** melalui domain resmi yang melewati **Cloudflare Tunnel**.

---

## 🔍 1. Mengapa Sebelumnya Sistem Bisa Diakses via IP Lokal (`172.125.0.0/21`)?

Pada konfigurasi Docker Compose standar:
```yaml
ports:
  - "3001:3001" # Frontend
  - "3002:3000" # Backend
  - "5432:5432" # Postgres
```
Secara *default*, Docker memetakan port ke `0.0.0.0` (seluruh *interface* jaringan pada mesin host). Akibatnya:
1. Docker memotong aturan firewall Linux (*iptables PREROUTING*).
2. Siapa pun dalam subnet lokal/VPC yang sama (misal `172.125.0.0/21`) bisa mengetik `http://172.125.1.100:3001` atau `http://172.125.1.100:3002` dan langsung masuk ke aplikasi tanpa melalui Cloudflare, melewati seluruh proteksi WAF, SSL, dan domain filtering!

---

## 🔒 2. Solusi & Arsitektur Keamanan v2.1

Pada versi **v2.1**, diterapkan sistem pertahanan berlapis (*Defense-in-Depth*):

```
                                  INTERNET / PENGGUNA
                                           │
                                           ▼
                            ┌─────────────────────────────┐
                            │    Cloudflare Edge & WAF    │ (disguise.id, api.disguise.id)
                            └──────────────┬──────────────┘
                                           │ Encrypted Outbound Tunnel
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SERVER HOST (IP: 172.125.1.100)                                                        │
│                                                                                        │
│   ❌ AKSES IP DITOLAK:                                                                 │
│      • http://172.125.1.100:3001 ──► [CONNECTION REFUSED] (Port tidak di-expose)       │
│      • http://172.125.1.100:3002 ──► [CONNECTION REFUSED] (Port tidak di-expose)       │
│      • http://172.125.1.100:80   ──► [403 FORBIDDEN] (Ditolak oleh Caddy IP-Blocker)  │
│                                                                                        │
│   ✅ AKSES HANYA VIA TUNNEL DOCKER:                                                    │
│      ┌───────────────────────────┐                                                     │
│      │ disguise-cloudflared      │ ◄── Terhubung ke Cloudflare Edge                    │
│      └─────────────┬─────────────┘                                                     │
│                    │ Jaringan Internal Docker (disguise-network)                       │
│                    ▼                                                                   │
│      ┌───────────────────────────┐                                                     │
│      │ disguise-caddy            │ ──► Meneruskan HANYA traffic dengan domain resmi    │
│      └──────┬──────────────┬─────┘                                                     │
│             ▼              ▼                                                           │
│      [ Frontend:3001 ] [ Backend:3000 ]                                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3 Lapis Proteksi yang Diterapkan:
1. **Host Port Binding Isolation (`127.0.0.1`):**  
   Seluruh port aplikasi (`postgres`, `redis`, `minio`, `ml-service`, `backend`, `frontend`) kini diikat khusus ke `127.0.0.1` (loopback internal mesin). Port **TIDAK MENDENGARKAN** antarmuka `0.0.0.0` maupun `172.125.0.0/21`. Perangkat dari jaringan lokal akan langsung menerima respon `Connection Refused`.
2. **Caddy Direct IP Blocker (`:80` Fallback):**  
   Pada berkas `Caddyfile`, blok `:80` disiapkan untuk menangkap semua request mentah via IP (seperti `http://172.125.1.100` atau `http://<IP_PUBLIK>`). Caddy secara otomatis merespon dengan **`403 Forbidden: Akses langsung via IP diblokir`** dan menutup koneksi.
3. **Cloudflare Tunnel Daemon (`cloudflared`):**  
   Menggunakan koneksi keluar (*outbound-only*). Server tidak perlu membuka port masuk publik untuk web/api. Semua lalu lintas dialirkan secara aman melalui terowongan terenkripsi Cloudflare.

---

## 🚀 3. Langkah Setup Cloudflare Tunnel di Cloudflare Dashboard

Jika Anda belum memiliki Token Tunnel:

1. Buka [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. Masuk ke menu **Networks** $\to$ **Tunnels** $\to$ Klik **Add a Tunnel**.
3. Pilih opsi **Cloudflared** $\to$ Beri nama tunnel (misal: `disguise-id-prod`).
4. Pada bagian *Install and run a connector*, pilih tab **Docker**.
5. Salin string token setelah kata kunci `--token` (panjangnya sekitar 60-90 karakter, biasanya diawali `eyJh...`).
6. Masuk ke tab **Public Hostname**, lalu tambahkan 4 rute berikut:

| Public Hostname | Service Type | Service URL (Internal Docker) | Keterangan |
| :--- | :---: | :---: | :--- |
| `disguise.id` | **HTTP** | `caddy:80` | Web Dashboard Next.js |
| `api.disguise.id` | **HTTP** | `caddy:80` | Express Backend API |
| `storage.disguise.id` | **HTTP** | `caddy:80` | MinIO Object Storage |
| `stream.disguise.id` | **HTTP** | `caddy:80` | MediaMTX WHEP WebRTC Stream |

*(Alternatif: Anda juga bisa mengarahkan langsung ke nama service internal, misal `frontend:3001`, `backend:3000`, `minio:9000`, `mediamtx:8889`).*

---

## 🧹 4. Panduan Menghapus Container Lama & Deploy Ulang Bersih di Production

Ikuti langkah-langkah berikut di terminal server production:

### Langkah A: Hentikan dan Bersihkan Seluruh Container Lama
```bash
# 1. Masuk ke direktori proyek di server production
cd /path/to/disguise-id-fix

# 2. Hentikan semua container lama
docker compose down

# 3. (Opsional) Jika ingin menghapus seluruh volume/cache database lama agar bersih total:
# PERHATIAN: Ini akan menghapus data postgres & minio lama!
# docker compose down -v

# 4. Bersihkan container dan image lama yang sudah usang
docker container prune -f
docker image prune -af
```

### Langkah B: Ambil Kode Terbaru dari Git
```bash
# Ambil pembaruan dari branch ichwalv2
git fetch origin
git checkout ichwalv2
git pull origin ichwalv2
```

### Langkah C: Konfigurasi File `.env`
Pastikan file `.env` di root direktori telah menyertakan token Cloudflare Tunnel Anda:
```bash
cp .env.prod.example .env
nano .env
```
Isi bagian:
```env
DOMAIN_NAME=disguise.id
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoi...TOKEN_ASLI_DARI_CLOUDFLARE_ZERO_TRUST...
DB_PASSWORD=PasswordDatabaseAman2026!
JWT_SECRET=SecretJWTPanjangAman2026!
MINIO_ROOT_PASSWORD=PasswordMinioAman2026!
```

### Langkah D: Build dan Jalankan Container v2.1
```bash
# Build ulang image dengan model GSIVAE v2.1
docker compose build --no-cache

# Jalankan semua container di background
docker compose up -d
```

### Langkah E: Cek Status Container
```bash
docker compose ps
```
Pastikan seluruh container berikut berstatus **`Up`** / **`healthy`**:
- `disguise-postgres`
- `disguise-redis`
- `disguise-minio`
- `disguise-mediamtx`
- `disguise-ml-service` (GSIVAE + ArcFace v2.1)
- `disguise-backend`
- `disguise-frontend`
- `disguise-caddy`
- `disguise-cloudflared` (Konektor Tunnel Cloudflare)

---

## 🧪 5. Cara Validasi Pengujian Keamanan (Testing Isolation)

Lakukan tes berikut untuk memastikan proteksi IP berjalan 100%:

### Tes 1: Coba Akses via IP Lokal / Subnet (Harus Gagal)
Dari perangkat lain di jaringan `172.125.0.0/21`:
```bash
# Coba akses frontend via IP:
curl -I http://172.125.1.100:3001
# Hasil yang benar: curl: (7) Failed to connect to 172.125.1.100 port 3001: Connection refused

# Coba akses backend via IP:
curl -I http://172.125.1.100:3002
# Hasil yang benar: curl: (7) Failed to connect to 172.125.1.100 port 3002: Connection refused

# Coba akses Caddy via IP port 80:
curl -i http://172.125.1.100
# Hasil yang benar: HTTP/1.1 403 Forbidden
# Konten: 403 Forbidden: Akses langsung via IP diblokir!
```

### Tes 2: Akses via Domain Resmi Cloudflare (Harus Berhasil)
Buka di peramban web:
- `https://disguise.id` $\to$ Membuka Dashboard Web DISGUISE-ID dengan enkripsi SSL resmi Cloudflare.
- `https://api.disguise.id/health` $\to$ Mengembalikan `{"status":"ok"}`.
- `https://api.disguise.id/api/v2/health` $\to$ Mengembalikan `{"version":"2.1.0","model_architecture":"GSIVAE"}`.

---

## 📌 6. Catatan Khusus untuk Kamera CCTV Lapangan (MediaMTX Port 8554)

Kamera CCTV TP-Link Tapo atau Raspberry Pi di lapangan mengirimkan aliran video (*RTSP Push*) ke port `8554`.  
Port `8554` tetap terbuka di host untuk menerima aliran kamera RTSP.  
Jika Anda ingin membatasi agar port `8554` **hanya bisa menerima koneksi dari IP spesifik kamera CCTV** (misal `172.125.1.50`), Anda dapat menambahkan aturan firewall Linux `ufw`:

```bash
# Izinkan hanya IP kamera CCTV untuk mengirim RTSP ke port 8554:
sudo ufw allow from 172.125.1.50 to any port 8554 proto tcp
# Atau jika satu subnet CCTV:
sudo ufw allow from 172.125.1.0/24 to any port 8554 proto tcp
```
Dengan demikian, seluruh antarmuka web, API, dan database terlindungi secara kedap di balik Cloudflare Tunnel.
