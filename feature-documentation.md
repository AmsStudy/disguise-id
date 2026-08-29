# DOKUMENTASI LENGKAP FITUR, HALAMAN, DAN BASE URL SISTEM DISGUISE-ID

**DISGUISE-ID** adalah sistem pengawasan intelijen dan pengenalan wajah buronan (*DPO - Daftar Pencarian Orang*) berbasis AI real-time yang dirancang untuk mendukung operasi taktis kepolisian dan aparat penegak hukum, baik di command center (Web Dashboard) maupun di lapangan (Mobile App).

---

## 1. Topologi Jaringan & Base URL Produksi

Sistem beroperasi di bawah domain utama **`disguise.id`** dengan reverse proxy Caddy dan SSL terintegrasi:

| Komponen / Subdomain | Production URL / Base Endpoint | Protokol | Fungsi Utama |
| :--- | :--- | :--- | :--- |
| **Domain Utama (Web Dashboard)** | **`https://disguise.id`** | HTTPS / HTTP | Portal Command Center & Web App Next.js |
| **Backend REST API** | **`https://api.disguise.id/api/v1`** | HTTPS | Endpoint Core Business Logic, Ingesti, & Sinkronisasi |
| **Realtime WebSocket Server** | **`wss://api.disguise.id`** (`/socket.io/`) | WSS / WS | Siaran realtime alert deteksi, tracking, & status kamera |
| **Live Stream Server (WHEP/WebRTC)**| **`https://stream.disguise.id`** | HTTPS / WebRTC | Streaming video CCTV latensi ultra-rendah (<500ms) |
| **Object Storage (MinIO)** | **`https://storage.disguise.id`** | HTTPS | Penyimpanan terenkripsi foto DPO, frame, & crop wajah |
| **Mobile App Base URL** | **`https://api.disguise.id/api/v1`** | HTTPS | Endpoint komunikasi aplikasi mobile Android/iOS |

### 🗄️ Konfigurasi Bucket Object Storage (MinIO)
* **`watchlist-photos`**: Menyimpan foto resmi DPO yang didaftarkan ke sistem (`/watchlist/YYYY/MM/DD/<id>.png`).
* **`cctv-frames`**: Menyimpan frame tangkapan penuh dari kamera CCTV (`/frames/YYYY/MM/DD/<id>.jpg`).
* **`faces`**: Menyimpan hasil crop wajah beresolusi tinggi hasil deteksi RetinaFace (`/faces/<id>.jpg`).
* **`audit-logs`**: Arsip log ekspor audit dan laporan investigasi forensik.

---

## 2. Dokumentasi Halaman Web Dashboard (Next.js)

Seluruh halaman Web Command Center berada di bawah domain utama **`https://disguise.id`** dengan otorisasi berbasis Role-Based Access Control (RBAC).

---

### 2.1. Landing Page (`/`)
* **URL**: `https://disguise.id/`
* **Hak Akses**: Publik
* **Fungsi**:
  * Menampilkan perkenalan sistem DISGUISE-ID dan arsitektur pengawasan cerdas.
  * Menampilkan pilar teknologi: deteksi *RetinaFace*, ekstraksi embedding 512-D *ArcFace*, *Generative Shadow Pipeline*, dan *Multi-Frame Voting*.
  * Menyediakan navigasi langsung menuju halaman login command center.

---

### 2.2. Login Page (`/login`)
* **URL**: `https://disguise.id/login`
* **Hak Akses**: Publik
* **Fungsi**:
  * Autentikasi operator command center dan administrator menggunakan email dan password.
  * Penyimpanan JWT Access Token & Refresh Token terenkripsi pada cookie/local storage.
  * Pengambilan konteks organisasi (`orgId`) pengguna untuk isolasi data multi-tenant.
* **API Backend Terkait**:
  * `POST https://api.disguise.id/api/v1/auth/login`

---

