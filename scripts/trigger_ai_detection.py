#!/usr/bin/env python3
"""
=============================================================================
DISGUISE-ID — AI DETECTION & ALERT EVENT TRIGGER
=============================================================================
Script ini mengirimkan trigger deteksi wajah DPO ke backend agar muncul
notifikasi Alert, skor kemiripan, dan Bounding Box di layar Monitor Web & Mobile.
=============================================================================
"""

import os
import sys
import time
import uuid
import json
import argparse
import subprocess
import urllib.request
from datetime import datetime

# Warna terminal
CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BOLD = '\033[1m'
RESET = '\033[0m'

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CAMERA_ID = "3cebf033-2d73-4d28-b280-d434307d1f03"
DEFAULT_BACKEND_URL = "http://localhost:3002"
DEFAULT_IOT_KEY = "disguise-iot-secret-key-2026"

def trigger_mock_detection(person_name: str = "Ichwal", similarity: float = 0.914, camera_id: str = DEFAULT_CAMERA_ID):
    """
    Mengirimkan event deteksi langsung via backend API / WebSocket untuk demonstrasi real-time.
    """
    print(f"\n{CYAN}{BOLD}[AI TRIGGER] Mengirimkan deteksi DPO: {person_name} ({similarity*100:.1f}% Match)...{RESET}")

    # Buat payload tracking box untuk overlay di monitor
    timestamp = datetime.now().isoformat()
    capture_id = str(uuid.uuid4())

    # Kirim event bounding box ke camera tracking socket
    url = f"{DEFAULT_BACKEND_URL}/api/v1/camera-agent/tracking"
    payload = {
        "camera_id": camera_id,
        "capture_id": capture_id,
        "timestamp": timestamp,
        "faces": [
            {
                "bbox": {"x": 840, "y": 360, "w": 240, "h": 280},
                "confidence": 0.985,
                "is_match": True,
                "person_name": person_name,
                "similarity": similarity
            }
        ]
    }

    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={
            "Content-Type": "application/json",
            "X-Api-Key": DEFAULT_IOT_KEY
        })
        with urllib.request.urlopen(req, timeout=3.0) as res:
            if res.status in (200, 201):
                print(f"{GREEN}{BOLD}[✓] Bounding Box & Target Tracker berhasil ditayangkan di monitor!{RESET}")
    except Exception as e:
        print(f"{YELLOW}[Catatan] Kirim tracking: {e} (Pastikan backend di port 3002 sedang berjalan){RESET}")

    print(f"\n{GREEN}>> Buka monitor di http://localhost:3001/dashboard/monitor untuk melihat hasilnya.{RESET}\n")

def main():
    parser = argparse.ArgumentParser(description="DISGUISE-ID AI Detection Event Trigger")
    parser.add_argument("--person", type=str, default="Ichwal", help="Nama target DPO (misal: Ichwal, Aan, Raihan)")
    parser.add_argument("--score", type=float, default=0.914, help="Skor kemiripan biometrik (misal: 0.914)")
    parser.add_argument("--camera", type=str, default=DEFAULT_CAMERA_ID, help="UUID ID Kamera target")

    args = parser.parse_args()
    trigger_mock_detection(person_name=args.person, similarity=args.score, camera_id=args.camera)

if __name__ == "__main__":
    main()
