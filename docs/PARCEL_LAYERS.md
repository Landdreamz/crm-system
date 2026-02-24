# Free county/state parcel layers

You can overlay **parcel boundaries** on the contact property map using a **free** tile or WMS service from your county or state GIS. Many US counties and states publish parcel map layers at no cost.

## Texas: TNRIS (best free for Texas)

**[Texas Natural Resources Information System (TNRIS)](https://tnris.org)** / **TxGIO** is the best free source for **Texas** parcel and address data.

- **What it is:** Statewide land parcel and address-point data aggregated from county appraisal districts, updated annually. Free to download.
- **How to get data:** Use the **[TxGIO DataHub](https://data.tnris.org)** (or [data.geographic.texas.gov](https://data.geographic.texas.gov)) — search for “land parcels” or “address points,” then select the county and download (shapefile or geodatabase).
- **Live map in the CRM:** TNRIS does **not** provide a single statewide parcel **tile or WMS** URL. For **in-map display** in this CRM you have two options:
  1. **Use a county tile/WMS** — Configure `REACT_APP_PARCEL_TILE_URL` or `REACT_APP_PARCEL_WMS_URL` with your county’s parcel map service (e.g. Harris County). See “Example: Harris County” below.
  2. **Use TNRIS data you’ve downloaded** — Host the TNRIS shapefile/geodatabase in your own map server (e.g. GeoServer, MapServer) and point the CRM at that server’s tile or WMS URL.

## Options (use one or more)

### 1. XYZ tile URL

If your county/state provides parcel **tiles** (e.g. `https://.../tile/{z}/{x}/{y}.png`):

In **`frontend/.env`** add:

```bash
REACT_APP_PARCEL_TILE_URL=https://your-county-or-state.gov/.../tile/{z}/{x}/{y}.png
```

- The URL must contain `{z}`, `{x}`, and `{y}` for zoom and tile coordinates.
- Some servers use **`{z}/{y}/{x}`** instead of `{z}/{x}/{y}` — if the map looks wrong, try swapping `x` and `y` in the path.
- Restart the frontend (`npm start`) or rebuild after changing.

### 2. WMS (Web Map Service)

If your county/state provides a **WMS** endpoint (common with GeoServer, ArcGIS Server, etc.):

In **`frontend/.env`** add:

```bash
REACT_APP_PARCEL_WMS_URL=https://your-county.gov/geoserver/wms
REACT_APP_PARCEL_WMS_LAYERS=parcels
```

- **REACT_APP_PARCEL_WMS_URL** — base WMS URL (e.g. `.../geoserver/wms` or `.../arcgis/rest/services/.../MapServer/WMSServer`).
- **REACT_APP_PARCEL_WMS_LAYERS** — layer name(s) as given by the server (comma-separated if multiple). Defaults to `parcels` if omitted.

Restart or rebuild the frontend after changing.

### 3. County ArcGIS Feature Server (free and powerful)

Many counties expose parcel data via **ArcGIS REST** with a **Feature Server** layer. The CRM queries the layer by the current map bounds and draws parcels dynamically.

- **Example endpoint style:** `https://gis.hctx.net/arcgis/rest/services` (browse services to find the parcel layer).
- **Layer URL:** Use the full URL to the **layer** (e.g. `.../FeatureServer/0`), **not** the `/query` path. The CRM adds `/query` and the bounding box automatically.

In **`frontend/.env`** add:

```bash
REACT_APP_PARCEL_ARCGIS_FEATURESERVER_URL=https://gis.yourcounty.gov/arcgis/rest/services/.../FeatureServer/0
```

- Browse your county’s REST services (e.g. `https://gis.hctx.net/arcgis/rest/services`) to find the parcel or real property layer, then copy the layer URL (ends in `FeatureServer/0` or similar).
- The parcel layer is shown when **“Show parcels & addresses”** is checked; it queries the server as you pan/zoom.
- **Click a parcel** to see a popup with Address, APN, Owner, Acreage, Legal description, Value (and related fields) when your county’s API returns them. The app recognizes many common field names; any extra attributes from the layer are also listed.
- **If the map shows "Parcel layer unavailable"** — the URL in `.env` may be wrong or the server may block browser requests (CORS). Browse your county’s REST services (e.g. `.../arcgis/rest/services`) and copy the exact parcel layer URL (ends in `FeatureServer/0`). Some counties use a different host (e.g. `gis.county.org` vs `maps.county.org`).

Restart or rebuild the frontend after changing.

## Example: Harris County, TX (Houston)

Harris County GIS REST services: **https://gis.hctx.net/arcgis/rest/services** — browse the list to find the parcel or real property service, then use the **layer** URL (e.g. `.../FeatureServer/0`) in `REACT_APP_PARCEL_ARCGIS_FEATURESERVER_URL`. Alternatively, use a **tile** URL `.../MapServer/tile/{z}/{y}/{x}` or **WMS** `.../MapServer/WMSServer` with `REACT_APP_PARCEL_TILE_URL` or `REACT_APP_PARCEL_WMS_URL` (see Options above).

## Finding a free parcel URL

1. Search for **“[Your County] GIS”** or **“[Your State] parcel map”**.
2. Look for **“GIS services”**, **“map services”**, **“WMS”**, **“REST”**, or **“tile”** on the county/state GIS or IT page.
3. You may get:
   - A **tile URL** (often `.../MapServer/tile/{z}/{y}/{x}` or similar), or
   - A **WMS** base URL and a **layer name** (e.g. “Parcels”, “Cadastre”).
4. Some sites only offer a web map viewer; you may need to contact GIS to get the service URL.

## Where it shows

- **Contacts → open a contact → map:** the custom parcel layer is drawn on top of the base map (street or satellite), same as the optional Regrid layer.
- You can use **Regrid** and a **custom parcel** layer at the same time (e.g. Regrid for one region, custom for another); both will render if both are configured.

## Troubleshooting

- **No parcels:** Confirm the env var(s) are in `frontend/.env` and you restarted or rebuilt.
- **Tiles in wrong order:** For tile URL, try `{z}/{y}/{x}` instead of `{z}/{x}/{y}` (or vice versa).
- **WMS blank or 403:** Check the URL and layer name in the provider’s docs; ensure the service allows requests from your app’s origin (CORS) if you see browser errors.
- **CORS errors:** Some WMS/tile servers block browser requests. If that happens, you’d need a small backend proxy that forwards requests to the county server.
