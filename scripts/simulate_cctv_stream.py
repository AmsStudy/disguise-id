#!/usr/bin/env python3
"""
=============================================================================
DISGUISE-ID - CCTV VIDEO STREAMING & AI SIMULATION TRIGGER
=============================================================================
Trigger script untuk memutar rekaman CCTV lokal ke MediaMTX (WebRTC WHEP)
dan mengirimkan frame ke backend/model AI untuk simulasi monitoring real-time.

File Video Default: stream-record/Highlight_Manusia_CCTV.mp4
MediaMTX RTSP: rtsp://localhost:8554/<camera_id>
WebRTC WHEP (Browser): http://localhost:8889/<camera_id>/whep
=============================================================================
"""

import os
import sys
import time
import signal
import argparse
import subprocess
import threading
import json
import urllib.request
import urllib.parse
from datetime import datetime

# Warna terminal taktis
CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BOLD = '\033[1m'
RESET = '\033[0m'

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_VIDEO_PATH = os.path.join(PROJECT_ROOT, "stream-record", "Highlight_Manusia_CCTV.mp4")

# Kamera default: "Working Space" (Fakultas Ilmu Komputer)
DEFAULT_CAMERA_ID = "3cebf033-2d73-4d28-b280-d434307d1f03"
DEFAULT_CAMERA_NAME = "Working Space (Fakultas Ilmu Komputer)"

DEFAULT_MEDIAMTX_RTSP = "rtsp://localhost:8554"
DEFAULT_MEDIAMTX_WHEP = "http://localhost:8889"
DEFAULT_BACKEND_URL = "http://localhost:3002"
DEFAULT_IOT_KEY = "disguise-iot-secret-key-2026"
PID_FILE = os.path.join(PROJECT_ROOT, "scripts", ".stream_simulator.pid")

# Daftar semua kamera di database
KNOWN_CAMERAS = [
    {"id": "3cebf033-2d73-4d28-b280-d434307d1f03", "name": "Working Space (Fakultas Ilmu Komputer)"},
    {"id": "c2c3b809-1e01-4f22-a379-ca84edef88c1", "name": "FIKOM UMI (Pintu Gerbang)"},
    {"id": "3cd0f0a2-44ae-4538-a26a-210fead217d6", "name": "Ws (Ws1)"}
]

