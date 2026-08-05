"""
main.py

Backend FastAPI untuk sistem DISGUISE-ID -- SESUAI DENGAN MODEL YANG
BENAR-BENAR DILATIH (bukan template generik).

PERBEDAAN PENTING dari versi sebelumnya:
    1. Ukuran gambar 224x224 (BUKAN 128x128) -- harus sama persis
       dengan yang dipakai saat training (data_pipeline.py).
    2. Arsitektur encoder SAMA PERSIS dengan model_vae.py yang dipakai
       untuk training -- MobileNetV2 + shared_dense + 2 cabang
       (identity, attribute), BUKAN Conv2D buatan sederhana.
    3. TIDAK ADA classifier biner "is_dpo_target" -- model kita TIDAK
       PERNAH dilatih untuk itu. Cara kerja yang BENAR:
           a. ENROLLMENT: foto DPO diubah jadi embedding (Z_identity),
              disimpan ke "galeri".
           b. DETEKSI: foto CCTV diubah jadi embedding juga, lalu
              JARAKNYA dibandingkan ke SEMUA entri galeri.
           c. Kandidat dengan jarak TERKECIL yang ditampilkan (top-N),
              BUKAN 1 angka "ya/tidak" dari classifier.
       Ini PERSIS logika yang sudah diuji lewat system_simulation.py
       sepanjang proses riset -- endpoint di sini cuma "membungkus"
       logika yang sama supaya bisa diakses lewat HTTP oleh backend lain.

CATATAN PENTING SOAL GALERI (DATABASE):
    Untuk KESEDERHANAAN, galeri DPO di sini disimpan sebagai file JSON
    lokal (dpo_gallery.json) -- SAMA seperti yang dipakai
    system_simulation.py selama riset. UNTUK PRODUKSI SUNGGUHAN,
    ganti ini dengan database sungguhan (PostgreSQL/MySQL/dst) --
    lihat catatan "
    perlu diganti.

CARA MENJALANKAN:
    pip install fastapi uvicorn python-multipart pillow requests
    python main.py
    (server berjalan di http://localhost:8000, dokumentasi otomatis
     di http://localhost:8000/docs)
"""

import os
import json
import numpy as np
from io import BytesIO
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from pydantic import BaseModel, Field
from typing import Optional, List
import time
import uvicorn
import requests

import torch
import onnx2torch

app = FastAPI(title="ML Service - Disguise ID (VAE)")

IMAGE_SIZE = (224, 224, 3)
Z_IDENTITY_DIM = 128
Z_ATTRIBUTE_DIM = 64

MODEL_CHECKPOINT_PATH = os.path.join("models", "disguise_id_encoder_full_model.pth")

THRESHOLD_TINGGI = 3.5
THRESHOLD_SEDANG = 4.5
MAX_DISTANCE_FOR_ZERO_PERCENT = 8.0
MARGIN_DOWNGRADE_THRESHOLD = 15.0

GALLERY_FILE = "dpo_gallery.json"
TOP_K = 3

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[INFO] Menggunakan device: {DEVICE}")

vae_model = None

try:
    print(f"[INFO] Memuat model dari {MODEL_CHECKPOINT_PATH}...")
    vae_model = torch.load(MODEL_CHECKPOINT_PATH, map_location=DEVICE, weights_only=False)
    vae_model.eval()
    print("[INFO] Model berhasil dimuat dan siap digunakan!")
except Exception as e:
    print(f"[ERROR] Gagal memuat model: {e}")
    vae_model = None

def preprocess_image(image_bytes: bytes) -> torch.Tensor:
    """
    Normalisasi ke rentang [0, 1] dan ubah menjadi tensor PyTorch (1, 224, 224, 3).
    """
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    image = image.resize((IMAGE_SIZE[1], IMAGE_SIZE[0]))

    img_array = np.array(image, dtype=np.float32) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return torch.tensor(img_array, dtype=torch.float32, device=DEVICE)


def compute_embedding(image_bytes: bytes) -> np.ndarray:
    """Mengubah foto jadi Z_identity (embedding 128 dimensi)."""
    input_tensor = preprocess_image(image_bytes)
    with torch.no_grad():
        outputs = vae_model(input_tensor)
        return outputs.cpu().numpy()[0]

def load_gallery() -> dict:
    if os.path.exists(GALLERY_FILE):
        with open(GALLERY_FILE, "r") as f:
            return json.load(f)
    return {}


def save_gallery(gallery: dict):
    with open(GALLERY_FILE, "w") as f:
        json.dump(gallery, f, indent=2)


def classify_confidence_tier(distance: float) -> str:
    if distance <= THRESHOLD_TINGGI:
        return "TINGGI"
    elif distance <= THRESHOLD_SEDANG:
        return "SEDANG"
    return "RENDAH"


def distance_to_percentage(distance: float) -> float:
    pct = 100 * (1 - distance / MAX_DISTANCE_FOR_ZERO_PERCENT)
    return max(0.0, min(100.0, pct))






class EnrollResponse(BaseModel):
    success: bool
    dpo_id: str
    message: str


class DetectionCandidate(BaseModel):
    dpo_id: str
    nama: str
    kasus: str
    persentase_kemiripan: float
    jarak: float


class DetectionResponse(BaseModel):
    success: bool
    tier: str
    tier_sebelum_margin_check: str
    margin_relatif: float
    kandidat: list[DetectionCandidate]






@app.get("/")
def health_check():
    return {"status": "ML Service is running", "model_loaded": vae_model is not None}