### 2.3. Executive Dashboard (`/dashboard`)
* **URL**: `https://disguise.id/dashboard`
* **Hak Akses**: Admin, Analyst, Officer, Field Operator
* **Fungsi**:
  * **Statistik KPI Utama**: Menampilkan metrik ringkasan (Total Deteksi Hari Ini, Jumlah Target DPO Aktif, Kamera CCTV Online/Offline, dan Pending Alerts yang belum ditriase).
  * **Grafik Tren Deteksi**: Visualisasi volume deteksi per jam/hari menggunakan diagram interaktif.
  * **Aktivitas Terkini (Recent Sighting Feed)**: Daftar deteksi DPO terbaru lengkap dengan nama target, kamera sumber, tingkat kemiripan (%), dan waktu deteksi.
  * **Status Kesehatan Sistem**: Status koneksi database PostgreSQL, Redis, MediaMTX, dan ML Engine.
* **API Backend Terkait**:
  * `GET https://api.disguise.id/api/v1/analytics/dashboard`
  * `GET https://api.disguise.id/api/v1/alerts?limit=5&status=pending`

---

### 2.4. Live CCTV Surveillance Grid (`/dashboard/monitor`)
* **URL**: `https://disguise.id/dashboard/monitor`
* **Hak Akses**: Admin, Analyst, Officer
* **Fungsi**:
  * **Multi-Camera Grid**: Menampilkan live streaming video CCTV multi-layar (1x1, 2x2, 3x3) via WebRTC WHEP (`https://stream.disguise.id/<camera_id>`).
  * **Live Bounding Box Overlay**: Menggambar kotak deteksi wajah di atas video secara real-time melalui event Socket.IO (`detection:live`). Kotak hijau/cyan untuk wajah biasa, dan **merah berkedip** untuk target DPO yang cocok.
  * **HUD Biometrik & Tactical Audio Alert**: Mengeluarkan suara alarm peringatan instan saat DPO terdeteksi di salah satu sudut kamera.
  * **Quick Sighting Drawer**: Panel samping yang langsung memunculkan kartu identitas DPO yang baru saja tertangkap kamera untuk inspeksi cepat.
* **API Backend Terkait**:
  * `GET https://api.disguise.id/api/v1/cameras`
  * `GET https://api.disguise.id/api/v1/cameras/:id/status`
  * WebSocket Event: `detection:live`, `alert:new`, `camera:status`

---

### 2.5. Alerts Center & Triage (`/dashboard/alerts`)
* **URL**: `https://disguise.id/dashboard/alerts`
* **Hak Akses**: Admin, Analyst, Officer
* **Fungsi**:
  * **Triage & Manajemen Deteksi**: Mengelola seluruh insiden deteksi DPO dengan status `PENDING`, `VERIFIED` (Terkonfirmasi), `FALSE_POSITIVE` (Bukan Target), dan `DISMISSED` (Diabaikan).
  * **Dual Foto Perbandingan**: Menampilkan foto asli DPO bersanding langsung dengan foto hasil crop CCTV dan rekaman frame penuh.
  * **Breakdown Skor Biometrik**: Menampilkan persentase kemiripan terkalibrasi (%), jarak Euclidean L2, tingkat keyakinan (Tinggi/Sedang), dan margin pembeda terhadap kandidat lain.
  * **Multi-Filter**: Filter berdasarkan rentang tanggal, kamera CCTV tertentu, tingkat prioritas (`critical`, `high`, `medium`), dan nama target.
  * **Assign & Review**: Menugaskan alert ke personel lapangan tertentu untuk verifikasi fisik di lokasi.
* **API Backend Terkait**:
  * `GET https://api.disguise.id/api/v1/alerts`
  * `GET https://api.disguise.id/api/v1/alerts/:id`
  * `PATCH https://api.disguise.id/api/v1/alerts/:id/status`
  * `POST https://api.disguise.id/api/v1/alerts/:id/assign`

---

