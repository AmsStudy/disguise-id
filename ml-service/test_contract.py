import pytest
from fastapi.testclient import TestClient
from main import app
import numpy as np
from PIL import Image
import io

client = TestClient(app)

def generate_dummy_image():
    img = Image.new('RGB', (224, 224), color='red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    return img_byte_arr

def test_embed_endpoint():
    img = generate_dummy_image()
    response = client.post(
        "/embed",
        files={"image": ("test.jpg", img, "image/jpeg")}
    )

    assert response.status_code == 200
    data = response.json()
    assert "face_detected" in data
    assert "embedding" in data
    assert "confidence" in data

    if data["face_detected"]:
        assert data["embedding"] is not None
        assert len(data["embedding"]) == 128
        assert data["confidence"] is None

def test_process_frame_endpoint():
    img = generate_dummy_image()
    response = client.post(
        "/process-frame",
        files={"frame": ("test.jpg", img, "image/jpeg")}
    )

    assert response.status_code == 200
    data = response.json()
    assert "face_detected" in data
    assert "embedding" in data
    assert "confidence" in data
    assert "processing_ms" in data

    if data["face_detected"]:
        assert data["embedding"] is not None
        assert len(data["embedding"]) == 128
        assert data["confidence"] is None
        assert isinstance(data["processing_ms"], (int, float))

def test_invalid_image():
    response = client.post(
        "/embed",
        files={"image": ("test.txt", b"not an image", "text/plain")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["face_detected"] is False
    assert data["embedding"] is None
    assert data["confidence"] is None
