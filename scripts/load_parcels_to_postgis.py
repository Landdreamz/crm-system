#!/usr/bin/env python3
"""
Load normalized parcel GeoJSON (from crawl_county_parcels.py or run_crawl_all_counties.py)
into a PostGIS table. Creates the table if it does not exist.

Requires: psycopg2-binary, python-dotenv (optional for .env)

Environment:
  PARCEL_DB_HOST, PARCEL_DB_PORT, PARCEL_DB_NAME, PARCEL_DB_USER, PARCEL_DB_PASSWORD
  or DATABASE_URL (postgresql://user:pass@host:port/dbname)

Usage:
  python scripts/load_parcels_to_postgis.py data/parcels/TX_Harris.geojson
  python scripts/load_parcels_to_postgis.py data/parcels/*.geojson --table parcels
"""

import json
import os
import sys

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("Install: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

try:
    import dotenv
    dotenv.load_dotenv()
except ImportError:
    pass

TABLE_NAME = "parcels"
CREATE_SQL = """
CREATE TABLE IF NOT EXISTS parcels (
  id SERIAL PRIMARY KEY,
  apn TEXT,
  address TEXT,
  owner TEXT,
  acres NUMERIC,
  legal_desc TEXT,
  market_value NUMERIC,
  state TEXT,
  county TEXT,
  geom GEOMETRY(Geometry, 4326)
);
CREATE INDEX IF NOT EXISTS idx_parcels_geom ON parcels USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_parcels_apn ON parcels(apn);
CREATE INDEX IF NOT EXISTS idx_parcels_state_county ON parcels(state, county);
"""


def get_conn():
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


def ensure_table(conn, table_name):
    with conn.cursor() as cur:
        for stmt in CREATE_SQL.replace("parcels", table_name).split(";"):
            stmt = stmt.strip()
            if stmt:
                cur.execute(stmt)
    conn.commit()


def load_geojson(conn, path, table_name, state=None, county=None):
    with open(path) as f:
        fc = json.load(f)
    features = fc.get("features") or []
    inserted = 0
    with conn.cursor() as cur:
        for feat in features:
            if feat.get("type") != "Feature":
                continue
            props = feat.get("properties") or {}
            geom = feat.get("geometry")
            if not geom:
                continue
            s = props.get("state") or props.get("mail_state") or state
            c = props.get("county") or props.get("site_county") or county
            cur.execute(
                """
                INSERT INTO {} (apn, address, owner, acres, legal_desc, market_value, state, county, geom)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, ST_GeomFromGeoJSON(%s))
                """.format(table_name),
                (
                    props.get("apn"),
                    props.get("address"),
                    props.get("owner"),
                    props.get("acres"),
                    props.get("legal_desc"),
                    props.get("market_value"),
                    s,
                    c,
                    json.dumps(geom),
                ),
            )
            inserted += 1
    conn.commit()
    return inserted


def main():
    import argparse
    ap = argparse.ArgumentParser(description="Load parcel GeoJSON into PostGIS")
    ap.add_argument("geojson_files", nargs="+", help="Paths to .geojson files")
    ap.add_argument("--table", default=TABLE_NAME, help="PostGIS table name (default: parcels)")
    ap.add_argument("--state", default=None, help="Default state for features without state")
    ap.add_argument("--county", default=None, help="Default county for features without county")
    args = ap.parse_args()

    conn = get_conn()
    ensure_table(conn, args.table)
    total = 0
    for path in args.geojson_files:
        if not path.endswith(".geojson") and not path.endswith(".json"):
            continue
        if not os.path.isfile(path):
            print(f"Skip (not a file): {path}", file=sys.stderr)
            continue
        n = load_geojson(conn, path, args.table, state=args.state, county=args.county)
        total += n
        print(f"Loaded {n} features from {path}")
    conn.close()
    print(f"Total: {total} parcels in table {args.table}")


if __name__ == "__main__":
    main()