### 2.6. Watchlist / Manajemen DPO (`/dashboard/watchlist`)
* **URL**: `https://disguise.id/dashboard/watchlist`
* **Hak Akses**: Admin, Analyst, Officer
* **Fungsi**:
  * **Pusat Database Buronan**: Menampilkan katalog seluruh target DPO yang diawasi oleh organisasi.
  * **Registrasi DPO Baru**: Form pendaftaran target lengkap dengan Nama Lengkap, Nomor Perkara/Kasus, Catatan Ciri Fisik, Status Bahaya (`high`, `medium`, `low`), dan status aktif.
  * **Upload Multi-Foto & Auto Embedding**: Unggah beberapa foto referensi wajah (tampak depan, samping, kacamata, topi) yang secara otomatis diekstraksi menjadi vektor embedding 512 dimensi via ArcFace dan disimpan ke pgvector.
  * **Manajemen Galeri Foto DPO**: Menghapus atau menambah foto variasi baru untuk meningkatkan akurasi pencocokan di lapangan.
* **API Backend Terkait**:
  * `GET https://api.disguise.id/api/v1/watchlist`
  * `POST https://api.disguise.id/api/v1/watchlist`
  * `GET https://api.disguise.id/api/v1/watchlist/:id`
  * `PUT / PATCH https://api.disguise.id/api/v1/watchlist/:id`
  * `POST https://api.disguise.id/api/v1/watchlist/:id/photos`
  * `DELETE https://api.disguise.id/api/v1/watchlist/:id`

---

### 2.7. Manajemen Kasus Taktis (`/dashboard/cases` & `/dashboard/cases/[id]`)
* **URL**: `https://disguise.id/dashboard/cases` dan `https://disguise.id/dashboard/cases/[id]`
* **Hak Akses**: Admin, Analyst, Officer
* **Fungsi**:
  * **Pengelompokan Kasus Operasi**: Mengelompokkan satu atau beberapa target DPO ke dalam berkas kasus operasi spesifik (misal: "Operasi Curanmor Wilayah A").
  * **Detail Kasus (`/[id]`)**: Menampilkan daftar tersangka terkait, daftar personel/petugas yang ditugaskan, ringkasan kronologi, dan log catatan penyidikan.
  * **Timeline Sighting Kasus**: Menampilkan kronologi seluruh deteksi CCTV yang relevan dengan kasus tersebut secara terurut berdasarkan waktu.
* **API Backend Terkait**:
  * `GET https://api.disguise.id/api/v1/cases`
  * `POST https://api.disguise.id/api/v1/cases`
  * `GET https://api.disguise.id/api/v1/cases/:id`
  * `PATCH https://api.disguise.id/api/v1/cases/:id`

---

### 2.8. Analytics & Heatmap (`/dashboard/analytics`)
* **URL**: `https://disguise.id/dashboard/analytics`
* **Hak Akses**: Admin, Analyst
* **Fungsi**:
  * **Distribusi Deteksi per Wilayah & Kamera**: Grafik perbandingan jumlah deteksi pada setiap titik CCTV.
  * **Heatmap Aktivitas Target**: Visualisasi intensitas kemunculan target DPO berdasarkan jam dan hari.
  * **Metrik Kinerja AI**: Evaluasi rasio konfirmasi vs false positive, rata-rata waktu respons operator, dan akurasi model.
* **API Backend Terkait**:
  * `GET https://api.disguise.id/api/v1/analytics/overview`
  * `GET https://api.disguise.id/api/v1/analytics/cameras-performance`
  * `GET https://api.disguise.id/api/v1/analytics/accuracy-metrics`

---

### 2.9. ML V2 Evaluation Platform (`/dashboard/ml-v2`)
* **URL**: `https://disguise.id/dashboard/ml-v2`
  * Sub-halaman: `/dashboard/ml-v2/reviews`, `/dashboard/ml-v2/promotions`, `/dashboard/ml-v2/reviewed-alerts`
