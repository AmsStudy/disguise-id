#!/usr/bin/env python3
"""
benchmark_camera_agent.py - Automated Benchmark & Testing Script for Camera Agent Container (RetinaFace Edge Module)

Evaluates CCTV video recordings (.mp4) in batch/asynchronous mode on Edge hardware:
1. RetinaFace / InsightFace SCRFD Detection with 5-point facial landmarks.
2. Proportional 10-15% bounding box padding (VAE De-Disguise alignment).
3. Laplacian variance blur curation (Quality Assessment).
4. Sharp face crop extraction to ./edge_output_crops/ (<video>_f<frame>_idx<face_idx>_lap<score>.jpg).
5. Quantitative benchmark reporting to ./edge_reports/benchmark_results.csv.
"""

import os
import sys
import time
import glob
import csv
import argparse
import logging
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple

import cv2
import numpy as np

# Configure clean, informative logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("BenchmarkEdge")


@dataclass
class BenchmarkConfig:
    input_dir: str = "./input_videos"
    video_path: Optional[str] = None
    interval: int = 5
    min_confidence: float = 0.8
    laplacian_threshold: float = 60.0
    pad_ratio: float = 0.15
    min_face_size: int = 40
    det_size: int = 640
    output_crops_dir: str = "./edge_output_crops"
    output_reports_dir: str = "./edge_reports"
    csv_filename: str = "benchmark_results.csv"
    max_frames: Optional[int] = None
    test_synthetic: bool = False


@dataclass
class VideoMetrics:
    video_name: str
    total_frames_evaluated: int = 0
    faces_detected_raw: int = 0
    faces_passed_laplacian: int = 0
    faces_dropped_blur: int = 0
    total_inference_time_s: float = 0.0

    @property
    def laplacian_pass_rate_pct(self) -> float:
        if self.faces_detected_raw == 0:
            return 0.0
        return round((self.faces_passed_laplacian / self.faces_detected_raw) * 100.0, 2)

    @property
    def avg_inference_latency_ms(self) -> float:
        if self.total_frames_evaluated == 0:
            return 0.0
        return round((self.total_inference_time_s / self.total_frames_evaluated) * 1000.0, 2)

    @property
    def estimated_fps(self) -> float:
        if self.total_inference_time_s <= 0 or self.total_frames_evaluated == 0:
            return 0.0
        return round(self.total_frames_evaluated / self.total_inference_time_s, 2)


class RetinaFaceDetector:
    """
    Modular wrapper for RetinaFace / InsightFace SCRFD edge detector.
    Configured for pure face detection with bounding boxes & 5-point facial landmarks.
    """

    def __init__(self, det_size: int = 640, min_confidence: float = 0.8, pad_ratio: float = 0.15, min_face_size: int = 40):
        self.det_size = (det_size, det_size)
        self.min_confidence = min_confidence
        self.pad_ratio = pad_ratio
        self.min_face_size = min_face_size

        import onnxruntime
        available_providers = onnxruntime.get_available_providers()
        providers = []
        ctx_id = -1
        if 'CUDAExecutionProvider' in available_providers:
            providers.append('CUDAExecutionProvider')
            ctx_id = 0
        providers.append('CPUExecutionProvider')

        logger.info(f"Loading RetinaFace/SCRFD Edge Detector (providers={providers}, ctx_id={ctx_id}, det_size={self.det_size})...")
        start_load = time.perf_counter()

        from insightface.app import FaceAnalysis
        self.app = FaceAnalysis(
            name='buffalo_l',
            root='~/.insightface',
            providers=providers,
            allowed_modules=['detection']
        )
        self.app.prepare(ctx_id=ctx_id, det_size=self.det_size)
        load_time_s = time.perf_counter() - start_load
        logger.info(f"RetinaFace Detector successfully initialized in {load_time_s:.2f}s.")

    def detect(self, frame: np.ndarray) -> Tuple[List[Dict[str, Any]], float]:
        """
        Executes RetinaFace inference on a single frame.
        Returns: (list_of_detected_faces, inference_latency_seconds)
        """
        h, w = frame.shape[:2]
        t0 = time.perf_counter()
        raw_faces = self.app.get(frame)
        latency_s = time.perf_counter() - t0

        detected_faces = []
        for face in raw_faces:
            conf = float(face.det_score)
            if conf < self.min_confidence:
                continue

            box = face.bbox.astype(int)
            x1, y1, x2, y2 = box[0], box[1], box[2], box[3]

            face_w = x2 - x1
            face_h = y2 - y1

            # Proportional padding (10-15%)
            pad_x = int(face_w * self.pad_ratio)
            pad_y = int(face_h * self.pad_ratio)
            x1_pad = max(0, x1 - pad_x)
            y1_pad = max(0, y1 - pad_y)
            x2_pad = min(w, x2 + pad_x)
            y2_pad = min(h, y2 + pad_y)

            crop_w = x2_pad - x1_pad
            crop_h = y2_pad - y1_pad

            if crop_w < self.min_face_size or crop_h < self.min_face_size:
                continue

            crop = frame[y1_pad:y2_pad, x1_pad:x2_pad]
            landmarks = face.kps.tolist() if hasattr(face, 'kps') and face.kps is not None else None

            detected_faces.append({
                'bbox': (int(x1_pad), int(y1_pad), int(crop_w), int(crop_h)),
                'raw_bbox': (int(x1), int(y1), int(face_w), int(face_h)),
                'confidence': float(round(conf, 4)),
                'landmarks': landmarks,
                'crop': crop,
            })

        return detected_faces, latency_s


