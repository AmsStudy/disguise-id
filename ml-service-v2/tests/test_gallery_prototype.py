import pytest
import numpy as np
from app.services.gallery_service import GalleryService

class DummyArcFace:
    def detect_and_extract(self, img):
        # mock embedding
        return np.array([0.5, 0.5, 0.5]), {}

def test_gallery_rank():
    svc = GalleryService(DummyArcFace())
    svc.prototypes_by_org = {
        "org1": {
            "A": np.array([1.0, 0.0, 0.0]),
            "B": np.array([0.0, 1.0, 0.0])
        }
    }

    ranked = svc.rank_identities("org1", np.array([1.0, 0.0, 0.0]), top_k=2)
    assert ranked[0]["identity_id"] == "A"
    assert ranked[0]["cosine_similarity"] > 0.99

    assert ranked[1]["identity_id"] == "B"
    assert ranked[1]["cosine_similarity"] < 0.01

def test_gallery_missing_org():
    svc = GalleryService(DummyArcFace())
    svc.prototypes_by_org = {
        "org1": {
            "A": np.array([1.0, 0.0, 0.0])
        }
    }

    with pytest.raises(ValueError, match="ORG_GALLERY_NOT_LOADED"):
        svc.rank_identities("org2", np.array([1.0, 0.0, 0.0]), top_k=2)

def test_gallery_empty_org():
    svc = GalleryService(DummyArcFace())
    svc.prototypes_by_org = {
        "org1": {}
    }

    with pytest.raises(ValueError, match="ORG_GALLERY_NOT_LOADED"):
        svc.rank_identities("org1", np.array([1.0, 0.0, 0.0]), top_k=2)
