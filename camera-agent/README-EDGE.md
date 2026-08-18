# Panduan Deployment Edge (Raspberry Pi 4) - DISGUISE-ID Camera Agent

Dokumen ini menjelaskan cara men-*deploy* Camera Agent pada perangkat Edge seperti Raspberry Pi yang terhubung langsung ke CCTV lokal dan terhubung ke Backend melalui jaringan nirkabel.

## Prasyarat
- **Perangkat**: Raspberry Pi 4 (RAM 8GB sangat disarankan).
- **OS**: Raspbian OS 64-bit / Ubuntu Server 64-bit.
- **Konektivitas**: 
  - `eth0`: Terhubung via kabel LAN ke CCTV (Static IP: `192.168.1.1/24`). CCTV harus diatur ke IP misal `192.168.1.27`.
  - `wlan0`: Terhubung via WiFi ke jaringan Backend (IP misal `172.125.0.200/21`).
- **Software**: Docker dan Docker Compose.

## Langkah-Langkah Deployment

### 1. Persiapkan Folder dan Konfigurasi
1. Salin seluruh folder `camera-agent` ke dalam Raspberry Pi.
2. Masuk ke direktori tersebut:
   ```bash
   cd camera-agent
   ```
3. Salin file contoh environment:
   ```bash
   cp .env.example .env
   ```
4. Edit file `.env` menggunakan `nano .env` dan sesuaikan IP dengan konfigurasi jaringan Anda:
   ```env
   BACKEND_URL=http://172.125.0.3:3002
   WEBSOCKET_URL=ws://172.125.0.3:3002
   API_KEY=cam_auto_xyz123
   CAMERA_ID=cam-raspi-01
   CAMERA_NAME=CCTV Pintu Masuk
   RTSP_URL=rtsp://disguise:disguise-id123@192.168.1.27:554/stream1
   ```

### 2. Jalankan Camera Agent (Docker)
Ketik perintah berikut untuk melakukan *build* image dan menjalankan *container* di latar belakang:
```bash
docker compose up -d --build
```
*(Catatan: Proses `build` pertama kali di Raspberry Pi akan memakan waktu cukup lama karena akan mengunduh dan mengompilasi dependensi library Python untuk arsitektur ARM64).*

### 3. Pemantauan & Troubleshooting
Untuk melihat aktivitas kamera (*logs*), melihat *framerate*, dan memastikan koneksi ke Backend dan RTSP sukses, jalankan:
```bash
docker compose logs -f
```

## Catatan Performa dan Penyimpanan
- **Storage/Disk**: Sangat AMAN. Agent ini bekerja secara `in-memory`. Tidak ada gambar yang disimpan secara permanen di SD Card Raspberry Pi. Foto akan otomatis dibuang dari RAM setelah dikirimkan ke server.
- **CPU & RAM**: Mengingat model deteksi wajah (`buffalo_l`) cukup berat, penggunaan CPU akan mendekati 100%. Jangan kaget jika Anda mendapati FPS turun di kisaran **0.5 - 2 FPS**. Ini adalah hal normal pada Raspi dan masih sangat cukup untuk mendeteksi wajah (DPO) pada titik-titik krusial seperti pintu gerbang.
