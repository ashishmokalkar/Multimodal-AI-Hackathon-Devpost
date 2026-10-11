# CardioClarity: one container serves the 3D dashboard and the real-model API from the same origin.
# Used for the live demo on Google Cloud Run (see README, "Live demo"); runs anywhere that sets $PORT (default 8080).

# ---- 1. build the dashboard ------------------------------------------------------------------------------------
FROM node:24-slim AS web
WORKDIR /web
RUN corepack enable
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm install --frozen-lockfile
COPY frontend/ ./
# "/" makes the dashboard call the API on its own origin
ENV VITE_API_BASE_URL=/
RUN COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm build

# ---- 2. serve it with the API ----------------------------------------------------------------------------------
# Python 3.11 with the pinned requirements: the exported models are pickles tied to these versions.
FROM python:3.11.9-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONWARNINGS=ignore \
    OMP_NUM_THREADS=1 \
    CARDIOCLARITY_WEB_DIR=/home/user/app/web
WORKDIR /home/user/app

COPY --chown=user requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user api ./api
COPY --chown=user ml ./ml
COPY --chown=user models ./models
COPY --chown=user data/raw/z_alizadeh_sani_ext ./data/raw/z_alizadeh_sani_ext
COPY --chown=user reports/v2/s9 ./reports/v2/s9
COPY --chown=user --from=web /web/dist ./web

# one worker per CPU, so a second visitor does not wait for the first visitor's explanation
ENV WEB_WORKERS=2
EXPOSE 8080
CMD exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8080}" --workers "${WEB_WORKERS}"
