#!/usr/bin/env bash
# Start Parcel API so APN search works in the CRM (uses demo data if PostGIS not configured)
cd "$(dirname "$0")"
pip3 install -q -r requirements.txt 2>/dev/null || pip install -q -r requirements.txt 2>/dev/null
exec python3 -m uvicorn app:app --reload --host 0.0.0.0 --port 8001
