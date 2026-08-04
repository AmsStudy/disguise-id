import os
import hashlib
import time
import numpy as np
import pandas as pd
from PIL import Image, ImageOps
from pathlib import Path
from app.config import settings
from app.services.arcface_service import ArcFaceService
import threading

class GalleryService:
    def __init__(self, arcface_service: ArcFaceService):
        self.arcface = arcface_service
        self.prototypes: dict[str, np.ndarray] = {}
        self.gallery_version: str = "uninitialized"
        self.identities_count: int = 0
        self.valid_images_count: int = 0
        self.failed_images_count: int = 0
        self.loaded_at: str = "uninitialized"
        self._lock = threading.Lock()

    def _read_image_exif_safe(self, path: Path) -> Image.Image:
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {path}")
        with Image.open(path) as image:
            return ImageOps.exif_transpose(image).convert("RGB")

    def _resolve_gallery_path(self, csv_path: Path, value: str) -> Path:
        path = Path(str(value))
        if not path.is_absolute():
            path = csv_path.parent / path
        return path.resolve()

    def load_gallery(self):
        with self._lock:
            csv_path = Path(settings.gallery_csv_path).expanduser().resolve()
            if not csv_path.exists():
                raise FileNotFoundError(f"Gallery CSV not found at {csv_path}")

            dataframe = pd.read_csv(csv_path)
            required = {"identity_id", "image_path"}
            missing = required.difference(dataframe.columns)
            if missing:
                raise ValueError(f"Gallery CSV must have columns {sorted(required)}. Missing: {sorted(missing)}")

            embeddings_by_identity: dict[str, list[np.ndarray]] = {}
            valid_images = 0
            failed_images = 0

            # Compute content hash
            hasher = hashlib.sha256()
            
            for index, row in dataframe.iterrows():
                identity_id = str(row["identity_id"]).strip()
                image_path = self._resolve_gallery_path(csv_path, row["image_path"])

                try:
                    image_rgb = np.asarray(self._read_image_exif_safe(image_path))
                    embedding, metadata = self.arcface.detect_and_extract(image_rgb)
                    if embedding is not None:
                        embeddings_by_identity.setdefault(identity_id, []).append(embedding)
                        valid_images += 1
                        hasher.update(embedding.tobytes())
                    else:
                        failed_images += 1
                except Exception as e:
                    # Ignore failed images, similar to original audit logic
                    failed_images += 1

            if not embeddings_by_identity:
                raise RuntimeError("No valid gallery embeddings could be built.")

            new_prototypes = {}
            for identity_id, vectors in embeddings_by_identity.items():
                prototype = np.mean(np.vstack(vectors), axis=0)
                prototype_norm = np.linalg.norm(prototype)
                if prototype_norm <= 0 or not np.isfinite(prototype_norm):
                    continue
                new_prototypes[identity_id] = (prototype / prototype_norm).astype(np.float32)

            # Atomic swap
            self.prototypes = new_prototypes
            self.identities_count = len(self.prototypes)
            self.valid_images_count = valid_images
            self.failed_images_count = failed_images
            self.loaded_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            
            model_ver = "stage20b-seed2026"
            content_hash = hasher.hexdigest()[:8]
            self.gallery_version = f"{model_ver}_{content_hash}_{self.identities_count}_{self.valid_images_count}"

    def rank_identities(self, query_embedding: np.ndarray, top_k: int) -> list[dict]:
        with self._lock:
            if not self.prototypes:
                return []
                
            ranked = [
                {
                    "identity_id": identity_id,
                    "cosine_similarity": float(np.dot(query_embedding, prototype)),
                }
                for identity_id, prototype in self.prototypes.items()
            ]
            ranked.sort(key=lambda item: item["cosine_similarity"], reverse=True)

            for rank, item in enumerate(ranked, start=1):
                item["rank"] = rank

            return ranked[: min(top_k, len(ranked))]
