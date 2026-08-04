from app.services.inference_service import InferenceService
from app.config import settings

class DummyInferenceService(InferenceService):
    def __init__(self):
        pass

def test_decision_policy_high():
    svc = DummyInferenceService()
    decision = svc._make_decision("A", settings.high_threshold + 0.1, settings.margin_threshold + 0.1)
    assert decision == "HIGH_PRIORITY_CANDIDATE"

def test_decision_policy_possible():
    svc = DummyInferenceService()
    decision = svc._make_decision("A", settings.possible_threshold + 0.05, 0.01)
    assert decision == "POSSIBLE_MATCH"

def test_decision_policy_unknown():
    svc = DummyInferenceService()
    decision = svc._make_decision("A", 0.1, 0.1)
    assert decision == "UNKNOWN"

def test_decision_policy_no_face():
    svc = DummyInferenceService()
    decision = svc._make_decision(None, None, None)
    assert decision == "NO_VALID_FACE"
