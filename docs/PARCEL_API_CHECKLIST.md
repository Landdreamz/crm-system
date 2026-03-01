# Parcel API on live site – your checklist

Do these **on your end** in order. If you skip one, APN search on the site won’t work.

---

## 1. Deploy the Parcel API (e.g. Render)

- [ ] Go to **[render.com](https://render.com)** → sign in with GitHub.
- [ ] **New → Web Service** → select repo **crm-system**.
- [ ] **Root Directory:** type `parcel_api`.
- [ ] **Build command:** `pip install -r requirements.txt`
- [ ] **Start command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
- [ ] Create the service and wait until it shows **Live** (first deploy can take a few minutes).
- [ ] Copy the service URL (e.g. `https://crm-parcel-api-xxxx.onrender.com`) — **no trailing slash**.

If you don’t do this, there is no API for the site to call.

---

## 2. Add the URL in GitHub

- [ ] Open **https://github.com/Landdreamz/crm-system/settings/variables/actions**
- [ ] Under **Variables**, click **New repository variable**.
- [ ] **Name:** `REACT_APP_PARCEL_API_URL` (copy exactly).
- [ ] **Value:** the URL from step 1 (e.g. `https://crm-parcel-api-xxxx.onrender.com`).
- [ ] Click **Add variable**.

If you don’t do this, the frontend build won’t know your API URL.

---

## 3. Trigger a new deploy

The live site only gets the API URL when the frontend **build** runs **after** the variable is set.

- [ ] Either **push a commit** to `main` (e.g. a small change or an empty commit:  
  `git commit --allow-empty -m "Trigger deploy for Parcel API URL" && git push`),  
  **or**
- [ ] Go to **https://github.com/Landdreamz/crm-system/actions** → open **Deploy to GitHub Pages** → **Run workflow** → Run.

Wait for the workflow to finish (green check). Then wait 1–2 minutes for GitHub Pages to update.

If you don’t do this, the site is still using the old build without your API URL.

---

## 4. Test

- [ ] Open **https://landdreamz.github.io/crm-system/** (use a private/incognito window or hard refresh: Cmd+Shift+R).
- [ ] Go to the **Parcel API** tab.
- [ ] Search by APN (e.g. `0280490000034`). It should either return a result or a clear “no parcel” message, not “Cannot reach the Parcel API”.

---

**Still not working?**

- Confirm the Render service is **Live** and the URL opens in the browser (you should see JSON or “Parcel API”).
- Confirm the variable name is exactly **REACT_APP_PARCEL_API_URL** (no space, correct spelling).
- Confirm you ran step 3 **after** step 2 (new deploy after adding the variable).
- On Render free tier, the first request after idle can take 30–60 seconds; try the search again after a short wait.
