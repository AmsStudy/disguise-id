import sys
import platform

def verify_runtime():
    print(f"Python Version: {platform.python_version()}")
    try:
        import insightface
        print(f"InsightFace: {insightface.__version__}")
    except ImportError as e:
        print(f"Failed to import insightface: {e}")
        sys.exit(1)
        
    try:
        import onnxruntime
        print(f"ONNX Runtime: {onnxruntime.__version__}")
        print(f"Available Providers: {onnxruntime.get_available_providers()}")
    except ImportError as e:
        print(f"Failed to import onnxruntime: {e}")
        sys.exit(1)
        
    try:
        import cv2
        print(f"OpenCV: {cv2.__version__}")
    except ImportError as e:
        print(f"Failed to import cv2: {e}")
        sys.exit(1)
        
    print("Runtime verification passed.")
    sys.exit(0)

if __name__ == "__main__":
    verify_runtime()
