#!/bin/bash
# Expose backend (port 8000) to the internet so Twilio can reach the Voice URL.
# Run from project root:  ./backend/tunnel.sh
# Then set your TwiML App Voice URL to:  https://<printed-host>/api/twilio/voice/
set -e
cd "$(dirname "$0")/.."
echo "Ensure the backend is running on port 8000 (e.g. cd backend && ./venv/bin/python manage.py runserver 0.0.0.0:8000)"
echo "Starting tunnel to http://localhost:8000 ..."
npx --yes localtunnel --port 8000