* **Hak Akses**: Super Admin, AI Engineer, Lead Analyst
* **Fungsi**:
  * **Shadow Pipeline Monitoring**: Memantau inferensi model AI V2 (yang berjalan secara *shadow* di latar belakang tanpa mengganggu alur utama V1).
  * **Ulasan False Positive Lapangan (`/reviews`)**: Mengkaji laporan ketidakcocokan wajah dari petugas lapangan untuk dijadikan bahan evaluasi model AI.
  * **Evaluasi & Promosi Model (`/promotions`)**: Menguji metrik performa model V2 sebelum dipromosikan menggantikan model aktif.
* **API Backend Terkait**:
  * `GET https://api.disguise.id/api/v1/ml-v2/stats`
  * `GET https://api.disguise.id/api/v1/ml-v2/reviews`
  * `POST https://api.disguise.id/api/v1/ml-v2/promotions`

---

### 2.10. User & RBAC Management (`/dashboard/users`)
* **URL**: `https://disguise.id/dashboard/users`
* **Hak Akses**: Super Admin, Organization Admin
* **Fungsi**:
  * Manajemen akun pengguna: Tambah pengguna baru, ubah role (`SUPER_ADMIN`, `ADMIN`, `ANALYST`, `OFFICER`, `FIELD_OPERATOR`), reset password, atau nonaktifkan akun.
  * Pembagian hak akses menu dan izin verifikasi data.
* **API Backend Terkait**:
  * `GET https://api.disguise.id/api/v1/users`
  * `POST https://api.disguise.id/api/v1/users`
  * `PATCH https://api.disguise.id/api/v1/users/:id`
  * `DELETE https://api.disguise.id/api/v1/users/:id`

---

### 2.11. Audit Log Forensik (`/dashboard/audit`)
* **URL**: `https://disguise.id/dashboard/audit`
* **Hak Akses**: Super Admin, Security Officer
* **Fungsi**:
  * Pencatatan log aktivitas sistem yang tidak dapat diubah (*immutable audit trail*).
  * Mencatat: Siapa (User ID & Nama), Kapan (Timestamp), Dari Mana (IP Address), Apa yang dilakukan (Login, Verifikasi Alert, Tambah DPO, Hapus Kamera, Ekspor Data).
* **API Backend Terkait**:
  * `GET https://api.disguise.id/api/v1/audit`
  * `GET https://api.disguise.id/api/v1/audit/export`

---

### 2.12. Konfigurasi Sistem & CCTV (`/dashboard/settings`)
* **URL**: `https://disguise.id/dashboard/settings`
* **Hak Akses**: Admin
* **Fungsi**:
  * **Pendaftaran Kamera CCTV**: Tambah kamera baru, konfigurasi RTSP stream URL, nama lokasi, zona wilayah, lantai, serta koordinat peta (Latitude & Longitude).
  * **Pengaturan Ambang Batas AI**: Mengatur batas minimum similarity score, ukuran bounding box, dan sampling interval.
  * **Integrasi MediaMTX**: Sinkronisasi path streaming otomatis dengan server MediaMTX.
* **API Backend Terkait**:
  * `GET / POST / PATCH https://api.disguise.id/api/v1/cameras`
  * `GET / PATCH https://api.disguise.id/api/v1/settings`

---

## 3. Dokumentasi Layar Aplikasi Mobile (Flutter Field Ops)

Aplikasi mobile dirancang khusus untuk petugas di lapangan dengan kemampuan **operasi 24/7 di latar belakang**, **sirene panggilan darurat full-screen saat ponsel terkunci**, serta **sinkronisasi offline (Optimistic Outbox)** menggunakan database lokal SQLite (Drift).

---

