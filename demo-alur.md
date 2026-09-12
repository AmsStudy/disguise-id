# 🎬 Panduan Storyboard & Alur Demonstrasi Sistem: DISGUISE-ID (GSIVAE)
> **Dokumen Panduan Produksi Video Demonstrasi End-to-End**  
> **Target Audiens Tim Produksi:** Sutradara, Videografer, Motion Graphic Designer, Editor Video, dan Voiceover Talent.  
> **Tema Utama:** *"Mengungkap Penyamaran Wajah Kacamata Hitam & Oklusi pada CCTV Siang & Malam Menggunakan AI GSIVAE"*

---

## 📌 1. Ringkasan Eksekutif & Tujuan Video

Video ini bertujuan mendemonstrasikan keunggulan dan alur kerja utuh dari sistem **DISGUISE-ID**, sebuah platform intelijen pengenal wajah berpenyamar (*disguise-resilient biometric intelligence*) pertama yang ditenagai oleh model kecerdasan buatan terbaru **GSIVAE** (*Gated Skip-connected Inpainting Variational AutoEncoder*) dan **InsightFace ArcFace (512-D)**.

### Pesan Utama yang Harus Tersampaikan ke Penonton:
1. **Masalah Nyata:** Penjahat / buronan (DPO) kerap memakai **kacamata hitam pekat (*sunglasses*)** atau masker untuk mengecoh kamera CCTV dan AI pengenal wajah konvensional.
2. **Inovasi GSIVAE:** Model kami mampu **"membuka penyamaran" (*de-disguise reconstruction*)** dengan memulihkan kembali area mata, alis, dan pelipis secara presisi, baik pada pencahayaan **Siang Hari (*Daylight*)** maupun **Malam Hari (*Infrared Night Vision*)**.
3. **Kesiapan Sistem Nyata (*End-to-End Production Ready*):** Bukan sekadar riset di atas kertas—sistem bekerja secara langsung dari **kamera CCTV lapangan (Hardware & Edge IoT)**, diproses di **Server Cloud (FastAPI ML & pgvector)**, hingga memicu alarm seketika di **Dashboard Web Command Center** dan **Aplikasi Mobile Petugas Lapangan**.

---

## 🗺️ 2. Peta Alur Arsitektur Sistem (The Complete Pipeline)

Berikut adalah bagan alur kerja sistem end-to-end yang menjadi rujukan visual utama dalam video:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. HARDWARE & EDGE (LAPANGAN)                                                          │
│    • CCTV TP-Link Tapo (1080p FHD & 360p Substream)                                   │
│    • Kondisi Uji: Terang Siang Hari vs Mode Infrared Malam (B&W)                      │
│    • Edge Agent (Raspberry Pi / Mini PC): Deteksi RetinaFace & Filter Blur             │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Push RTSP Stream & Face Crop (4G / LAN)
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. CLOUD BACKEND & MEDIA STREAMING (SERVER GCP)                                        │
│    • MediaMTX: Mengubah RTSP CCTV menjadi WebRTC ultra-low latency (< 0.5 detik)       │
│    • Backend API (Node.js/Express): Orkestrasi deteksi & sesi pemantauan               │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Kirim Crop Wajah Bertopeng
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. ML-SERVICE V2: AI DE-DISGUISE & BIOMETRIC MATCHING (THE BRAIN)                      │
│    • Input: Crop Wajah Kacamata Hitam (224 x 224 x 3)                                 │
│    • GSIVAE Model: Gated Skip Attention memblokir kacamata hitam & merekonstruksi mata │
│    • ArcFace Model: Ekstraksi fitur biometrik identitas 512-Dimensi                    │
│    • PostgreSQL (pgvector): Pencarian kemiripan Cosine dengan foto target DPO          │
│    • Ambang Batas Resmi: Cosine Similarity >= 0.288 (Disguise-ID Standard)             │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Sinyal Alarm Seketika (WebSocket Event)
                     ┌─────────────────────┴─────────────────────┐
                     ▼                                           ▼
