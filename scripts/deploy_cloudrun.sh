#!/usr/bin/env bash
# Deploy CardioClarity (dashboard + real-model API, one container) to Google Cloud Run.
#
#   gcloud auth login
#   PROJECT=<your-project-id> scripts/deploy_cloudrun.sh
#
# Cloud Build builds the root Dockerfile from the source upload (.gcloudignore), so no local Docker is needed.
# Settings: 2 vCPU / 2 GiB (5x the API's measured peak of ~0.4 GB per worker, two workers), one copy always running
# (no cold start for the first visitor), up to 3 copies under load, startup CPU boost.
set -euo pipefail

PROJECT="${PROJECT:?set PROJECT to your Google Cloud project id}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-cardioclarity}"

gcloud config set project "$PROJECT"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --cpu 2 --memory 2Gi \
  --min-instances 1 --max-instances 3 \
  --concurrency 8 \
  --cpu-boost \
  --timeout 120 \
  --quiet

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format 'value(status.url)')"
curl --fail --silent "$URL/health" && echo
echo "Live demo: $URL (the Service URL above works too)"
