#!/usr/bin/env python3
"""
DISGUISE-ID — Raspberry Pi Capture Agent v2 (YuNet, fixed)
===========================================================
FIX dari versi sebelumnya:
  - RTSP pakai CAP_FFMPEG + TCP transport (lebih stabil)
  - Reconnect benar-benar buat VideoCapture baru (bukan hanya continue)
  - Thread pool dibatasi 4 worker (cegah banjir thread)
  - Download YuNet dengan retry + 2 fallback URL
  - Stats log setiap 30 detik (FPS, deteksi, kirim)
  - Verbose debug: print frame shape dan confidence setiap deteksi
"""

import os, cv2, time, logging, requests, sys
import numpy as np
from datetime import datetime
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

# ── Load .env ─────────────────────────────────────────────────────────
ENV_PATH = '/opt/disguiseid-pi/.env'
if not os.path.exists(ENV_PATH):
    print(f"[FATAL] File .env tidak ditemukan: {ENV_PATH}")
    print("        Buat dulu: nano /opt/disguiseid-pi/.env")
    sys.exit(1)

load_dotenv(dotenv_path=ENV_PATH)

CAMERA_API_KEY      = os.getenv("CAMERA_API_KEY", "test-key")
API_BASE_URL        = os.getenv("API_BASE_URL", "http://172.125.0.255:3000")
CAMERA_SOURCE       = os.getenv("CAMERA_SOURCE", "0")
SEND_INTERVAL_SEC   = float(os.getenv("SEND_INTERVAL_SEC", "1.5"))
MIN_FACE_CONFIDENCE = float(os.getenv("MIN_FACE_CONFIDENCE", "0.75"))
FRAME_WIDTH         = int(os.getenv("FRAME_WIDTH", "640"))
FRAME_HEIGHT        = int(os.getenv("FRAME_HEIGHT", "480"))
DEBUG_SAVE_CROPS    = os.getenv("DEBUG_SAVE_CROPS", "true").lower() == "true"
DEBUG_OUTPUT_DIR    = os.getenv("DEBUG_OUTPUT_DIR", "/tmp/disgid_crops")

INFERENCE_URL = f"{API_BASE_URL}/api/v1/inference/frame"
MODEL_PATH    = "/opt/disguiseid-pi/yunet.onnx"
FACE_SIZE     = 224
FACE_PAD      = 0.25
MAX_WORKERS   = 4   # batas thread kirim (cegah banjir)

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("disgid-pi")

# ── Tampilkan konfigurasi saat startup ───────────────────────────────
print("=" * 55)
print("  DISGUISE-ID Pi Agent v2")
print("=" * 55)
print(f"  API URL  : {API_BASE_URL}")
print(f"  Kamera   : {CAMERA_SOURCE}")
print(f"  Resolusi : {FRAME_WIDTH}x{FRAME_HEIGHT}")
print(f"  Min conf : {MIN_FACE_CONFIDENCE}")
print(f"  Interval : {SEND_INTERVAL_SEC}s")
print(f"  Debug    : {'ON → ' + DEBUG_OUTPUT_DIR if DEBUG_SAVE_CROPS else 'OFF'}")
print("=" * 55)

if DEBUG_SAVE_CROPS:
    os.makedirs(DEBUG_OUTPUT_DIR, exist_ok=True)

# ── Download model YuNet dengan retry ────────────────────────────────
YUNET_URLS = [
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "https://raw.githubusercontent.com/ShiqiYu/libfacedetection/master/models/yunet.onnx",
]

def download_yunet():
    for i, url in enumerate(YUNET_URLS, 1):
        try:
            log.info(f"Download YuNet (attempt {i}/{len(YUNET_URLS)}): {url[:60]}...")
            r = requests.get(url, timeout=60, stream=True)
            r.raise_for_status()
            with open(MODEL_PATH, "wb") as f:
                for chunk in r.iter_content(8192):
                    f.write(chunk)
            size_kb = os.path.getsize(MODEL_PATH) / 1024
            log.info(f"✅ YuNet didownload ({size_kb:.0f} KB)")
            return True
        except Exception as e:
            log.warning(f"Gagal dari URL {i}: {e}")
    return False

if not os.path.exists(MODEL_PATH):
    if not download_yunet():
        log.error("❌ Gagal download model YuNet dari semua URL")
        log.error("   Coba download manual:")
        log.error(f"   wget -O {MODEL_PATH} '{YUNET_URLS[0]}'")
        sys.exit(1)

