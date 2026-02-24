#!/usr/bin/env python3
"""
Crawl a single county's ArcGIS Feature Server parcel layer by bounding box.
Outputs normalized GeoJSON. Use this as the building block for a nationwide parcel API.

Usage:
  python scripts/crawl_county_parcels.py --url "https://gis.hctx.net/arcgis/rest/services/Property/Property/FeatureServer/0" --bbox -95.5 29.6 -95.0 30.0 --out harris_sample.geojson

  python scripts/crawl_county_parcels.py --url "https://your-county.gov/.../FeatureServer/0" --bbox min_lon min_lat max_lon max_lat [--out file.geojson] [--limit N] [--delay 0.5]
"""

import argparse
import json
import sys
import time
from urllib.parse import urlencode, urljoin

try:
    import requests
except ImportError:
    print("Install requests: pip install requests", file=sys.stderr)
    sys.exit(1)


# Map common county field names (case-insensitive) to our normalized schema
NORMALIZED_KEYS = {
    "apn": ["apn", "parcelno", "parcel_no", "acct_id", "acct_num", "accountno", "pin", "parcel_id", "prop_id", "rprop_id", "rpardes", "hcad_num", "lowparcelid"],
    "address": ["fulladdr", "site_address", "address", "prop_addr", "situs_addr", "location", "mail_addr_1", "site_str_num", "site_str_name", "site_str_sfx", "site_city", "site_zip"],
    "owner": ["owner", "owner_name", "owner_name_1", "situs_owner", "mailname", "owner1"],
    "acres": ["acreage", "acres", "grossacres", "landacres", "calc_acres", "statedarea"],
    "legal_desc": ["legaldesc", "legal_desc", "legaldescription", "legal_dscr_1", "dscr"],
    "market_value": ["marketvalue", "total_value", "assessed_val", "tax_val", "appraisedvalue", "market_val", "total_market_val", "total_appraised_val"],
}


def normalize_properties(attrs):
    """Map county attributes to a normalized parcel schema."""
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
    # Keep any unmapped fields under "raw" or drop; here we add a few common ones to top level
    for k, v in attrs.items():
        if v is None or str(v).strip() == "":
            continue
        kl = k.lower()
        if any(kl == c for cands in NORMALIZED_KEYS.values() for c in cands):
            continue
        if kl not in out:
            out[k] = v
    return out


def query_layer(base_url, bbox_4326, offset=0, limit=2000):
    """Query ArcGIS Feature Server layer by envelope. bbox_4326 = (min_lon, min_lat, max_lon, max_lat)."""
    min_lon, min_lat, max_lon, max_lat = bbox_4326
    geometry = json.dumps({
        "xmin": min_lon,
        "ymin": min_lat,
        "xmax": max_lon,
        "ymax": max_lat,
        "spatialReference": {"wkid": 4326},
    })
    params = {
        "where": "1=1",
        "geometry": geometry,
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "outSR": "4326",
        "outFields": "*",
        "returnGeometry": "true",
        "resultOffset": offset,
        "resultRecordCount": limit,
        "f": "geojson",
    }
    url = base_url.rstrip("/")
    if not url.endswith("/query"):
        url = urljoin(url + "/", "query")
    r = requests.get(url, params=params, timeout=60)
    r.raise_for_status()
    data = r.json()
    if data.get("error"):
        raise RuntimeError(data["error"].get("message", str(data["error"])))
    return data


def crawl_to_geojson(base_url, bbox_4326, out_path=None, limit=None, delay=0.5):
    """Crawl all pages for the bbox and return a GeoJSON FeatureCollection (normalized)."""
    features = []
    offset = 0
    page_size = 2000
    total = None

    while True:
        data = query_layer(base_url, bbox_4326, offset=offset, limit=page_size)
        fc = data if data.get("type") == "FeatureCollection" else data.get("features", data)
        if isinstance(fc, dict) and "features" in fc:
            batch = fc["features"]
        else:
            batch = fc if isinstance(fc, list) else []

        for f in batch:
            if f.get("type") != "Feature":
                continue
            props = f.get("properties") or {}
            geom = f.get("geometry")
            norm = normalize_properties(props)
            features.append({
                "type": "Feature",
                "properties": norm,
                "geometry": geom,
            })
            if limit and len(features) >= limit:
                break

        if limit and len(features) >= limit:
            break
        if len(batch) < page_size:
            break
        offset += len(batch)
        time.sleep(delay)

    geojson = {"type": "FeatureCollection", "features": features}
    if out_path:
        with open(out_path, "w") as fp:
            json.dump(geojson, fp, indent=2)
        print(f"Wrote {len(features)} features to {out_path}", file=sys.stderr)
    return geojson


def main():
    ap = argparse.ArgumentParser(description="Crawl county ArcGIS parcel layer to normalized GeoJSON")
    ap.add_argument("--url", required=True, help="FeatureServer layer URL (e.g. .../FeatureServer/0)")
    ap.add_argument("--bbox", nargs=4, type=float, metavar=("min_lon", "min_lat", "max_lon", "max_lat"),
                    help="Bounding box in WGS84 (min_lon min_lat max_lon max_lat)")
    ap.add_argument("--out", default=None, help="Output GeoJSON file path")
    ap.add_argument("--limit", type=int, default=None, help="Max features to fetch (default: all)")
    ap.add_argument("--delay", type=float, default=0.5, help="Seconds between requests (default 0.5)")
    args = ap.parse_args()

    if not args.bbox or len(args.bbox) != 4:
        print("Provide --bbox min_lon min_lat max_lon max_lat", file=sys.stderr)
        sys.exit(1)

    bbox = tuple(args.bbox)
    try:
        geojson = crawl_to_geojson(args.url, bbox, out_path=args.out, limit=args.limit, delay=args.delay)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    if not args.out:
        print(json.dumps(geojson, indent=2))


if __name__ == "__main__":
    main()
