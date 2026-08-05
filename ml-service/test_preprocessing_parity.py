import pytest
from fastapi.testclient import TestClient
from main import app, compute_embedding
import numpy as np
from PIL import Image
import io
import torch

client = TestClient(app)

def generate_dummy_image():
    img = Image.new('RGB', (224, 224), color='green')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    return img_byte_arr

def test_preprocessing_parity():
    """
    Test that the legacy internal `compute_embedding` directly produces
    the exact same embedding as calling the `/embed` compatibility endpoint.
    This guarantees that the pgvector distances won't drift.
    """
    img_bytes = generate_dummy_image().read()

    # Legacy way
    legacy_embedding = compute_embedding(img_bytes)

    # New endpoint way
    response = client.post(
        "/embed",
        files={"image": ("test.jpg", img_bytes, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["face_detected"] is True
    endpoint_embedding = np.array(data["embedding"])

    # Compare
    distance = np.linalg.norm(legacy_embedding - endpoint_embedding)
    assert distance < 1e-5, f"Embeddings drifted! Distance: {distance}"
