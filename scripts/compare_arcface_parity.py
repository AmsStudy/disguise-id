import sys
import os
import cv2
import numpy as np
import time
import argparse

# Add paths to sys.path to allow importing from both modules
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(project_root, 'camera-agent'))
sys.path.insert(0, os.path.join(project_root, 'ml-service-v2'))

def calculate_iou(boxA, boxB):
    try:
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interArea = max(0, xB - xA) * max(0, yB - yA)
        if interArea == 0:
            return 0.0

        boxAArea = max(0, boxA[2] - boxA[0]) * max(0, boxA[3] - boxA[1])
        boxBArea = max(0, boxB[2] - boxB[0]) * max(0, boxB[3] - boxB[1])

        unionArea = boxAArea + boxBArea - interArea
        if unionArea <= 0:
            return 0.0

        return interArea / float(unionArea)
    except Exception:
        return 0.0

def main():
    parser = argparse.ArgumentParser(description="Diagnostic utility for ArcFace Parity between Edge and Server V2")
    parser.add_argument("image_path", help="Path to the test image")
    parser.add_argument("--mode", choices=["controlled", "production"], required=True,
                        help="Mode: 'controlled' (same image parity) or 'production' (real pipeline path)")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose diagnostic output")
    args = parser.parse_args()

    image_path = args.image_path
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        sys.exit(1)

    print("============================================================")
    print("INPUT IMAGE")
    print("============================================================")

    # cv2.imread loads image as BGR
    frame = cv2.imread(image_path)
    if frame is None:
        print("Failed to read image")
        sys.exit(1)

    h, w, c = frame.shape
    print(f"Path:     {image_path}")
    print(f"Width:    {w} px")
    print(f"Height:   {h} px")
    print(f"Channels: {c}")
    print(f"Mode:     {args.mode.upper()}")

    # ==============================================================
    # STAGE 1: INDEPENDENT EDGE RAW DETECTION & PRODUCTION OBSERVATION
    # ==============================================================
    print("\n============================================================")
    print("EDGE RAW DETECTION & FILTER OBSERVATION")
    print("============================================================")
    import config as agent_config
    agent_config.config.edge_embedding_shadow_enabled = True

    from face_detector import FaceDetector
    pad_ratio = FaceDetector.PAD_RATIO
    min_face_size = FaceDetector.MIN_FACE_SIZE

    edge_detector = FaceDetector(det_size=(640, 640), min_confidence=0.5)

    # 1A. Raw Detection
    # FaceAnalysis.app.get() expects BGR input. frame is BGR.
    print(f"\n[Running raw InsightFace get() for diagnostics...]")
    raw_faces = edge_detector.app.get(frame)
    print(f"Raw faces found: {len(raw_faces)}")

    raw_face_results = []

    for i, face in enumerate(raw_faces):
        if args.verbose:
            print(f"\n--- Raw Face #{i} ---")

        det_score = face.det_score
        box = face.bbox.astype(int)
        x1, y1, x2, y2 = box[0], box[1], box[2], box[3]
        raw_w = x2 - x1
        raw_h = y2 - y1

        # Reproduce production filtering
        status = "accepted"
        reason = "none"

        pad_x = int(raw_w * pad_ratio)
        pad_y = int(raw_h * pad_ratio)
        px1 = max(0, x1 - pad_x)
        py1 = max(0, y1 - pad_y)
        px2 = min(w, x2 + pad_x)
        py2 = min(h, y2 + pad_y)

        padded_w = px2 - px1
        padded_h = py2 - py1

        if args.verbose:
            print(f"det_score: {det_score:.4f}")
            print(f"raw_bbox:  ({x1}, {y1}, {x2}, {y2})")
            print(f"raw_dims:  {raw_w}x{raw_h} px")
            print(f"padded_bbox: ({px1}, {py1}, {px2}, {py2})")
            print(f"padded_dims: {padded_w}x{padded_h} px")
            print(f"production_min_size: {min_face_size}x{min_face_size} px")

        if det_score < edge_detector.min_confidence:
            status = "rejected"
            reason = "confidence_below_threshold"
        elif padded_w < min_face_size or padded_h < min_face_size:
            status = "rejected"
            reason = "below_min_face_size"

        if args.verbose:
            print(f"Status: {status.upper()}")
            if status == "rejected":
                print(f"Reason: {reason.upper()}")

        raw_face_results.append({
            "index": i,
            "raw_face": face,
            "raw_box": (x1, y1, x2, y2),
            "padded_box": (px1, py1, px2, py2),
            "status": status,
            "reason": reason
        })

    # ==============================================================
    # STAGE 2: PRODUCTION EDGE FACE DETECTOR CALL
    # ==============================================================
    print("\n============================================================")
    print("PRODUCTION EDGE DETECTOR (FaceDetector.process_frame)")
    print("============================================================")

    start_t = time.time()
    detected_faces, _, _ = edge_detector.process_frame(frame)
    edge_time = time.time() - start_t

    print(f"raw_faces_found:           {len(raw_faces)}")
    print(f"production_faces_accepted: {len(detected_faces)}")
    if args.verbose:
        print(f"processing_time:           {edge_time*1000:.2f} ms")

    if len(raw_faces) > 0 and len(detected_faces) == 0:
        print("\nEDGE STATUS:")
        print("RAW_FACE_DETECTED_BUT_REJECTED_BY_PRODUCTION_GATE")
        for res in raw_face_results:
            if res["status"] == "rejected":
                print(f"  Face #{res['index']} rejected: {res['reason']}")

    # ==============================================================
    # STAGE 3: SERVER V2 EXTRACTION
    # ==============================================================
    print("\n============================================================")
    print("SERVER V2 DIAGNOSTIC")
    print("============================================================")

    from app.services.arcface_service import ArcFaceService
    server_arcface = ArcFaceService()

    server_results = []

    for res in raw_face_results:
        if args.verbose:
            print(f"\n--- Server V2 Evaluation for Raw Face #{res['index']} ---")

        rx1, ry1, rx2, ry2 = res["raw_box"]
        px1, py1, px2, py2 = res["padded_box"]

        server_emb = None
        server_meta = None
        correlation_status = "OK"

        if args.mode == "production":
            # Production pipeline: Server receives the padded crop JPEG
            crop = frame[py1:py2, px1:px2]
            _, crop_encoded = cv2.imencode('.jpg', crop, [cv2.IMWRITE_JPEG_QUALITY, 95])
            crop_bytes = crop_encoded.tobytes()

            from PIL import Image, ImageOps
            import io

            image_pil = Image.open(io.BytesIO(crop_bytes))
            image_pil = ImageOps.exif_transpose(image_pil).convert("RGB")
            # PIL converts to RGB
            server_input_rgb = np.asarray(image_pil)

            # For raw diagnostics, InsightFace app.get expects BGR
            server_input_bgr = cv2.cvtColor(server_input_rgb, cv2.COLOR_RGB2BGR)
            server_faces_raw = server_arcface.app.get(server_input_bgr)

            # ArcFaceService.detect_and_extract public boundary expects RGB
            # Inside it converts RGB -> BGR
            start_t = time.time()
            server_emb, server_meta = server_arcface.detect_and_extract(server_input_rgb)
            server_time = time.time() - start_t

            # Target local bbox in crop coordinates
            target_local_box = (rx1 - px1, ry1 - py1, rx2 - px1, ry2 - py1)

            if args.verbose:
                print(f"target_local_box: {target_local_box}")
                print(f"server_faces_raw count: {len(server_faces_raw)}")

            if len(server_faces_raw) > 0:
                # Find matching face among server raw output in local crop
                best_iou = 0
                for s_face in server_faces_raw:
                    s_box = s_face.bbox.astype(int)
                    iou = calculate_iou(target_local_box, s_box)
                    if args.verbose:
                        print(f"  Server raw face bbox: {s_box} (IoU with target: {iou:.4f})")
                    if iou > best_iou:
                        best_iou = iou

                # Compare selected face by production V2 (largest face in crop)
                if server_meta and 'bbox' in server_meta:
                    sel_box = server_meta['bbox']
                    sel_iou = calculate_iou(target_local_box, sel_box)
                    if args.verbose:
                        print(f"production V2 selected bbox: {sel_box} (IoU with target: {sel_iou:.4f})")

                    if sel_iou < 0.5:
                        correlation_status = "SERVER_SELECTED_WRONG_FACE"
                        if args.verbose:
                            print(f"Warning: SERVER_SELECTED_WRONG_FACE. Selected face does not match expected Edge face.")
                else:
                    correlation_status = "SERVER_RESULT_MISSING"

                if len(server_faces_raw) > 1 and correlation_status == "OK":
                    if args.verbose:
                        print(f"Warning: Multiple faces in crop, but V2 selected intended face successfully.")

        elif args.mode == "controlled":
            # Controlled parity: Server runs on the exact same FULL BGR frame to isolate preprocessing differences
            # FaceAnalysis.app.get expects BGR
            server_faces_raw = server_arcface.app.get(frame)

            best_server_iou = 0
            server_face = None

            for s_face in server_faces_raw:
                s_box = s_face.bbox.astype(int)
                iou = calculate_iou(res["raw_box"], s_box)
                if args.verbose:
                    print(f"  Server raw face bbox: {s_box} (IoU with target: {iou:.4f})")
                if iou > best_server_iou:
                    best_server_iou = iou
                    server_face = s_face

            if server_face is not None and best_server_iou > 0.5:
                # We extract using the standard get() output which produces normed_embedding
                server_emb = server_face.normed_embedding
                server_meta = {"det_score": float(server_face.det_score)}
            else:
                correlation_status = "SERVER_FACE_CORRELATION_FAILED"
                server_emb = None
                server_meta = None

        server_results.append({
            "index": res["index"],
            "server_emb": server_emb,
            "server_meta": server_meta,
            "correlation_status": correlation_status
        })

        if server_emb is not None:
            if args.verbose:
                print(f"server_embedding_available: YES")
                print(f"Server det_score: {server_meta['det_score']:.4f}")
        else:
            if args.verbose:
                print(f"server_embedding_available: NO")

    # ==============================================================
    # STAGE 4: PARITY METRICS
    # ==============================================================
    print("\n============================================================")
    print("EDGE / SERVER PARITY CALCULATION")
    print("============================================================")

    if len(detected_faces) == 0:
        print("No faces were accepted by the Edge production gate. Cannot calculate valid production parity.")
        sys.exit(0)

    for i, edge_face in enumerate(detected_faces):
        print(f"\n--- Correlating Production Face #{i} ---")

        best_iou = 0
        best_raw_idx = -1

        ebx, eby, ebw, ebh = edge_face.bbox.x, edge_face.bbox.y, edge_face.bbox.w, edge_face.bbox.h
        edge_box = (ebx, eby, ebx+ebw, eby+ebh)

        # Match production face to raw face by IoU of raw bbox vs padded box?
        # Actually edge_face.bbox is the crop box relative to full frame?
        # In Camera Agent, edge_face.bbox is the padded crop box:
        # BBox(x=x1, y=y1, w=crop_w, h=crop_h) where x1,y1 are padded.
        # So we compare edge_box with padded_box
        for res in raw_face_results:
            iou = calculate_iou(edge_box, res["padded_box"])
            if iou > best_iou:
                best_iou = iou
                best_raw_idx = res["index"]

        if best_iou < 0.5:
            print(f"Parity aborted: EDGE_FACE_CORRELATION_FAILED (IoU {best_iou:.2f})")
            continue

        print(f"Correlated to Raw Face #{best_raw_idx} (IoU {best_iou:.4f})")

        server_res = next((sr for sr in server_results if sr["index"] == best_raw_idx), None)

        failure_reason = None
        edge_emb_np = None

        # Edge Diagnostics
        edge_emb = edge_face.edge_embedding
        print(f"edge_embedding_present: {'YES' if edge_emb is not None else 'NO'}")

        if edge_emb is not None:
            edge_emb_np = np.array(edge_emb, dtype=np.float32)
            edge_dim = len(edge_emb)
            edge_norm = np.linalg.norm(edge_emb_np)

            print(f"edge_embedding_source:    face.normed_embedding (via config shadow)")
            print(f"edge_embedding_dimension: {edge_dim}")
            print(f"edge_embedding_norm:      {edge_norm:.6f}")

            if edge_dim != 512:
                failure_reason = "EMBEDDING_DIMENSION_MISMATCH"
            elif not np.all(np.isfinite(edge_emb_np)):
                failure_reason = "EMBEDDING_NON_FINITE"
            elif edge_norm <= 0:
                failure_reason = "EMBEDDING_NORM_ZERO"
        else:
            failure_reason = "EDGE_EMBEDDING_MISSING"

        # Server Diagnostics
        server_emb = None
        if server_res:
            server_emb = server_res.get("server_emb")
            print(f"server_embedding_present: {'YES' if server_emb is not None else 'NO'}")

            if server_emb is not None:
                server_dim = len(server_emb)
                server_norm = np.linalg.norm(server_emb)
                source_str = "ArcFaceService.detect_and_extract (normed)" if args.mode == "production" else "face.normed_embedding (raw)"
                print(f"server_embedding_source:    {source_str}")
                print(f"server_embedding_dimension: {server_dim}")
                print(f"server_embedding_norm:      {server_norm:.6f}")
            else:
                if failure_reason is None:
                    failure_reason = server_res.get("correlation_status", "SERVER_EMBEDDING_MISSING")
        else:
            print(f"server_embedding_present: NO")
            if failure_reason is None:
                failure_reason = "SERVER_RESULT_MISSING"

        if server_res and server_res.get("correlation_status") != "OK":
            if failure_reason is None:
                failure_reason = server_res.get("correlation_status")

        if failure_reason is not None:
            print(f"\nParity aborted: {failure_reason}")
            continue

        if edge_emb_np is not None and server_emb is not None:
            dot_product = np.dot(edge_emb_np, server_emb)
            cosine_sim = dot_product / (edge_norm * server_norm) if (edge_norm > 0 and server_norm > 0) else 0.0

            diff = edge_emb_np - server_emb
            l2_dist = np.linalg.norm(diff)
            mean_abs_diff = np.mean(np.abs(diff))
            max_abs_diff = np.max(np.abs(diff))

            print(f"\n[METRICS]")
            print(f"Cosine Similarity:         {cosine_sim:.8f}")
            print(f"L2 Distance:               {l2_dist:.8f}")
            print(f"Mean Absolute Difference:  {mean_abs_diff:.8f}")
            print(f"Maximum Absolute Difference: {max_abs_diff:.8f}")

if __name__ == "__main__":
    main()
