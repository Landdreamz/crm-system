from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
import re
import urllib.parse
import requests
from datetime import datetime


def _gohl_config():
    return {
        'api_key': os.environ.get('GOHIGHLEVEL_API_KEY', '').strip(),
        'location_id': os.environ.get('GOHIGHLEVEL_LOCATION_ID', '').strip(),
        'apn_field_id': os.environ.get('GOHIGHLEVEL_APN_FIELD_ID', '').strip(),
        'lot_size_field_id': os.environ.get('GOHIGHLEVEL_LOT_SIZE_FIELD_ID', '').strip(),
        'acres_field_id': os.environ.get('GOHIGHLEVEL_ACRES_FIELD_ID', '').strip(),
        'latitude_field_id': os.environ.get('GOHIGHLEVEL_LATITUDE_FIELD_ID', '').strip(),
        'longitude_field_id': os.environ.get('GOHIGHLEVEL_LONGITUDE_FIELD_ID', '').strip(),
    }


def _get_custom_field_by_id(raw, field_id):
    """Get value from customField array by exact field id. GHL uses customField: [{id, value}, ...]"""
    if not field_id:
        return None
    for key in ('customField', 'customFields'):
        custom = raw.get(key)
        if not isinstance(custom, list):
            continue
        for cf in custom:
            if not isinstance(cf, dict):
                continue
            if str(cf.get('id') or cf.get('key') or '') == field_id:
                v = cf.get('value') or cf.get('val')
                return str(v).strip() if v is not None else None
    return None


def _get_custom_field(raw, *search_terms):
    """Get value from customField dict or customFields array. Searches keys/ids/names by partial match."""
    for key in ('customField', 'customFields', 'custom_field', 'custom_fields'):
        custom = raw.get(key)
        if not custom:
            continue
        if isinstance(custom, dict):
            for dk, v in custom.items():
                if v is None or v == '':
                    continue
                dk_lower = str(dk).lower()
                for term in search_terms:
                    if term.lower() in dk_lower:
                        return str(v).strip() if v else None
        if isinstance(custom, list):
            for cf in custom:
                if not isinstance(cf, dict):
                    continue
                fid = str(cf.get('id') or cf.get('key') or cf.get('field') or cf.get('name') or cf.get('label') or '').lower()
                v = cf.get('value') or cf.get('val') or cf.get('fieldValue') or cf.get('field_value')
                if v is None or v == '':
                    continue
                for term in search_terms:
                    if term.lower() in fid:
                        return str(v).strip() if v else None
    return None


def _map_gohl_contact_to_crm(raw):
    """Map GoHighLevel contact object to CRM Contact shape (id omitted; frontend assigns)."""
    first = (raw.get('firstName') or raw.get('first_name') or '').strip()
    last = (raw.get('lastName') or raw.get('last_name') or '').strip()
    name = f'{first} {last}'.strip() or raw.get('name', 'Unknown')
    email = (raw.get('email') or '').strip() or '—'
    phone = (raw.get('phone') or raw.get('phoneNumber') or raw.get('phone_number') or '').strip() or '—'
    company = (raw.get('companyName') or raw.get('company_name') or raw.get('company') or '').strip() or ''
    address1 = (raw.get('address1') or raw.get('address') or '').strip()
    city = (raw.get('city') or '').strip()
    state = (raw.get('state') or '').strip()
    zip_code = (raw.get('zip') or raw.get('postalCode') or raw.get('postal_code') or '').strip()
    full_address = ', '.join(filter(None, [address1, city, state, zip_code])) or None
    today = datetime.utcnow().strftime('%Y-%m-%d')

    apn = (
        (raw.get('apn') or raw.get('APN') or raw.get('parcelNumber') or raw.get('parcel_number') or '')
    )
    if isinstance(apn, str):
        apn = apn.strip() or None
    else:
        apn = str(apn).strip() if apn else None
    if not apn:
        cfg = _gohl_config()
        apn = _get_custom_field_by_id(raw, cfg.get('apn_field_id'))
    if not apn:
        apn = _get_custom_field(raw, 'apn', 'APN', 'parcel', 'parcel_number', 'parcel number')

    def _str(v):
        return (str(v).strip() or None) if v is not None else None

    county = _str(raw.get('county') or _get_custom_field(raw, 'county', 'County'))
    lot_size = _str(raw.get('lotSize') or raw.get('lot_size') or raw.get('lotSizeSqft'))
    if not lot_size:
        cfg = _gohl_config()
        lot_size = _get_custom_field_by_id(raw, cfg.get('lot_size_field_id'))
    if not lot_size:
        lot_size = _get_custom_field(raw, 'lot', 'lot_size', 'Lot Size', 'sqft', 'square feet')
    acres = _str(raw.get('acres'))
    if not acres:
        cfg = _gohl_config()
        acres = _get_custom_field_by_id(raw, cfg.get('acres_field_id'))
    if not acres:
        acres = _str(_get_custom_field(raw, 'acres', 'Acres', 'acreage'))
    estimated_value = _str(raw.get('estimatedValue') or raw.get('estimated_value') or _get_custom_field(raw, 'estimated', 'value'))
    property_type = _str(raw.get('propertyType') or raw.get('property_type') or _get_custom_field(raw, 'property_type', 'Property Type'))
    subdivision = _str(raw.get('subdivision') or _get_custom_field(raw, 'subdivision', 'Subdivision'))
    total_assessed = _str(raw.get('totalAssessedValue') or raw.get('total_assessed_value') or _get_custom_field(raw, 'assessed', 'total_assessed'))
    latitude = _str(raw.get('latitude') or raw.get('lat'))
    if not latitude:
        cfg = _gohl_config()
        latitude = _get_custom_field_by_id(raw, cfg.get('latitude_field_id'))
    longitude = _str(raw.get('longitude') or raw.get('lng') or raw.get('lon'))
    if not longitude:
        cfg = _gohl_config()
        longitude = _get_custom_field_by_id(raw, cfg.get('longitude_field_id'))

    return {
        'name': name or 'Unknown',
        'firstName': first or None,
        'lastName': last or None,
        'email': email,
        'phone': phone,
        'company': company,
        'status': 'Lead',
        'lastContact': today,
        'fullAddress': full_address,
        'address': address1 or None,
        'city': city or None,
        'state': state or None,
        'zip': zip_code or None,
        'county': county,
        'apn': apn,
        'lotSizeSqft': lot_size,
        'acres': acres,
        'estimatedValue': estimated_value,
        'propertyType': property_type,
        'subdivision': subdivision,
        'totalAssessedValue': total_assessed,
        'latitude': latitude,
        'longitude': longitude,
        'dataSource': 'GoHighLevel',
        '_gohlId': raw.get('id'),
        'gohlId': raw.get('id'),
    }


