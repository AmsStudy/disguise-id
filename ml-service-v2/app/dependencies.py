from app.services.arcface_service import ArcFaceService
from app.services.reconstruction_service import ReconstructionService
from app.services.gallery_service import GalleryService

# Globals to be initialized during app startup
_arcface_service: ArcFaceService = None
_reconstruction_service: ReconstructionService = None
_gallery_service: GalleryService = None

def get_arcface_service() -> ArcFaceService:
    if _arcface_service is None:
        raise RuntimeError("ArcFaceService not initialized")
    return _arcface_service

def get_reconstruction_service() -> ReconstructionService:
    if _reconstruction_service is None:
        raise RuntimeError("ReconstructionService not initialized")
    return _reconstruction_service

def get_gallery_service() -> GalleryService:
    if _gallery_service is None:
        raise RuntimeError("GalleryService not initialized")
    return _gallery_service
