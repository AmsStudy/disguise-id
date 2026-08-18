"""
Build gallery.csv for ML Service V2 by downloading watchlist photos from MinIO.
Run inside disguise-ml-service container:
  python3 build_gallery.py
"""
import os
import sys
import csv
import requests
import tempfile
from pathlib import Path

# Config
DB_URL = os.environ.get("DATABASE_URL", "")
MINIO_INTERNAL = "http://minio:9000"
MINIO_PUBLIC = "http://localhost:9000"
ML_API_KEY = os.environ.get("ML_SERVICE_API_KEY", "WalMWH1hinTEutYiOoeVeH8NYG-9d0P8DunLSlwYzGtgSCabPbN-bfQlQmBDtgec")
GALLERY_DIR = Path("/app/gallery_photos")
GALLERY_CSV = Path("/app/gallery.csv")

# We'll use psycopg2 or read from a passed env
import subprocess

def get_watchlist_from_db():
    """Query DB for watchlist persons and photos using psql."""
    db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:password@postgres:5432/disguiseid")
    result = subprocess.run([
        "python3", "-c", f"""
import psycopg2, json, sys
conn = psycopg2.connect('{db_url}')
cur = conn.cursor()
cur.execute('''
    SELECT wp.organization_id, wp.id as person_id, wp.full_name, wph.photo_url
    FROM watchlist_persons wp
    JOIN watchlist_photos wph ON wph.person_id = wp.id
    WHERE wp.deleted_at IS NULL AND wp.is_active = true AND wph.is_primary = true
    ORDER BY wp.created_at ASC
''')
rows = cur.fetchall()
for row in rows:
    print('|||'.join(str(x) for x in row))
conn.close()
"""
    ], capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"DB query failed: {result.stderr}")
    rows = []
    for line in result.stdout.strip().split("\n"):
        if line:
            parts = line.split("|||")
            if len(parts) == 4:
                rows.append({
                    "organization_id": parts[0],
                    "person_id": parts[1],
                    "full_name": parts[2],
                    "photo_url": parts[3],
                })
    return rows

def download_photo(url, dest_path):
    internal_url = url.replace(MINIO_PUBLIC, MINIO_INTERNAL).replace("http://localhost:9000", MINIO_INTERNAL)
    print(f"  Downloading: {internal_url}")
    resp = requests.get(internal_url, timeout=30)
    resp.raise_for_status()
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_bytes(resp.content)
    return dest_path

def main():
    print("=== Building Gallery CSV for ML Service V2 ===\n")
    
    persons = get_watchlist_from_db()
    print(f"Found {len(persons)} persons with photos\n")
    
    if not persons:
        print("No persons found! Please add persons via the Watchlist in the Frontend.")
        sys.exit(1)
    
    GALLERY_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    success = 0
    failed = 0
    
    for p in persons:
        org_id = p["organization_id"]
        person_id = p["person_id"]
        full_name = p["full_name"]
        photo_url = p["photo_url"]
        
        # Destination path
        filename = photo_url.split("/")[-1]
        dest = GALLERY_DIR / org_id / f"{person_id}_{filename}"
        
        try:
            print(f"[{full_name}] {person_id}")
            download_photo(photo_url, dest)
            rows.append({
                "organization_id": org_id,
                "identity_id": person_id,
                "image_path": str(dest),
            })
            print(f"  ✅ Saved to {dest}")
            success += 1
        except Exception as e:
            print(f"  ❌ Failed: {e}")
            failed += 1
    
    # Write CSV
    with open(GALLERY_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["organization_id", "identity_id", "image_path"])
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n✅ Gallery CSV written to {GALLERY_CSV}")
    print(f"   Total: {success} success, {failed} failed")
    
    # Trigger reload
    print("\nTriggering gallery reload on ML Service...")
    try:
        resp = requests.post(
            "http://localhost:8001/v2/gallery/reload",
            headers={"X-Api-Key": ML_API_KEY},
            timeout=120,
        )
        data = resp.json()
        if resp.status_code == 200:
            print(f"✅ Gallery loaded! Identities: {data.get('identities')} | Version: {data.get('gallery_version')}")
        else:
            print(f"❌ Reload failed: {data}")
    except Exception as e:
        print(f"❌ Reload request failed: {e}")

if __name__ == "__main__":
    main()
