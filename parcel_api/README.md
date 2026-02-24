# Parcel API

FastAPI service that queries PostGIS parcel data. Returns GeoJSON FeatureCollection for use in maps or other clients.

## Quick start (no PostGIS required)

APN search works out of the box using built-in demo data. From the repo root:

```bash
cd parcel_api
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8001
```

Then in the CRM, open the **Parcel API** tab and search for APN **1144400040007** or **0280490000034** to see demo results. The frontend already points to `http://localhost:8001` by default.

## Prerequisites (for full data)

- PostgreSQL with PostGIS (e.g. `CREATE DATABASE parcel_db; \c parcel_db; CREATE EXTENSION postgis;`)
- Parcel data loaded via `scripts/load_parcels_to_postgis.py`

## Setup

```bash
cd parcel_api
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your PostGIS connection (optional; demo runs without it)
```

## Load data (from repo root)

```bash
# Ensure you have GeoJSON (e.g. from Step 2 crawler)
python scripts/load_parcels_to_postgis.py data/parcels/TX_Harris.geojson --state TX --county Harris
```

## Run the API

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8001
```

- **Docs:** http://localhost:8001/docs  
- **Bbox:** `GET /parcels?min_lon=-95.5&min_lat=29.6&max_lon=-95.0&max_lat=30.0`  
- **Point:** `GET /parcels/point?lat=29.76&lon=-95.36`  
- **APN:** `GET /parcels/by-apn?apn=0280490000034`

Response is GeoJSON `FeatureCollection` so the CRM map (or any client) can display parcels.

**Show parcels on the Parcel API tab map:** In the CRM frontend, set `REACT_APP_PARCEL_API_URL=http://localhost:8001` in `.env` (or `.env.local`) and restart the frontend. The map will fetch parcels for the current view and show clickable polygons with APN, address, owner, etc.

---

## Real APN data from your county (no PostGIS required)

To get **real** parcel info when you search by APN (instead of demo data), point the API at your county’s ArcGIS Feature Server:

1. Find your county’s parcel layer URL (e.g. Harris County: `https://gis.hctx.net/arcgis/rest/services/Property/Property/FeatureServer/0`). It must end in `FeatureServer/0` or similar — no `/query`.
2. In `parcel_api/.env` add:
   ```bash
   PARCEL_ARCGIS_LAYER_URL=https://gis.hctx.net/arcgis/rest/services/Property/Property/FeatureServer/0
   ```
   (Replace with your county’s URL if different.)
3. Restart the Parcel API (`uvicorn app:app --reload --port 8001`).

The API will query the county service by APN and return real address, owner, value, etc. If your county uses a different field name for APN (e.g. `ACCT_NUM`, `ParcelNo`), set it explicitly:

```bash
PARCEL_ARCGIS_APN_FIELD=ACCT_NUM
```