### 3.1. LoginScreen (`/login`)
* **Navigasi**: Layar awal saat aplikasi dibuka jika token belum tersedia.
* **Fungsi**:
  * Autentikasi petugas lapangan dengan kredensial akun resmi.
  * Penyimpanan session dan token ke dalam Flutter Secure Storage.
  * Inisialisasi awal database SQLite Drift lokal untuk caching data offline.
* **API Terkait**: `POST https://api.disguise.id/api/v1/auth/login`

---

### 3.2. MainShellScreen (`/home`)
* **Navigasi**: Wadah navigasi utama dengan *Persistent Bottom Navigation Bar*.
* **Fungsi**:
  * Menyediakan 4 tab menu taktis utama: **Peta Taktis**, **Daftar Alert**, **Katalog DPO**, dan **Pengaturan**.
  * Dilengkapi *Quick Status Badge* di atas ikon Alert yang menampilkan jumlah alert pending secara real-time.

---

### 3.3. LiveMapScreen (`/map`)
* **Navigasi**: Tab 1 pada Bottom Navigation Bar.
* **Fungsi**:
  * **Peta Taktis Lapangan (OpenStreetMap / Mapbox)**: Menampilkan posisi GPS pengguna saat ini bersanding dengan titik-titik kamera CCTV di sekitarnya.
  * **Marker Kamera Interaktif**: Titik CCTV diberi kode warna status (Hijau = Normal, Merah Berkedip = Ada sighting DPO dalam 6 jam terakhir).
  * **Bottom Sheet Kamera**: Mengetuk marker kamera akan memunculkan informasi nama kamera, lokasi, riwayat deteksi terakhir, dan tombol pintas untuk membuka live stream.
* **API Terkait**:
  * `GET https://api.disguise.id/api/v1/mobile/alerts/map`
  * `GET https://api.disguise.id/api/v1/cameras`

---

### 3.4. LiveCameraStreamScreen (`/cameras/live/:id`)
* **Navigasi**: Dibuka dari bottom sheet marker kamera pada peta atau daftar kamera.
* **Fungsi**:
  * **Live Stream Player CCTV**: Memutar video stream langsung dari kamera CCTV lapangan via HLS (`https://stream.disguise.id/<camera_id>/index.m3u8`) atau WebRTC.
  * Dilengkapi kontrol putar/jeda, tombol layar penuh (orientasi landscape), dan indikator latensi real-time.
* **API Terkait**: `GET https://api.disguise.id/api/v1/cameras/:id`

---

### 3.5. PersonTrailMapScreen (`/map/trail/:personId`)
* **Navigasi**: Dibuka dari halaman detail DPO atau detail alert.
* **Fungsi**:
  * **Peta Pelacakan Jalur Pergerakan (*Movement Trail*)**: Menggambar garis rute pelarian/pergerakan DPO dengan menghubungkan titik-titik koordinat kamera CCTV tempat target terdeteksi secara kronologis.
  * Menampilkan urutan nomor deteksi (1, 2, 3...) beserta waktu sighting pada setiap kamera.
* **API Terkait**: `GET https://api.disguise.id/api/v1/alerts?person_id=:personId&limit=50`

---

### 3.6. AlertsScreen (`/alerts`)
* **Navigasi**: Tab 2 pada Bottom Navigation Bar.
* **Fungsi**:
  * **Feed Alert Real-time**: Menampilkan daftar insiden deteksi DPO dengan status `pending`, `confirmed`, atau `rejected`.
  * **Reaktivitas Drift Database**: Daftar alert langsung ter-update secara instan saat ada event WebSocket `alert:new` tanpa perlu refresh manual.
  * **Filter Cepat**: Filter berdasarkan tingkat keparahan (*Critical*, *High*, *Medium*) dan status triase.
* **API & Sinkronisasi**:
  * Stream langsung dari tabel lokal SQLite Drift (`SELECT * FROM alerts ORDER BY created_at DESC`).
  * `GET https://api.disguise.id/api/v1/mobile/alerts` (Sinkronisasi latar belakang).

---