# Verifikasi file model tidak kosong
if os.path.getsize(MODEL_PATH) < 1000:
    log.error(f"❌ File model corrupt/kosong: {MODEL_PATH}")
    os.remove(MODEL_PATH)
    sys.exit(1)

# ── Init YuNet detector ───────────────────────────────────────────────
try:
    detector = cv2.FaceDetectorYN.create(
        MODEL_PATH, "",
        (FRAME_WIDTH, FRAME_HEIGHT),
        score_threshold=MIN_FACE_CONFIDENCE,
        nms_threshold=0.3,
        top_k=5,
    )
    log.info("✅ YuNet detector siap")
except Exception as e:
    log.error(f"❌ Gagal init YuNet: {e}")
    log.error("   Hapus model lalu coba lagi: rm /opt/disguiseid-pi/yunet.onnx")
    sys.exit(1)

# ── Thread pool untuk kirim (dibatasi MAX_WORKERS) ───────────────────
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="sender")

# ── Helpers ───────────────────────────────────────────────────────────
def crop_face(frame_bgr, face):
    """Crop wajah dari frame dengan padding."""
    h, w = frame_bgr.shape[:2]
    x, y, fw, fh = int(face[0]), int(face[1]), int(face[2]), int(face[3])
    px, py = int(fw * FACE_PAD), int(fh * FACE_PAD)
    x1, y1 = max(0, x - px), max(0, y - py)
    x2, y2 = min(w, x + fw + px), min(h, y + fh + py)
    if (x2 - x1) < 40 or (y2 - y1) < 40:
        return None, None
    crop = cv2.resize(frame_bgr[y1:y2, x1:x2], (FACE_SIZE, FACE_SIZE))
    return crop, {"x": x1, "y": y1, "w": x2-x1, "h": y2-y1, "fw": w, "fh": h}

def to_jpeg(frame_bgr, size=None, quality=88):
    """Konversi BGR frame ke bytes JPEG."""
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(rgb)
    if size:
        img = img.resize(size, Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, "JPEG", quality=quality)
    return buf.getvalue()

def send_to_cloud(crop_bgr, frame_bgr, bbox, confidence, detected_at):
    """Kirim crop wajah ke backend. Dijalankan di thread terpisah."""
    t0 = time.time()
    try:
        face_bytes  = to_jpeg(crop_bgr)
        thumb_bytes = to_jpeg(frame_bgr, (320, 240), quality=70)

        r = requests.post(
            INFERENCE_URL,
            files={
                "face_crop":   ("face.jpg",  face_bytes,  "image/jpeg"),
                "frame_thumb": ("thumb.jpg", thumb_bytes, "image/jpeg"),
            },
            data={
                "detected_at": detected_at.isoformat(),
                "confidence":  str(round(confidence, 4)),
                "bbox_x":  str(bbox["x"]),  "bbox_y":  str(bbox["y"]),
                "bbox_w":  str(bbox["w"]),  "bbox_h":  str(bbox["h"]),
                "frame_w": str(bbox["fw"]), "frame_h": str(bbox["fh"]),
            },
            headers={"X-Api-Key": CAMERA_API_KEY},
            timeout=10,
        )
        ms = int((time.time() - t0) * 1000)
        if r.status_code == 202:
            log.info(f"✅ Terkirim → {r.status_code} ({ms}ms) "
                     f"| face:{len(face_bytes)//1024}KB")
        else:
            log.warning(f"⚠ Backend {r.status_code} ({ms}ms): {r.text[:120]}")
    except requests.exceptions.ConnectionError:
        log.error(f"❌ Koneksi gagal ke {API_BASE_URL} — cek IP laptop dan port 3000")
    except requests.exceptions.Timeout:
        log.error("❌ Timeout — backend tidak merespons dalam 10 detik")
    except Exception as e:
        log.error(f"❌ Error kirim: {type(e).__name__}: {e}")

def open_camera(source_str: str):
    """
    Buka kamera dari string source.
    Untuk RTSP: pakai CAP_FFMPEG + set TCP transport (lebih stabil dari UDP).
    Untuk USB: pakai index integer.
    """
    try:
        src = int(source_str)
        log.info(f"Membuka USB kamera index {src}...")
        cap = cv2.VideoCapture(src)
    except ValueError:
        # RTSP / URL
        src = source_str
        log.info(f"Membuka RTSP stream...")
        log.info(f"  URL: {src[:60]}...")
        # CAP_FFMPEG + TCP transport = lebih stabil untuk IP camera
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
        cap = cv2.VideoCapture(src, cv2.CAP_FFMPEG)

    # Set properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
    cap.set(cv2.CAP_PROP_FPS, 15)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # buffer kecil = frame lebih fresh

    if not cap.isOpened():
        return None

    # Coba ambil frame pertama untuk konfirmasi
    ret, _ = cap.read()
    if not ret:
        cap.release()
        return None

    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    log.info(f"✅ Kamera terbuka: {actual_w}x{actual_h}")
    return cap