@require_GET
def gohl_contacts(request):
    """Fetch contacts from GoHighLevel API and return as CRM-shaped JSON."""
    cfg = _gohl_config()
    if not cfg['api_key']:
        return JsonResponse({'error': 'GoHighLevel not configured. Set GOHIGHLEVEL_API_KEY in backend/.env'}, status=503)
    if not cfg['location_id']:
        return JsonResponse({'error': 'Set GOHIGHLEVEL_LOCATION_ID in backend/.env'}, status=503)

    headers = {'Authorization': f'Bearer {cfg["api_key"]}', 'Content-Type': 'application/json'}
    query = (request.GET.get('q') or request.GET.get('query') or '').strip()
    url = f'https://rest.gohighlevel.com/v1/contacts/?locationId={cfg["location_id"]}&limit=100'
    if query:
        url += f'&query={urllib.parse.quote(query)}'

    try:
        r = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        return JsonResponse({'error': f'GoHighLevel request failed: {str(e)}'}, status=502)

    if r.status_code == 401:
        return JsonResponse({'error': 'Invalid GoHighLevel API key'}, status=401)
    if r.status_code == 422 and query:
        url = f'https://rest.gohighlevel.com/v1/contacts/?locationId={cfg["location_id"]}&limit=100'
        r = requests.get(url, headers=headers, timeout=30)
    if r.status_code != 200:
        try:
            err = r.json()
            msg = err.get('message', err.get('error', r.text[:200]))
        except Exception:
            msg = r.text[:200]
        return JsonResponse({'error': f'GoHighLevel API error ({r.status_code}): {msg}'}, status=502)

    try:
        data = r.json()
    except ValueError:
        return JsonResponse({'error': 'Invalid JSON from GoHighLevel'}, status=502)

    contacts_raw = data.get('contacts', data)
    if isinstance(contacts_raw, dict):
        contacts_raw = contacts_raw.get('contacts', [])
    if not isinstance(contacts_raw, list):
        contacts_raw = [data] if isinstance(data, dict) and data.get('id') else []

    q_lower = query.lower() if query else ''
    mapped = []
    seen = set()
    debug_raw = request.GET.get('debug') == '1' and contacts_raw

    for c in list(contacts_raw):
        if not isinstance(c, dict):
            continue
        cid = c.get('id')
        if cid and len(contacts_raw) <= 25:
            try:
                full_url = f'https://rest.gohighlevel.com/v1/contacts/{cid}?locationId={cfg["location_id"]}'
                full = requests.get(full_url, headers=headers, timeout=10)
                if full.status_code == 200:
                    fc = full.json()
                    if isinstance(fc, dict) and fc.get('contact'):
                        c = {**c, **(fc.get('contact') or fc)}
                    elif isinstance(fc, dict):
                        c = {**c, **fc}
            except Exception:
                pass

        if q_lower:
            name = f"{c.get('firstName','')} {c.get('lastName','')} {c.get('name','')}".lower()
            email = (c.get('email') or '').lower()
            phone = (c.get('phone') or c.get('phoneNumber') or '').lower()
            company = (c.get('companyName') or c.get('company') or '').lower()
            if q_lower not in name and q_lower not in email and q_lower not in phone and q_lower not in company:
                continue
        mc = _map_gohl_contact_to_crm(c)
        key = (mc.get('email', ''), mc.get('phone', ''))
        if key in seen:
            continue
        seen.add(key)
        mapped.append(mc)

    out = {'contacts': mapped, 'count': len(mapped)}
    if debug_raw and contacts_raw:
        first = contacts_raw[0] if isinstance(contacts_raw[0], dict) else {}
        out['_debug'] = {
            'first_contact_keys': list(first.keys()),
            'customField': first.get('customField'),
            'customFields': first.get('customFields'),
            'metadata': first.get('metadata'),
            'apn_direct': first.get('apn') or first.get('APN'),
        }
    return JsonResponse(out)