┌────────────────────────────────────────┐   ┌───────────────────────────────────────────┐
│ 4. DASHBOARD WEB COMMAND CENTER        │   │ 5. APLIKASI MOBILE PETUGAS LAPANGAN       │
│    • Live Monitoring WebRTC Real-Time  │   │    • Push Notification Getar Instan       │
│    • Pop-up Peringatan Merah Taktis    │   │    • Detail Profil & Kasus DPO            │
│    • Inspeksi 3-Panel:                 │   │    • Foto Hasil Rekonstruksi GSIVAE       │
│      [CCTV] -> [GSIVAE] -> [Database]  │   │    • Nama Kamera & Navigasi Peta Lokasi   │
└────────────────────────────────────────┘   └───────────────────────────────────────────┘
```

---

## 🎬 3. Naskah & Storyboard Detail Video Demonstrasi

* **Total Estimasi Durasi:** 3 Menit 30 Detik (atau versi ringkas 2 Menit).
* **Nuansa/Tone:** Taktis, Profesional, Futuristik, Elegan (*CSI / Cybersecurity style*).

---

### 🕒 SCENE 1: THE PROBLEM — TANTANGAN PENYAMARAN WAJAH
* **Durasi:** 00:00 – 00:25 (25 Detik)
* **Visual / Shot List:**
  1. *Footage sinematik:* Seseorang mencurigakan berjalan melewati area CCTV mengenakan **kacamata hitam pekat (*sunglasses*)** dan jaket tertutup.
  2. *Screen capture:* Kamera pengawas biasa mencoba mendeteksi wajah, namun sistem pengenal wajah konvensional menampilkan status: `[UNKNOWN / MATCH FAILED]`.
  3. *Motion Graphic overlay:* Menunjukkan area mata yang diblokir oleh kacamata hitam dengan teks: *"80% Fitur Kunci Biometrik Manusia Berada di Sekitar Mata dan Alis"*.
* **On-Screen Text (Grafis):**  
  `TANTANGAN BIOMETRIK: Oklusi Kacamata Hitam Menggagalkan AI Konvensional`
* **Narasi Voiceover (VO):**
  > *"Di era pengawasan modern, penyamaran seperti kacamata hitam pekat dan masker sering kali menjadi celah fatal. Saat area mata dan alis tertutup, sistem pengenal wajah konvensional kehilangan hingga delapan puluh persen fitur identitas kunci—membuat pelaku kejahatan bebas berkeliaran tanpa terdeteksi.*  
  > *Inilah mengapa kami menciptakan **DISGUISE-ID**."*

---

### 🕒 SCENE 2: PENDAFTARAN TARGET PADA WATCHLIST (COMMAND CENTER)
* **Durasi:** 00:25 – 00:50 (25 Detik)
* **Visual / Shot List:**
  1. *Screen recording:* Operator masuk ke **Dashboard Web DISGUISE-ID** (`/dashboard/watchlist`).
  2. Operator menekan tombol **"+ Daftarkan DPO Baru"**.
  3. Mengetik data identitas tersangka (Nama, NIK, Status Kasus) dan mengunggah **1 lembar foto asli wajah terbuka tanpa penyamaran**.
  4. Grafis kilat menunjukkan foto diproses oleh sistem: vektor biometrik 512-D langsung tersimpan ke database `pgvector`.
* **On-Screen Text (Grafis):**  
  `INPUT BIOMETRIK: 1 Foto Referensi -> 512-D Identity Vector Embedding`
* **Narasi Voiceover (VO):**
  > *"Alur dimulai dari Command Center. Petugas intelijen mendaftarkan target DPO ke dalam sistem hanya dengan mengunggah satu lembar foto profil wajah terbuka.*  
  > *Dalam hitungan milidetik, sistem mengekstrak dan menyimpan vektor biometrik lima ratus dua belas dimensi ke dalam database terenkripsi. Kini, seluruh jaringan kamera pemantau di lapangan otomatis siaga memburu target."*

---

### 🕒 SCENE 3: HARDWARE LAPANGAN & EDGE COMPUTING (SIANG & MALAM)
* **Durasi:** 00:50 – 01:25 (35 Detik)
* **Visual / Shot List:**
  1. *B-Roll Hardware:* Menyorot fisik kamera **CCTV TP-Link Tapo** yang terpasang di tiang pantau, kabel LAN yang terhubung ke kotak edge (**Raspberry Pi / Mini PC**), dan lampu indikator **Modem 4G/LTE**.
  2. *Split-Screen Uji Coba Lapangan:*
     - **Kiri (Siang Hari):** Target berkacamata hitam melintas di bawah terik sinar matahari.
     - **Kanan (Malam Hari):** Target berkacamata hitam melintas dalam kondisi gelap gulita, kamera beralih otomatis ke mode **Infrared Night Vision (Black & White)**.
  3. *Screen capture:* Program `camera-agent` bekerja di edge: mendeteksi wajah dengan **RetinaFace**, menyaring frame buram (*Laplacian blur rejection*), dan memotong *crop* wajah beresolusi tinggi.
* **On-Screen Text (Grafis):**  
  `EDGE PROCESSING: Dual-Stream RTSP + RetinaFace High-FPS Detection + 4G Gateway`
* **Narasi Voiceover (VO):**
  > *"Di garis terdepan, sistem mengandalkan infrastruktur edge yang tangguh. Kamera CCTV komersial seperti TP-Link Tapo terhubung langsung ke unit pemroses lokal Raspberry Pi.*  
  > *Baik di bawah terik siang hari maupun dalam kegelapan malam dengan sensor inframerah, Edge Agent secara cerdas mendeteksi pergerakan wajah menggunakan RetinaFace, memfilter gambar buram, dan mengirimkan potongan wajah berkualitas terbaik ke server pusat via koneksi seluler empat-G."*

---

### 🕒 SCENE 4: INOVASI GSIVAE — THE DE-DISGUISE RECONSTRUCTION
* **Durasi:** 01:25 – 02:15 (50 Detik) — *(CORE HIGHLIGHT / THE CLIMAX)*
* **Visual / Shot List:**
  1. *Motion Graphic 3D / Diagram Animasi:* Menampilkan arsitektur **GSIVAE** yang memukau:
     - Citra kacamata masuk ke **Residual Encoder (5 Blok)** $\to$ dikompresi ke **Ruang Laten 256-D**.
     - **Sorotan Utama:** Animasi gerbang **Gated Skip-Connection**. Perlihatkan bagaimana gerbang bernilai `0.0` memblokir kacamata hitam agar tidak tembus ke decoder, sementara fitur kulit asli bernilai `1.0` dialirkan mulus.
  2. *Side-by-Side Reconstruction Live:*
     - Tampilkan transisi halus (*wipe animation*) dari foto CCTV berkacamata hitam $\to$ bertransformasi menjadi wajah rekonstruksi yang terbuka matanya secara jernih dan proporsional.
  3. *Matching Engine:* Vektor biometrik wajah rekonstruksi diekstrak oleh **ArcFace** dan dicocokkan dengan foto database:
     - Grafis meteran Cosine Similarity bergerak naik dan berhenti di angka **`0.352`** (Melampaui threshold resmi $\tau = \mathbf{0.288}$).
* **On-Screen Text (Grafis):**  
  `GSIVAE ENGINE: Gated Skip-Connections Filter Occlusion -> ArcFace Biometric Match`  
  `Match Score: 0.352 (Threshold: 0.288) -> TARGET CONFIRMED!`
* **Narasi Voiceover (VO):**
  > *"Inilah jantung kecerdasan DISGUISE-ID: arsitektur **GSIVAE**—Gated Skip-connected Inpainting Variational AutoEncoder.*  
  > *Berbeda dari AI rekonstruksi biasa yang justru menyalin kacamata hitam ke hasil akhir, GSIVAE memiliki gerbang adaptif khusus yang memblokir total oklusi kacamata hitam, sembari mempertahankan kontur kulit asli.*  
  > *Model kemudian merekonstruksi kembali mata, alis, dan pelipis manusia yang hilang secara realistis berdasarkan probabilitas laten.*  
  > *Citra baru ini diumpankan ke model biometrik ArcFace. Hasilnya? Tingkat kemiripan melampaui batas ambang resmi nol koma dua delapan delapan—identitas sang buronan berhasil dibongkar!"*

---

### 🕒 SCENE 5: WEB COMMAND CENTER — ALERTING & INVESTIGASI
* **Durasi:** 02:15 – 02:45 (30 Detik)
* **Visual / Shot List:**
  1. *Screen capture:* Operator di meja Command Center sedang memantau video CCTV langsung via **WebRTC stream** ultra-low latency (< 0.5 detik).
  2. *Efek dramatis:* Seketika layar berkedip merah dengan **bunyi sirene peringatan**, memunculkan pop-up modal taktis:  
     `⚠️ DPO TARGET TERDETEKSI DI CCTV GERBANG UTAMA!`
  3. Operator mengklik modal untuk membuka **Panel Perbandingan 3-Sisi (Side-by-Side Comparison)**:
     - **Panel 1:** Foto Tangkapan CCTV Asli (Wajah Berkacamata Hitam).
     - **Panel 2:** Foto Hasil Rekonstruksi AI GSIVAE (Wajah Tanpa Kacamata).
     - **Panel 3:** Foto Referensi DPO di Database.
     - Tertera skor kemiripan, timestamp detik kejadian, dan riwayat kamera.
* **On-Screen Text (Grafis):**  
  `COMMAND CENTER ALERT: WebRTC Low-Latency Video + Side-by-Side Biometric Audit`
* **Narasi Voiceover (VO):**
  > *"Secara bersamaan di Command Center, sirene alarm berbunyi dan peringatan prioritas tinggi muncul seketika di layar.*  
  > *Dashboard menyajikan bukti investigasi lengkap: perbandingan tiga sisi antara tangkapan asli CCTV, hasil rekonstruksi GSIVAE, dan foto profil DPO di database, lengkap dengan skor kemiripan dan titik koordinat kamera."*

---

### 🕒 SCENE 6: MOBILE APP — TINDAKAN TAKTIS PETUGAS LAPANGAN
* **Durasi:** 02:45 – 03:15 (30 Detik)
* **Visual / Shot List:**
  1. *Live Action Footage:* Petugas keamanan/polisi di lapangan sedang berpatroli.
  2. Smartphone petugas bergetar keras; muncul **Push Notification** dari aplikasi **DISGUISE-MOBILE**:  
     `🚨 PERINGATAN: Target DPO Terdeteksi di Sekitar Anda!`
  3. *Screen capture HP:* Petugas membuka aplikasi:
     - Tampil kartu identitas DPO: Nama buronan, pasal kasus kejahatan, dan foto rekonstruksi.
     - Peta taktis menunjukkan lokasi kamera CCTV Tapo tempat target baru saja melintas.
  4. Petugas menekan tombol **"Amankan Target" / "Konfirmasi Lapangan"**.
* **On-Screen Text (Grafis):**  
  `MOBILE DISPATCH: Real-Time Push Notification + Tactical Map Navigation`
* **Narasi Voiceover (VO):**
  > *"Tidak hanya di posko, informasi intelijen langsung diteruskan ke genggaman petugas di lapangan.*  
  > *Melalui aplikasi DISGUISE-MOBILE, petugas patroli menerima notifikasi instan lengkap dengan foto rekonstruksi wajah target, rincian kasus kejahatan, serta navigasi lokasi kamera CCTV untuk tindakan pengamanan cepat dan terukur."*

---

### 🕒 SCENE 7: PENUTUP & KESIMPULAN MASA DEPAN (*CLOSING*)
* **Durasi:** 03:15 – 03:30 (15 Detik)
* **Visual / Shot List:**
  1. Montage cepat: Dari CCTV jalanan, layar server AI GSIVAE yang memproses data, operator command center yang tersenyum puas, hingga petugas lapangan yang sukses mengamankan target.
  2. Logo resmi **DISGUISE-ID** muncul di tengah layar dengan animasi futuristik.
  3. Teks penutup: *"Sistem Pengawasan Cerdas & Resilien Penyamaran untuk Keamanan Masa Depan"*.
* **On-Screen Text (Grafis):**  
  `DISGUISE-ID: Next-Generation Disguise-Resilient Biometric Intelligence`
* **Narasi Voiceover (VO):**
  > *"Menembus penyamaran, menegakkan keadilan. DISGUISE-ID mendefinisikan ulang masa depan sistem keamanan pengawasan cerdas di Indonesia dan dunia.*  
  > *DISGUISE-ID: Intelligence Beyond Disguise."*

---

## 📋 4. Lembar Ceklis Kebutuhan Aset Tim Produksi (*Production Checklist*)

Sebelum shooting dan editing dimulai, pastikan seluruh materi berikut telah siap:

### A. Rekaman Layar (*Screen Recording*) yang Wajib Diambil:
- [ ] **Dashboard Web (`/dashboard/watchlist`)**: Proses klik tambah DPO, isi nama, dan upload 1 foto wajah normal.
- [ ] **Dashboard Web (`/dashboard/monitor`)**: Tampilan live stream CCTV Tapo via WebRTC dengan status kamera online hijau.
- [ ] **Dashboard Web (`/dashboard/alerts`)**: Momen saat pop-up alarm merah muncul dan inspeksi perbandingan 3-Panel ([CCTV] $\to$ [GSIVAE] $\to$ [DPO Asli]).
- [ ] **Aplikasi Mobile (`DISGUISE-MOBILE`)**:
  - Tangkapan layar notifikasi push di lock screen Android.
  - Tampilan tab **Alerts** dengan foto rekonstruksi GSIVAE.
  - Tampilan tab **Map** yang menunjukkan titik lokasi CCTV di peta.

### B. Rekaman Kamera Fisik Lapangan (*B-Roll Footage*):
- [ ] **Kamera CCTV TP-Link Tapo**: Shot close-up bodi kamera, lensa inframerah yang menyala merah saat malam, dan kabel LAN.
- [ ] **Edge Hardware**: Shot mini box Raspberry Pi dan dongle Modem 4G dengan lampu LED berkedip aktif.
- [ ] **Pemeran Target (DPO)**:
  - Berjalan siang hari memakai kacamata hitam pekat (*dark shades*).
  - Berjalan malam hari di depan CCTV dalam kondisi gelap (terekam hitam-putih di CCTV).
- [ ] **Pemeran Petugas Lapangan**: Berjalan membawa smartphone, menerima notifikasi getar, lalu melihat layar HP.

### C. Elemen Grafis & Audio (*Assets & Sound Design*):
- [ ] Diagram animasi arsitektur GSIVAE (disediakan skema dari [about_model.md](file:///home/ichwal/disguise-id-fix/ml-service-v2/weights/about_model.md)).
- [ ] Sound Effect: Suara *glitch/camera shutter*, sirene alarm peringatan taktis, bunyi notifikasi smartphone, dan latar musik bertenaga (*cinematic tech / corporate thriller*).
- [ ] Voiceover profesional dalam bahasa Indonesia yang tegas, percaya diri, dan berartikulasi jelas.

---

## 💡 5. FAQ & Catatan Teknis untuk Kreator Video

* **Tanya: Mengapa kacamata hitam tidak bisa tembus oleh AI biasa, tapi bisa oleh sistem kita?**  
  *Jawab untuk kreator:* Karena AI biasa hanya mencocokkan apa yang terlihat (kacamata hitam dianggap fitur permanen sehingga skor kemiripan anjlok). Model kita (**GSIVAE**) memiliki gerbang (*gate*) yang membuang kacamata tersebut dan "melukis kembali" (*inpainting*) mata manusia yang sesuai dengan struktur wajahnya sebelum dikirim ke mesin pengenal biometrik.
* **Tanya: Berapa skor kemiripan yang harus ditampilkan di layar?**  
  *Jawab untuk grafis:* Tampilkan skor kemiripan **0.320 – 0.380** dengan indikator batas ambang hijau pada angka **$\tau = 0.288$** (Ambang batas ilmiah resmi Disguise-ID). Tuliskan label: `STATUS: VERIFIED MATCH (DISGUISE OVERCOME)`.
* **Tanya: Format rasio video yang disarankan?**  
  * 16:9 (1920x1080 atau 4K 60fps) untuk presentasi dewan penguji, website, dan YouTube.
  * Potongan 9:16 (1080x1920) untuk konten teaser media sosial (TikTok, Instagram Reels, YouTube Shorts).
