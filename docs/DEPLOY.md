# Deploying the CRM

Get your app live on the web in a few minutes.

## 1. Deploy the frontend (Vercel) — recommended

The React dashboard can be deployed to **Vercel** for free with automatic deploys from GitHub.

### Steps

1. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub.
2. **Import your repo**
   - Click **Add New… → Project**.
   - Select **Landdreamz/crm-system** (or your fork).
3. **Configure the project**
   - **Root Directory:** click **Edit**, set to **`frontend`**, then **Continue**.
   - **Framework Preset:** Create React App (auto-detected).
   - **Build Command:** `npm run build` (default).
   - **Output Directory:** `build` (default).
4. **Environment variables (optional)**
   - If you later deploy the Django backend and Parcel API, add:
     - `REACT_APP_TWILIO_API_URL` = your backend API URL (e.g. `https://your-backend.onrender.com`)
     - `REACT_APP_PARCEL_API_URL` = your Parcel API URL (e.g. `https://your-parcel-api.onrender.com`)
   - Other optional keys (Market Research, Regrid, etc.): add as in `frontend/.env.example`.
5. **Deploy**
   - Click **Deploy**. In about a minute you’ll get a URL like `https://crm-system-xxx.vercel.app`.

After this, every push to `main` will trigger a new deployment.

---

## 2. Deploy the backend (Django) — optional

For Twilio dialer, contacts API, and other backend features you need the Django app running somewhere.

**Render (free tier)**

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. **New → Web Service**, connect **Landdreamz/crm-system**.
3. **Root Directory:** `backend`.
4. **Build:** `pip install -r requirements.txt`
5. **Start:** `gunicorn crm_backend.wsgi:application`
6. Add a **Postgres** database (optional; the app can run with SQLite for light use).
6. In **Environment**, set any keys from `backend/.env.example` (e.g. Twilio). Add `ALLOWED_HOSTS=*` or your Render URL if needed.
7. Deploy. Copy the service URL and set it as `REACT_APP_TWILIO_API_URL` in your Vercel project.

**Railway** and **Fly.io** are other options; use the same build/start commands and set env vars from `backend/.env.example`.

---

## 3. Deploy the Parcel API — optional

Only needed if you want the Parcel API tab to work in production.

**Render (free tier)**

1. **New → Web Service**, same repo.
2. **Root Directory:** `parcel_api`.
3. **Build:** `pip install -r requirements.txt`
4. **Start:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. In **Environment**, set `PARCEL_ARCGIS_LAYER_URL` (and optional vars from `parcel_api/.env.example`).
6. Deploy. Set the service URL as `REACT_APP_PARCEL_API_URL` in Vercel.

---

## Summary

| Part        | Where   | Result |
|------------|---------|--------|
| Frontend   | Vercel  | Public URL for the dashboard |
| Backend    | Render / Railway / etc. | API URL → set in Vercel as `REACT_APP_TWILIO_API_URL` |
| Parcel API | Render / Railway / etc. | API URL → set in Vercel as `REACT_APP_PARCEL_API_URL` |

Start with **frontend on Vercel**; the app will load and you can add backend and Parcel API later and plug in their URLs.