def _gohl_fetch_conversations(contact_id, headers, cfg):
    """Fetch conversation messages for a GHL contact. Returns list of {date, direction, body} for CRM Communications."""
    communications = []
    try:
        # GHL: conversations search by contactId (locationId may be required)
        url = (
            f'https://rest.gohighlevel.com/v1/conversations/search?locationId={cfg["location_id"]}&contactId={contact_id}'
        )
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code != 200:
            return communications
        data = r.json()
        # Handle different response shapes: conversations[], conversation?.messages[], etc.
        convos = data.get('conversations', data.get('conversation', []))
        if isinstance(convos, dict):
            convos = [convos]
        for conv in convos if isinstance(convos, list) else []:
            msgs = conv.get('messages', conv.get('message', []))
            if isinstance(msgs, dict):
                msgs = [msgs]
            for m in (msgs or []):
                if not isinstance(m, dict):
                    continue
                body = (m.get('message') or m.get('body') or m.get('text') or '').strip()
                if not body:
                    continue
                direction = 'out' if m.get('type') == 'Outgoing' or m.get('direction') == 'out' or m.get('senderType') == 'user' else 'in'
                date_str = m.get('dateAdded') or m.get('createdAt') or m.get('date') or ''
                if date_str and len(date_str) >= 10:
                    date_str = date_str[:10] + 'T' + (date_str[11:19] if len(date_str) > 19 else '00:00:00') + 'Z'
                else:
                    date_str = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
                communications.append({'date': date_str, 'direction': direction, 'body': body})
    except Exception:
        pass
    # Sort by date
    communications.sort(key=lambda x: x.get('date', ''))
    return communications


@require_GET
def gohl_contact_refresh(request):
    """Fetch one contact from GHL by gohlId or email; return CRM-shaped contact + communications for refresh/merge."""
    cfg = _gohl_config()
    if not cfg['api_key'] or not cfg['location_id']:
        return JsonResponse({'error': 'GoHighLevel not configured'}, status=503)
    gohl_id = (request.GET.get('gohlId') or request.GET.get('gohl_id') or '').strip()
    email = (request.GET.get('email') or '').strip()
    if not gohl_id and not email:
        return JsonResponse({'error': 'Provide gohlId or email'}, status=400)
    headers = {'Authorization': f'Bearer {cfg["api_key"]}', 'Content-Type': 'application/json'}
    contact_raw = None
    if gohl_id:
        try:
            r = requests.get(
                f'https://rest.gohighlevel.com/v1/contacts/{gohl_id}?locationId={cfg["location_id"]}',
                headers=headers, timeout=15
            )
            if r.status_code == 200:
                data = r.json()
                contact_raw = data.get('contact', data)
                # Single-contact GET may omit customField; fetch from list to get full custom fields
                if contact_raw and not contact_raw.get('customField') and not contact_raw.get('customFields'):
                    email_q = (contact_raw.get('email') or '').strip()
                    if email_q:
                        list_r = requests.get(
                            f'https://rest.gohighlevel.com/v1/contacts/?locationId={cfg["location_id"]}&query={urllib.parse.quote(email_q)}&limit=5',
                            headers=headers, timeout=10
                        )
                        if list_r.status_code == 200:
                            list_data = list_r.json()
                            for c in (list_data.get('contacts') or []):
                                if isinstance(c, dict) and str(c.get('id')) == str(gohl_id):
                                    if c.get('customField') or c.get('customFields'):
                                        contact_raw = {**contact_raw, 'customField': c.get('customField') or c.get('customFields'), 'customFields': c.get('customFields') or c.get('customField')}
                                    break
        except requests.RequestException:
            pass
    if not contact_raw and email:
        try:
            r = requests.get(
                f'https://rest.gohighlevel.com/v1/contacts/?locationId={cfg["location_id"]}&query={urllib.parse.quote(email)}&limit=5',
                headers=headers, timeout=15
            )
            if r.status_code == 200:
                data = r.json()
                contacts_raw = data.get('contacts', [])
                if isinstance(contacts_raw, list) and contacts_raw:
                    c = contacts_raw[0]
                    cid = c.get('id')
                    if cid:
                        full = requests.get(
                            f'https://rest.gohighlevel.com/v1/contacts/{cid}?locationId={cfg["location_id"]}',
                            headers=headers, timeout=10
                        )
                        if full.status_code == 200:
                            fc = full.json()
                            contact_raw = fc.get('contact', fc) or c
                            if contact_raw and not contact_raw.get('customField') and not contact_raw.get('customFields'):
                                cf = c.get('customField') or c.get('customFields')
                                if cf:
                                    contact_raw = {**contact_raw, 'customField': cf, 'customFields': cf}
                        else:
                            contact_raw = c
        except requests.RequestException:
            pass
    if not contact_raw:
        return JsonResponse({'error': 'Contact not found in GoHighLevel'}, status=404)
    mapped = _map_gohl_contact_to_crm(contact_raw)
    contact_id = contact_raw.get('id')
    communications = _gohl_fetch_conversations(contact_id, headers, cfg) if contact_id else []
    return JsonResponse({'contact': mapped, 'communications': communications})


