#!/usr/bin/env python3
"""
Run the parcel crawler for every county in a JSON or CSV list.
Outputs one GeoJSON file per county under an output directory.

County list format:

  JSON: array of objects with state, county, parcel_layer_url, and bbox [min_lon, min_lat, max_lon, max_lat].
        Optional: fips.

  CSV:  state, county, fips, parcel_layer_url, min_lon, min_lat, max_lon, max_lat

Usage:
  python scripts/run_crawl_all_counties.py --list scripts/county_parcel_sources.example.json --out-dir data/parcels
  python scripts/run_crawl_all_counties.py --list counties.csv --out-dir data/parcels [--limit 100] [--delay 0.5]
"""

import argparse
import csv
import json
import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CRAWLER = os.path.join(SCRIPT_DIR, "crawl_county_parcels.py")


def load_counties_json(path):
    with open(path) as f:
        data = json.load(f)
    if not isinstance(data, list):
        data = [data]
    rows = []
    for row in data:
        bbox = row.get("bbox")
        if not bbox or len(bbox) != 4:
            continue
        rows.append({
            "state": row.get("state", ""),
            "county": row.get("county", ""),
            "fips": row.get("fips", ""),
            "parcel_layer_url": row.get("parcel_layer_url", ""),
            "min_lon": bbox[0],
            "min_lat": bbox[1],
            "max_lon": bbox[2],
            "max_lat": bbox[3],
        })
    return rows


def load_counties_csv(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            try:
                min_lon = float(row["min_lon"])
                min_lat = float(row["min_lat"])
                max_lon = float(row["max_lon"])
                max_lat = float(row["max_lat"])
            except (KeyError, ValueError):
                continue
            rows.append({
                "state": row.get("state", ""),
                "county": row.get("county", ""),
                "fips": row.get("fips", ""),
                "parcel_layer_url": row.get("parcel_layer_url", "").strip(),
                "min_lon": min_lon,
                "min_lat": min_lat,
                "max_lon": max_lon,
                "max_lat": max_lat,
            })
    return rows


def load_counties(path):
    path = os.path.abspath(path)
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    if path.lower().endswith(".csv"):
        return load_counties_csv(path)
    return load_counties_json(path)


def run_crawler(url, bbox, out_path, limit=None, delay=0.5):
    cmd = [
        sys.executable,
        CRAWLER,
        "--url", url,
        "--bbox", str(bbox[0]), str(bbox[1]), str(bbox[2]), str(bbox[3]),
        "--out", out_path,
        "--delay", str(delay),
    ]
    if limit is not None:
        cmd.extend(["--limit", str(limit)])
    return subprocess.run(cmd)


def main():
    ap = argparse.ArgumentParser(description="Run parcel crawler for each county in a list")
    ap.add_argument("--list", "-l", required=True, help="County list: .json or .csv (see example files)")
    ap.add_argument("--out-dir", "-o", default="data/parcels", help="Output directory for GeoJSON files (default: data/parcels)")
    ap.add_argument("--limit", type=int, default=None, help="Max features per county (default: all)")
    ap.add_argument("--delay", type=float, default=0.5, help="Seconds between requests per county run (default 0.5)")
    args = ap.parse_args()

    try:
        counties = load_counties(args.list)
    except FileNotFoundError as e:
        print(f"County list not found: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Failed to load county list: {e}", file=sys.stderr)
        sys.exit(1)

    if not counties:
        print("No counties with valid bbox in list.", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.out_dir, exist_ok=True)
    failed = []

    for i, row in enumerate(counties):
        state = (row["state"] or "unknown").replace(" ", "_")
        county = (row["county"] or "unknown").replace(" ", "_")
        url = row["parcel_layer_url"]
        bbox = (row["min_lon"], row["min_lat"], row["max_lon"], row["max_lat"])
        out_name = f"{state}_{county}.geojson"
        out_path = os.path.join(args.out_dir, out_name)
        print(f"[{i + 1}/{len(counties)}] {state} / {county} -> {out_path}", flush=True)
        ret = run_crawler(url, bbox, out_path, limit=args.limit, delay=args.delay)
        if ret.returncode != 0:
            failed.append(f"{state}/{county}")

    if failed:
        print(f"Failed: {', '.join(failed)}", file=sys.stderr)
        sys.exit(1)
    print(f"Done. {len(counties)} county files in {args.out_dir}")


if __name__ == "__main__":
    main()
