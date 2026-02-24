"""
Parcel API — query PostGIS parcels by bbox, point, or APN.
Run: uvicorn app:app --reload --host 0.0.0.0 --port 8001

Data sources (first available wins for by-apn):
  1. PostGIS: set DATABASE_URL or PARCEL_DB_* and load data via scripts/load_parcels_to_postgis.py.
  2. County ArcGIS: set PARCEL_ARCGIS_LAYER_URL (and optionally PARCEL_ARCGIS_APN_FIELD) for real APN lookup.
  3. Demo: demo_parcels.geojson in this folder.
"""
import json
import os
import urllib.parse
from contextlib import contextmanager
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor

try:
    import requests
except ImportError:
    requests = None

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Demo mode: serve from a GeoJSON file when PostGIS is not available
_demo_features: list = []


def _load_demo_geojson():
    global _demo_features
    path = os.environ.get("PARCEL_DEMO_GEJSON")
    if path:
        p = Path(__file__).resolve().parent / path
        if not p.exists():
            p = Path(path)
    else:
        p = Path(__file__).resolve().parent / "demo_parcels.geojson"
    if not p.exists():
        return
    try:
        with open(p) as f:
            data = json.load(f)
        _demo_features = (data.get("features") or [])[:500]
    except Exception:
        _demo_features = []


# Load demo data at startup so API works without PostGIS
_load_demo_geojson()


def _bbox_of_geom(geom):
    if not geom or not geom.get("coordinates"):
        return None
    coords = geom["coordinates"]
    if geom.get("type") == "Point":
        return (coords[0], coords[1], coords[0], coords[1])
    if geom.get("type") == "Polygon":
        flat = [c for ring in coords for c in ring]
    elif geom.get("type") == "MultiPolygon":
        flat = [c for poly in coords for ring in poly for c in ring]
    else:
        return None
    lons = [c[0] for c in flat]
    lats = [c[1] for c in flat]
    return (min(lons), min(lats), max(lons), max(lats))


def _bbox_intersects(a, b):
    return not (a[2] < b[0] or a[0] > b[2] or a[3] < b[1] or a[1] > b[3])


