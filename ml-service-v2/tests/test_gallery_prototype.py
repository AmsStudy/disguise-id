import pytest
import numpy as np
from app.services.gallery_service import GalleryService

class DummyArcFace:
    def detect_and_extract(self, img):
        # mock embedding
        return np.array([0.5, 0.5, 0.5]), {}

def test_gallery_rank():
    svc = GalleryService(DummyArcFace())
    svc.prototypes = {
        "A": np.array([1.0, 0.0, 0.0]),
        "B": np.array([0.0, 1.0, 0.0])
    }
    
    ranked = svc.rank_identities(np.array([1.0, 0.0, 0.0]), top_k=2)
    assert ranked[0]["identity_id"] == "A"
    assert ranked[0]["cosine_similarity"] > 0.99
    
    assert ranked[1]["identity_id"] == "B"
    assert ranked[1]["cosine_similarity"] < 0.01
