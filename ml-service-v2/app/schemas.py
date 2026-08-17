from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class BranchResult(BaseModel):
    valid: bool = False
    candidate_id: Optional[str] = None
    score: Optional[float] = None
    second_score: Optional[float] = None
    margin: Optional[float] = None
    detection_score: Optional[float] = None
    reconstruction_ms: Optional[float] = None
    server_embedding: Optional[List[float]] = None
    error: Optional[str] = None

class InferenceResponse(BaseModel):
    request_id: str
    organization_id: str
    camera_id: str
    camera_session_id: str
    track_id: str

    model_version: str
    gallery_version: str

    original: BranchResult
    reconstructed: BranchResult

    selected_branch: Optional[str] = None
    candidate_id: Optional[str] = None
    score: Optional[float] = None
    margin: Optional[float] = None

    frame_decision: str
    processing_ms: float
    requires_operator_verification: bool = True

class EmbeddingResponse(BaseModel):
    face_detected: bool
    embedding: Optional[List[float]] = Field(None, max_length=512, min_length=512)
    confidence: Optional[float] = None

class FrameProcessResponse(BaseModel):
    face_detected: bool
    original_embedding: Optional[List[float]] = Field(None, max_length=512, min_length=512)
    reconstructed_embedding: Optional[List[float]] = Field(None, max_length=512, min_length=512)
    confidence: Optional[float] = None
    processing_ms: float
