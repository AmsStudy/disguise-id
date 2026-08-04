#!/usr/bin/env python3
"""
DISGUISE-ID — Raspberry Pi Multi-Camera Agent v3
=================================================
Perubahan dari v2:
  - Tidak lagi baca CAMERA_SOURCE dari .env (tidak hardcode kamera)
  - Fetch daftar kamera AKTIF dari backend: GET /api/v1/iot/cameras
  - Spawn thread terpisah per kamera secara otomatis
  - Kalau kamera baru ditambahkan di dashboard → Pi otomatis buka stream
  - Kalau kamera dihapus/offline di dashboard → Pi otomatis stop thread
  - Report status kamera ke backend: PATCH /api/v1/iot/cameras/:id/status
  - Setiap kamera punya threshold-nya sendiri (dari response API)
"""

import os, cv2, sys, time, logging, requests, threading
import numpy as np
from datetime import datetime
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

# ── Load .env ─────────────────────────────────────────────────────────
ENV_PATH = '/opt/disguiseid-pi/.env'
load_dotenv(dotenv_path=ENV_PATH)

API_BASE_URL  = os.getenv("API_BASE_URL",  "http://172.125.0.255:3000")
IOT_API_KEY   = os.getenv("IOT_API_KEY",   "disguise-iot-secret-key-2026")
CAMERA_REFRESH_SEC  = int(os.getenv("CAMERA_REFRESH_SEC",  "60"))   # refresh daftar kamera tiap N detik
MIN_FACE_CONFIDENCE = float(os.getenv("MIN_FACE_CONFIDENCE", "0.75"))
SEND_INTERVAL_SEC   = float(os.getenv("SEND_INTERVAL_SEC",  "1.5"))
DEBUG_SAVE_CROPS    = os.getenv("DEBUG_SAVE_CROPS", "false").lower() == "true"
DEBUG_OUTPUT_DIR    = os.getenv("DEBUG_OUTPUT_DIR",  "/tmp/disgid_crops")
MODEL_PATH    = "/opt/disguiseid-pi/yunet.onnx"
FACE_SIZE     = 224
FACE_PAD      = 0.25
SEND_WORKERS  = 8  # max thread kirim (shared semua kamera)

# ── Endpoint URLs ─────────────────────────────────────────────────────
URL_CAMERAS     = f"{API_BASE_URL}/api/v1/iot/cameras"
URL_STATUS      = f"{API_BASE_URL}/api/v1/iot/cameras/{{id}}/status"
URL_INFERENCE   = f"{API_BASE_URL}/api/v1/inference/frame"
HEADERS_IOT     = {"x-api-key": IOT_API_KEY}

# ── Logging ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("disgid-pi")

if DEBUG_SAVE_CROPS:
    os.makedirs(DEBUG_OUTPUT_DIR, exist_ok=True)

# ── Startup info ──────────────────────────────────────────────────────
print("=" * 60)
print("  DISGUISE-ID Multi-Camera Agent v3")
print("=" * 60)
print(f"  Backend  : {API_BASE_URL}")
print(f"  IoT Key  : {IOT_API_KEY[:16]}...")
print(f"  Refresh  : setiap {CAMERA_REFRESH_SEC} detik")
print(f"  Min conf : {MIN_FACE_CONFIDENCE}")
print(f"  Debug    : {'ON → ' + DEBUG_OUTPUT_DIR if DEBUG_SAVE_CROPS else 'OFF'}")
print("=" * 60)

# ── Download / verifikasi model YuNet ─────────────────────────────────
YUNET_URLS = [
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "https://huggingface.co/spaces/asdasdasdasd/Face-forgery-detection/resolve/main/yunet.onnx",
]

def ensure_yunet_model():
    if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 100_000:
        log.info(f"✅ Model YuNet sudah ada: {MODEL_PATH}")
        return True
    log.info("Mendownload model YuNet...")
    for i, url in enumerate(YUNET_URLS, 1):
        try:
            r = requests.get(url, timeout=90, stream=True)
            r.raise_for_status()
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            with open(MODEL_PATH, "wb") as f:
                for chunk in r.iter_content(8192):
                    f.write(chunk)
            size = os.path.getsize(MODEL_PATH) / 1024
            log.info(f"✅ YuNet didownload ({size:.0f} KB)")
            return True
        except Exception as e:
            log.warning(f"URL {i} gagal: {e}")
    log.error("❌ Gagal download YuNet dari semua URL")
    return False

if not ensure_yunet_model():
    sys.exit(1)

# ── Thread pool untuk pengiriman gambar ──────────────────────────────
send_executor = ThreadPoolExecutor(max_workers=SEND_WORKERS, thread_name_prefix="sender")

