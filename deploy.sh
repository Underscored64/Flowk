#!/usr/bin/env bash
# Run ON THE SERVER, inside the project folder: ./deploy.sh
set -euo pipefail
git pull --ff-only
docker compose up -d --build
docker compose ps
echo "Deployed. Logs: docker compose logs -f web worker"
