# Twilio setup – step by step

Do these in order. You need a (free) Twilio account.

---

## Step 1: Account SID and Auth Token

1. Go to **https://console.twilio.com** and sign in (or create an account).
2. On the **Dashboard**, you’ll see:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click “Show” to see it)
3. Open **`backend/.env`** in your editor.
4. Paste the Account SID after `TWILIO_ACCOUNT_SID=` (no spaces).
5. Paste the Auth Token after `TWILIO_AUTH_TOKEN=` (no spaces).  
   Save the file.

---

## Step 2: API Key (for browser dialer)

1. In Twilio Console, open **Account** → **API keys & tokens** (in the left menu under “Account”).
2. Click **Create API key**.
3. Name it e.g. `CRM Dialer`, leave “Standard” selected, click **Create**.
4. You’ll see **SID** (starts with `SK`) and **Secret** (show it and copy it — you can’t see it again).
5. In **`backend/.env`**:
   - Paste the SID after `TWILIO_API_KEY_SID=`
   - Paste the Secret after `TWILIO_API_KEY_SECRET=`  
   Save the file.

---

## Step 3: TwiML App (tells Twilio where to get call instructions)

1. In Twilio Console, go to **Develop** → **TwiML Apps** → **Create new TwiML App**.
2. **Friendly Name:** e.g. `CRM Dialer`.
3. **Voice Request URL:** for now put:  
   `https://your-tunnel-url.loca.lt/api/twilio/voice/`  
   (You’ll replace `your-tunnel-url` in Step 5. If you don’t have a tunnel yet, use `http://example.com` temporarily so you can save.)
4. Click **Save**.
5. On the TwiML App page, copy the **TwiML App SID** (starts with `AP`).
6. In **`backend/.env`**, paste it after `TWILIO_TWIML_APP_SID=`.  
   Save the file.

---

## Step 4: Phone number (optional but recommended for caller ID)

1. In Twilio Console: **Phone Numbers** → **Manage** → **Buy a number** (you get one free in trial).
2. Choose a number and buy it.
3. Copy the number in E.164 form (e.g. `+15551234567`).
4. In **`backend/.env`**, paste it after `TWILIO_NUMBER=` (include the `+`).  
   Save the file.

---

## Step 5: Tunnel so Twilio can reach your backend (for real calls)

Your backend runs on your machine; Twilio needs a public URL to call when you place a call.

1. In a terminal, start your backend (if it’s not running):
   ```bash
   cd backend
   ./venv/bin/python manage.py runserver 0.0.0.0:8000
   ```
2. In **another** terminal, from the project root:
   ```bash
   npx --yes localtunnel --port 8000
   ```
3. You’ll see a URL like `https://something.loca.lt`. Copy the **host** (e.g. `something.loca.lt`).
4. In Twilio Console, go back to **Develop** → **TwiML Apps** → your app → edit.
5. Set **Voice Request URL** to:  
   `https://something.loca.lt/api/twilio/voice/`  
   (use your real tunnel host instead of `something.loca.lt`).
6. Save.

Each time you run localtunnel you may get a new URL; if so, update the TwiML App Voice URL again.

---

## Step 6: Restart the backend

1. Stop the Django server (Ctrl+C in the terminal where it’s running).
2. Start it again:
   ```bash
   cd backend
   ./venv/bin/python manage.py runserver 0.0.0.0:8000
   ```

---

## Done

Open your CRM at **http://localhost:3001**, go to **Power Dialer**, and try calling a number.  
If you see “Twilio not configured”, double-check that every line in **`backend/.env`** has a value after the `=` (no quotes, no spaces around `=`).
