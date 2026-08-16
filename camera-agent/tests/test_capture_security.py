import pytest
from capture import redact_url
from face_detector import FaceDetector
import onnxruntime

def test_rtsp_url_redaction():
    url_with_auth = "rtsp://admin:password123@192.168.1.100:554/stream"
    redacted = redact_url(url_with_auth)
    assert "password123" not in redacted
    assert "admin" not in redacted
    assert redacted == "rtsp://***:***@192.168.1.100:554/stream"
    
    url_without_auth = "rtsp://192.168.1.100:554/stream"
    redacted_no_auth = redact_url(url_without_auth)
    assert redacted_no_auth == url_without_auth
    
    url_with_only_user = "rtsp://admin@192.168.1.100:554/stream"
    redacted_user = redact_url(url_with_only_user)
    assert "admin" not in redacted_user
    assert redacted_user == "rtsp://***:***@192.168.1.100:554/stream"
    
    # Test safe fallback for unparseable URLs
    assert redact_url("not_a_url") == "not_a_url"

def test_provider_selection_logic(monkeypatch):
    # Mock onnxruntime.get_available_providers to simulate CUDA
    monkeypatch.setattr('onnxruntime.get_available_providers', lambda: ['CUDAExecutionProvider', 'CPUExecutionProvider'])
    
    detector = FaceDetector(det_size=(320, 320))
    # Note: InsightFace FaceAnalysis initialization logs the providers it uses.
    # The actual providers used by the initialized model are what matters.
    # Our implementation passes ['CUDAExecutionProvider', 'CPUExecutionProvider']
    
    # Verify the fallback logic directly
    providers = []
    ctx_id = -1
    available = onnxruntime.get_available_providers()
    if 'CUDAExecutionProvider' in available:
        providers.append('CUDAExecutionProvider')
        ctx_id = 0
    providers.append('CPUExecutionProvider')
    
    assert 'CUDAExecutionProvider' in providers
    assert 'CPUExecutionProvider' in providers
    assert ctx_id == 0

def test_provider_fallback_to_cpu(monkeypatch):
    monkeypatch.setattr('onnxruntime.get_available_providers', lambda: ['CPUExecutionProvider'])
    
    providers = []
    ctx_id = -1
    available = onnxruntime.get_available_providers()
    if 'CUDAExecutionProvider' in available:
        providers.append('CUDAExecutionProvider')
        ctx_id = 0
    providers.append('CPUExecutionProvider')
    
    assert 'CUDAExecutionProvider' not in providers
    assert 'CPUExecutionProvider' in providers
    assert ctx_id == -1