@app.post("/enroll", response_model=EnrollResponse)
async def enroll_dpo(
    dpo_id: str = Form(...),
    nama: str = Form(...),
    kasus: str = Form(""),
    file: UploadFile = File(...),
):
    """
    TAHAP ENROLLMENT: admin upload foto DPO (idealnya foto CLEAN/jelas).
    Sistem hitung embedding-nya, simpan ke galeri.

    Ini MENGGANTIKAN endpoint "/predict" versi lama yang salah konsep --
    model kita TIDAK bisa langsung "memprediksi DPO atau bukan" dari 1
    foto saja, HARUS ada tahap enrollment dulu sebagai pembanding.
    """
    if vae_model is None:
        raise HTTPException(status_code=500, detail="Model belum siap/gagal dimuat.")

    try:
        image_bytes = await file.read()
        embedding = compute_embedding(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memproses gambar: {e}")

    gallery = load_gallery()
    gallery[dpo_id] = {
        "nama": nama,
        "kasus": kasus,
        "embedding": embedding.tolist(),
    }
    save_gallery(gallery)

    return EnrollResponse(success=True, dpo_id=dpo_id, message=f"DPO '{nama}' berhasil didaftarkan.")


@app.post("/detect", response_model=DetectionResponse)
async def detect(
    file: UploadFile = File(None),
    image_url: Optional[str] = Form(None),
):
    """
    TAHAP DETEKSI: foto (dari CCTV/upload) dibandingkan ke SEMUA entri
    galeri, dikembalikan TOP-K kandidat paling mirip beserta tingkat
    kepercayaan -- BUKAN 1 angka "ya/tidak" biner.

    Logika tier & margin-check di sini SAMA PERSIS dengan
    system_simulation.py yang sudah divalidasi ekstensif selama riset.
    """
    if vae_model is None:
        raise HTTPException(status_code=500, detail="Model belum siap/gagal dimuat.")

    gallery = load_gallery()
    if not gallery:
        raise HTTPException(status_code=400, detail="Galeri DPO masih kosong. Lakukan enrollment dulu.")

    image_bytes = None
    if file:
        image_bytes = await file.read()
    elif image_url:
        try:
            response = requests.get(image_url)
            response.raise_for_status()
            image_bytes = response.content
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Gagal mengunduh gambar dari URL: {e}")
    else:
        raise HTTPException(status_code=400, detail="Harus mengirimkan 'file' atau 'image_url'.")

    try:
        query_embedding = compute_embedding(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memproses gambar: {e}")


    results = []
    for dpo_id, data in gallery.items():
        gallery_embedding = np.array(data["embedding"])
        dist = float(np.linalg.norm(query_embedding - gallery_embedding))
        results.append({
            "dpo_id": dpo_id,
            "nama": data["nama"],
            "kasus": data.get("kasus", ""),
            "jarak": dist,
            "persentase_kemiripan": distance_to_percentage(dist),
        })

    results.sort(key=lambda r: r["jarak"])
    top_results = results[:TOP_K]

    best = top_results[0]
    tier_asli = classify_confidence_tier(best["jarak"])



    if len(results) >= 2:
        second = results[1]
        margin = max(0.0, (second["jarak"] - best["jarak"]) / second["jarak"]) * 100
    else:
        margin = 100.0

    tier = tier_asli
    if margin < MARGIN_DOWNGRADE_THRESHOLD:
        if tier == "TINGGI":
            tier = "SEDANG"
        elif tier == "SEDANG":
            tier = "RENDAH"

    return DetectionResponse(
        success=True,
        tier=tier,
        tier_sebelum_margin_check=tier_asli,
        margin_relatif=round(margin, 2),
        kandidat=[
            DetectionCandidate(
                dpo_id=r["dpo_id"], nama=r["nama"], kasus=r["kasus"],
                persentase_kemiripan=round(r["persentase_kemiripan"], 1),
                jarak=round(r["jarak"], 4),
            ) for r in top_results
        ],
    )


class EmbeddingResponse(BaseModel):
    face_detected: bool
    embedding: Optional[List[float]] = Field(None, max_length=128, min_length=128)
    confidence: Optional[float] = None

class FrameProcessResponse(EmbeddingResponse):
    processing_ms: float

@app.post("/embed", response_model=EmbeddingResponse)
async def embed_endpoint(image: UploadFile = File(...)):
    """
    V1 Compatibility Endpoint: Extracts 128-dim embedding from a face crop.
    This endpoint assumes the input is a valid face crop.
    """
    if vae_model is None:
        raise HTTPException(status_code=503, detail="Model is not ready")

    try:
        image_bytes = await image.read()
        embedding = compute_embedding(image_bytes)
        return EmbeddingResponse(
            face_detected=True, # Implicitly true since input is assumed to be a face crop
            embedding=embedding.tolist(),
            confidence=None # VAE model does not produce a detection confidence
        )
    except Exception as e:
        return EmbeddingResponse(
            face_detected=False,
            embedding=None,
            confidence=None
        )

@app.post("/process-frame", response_model=FrameProcessResponse)
async def process_frame_endpoint(frame: UploadFile = File(...)):
    """
    V1 Compatibility Endpoint: Processes a face crop and returns the embedding.
    """
    if vae_model is None:
        raise HTTPException(status_code=503, detail="Model is not ready")

    start_time = time.time()
    try:
        image_bytes = await frame.read()
        embedding = compute_embedding(image_bytes)
        processing_ms = (time.time() - start_time) * 1000
        return FrameProcessResponse(
            face_detected=True,
            embedding=embedding.tolist(),
            confidence=None,
            processing_ms=processing_ms
        )
    except Exception as e:
        processing_ms = (time.time() - start_time) * 1000
        return FrameProcessResponse(
            face_detected=False,
            embedding=None,
            confidence=None,
            processing_ms=processing_ms
        )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
