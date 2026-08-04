import os
import shutil
import zipfile
import re
from pathlib import Path

WORKSPACE = Path(r"f:\PROJECT\DISGUISE-ID\fullstack-disguise")
STAGING = WORKSPACE / "staging_extract"
ZIP_NAME = WORKSPACE / "disguise-ai-integration-source.zip"

def redact_content(content):
    # Redact sensitive information
    # JWT Secrets
    content = re.sub(r'(JWT_SECRET=)[\w\-\.]+', r'\1[REDACTED]', content)
    content = re.sub(r'(jwt\.verify\(.*?, process\.env\.JWT_SECRET \|\| )[''"].*?[''"]', r'\1"[REDACTED]"', content)
    
    # API Keys
    content = re.sub(r'(x-api-key)[\w\-]+', r'\1[REDACTED]', content)
    content = re.sub(r'(IOT_API_KEY\s*=\s*)[''"].*?[''"]', r'\1"[REDACTED]"', content)
    content = re.sub(r'(IOT_API_KEY\s*=\s*os\.getenv\("IOT_API_KEY",\s*)[''"].*?[''"]', r'\1"[REDACTED]"', content)
    content = re.sub(r'(validIotKey\s*=\s*process\.env\.IOT_API_KEY \|\| )[''"].*?[''"]', r'\1"[REDACTED]"', content)
    
    # RTSP Credentials
    content = re.sub(r'rtsp://[^@]+@', r'rtsp://[REDACTED_USER]:[REDACTED_PASSWORD]@', content)
    
    # Passwords / DB Credentials
    content = re.sub(r'(POSTGRES_PASSWORD: ).*', r'\1[REDACTED]', content)
    content = re.sub(r'(MINIO_ROOT_PASSWORD: ).*', r'\1[REDACTED]', content)
    content = re.sub(r'(DATABASE_URL=).*', r'\1postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DB]?schema=public', content)
    
    return content

def copy_file(src, dst):
    if not src.exists():
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        content = src.read_text(encoding='utf-8', errors='ignore')
        redacted = redact_content(content)
        dst.write_text(redacted, encoding='utf-8')
    except Exception as e:
        print(f"Skipping binary/unreadable file: {src} ({e})")
        return False
    return True

def copy_dir(src, dst, include_exts=None, exclude_dirs=None):
    if not src.exists() or not src.is_dir():
        return False
    exclude_dirs = exclude_dirs or ['.git', 'node_modules', '.next', '__pycache__', 'venv', 'models']
    
    copied = False
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if include_exts and not any(file.endswith(ext) for ext in include_exts):
                continue
            s = Path(root) / file
            rel = s.relative_to(src)
            d = dst / rel
            if copy_file(s, d):
                copied = True
    return copied