### 3.7. AlertDetailScreen (`/alerts/detail/:id`)
* **Navigasi**: Dibuka saat item pada daftar alert diklik atau saat panggilan darurat diterima.
* **Fungsi**:
  * **Dual Foto Perbandingan**: Menampilkan foto asli DPO (kiri) bersanding dengan foto crop wajah CCTV (kanan) beserta tombol zoom layar penuh.
  * **HUD Skor Kemiripan**: Visualisasi persentase kemiripan terkalibrasi (misal: `87.0%`), badge kategori keyakinan (*Tinggi/Sedang*), dan jarak biometrik.
  * **Metadata Lokasi**: Menampilkan nama kamera, nama ruangan/zona, lantai, dan koordinat.
  * **Tombol Verifikasi Lapangan**:
    * **Konfirmasi Target (Verified)**: Menyatakan bahwa target di lapangan benar adalah DPO.
    * **Bukan Target (False Positive Modal)**: Membuka dialog pilihan alasan (wajah berbeda, buram, pencahayaan, atau catatan bebas).
  * **Optimistic Outbox Service**: Jika perangkat sedang offline/kehilangan sinyal, aksi verifikasi tetap tersimpan di SQLite lokal dan otomatis dikirimkan ke backend begitu sinyal kembali.
* **API Terkait**:
  * `GET https://api.disguise.id/api/v1/alerts/:id`
  * `POST https://api.disguise.id/api/v1/alerts/:id/review`

---

### 3.8. IncomingDetectionScreen (`/alerts/incoming/:id`)
* **Navigasi & Pemicu**: **Deep Link Taktis** (`disguiseid://alerts/incoming/<alert_id>`) yang dipicu secara otomatis oleh Android Foreground Service saat target DPO terdeteksi.
* **Fungsi**:
  * **Panggilan Darurat Full-Screen (*Emergency Call HUD*)**: Tampil otomatis di layar depan bahkan ketika ponsel dalam keadaan terkunci (*Lockscreen Wake*).
  * **Pulsing Red Radial Glow & Audio Alarm**: Memancarkan animasi lingkar radar merah dan membunyikan sirene alarm kepolisian berfrekuensi tinggi.
  * **Biometric Glance Card**: Menampilkan perbandingan cepat foto DPO vs CCTV, nama buronan, skor match, dan kamera sumber.
  * **Tombol Mute Sirene**: Menonaktifkan bunyi alarm audio tanpa menutup layar.
  * **Tombol Buka Detail / Terima**: Menghentikan alarm dan langsung mengarahkan petugas ke `AlertDetailScreen` untuk penanganan taktis.
* **Komponen Terkait**:
  * `BackgroundServiceManager` (Isolate latar belakang Socket.IO).
  * `LocalNotificationService` (`fullScreenIntent: true`, `priority: Priority.max`).
  * `AudioAlertService` (Player audio sirene taktis loop).

---

### 3.9. WatchlistScreen & WatchlistDetailScreen (`/watchlist`)
* **Navigasi**: Tab 3 pada Bottom Navigation Bar.
* **Fungsi**:
  * **Pencarian Cepat DPO Mobile**: Mencari target DPO berdasarkan nama atau nomor perkara langsung dari genggaman.
  * **Detail Profil DPO**: Menampilkan seluruh galeri foto referensi, tingkat bahaya, deskripsi ciri khusus, serta tombol pintas untuk melihat riwayat kemunculan DPO di CCTV (*Person Movement Trail*).
* **API Terkait**:
  * `GET https://api.disguise.id/api/v1/watchlist`
  * `GET https://api.disguise.id/api/v1/watchlist/:id`

---

