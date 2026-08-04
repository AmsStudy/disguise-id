import os
import sys
import httpx
import argparse
from dotenv import load_dotenv

load_dotenv()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-key", type=str, default=os.getenv("ML_SERVICE_API_KEY", ""))
    parser.add_argument("--api-url", type=str, default="http://localhost:8001")
    args = parser.parse_args()

    api_key = args.api_key
    if not api_key:
        print("PREFLIGHT FAILED: No API key provided via --api-key or ML_SERVICE_API_KEY env var.")
        return 1

    failures = []
    
    print("Running Preflight Checks...")
    try:
        resp = httpx.get(f"{args.api_url}/health", timeout=5.0)
        resp.raise_for_status()
        health = resp.json()
    except Exception as e:
        print(f"PREFLIGHT FAILED: /health check failed: {e}")
        return 1

    try:
        headers = {"x-api-key": api_key}
        resp = httpx.get(f"{args.api_url}/v2/model-info", headers=headers, timeout=5.0)
        resp.raise_for_status()
        info = resp.json()
    except Exception as e:
        print(f"PREFLIGHT FAILED: /v2/model-info check failed: {e}")
        return 1

    print("\nPreflight Report:")
    print("=" * 40)
    
    # Validation logic
    if health.get("status") != "ok":
        failures.append(f"Overall status is {health.get('status')} (expected ok)")
    if not info.get("checkpoint_hash"):
        failures.append("Missing checkpoint hash")
    if not info.get("strict_load_status"):
        failures.append("Strict load status is not True")
    if "cu" not in info.get("torch_version", "").lower() and info.get("require_cuda"):
        failures.append("PyTorch is not using CUDA")
    if info.get("arcface_provider") != "CUDAExecutionProvider" and info.get("require_cuda"):
        failures.append("ArcFace is not using CUDAExecutionProvider")
    if info.get("embedding_dimension") != 512:
        failures.append(f"Embedding dimension is {info.get('embedding_dimension')}, expected 512")
    if info.get("gallery_identities", 0) <= 0:
        failures.append("Gallery has 0 identities")
    if not info.get("model_version"):
        failures.append("Missing model version")
    if not info.get("thresholds"):
        failures.append("Missing thresholds")

    for k, v in info.items():
        print(f"{k}: {v}")
    
    print("=" * 40)
    
    if failures:
        print("PREFLIGHT FAILED due to following issues:")
        for f in failures:
            print(f"- {f}")
        return 1
    
    print("PREFLIGHT PASSED: All checks green.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
