# Parcel API live on the site

Get APN search working on **https://landdreamz.github.io/crm-system/** in three steps.

---

## Step 1: Deploy the Parcel API on Render

1. Go to **[render.com](https://render.com)** and sign in with GitHub.
2. **New → Web Service**.
3. Connect the **Landdreamz/crm-system** repo (or your fork).
4. Configure:
   - **Name:** `crm-parcel-api` (or any name).
   - **Root Directory:** `parcel_api`.
   - **Runtime:** Python.
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. **Environment (optional):** Add variable **PARCEL_ARCGIS_LAYER_URL** with your county’s parcel layer URL (e.g. Harris: `https://www.gis.hctx.net/arcgis/rest/services/HCAD/Parcels/MapServer/0`) for real APN data. Leave blank to use demo data.
6. Click **Create Web Service**. Wait for the first deploy to finish.
7. Copy the service URL (e.g. `https://crm-parcel-api-xxxx.onrender.com`). You’ll use it in Step 2.

---

## Step 2: Point the live site at your Parcel API

1. On GitHub open **Landdreamz/crm-system** → **Settings** → **Secrets and variables** → **Actions**.
2. Under **Variables** click **New repository variable**.
3. **Name:** `REACT_APP_PARCEL_API_URL`  
   **Value:** the URL from Step 1 (e.g. `https://crm-parcel-api-xxxx.onrender.com`) — no trailing slash.
4. Save.

---

## Step 3: Redeploy the frontend

Push a commit to `main` (or run the “Deploy to GitHub Pages” workflow manually from the **Actions** tab). The next build will use `REACT_APP_PARCEL_API_URL` and the live site will call your Parcel API for APN search.

---

**Done.** Open https://landdreamz.github.io/crm-system/ → Parcel API tab → search by APN; it will use your deployed API.

**Note:** On Render’s free tier the service may spin down after inactivity; the first request after that can take 30–60 seconds.
