# Free API keys for the CRM

Get these keys (free signup), then add them to **`frontend/.env`** and restart the dev server.

---

## Regrid (parcel map layer)

- **What it does:** Shows parcel boundaries on the contact property map.
- **Get a key:** [Regrid API Sandbox signup (free)](https://app.regrid.com/users/sign_up?flow=api_sandbox)
- **In `frontend/.env` add:**
  ```bash
  REACT_APP_REGRID_TILE_URL=https://tiles.regrid.com/parcels/{z}/{x}/{y}.pbf
  REACT_APP_REGRID_API_KEY=paste_your_token_here
  ```
  (Regrid’s tile API expects the token as `?token=` in the URL; the app adds it automatically.)
- Restart: stop `npm start`, run `npm start` again from the `frontend` folder.

---

## Market Research (RapidAPI, optional)

- **What it does:** Live market research data in the app.
- **Get a key:** [RapidAPI](https://rapidapi.com/) — subscribe to a realty/market API and copy your key.
- **In `frontend/.env` add:**
  ```bash
  REACT_APP_MARKET_RESEARCH_API_KEY=your_rapidapi_key
  REACT_APP_MARKET_RESEARCH_API_URL=https://realty-in-us.p.rapidapi.com
  ```

---

## Others (backend / integrations)

- **GoHighLevel:** Used for contact import. Configure in **`backend/.env`** — see `docs/GOHIGHLEVEL.md`.
- **Twilio:** Used for messaging/calls. Configure in **`backend/.env`** if you use those features.

---

**After adding any key:** Save `frontend/.env`, then restart the frontend (`npm start` in `frontend/`).
