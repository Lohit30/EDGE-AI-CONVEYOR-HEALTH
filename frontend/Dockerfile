# =============================================================================
# Frontend Dockerfile — React + Vite (Node 20 LTS)
# =============================================================================
# Development-only container. The Vite dev server provides hot module
# replacement (HMR) via the volume mount defined in docker-compose.yml.
#
# NOTE: This Dockerfile is a placeholder. The React app will be scaffolded
# in a later phase. The container starts a dev server once package.json
# and src/ exist.
# =============================================================================

FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files first for better layer caching.
# If they don't exist yet this COPY is a no-op — that's intentional during
# the bootstrap phase.
COPY package*.json ./

# Install dependencies only if package.json is present
RUN if [ -f package.json ]; then npm ci; fi

# Copy the rest of the source code
COPY . .

# Expose Vite dev server port
EXPOSE 3000

# Start Vite dev server, binding to all interfaces so Docker port mapping works.
# --host 0.0.0.0 is required inside a container.
CMD ["sh", "-c", "if [ -f package.json ]; then npm run dev -- --host 0.0.0.0; else echo 'Frontend source not yet scaffolded. Keeping container alive.' && tail -f /dev/null; fi"]