@require_GET
def root(request):
    """Root URL: confirm API is up and list main endpoints."""
    return JsonResponse({
        'app': 'CRM Backend',
        'docs': 'See README and docs/ for setup.',
        'endpoints': {
            'admin': '/admin/',
            'twilio_token': '/api/twilio/token/',
            'twilio_voice': '/api/twilio/voice/',
        'gohl_contacts': '/api/gohl/contacts/',
        'gohl_contact_refresh': '/api/gohl/contacts/refresh/',
    },
    })


def _twilio_config():
    """Twilio config from env (backend). Never expose Auth Token to frontend."""
    return {
        'account_sid': os.environ.get('TWILIO_ACCOUNT_SID', ''),
        'auth_token': os.environ.get('TWILIO_AUTH_TOKEN', ''),
        'api_key_sid': os.environ.get('TWILIO_API_KEY_SID', ''),
        'api_key_secret': os.environ.get('TWILIO_API_KEY_SECRET', ''),
        'twiml_app_sid': os.environ.get('TWILIO_TWIML_APP_SID', ''),
        'twilio_number': os.environ.get('TWILIO_NUMBER', ''),
    }


@require_GET
def twilio_token(request):
    """
    Return a Twilio Access Token (JWT) for Twilio Client (browser dialer).
    Frontend uses this to initialize the Device and place calls.
    """
    cfg = _twilio_config()
    if not cfg['account_sid'] or not cfg['auth_token']:
        return JsonResponse({'error': 'Twilio not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.'}, status=503)
    twiml_app_sid = cfg['twiml_app_sid']
    if not twiml_app_sid:
        return JsonResponse({'error': 'Set TWILIO_TWIML_APP_SID (create a TwiML App in Twilio console).'}, status=503)
    if not cfg['api_key_sid'] or not cfg['api_key_secret']:
        return JsonResponse({'error': 'Set TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET (create an API Key in Twilio console).'}, status=503)

    try:
        from twilio.jwt.access_token import AccessToken
        from twilio.jwt.access_token.grants import VoiceGrant
    except ImportError:
        return JsonResponse({'error': 'Install twilio: pip install twilio'}, status=503)

    identity = request.GET.get('identity', 'crm-user')
    token = AccessToken(cfg['account_sid'], cfg['api_key_sid'], cfg['api_key_secret'], identity=identity)
    voice_grant = VoiceGrant(outgoing_application_sid=twiml_app_sid)
    token.add_grant(voice_grant)
    jwt = token.to_jwt()
    return JsonResponse({'token': jwt})


@require_GET
@csrf_exempt
def twilio_voice(request):
    """
    TwiML webhook: when a call is placed from the browser, Twilio requests this URL
    with ?To=+15551234567. Return TwiML that dials that number.
    """
    to = request.GET.get('To', '').strip()
    if not to:
        return HttpResponse(
            '<?xml version="1.0" encoding="UTF-8"?><Response><Say>No number to dial.</Say></Response>',
            content_type='application/xml'
        )
    # E.164-ish: allow digits and +
    to = re.sub(r'[^\d+]', '', to)
    if not to.startswith('+'):
        to = '+' + to
    caller_id = _twilio_config().get('twilio_number') or ''
    dial_attrs = f' callerId="{caller_id}"' if caller_id else ''
    twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial{dial_attrs}>{to}</Dial>
</Response>'''
    return HttpResponse(twiml.strip(), content_type='application/xml')
