# Twilio Phone Dialer – CRM Integration

Connect your Twilio account so the **Power Dialer** in the CRM can place browser-based calls to contacts.

## 1. Twilio setup

1. Sign up or log in at [twilio.com](https://www.twilio.com).
2. Get your **Account SID** and **Auth Token** from the [Twilio Console](https://console.twilio.com).
3. Create an **API Key** (Console → Account → API keys & tokens): create a key, save the **SID** and **Secret** (shown once).
4. Buy a **Phone Number** (Console → Phone Numbers) if you don’t have one; the dialer will use it as caller ID for outbound calls.
5. Create a **TwiML App** (Console → Develop → TwiML Apps → Create):
   - **Friendly Name:** e.g. `CRM Dialer`
   - **Voice Request URL:** your backend URL that returns TwiML, e.g.  
     `https://your-backend.com/api/twilio/voice/`  
     For local dev: use a tunnel (ngrok, etc.) and put that URL here.
   - Save and note the **TwiML App SID**.

## 2. Backend (Django) env vars

In the backend project (or `.env` next to `manage.py`), set:

```bash
# Required
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=your_api_key_secret
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Twilio phone number for caller ID (E.164, e.g. +15551234567)
TWILIO_NUMBER=+15551234567
```

Install deps and run:

```bash
cd backend
pip install -r requirements.txt
python manage.py runserver
```

## 3. Frontend

- **Local:** The dialer calls `http://localhost:8000` by default. Start the Django server on port 8000.
- **Other API URL:** set `REACT_APP_TWILIO_API_URL=https://your-api.com` in the frontend env (or in `.env` in the frontend folder), then rebuild.

## 4. TwiML App Voice URL (required)

When a call is placed from the browser, Twilio requests your **Voice Request URL** and expects TwiML that dials the contact. This repo’s backend exposes:

- `GET /api/twilio/voice/?To=+15551234567` → returns TwiML that dials `To`.

So in the TwiML App, set:

- **Voice Request URL:** `https://YOUR_BACKEND_HOST/api/twilio/voice/`

For local development, expose your backend with a tunnel (e.g. ngrok) and use that HTTPS URL in the TwiML App.

## 5. CORS

The backend is configured to allow requests from the frontend (including localhost and your GitHub Pages domain). For production, restrict `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` in Django settings.

## Summary

| Item            | Where |
|-----------------|--------|
| Account SID     | Twilio Console |
| Auth Token      | Twilio Console |
| API Key SID     | Twilio Console → API keys |
| API Key Secret  | Twilio Console → API keys (create key) |
| TwiML App SID   | Twilio Console → TwiML Apps |
| Voice URL       | Your backend: `https://YOUR_HOST/api/twilio/voice/` |

After this, open the CRM → **Power Dialer**, and use **Call** on a contact to place a browser call via Twilio.
