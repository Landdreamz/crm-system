# Loading Parcel GeoJSON into PostGIS and Exposing an API

After you have normalized GeoJSON files (one per county or combined), you can load them into PostGIS and expose queries by **bbox**, **point**, **address**, or **APN**.

**This repo includes:**  
- **scripts/load_parcels_to_postgis.py** — load GeoJSON into a PostGIS `parcels` table.  
- **parcel_api/** — FastAPI app with `GET /parcels` (bbox), `GET /parcels/point` (lat/lon), `GET /parcels/by-apn`. See **parcel_api/README.md**.

## 1. PostGIS setup

- Install PostgreSQL with PostGIS (e.g. `postgresql` + `postgis` on Ubuntu, or use Docker).
- Create a database and enable PostGIS:

```sql
CREATE DATABASE parcel_db;
\c parcel_db
CREATE EXTENSION IF NOT EXISTS postgis;
```

## 2. Load GeoJSON into PostGIS

### Option A: ogr2ogr (GDAL)

If you have GDAL installed (`ogr2ogr`):

```bash
# Single file
ogr2ogr -f PostgreSQL "PG:dbname=parcel_db" parcels.geojson -nln parcels -append

# Or create table first, then append
ogr2ogr -f PostgreSQL "PG:dbname=parcel_db" parcels.geojson -nln parcels
```

For multiple files (e.g. from `run_crawl_all_counties.py`):

```bash
for f in data/parcels/*.geojson; do
  ogr2ogr -f PostgreSQL "PG:dbname=parcel_db" "$f" -nln parcels -append
done
```

### Option B: Python (psycopg2 + GeoJSON)

Create a table, then insert from your normalized GeoJSON:

```sql
CREATE TABLE parcels (
  id SERIAL PRIMARY KEY,
  apn TEXT,
  address TEXT,
  owner TEXT,
  acres NUMERIC,
  legal_desc TEXT,
  market_value NUMERIC,
  state TEXT,
  county TEXT,
  geom GEOMETRY(MultiPolygon, 4326)
);
CREATE INDEX idx_parcels_geom ON parcels USING GIST(geom);
CREATE INDEX idx_parcels_apn ON parcels(apn);
CREATE INDEX idx_parcels_state_county ON parcels(state, county);
```

Python snippet to load one GeoJSON file:

```python
import json
import psycopg2
from psycopg2.extras import Json

conn = psycopg2.connect("dbname=parcel_db user=... password=...")
with open("parcels.geojson") as f:
    fc = json.load(f)

with conn.cursor() as cur:
    for feat in fc.get("features", []):
        props = feat.get("properties") or {}
        geom = feat.get("geometry")
        if not geom:
            continue
        # WKT or GeoJSON for geom; PostGIS accepts ST_GeomFromGeoJSON(...)
        cur.execute(
            """
            INSERT INTO parcels (apn, address, owner, acres, legal_desc, market_value, geom)
            VALUES (%s, %s, %s, %s, %s, %s, ST_GeomFromGeoJSON(%s))
            """,
            (
                props.get("apn"),
                props.get("address"),
                props.get("owner"),
                props.get("acres"),
                props.get("legal_desc"),
                props.get("market_value"),
                json.dumps(geom),
            ),
        )
conn.commit()
```

Adjust column names to match your normalized schema; add `state`/`county` if you store them.

## 3. Expose an API (by bbox, point, APN)

Use any HTTP framework. Example with **FastAPI**:

```python
# parcel_api.py (example)
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
import psycopg2
from psycopg2.extras import RealDictCursor
import json

app = FastAPI()
DB = "dbname=parcel_db user=... password=..."

@app.get("/parcels")
def parcels_bbox(
    min_lon: float = Query(...),
    min_lat: float = Query(...),
    max_lon: float = Query(...),
    max_lat: float = Query(...),
):
    """Return parcels in a bounding box (GeoJSON FeatureCollection)."""
    conn = psycopg2.connect(DB)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT apn, address, owner, acres, legal_desc, market_value,
                   ST_AsGeoJSON(geom)::json AS geometry
            FROM parcels
            WHERE geom && ST_MakeEnvelope(%s, %s, %s, %s, 4326)
            LIMIT 500
            """,
            (min_lon, min_lat, max_lon, max_lat),
        )
        rows = cur.fetchall()
    conn.close()
    features = []
    for r in rows:
        geom = r.pop("geometry")
        features.append({"type": "Feature", "properties": dict(r), "geometry": geom})
    return {"type": "FeatureCollection", "features": features}


@app.get("/parcels/point")
def parcels_point(lat: float = Query(...), lon: float = Query(...)):
    """Return parcel(s) at a point (point-in-polygon)."""
    conn = psycopg2.connect(DB)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT apn, address, owner, acres, legal_desc, market_value,
                   ST_AsGeoJSON(geom)::json AS geometry
            FROM parcels
            WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
            LIMIT 5
            """,
            (lon, lat),
        )
        rows = cur.fetchall()
    conn.close()
    features = []
    for r in rows:
        geom = r.pop("geometry")
        features.append({"type": "Feature", "properties": dict(r), "geometry": geom})
    return {"type": "FeatureCollection", "features": features}


@app.get("/parcels/by-apn")
def parcels_apn(apn: str = Query(...), state: str = Query(None), county: str = Query(None)):
    """Look up parcel by APN (optionally narrow by state/county)."""
    conn = psycopg2.connect(DB)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if state and county:
            cur.execute(
                """
                SELECT apn, address, owner, acres, legal_desc, market_value,
                       ST_AsGeoJSON(geom)::json AS geometry
                FROM parcels WHERE apn = %s AND state = %s AND county = %s
                """,
                (apn, state, county),
            )
        else:
            cur.execute(
                """
                SELECT apn, address, owner, acres, legal_desc, market_value,
                       ST_AsGeoJSON(geom)::json AS geometry
                FROM parcels WHERE apn = %s LIMIT 5
                """,
                (apn,),
            )
        rows = cur.fetchall()
    conn.close()
    features = []
    for r in rows:
        geom = r.pop("geometry")
        features.append({"type": "Feature", "properties": dict(r), "geometry": geom})
    return {"type": "FeatureCollection", "features": features}
```

- **By address:** Geocode the address to lat/lon (e.g. Census, Photon), then call the point-in-polygon endpoint above.

Run with: `uvicorn parcel_api:app --reload`. You then have:

- `GET /parcels?min_lon=...&min_lat=...&max_lon=...&max_lat=...` — by bbox  
- `GET /parcels/point?lat=...&lon=...` — by point  
- `GET /parcels/by-apn?apn=...&state=...&county=...` — by APN  

Return format is GeoJSON FeatureCollection so the CRM (or any client) can use it for map popups and lists.
