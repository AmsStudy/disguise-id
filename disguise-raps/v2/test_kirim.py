#!/usr/bin/env python3
"""
DISGUISE-ID — Test Koneksi Pi (v3, Multi-Camera)
=================================================
Cara pakai:
  source ~/disguiseid-venv/bin/activate
  python3 /opt/disguiseid-pi/test_kirim.py
"""

import os, cv2, sys, time, json, requests
from datetime import datetime
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv

G="\033[92m"; R="\033[91m"; Y="\033[93m"; B="\033[94m"; W="\033[97m"; NC="\033[0m"

def ok(m):   print(f"{G}✅  {m}{NC}")
def err(m):  print(f"{R}❌  {m}{NC}")
def warn(m): print(f"{Y}⚠️   {m}{NC}")
def info(m): print(f"    {m}")
def step(n, t): print(f"\n{B}{'─'*58}\n  TEST {n} — {t}\n{'─'*58}{NC}")

# ── Load config ───────────────────────────────────────────────────────
ENV_PATH = '/opt/disguiseid-pi/.env'
if not os.path.exists(ENV_PATH):
    print(f"{R}❌ .env tidak ada: {ENV_PATH}{NC}")
    sys.exit(1)

load_dotenv(dotenv_path=ENV_PATH)

API_BASE_URL = os.getenv("API_BASE_URL", "http://172.125.0.255:3000")
IOT_API_KEY  = os.getenv("IOT_API_KEY",  "disguise-iot-secret-key-2026")
HEADERS_IOT  = {"x-api-key": IOT_API_KEY}

print(f"\n{W}{'='*58}")
print("  DISGUISE-ID Test Koneksi v3 (Multi-Camera)")
print(f"{'='*58}{NC}")
info(f"Backend : {API_BASE_URL}")
info(f"IoT Key : {IOT_API_KEY[:20]}...")

results = {}
test_camera = None  # kamera pertama dari API, dipakai untuk test kirim

# ── TEST 1: Internet ──────────────────────────────────────────────────
step(1, "Koneksi internet")
try:
    requests.get("https://1.1.1.1", timeout=5)
    ok("Internet aktif")
    results[1] = True
except:
    warn("Tidak ada internet (mungkin hanya jaringan lokal — lanjut)")
    results[1] = None

# ── TEST 2: Backend health ────────────────────────────────────────────
step(2, f"Backend health ({API_BASE_URL}/health)")
try:
    r = requests.get(f"{API_BASE_URL}/health", timeout=10)
    ok(f"HTTP {r.status_code}")
    try:
        body = r.json()
        status = body.get("status") or body.get("data", {}).get("status", "?")
        info(f"Status  : {status}")
    except:
        info(f"Body: {r.text[:150]}")
    results[2] = r.status_code < 400
except requests.exceptions.ConnectionError:
    err(f"Tidak bisa reach {API_BASE_URL}")
    info(f"Cek: docker ps | grep backend")
    info(f"Cek IP laptop: ip addr | grep inet | grep 172")
    results[2] = False
    print(f"\n{R}Backend tidak tersedia — test berhenti{NC}")
    sys.exit(1)
except Exception as e:
    err(str(e)); results[2] = False; sys.exit(1)

