import sys
import platform

def verify_runtime():
    print(f"Python Version: {platform.python_version()}")

    try:
        import cv2
        print(f"OpenCV: {cv2.__version__}")
    except ImportError as e:
        print(f"Failed to import cv2: {e}")
        sys.exit(1)

    try:
        import insightface
        print(f"InsightFace: {insightface.__version__}")
    except ImportError as e:
        print(f"Failed to import insightface: {e}")
        sys.exit(1)

    try:
        import onnxruntime
        print(f"ONNX Runtime: {onnxruntime.__version__}")
        available = onnxruntime.get_available_providers()
        print(f"Available Providers: {available}")
    except ImportError as e:
        print(f"Failed to import onnxruntime: {e}")
        sys.exit(1)

    # Initialize Buffalo_L detector
    print("Initializing Buffalo_L face detector...")
    try:
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from face_detector import FaceDetector

        detector = FaceDetector(det_size=(640, 640), min_confidence=0.5)
        print("Buffalo_L initialization result: SUCCESS")

        # Check selected provider
        # FaceAnalysis loads models into app.models
        providers_used = set()
        for model_name, model in detector.app.models.items():
            sess = getattr(model, 'session', None)
            if sess:
                providers_used.update(sess.get_providers())

        print(f"Selected Provider(s): {providers_used}")
        if any('CUDA' in p for p in providers_used):
            print("Status: GPU is actually being used")
        else:
            print("Status: CPU is actually being used")

    except Exception as e:
        print(f"Buffalo_L initialization result: FAILED - {e}")
        sys.exit(1)

    print("Runtime verification passed.")
    sys.exit(0)

if __name__ == "__main__":
    verify_runtime()
