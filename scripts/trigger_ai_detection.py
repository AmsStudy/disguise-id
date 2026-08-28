#!/usr/bin/env python3
"""
=============================================================================
DISGUISE-ID — AI DETECTION & REALTIME ALERT TRIGGER (Aan, Ichwal, Raihan, etc.)
=============================================================================
Usage:
    python3 scripts/trigger_ai_detection.py --person "Aan" --score 0.87
    python3 scripts/trigger_ai_detection.py --person "Ichwal" --score 0.96
=============================================================================
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error

CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BOLD = '\033[1m'
RESET = '\033[0m'

DEFAULT_CAMERA_ID = "3cebf033-2d73-4d28-b280-d434307d1f03"
DEFAULT_BACKEND_URL = "http://localhost:3002"
DEFAULT_IOT_KEY = "disguise-iot-secret-key-2026"
DEFAULT_CROP_URL = "http://localhost:9000/cctv-frames/frames/2026/08/27/3bfffb63-12bf-42e1-b523-079a89a375f3.jpg"

def trigger_detection(person_name: str = "Aan", score: float = 0.87, camera_id: str = DEFAULT_CAMERA_ID, crop_url: str = DEFAULT_CROP_URL):
    print(f"\n{CYAN}{BOLD}🚀 [AI TRIGGER] Mengirimkan deteksi DPO: {person_name} (Skor Kemiripan: {score*100:.1f}%)...{RESET}")
    print(f"{CYAN}   - Foto Pembanding Crop: {crop_url}{RESET}")

    url = f"{DEFAULT_BACKEND_URL}/api/v1/camera-agent/trigger-alert"
    payload = {
        "person_name": person_name,
        "similarity": score,
        "face_crop_url": crop_url
    }

    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={
            "Content-Type": "application/json",
            "X-Api-Key": DEFAULT_IOT_KEY
        })
        with urllib.request.urlopen(req, timeout=5.0) as res:
            res_data = json.loads(res.read().decode('utf-8'))
            alert_id = res_data.get("data", {}).get("alert_id")
            person_matched = res_data.get("data", {}).get("person")

            print(f"\n{GREEN}{BOLD}✅ ALERT DPO BERHASIL DIBUAT & DISIARKAN REALTIME!{RESET}")
            print(f"{CYAN}   - Target DPO   : {person_matched} ({score*100:.1f}% Match - CRITICAL){RESET}")
            print(f"{CYAN}   - Alert ID     : {alert_id}{RESET}")
            print(f"{GREEN}   - Web Socket   : Broadcast 'alert:new' & Bounding Box terkirim!{RESET}")
            print(f"\n{YELLOW}📱 Ponsel Android akan otomatis berdering dengan alarm panggilan full-screen!")
            print(f"💻 Monitor Web (http://localhost:3001/dashboard/monitor) menampilkan target DPO & Bounding Box.{RESET}\n")

    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"{RED}❌ Gagal mengirim trigger ({e.code}): {err_msg}{RESET}")
    except Exception as e:
        print(f"{RED}❌ Gagal menghubungkan ke backend: {e}{RESET}")
        print(f"{YELLOW}   Pastikan backend di port 3002 berjalan (npm run dev).{RESET}")

def main():
    parser = argparse.ArgumentParser(description="DISGUISE-ID AI Detection Event Trigger")
    parser.add_argument("--person", type=str, default="Aan", help="Nama target DPO (Aan, Ichwal, Raihan, Rifaldi)")
    parser.add_argument("--score", type=float, default=0.87, help="Skor kemiripan biometrik (default 0.87)")
    parser.add_argument("--camera", type=str, default=DEFAULT_CAMERA_ID, help="UUID ID Kamera")
    parser.add_argument("--crop", type=str, default=DEFAULT_CROP_URL, help="URL Foto crop CCTV pembanding")

    args = parser.parse_args()
    trigger_detection(person_name=args.person, score=args.score, camera_id=args.camera, crop_url=args.crop)

if __name__ == "__main__":
    main()