# ── TEST 3: GET /api/v1/iot/cameras ──────────────────────────────────
step(3, "Fetch daftar kamera (GET /api/v1/iot/cameras)")
info(f"URL: {API_BASE_URL}/api/v1/iot/cameras")
info(f"Key: x-api-key: {IOT_API_KEY[:20]}...")
try:
    r = requests.get(f"{API_BASE_URL}/api/v1/iot/cameras",
                     headers=HEADERS_IOT, timeout=10)
    info(f"HTTP Status: {r.status_code}")
    if r.status_code == 200:
        body = r.json()
        cameras = body.get("data", [])
        ok(f"{len(cameras)} kamera ditemukan")
        for i, cam in enumerate(cameras):
            status_icon = "🟢" if cam.get("status") == "online" else "🔴"
            info(f"  {status_icon} [{i+1}] {cam.get('name','?')}")
            info(f"       IP      : {cam.get('ipAddress','?')}")
            info(f"       Stream  : {cam.get('streamUrl','?')[:50]}...")
            info(f"       Threshold: {cam.get('threshold','?')}")
            info(f"       Status  : {cam.get('status','?')}")
        online = [c for c in cameras if c.get("status") == "online"]
        test_camera = online[0] if online else (cameras[0] if cameras else None)
        results[3] = True
    elif r.status_code == 401:
        err(f"API Key ditolak (401)")
        info(f"Pastikan IOT_API_KEY di .env = '{IOT_API_KEY}'")
        info(f"Dan backend menerima key ini di endpoint /api/v1/iot/cameras")
        results[3] = False
    elif r.status_code == 404:
        err(f"Endpoint tidak ditemukan (404)")
        info("Endpoint GET /api/v1/iot/cameras belum dibuat di backend")
        results[3] = False
    else:
        warn(f"HTTP {r.status_code}: {r.text[:200]}")
        results[3] = False
except Exception as e:
    err(f"{type(e).__name__}: {e}"); results[3] = False

# ── TEST 4: RTSP stream (dari kamera pertama) ─────────────────────────
step(4, "Buka RTSP stream dari kamera pertama")
frame_bgr = None

if not test_camera:
    warn("Tidak ada kamera dari API — skip test RTSP")
    results[4] = None
