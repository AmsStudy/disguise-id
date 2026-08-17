import numpy as np
from app.config import settings
from app.schemas import InferenceResponse, BranchResult
from app.services.arcface_service import ArcFaceService
from app.services.reconstruction_service import ReconstructionService
from app.services.gallery_service import GalleryService
import time

class InferenceService:
    def __init__(self, arcface: ArcFaceService, recon: ReconstructionService, gallery: GalleryService):
        self.arcface = arcface
        self.recon = recon
        self.gallery = gallery

    def _choose_margin_max(self, orig: BranchResult, recon: BranchResult) -> dict:
        if recon.valid and recon.margin is not None:
            if orig.margin is None or recon.margin > orig.margin:
                return {
                    "selected_branch": "reconstructed",
                    "candidate_id": recon.candidate_id,
                    "score": recon.score,
                    "margin": recon.margin,
                }
        
        return {
            "selected_branch": "original",
            "candidate_id": orig.candidate_id,
            "score": orig.score,
            "margin": orig.margin,
        }

    def _make_decision(self, identity, score: float | None, margin: float | None) -> str:
        if identity is None or score is None:
            return "NO_VALID_FACE"
        if score >= settings.high_threshold and margin is not None and margin >= settings.margin_threshold:
            return "HIGH_PRIORITY_CANDIDATE"
        if score >= settings.possible_threshold:
            return "POSSIBLE_MATCH"
        return "UNKNOWN"

    def process_frame(self, image_rgb: np.ndarray, metadata: dict, return_server_embedding: bool = False) -> InferenceResponse:
        start_time = time.perf_counter()
        
        organization_id = metadata.get("organization_id", "").strip()
        if not organization_id:
            raise ValueError("organization_id is required for inference")

        orig_res = BranchResult(valid=False)
        recon_res = BranchResult(valid=False)

        # 1. Original Branch
        face_crop_rgb, crop_meta = self.arcface.crop_primary_face(image_rgb, settings.face_margin)
        
        if face_crop_rgb is None:
            # NO FACE DETECTED
            return self._build_response(orig_res, recon_res, start_time, metadata)

        try:
            orig_embed, orig_meta = self.arcface.detect_and_extract(face_crop_rgb)
            if orig_embed is not None:
                if return_server_embedding:
                    orig_res.server_embedding = orig_embed.tolist()
                ranked = self.gallery.rank_identities(organization_id, orig_embed, settings.top_k)
                if ranked:
                    orig_res.valid = True
                    orig_res.candidate_id = ranked[0]["identity_id"]
                    orig_res.score = ranked[0]["cosine_similarity"]
                    if len(ranked) > 1:
                        orig_res.second_score = ranked[1]["cosine_similarity"]
                        orig_res.margin = orig_res.score - orig_res.second_score
                    orig_res.detection_score = orig_meta["det_score"]
        except Exception as e:
            orig_res.error = f"ORIGINAL_EMBEDDING_FAILED: {str(e)}"

        # 2. Reconstruction Branch
        try:
            recon_rgb, recon_ms = self.recon.reconstruct(face_crop_rgb)
            recon_res.reconstruction_ms = recon_ms
            
            recon_embed, recon_meta = self.arcface.detect_and_extract(recon_rgb)
            if recon_embed is not None:
                recon_ranked = self.gallery.rank_identities(organization_id, recon_embed, settings.top_k)
                if recon_ranked:
                    recon_res.valid = True
                    recon_res.candidate_id = recon_ranked[0]["identity_id"]
                    recon_res.score = recon_ranked[0]["cosine_similarity"]
                    if len(recon_ranked) > 1:
                        recon_res.second_score = recon_ranked[1]["cosine_similarity"]
                        recon_res.margin = recon_res.score - recon_res.second_score
                    recon_res.detection_score = recon_meta["det_score"]
            else:
                recon_res.error = "RECONSTRUCTED_FACE_NOT_DETECTED"
        except Exception as e:
            recon_res.error = f"RECONSTRUCTION_FAILED: {str(e)}"

        return self._build_response(orig_res, recon_res, start_time, metadata)

    def _build_response(self, orig: BranchResult, recon: BranchResult, start_time: float, metadata: dict) -> InferenceResponse:
        selection = self._choose_margin_max(orig, recon)
        decision = self._make_decision(
            selection["candidate_id"], 
            selection["score"], 
            selection["margin"]
        )
        
        proc_ms = (time.perf_counter() - start_time) * 1000.0

        return InferenceResponse(
            request_id=metadata.get("request_id", "req_unknown"),
            organization_id=metadata.get("organization_id", ""),
            camera_id=metadata.get("camera_id", ""),
            camera_session_id=metadata.get("camera_session_id", ""),
            track_id=metadata.get("track_id", ""),
            model_version="stage20b-seed2026-arcface-buffalo_l",
            gallery_version=self.gallery.gallery_version,
            original=orig,
            reconstructed=recon,
            selected_branch=selection.get("selected_branch"),
            candidate_id=selection.get("candidate_id"),
            score=selection.get("score"),
            margin=selection.get("margin"),
            frame_decision=decision,
            processing_ms=proc_ms,
            requires_operator_verification=(decision in ["HIGH_PRIORITY_CANDIDATE", "POSSIBLE_MATCH"])
        )
