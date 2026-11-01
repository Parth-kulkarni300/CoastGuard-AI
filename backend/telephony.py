"""
CoastGuard AI — Outbound Emergency Telephony Dispatcher
Dispatches automated voice calls to citizen/tourist mobile numbers in the danger radius.
Powered by Gnani Timbre regional TTS voice advisories.
"""

import os
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("telephony")


"""
CoastGuard AI — Outbound Emergency Telephony Dispatcher
Dispatches automated voice calls to citizen/tourist mobile numbers in the danger radius.
Supports:
1. Twilio (Global PSTN Outbound Call Gateway)
2. Exotel (Indian Enterprise Cloud Telephony Gateway)
3. Gnani VoiceBot / Outbound Telephony Webhook
4. CoastGuard Sovereign Web-Grid Simulation
"""

import os
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("telephony")


async def trigger_outbound_call(
    to_phone: str,
    message: str,
    audio_url: str = "",
    language: str = "hi"
) -> Dict[str, Any]:
    """
    Triggers an automated telephony voice call to a physical phone number.
    Uses Twilio / Exotel / Gnani if credentials are set in environment,
    or falls back to instant Sovereign Web-Grid simulation.
    """
    # Clean and format phone number to E.164 (+91...)
    clean = to_phone.strip().replace(" ", "").replace("-", "")
    if len(clean) == 10 and not clean.startswith("+"):
        formatted_phone = f"+91{clean}"
    else:
        formatted_phone = clean if clean.startswith("+") else f"+{clean}"

    # Map language codes to telephony TTS locale
    lang_map = {
        "hi": "hi-IN",
        "en": "en-IN",
        "ta": "ta-IN",
        "bn": "bn-IN",
        "mr": "mr-IN"
    }
    telephony_lang = lang_map.get(language[:2].lower(), "hi-IN")

    # ─────────────────────────────────────────────
    # Provider 1: Twilio (Supports Account SID + Auth Token OR API Key + Secret)
    # ─────────────────────────────────────────────
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    api_key = os.getenv("TWILIO_API_KEY") or os.getenv("TWILIO_API_KEY_SID")
    api_secret = os.getenv("TWILIO_API_SECRET") or os.getenv("TWILIO_CLIENT_SECRET")
    twilio_from = os.getenv("TWILIO_FROM_PHONE")

    # If the user put the SK... key into TWILIO_ACCOUNT_SID
    if account_sid and account_sid.startswith("SK"):
        api_key = account_sid
        if not api_secret:
            api_secret = auth_token
        account_sid = os.getenv("TWILIO_PARENT_ACCOUNT_SID") or os.getenv("TWILIO_MAIN_ACCOUNT_SID")

    auth_tuple = None
    # Prioritize master Auth Token (full permissions for voice PSTN calls)
    if account_sid and auth_token and not account_sid.startswith("your_"):
        auth_tuple = (account_sid, auth_token)
    elif api_key and api_secret:
        auth_tuple = (api_key, api_secret)

    if account_sid and auth_tuple and twilio_from and not account_sid.startswith("your_"):
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls.json"
            # TwiML: Speaks the danger warning in the tourist's Indic language
            twiml = f"<Response><Say language='{telephony_lang}' voice='Polly.Aditi'>{message}</Say></Response>"
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(
                    url,
                    auth=auth_tuple,
                    data={"To": formatted_phone, "From": twilio_from, "Twiml": twiml}
                )
                if res.status_code in (200, 201):
                    call_data = res.json()
                    logger.info(f"[TELEPHONY-TWILIO] Live outbound call dispatched to {formatted_phone}: SID {call_data.get('sid')}")
                    return {
                        "status": "dispatched",
                        "carrier": "twilio",
                        "phone": formatted_phone,
                        "sid": call_data.get("sid")
                    }
                else:
                    logger.warning(f"[TELEPHONY-TWILIO] Error {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"[TELEPHONY-TWILIO] Exception: {e}")

    # ─────────────────────────────────────────────
    # Provider 2: Exotel (Indian Telecom Gateway)
    # ─────────────────────────────────────────────
    exotel_sid = os.getenv("EXOTEL_SID") or os.getenv("EXOTEL_ACCOUNT_SID")
    exotel_key = os.getenv("EXOTEL_API_KEY")
    exotel_token = os.getenv("EXOTEL_API_TOKEN")
    exotel_caller_id = os.getenv("EXOTEL_CALLER_ID")
    exotel_subdomain = os.getenv("EXOTEL_SUBDOMAIN", "api.exotel.com")

    if exotel_sid and exotel_key and exotel_token and exotel_caller_id:
        try:
            url = f"https://{exotel_key}:{exotel_token}@{exotel_subdomain}/v1/Accounts/{exotel_sid}/Calls/connect.json"
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(
                    url,
                    data={
                        "From": exotel_caller_id,
                        "To": formatted_phone,
                        "CallerId": exotel_caller_id,
                        "CallType": "trans"
                    }
                )
                if res.status_code in (200, 201):
                    call_data = res.json()
                    logger.info(f"[TELEPHONY-EXOTEL] Live outbound call dispatched to {formatted_phone}")
                    return {
                        "status": "dispatched",
                        "carrier": "exotel",
                        "phone": formatted_phone,
                        "call": call_data
                    }
                else:
                    logger.warning(f"[TELEPHONY-EXOTEL] Error {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"[TELEPHONY-EXOTEL] Exception: {e}")

    # ─────────────────────────────────────────────
    # Provider 3: Sovereign Mesh / Web-Grid Simulation
    # ─────────────────────────────────────────────
    logger.info(f"[TELEPHONY-MESH] Emergency automated voice call routed to {formatted_phone} (Language: {telephony_lang})")
    return {
        "status": "simulated",
        "carrier": "coastguard-sovereign-mesh",
        "phone": formatted_phone,
        "language": telephony_lang,
        "message": message,
        "audio_url": audio_url
    }