app = FastAPI(
    title="Parcel API",
    description="Query parcels by bbox, point, or APN. GeoJSON FeatureCollection.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db_conn():
    url = os.environ.get("DATABASE_URL")
    if url:
        return psycopg2.connect(url)
    return psycopg2.connect(
        host=os.environ.get("PARCEL_DB_HOST", "localhost"),
        port=os.environ.get("PARCEL_DB_PORT", "5432"),
        dbname=os.environ.get("PARCEL_DB_NAME", "parcel_db"),
        user=os.environ.get("PARCEL_DB_USER", "postgres"),
        password=os.environ.get("PARCEL_DB_PASSWORD", ""),
    )


@contextmanager
def db_cursor():
    conn = get_db_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
        conn.commit()
    finally:
        conn.close()


def row_to_feature(r):
    geom = r.pop("geometry", None)
    return {"type": "Feature", "properties": dict(r), "geometry": geom}


@app.get("/")
def root():
    return {
        "message": "Parcel API",
        "docs": "/docs",
        "endpoints": {
            "parcels_bbox": "GET /parcels?min_lon=&min_lat=&max_lon=&max_lat=",
            "parcels_point": "GET /parcels/point?lat=&lon=",
            "parcels_by_apn": "GET /parcels/by-apn?apn=&state=&county=",
        },
    }


def _demo_bbox(min_lon: float, min_lat: float, max_lon: float, max_lat: float, limit: int):
    """Return demo features whose geometry intersects the bbox."""
    b = (min_lon, min_lat, max_lon, max_lat)
    out = []
    for f in _demo_features:
        box = _bbox_of_geom(f.get("geometry"))
        if box and _bbox_intersects(box, b):
            out.append(f)
            if len(out) >= limit:
                break
    return out


@app.get("/parcels")
def parcels_bbox(
    min_lon: float = Query(..., description="Min longitude"),
    min_lat: float = Query(..., description="Min latitude"),
    max_lon: float = Query(..., description="Max longitude"),
    max_lat: float = Query(..., description="Max latitude"),
    limit: int = Query(500, le=2000),
):
    """Return parcels in a bounding box (GeoJSON FeatureCollection). Uses PostGIS or demo data."""
    try:
        with db_cursor() as cur:
            cur.execute(
                """
                SELECT apn, address, owner, acres, legal_desc, market_value, state, county,
                       ST_AsGeoJSON(geom)::json AS geometry
                FROM parcels
                WHERE geom && ST_MakeEnvelope(%s, %s, %s, %s, 4326)
                LIMIT %s
                """,
                (min_lon, min_lat, max_lon, max_lat, limit),
            )
            rows = cur.fetchall()
        features = [row_to_feature(dict(r)) for r in rows]
    except psycopg2.OperationalError:
        features = _demo_bbox(min_lon, min_lat, max_lon, max_lat, limit)
    return {"type": "FeatureCollection", "features": features}


@app.get("/parcels/point")
def parcels_point(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    limit: int = Query(5, le=20),
):
    """Return parcel(s) at a point (point-in-polygon). Uses PostGIS or demo data."""
    try:
        with db_cursor() as cur:
            cur.execute(
                """
                SELECT apn, address, owner, acres, legal_desc, market_value, state, county,
                       ST_AsGeoJSON(geom)::json AS geometry
                FROM parcels
                WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                LIMIT %s
                """,
                (lon, lat, limit),
            )
            rows = cur.fetchall()
        features = [row_to_feature(dict(r)) for r in rows]
    except psycopg2.OperationalError:
        # Demo: return parcels whose bbox contains the point (simple containment)
        features = _demo_bbox(lon - 0.001, lat - 0.001, lon + 0.001, lat + 0.001, limit)
    return {"type": "FeatureCollection", "features": features}


def _normalize_apn(s: str) -> str:
    """Strip non-digits so 11-444-000-40007 and 1144400040007 match."""
    return "".join(c for c in (s or "") if c.isdigit())


# ArcGIS: common county field names for APN (try in order)
ARCGIS_APN_FIELD_CANDIDATES = [
    "apn", "parcelno", "parcel_no", "acct_id", "acct_num", "accountno",
    "pin", "parcel_id", "prop_id", "hcad_num", "lowparcelid", "rpardes",
    "APN", "ParcelNo", "ACCT_NUM", "ACCT_ID", "HCAD_NUM", "PIN",
]

NORMALIZED_KEYS = {
    "apn": ["apn", "parcelno", "parcel_no", "acct_id", "acct_num", "accountno", "pin", "parcel_id", "prop_id", "rprop_id", "rpardes", "hcad_num", "lowparcelid"],
    "address": ["fulladdr", "site_address", "address", "prop_addr", "situs_addr", "location", "mail_addr_1", "site_str_num", "site_str_name", "site_str_sfx", "site_city", "site_zip"],
    "owner": ["owner", "owner_name", "owner_name_1", "situs_owner", "mailname", "owner1"],
    "acres": ["acreage", "acres", "grossacres", "landacres", "calc_acres", "statedarea"],
    "legal_desc": ["legaldesc", "legal_desc", "legaldescription", "legal_dscr_1", "dscr"],
    "market_value": ["marketvalue", "total_value", "assessed_val", "tax_val", "appraisedvalue", "market_val", "total_market_val", "total_appraised_val"],
}


def _normalize_properties(attrs):
    """Map county ArcGIS attributes to normalized parcel schema."""
    if not attrs:
        return {}
    lower_map = {str(k).lower(): k for k in attrs}
    out = {}
    for norm_key, candidates in NORMALIZED_KEYS.items():
        for c in candidates:
            orig_key = lower_map.get(c)
            if orig_key is not None:
                val = attrs.get(orig_key)
                if val is not None and str(val).strip() != "":
                    out[norm_key] = val
                    break
    for k, v in attrs.items():
        if v is None or str(v).strip() == "":
            continue
        if k not in out:
            out[k] = v
    return out


def _query_arcgis_by_apn(layer_url: str, apn: str, apn_field: str = None):
    """Query ArcGIS Feature Server by APN. Returns list of normalized GeoJSON features."""
    if not requests or not layer_url or not apn or not apn.strip():
        return []
    base = layer_url.rstrip("/").replace("/query", "")
    query_url = base + "/query"
    safe_apn = apn.replace("'", "''").strip()
    norm_apn = _normalize_apn(apn)
    fields_to_try = [apn_field] if apn_field else ARCGIS_APN_FIELD_CANDIDATES

    def do_query(where_clause):
        params = {
            "where": where_clause,
            "outFields": "*",
            "returnGeometry": "true",
            "returnIdsOnly": "false",
            "f": "geojson",
        }
        r = requests.get(query_url, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        if data.get("error"):
            return None
        fc = data if data.get("type") == "FeatureCollection" else {}
        return (fc.get("features") or [])[:5]

    for field in fields_to_try:
        if not field:
            continue
        # Try string match, LIKE (for dashed APNs), and numeric match (no quotes)
        where_clauses = [f"{field} = '{safe_apn}'"]
        if norm_apn:
            where_clauses.append(f"{field} LIKE '%{norm_apn}%'")
            if norm_apn.isdigit():
                where_clauses.append(f"{field} = {norm_apn}")
        for where in where_clauses:
            try:
                features = do_query(where)
                if not features:
                    continue
                out = []
                for f in features:
                    if f.get("type") != "Feature":
                        continue
                    props = _normalize_properties(f.get("properties") or {})
                    out.append({
                        "type": "Feature",
                        "properties": props,
                        "geometry": f.get("geometry"),
                    })
                return out
            except Exception:
                continue
    return []


def _demo_by_apn(apn: str, state: str = None, county: str = None):
    """Return features from demo list matching APN (exact or digits-only)."""
    norm = _normalize_apn(apn)
    if not norm:
        return []
    out = []
    for f in _demo_features:
        props = f.get("properties") or {}
        a = props.get("apn") or ""
        if _normalize_apn(a) == norm:
            if state and county:
                if (props.get("state") or "").strip().upper() != (state or "").strip().upper():
                    continue
                if (props.get("county") or "").strip().lower() != (county or "").strip().lower():
                    continue
            out.append(f)
            if len(out) >= 5:
                break
    return out


@app.get("/parcels/by-apn")
def parcels_apn(
    apn: str = Query(..., description="Parcel APN / account number"),
    state: str = Query(None),
    county: str = Query(None),
):
    """Look up parcel by APN. Tries PostGIS, then county ArcGIS (if configured), then demo data."""
    features = []
    # 1. Try PostGIS
    try:
        with db_cursor() as cur:
            if state and county:
                cur.execute(
                    """
                    SELECT apn, address, owner, acres, legal_desc, market_value, state, county,
                           ST_AsGeoJSON(geom)::json AS geometry
                    FROM parcels WHERE apn = %s AND state = %s AND county = %s
                    """,
                    (apn, state, county),
                )
            else:
                cur.execute(
                    """
                    SELECT apn, address, owner, acres, legal_desc, market_value, state, county,
                           ST_AsGeoJSON(geom)::json AS geometry
                    FROM parcels WHERE apn = %s LIMIT 5
                    """,
                    (apn,),
                )
            rows = cur.fetchall()
            if not rows and _normalize_apn(apn):
                norm = _normalize_apn(apn)
                cur.execute(
                    """
                    SELECT apn, address, owner, acres, legal_desc, market_value, state, county,
                           ST_AsGeoJSON(geom)::json AS geometry
                    FROM parcels
                    WHERE REGEXP_REPLACE(apn, '[^0-9]', '', 'g') = %s
                    LIMIT 5
                    """,
                    (norm,),
                )
                rows = cur.fetchall()
        features = [row_to_feature(dict(r)) for r in rows]
    except psycopg2.OperationalError:
        pass  # No PostGIS; try ArcGIS then demo

    # 2. If no PostGIS results, try county ArcGIS by APN (real data)
    arcgis_url = os.environ.get("PARCEL_ARCGIS_LAYER_URL", "").strip()
    arcgis_field = os.environ.get("PARCEL_ARCGIS_APN_FIELD", "").strip() or None
    if not features and arcgis_url:
        features = _query_arcgis_by_apn(arcgis_url, apn.strip(), arcgis_field)

    # 3. Fall back to demo only when ArcGIS is not configured (so we never show demo when real source is set)
    if not features and not arcgis_url:
        features = _demo_by_apn(apn, state, county)

    return {"type": "FeatureCollection", "features": features}