# ─────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────
def crop_face(frame_bgr, face_row):
    h, w = frame_bgr.shape[:2]
    x, y, fw, fh = int(face_row[0]), int(face_row[1]), int(face_row[2]), int(face_row[3])
    px, py = int(fw * FACE_PAD), int(fh * FACE_PAD)
    x1, y1 = max(0, x - px), max(0, y - py)
    x2, y2 = min(w, x + fw + px), min(h, y + fh + py)
    if (x2 - x1) < 32 or (y2 - y1) < 32:
        return None, None
    crop = cv2.resize(frame_bgr[y1:y2, x1:x2], (FACE_SIZE, FACE_SIZE))
    return crop, {"x": x1, "y": y1, "w": x2-x1, "h": y2-y1, "fw": w, "fh": h}

def to_jpeg(frame_bgr, size=None, quality=88):
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(rgb)
    if size:
        img = img.resize(size, Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, "JPEG", quality=quality)
    return buf.getvalue()

def report_camera_status(camera_id: str, status: str):
    """Kirim status kamera ke backend (online/offline/error)."""
    try:
        url = URL_STATUS.format(id=camera_id)
        r = requests.patch(
            url,
            json={"status": status},
            headers={**HEADERS_IOT, "Content-Type": "application/json"},
            timeout=8,
        )
        if r.status_code in (200, 204):
            log.info(f"📡 [{camera_id[:8]}] Status → {status}")
        else:
            log.warning(f"⚠ Status report {r.status_code}: {r.text[:80]}")
    except Exception as e:
        log.debug(f"Gagal report status: {e}")

def send_inference(camera_info: dict, crop_bgr, frame_bgr, bbox, confidence, detected_at):
    """Kirim crop wajah ke backend inference endpoint."""
    try:
        face_bytes  = to_jpeg(crop_bgr)
        thumb_bytes = to_jpeg(frame_bgr, (320, 240), quality=70)

        r = requests.post(
            URL_INFERENCE,
            files={
                "face_crop":   ("face.jpg",  face_bytes,  "image/jpeg"),
                "frame_thumb": ("thumb.jpg", thumb_bytes, "image/jpeg"),
            },
            data={
                "camera_id":   camera_info["id"],
                "camera_name": camera_info.get("name", ""),
                "detected_at": detected_at.isoformat(),
                "confidence":  str(round(confidence, 4)),
                "bbox_x":  str(bbox["x"]),  "bbox_y":  str(bbox["y"]),
                "bbox_w":  str(bbox["w"]),  "bbox_h":  str(bbox["h"]),
                "frame_w": str(bbox["fw"]), "frame_h": str(bbox["fh"]),
            },
            headers=HEADERS_IOT,
            timeout=10,
        )
        if r.status_code == 202:
            log.info(
                f"✅ [{camera_info['name'][:20]}] "
                f"conf:{confidence:.2f} "
                f"→ {r.status_code} "
                f"({len(face_bytes)//1024}KB)"
            )
        else:
            log.warning(
                f"⚠ [{camera_info['name'][:20]}] "
                f"Backend {r.status_code}: {r.text[:100]}"
            )
    except requests.exceptions.ConnectionError:
        log.error(f"❌ [{camera_info['name'][:20]}] Koneksi ke backend gagal")
    except requests.exceptions.Timeout:
        log.error(f"❌ [{camera_info['name'][:20]}] Timeout kirim ke backend")
    except Exception as e:
        log.error(f"❌ [{camera_info['name'][:20]}] {type(e).__name__}: {e}")


