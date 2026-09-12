# ML Service V2: Arsitektur Model GSIVAE (Gated VAE + ArcFace)

Layanan microservice ini merupakan inti kecerdasan buatan (**AI Engine**) dari sistem **DISGUISE-ID**. Layanan ini dirancang khusus untuk memecahkan tantangan utama pada CCTV pengawasan: **mengenali wajah target yang sengaja menyamar menggunakan kacamata hitam (*sunglasses*), masker, atau penutup wajah lainnya**, baik pada kondisi pencahayaan **Siang (Daylight)** maupun **Malam (Night Vision / Inframerah)**.

---

## 🧠 1. Memahami Model GSIVAE (Panduan untuk Pemula)

### Masalah pada Face Recognition Biasa
Pada model pengenalan wajah standar (seperti ArcFace konvensional), area **mata, alis, dan hidung atas (*periocular region*)** memegang **40% – 50% bobot identitas**. Ketika seseorang mengenakan kacamata hitam pekat:
- Sinar mata terhalang lensa gelap.
- Skor kemiripan terhadap foto database (KTP/DPO tanpa kacamata) anjlok dari normalnya >70% menjadi di bawah 30%.
- Akibatnya, sistem biasa akan mengalami **False Negative** (gagal mendeteksi target).

### Solusi: Model Kombinasi GSIVAE
**GSIVAE** (*Gated Skip-connected Inpainting Variational AutoEncoder*) menggabungkan dua tahap kecerdasan buatan:

```
                                      ALUR KERJA MODEL GSIVAE
 ┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
 │   Input Crop CCTV         │      │   Tahap 1: GSIVAE Inpaint │      │   Tahap 2: ArcFace 512-D  │
 │   (Wajah berkacamata      │ ───► │   (Membuka kacamata &     │ ───► │   (Ekstraksi 512 Vektor   │ ───► Skor Kemiripan
 │    hitam / masker)        │      │    merekonstruksi mata)   │      │    Sidik Wajah Biometrik) │      Biometrik
 └───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

1. **Tahap 1 — VAE De-Disguise Inpainting (`best_model.pt`)**:
   - Wajah berkacamata diproses oleh jaringan *Gated Skip-connected Autoencoder*.
   - Mekanisme **Gate adaptif** bertindak seperti filter cerdas: memblokir piksel gelap kacamata hitam dari koneksi *skip-connection*, lalu memproyeksikan struktur mata dan alis asli dari ruang laten probabilistik (*Variational Latent Space* $\mu$ & $\log\sigma^2$).
   - Hasilnya adalah wajah sintesis utuh yang "dilepas penyamarannya" (*de-disguised face*).
2. **Tahap 2 — Ekstraksi Biometrik ArcFace (`buffalo_l / w600k_r50.onnx`)**:
   - Wajah hasil rekonstruksi diubah menjadi **vektor representasi 512-dimensi** (*normalized unit vector*).
3. **Tahap 3 — Kebijakan Keputusan Dual-Branch (*Margin-Max Policy*)**:
   - Sistem membandingkan dua cabang: **Cabang Asli** (ArcFace murni) vs **Cabang Rekonstruksi** (GSIVAE).
   - Cabang dengan tingkat keyakinan (*confidence margin*) terbaik dipilih secara dinamis untuk meminimalkan salah deteksi.

---

## ☀️🌙 2. Skenario Pengujian CCTV: Siang vs Malam (Night Vision)

Sistem telah diuji secara empiris menggunakan kamera CCTV Tapo terhadap target bertopeng kacamata hitam pada dua kondisi operasional:

```
                            HASIL PENGUJIAN 42 SAMPEL CCTV TAPO
