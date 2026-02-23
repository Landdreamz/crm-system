# Where & How to Get the APIs

This app can use optional API keys for **Regrid parcel maps** and **Market Research** data. Here’s where and how to get each one.

---

## 1. Regrid (parcel map layer)

**What it does:** Shows official-style parcel boundaries on the contact map (U.S. and Canadian parcels).

**Where to get it:**
- **Website:** [regrid.com](https://regrid.com) → [Parcel API & Tiles](https://regrid.com/api)
- **Sign up / dashboard:** [app.regrid.com](https://app.regrid.com)

**How to get access:**
1. Go to [app.regrid.com](https://app.regrid.com) and create an account.
2. Look for **API** or **Parcel API / Tiles** in the dashboard or plans (e.g. “Self-serve Parcel API” or “API Sandbox” — they mention a free 30-day trial).
3. After you subscribe, Regrid will give you:
   - An **API key** (or similar token), and  
   - **Tile URL** documentation (a URL template for map tiles, often with `{z}`, `{x}`, `{y}` and your key).
4. In their docs or dashboard, find the **Tile API** or **Tileserver** base URL. It might look like:
   - `https://tiles.regrid.com/...` or  
   - A URL that includes your key as a query parameter.

**How to use it in this app:**
- Create a file `frontend/.env` (copy from `frontend/.env.example`).
- Add one line (use the exact URL format Regrid gives you):
  ```bash
  REACT_APP_REGRID_TILE_URL=https://the-url-they-give-you/{z}/{x}/{y}.png?key=YOUR_KEY
  ```
- Restart the app (`npm start`). The parcel layer appears on the contact map when the env var is set.

**If you can’t find the tile URL:** Check Regrid’s [Support / API docs](https://support.regrid.com/api) or contact them (e.g. [Contact Us](https://regrid.com/parcel-data-expert) on their site).

---

## 2. Market Research (RapidAPI realty data)

**What it does:** Powers “live” market research data in the app (e.g. real estate listings / stats).

**Where to get it:**
- **Website:** [rapidapi.com](https://rapidapi.com)
- Search for **real estate** or **realty** APIs (e.g. “Realty in US” or similar).

**How to get the key:**
1. Go to [rapidapi.com](https://rapidapi.com) and sign in or create an account.
2. Search for a realty/real estate API (e.g. “Realty in US”).
3. Open the API page and click **Subscribe** or **Pricing**. Many have a free tier (e.g. limited requests per month).
4. After subscribing, open the API’s **Endpoints** tab. You’ll see:
   - **X-RapidAPI-Key** — this is your API key.
   - **X-RapidAPI-Host** or the base URL (e.g. `realty-in-us.p.rapidapi.com`) — this is the API host/URL.

**How to use it in this app:**
- Create `frontend/.env` from `frontend/.env.example` and add:
  ```bash
  REACT_APP_MARKET_RESEARCH_API_KEY=your_rapidapi_key_here
  REACT_APP_MARKET_RESEARCH_API_URL=https://realty-in-us.p.rapidapi.com
  ```
- Use the **exact** host/URL shown for the API you subscribed to (it might not be `realty-in-us.p.rapidapi.com`).
- Restart the app. The Market Research section can use this key so you don’t have to paste it every time.

---

## Quick reference

| API            | Where to sign up      | What you get                    | Env variable(s)                          |
|----------------|------------------------|----------------------------------|------------------------------------------|
| **Regrid**     | app.regrid.com        | API key + Tile URL template      | `REACT_APP_REGRID_TILE_URL`              |
| **Market Research** | rapidapi.com     | API key + API host/URL           | `REACT_APP_MARKET_RESEARCH_API_KEY`, `REACT_APP_MARKET_RESEARCH_API_URL` |

**Env file:** Put these in `frontend/.env`. Copy `frontend/.env.example` to `frontend/.env` and fill in the values. Restart `npm start` after changing `.env`.
