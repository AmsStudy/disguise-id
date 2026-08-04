# ml-service/Dockerfile
# Base image: CUDA 12.1 + Python 3.11 (kompatibel dengan RTX 4050 / Ada Lovelace)
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

# Cegah interactive prompt saat apt install
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install Python dan tools dasar
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-pip \
    python3.11-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set python3.11 sebagai default
RUN ln -sf /usr/bin/python3.11 /usr/bin/python3
RUN ln -sf /usr/bin/pip3 /usr/bin/pip

WORKDIR /app

# Install PyTorch dulu (versi CUDA 12.1)
RUN pip install --no-cache-dir \
    torch==2.2.0+cu121 \
    torchvision==0.17.0+cu121 \
    --index-url https://download.pytorch.org/whl/cu121

# Install FastAPI dan dependencies ML
RUN pip install --no-cache-dir \
    fastapi==0.110.0 \
    uvicorn[standard]==0.27.0 \
    facenet-pytorch==2.6.0 \
    Pillow==10.2.0 \
    numpy==1.26.4 \
    python-multipart==0.0.9

# Copy source code
COPY main.py .

# Buat folder untuk model file
RUN mkdir -p /app/models

# Health check
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Jalankan dengan uvicorn
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--log-level", "info"]
