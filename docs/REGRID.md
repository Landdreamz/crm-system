# Regrid parcel map in the CRM

Show **parcel boundaries** on the contact property map using [Regrid](https://regrid.com) parcel tiles.

## What you get

- Parcel boundaries overlaid on the street or satellite map in **Contact detail** (and anywhere else PropertyMap is used).
- U.S. (and Canadian) parcel coverage from Regrid.
- The parcel tile layer appears automatically when configured; use the **Street / Satellite** toggle and pan/zoom as usual.

## Setup

### 1. Get Regrid access

- **Free 30-day trial:** [Regrid Parcel API Sandbox](https://app.regrid.com/users/sign_up?flow=api_sandbox)
- **Paid plans (tiles + API):** [API plans](https://app.regrid.com/api/plans)

Sign up, then in the Regrid dashboard (or API/Tiles section) get your **tile URL**. The CRM supports both:

- **Raster tiles** (images): `https://tiles.regrid.com/.../{z}/{x}/{y}.png?key=YOUR_API_KEY`
- **Vector tiles** (.pbf): `https://tiles.regrid.com/parcels/{z}/{x}/{y}.pbf`  
  If the URL contains `.pbf`, the app uses vector tile rendering (parcel boundaries drawn from the tile data). Use the format Regrid provides; they may use `{z}/{x}/{y}` or `{z}/{y}/{x}`.

### 2. Configure the frontend

In **`frontend/.env`** (create from `frontend/.env.example` if needed), set:

```bash
# Regrid parcel tiles (see docs/REGRID.md)
REACT_APP_REGRID_TILE_URL=https://your-regrid-tile-url/{z}/{x}/{y}.png?key=YOUR_KEY
```

Use the **exact** URL Regrid gives you. Leaflet expects `{z}`, `{x}`, `{y}` in the URL for tile coordinates.

### 3. Restart the frontend

- **Development:** stop and run `npm start` again so it picks up the new env var.
- **Production:** rebuild (`npm run build`) and redeploy.

## Where it appears

- **Contacts → open a contact → map panel:** the Regrid parcel layer is drawn on top of the base map when `REACT_APP_REGRID_TILE_URL` is set.
- The “Show parcels & addresses” checkbox controls **OpenStreetMap** buildings/addresses in the viewport; Regrid tiles are separate and always on when configured.

## Troubleshooting

- **No parcels showing:** Confirm `REACT_APP_REGRID_TILE_URL` is in `frontend/.env` (not only in `.env.example`) and that you restarted or rebuilt the app.
- **403 / invalid key:** Check the key and URL in the Regrid dashboard; ensure the key is allowed for tile access.
- **Wrong tile order:** If the map looks wrong, Regrid might use `{z}/{y}/{x}` instead of `{z}/{x}/{y}` — try swapping `{x}` and `{y}` in the URL.

## Links

- [Regrid API & Tiles](https://regrid.com/api)
- [API Sandbox signup (30-day free)](https://app.regrid.com/users/sign_up?flow=api_sandbox)
- [API / Tiles terms](https://regrid.com/terms/api)
