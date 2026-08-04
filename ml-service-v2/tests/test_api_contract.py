from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_no_auth():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200

def test_model_info_no_auth():
    with TestClient(app) as client:
        response = client.get("/v2/model-info")
        assert response.status_code == 401

def test_infer_face_invalid_image():
    # requires auth, assuming we set ML_SERVICE_API_KEY in tests
    pass

def test_infer_face_missing_gallery():
    pass