def main():
    if STAGING.exists():
        shutil.rmtree(STAGING)
    STAGING.mkdir()
    
    manifest = ["# SOURCE MANIFEST\n\n## Included Files:\n"]
    not_found = ["\n## Not Found / Excluded Files:\n"]
    
    def add_to_manifest(path, success, note=""):
        if success:
            manifest.append(f"- [FOUND] {path} {note}\n")
        else:
            not_found.append(f"- [NOT FOUND / EXCLUDED] {path}\n")

    # 1. ml-service
    ml_src = WORKSPACE / 'ml-service'
    ml_dst = STAGING / 'ml-service'
    add_to_manifest("ml-service/main.py", copy_file(ml_src / 'main.py', ml_dst / 'main.py'))
    add_to_manifest("ml-service/Dockerfile", copy_file(ml_src / 'Dockerfile', ml_dst / 'Dockerfile'))
    add_to_manifest("ml-service/requirements.txt", copy_file(ml_src / 'requirements.txt', ml_dst / 'requirements.txt'))
    # Local imports (custom_loader.py, etc)
    for p in ml_src.glob('*.py'):
        if p.name not in ['main.py']:
            copy_file(p, ml_dst / p.name)
            add_to_manifest(f"ml-service/{p.name}", True, "(local import script)")
    
    # 2. disguise-backend
    b_src = WORKSPACE / 'disguise-backend'
    b_dst = STAGING / 'disguise-backend'
    add_to_manifest("backend/src/queues/inference.worker.ts", copy_file(b_src / 'src/queues/inference.worker.ts', b_dst / 'src/queues/inference.worker.ts'))
    add_to_manifest("backend/src/queues/index.ts", copy_file(b_src / 'src/queues/index.ts', b_dst / 'src/queues/index.ts'))
    add_to_manifest("backend/src/modules/inference/", copy_dir(b_src / 'src/modules/inference', b_dst / 'src/modules/inference'))
    add_to_manifest("backend/src/modules/watchlist/", copy_dir(b_src / 'src/modules/watchlist', b_dst / 'src/modules/watchlist'))
    add_to_manifest("backend/src/sockets/", copy_dir(b_src / 'src/sockets', b_dst / 'src/sockets'))
    add_to_manifest("backend/src/config/minio.ts", copy_file(b_src / 'src/config/minio.ts', b_dst / 'src/config/minio.ts'))
    add_to_manifest("backend/prisma/schema.prisma", copy_file(b_src / 'prisma/schema.prisma', b_dst / 'prisma/schema.prisma'))
    add_to_manifest("backend/prisma/migrations/", copy_dir(b_src / 'prisma/migrations', b_dst / 'prisma/migrations'))
    add_to_manifest("backend/docker-compose.yml", copy_file(b_src / 'docker-compose.yml', b_dst / 'docker-compose.yml'))
    add_to_manifest("backend/.env.example", copy_file(b_src / '.env.example', b_dst / '.env.example'))
    add_to_manifest("backend/mediamtx.yml", copy_file(b_src / 'mediamtx.yml', b_dst / 'mediamtx.yml'))

    # 3. disguise-raps/v2
    r_src = WORKSPACE / 'disguise-raps' / 'v2'
    r_dst = STAGING / 'disguise-raps' / 'v2'
    add_to_manifest("disguise-raps/v2/disguiseid_capture.py", copy_file(r_src / 'disguiseid_capture.py', r_dst / 'disguiseid_capture.py'))
    # Local imports
    for p in r_src.glob('*.py'):
        if p.name not in ['disguiseid_capture.py']:
            copy_file(p, r_dst / p.name)
            add_to_manifest(f"disguise-raps/v2/{p.name}", True, "(local import script)")

    # 4. disguise-frontend
    f_src = WORKSPACE / 'disguise-frontend'
    f_dst = STAGING / 'disguise-frontend'
    add_to_manifest("frontend/services/socket.ts", copy_file(f_src / 'services/socket.ts', f_dst / 'services/socket.ts'))
    add_to_manifest("frontend/store/alertStore.ts", copy_file(f_src / 'store/alertStore.ts', f_dst / 'store/alertStore.ts'))
    # Alert components and pages
    f_comps = f_src / 'components' / 'alerts'
    if f_comps.exists():
         add_to_manifest("frontend/components/alerts/", copy_dir(f_comps, f_dst / 'components/alerts'))
    else:
         add_to_manifest("frontend/components/alerts/", False)
         
    # search for alert/detection pages
    f_pages_alert = f_src / 'app' / '(dashboard)' / 'alerts'
    if f_pages_alert.exists():
         add_to_manifest("frontend/app/(dashboard)/alerts/", copy_dir(f_pages_alert, f_dst / 'app/(dashboard)/alerts'))
    else:
         # Try app/alerts
         f_pages_alert2 = f_src / 'app' / 'alerts'
         if f_pages_alert2.exists():
              add_to_manifest("frontend/app/alerts/", copy_dir(f_pages_alert2, f_dst / 'app/alerts'))
         else:
              add_to_manifest("frontend/alerts_page", False)
              
    f_pages_detection = f_src / 'app' / '(dashboard)' / 'live'
    if f_pages_detection.exists():
         add_to_manifest("frontend/app/(dashboard)/live/", copy_dir(f_pages_detection, f_dst / 'app/(dashboard)/live'))
    else:
         f_pages_detection2 = f_src / 'app' / 'live'
         if f_pages_detection2.exists():
              add_to_manifest("frontend/app/live/", copy_dir(f_pages_detection2, f_dst / 'app/live'))
         else:
             add_to_manifest("frontend/live_page", False)
             
    f_services = f_src / 'services'
    if f_services.exists():
         add_to_manifest("frontend/services/", copy_dir(f_services, f_dst / 'services'))
         
    # Generate Manifest
    manifest_content = ''.join(manifest) + ''.join(not_found)
    (STAGING / 'SOURCE_MANIFEST.md').write_text(manifest_content)
    
    # Zip
    print(f'Creating zip {ZIP_NAME}')
    with zipfile.ZipFile(ZIP_NAME, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(STAGING):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, STAGING)
                zipf.write(file_path, arcname)
    
    print('Done!')

if __name__ == '__main__':
    main()