else:
    stream_url = test_camera.get("streamUrl", "")
    cam_name   = test_camera.get("name", "?")
    info(f"Kamera : {cam_name}")
    info(f"Stream : {stream_url[:55]}...")
    try:
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
        cap = cv2.VideoCapture(stream_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        if not cap.isOpened():
            err("Stream tidak bisa dibuka")
            info("Cek: username/password kamera dan IP address benar")
            results[4] = False
        else:
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            ok(f"Stream terbuka: {w}x{h}")
            # Ambil frame
            for i in range(8):
                ret, frame_bgr = cap.read()
                if ret and frame_bgr is not None:
                    break
                time.sleep(0.5)
            cap.release()
            if frame_bgr is not None:
                cv2.imwrite("/tmp/test_rtsp_frame.jpg", frame_bgr)
                ok(f"Frame berhasil diambil: {frame_bgr.shape[1]}x{frame_bgr.shape[0]}px")
                info("Disimpan ke: /tmp/test_rtsp_frame.jpg")
                results[4] = True
            else:
                warn("Stream terbuka tapi gagal ambil frame")
                results[4] = False
    except Exception as e:
        err(f"{type(e).__name__}: {e}"); results[4] = False

# ── TEST 5: Kirim gambar ke inference endpoint ────────────────────────
step(5, f"Kirim ke POST {API_BASE_URL}/api/v1/inference/frame")

if frame_bgr is None:
    warn("Tidak ada frame dari kamera — pakai dummy frame")
    import numpy as np
    frame_bgr = np.zeros((480, 640, 3), dtype=np.uint8)
    frame_bgr[:] = (30, 30, 60)
    cv2.putText(frame_bgr, "DUMMY", (200, 240),
                cv2.FONT_HERSHEY_SIMPLEX, 3, (0, 200, 200), 4)

try:
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(rgb)
    buf = BytesIO()
    img.resize((224, 224)).save(buf, "JPEG", quality=88)
    jpeg_bytes = buf.getvalue()
    with open("/tmp/test_crop_send.jpg", "wb") as f:
        f.write(jpeg_bytes)
    ok(f"JPEG siap: {len(jpeg_bytes)//1024} KB (224x224)")
except Exception as e:
    err(f"Konversi gagal: {e}"); results[5] = False

camera_id = test_camera["id"] if test_camera else "test-camera-id"

try:
    t0 = time.time()
    r  = requests.post(
        f"{API_BASE_URL}/api/v1/inference/frame",
        files={
            "face_crop":   ("face.jpg", jpeg_bytes, "image/jpeg"),
            "frame_thumb": ("thumb.jpg", jpeg_bytes, "image/jpeg"),
        },
        data={
            "camera_id":   camera_id,
            "detected_at": datetime.now().isoformat(),
            "confidence":  "0.91",
            "bbox_x": "100", "bbox_y": "80",
            "bbox_w": "224", "bbox_h": "224",
            "frame_w": "640", "frame_h": "480",
        },
        headers=HEADERS_IOT,
        timeout=15,
    )
    ms = int((time.time() - t0) * 1000)
    info(f"HTTP Status : {r.status_code} ({ms}ms)")
    try:
        info(f"Response    : {json.dumps(r.json(), ensure_ascii=False)[:350]}")
    except:
        info(f"Response    : {r.text[:200]}")

    if r.status_code == 202:
        ok("SUKSES — Backend terima frame (202 Accepted)")
        results[5] = True
    elif r.status_code == 401:
        err("401 — API key ditolak"); results[5] = False
    elif r.status_code == 404:
        err("404 — Endpoint inference belum ada di backend"); results[5] = False
    else:
        warn(f"HTTP {r.status_code}"); results[5] = False
except Exception as e:
    err(f"{type(e).__name__}: {e}"); results[5] = False

# ── TEST 6: PATCH status kamera ───────────────────────────────────────
step(6, "Report status kamera (PATCH /api/v1/iot/cameras/:id/status)")
if not test_camera:
    warn("Tidak ada kamera — skip"); results[6] = None
else:
    cam_id  = test_camera["id"]
    patch_url = f"{API_BASE_URL}/api/v1/iot/cameras/{cam_id}/status"
    info(f"URL: {patch_url}")
    try:
        r = requests.patch(
            patch_url,
            json={"status": "online"},
            headers={**HEADERS_IOT, "Content-Type": "application/json"},
            timeout=8,
        )
        info(f"HTTP Status: {r.status_code}")
        if r.status_code in (200, 204):
            ok("Status berhasil diupdate ke 'online'")
            results[6] = True
        elif r.status_code == 404:
            err("404 — Endpoint PATCH /iot/cameras/:id/status belum ada")
            results[6] = False
        else:
            warn(f"HTTP {r.status_code}: {r.text[:100]}")
            results[6] = False
    except Exception as e:
        err(f"{type(e).__name__}: {e}"); results[6] = False

# ── RINGKASAN ─────────────────────────────────────────────────────────
labels = {
    1: "Internet",
    2: "Backend health",
    3: "GET /iot/cameras — fetch daftar kamera",
    4: "RTSP stream kamera pertama",
    5: "POST /inference/frame — kirim gambar",
    6: "PATCH /iot/cameras/:id/status — report status",
}
passed  = sum(1 for v in results.values() if v is True)
failed  = sum(1 for v in results.values() if v is False)
skipped = sum(1 for v in results.values() if v is None)

print(f"\n{W}{'='*58}")
print(f"  RINGKASAN: {passed} pass · {failed} fail · {skipped} skip")
print(f"{'='*58}{NC}")
for n, v in sorted(results.items()):
    if v is True:    icon = f"{G}✅ PASS{NC}"
    elif v is False: icon = f"{R}❌ FAIL{NC}"
    else:            icon = f"{Y}⏭ SKIP{NC}"
    print(f"  {icon}  {labels.get(n,'')}")

print()
if failed == 0:
    print(f"{G}🎉 Semua test berhasil!{NC}")
    print("   Jalankan agent utama:")
    print("   python3 /opt/disguiseid-pi/disguiseid_capture.py")
else:
    print(f"{Y}🔧 Perbaiki test yang gagal dulu{NC}")
    if not results.get(3):
        print("   → Buat endpoint GET /api/v1/iot/cameras di backend")
    if not results.get(4):
        print("   → Cek RTSP credentials dan IP kamera Tapo")
    if not results.get(5):
        print("   → Buat endpoint POST /api/v1/inference/frame di backend")
    if not results.get(6):
        print("   → Buat endpoint PATCH /api/v1/iot/cameras/:id/status di backend")
print()
print("File untuk dicek:")
if results.get(4): print("  /tmp/test_rtsp_frame.jpg   → frame dari kamera")
print("  /tmp/test_crop_send.jpg    → crop yang dikirim ke backend")