### 3.10. SettingsScreen (`/settings`)
* **Navigasi**: Tab 4 pada Bottom Navigation Bar.
* **Fungsi**:
  * **Konfigurasi Host Server**: Memilih mode host (`Production: https://api.disguise.id` atau `Development IP`).
  * **Kontrol Background Service 24/7**: Mengaktifkan atau menonaktifkan foreground service notifikasi saat aplikasi ditutup.
  * **Pengaturan Sirene Audio**: Menguji suara alarm dan mengatur volume notifikasi darurat.
  * **Status Antrean Outbox**: Memantau jumlah aksi verifikasi lokal yang sedang menunggu pengiriman ke server saat offline.
  * **Logout & Bersihkan Cache**: Keluar dari akun dan membersihkan cache token lokal.

---

## 4. Katalog Modul Backend & API Endpoints (`https://api.disguise.id/api/v1`)

Seluruh endpoint backend dilayani melalui Express.js dan terproteksi middleware otentikasi JWT / API Key.

### 4.1. Modul Autentikasi (`/auth`)
* `POST /auth/login` — Login pengguna dan penerbitan JWT Access + Refresh token.
* `POST /auth/refresh` — Pembaruan Access Token yang telah kedaluwarsa.
* `POST /auth/logout` — Pencabutan sesi dan token pengguna.
* `GET /auth/me` — Pengambilan profil dan hak akses pengguna aktif.

### 4.2. Modul Alert & Triase (`/alerts` & `/mobile/alerts`)
* `GET /alerts` — Mengambil daftar alert deteksi dengan pagination dan filter organisasi.
* `GET /alerts/:id` — Detail lengkap satu alert termasuk metadata frame dan relasi DPO.
* `PATCH /alerts/:id/status` — Memperbarui status triase alert (`confirmed`, `false_positive`, `dismissed`).
* `POST /alerts/:id/assign` — Menugaskan penanganan alert ke petugas tertentu.
* `GET /mobile/alerts` — Endpoint ringan khusus mobile yang mengembalikan format terstandarisasi.
* `GET /mobile/alerts/map` — Mengambil alert 6 jam terakhir yang memiliki koordinat geospasial untuk ditampilkan pada Peta Taktis.

### 4.3. Modul Watchlist / DPO (`/watchlist`)
* `GET /watchlist` — Mengambil daftar seluruh target DPO aktif organisasi.
* `POST /watchlist` — Mendaftarkan target DPO baru (Nama, Nomor Kasus, Tingkat Bahaya).
* `GET /watchlist/:id` — Mengambil profil detail DPO beserta seluruh galeri foto.
* `PATCH /watchlist/:id` — Memperbarui informasi profil DPO.
* `DELETE /watchlist/:id` — Menghapus/menonaktifkan DPO dari daftar pencarian.
* `POST /watchlist/:id/photos` — Mengunggah foto wajah baru DPO (Otomatis diekstraksi ke embedding 512D ArcFace).
* `DELETE /watchlist/:id/photos/:photoId` — Menghapus salah satu foto referensi DPO.

### 4.4. Modul Kamera CCTV (`/cameras`)
* `GET /cameras` — Mengambil daftar seluruh kamera CCTV organisasi beserta status online/offline.
* `POST /cameras` — Mendaftarkan kamera baru dan otomatis meregistrasikan path RTSP ke MediaMTX.
* `GET /cameras/:id` — Mengambil konfigurasi detail kamera dan URL streaming HLS/WebRTC.
* `PATCH /cameras/:id` — Memperbarui konfigurasi kamera (Nama, Koordinat Peta, RTSP URL).
* `DELETE /cameras/:id` — Menghapus kamera dan menutup streaming path di MediaMTX.

### 4.5. Modul Camera Agent & Ingesti Edge (`/camera-agent` & `/inference`)
* `GET /camera-agent/config` — Diambil oleh Edge Agent untuk sinkronisasi parameter deteksi (det_size, min_confidence).
* `POST /camera-agent/heartbeat` — Laporan berkala status hidup dan FPS kamera edge.
* `POST /camera-agent/tracking` — Mengirim koordinat bounding box real-time untuk diteruskan via WebSocket ke Web Monitor.
* `POST /camera-agent/trigger-alert` — Endpoint simulasi & injeksi alert darurat untuk pengujian taktis.
* `POST /inference/frame` — Mengunggah crop wajah dan frame scene CCTV dari Edge Agent ke antrean inferensi BullMQ.

