### TASK: Implement Automated Benchmark & Testing Script for Camera Agent Container (RetinaFace Edge Module)

#### 1. Konteks & Arsitektur Sistem:
Modul ini bertindak sebagai representasi dari "Camera Agent" (Edge Node) yang memproses rekaman video CCTV (Tapo C310) per jam secara asinkron/batch. Modul bertugas menjalankan deteksi wajah menggunakan model RetinaFace (sebagaimana arsitektur target di Edge/Raspberry Pi), melakukan kurasi ketajaman menggunakan varians Laplacian, mengekstrak wajah terpilih, serta mencatat metrik kuantitatif secara otomatis ke file CSV/JSON.

#### 2. Kebutuhan Fungsional Skrip Pengujian (`benchmark_camera_agent.py`):
1. **Model Loading & Inisialisasi:**
   - Memuat model RetinaFace (menggunakan backbone MobileNet/ResNet yang ringan dan kompatibel dengan pipeline edge).
   - Mendukung fallback parameter threshold deteksi confidence (default: 0.8 atau 0.9).
   
2. **Video Ingestion & Frame Preprocessing:**
   - Membaca rekaman video CCTV format `.mp4` per jam dari direktori input secara berurutan.
   - Mengimplementasikan `FRAME_INTERVAL` (misal periksa tiap 5 atau 10 frame untuk efisiensi edge).
   - Menyediakan error handling jika terdapat video korup/missing `moov atom`.

3. **Face Detection & Alignment / Cropping:**
   - Melakukan inferensi RetinaFace untuk mendapatkan bounding box `[x1, y1, x2, y2]` dan 5-point facial landmarks.
   - Menambahkan margin/padding proporsional (10-15%) di sekitar bounding box agar kontur dahi, dagu, dan telinga tidak terpotong (krusial untuk tahapan VAE De-Disguise berikutnya).
   - Filter dimensi minimum crop wajah (misal: bounding box minimal 40x40 piksel).

4. **Quality Assessment (Laplacian Blur Filter):**
   - Menghitung varians Laplacian dari citra wajah (grayscale): `cv2.Laplacian(gray_crop, cv2.CV_64F).var()`.
   - Klasifikasikan status: `PASS` jika `score >= LAPLACIAN_THRESHOLD` (misal 60-80), `BLUR` jika di bawah ambang batas.
   - Hanya simpan gambar fisik ke folder `./edge_output_crops/` jika status `PASS`.

5. **Logging & Kuantifikasi Metrik Kinerja (Output CSV):**
   - Catat log per video / per segmen waktu ke dalam berkas `benchmark_results.csv` dengan kolom:
     * `video_name`
     * `total_frames_evaluated`
     * `faces_detected_raw`
     * `faces_passed_laplacian`
     * `faces_dropped_blur`
     * `laplacian_pass_rate_pct`
     * `avg_inference_latency_ms` (rata-rata waktu inferensi RetinaFace per frame)
     * `estimated_fps`

#### 3. Output yang Diharapkan:
- Skrip Python mandiri (`benchmark_camera_agent.py`) yang bersih, modular, dan siap dieksekusi di dalam container/venv.
- Penataan struktur direktori otomatis:
  - `./edge_output_crops/` (penyimpanan citra wajah tajam dengan penamaan: `<video>_f<frame>_idx<face_idx>_lap<score>.jpg`)
  - `./edge_reports/` (penyimpanan file `benchmark_results.csv`).