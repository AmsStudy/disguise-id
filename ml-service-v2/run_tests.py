import subprocess
import time
import sys
import httpx
from pathlib import Path

def wait_for_server():
    for _ in range(30):
        try:
            resp = httpx.get("http://localhost:8001/health", timeout=1.0)
            if resp.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(1)
    return False

def main():
    print("Starting API Server in background...")
    server = subprocess.Popen(["uvicorn", "app.main:app", "--port", "8001"])
    
    if not wait_for_server():
        print("Server failed to start in time.")
        server.terminate()
        return 1
        
    print("Server is up. Running preflight...")
    res = subprocess.run([sys.executable, "scripts/preflight.py"])
    if res.returncode != 0:
        print("Preflight failed.")
        server.terminate()
        return 1
        
    print("Preflight passed. Running parity check...")
    res = subprocess.run([sys.executable, "scripts/parity_check_stage36.py"])
    
    print("Tests complete. Terminating server...")
    server.terminate()
    server.wait()
    
    return res.returncode

if __name__ == "__main__":
    sys.exit(main())