### 4.6. Modul Machine Learning V2 (`/ml-v2`)
* `GET /ml-v2/stats` — Metrik perbandingan performa model V1 aktif vs model V2 shadow.
* `GET /ml-v2/reviews` — Daftar ulasan kasus false positive yang dilaporkan oleh petugas lapangan.
* `POST /ml-v2/promotions` — Memicu promosi model AI V2 menjadi model produksi utama.

### 4.7. Modul Kasus, Analytics, Users, & Audit
* `GET / POST / PATCH /cases` — Manajemen berkas kasus operasional taktis.
* `GET /analytics/dashboard` — Metrik ringkasan eksekutif untuk grafik dan KPI.
* `GET / POST / PATCH / DELETE /users` — Manajemen akun pengguna dan pembagian role RBAC.
* `GET /audit` — Riwayat log audit aktivitas forensik.
* `GET /system/health` — Status kesehatan container dan dependensi sistem.

### 4.8. Event Realtime WebSocket (Socket.IO)
* **`alert:new`**: Dipancarkan ke room `org:<orgId>` saat AI mendeteksi DPO dengan skor di atas threshold. Memicu bunyi alarm web dan notifikasi darurat mobile.
* **`alert:updated`**: Dipancarkan saat status alert diverifikasi atau diubah oleh salah satu operator.
* **`camera:status`**: Memperbarui status konektivitas CCTV (Online/Offline/Reconnecting).
* **`detection:live`**: Mengirimkan koordinat bounding box wajah untuk digambar di atas live video web monitor.

---

## 5. Ringkasan Alur Operasi Deteksi End-to-End

```mermaid
sequenceDiagram
    autonumber
    participant CCTV as Kamera CCTV / Video Source
    participant Edge as Edge Camera Agent (RetinaFace)
    participant MTX as MediaMTX Stream Server
    participant Backend as Backend API (Express & BullMQ)
    participant ML as ML Service (ArcFace 512D & pgvector)
    participant Web as Web Dashboard (https://disguise.id)
    participant Mobile as Mobile App (Android 24/7 Service)

    CCTV->>MTX: Push Stream RTSP (rtsp://localhost:8554/<id>)
    CCTV->>Edge: Stream Frame Realtime (15 FPS)
    Edge->>Edge: Deteksi Wajah RetinaFace (Confidence >= 0.30)
    Edge->>Backend: Upload Crop Wajah & Frame (/inference/frame)
    Backend->>ML: Ekstraksi Embedding & Pencocokan Watchlist pgvector
    ML-->>Backend: Kemiripan >= 60% (Match DPO: "Aan", Score: 87.0%)
    Backend->>Backend: Simpan Alert Baru ke PostgreSQL (Status: Pending)
    Backend->>Web: Emit Socket.IO 'alert:new' & 'detection:live'
    Backend->>Mobile: Emit Socket.IO 'alert:new' (Background Service Isolate)
    Web->>Web: Tampilkan Bounding Box Merah & Bunyikan Alarm Monitor
    Mobile->>Mobile: Bangunkan Layar Terkunci (Full-Screen Incoming Detection Call)
    Mobile->>Mobile: Putar Sirene Taktis Kepolisian & Tampilkan Dual Foto
    Mobile->>Backend: Petugas Lapangan Konfirmasi Verifikasi (/alerts/:id/review)
    Backend->>Web: Update Status Alert Menjadi 'CONFIRMED' secara Realtime
```

---

*Dokumen ini disusun sebagai panduan arsitektur resmi sistem DISGUISE-ID untuk tim pengembangan, operasional command center, dan petugas lapangan.*