# ─────────────────────────────────────────────────────────────────────
# CAMERA WORKER — satu instance per kamera
# ─────────────────────────────────────────────────────────────────────
class CameraWorker:
    def __init__(self, camera_info: dict):
        self.cam        = camera_info
        self.cam_id     = camera_info["id"]
        self.cam_name   = camera_info.get("name", self.cam_id[:8])
        self.stream_url = camera_info.get("streamUrl", "")

        # YuNet confidence threshold → SELALU dari .env, bukan dari API
        # Field 'threshold' di API adalah nilai Euclidean VAE (3.5-4.5),
        # tidak relevan di Pi dan akan merusak filter YuNet kalau dipakai
        self.yunet_confidence = MIN_FACE_CONFIDENCE

        self._stop_event = threading.Event()
        self._thread     = threading.Thread(
            target=self._run,
            name=f"cam-{self.cam_name[:12]}",
            daemon=True,
        )
        self.logger = logging.getLogger(f"cam.{self.cam_name[:12]}")

    def start(self):
        self._stop_event.clear()
        self._thread.start()
        self.logger.info(f"▶ Worker dimulai → {self.stream_url[:50]}...")

    def stop(self):
        self._stop_event.set()
        self._thread.join(timeout=8)
        self.logger.info("⏹ Worker dihentikan")

    def is_alive(self):
        return self._thread.is_alive()

    def _open_stream(self):
        """Buka RTSP stream dengan backend CAP_FFMPEG + TCP."""
        self.logger.info(f"Membuka stream: {self.stream_url[:55]}...")
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
        cap = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE,    1)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH,   640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT,  480)
        cap.set(cv2.CAP_PROP_FPS,           15)
        if not cap.isOpened():
            cap.release()
            return None
        # Warmup — ambil beberapa frame awal
        for _ in range(3):
            ret, _ = cap.read()
            if ret:
                break
            time.sleep(0.3)
        self.logger.info(
            f"✅ Stream terbuka "
            f"{int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x"
            f"{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}"
        )
        return cap

    def _run(self):
        """Main loop kamera: connect → detect → send → reconnect kalau putus."""

        # Buat detektor YuNet sendiri (tidak shared antar thread)
        try:
            detector = cv2.FaceDetectorYN.create(
                MODEL_PATH, "", (640, 480),
                score_threshold=self.yunet_confidence,
                nms_threshold=0.3,
                top_k=5,
            )
        except Exception as e:
            self.logger.error(f"Gagal init YuNet: {e}")
            return

        last_sent = defaultdict(float)
        frame_n   = 0

        while not self._stop_event.is_set():
            # ── Buka stream ──────────────────────────────────────────
            cap = self._open_stream()
            if cap is None:
                self.logger.warning("❌ Stream tidak bisa dibuka, retry 10 detik...")
                report_camera_status(self.cam_id, "error")
                if self._stop_event.wait(timeout=10):
                    break
                continue

            report_camera_status(self.cam_id, "online")
            consec_fail = 0
            stats = {"det": 0, "sent": 0}
            t_stats = time.time()

            # ── Frame loop ───────────────────────────────────────────
            while not self._stop_event.is_set():
                ret, frame = cap.read()

                if not ret or frame is None:
                    consec_fail += 1
                    if consec_fail >= 5:
                        self.logger.warning(f"Stream putus ({consec_fail}x fail) — reconnect...")
                        report_camera_status(self.cam_id, "error")
                        break
                    time.sleep(0.4)
                    continue

                consec_fail = 0
                frame_n += 1

                # Proses hanya setiap 3 frame
                if frame_n % 3 != 0:
                    continue

                # Stats log setiap 60 detik
                if time.time() - t_stats >= 60:
                    self.logger.info(
                        f"📊 Det:{stats['det']} "
                        f"Sent:{stats['sent']}"
                    )
                    stats["det"] = stats["sent"] = 0
                    t_stats = time.time()

                # ── Deteksi wajah ────────────────────────────────────
                h, w = frame.shape[:2]
                if getattr(self, "_last_shape", None) != (w, h):
                    detector.setInputSize((w, h))
                    self._last_shape = (w, h)
                    self.logger.info(f"📐 YuNet input size disesuaikan ke {w}x{h}")

                try:
                    _, faces = detector.detect(frame)
                except Exception as e:
                    self.logger.error(f"Error deteksi YuNet pada frame ({w}x{h}): {e}")
                    time.sleep(0.5)
                    continue

                if faces is None:
                    continue

                for face in faces:
                    conf = float(face[14])
                    if conf < self.yunet_confidence:
                        continue

                    stats["det"] += 1
                    crop, bbox = crop_face(frame, face)
                    if crop is None:
                        continue

                    # Rate limit per zona posisi wajah
                    # Pakai dimensi frame aktual dari bbox (bukan hardcoded 640x480)
                    zone = (
                        int(face[0] / bbox["fw"] * 4),
                        int(face[1] / bbox["fh"] * 4),
                    )
                    if time.time() - last_sent[zone] < SEND_INTERVAL_SEC:
                        continue
                    last_sent[zone] = time.time()

                    self.logger.info(
                        f"👤 conf:{conf:.3f} "
                        f"pos:({int(face[0])},{int(face[1])}) "
                        f"size:{int(face[2])}x{int(face[3])}px"
                    )

                    if DEBUG_SAVE_CROPS:
                        ts  = datetime.now().strftime("%H%M%S_%f")[:11]
                        pth = f"{DEBUG_OUTPUT_DIR}/{self.cam_name[:8]}_{ts}.jpg"
                        cv2.imwrite(pth, crop)

                    stats["sent"] += 1
                    send_executor.submit(
                        send_inference,
                        self.cam, crop, frame.copy(), bbox, conf, datetime.now()
                    )

            cap.release()
            if not self._stop_event.is_set():
                self.logger.info("Reconnect dalam 5 detik...")
                self._stop_event.wait(timeout=5)

        self.logger.info("Worker selesai")


