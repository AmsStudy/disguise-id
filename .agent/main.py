# ml-service/main.py
# =====================================================================
# DISGUISE-ID — ML Service (FastAPI + PyTorch + CUDA)
# Dijalankan di Docker container dengan akses RTX 4050 laptop
# =====================================================================
# Endpoint yang disediakan:
#   GET  /health  — cek service + GPU status
#   POST /embed   — terima gambar wajah, return embedding 512-dim
# =====================================================================

import os
import io
import time
import logging
import torch
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
from torchvision import transforms
from facenet_pytorch import InceptionResnetV1, MTCNN

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ml-service")

# ── Konfigurasi ──────────────────────────────────────────────────────
MODEL_PATH = os.getenv("MODEL_PATH", "/app/models/best_verification_model.pth")
DEVICE_ENV = os.getenv("DEVICE", "cuda")
THRESHOLD  = float(os.getenv("THRESHOLD", "0.5703"))

# Pilih device — fallback ke CPU kalau CUDA tidak tersedia
if DEVICE_ENV == "cuda" and torch.cuda.is_available():
    DEVICE = torch.device("cuda")
    log.info(f"✅ GPU aktif: {torch.cuda.get_device_name(0)}")
else:
    DEVICE = torch.device("cpu")
    log.warning("⚠️ GPU tidak tersedia, menggunakan CPU (lebih lambat)")

app = FastAPI(title="DISGUISE-ID ML Service", version="1.0.0")

# ── Load model saat startup ────────────────────────────────────────
log.info("Loading InceptionResnetV1...")

model = InceptionResnetV1(pretrained="vggface2", classify=False).to(DEVICE)

# Load fine-tuned weights kalau file ada
if os.path.exists(MODEL_PATH):
    try:
        state_dict = torch.load(MODEL_PATH, map_location=DEVICE)
        model.load_state_dict(state_dict)
        log.info(f"✅ Fine-tuned model dimuat dari: {MODEL_PATH}")
    except Exception as e:
        log.warning(f"⚠️ Gagal load custom model ({e}), pakai pretrained VGGFace2")
else:
    log.info(f"Model file tidak ada di {MODEL_PATH}, pakai pretrained VGGFace2")

model.eval()

# MTCNN untuk deteksi & crop wajah (fallback kalau Pi tidak crop dulu)
mtcnn = MTCNN(
    image_size=160,
    margin=20,
    post_process=True,
    select_largest=True,
    keep_all=False,
    device=DEVICE,
)

# Transform untuk gambar yang SUDAH di-crop (dari Pi)
transform_cropped = transforms.Compose([
    transforms.Resize((160, 160)),
    transforms.ToTensor(),
])

def facenet_preprocess(tensor: torch.Tensor) -> torch.Tensor:
    """Preprocessing standar InceptionResnetV1 VGGFace2."""
    return (tensor * 255.0 - 127.5) / 128.0


# ── Endpoints ─────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    gpu_info = {}
    if torch.cuda.is_available():
        gpu_info = {
            "name": torch.cuda.get_device_name(0),
            "memory_total_mb": round(torch.cuda.get_device_properties(0).total_memory / 1024**2),
            "memory_used_mb": round(torch.cuda.memory_allocated(0) / 1024**2),
        }
    return {
        "status": "ok",
        "service": "DISGUISE-ID ML Service",
        "device": str(DEVICE),
        "gpu": gpu_info,
        "threshold": THRESHOLD,
        "model_path": MODEL_PATH,
        "model_loaded": os.path.exists(MODEL_PATH),
    }


@app.post("/embed")
async def embed(image: UploadFile = File(...)):
    """
    Terima gambar wajah (JPEG/PNG), return embedding 512-dimensi.

    Gambar yang diterima dari Pi sudah di-crop sekitar wajah (160x160).
    Kalau gambar belum di-crop, MTCNN akan coba deteksi otomatis.

    Request: multipart/form-data { image: file }
    Response: {
      embedding: [float x 512],
      processing_ms: int,
      device: string
    }
    """
    t_start = time.time()

    # Validasi file
    if image.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(400, f"Tipe file tidak didukung: {image.content_type}")

    try:
        content = await image.read()
        img = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception as e:
        raise HTTPException(400, f"Gagal baca gambar: {e}")

    try:
        with torch.no_grad():
            # Coba MTCNN dulu untuk detect & crop yang proper
            face_tensor = mtcnn(img)

            if face_tensor is None:
                # MTCNN tidak deteksi wajah — asumsikan gambar sudah di-crop
                # (kasus normal dari Pi yang sudah crop sebelum kirim)
                face_tensor = transform_cropped(img)

            # Pastikan shape benar: (3, 160, 160)
            if face_tensor.ndim == 3:
                face_tensor = face_tensor.unsqueeze(0)  # tambah batch dim

            face_tensor = face_tensor.to(DEVICE)
            face_preprocessed = facenet_preprocess(face_tensor)

            embedding = model(face_preprocessed)  # shape: (1, 512)
            embedding_np = embedding.squeeze(0).cpu().numpy()

            # Normalisasi L2 (pastikan unit vector)
            norm = np.linalg.norm(embedding_np)
            if norm > 0:
                embedding_np = embedding_np / norm

    except Exception as e:
        log.error(f"Error saat compute embedding: {e}")
        raise HTTPException(500, f"Gagal compute embedding: {e}")

    ms = round((time.time() - t_start) * 1000)
    log.info(f"Embedding selesai dalam {ms}ms ({DEVICE})")

    return JSONResponse({
        "embedding": embedding_np.tolist(),
        "processing_ms": ms,
        "device": str(DEVICE),
        "embedding_dim": len(embedding_np),
    })


@app.post("/compare")
async def compare(
    image_a: UploadFile = File(...),
    image_b: UploadFile = File(...),
):
    """
    Bandingkan dua gambar wajah, return similarity score.
    Endpoint bantu untuk debugging & testing.
    """
    async def get_embedding(upload: UploadFile) -> np.ndarray:
        content = await upload.read()
        img = Image.open(io.BytesIO(content)).convert("RGB")
        face = mtcnn(img)
        if face is None:
            face = transform_cropped(img)
        if face.ndim == 3:
            face = face.unsqueeze(0)
        face = facenet_preprocess(face.to(DEVICE))
        with torch.no_grad():
            emb = model(face).squeeze(0).cpu().numpy()
        norm = np.linalg.norm(emb)
        return emb / norm if norm > 0 else emb

    emb_a = await get_embedding(image_a)
    emb_b = await get_embedding(image_b)
    similarity = float(np.dot(emb_a, emb_b))

    return {
        "similarity": round(similarity, 6),
        "threshold": THRESHOLD,
        "is_match": similarity >= THRESHOLD,
    }
