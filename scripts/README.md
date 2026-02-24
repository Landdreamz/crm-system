# Scripts

## County URL list (state/county → parcel layer URL)

Before running the crawler at scale, build a list of counties and their ArcGIS parcel layer URLs (and bbox).

- **JSON:** `scripts/county_parcel_sources.example.json` — array of `{ state, county, fips?, parcel_layer_url, bbox: [min_lon, min_lat, max_lon, max_lat] }`.
- **CSV:** `scripts/county_parcel_sources.example.csv` — columns: `state`, `county`, `fips`, `parcel_layer_url`, `min_lon`, `min_lat`, `max_lon`, `max_lat`.
- **Harris only:** `scripts/county_parcel_sources.harris_only.json` — single-county list to run the batch crawler for Harris County only.

Copy an example to your own file (e.g. `county_parcel_sources.json`), add or edit rows, then use `run_crawl_all_counties.py` (below). To focus on Harris first, use `county_parcel_sources.harris_only.json` as the list.

---

## crawl_county_parcels.py

Crawls a **single** county ArcGIS Feature Server parcel layer by bounding box and writes normalized GeoJSON.

**Requirements:** Python 3.6+, `requests` (`pip install requests`).

**Example (Harris County, TX — HCAD Parcels):**

```bash
# From repo root
python scripts/crawl_county_parcels.py \
  --url "https://www.gis.hctx.net/arcgis/rest/services/HCAD/Parcels/MapServer/0" \
  --bbox -95.5 29.6 -95.0 30.0 \
  --out harris_sample.geojson
```

**Options:**

- `--url` – Feature Server layer URL (must end in `/FeatureServer/0` or similar; script appends `/query`).
- `--bbox min_lon min_lat max_lon max_lat` – WGS84 bounding box.
- `--out file.geojson` – Output path. If omitted, prints GeoJSON to stdout.
- `--limit N` – Stop after N features (useful for testing).
- `--delay 0.5` – Seconds to wait between paginated requests (be nice to county servers).

**Normalized fields** (see script for full list): `apn`, `address`, `owner`, `acres`, `legal_desc`, `market_value`, plus any other attributes from the layer.

---

## run_crawl_all_counties.py

Runs the crawler for **every county** in a JSON or CSV list. Writes one GeoJSON file per county into an output directory.

**Example:**

```bash
# From repo root; list can be .json or .csv
python scripts/run_crawl_all_counties.py \
  --list scripts/county_parcel_sources.example.json \
  --out-dir data/parcels
```

**Options:**

- `--list` / `-l` – Path to county list (JSON or CSV; must include bbox per row).
- `--out-dir` / `-o` – Directory for output GeoJSON files (default: `data/parcels`). Files named `{state}_{county}.geojson`.
- `--limit N` – Max features per county (optional).
- `--delay 0.5` – Delay between requests (default 0.5).

---

## load_parcels_to_postgis.py

Loads normalized parcel GeoJSON into a PostGIS table. Creates the `parcels` table if it does not exist.

**Requirements:** `psycopg2-binary`, optional `python-dotenv`.

**Environment:** `PARCEL_DB_HOST`, `PARCEL_DB_PORT`, `PARCEL_DB_NAME`, `PARCEL_DB_USER`, `PARCEL_DB_PASSWORD` — or `DATABASE_URL`.

```bash
# After PostGIS is running and parcel_db exists
python scripts/load_parcels_to_postgis.py data/parcels/TX_Harris.geojson --state TX --county Harris
```

Then run the **Parcel API** (FastAPI) from `parcel_api/` — see **parcel_api/README.md**.

---

## Docs

- **docs/PARCEL_API_BUILD.md** – Full guide: finding county URLs, querying ArcGIS, normalizing data, storage, your API.
- **docs/PARCEL_API_POSTGIS_AND_API.md** – Load GeoJSON into PostGIS and expose an API by bbox, point, or APN.
- **parcel_api/README.md** – Run the Parcel API (FastAPI) and query by bbox, point, APN.
