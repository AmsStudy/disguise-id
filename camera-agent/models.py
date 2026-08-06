from pydantic import BaseModel
from typing import Optional, List

class BBox(BaseModel):
    x: int
    y: int
    w: int
    h: int

class FrameDimensions(BaseModel):
    w: int
    h: int

class DetectedFace(BaseModel):
    confidence: float
    bbox: BBox
    face_crop_bytes: bytes  # JPEG encoded
    
class ProcessedFrame(BaseModel):
    timestamp: str
    frame_dimensions: FrameDimensions
    frame_thumb_bytes: bytes  # JPEG encoded thumbnail of full frame
    faces: List[DetectedFace]
