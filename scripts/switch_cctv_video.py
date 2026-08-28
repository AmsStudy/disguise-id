#!/usr/bin/env python3
"""
DISGUISE-ID CCTV Video Switcher CLI
Usage:
    python3 scripts/switch_cctv_video.py [<video_name_or_number>]

Examples:
    python3 scripts/switch_cctv_video.py Highlight_Manusia_CCTV.mp4
    python3 scripts/switch_cctv_video.py 1
    python3 scripts/switch_cctv_video.py
"""

import sys
import os
import subprocess
import glob

STREAM_RECORD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "stream-record"))
ENV_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "camera-agent", ".env"))
COMPOSE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docker-compose.yml"))
WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def list_videos():
    if not os.path.exists(STREAM_RECORD_DIR):
        print(f"❌ Direktori {STREAM_RECORD_DIR} tidak ditemukan.")
        return []
    
    mp4_files = sorted(glob.glob(os.path.join(STREAM_RECORD_DIR, "*.mp4")))
    return [os.path.basename(f) for f in mp4_files]

def update_env_file(video_filename: str):
    video_path = f"/stream-record/{video_filename}"
    
    # Write directly to camera-agent/.active_video (mounted in Docker as /app/.active_video)
    active_video_file = os.path.join(WORKSPACE_DIR, "camera-agent", ".active_video")
    with open(active_video_file, "w") as f:
        f.write(f"/stream-record/{video_filename}\n")

    # Update camera-agent/.env if it exists
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r") as f:
            lines = f.readlines()
        
        new_lines = []
        updated = False
        for line in lines:
            if line.startswith("RTSP_URL="):
                new_lines.append(f"RTSP_URL={video_path}\n")
                updated = True
            else:
                new_lines.append(line)
        
        if not updated:
            new_lines.append(f"RTSP_URL={video_path}\n")
            
        with open(ENV_FILE, "w") as f:
            f.writelines(new_lines)
    else:
        with open(ENV_FILE, "w") as f:
            f.write(f"RTSP_URL={video_path}\n")

    # Update .env in root if it exists
    root_env = os.path.join(WORKSPACE_DIR, ".env")
    if os.path.exists(root_env):
        with open(root_env, "r") as f:
            lines = f.readlines()
        new_lines = []
        updated = False
        for line in lines:
            if line.startswith("CAMERA_AGENT_RTSP_URL="):
                new_lines.append(f"CAMERA_AGENT_RTSP_URL={video_path}\n")
                updated = True
            else:
                new_lines.append(line)
        if not updated:
            new_lines.append(f"CAMERA_AGENT_RTSP_URL={video_path}\n")
        with open(root_env, "w") as f:
            f.writelines(new_lines)

def restart_camera_agent(video_filename: str):
    print(f"\n🔄 Me-restart camera-agent dengan video: {video_filename}...")
    
    env = os.environ.copy()
    env["RTSP_URL"] = f"/stream-record/{video_filename}"
    env["CAMERA_AGENT_RTSP_URL"] = f"/stream-record/{video_filename}"
    
    cmd = ["docker", "compose", "restart", "camera-agent"]
    res = subprocess.run(cmd, cwd=WORKSPACE_DIR, env=env)
    
    if res.returncode == 0:
        print(f"\n✅ BERHASIL! Camera Agent kini memutar: {video_filename}")
        print("📺 Silakan cek monitor di http://localhost:3001/dashboard/monitor")
    else:
        print(f"\n❌ Gagal me-restart camera-agent (Exit code: {res.returncode})")

def main():
    videos = list_videos()
    
    if not videos:
        print(f"⚠️ Tidak ada file .mp4 di dalam folder: {STREAM_RECORD_DIR}")
        print("Silakan letakkan file video CCTV (.mp4) Anda di dalam folder stream-record/")
        sys.exit(1)
        
    target_video = None
    
    if len(sys.argv) > 1:
        arg = sys.argv[1].strip()
        # Check if arg is a number
        if arg.isdigit():
            idx = int(arg) - 1
            if 0 <= idx < len(videos):
                target_video = videos[idx]
            else:
                print(f"❌ Nomor video {arg} tidak valid. Pilihan tersedia: 1 - {len(videos)}")
                sys.exit(1)
        else:
            # Check if arg matches video filename
            matched = [v for v in videos if v.lower() == arg.lower() or v.lower() == (arg.lower() + ".mp4")]
            if matched:
                target_video = matched[0]
            else:
                # Substring match
                sub_matched = [v for v in videos if arg.lower() in v.lower()]
                if len(sub_matched) == 1:
                    target_video = sub_matched[0]
                else:
                    print(f"❌ Video '{arg}' tidak ditemukan di stream-record/.")
                    print(f"Video yang tersedia: {', '.join(videos)}")
                    sys.exit(1)
    else:
        print("=" * 60)
        print("🎬 DISGUISE-ID CCTV VIDEO SWITCHER")
        print("=" * 60)
        print(f"Daftar Video CCTV yang Tersedia ({len(videos)} file):")
        for i, vid in enumerate(videos, start=1):
            size_mb = os.path.getsize(os.path.join(STREAM_RECORD_DIR, vid)) / (1024 * 1024)
            print(f"  [{i}] {vid} ({size_mb:.1f} MB)")
        print("=" * 60)
        
        try:
            choice = input(f"Pilih nomor video [1-{len(videos)}] atau nama file: ").strip()
            if not choice:
                print("Dibatalkan.")
                sys.exit(0)
            if choice.isdigit():
                idx = int(choice) - 1
                if 0 <= idx < len(videos):
                    target_video = videos[idx]
                else:
                    print("Pilihan nomor tidak valid.")
                    sys.exit(1)
            else:
                matched = [v for v in videos if choice.lower() in v.lower()]
                if matched:
                    target_video = matched[0]
                else:
                    print("Nama video tidak ditemukan.")
                    sys.exit(1)
        except KeyboardInterrupt:
            print("\nDibatalkan.")
            sys.exit(0)

    if target_video:
        update_env_file(target_video)
        restart_camera_agent(target_video)

if __name__ == "__main__":
    main()