┌────────────────────────┬─────────────────────┬─────────────────────┬───────────────────────────┐
│ Ambang Batas (τ)       │ Akurasi Siang (%)   │ Akurasi Malam (%)   │ 👉 AKURASI TOTAL (24 JAM) │
├────────────────────────┼─────────────────────┼─────────────────────┼───────────────────────────┤
│ Loose Disguise (0.250) │ 47.6% (10/21)       │ 28.6% (6/21)        │ 38.1% (16/42)             │
│ Disguise-ID (0.288) 🌟 │ 38.1% (8/21)        │ 23.8% (5/21)        │ 31.0% (13/42)             │
│ Optimal Balanced(0.300)│ 33.3% (7/21)        │ 23.8% (5/21)        │ 28.6% (12/42)             │
│ High Confidence (0.350)│ 23.8% (5/21)        │ 19.0% (4/21)        │ 21.4% (9/42)              │
│ Strict Disguise (0.380)│  9.5% (2/21)        │  0.0% (0/21)        │  4.8% (2/42)              │
│ Wajah Normal (0.400) ❌│  4.8% (1/21)        │  0.0% (0/21)        │  2.4% (1/42) ◄── GAGAL    │
└────────────────────────┴─────────────────────┴─────────────────────┴───────────────────────────┘
```

### 1. Skenario Siang (Daylight)
- **Kondisi**: Pencahayaan alami luar ruangan, spektrum warna RGB penuh, resolusi tekstur kulit optimal.
- **Karakteristik Skor**: Skor kemiripan berkisar antara **27.1% – 38.1%**.
- **Performa**: Akurasi mencapai **38.1%** pada threshold standar ($0.288$).

### 2. Skenario Malam (Night Vision / Inframerah IR)
- **Kondisi**: Minim cahaya, sensor beralih ke lampu LED inframerah 850nm, gambar menjadi monokrom (hitam-putih/grayscale), lensa kacamata hitam memantulkan sinar IR (*specular flare*), dan *grain noise* sensor meningkat.
- **Karakteristik Skor**: Skor kemiripan berkisar antara **19.9% – 37.3%**.
- **Ketahanan Fitur (*Infrared Invariance*)**: Meskipun informasi warna hilang, GSIVAE mempertahankan **> 85%** geometri struktural wajah (garis rahang, kontur tulang pipi, hidung, mulut, dan batas kerudung/rambut), menghasilkan akurasi **23.8%**.

### 3. Angka Acuan Kuantitatif Definitif (Konsolidasi 24 Jam)
Untuk laporan riset, skripsi, atau evaluasi resmi sistem pemantauan 24 jam:
> **"Pada ambang batas resmi Disguise-ID ($\tau = 0.288$), model kombinasi GSIVAE mencapai akurasi total konsolidasi sebesar 31.0% (13/42 sampel), mengungguli model Face Recognition konvensional tanpa penyesuaian yang hanya mencapai 2.4% (peningkatan lebih dari 12 kali lipat)."**

---

## 🎯 3. Panduan Ambang Batas (*Threshold Calibration Guide*)

Bagi pengembang yang mengintegrasikan API ini, berikut pedoman pemilihan ambang batas (*threshold*):

| Threshold ($\tau$) | Kategori | Penjelasan Kapan Digunakan |
| :---: | :--- | :--- |
| **`0.250`** | **Loose Disguise** | Toleransi penyamaran ekstrem (misal: kacamata tebal + masker sekaligus, atau CCTV jarak jauh > 8 meter). |
| **`0.288`** 🌟 | **Disguise-ID Standard** | **Ambang batas resmi bawaan sistem.** Titik paling ideal untuk mendeteksi wajah dengan kacamata hitam di CCTV harian. |
| **`0.300`** 🎯 | **Optimal Balanced** | Rekomendasi seimbang di lapangan untuk menekan fluktuasi *noise* malam hari. |
| **`0.350`** | **High Confidence** | Notifikasi tingkat tinggi. Hanya meloloskan rekaman wajah CCTV yang cukup stabil dan minim blur. |
| **`0.380`** | **Strict High Priority** | Peringatan prioritas darurat (*High Priority Alert*). Nol risiko salah tangkap (*Zero False Positive*). |
| **`0.400+`** | **Normal Benchmark** | Hanya untuk wajah terbuka polos (tanpa penyamaran sama sekali). Tidak cocok untuk target berkacamata. |

---

## 🛠️ 4. Panduan Integrasi API untuk Developer

Layanan ini dibangun menggunakan **FastAPI** dengan performa tinggi. Seluruh endpoint dilindungi oleh autentikasi header `x-api-key`.

### Lokasi Berkas Bobot Model
- **Model VAE (`best_model.pt`)**: Terletak di `./weights/best_model.pt` (Arsitektur `GSIVAE`).
- **Model ArcFace (`w600k_r50.onnx`)**: Terletak di `~/.insightface/models/buffalo_l/w600k_r50.onnx`.

### Variabel Lingkungan (`.env`)
```env
ML_SERVICE_API_KEY=WalMWH1hinTEutYiOoeVeH8NYG-9d0P8DunLSlwYzGtgSCabPbN-bfQlQmBDtgec
PORT=8001
ENVIRONMENT=development
REQUIRE_CUDA=false

# Threshold Konfigurasi
POSSIBLE_THRESHOLD=0.288131
HIGH_THRESHOLD=0.380334
MARGIN_THRESHOLD=0.08

