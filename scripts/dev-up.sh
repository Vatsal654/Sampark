#!/usr/bin/env bash
# Purpose: One-command local startup — infra containers, migrations, seed
# data, and the API + worker processes. See docs/LOCAL_DEVELOPMENT.md.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Starting infrastructure (Postgres, Redis, MinIO)..."
docker compose -f infra/docker/docker-compose.yml up -d

echo "==> Waiting for Postgres to be healthy..."
until docker compose -f infra/docker/docker-compose.yml exec -T postgres pg_isready -U sampark >/dev/null 2>&1; do
  sleep 1
done

for app in services/api services/worker apps/scanner-portal apps/admin; do
  if [ ! -f "$app/.env" ] && [ -f "$app/.env.example" ]; then
    cp "$app/.env.example" "$app/.env"
    echo "==> Created $app/.env from .env.example"
  fi
  if [ ! -f "$app/.env.local" ] && [ -f "$app/.env.example" ] && [ "$app" != "services/api" ] && [ "$app" != "services/worker" ]; then
    cp "$app/.env.example" "$app/.env.local"
  fi
done

echo "==> Installing dependencies..."
npm install

echo "==> Building shared packages..."
npm run build --workspace packages/shared-config --workspace packages/shared-security --workspace packages/api-contracts

echo "==> Running database migrations..."
npm run migration:run --workspace services/api

echo "==> Seeding development data..."
npm run seed --workspace services/api

echo "==> Starting API and worker (Ctrl+C to stop)..."
npx concurrently -n api,worker -c blue,green \
  "npm run start:dev --workspace services/api" \
  "npm run start:dev --workspace services/worker"
