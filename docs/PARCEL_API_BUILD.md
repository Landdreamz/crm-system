# Building Your Own Nationwide Parcel API from County ArcGIS Servers

This guide explains how to build a parcel API by querying county (and state) ArcGIS REST services across the US, normalizing the data, and exposing it via your own API.

## Overview

**What you’re doing:** Many counties expose parcel data via **ArcGIS REST** (e.g. `.../FeatureServer/0` or `.../MapServer`). You can:

1. **Discover** county parcel layer URLs (by state/county).
2. **Crawl** them (query by bounding box or county boundary).
3. **Normalize** fields (APN, owner, address, etc.) into a single schema.
4. **Store** results in a database or search index.
5. **Expose** your own API (by address, APN, lat/lng, or bbox).

**Why:** One API, one schema, nationwide coverage—without depending on a single vendor. Tools like Regrid and LandGlide started by aggregating county data this way.

---

## 1. Finding County ArcGIS Parcel URLs

Counties use different URLs and layer IDs. You need a **registry** of (state, county) → parcel layer URL.

### Sources

- **State GIS portals**  
  Many states list county GIS services. Search for “[State] GIS clearinghouse” or “[State] geographic information.”

- **NACO (National Association of Counties)**  
  Some links to county GIS from [naco.org](https://www.naco.org).

- **This repo**  
  Harris County (HCAD parcels):  
  `https://www.gis.hctx.net/arcgis/rest/services/HCAD/Parcels/MapServer/0`  
  Use the same pattern:  
  `https://gis.<county>.gov/arcgis/rest/services/...` or  
  `https://www.gis.<county>.gov/arcgis/rest/services/...`

- **Manual discovery**  
  1. Go to `https://gis.<county>.gov/arcgis/rest/services` (or similar).  
  2. Find a “Property”, “Parcels”, or “Cadastre” service.  
  3. Open the service and note the **layer index** (often `0` for parcels).  
  4. Base URL = service URL + `/FeatureServer/0` (or `/MapServer/0` for older services).

### Building a URL list

Maintain a JSON or CSV, e.g.:

```json
[
  { "state": "TX", "county": "Harris", "fips": "48201", "parcel_layer_url": "https://www.gis.hctx.net/arcgis/rest/services/HCAD/Parcels/MapServer/0", "bbox": [-95.9, 29.5, -95.0, 30.2] },
  { "state": "TX", "county": "Dallas", "fips": "48113", "parcel_layer_url": "https://...", "bbox": [-97, 32.6, -96.5, 33] }
]
```

Start with a few counties; add more over time.

---

## 2. Querying ArcGIS Feature Server (Parcels)

Parcel layers are usually **Feature Server** (or Map Server) with a **query** endpoint:

- **Query by envelope (bbox):**  
  `GET .../FeatureServer/0/query?where=1=1&geometry={"xmin":...,"ymin":...,"xmax":...,"ymax":...}&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&outFields=*&returnGeometry=true&f=geojson`

- **Query by point:**  
  Use `geometryType=esriGeometryPoint` and a point instead of envelope.

- **Pagination:**  
  Use `resultOffset` and `resultRecordCount` (e.g. 2000 per request) and loop until no more features.

Important: each county may use different **field names** (APN vs ParcelNo vs ACCT_ID, etc.). Your crawler should request `outFields=*` and then **normalize** (see below).

---

## 3. Normalizing Parcel Data

Counties use different schemas. Define one **normalized schema** and map county fields into it.

### Suggested normalized fields

| Normalized field | Example county field names |
|------------------|----------------------------|
| `apn`            | APN, ParcelNo, ACCT_ID, PIN, PARCEL_ID |
| `address`        | FullAddr, SITE_ADDRESS, Address, PROP_ADDR |
| `owner`          | Owner, OWNER, OwnerName, SITUS_OWNER |
| `acres`          | Acreage, ACRES, GrossAcres, LandAcres |
| `legal_desc`     | LegalDesc, LEGAL_DESC, LegalDescription |
| `market_value`   | MarketValue, TOTAL_VALUE, ASSESSED_VAL, TAX_VAL |
| `geometry`       | (from GeoJSON geometry) |

Your crawler should:

1. Request all attributes (`outFields=*`).
2. For each feature, detect which county field maps to each normalized field (by name or alias).
3. Output a GeoJSON (or DB row) with normalized properties + geometry.

The script in `scripts/crawl_county_parcels.py` does this for one layer and one bbox.

---

## 4. Crawl Strategy

### Per-county crawl

- For each county in your registry, get the parcel layer URL.
- Optionally get the county boundary (state/county boundary GeoJSON or ArcGIS geometry).
- Query the parcel layer by:
  - **Full county:** use county boundary as `geometry` in the query, or
  - **Bounding box:** use the county’s bbox.
- Paginate with `resultOffset` / `resultRecordCount`.
- Normalize each feature and write to storage (file, DB, or queue).

### Rate limiting and politeness

- Add a **delay** between requests (e.g. 0.5–1 second per request).
- Respect **robots.txt** and any published terms of use for each county.
- Cache responses if you re-crawl (e.g. by bbox + layer + date).

### Legal / ToS

- **Check each county’s terms of use** before bulk download. Some allow internal/civic use; some prohibit resale or redistribution.
- **Attribution:** keep track of data source (county, state) and attribute in your API and UI.

---

## 5. Storage Options

- **PostGIS:** Store normalized parcels as a table with a geometry column. Query by bbox, point, or address (geocoded).
- **Elasticsearch / OpenSearch:** Index normalized fields + geometry for full-text and spatial search.
- **Flat files (GeoJSON/Parquet):** Good for a first version; later load into a DB or search engine.

---

## 6. Your API Layer

Once data is stored:

- **By bbox:** `GET /parcels?min_lat=...&max_lat=...&min_lon=...&max_lon=...`
- **By point:** `GET /parcels?lat=...&lon=...` (point-in-polygon).
- **By address:** Geocode address → lat/lon → point-in-polygon.
- **By APN (+ county/state):** Look up in your normalized table.

Return GeoJSON or JSON with your normalized schema so the CRM (or any client) can show parcels and popups consistently.

---

## 7. Running the Starter Crawler

The repo includes a Python script that:

- Takes a **Feature Server parcel layer URL** and a **bounding box** (or uses a default).
- Queries the layer with pagination.
- Normalizes common fields and writes **GeoJSON** to a file.

Use it to test one county, then extend it to loop over your county list and write to a database.

```bash
# From project root
python scripts/crawl_county_parcels.py \
  --url "https://gis.hctx.net/arcgis/rest/services/Property/Property/FeatureServer/0" \
  --bbox -95.5 29.6 -95.0 30.0 \
  --out harris_sample.geojson
```

See the script’s `--help` and comments for options and field mapping.

---

## 8. Next Steps

1. **Build the county URL list** for the states you care about. Use `scripts/county_parcel_sources.example.json` or `scripts/county_parcel_sources.example.csv` as a template; copy to your own file and add rows (state, county, parcel_layer_url, bbox).
2. **Run the crawler** for a few counties (single run with `crawl_county_parcels.py`) or for the whole list with `scripts/run_crawl_all_counties.py --list your_list.json --out-dir data/parcels`. Inspect the normalized GeoJSON.
3. **Add a database** (e.g. PostGIS) and write normalized parcels there. See **docs/PARCEL_API_POSTGIS_AND_API.md** for loading GeoJSON (ogr2ogr or Python) and table schema.
4. **Add a small API** (e.g. FastAPI) that queries your DB by bbox, point, or APN. The same doc includes example FastAPI endpoints.
5. **Optional:** Schedule periodic re-crawls to refresh data; track last-crawl time per county.

This gives you the foundation for a nationwide parcel API built from county ArcGIS servers.
