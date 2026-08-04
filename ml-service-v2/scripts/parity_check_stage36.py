import os
import sys
import argparse
from pathlib import Path
import subprocess
import httpx
import pandas as pd
import json
import mimetypes
from dotenv import load_dotenv

load_dotenv()

def run_stage36_script(project_dir: Path, gallery_csv: Path, input_dir: Path, output_dir: Path):
    script_path = project_dir / "scripts" / "36_margin_max_terminal_decision_engine.py"
    if not script_path.exists():
        raise FileNotFoundError(f"Original Stage 36 script not found: {script_path}")
        
    cmd = [
        sys.executable,
        str(script_path),
        "--project-dir", str(project_dir),
        "--gallery-csv", str(gallery_csv),
        "--input", str(input_dir),
        "--output", str(output_dir)
        # Note: --save-images removed per requirements
    ]
    
    print("Running original Stage 36 script for baseline generation...")
    subprocess.run(cmd, check=True)
    print("Baseline generated.")

def floats_close(a, b, tol=1e-5):
    import math
    if pd.isna(a) and pd.isna(b) or math.isnan(a) and math.isnan(b):
        return True
    if pd.isna(a) or math.isnan(a) or pd.isna(b) or math.isnan(b):
        return False
    return abs(a - b) <= tol

def compare_results(baseline_csv: Path, api_url: str, api_key: str, input_dir: Path, output_dir: Path):
    df = pd.read_csv(baseline_csv)
    images = sorted([p for p in input_dir.rglob("*") if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}], key=lambda x: str(x).lower())
    
    if len(images) != len(df):
        raise ValueError("Number of input images does not match number of baseline results.")
        
    failures = []
    parity_results = []
    max_score_delta = 0.0
    max_margin_delta = 0.0
    
    print("Sending requests to V2 API and comparing...")
    for idx, (img_path, row) in enumerate(zip(images, df.itertuples())):
        mime_type, _ = mimetypes.guess_type(img_path)
        mime_type = mime_type or "application/octet-stream"
        
        with open(img_path, "rb") as f:
            files = {"face_crop": (img_path.name, f, mime_type)}
            data = {
                "organization_id": "test_org",
                "camera_id": "test_cam",
                "camera_session_id": "test_session",
                "track_id": f"test_track_{idx}",
                "captured_at": "2026-08-04T07:26:10Z",
                "frame_number": idx,
                "bounding_box_json": "[0,0,100,100]"
            }
            headers = {"x-api-key": api_key}
            
            try:
                resp = httpx.post(api_url, files=files, data=data, headers=headers, timeout=30.0)
                resp.raise_for_status()
            except Exception as e:
                failures.append({"filename": img_path.name, "error": f"API request failed: {str(e)}"})
                continue
            
        api_res = resp.json()
        errors = []
        
        def check(field_name, baseline_val, api_val, is_float=False, delta_tracker=None):
            nonlocal max_score_delta, max_margin_delta
            if is_float:
                a_float = float(api_val) if api_val is not None else float('nan')
                b_float = float(baseline_val) if baseline_val is not None else float('nan')
                if not floats_close(b_float, a_float):
                    errors.append(f"{field_name} mismatch: baseline={b_float}, api={a_float}")
                elif pd.notna(b_float) and pd.notna(a_float):
                    delta = abs(b_float - a_float)
                    if delta_tracker == 'score': max_score_delta = max(max_score_delta, delta)
                    if delta_tracker == 'margin': max_margin_delta = max(max_margin_delta, delta)
            else:
                b_str = "" if pd.isna(baseline_val) or baseline_val is None else str(baseline_val)
                a_str = "" if api_val is None else str(api_val)
                if b_str != a_str:
                    errors.append(f"{field_name} mismatch: baseline={b_str}, api={a_str}")

        check("original_valid", pd.notna(row.original_score), api_res["original"]["valid"])
        check("original_identity", row.original_identity, api_res["original"]["candidate_id"])
        check("original_score", row.original_score, api_res["original"]["score"], is_float=True, delta_tracker='score')
        check("original_margin", row.original_margin, api_res["original"]["margin"], is_float=True, delta_tracker='margin')
        
        check("reconstructed_valid", pd.notna(row.reconstructed_score), api_res["reconstructed"]["valid"])
        check("reconstructed_identity", row.reconstructed_identity, api_res["reconstructed"]["candidate_id"])
        check("reconstructed_score", row.reconstructed_score, api_res["reconstructed"]["score"], is_float=True, delta_tracker='score')
        check("reconstructed_margin", row.reconstructed_margin, api_res["reconstructed"]["margin"], is_float=True, delta_tracker='margin')
        
        check("selected_branch", row.selected_branch, api_res["selected_branch"])
        check("selected_identity", row.selected_identity, api_res["candidate_id"])
        check("decision", row.decision, api_res["frame_decision"])
        
        res_row = api_res.copy()
        res_row["filename"] = img_path.name
        res_row["parity_passed"] = len(errors) == 0
        parity_results.append(res_row)
        
        if errors:
            failures.append({"filename": img_path.name, "errors": "; ".join(errors)})
            
    return len(images), failures, parity_results, max_score_delta, max_margin_delta

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-dir", type=Path, default=Path(r"F:\PYTORCH_WORKSPACE\disguise-id"))
    parser.add_argument("--gallery-csv", type=Path, default=Path(r"F:\PENELITIAN\DISGUISE-ID\dataset\+ATRIBUT\DPO_SYSTEM_PREPARED\gallery.csv"))
    parser.add_argument("--input-dir", type=Path, default=Path(r"F:\PENELITIAN\DISGUISE-ID\dataset\+ATRIBUT\DPO_SYSTEM_PREPARED\test_images"))
    parser.add_argument("--output-dir", type=Path, default=Path("outputs/phase2_parity"))
    parser.add_argument("--api-url", type=str, default="http://localhost:8001/v2/infer-face")
    parser.add_argument("--api-key", type=str, default=os.getenv("ML_SERVICE_API_KEY", "your_secret_key_here"))
    args = parser.parse_args()

    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("Phase 2 Parity Check")
    print("=" * 60)
    
    baseline_csv = output_dir / "decision_results.csv"
    if not baseline_csv.exists():
        try:
            run_stage36_script(args.project_dir, args.gallery_csv, args.input_dir, output_dir)
        except Exception as e:
            print(f"Failed to run baseline: {e}")
            return 1
    else:
        print("Baseline CSV already exists. Skipping baseline generation.")
        
    if not baseline_csv.exists():
        print("Baseline CSV not found, something went wrong.")
        return 1
        
    total, failures, parity_results, max_s, max_m = compare_results(baseline_csv, args.api_url, args.api_key, args.input_dir, output_dir)
    
    pd.DataFrame(parity_results).to_csv(output_dir / "parity_results.csv", index=False)
    
    summary = {
        "parity_images": total,
        "parity_passed": total - len(failures),
        "parity_failed": len(failures),
        "max_score_delta": max_s,
        "max_margin_delta": max_m
    }
    with open(output_dir / "parity_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
        
    if failures:
        print(f"\nPARITY FAILED: {len(failures)} out of {total} images had mismatches.")
        pd.DataFrame(failures).to_csv(output_dir / "failures.csv", index=False)
        print(f"Details saved to {output_dir}")
        return 1
    else:
        print(f"\nPARITY PASSED: 100% match on all {total} images.")
        pd.DataFrame([]).to_csv(output_dir / "failures.csv", index=False)

    return 0

if __name__ == "__main__":
    sys.exit(main())