# ── Main loop ─────────────────────────────────────────────────────────
def main():
    last_sent = defaultdict(float)
    stats = {
        "frames": 0, "detected": 0,
        "sent": 0, "errors": 0,
        "t_start": time.time(),
    }

    log.info(f"Target inference: {INFERENCE_URL}")
    log.info("Tekan Ctrl+C untuk berhenti\n")

    # Retry loop — reconnect kalau kamera putus
    while True:
        cap = open_camera(CAMERA_SOURCE)
        if cap is None:
            log.error(f"❌ Kamera tidak bisa dibuka: {CAMERA_SOURCE}")
            log.info("   Retry dalam 5 detik...")
            time.sleep(5)
            continue

        consecutive_fails = 0  # hitung berapa kali berturut-turut gagal baca frame
        frame_n = 0

        try:
            while True:
                ret, frame = cap.read()

                if not ret or frame is None:
                    consecutive_fails += 1
                    log.warning(f"Frame kosong ({consecutive_fails}/5)...")
                    time.sleep(0.5)
                    if consecutive_fails >= 5:
                        log.warning("Terlalu banyak frame kosong — reconnect...")
                        break   # keluar dari inner loop → reconnect
                    continue

                consecutive_fails = 0
                frame_n += 1
                stats["frames"] += 1

                # Proses hanya setiap 3 frame (hemat CPU)
                if frame_n % 3 != 0:
                    continue

                # Stats log setiap 30 detik
                elapsed = time.time() - stats["t_start"]
                if elapsed > 0 and int(elapsed) % 30 == 0 and stats["frames"] > 0:
                    fps = stats["frames"] / elapsed
                    log.info(
                        f"📊 Stats | FPS:{fps:.1f} "
                        f"| Deteksi:{stats['detected']} "
                        f"| Terkirim:{stats['sent']} "
                        f"| Error:{stats['errors']}"
                    )

                # ── Deteksi wajah ─────────────────────────────────────
                h, w = frame.shape[:2]
                if stats.get("last_shape") != (w, h):
                    detector.setInputSize((w, h))
                    stats["last_shape"] = (w, h)
                    log.info(f"📐 YuNet input size disesuaikan ke {w}x{h}")

                try:
                    _, faces = detector.detect(frame)
                except Exception as e:
                    log.error(f"Error deteksi: {e}")
                    continue

                if faces is None:
                    continue

                for face in faces:
                    confidence = float(face[14])
                    if confidence < MIN_FACE_CONFIDENCE:
                        continue

                    stats["detected"] += 1
                    crop, bbox = crop_face(frame, face)
                    if crop is None:
                        continue

                    # Rate limiting per zona (grid 4x4)
                    zone = (
                        int(face[0] / FRAME_WIDTH  * 4),
                        int(face[1] / FRAME_HEIGHT * 4),
                    )
                    if time.time() - last_sent[zone] < SEND_INTERVAL_SEC:
                        continue
                    last_sent[zone] = time.time()

                    now = datetime.now()
                    log.info(
                        f"👤 Wajah | conf:{confidence:.3f} "
                        f"| pos:({bbox['x']},{bbox['y']}) "
                        f"| size:{bbox['w']}x{bbox['h']}px"
                    )

                    # Simpan crop untuk debug
                    if DEBUG_SAVE_CROPS:
                        ts = now.strftime("%H%M%S_%f")[:11]
                        save_path = f"{DEBUG_OUTPUT_DIR}/crop_{ts}_c{confidence:.2f}.jpg"
                        cv2.imwrite(save_path, crop)
                        log.debug(f"   Debug crop: {save_path}")

                    # Kirim via thread pool (non-blocking)
                    stats["sent"] += 1
                    executor.submit(
                        send_to_cloud,
                        crop, frame.copy(), bbox, confidence, now
                    )

        except KeyboardInterrupt:
            log.info("\nDihentikan oleh user (Ctrl+C)")
            break
        finally:
            cap.release()
            log.info("Kamera ditutup")

        log.info("Reconnect dalam 3 detik...")
        time.sleep(3)

    executor.shutdown(wait=False)
    log.info("Agent selesai")

if __name__ == "__main__":
    main()