class CameraAgentBenchmark:
    """
    Core benchmark runner handling directory setup, video batch processing,
    Laplacian quality curation, crop storage, and CSV metrics aggregation.
    """

    def __init__(self, config: BenchmarkConfig):
        self.config = config
        self._setup_directories()
        self.detector = RetinaFaceDetector(
            det_size=config.det_size,
            min_confidence=config.min_confidence,
            pad_ratio=config.pad_ratio,
            min_face_size=config.min_face_size
        )

    def _setup_directories(self):
        os.makedirs(self.config.output_crops_dir, exist_ok=True)
        os.makedirs(self.config.output_reports_dir, exist_ok=True)
        logger.info(f"Directory structure prepared: crops='{self.config.output_crops_dir}', reports='{self.config.output_reports_dir}'")

    @staticmethod
    def calculate_laplacian_variance(crop_bgr: np.ndarray) -> float:
        """
        Computes the Laplacian variance on grayscale image as sharpness/blur metric.
        High value = Sharp, Low value = Blurry.
        """
        if crop_bgr is None or crop_bgr.size == 0:
            return 0.0
        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    def process_single_video(self, video_path: str) -> VideoMetrics:
        video_filename = os.path.basename(video_path)
        video_stem = os.path.splitext(video_filename)[0]
        metrics = VideoMetrics(video_name=video_filename)

        logger.info(f"--- Processing Video: {video_filename} ---")
        if not os.path.exists(video_path):
            logger.error(f"Video file not found: {video_path}")
            return metrics

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Error opening video '{video_filename}'. Video may be corrupt or missing moov atom.")
            return metrics

        total_input_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        logger.info(f"Video Info: {total_input_frames} frames, {fps:.1f} FPS, Interval={self.config.interval}")

        frame_idx = 0
        try:
            while True:
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                frame_idx += 1

                # Sample frames based on interval
                if (frame_idx - 1) % self.config.interval != 0:
                    continue

                metrics.total_frames_evaluated += 1

                # Detect faces & measure latency
                faces, latency_s = self.detector.detect(frame)
                metrics.total_inference_time_s += latency_s
                metrics.faces_detected_raw += len(faces)

                for face_idx, face in enumerate(faces):
                    crop = face['crop']
                    lap_score = self.calculate_laplacian_variance(crop)

                    if lap_score >= self.config.laplacian_threshold:
                        # Quality Assessment PASS: Save sharp crop
                        metrics.faces_passed_laplacian += 1
                        crop_name = f"{video_stem}_f{frame_idx}_idx{face_idx}_lap{int(lap_score)}.jpg"
                        crop_path = os.path.join(self.config.output_crops_dir, crop_name)
                        cv2.imwrite(crop_path, crop, [cv2.IMWRITE_JPEG_QUALITY, 95])
                    else:
                        # Quality Assessment BLUR: Dropped
                        metrics.faces_dropped_blur += 1

                if self.config.max_frames and metrics.total_frames_evaluated >= self.config.max_frames:
                    logger.info(f"Reached max_frames limit ({self.config.max_frames}). Stopping early.")
                    break

                if metrics.total_frames_evaluated % 50 == 0:
                    logger.info(
                        f"Progress [{video_filename}]: {metrics.total_frames_evaluated} frames evaluated | "
                        f"Raw Faces: {metrics.faces_detected_raw} | Passed: {metrics.faces_passed_laplacian} | "
                        f"Avg Latency: {metrics.avg_inference_latency_ms:.2f} ms ({metrics.estimated_fps:.1f} FPS)"
                    )
        except Exception as e:
            logger.error(f"Exception during processing of video '{video_filename}': {e}", exc_info=True)
        finally:
            cap.release()

        logger.info(
            f"Finished '{video_filename}': Evaluated {metrics.total_frames_evaluated} frames | "
            f"Faces: {metrics.faces_detected_raw} (Pass: {metrics.faces_passed_laplacian}, Drop: {metrics.faces_dropped_blur}, "
            f"Pass Rate: {metrics.laplacian_pass_rate_pct}%) | "
            f"Avg Latency: {metrics.avg_inference_latency_ms:.2f} ms | FPS: {metrics.estimated_fps:.1f}"
        )
        return metrics

    def run_synthetic_test(self, num_frames: int = 30) -> VideoMetrics:
        """
        Runs synthetic frame testing to verify detector and pipeline health when no MP4 is available.
        """
        metrics = VideoMetrics(video_name="synthetic_test_stream.mp4")
        logger.info(f"Running Synthetic Pipeline Test ({num_frames} frames)...")

        for f in range(1, num_frames + 1):
            metrics.total_frames_evaluated += 1
            # Generate 720p synthetic frame
            frame = np.full((720, 1280, 3), (f * 7) % 255, dtype=np.uint8)
            cv2.circle(frame, (640, 360), 100, (200, 180, 160), -1)

            faces, latency_s = self.detector.detect(frame)
            metrics.total_inference_time_s += latency_s
            metrics.faces_detected_raw += len(faces)

            for face_idx, face in enumerate(faces):
                lap_score = self.calculate_laplacian_variance(face['crop'])
                if lap_score >= self.config.laplacian_threshold:
                    metrics.faces_passed_laplacian += 1
                    crop_name = f"synthetic_f{f}_idx{face_idx}_lap{int(lap_score)}.jpg"
                    cv2.imwrite(os.path.join(self.config.output_crops_dir, crop_name), face['crop'])
                else:
                    metrics.faces_dropped_blur += 1

        return metrics

    def log_results_to_csv(self, all_metrics: List[VideoMetrics]):
        csv_path = os.path.join(self.config.output_reports_dir, self.config.csv_filename)
        fieldnames = [
            "video_name",
            "total_frames_evaluated",
            "faces_detected_raw",
            "faces_passed_laplacian",
            "faces_dropped_blur",
            "laplacian_pass_rate_pct",
            "avg_inference_latency_ms",
            "estimated_fps"
        ]

        file_exists = os.path.exists(csv_path)
        with open(csv_path, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()

            for m in all_metrics:
                writer.writerow({
                    "video_name": m.video_name,
                    "total_frames_evaluated": m.total_frames_evaluated,
                    "faces_detected_raw": m.faces_detected_raw,
                    "faces_passed_laplacian": m.faces_passed_laplacian,
                    "faces_dropped_blur": m.faces_dropped_blur,
                    "laplacian_pass_rate_pct": m.laplacian_pass_rate_pct,
                    "avg_inference_latency_ms": m.avg_inference_latency_ms,
                    "estimated_fps": m.estimated_fps
                })

        logger.info(f"✅ Benchmark results successfully recorded to: {csv_path}")

    def run(self):
        all_metrics = []

        if self.config.test_synthetic:
            metrics = self.run_synthetic_test()
            all_metrics.append(metrics)
        elif self.config.video_path:
            metrics = self.process_single_video(self.config.video_path)
            all_metrics.append(metrics)
        else:
            # Discover video files in input_dir
            extensions = ["*.mp4", "*.avi", "*.mkv", "*.mov"]
            video_files = []
            for ext in extensions:
                video_files.extend(glob.glob(os.path.join(self.config.input_dir, ext)))
                video_files.extend(glob.glob(os.path.join(self.config.input_dir, ext.upper())))

            video_files = sorted(list(set(video_files)))

            if not video_files:
                logger.warning(
                    f"No video files found in '{self.config.input_dir}'. "
                    f"Please place CCTV .mp4 files in '{self.config.input_dir}' or specify '--video <path>'. "
                    f"Running a synthetic test instead to verify pipeline health."
                )
                metrics = self.run_synthetic_test(num_frames=20)
                all_metrics.append(metrics)
            else:
                logger.info(f"Discovered {len(video_files)} video(s) in '{self.config.input_dir}'.")
                for video_path in video_files:
                    metrics = self.process_single_video(video_path)
                    all_metrics.append(metrics)

        # Write to CSV
        self.log_results_to_csv(all_metrics)
        self._print_summary_table(all_metrics)

    def _print_summary_table(self, all_metrics: List[VideoMetrics]):
        print("\n" + "=" * 90)
        print("🎯 BENCHMARK SUMMARY REPORT (RetinaFace Edge Module)")
        print("=" * 90)
        print(f"{'Video Name':<28} | {'Frames':<7} | {'Faces':<6} | {'Passed':<6} | {'Blur':<5} | {'Pass%':<6} | {'Latency':<9} | {'FPS':<6}")
        print("-" * 90)
        for m in all_metrics:
            print(
                f"{m.video_name:<28} | {m.total_frames_evaluated:<7} | {m.faces_detected_raw:<6} | "
                f"{m.faces_passed_laplacian:<6} | {m.faces_dropped_blur:<5} | {m.laplacian_pass_rate_pct:<5}% | "
                f"{m.avg_inference_latency_ms:>6.2f} ms | {m.estimated_fps:>5.1f}"
            )
        print("=" * 90 + "\n")


def parse_args() -> BenchmarkConfig:
    parser = argparse.ArgumentParser(
        description="RetinaFace Edge Module Automated Benchmark & Testing Script for Camera Agent Container"
    )
    parser.add_argument(
        "--input-dir", type=str, default="./input_videos",
        help="Path to directory containing CCTV recording .mp4 files (default: ./input_videos)"
    )
    parser.add_argument(
        "--video", type=str, default=None,
        help="Path to a single .mp4 video file to evaluate"
    )
    parser.add_argument(
        "--interval", type=int, default=5,
        help="Evaluate every N-th frame (FRAME_INTERVAL, default: 5)"
    )
    parser.add_argument(
        "--confidence", type=float, default=0.8,
        help="Minimum face detection confidence threshold (default: 0.8)"
    )
    parser.add_argument(
        "--laplacian-threshold", type=float, default=60.0,
        help="Minimum Laplacian variance threshold for sharpness (default: 60.0)"
    )
    parser.add_argument(
        "--pad-ratio", type=float, default=0.15,
        help="Proportional padding ratio around bounding box (default: 0.15 / 15%%)"
    )
    parser.add_argument(
        "--min-face-size", type=int, default=40,
        help="Minimum face width & height in pixels (default: 40)"
    )
    parser.add_argument(
        "--det-size", type=int, default=640,
        help="RetinaFace input resolution (default: 640)"
    )
    parser.add_argument(
        "--output-crops", type=str, default="./edge_output_crops",
        help="Output directory for sharp face crops (default: ./edge_output_crops)"
    )
    parser.add_argument(
        "--output-reports", type=str, default="./edge_reports",
        help="Output directory for CSV reports (default: ./edge_reports)"
    )
    parser.add_argument(
        "--csv-name", type=str, default="benchmark_results.csv",
        help="CSV filename for benchmark metrics (default: benchmark_results.csv)"
    )
    parser.add_argument(
        "--max-frames", type=int, default=None,
        help="Maximum frames to evaluate per video (optional)"
    )
    parser.add_argument(
        "--test-synthetic", action="store_true",
        help="Run synthetic frame test to verify pipeline health without video files"
    )

    args = parser.parse_args()
    return BenchmarkConfig(
        input_dir=args.input_dir,
        video_path=args.video,
        interval=args.interval,
        min_confidence=args.confidence,
        laplacian_threshold=args.laplacian_threshold,
        pad_ratio=args.pad_ratio,
        min_face_size=args.min_face_size,
        det_size=args.det_size,
        output_crops_dir=args.output_crops,
        output_reports_dir=args.output_reports,
        csv_filename=args.csv_name,
        max_frames=args.max_frames,
        test_synthetic=args.test_synthetic
    )


def main():
    config = parse_args()
    benchmark = CameraAgentBenchmark(config)
    benchmark.run()


if __name__ == "__main__":
    main()
