# Menggunakan base image disguise-id yang sudah berisi PyTorch & CUDA 12.1
FROM disguise-id:latest

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Salin file requirements.txt dan install dependencies tambahan (onnx, onnx2torch, dll)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Salin seluruh source code ML Service
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