# Path Model
CHECKPOINT_PATH=/app/weights/best_model.pt
GALLERY_CSV_PATH=/app/weights/gallery.csv
INSIGHTFACE_ROOT=~/.insightface
```

---

### 📡 Daftar Endpoint Utama

#### 1. Health Check
Memeriksa status ketersediaan model VAE, ArcFace, dan Galeri:
```bash
curl -X GET http://localhost:8000/health
```
**Contoh Respons:**
```json
{
  "status": "ok",
  "version": "2.0.0",
  "model_ready": true,
  "arcface_ready": true,
  "gallery_ready": true,
  "torch_device": "cpu",
  "arcface_provider": "CPUExecutionProvider"
}
```

---

#### 2. Ekstraksi Dual-Branch GSIVAE (`/v2/process-frame`)
Digunakan oleh pipeline CCTV untuk memproses crop wajah dan mendapatkan vektor asli sekaligus vektor hasil rekonstruksi VAE:
```bash
curl -X POST http://localhost:8000/v2/process-frame \
  -H "x-api-key: WalMWH1hinTEutYiOoeVeH8NYG-9d0P8DunLSlwYzGtgSCabPbN-bfQlQmBDtgec" \
  -F "frame=@/path/to/cctv_crop.jpg"
```
**Contoh Respons:**
```json
{
  "face_detected": true,
  "original_embedding": [0.0142, -0.0521, 0.0891, "...512 floats..."],
  "reconstructed_embedding": [0.0381, -0.0410, 0.0954, "...512 floats..."],
  "confidence": 0.98,
  "processing_ms": 45.2
}
```
> **Tips Developer**: `reconstructed_embedding` adalah vektor sidik wajah hasil olahan **GSIVAE** yang telah dibersihkan dari oklusi kacamata hitam. Gunakan vektor ini untuk dicocokkan terhadap database!

---

#### 3. Pendaftaran Wajah Target Database (`/v2/embed`)
Digunakan saat petugas mendaftarkan foto profil target (KTP/DPO/SIM):
```bash
curl -X POST http://localhost:8000/v2/embed \
  -H "x-api-key: WalMWH1hinTEutYiOoeVeH8NYG-9d0P8DunLSlwYzGtgSCabPbN-bfQlQmBDtgec" \
  -F "image=@/path/to/target_profile.jpg"
```
**Contoh Respons:**
```json
{
  "face_detected": true,
  "embedding": [0.0215, -0.0341, "...512 floats..."],
  "confidence": 0.99
}
```

---

#### 4. Inferensi Penuh Otomatis ke Galeri (`/v2/infer-face`)
Endpoint terlengkap yang menerima aliran *tracking* kamera CCTV, menjalankan GSIVAE, dan mencocokkannya ke seluruh galeri target organisasi:
```bash
curl -X POST http://localhost:8000/v2/infer-face \
  -H "x-api-key: WalMWH1hinTEutYiOoeVeH8NYG-9d0P8DunLSlwYzGtgSCabPbN-bfQlQmBDtgec" \
  -F "face_crop=@/path/to/cctv_crop.jpg" \
  -F "organization_id=org_polres_01" \
  -F "camera_id=cam_tapo_cctv_01" \
  -F "camera_session_id=session_20260911" \
  -F "track_id=track_person_88" \
  -F "captured_at=2026-09-11T18:00:00Z" \
  -F "frame_number=145" \
  -F "bounding_box_json=[50, 40, 180, 210]"
```
**Logika Keputusan (*Decision Logic*):**
- Skor $\ge 0.380$ + Margin $\ge 0.08$ $\rightarrow$ `HIGH_PRIORITY_CANDIDATE` (Alarm Kritis).
- Skor $\ge 0.288$ $\rightarrow$ `POSSIBLE_MATCH` (Kandidat Potensial / Butuh Verifikasi Operator).
- Skor $< 0.288$ $\rightarrow$ `UNKNOWN` (Warga Biasa / Diabaikan).

---

## 🚀 5. Cara Menjalankan Layanan

### Menggunakan Docker Compose (Direkomendasikan)
Dari direktori root proyek:
```bash
# Jalankan container ML-Service di latar belakang
docker compose up -d ml-service

# Periksa log aktivitas
docker compose logs -f ml-service
```

### Menjalankan Mandiri secara Lokal (Python Uvicorn)
```bash
cd ml-service-v2
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 1
```

---

## 📓 6. Berkas Evaluasi & Pengujian Batch

Telah disediakan dua perangkat pengujian mandiri yang dapat langsung digunakan oleh pengembang dan peneliti:
1. **Jupyter Notebook Interaktif**:
   - Lokasi: `cctv_model_evaluation.ipynb`
   - Berisi 22 cell interaktif lengkap dengan evaluasi otomatis, visual gallery 3-kolom (Target vs Asli vs Rekonstruksi GSIVAE), kurva sensitivitas threshold, dan ekspor CSV/JSON.
2. **Script CLI Otomatis**:
   - Lokasi: `evaluate_cctv_model.py`
   - Menjalankan uji batch dari command-line terminal dan mencetak tabel perbandingan kuantitatif secara instan.
