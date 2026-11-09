# =============================================================================
# Backend Dockerfile — FastAPI (Python 3.12)
# =============================================================================
# Multi-arch base image (linux/amd64 + linux/arm64) so this runs on both
# a development machine and a Raspberry Pi without changes.
# =============================================================================

FROM python:3.12-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies (minimal; add more as needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definition first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Start Uvicorn with hot-reload enabled (development mode).
# For production, remove --reload and add workers: --workers 4
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