# ─────────────────────────────────────────────────────────────────────
# CAMERA MANAGER — kelola semua worker kamera
# ─────────────────────────────────────────────────────────────────────
class CameraManager:
    def __init__(self):
        self._workers: dict[str, CameraWorker] = {}
        self._lock = threading.Lock()

    def fetch_cameras(self) -> list:
        """Ambil daftar kamera aktif dari backend."""
        try:
            r = requests.get(URL_CAMERAS, headers=HEADERS_IOT, timeout=10)
            if r.status_code == 200:
                data = r.json()
                cameras = data.get("data", [])
                log.info(f"📋 {len(cameras)} kamera aktif dari backend")
                return cameras
            else:
                log.warning(f"⚠ GET /iot/cameras → {r.status_code}: {r.text[:100]}")
                return []
        except requests.exceptions.ConnectionError:
            log.error(f"❌ Tidak bisa reach backend: {URL_CAMERAS}")
            return []
        except Exception as e:
            log.error(f"❌ Fetch cameras error: {e}")
            return []

    def refresh(self, cameras: list):
        """
        Sinkronisasi workers dengan daftar kamera terbaru:
        - Kamera baru → start worker baru
        - Kamera hilang/offline → stop worker lama
        - Kamera sama → biarkan (tidak restart)
        """
        incoming_ids = {c["id"] for c in cameras if c.get("status") == "online"}

        with self._lock:
            current_ids = set(self._workers.keys())

            # Stop worker untuk kamera yang hilang/offline
            to_stop = current_ids - incoming_ids
            for cam_id in to_stop:
                log.info(f"🔴 Stop worker: {self._workers[cam_id].cam_name}")
                self._workers[cam_id].stop()
                del self._workers[cam_id]

            # Start worker baru untuk kamera yang baru muncul
            for cam in cameras:
                if cam.get("status") != "online":
                    continue
                cam_id = cam["id"]
                if cam_id not in self._workers:
                    if not cam.get("streamUrl"):
                        log.warning(f"⚠ Kamera '{cam.get('name')}' tidak punya streamUrl, dilewati")
                        continue
                    log.info(f"🟢 Start worker: {cam.get('name')} → {cam.get('streamUrl','')[:40]}...")
                    w = CameraWorker(cam)
                    w.start()
                    self._workers[cam_id] = w

            # Cek worker yang mati tak terduga
            dead = [cid for cid, w in self._workers.items() if not w.is_alive()]
            for cid in dead:
                log.warning(f"⚠ Worker mati tak terduga: {self._workers[cid].cam_name} → restart")
                cam_info = self._workers[cid].cam
                del self._workers[cid]
                w = CameraWorker(cam_info)
                w.start()
                self._workers[cid] = w

        if self._workers:
            log.info(f"✅ {len(self._workers)} worker aktif: "
                     f"{[w.cam_name for w in self._workers.values()]}")
        else:
            log.warning("⚠ Tidak ada worker kamera aktif saat ini")

    def stop_all(self):
        with self._lock:
            for w in self._workers.values():
                w.stop()
            self._workers.clear()

    def count(self):
        return len(self._workers)


# ─────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────
def main():
    manager = CameraManager()

    log.info("🚀 Agent dimulai")
    log.info(f"   Backend      : {API_BASE_URL}")
    log.info(f"   Refresh tiap : {CAMERA_REFRESH_SEC} detik")
    log.info("   Tekan Ctrl+C untuk berhenti\n")

    try:
        while True:
            cameras = manager.fetch_cameras()

            if not cameras:
                log.warning(
                    "Tidak ada kamera dari backend. "
                    "Pastikan:\n"
                    f"  1. Backend jalan: curl {API_BASE_URL}/health\n"
                    f"  2. Ada kamera berstatus 'online' di database\n"
                    f"  3. IOT_API_KEY di .env sesuai: {IOT_API_KEY[:16]}..."
                )
            else:
                manager.refresh(cameras)

            # Tunggu sebelum refresh berikutnya
            log.info(f"⏳ Refresh berikutnya dalam {CAMERA_REFRESH_SEC} detik...")
            time.sleep(CAMERA_REFRESH_SEC)

    except KeyboardInterrupt:
        log.info("\n⏹ Dihentikan oleh user (Ctrl+C)")
    finally:
        log.info("Menghentikan semua worker...")
        manager.stop_all()
        send_executor.shutdown(wait=False)
        log.info("Agent selesai.")

if __name__ == "__main__":
    main()