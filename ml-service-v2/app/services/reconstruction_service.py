import time
import torch
import numpy as np
from PIL import Image
from torchvision import transforms
from app.models.stage20b import SkipConnectedAutoencoder, SkipAEConfig
from app.config import settings
import hashlib

class ReconstructionService:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        if settings.require_cuda and self.device.type != "cuda":
            raise RuntimeError("REQUIRE_CUDA is True but CUDA device is not available in torch.")

        checkpoint = torch.load(settings.checkpoint_path, map_location="cpu", weights_only=False)
        
        if "model_config" not in checkpoint:
            raise KeyError("Checkpoint missing model_config")
        if "model_state_dict" not in checkpoint:
            raise KeyError("Checkpoint missing model_state_dict")

        self.config = SkipAEConfig(**checkpoint["model_config"])
        self.model = SkipConnectedAutoencoder(self.config)
        self.model.load_state_dict(checkpoint["model_state_dict"], strict=True)
        self.strict_load_status = True
        self.model = self.model.to(self.device).eval()
        
        with open(settings.checkpoint_path, "rb") as f:
            self.checkpoint_hash = hashlib.sha256(f.read()).hexdigest()

        self.transform = transforms.Compose([
            transforms.Resize((self.config.image_size, self.config.image_size)),
            transforms.ToTensor(),
        ])

    def reconstruct(self, face_rgb: np.ndarray) -> tuple[np.ndarray, float]:
        pil_face = Image.fromarray(face_rgb.astype(np.uint8), mode="RGB")
        tensor = self.transform(pil_face).unsqueeze(0).to(self.device)

        if self.device.type == "cuda":
            torch.cuda.synchronize()
        start = time.perf_counter()

        with torch.inference_mode():
            output = self.model(tensor)
            reconstruction = output[0] if isinstance(output, (tuple, list)) else output
            reconstruction = reconstruction.clamp(0.0, 1.0)

        if self.device.type == "cuda":
            torch.cuda.synchronize()
        elapsed_ms = (time.perf_counter() - start) * 1000.0

        array = (
            reconstruction[0]
            .detach()
            .cpu()
            .permute(1, 2, 0)
            .numpy()
        )
        array = np.clip(array * 255.0, 0, 255).round().astype(np.uint8)
        return array, elapsed_ms
