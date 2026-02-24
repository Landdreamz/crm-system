#!/usr/bin/env bash
# Run PostGIS + load data + start Parcel API (use from repo root).
# Prereqs: Docker (for PostGIS) or existing PostgreSQL with PostGIS.

set -e
cd "$(dirname "$0")/.."

echo "==> Checking for PostGIS (Docker or local)..."
if command -v docker &>/dev/null && docker compose version &>/dev/null; then
  docker compose up -d
  echo "Waiting for Postgres..."
  sleep 5
  docker compose exec -T postgis psql -U postgres -d parcel_db -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || true
  export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/parcel_db"
elif [ -n "$DATABASE_URL" ]; then
  echo "Using DATABASE_URL from environment"
else
  export PARCEL_DB_HOST="${PARCEL_DB_HOST:-localhost}"
  export PARCEL_DB_PORT="${PARCEL_DB_PORT:-5432}"
  export PARCEL_DB_NAME="${PARCEL_DB_NAME:-parcel_db}"
  export PARCEL_DB_USER="${PARCEL_DB_USER:-postgres}"
  export PARCEL_DB_PASSWORD="${PARCEL_DB_PASSWORD:-postgres}"
  echo "Using Postgres at $PARCEL_DB_HOST:$PARCEL_DB_PORT (set DATABASE_URL or PARCEL_DB_* to override)"
fi

if [ -f "data/parcels/TX_Harris.geojson" ]; then
  echo "==> Loading parcels into PostGIS..."
  python3 scripts/load_parcels_to_postgis.py data/parcels/TX_Harris.geojson --state TX --county Harris 2>/dev/null || echo "(Load failed — is Postgres running with PostGIS?)"
else
  echo "==> No data/parcels/TX_Harris.geojson — run crawler first (see scripts/README.md)"
fi

echo "==> Starting Parcel API on http://localhost:8001"
cd parcel_api
pip install -q -r requirements.txt 2>/dev/null || true
exec uvicorn app:app --host 0.0.0.0 --port 8001
