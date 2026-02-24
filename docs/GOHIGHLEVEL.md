# GoHighLevel contact sync

Import contacts from GoHighLevel into the CRM.

## Setup

1. Get your **API key** from GoHighLevel: **Settings → API Keys** (or **Integrations → API**).
2. Get your **Location ID**: in the URL when viewing a location, or from **Settings → Business Info**.
3. Add to `backend/.env`:

   ```
   GOHIGHLEVEL_API_KEY=your_api_key
   GOHIGHLEVEL_LOCATION_ID=your_location_id
   GOHIGHLEVEL_APN_FIELD_ID=your_apn_custom_field_id
   ```

   To find custom field ids (APN, lot size, acres, etc.): call `/api/gohl/contacts/?q=search&debug=1` and look in `_debug.customField` for each field's `id` and `value`. Add the ids to `GOHIGHLEVEL_APN_FIELD_ID`, `GOHIGHLEVEL_LOT_SIZE_FIELD_ID`, and `GOHIGHLEVEL_ACRES_FIELD_ID` as needed.

4. Restart the Django backend.

## Usage

1. Open the CRM → **Contacts**.
2. Click **Import from GoHighLevel**.
3. Contacts from your GoHighLevel location are imported. Duplicates (by email) are skipped.
4. New contacts appear in the current CRM (ACQ or Dispo). Switch CRM in the header to choose which one receives imports.

## API

- `GET /api/gohl/contacts/` – fetches contacts from GoHighLevel and returns them in CRM format.
- Requires `GOHIGHLEVEL_API_KEY` and `GOHIGHLEVEL_LOCATION_ID` in backend env.
