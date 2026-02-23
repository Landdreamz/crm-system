from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
import re


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
