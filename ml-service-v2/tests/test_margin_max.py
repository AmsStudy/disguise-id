from app.services.inference_service import InferenceService
from app.schemas import BranchResult

class DummyInferenceService(InferenceService):
    def __init__(self):
        pass

def test_margin_max_original_better():
    svc = DummyInferenceService()
    orig = BranchResult(valid=True, candidate_id="A", score=0.9, margin=0.5)
    recon = BranchResult(valid=True, candidate_id="B", score=0.8, margin=0.4)
    sel = svc._choose_margin_max(orig, recon)
    assert sel["selected_branch"] == "original"

def test_margin_max_reconstructed_better():
    svc = DummyInferenceService()
    orig = BranchResult(valid=True, candidate_id="A", score=0.8, margin=0.4)
    recon = BranchResult(valid=True, candidate_id="B", score=0.9, margin=0.5)
    sel = svc._choose_margin_max(orig, recon)
    assert sel["selected_branch"] == "reconstructed"

def test_margin_max_fallback_invalid_recon():
    svc = DummyInferenceService()
    orig = BranchResult(valid=True, candidate_id="A", score=0.8, margin=0.4)
    recon = BranchResult(valid=False, candidate_id=None, score=None, margin=None)
    sel = svc._choose_margin_max(orig, recon)
    assert sel["selected_branch"] == "original"

def test_margin_max_tie():
    svc = DummyInferenceService()
    orig = BranchResult(valid=True, candidate_id="A", score=0.9, margin=0.5)
    recon = BranchResult(valid=True, candidate_id="B", score=0.9, margin=0.5)
    sel = svc._choose_margin_max(orig, recon)
    # Reconstructed needs to be > original to win. Tie goes to original
    assert sel["selected_branch"] == "original"
