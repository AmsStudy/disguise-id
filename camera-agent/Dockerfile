FROM python:3.10-slim

# Prevent interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

# Install system dependencies (FFmpeg for stream push & build-essential for ARM64 compilation)
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
    ffmpeg \
    libglib2.0-0 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Run the camera agent
CMD ["python", "main.py"]
