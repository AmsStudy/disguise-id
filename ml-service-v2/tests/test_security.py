from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.config import settings
from app.security import get_api_key


security_test_app = FastAPI()


@security_test_app.get(
    "/protected",
    dependencies=[Depends(get_api_key)],
)
def protected_endpoint() -> dict[str, bool]:
    return {"authenticated": True}


client = TestClient(security_test_app)


def test_security_valid_key() -> None:
    response = client.get(
        "/protected",
        headers={
            "x-api-key": settings.ml_service_api_key,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"authenticated": True}


def test_security_invalid_key() -> None:
    response = client.get(
        "/protected",
        headers={
            "x-api-key": "invalid-development-key",
        },
    )

    assert response.status_code in {401, 403}


def test_security_missing_key() -> None:
    response = client.get("/protected")

    assert response.status_code in {401, 403}