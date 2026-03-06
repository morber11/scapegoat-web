#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
IMAGE_NAME="${IMAGE_NAME:-scapegoat-web}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$PROJECT_DIR"

echo "[build-and-deploy] Using compose file: $COMPOSE_FILE"
echo "[build-and-deploy] Image name: $IMAGE_NAME"

echo "[build-and-deploy] Stopping existing compose project (if any)..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans || true

echo "[build-and-deploy] Building and starting containers..."
docker compose -f "$COMPOSE_FILE" up -d --build "$@"

echo "[build-and-deploy] Done. To follow logs run: docker compose -f $COMPOSE_FILE logs -f"

exit 0
