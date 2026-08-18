from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image, ImageOps
import io
import uuid
import asyncio

import app.dependencies as deps
from app.config import settings
from app.security import get_api_key
from app.services.arcface_service import ArcFaceService
from app.services.reconstruction_service import ReconstructionService
from app.services.gallery_service import GalleryService
from app.services.inference_service import InferenceService
from app.schemas import InferenceResponse, EmbeddingResponse, FrameProcessResponse
import time

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize models and gallery exactly once on startup
    deps._arcface_service = ArcFaceService()
    deps._reconstruction_service = ReconstructionService()
    deps._gallery_service = GalleryService(deps._arcface_service)
    
    # Global semaphore for inference concurrency
    app.state.inference_semaphore = asyncio.Semaphore(1)
    
    try:
        deps._gallery_service.load_gallery()
    except Exception as e:
        print(f"WARNING: Gallery could not be loaded at startup: {e}")
        # Not failing startup to allow /v2/gallery/reload to fix it later,
        # but we can also fail if it's a strict requirement. The user requested 
        # "Gagal startup jika checkpoint tidak kompatibel." but didn't explicitly say gallery.
        
    yield
    # Cleanup
    pass

app = FastAPI(
    title="ML Service V2 (Stage 20B + ArcFace)",
    version="2.0.0",
    lifespan=lifespan
)

@app.get("/health")
def health_check():
    model_ready = deps._reconstruction_service is not None
    arcface_ready = deps._arcface_service is not None
    gallery_ready = deps._gallery_service is not None and deps._gallery_service.identities_count > 0
    overall = "ok" if model_ready and arcface_ready and gallery_ready else "degraded"
    
    return {
        "status": overall,
        "version": "2.0.0",
        "model_ready": model_ready,
        "arcface_ready": arcface_ready,
        "gallery_ready": gallery_ready,
        "torch_device": str(deps._reconstruction_service.device) if model_ready else None,
        "arcface_provider": deps._arcface_service.providers[0] if arcface_ready else None
    }

@app.get("/v2/model-info", dependencies=[Depends(get_api_key)])
def model_info():
    import torch
    import onnxruntime as ort
    
    gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    cuda_version = torch.version.cuda
    
    return {
        "model_version": "stage20b-seed2026-arcface-buffalo_l",
        "arcface_model": settings.arcface_model,
        "require_cuda": settings.require_cuda,
        "checkpoint_hash": deps._reconstruction_service.checkpoint_hash if deps._reconstruction_service else None,
        "strict_load_status": deps._reconstruction_service.strict_load_status if deps._reconstruction_service else None,
        "torch_version": torch.__version__,
        "cuda_version": cuda_version,
        "gpu_name": gpu_name,
        "onnxruntime_version": ort.__version__,
        "arcface_provider": deps._arcface_service.providers[0] if deps._arcface_service else None,
        "embedding_dimension": 512,
        "thresholds": {
            "possible": settings.possible_threshold,
            "high": settings.high_threshold,
            "margin": settings.margin_threshold,
        },
        "gallery_version": deps.get_gallery_service().gallery_version,
        "gallery_identities": deps.get_gallery_service().identities_count,
        "gallery_valid_images": deps.get_gallery_service().valid_images_count,
    }