class CCTVStreamSimulator:
    def __init__(self, video_path: str, camera_ids: list, camera_name: str, backend_url: str = DEFAULT_BACKEND_URL):
        self.video_path = video_path
        self.camera_ids = camera_ids if isinstance(camera_ids, list) else [camera_ids]
        self.camera_name = camera_name
        self.backend_url = backend_url.rstrip('/')
        self.processes = []
        self.running = False
        self.start_time = None

    def check_prerequisites(self) -> bool:
        if not os.path.exists(self.video_path):
            print(f"{RED}[ERROR] File video tidak ditemukan: {self.video_path}{RESET}")
            return False
        
        # Check if ffmpeg exists
        try:
            subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        except Exception:
            print(f"{RED}[ERROR] ffmpeg tidak terdeteksi di sistem. Silakan install ffmpeg terlebih dahulu.{RESET}")
            return False

        # Check if MediaMTX is accessible
        try:
            req = urllib.request.Request("http://localhost:9997/v3/paths/list")
            with urllib.request.urlopen(req, timeout=2) as response:
                if response.status == 200:
                    print(f"{GREEN}[OK] MediaMTX Server terhubung di port 8554/8889/9997{RESET}")
        except Exception:
            print(f"{YELLOW}[PERINGATAN] MediaMTX mungkin belum berjalan di http://localhost:9997.{RESET}")
            print(f"{YELLOW}Pastikan container docker berjalan: docker compose up -d mediamtx{RESET}")

        return True

    def start_streaming(self):
        if not self.check_prerequisites():
            return

        self.running = True
        self.start_time = datetime.now()

        # Simpan PID ke file agar bisa di-stop secara mandiri
        with open(PID_FILE, "w") as f:
            f.write(str(os.getpid()))

        print("\n" + "=" * 75)
        print(f"{CYAN}{BOLD}  DISGUISE-ID — CCTV LIVE SIMULATION ENGINE{RESET}")
        print("=" * 75)
        print(f"📹  {BOLD}Sumber Video :{RESET} {self.video_path}")
        for cid in self.camera_ids:
            print(f"📡  {BOLD}Target RTSP  :{RESET} {DEFAULT_MEDIAMTX_RTSP}/{cid}")
            print(f"🌐  {BOLD}WebRTC WHEP  :{RESET} {DEFAULT_MEDIAMTX_WHEP}/{cid}/whep")
        print(f"🎯  {BOLD}Kamera Aktif :{RESET} {self.camera_name}")
        print(f"🖥️  {BOLD}Monitor Web  :{RESET} http://localhost:3001/dashboard/monitor")
        print("=" * 75)
        print(f"{GREEN}{BOLD}[✓] Memulai RTSP Stream ke MediaMTX (Realtime Loop)...{RESET}\n")

        # Spawn FFmpeg process per camera target
        for cid in self.camera_ids:
            rtsp_target = f"{DEFAULT_MEDIAMTX_RTSP}/{cid}"
            ffmpeg_cmd = [
                "ffmpeg",
                "-re",                          # Realtime 1x speed
                "-stream_loop", "-1",           # Loop forever
                "-i", self.video_path,
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-tune", "zerolatency",
                "-b:v", "1800k",
                "-maxrate", "2000k",
                "-bufsize", "3600k",
                "-pix_fmt", "yuv420p",
                "-g", "30",                    # Frequent keyframes for instant WebRTC handshake
                "-an",                         # No audio
                "-f", "rtsp",
                "-rtsp_transport", "tcp",
                rtsp_target
            ]

            proc = subprocess.Popen(
                ffmpeg_cmd,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE
            )
            self.processes.append((proc, cid))

            # Thread monitor
            def monitor_proc(p, name):
                if p.stderr:
                    for line in iter(p.stderr.readline, b''):
                        if not self.running:
                            break
                        err_msg = line.decode('utf-8', errors='ignore')
                        if "Connection refused" in err_msg or "Failed to resolve hostname" in err_msg:
                            print(f"{RED}[FFmpeg Error on {name}] {err_msg.strip()}{RESET}")

            t = threading.Thread(target=monitor_proc, args=(proc, cid), daemon=True)
            t.start()

            # Set camera online via heartbeat
            self.set_camera_online(cid)

        print(f"{GREEN}{BOLD}>> STREAM AKTIF! Buka layar monitor di http://localhost:3001/dashboard/monitor{RESET}")
        print(f"{YELLOW}>> Tekan Ctrl+C atau jalankan 'python3 scripts/simulate_cctv_stream.py --stop' untuk menghentikan.{RESET}\n")

        # Live HUD loop di terminal
        try:
            sec_elapsed = 0
            while self.running:
                # Check if all processes are still alive
                alive = [p for p, _ in self.processes if p.poll() is None]
                if not alive:
                    print(f"\n{RED}[!] Semua proses stream telah terhenti.{RESET}")
                    break

                time.sleep(1)
                sec_elapsed += 1
                mins, secs = divmod(sec_elapsed, 60)
                time_str = f"{mins:02d}:{secs:02d}"
                sys.stdout.write(f"\r{CYAN}[LIVE STREAMING]{RESET} Durasi: {BOLD}{time_str}{RESET} | Status: {GREEN}ONLINE{RESET} | MediaMTX WHEP: {GREEN}BROADCASTING ({len(self.camera_ids)} Cam){RESET}   ")
                sys.stdout.flush()
        except KeyboardInterrupt:
            print(f"\n\n{YELLOW}[!] Sinyal henti diterima. Menghentikan stream...{RESET}")
        finally:
            self.stop()

    def set_camera_online(self, cam_id: str):
        try:
            url = f"{self.backend_url}/api/v1/camera-agent/heartbeat"
            data = json.dumps({
                "camera_id": cam_id,
                "status": "online",
                "fps": 15,
                "uptime": 100
            }).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={
                "Content-Type": "application/json",
                "X-Api-Key": DEFAULT_IOT_KEY
            })
            with urllib.request.urlopen(req, timeout=1.5) as res:
                pass
        except Exception:
            pass

    def stop(self):
        self.running = False
        for proc, _ in self.processes:
            try:
                proc.terminate()
                proc.wait(timeout=2)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        self.processes.clear()

        if os.path.exists(PID_FILE):
            try:
                os.remove(PID_FILE)
            except Exception:
                pass

        print(f"\n{GREEN}[✓] Simulasi CCTV Stream berhasil dihentikan dengan aman.{RESET}")