@app.post("/v2/gallery/reload", dependencies=[Depends(get_api_key)])
def reload_gallery():
    try:
        deps.get_gallery_service().load_gallery()
        return {
            "status": "success",
            "gallery_version": deps.get_gallery_service().gallery_version,
            "identities": deps.get_gallery_service().identities_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gallery reload failed: {str(e)}")

@app.post("/v2/infer-face", response_model=InferenceResponse, dependencies=[Depends(get_api_key)])
async def infer_face(
    face_crop: UploadFile = File(...),
    organization_id: str = Form(...),
    camera_id: str = Form(...),
    camera_session_id: str = Form(...),
    track_id: str = Form(...),
    captured_at: str = Form(...),
    frame_number: int = Form(...),
    bounding_box_json: str = Form(...),
    landmarks_json: str = Form(None),
    detection_score: float = Form(None),
    quality_score: float = Form(None),
    return_server_embedding: bool = Form(False)
):
    # Gallery check is handled gracefully inside InferenceService (returns no_match instead of 503)

    if face_crop.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"INVALID_IMAGE: Unsupported MIME type {face_crop.content_type}")

    file_bytes = await face_crop.read()
    if len(file_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="INVALID_IMAGE: File too large")

    try:
        image = Image.open(io.BytesIO(file_bytes))
        image = ImageOps.exif_transpose(image).convert("RGB")
        image_rgb = np.asarray(image)
    except Exception:
        raise HTTPException(status_code=400, detail="INVALID_IMAGE: Cannot decode image")

    metadata = {
        "request_id": str(uuid.uuid4()),
        "organization_id": organization_id,
        "camera_id": camera_id,
        "camera_session_id": camera_session_id,
        "track_id": track_id,
        "captured_at": captured_at,
        "frame_number": frame_number,
    }

    try:
        async with app.state.inference_semaphore:
            inference_svc = InferenceService(
                deps.get_arcface_service(),
                deps.get_reconstruction_service(),
                deps.get_gallery_service()
            )
            response = inference_svc.process_frame(image_rgb, metadata, return_server_embedding=return_server_embedding)
        return response
    except ValueError as e:
        if str(e) == "ORG_GALLERY_NOT_LOADED":
            return JSONResponse(
                status_code=200,
                content={
                    "status": "no_match",
                    "matched": False,
                    "reason": "gallery_empty",
                    "top_matches": [],
                    "embedding": None,
                    "message": "No watchlist data loaded for this organization. Please add persons via the Watchlist menu."
                }
            )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"INTERNAL_INFERENCE_ERROR: {str(e)}")

@app.post("/v2/embed", response_model=EmbeddingResponse, dependencies=[Depends(get_api_key)])
async def embed_endpoint(image: UploadFile = File(...)):
    """
    Extracts a 512-dim embedding from an image using ArcFace.
    This is used during DPO enrollment.
    """
    if deps.get_arcface_service() is None:
        raise HTTPException(status_code=503, detail="Model is not ready")

    try:
        file_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(file_bytes))
        pil_image = ImageOps.exif_transpose(pil_image).convert("RGB")
        image_rgb = np.asarray(pil_image)

        embedding, metadata = deps.get_arcface_service().detect_and_extract(image_rgb)
        
        if embedding is not None:
            return EmbeddingResponse(
                face_detected=True,
                embedding=embedding.tolist(),
                confidence=metadata.get("det_score")
            )
        else:
            return EmbeddingResponse(face_detected=False, embedding=None, confidence=None)
    except Exception as e:
        print(f"Error in /v2/embed: {e}")
        return EmbeddingResponse(face_detected=False, embedding=None, confidence=None)

@app.post("/v2/process-frame", response_model=FrameProcessResponse, dependencies=[Depends(get_api_key)])
async def process_frame_endpoint(frame: UploadFile = File(...)):
    """
    Processes a face crop from CCTV and returns both original and reconstructed embeddings.
    """
    if deps.get_arcface_service() is None or deps.get_reconstruction_service() is None:
        raise HTTPException(status_code=503, detail="Models are not ready")

    start_time = time.perf_counter()
    try:
        file_bytes = await frame.read()
        pil_image = Image.open(io.BytesIO(file_bytes))
        pil_image = ImageOps.exif_transpose(pil_image).convert("RGB")
        image_rgb = np.asarray(pil_image)

        # 1. Original Embedding
        orig_embed, orig_meta = deps.get_arcface_service().detect_and_extract(image_rgb)
        
        orig_embedding_list = orig_embed.tolist() if orig_embed is not None else None
        confidence = orig_meta.get("det_score") if orig_meta else None
        face_detected = orig_embed is not None

        # 2. Reconstructed Embedding
        recon_embedding_list = None
        if face_detected:
            recon_rgb, _ = deps.get_reconstruction_service().reconstruct(image_rgb)
            recon_embed, _ = deps.get_arcface_service().detect_and_extract(recon_rgb)
            recon_embedding_list = recon_embed.tolist() if recon_embed is not None else None

        processing_ms = (time.perf_counter() - start_time) * 1000.0

        return FrameProcessResponse(
            face_detected=face_detected,
            original_embedding=orig_embedding_list,
            reconstructed_embedding=recon_embedding_list,
            confidence=confidence,
            processing_ms=processing_ms
        )
    except Exception as e:
        print(f"Error in /v2/process-frame: {e}")
        processing_ms = (time.perf_counter() - start_time) * 1000.0
        return FrameProcessResponse(
            face_detected=False,
            original_embedding=None,
            reconstructed_embedding=None,
            confidence=None,
            processing_ms=processing_ms
        )