def stop_existing_simulation():
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE, "r") as f:
                pid = int(f.read().strip())
            os.kill(pid, signal.SIGTERM)
            os.remove(PID_FILE)
            print(f"{GREEN}[✓] Simulasi aktif (PID {pid}) berhasil dihentikan.{RESET}")
        except ProcessLookupError:
            if os.path.exists(PID_FILE):
                os.remove(PID_FILE)
        except Exception as e:
            print(f"{YELLOW}[!] Tidak dapat menghentikan PID lama: {e}{RESET}")
    
    # Hentikan semua proses ffmpeg stream rtsp localhost:8554 jika ada
    try:
        subprocess.run(["pkill", "-f", "rtsp://localhost:8554"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"{GREEN}[✓] Semua stream ffmpeg ke localhost:8554 telah dibersihkan.{RESET}")
    except Exception:
        pass
    return True

def main():
    parser = argparse.ArgumentParser(description="DISGUISE-ID CCTV Stream Simulator Trigger")
    parser.add_argument("--start", action="store_true", help="Mulai live streaming video CCTV ke MediaMTX")
    parser.add_argument("--all", action="store_true", help="Stream ke SEMUA kamera sekaligus")
    parser.add_argument("--stop", action="store_true", help="Hentikan live streaming simulasi yang sedang berjalan")
    parser.add_argument("--video", type=str, default=DEFAULT_VIDEO_PATH, help="Path ke file video MP4")
    parser.add_argument("--camera", type=str, default=DEFAULT_CAMERA_ID, help="UUID ID Kamera target")
    parser.add_argument("--name", type=str, default=DEFAULT_CAMERA_NAME, help="Nama label kamera")

    args = parser.parse_args()

    if args.stop:
        stop_existing_simulation()
        return

    if args.start or args.all:
        stop_existing_simulation()
        if args.all:
            cam_ids = [c["id"] for c in KNOWN_CAMERAS]
            cam_name = "Semua Kamera (Working Space, FIKOM UMI, Ws)"
        else:
            cam_ids = [args.camera]
            cam_name = args.name

        simulator = CCTVStreamSimulator(
            video_path=args.video,
            camera_ids=cam_ids,
            camera_name=cam_name
        )
        simulator.start_streaming()
        return

    # Mode Interaktif (Bila dijalankan tanpa flag)
    print("\n" + "=" * 68)
    print(f"{CYAN}{BOLD}   DISGUISE-ID — CCTV SIMULATION TRIGGER CONTROLLER{RESET}")
    print("=" * 68)
    print(f" 1. Stream ke {BOLD}Working Space{RESET} (Default di Monitor)")
    print(f" 2. Stream ke {BOLD}Semua Kamera{RESET} Sekaligus (3 Kamera)")
    print(" 3. Hentikan Stream yang sedang berjalan")
    print(" 4. Keluar")
    print("=" * 68)

    choice = input("\nPilih opsi [1-4] (Default: 1): ").strip()
    if choice == "2":
        stop_existing_simulation()
        cam_ids = [c["id"] for c in KNOWN_CAMERAS]
        simulator = CCTVStreamSimulator(video_path=args.video, camera_ids=cam_ids, camera_name="Semua Kamera")
        simulator.start_streaming()
    elif choice == "3":
        stop_existing_simulation()
    elif choice == "4":
        print("Batal.")
    else:
        stop_existing_simulation()
        simulator = CCTVStreamSimulator(
            video_path=args.video,
            camera_ids=[DEFAULT_CAMERA_ID],
            camera_name=DEFAULT_CAMERA_NAME
        )
        simulator.start_streaming()

if __name__ == "__main__":
    main()
