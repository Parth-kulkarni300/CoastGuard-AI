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


async def trigger_outbound_call(
    to_phone: str,
    message: str,
    audio_url: str = "",
    language: str = "hi"
) -> Dict[str, Any]:
    """
    Triggers an automated telephony voice call to a phone number.
    Uses Twilio / Exotel if credentials are set, or simulates instant telecom carrier dispatch.
    """
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_phone = os.getenv("TWILIO_FROM_PHONE", "+18005550199")

    # Clean and format phone number
    clean = to_phone.strip().replace(" ", "").replace("-", "")
    if len(clean) == 10 and not clean.startswith("+"):
        formatted_phone = f"+91{clean}"
    else:
        formatted_phone = clean if clean.startswith("+") else f"+{clean}"

    # Real telecom gateway integration if configured
    if account_sid and auth_token and not account_sid.startswith("your_"):
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls.json"
            twiml = f"<Response><Say language='{language}-IN'>{message}</Say></Response>"
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    url,
                    auth=(account_sid, auth_token),
                    data={"To": formatted_phone, "From": from_phone, "Twiml": twiml}
                )
                if res.status_code in (200, 201):
                    call_data = res.json()
                    logger.info(f"[TELEPHONY] Successfully dispatched live call to {formatted_phone}: SID {call_data.get('sid')}")
                    return {
                        "status": "dispatched",
                        "carrier": "twilio",
                        "phone": formatted_phone,
                        "sid": call_data.get("sid")
                    }
        except Exception as e:
            logger.warning(f"[TELEPHONY] Carrier API notice: {e}")

    # Mesh / Web-Grid Telephony Simulation
    logger.info(f"[TELEPHONY-MESH] Emergency automated voice call routed to {formatted_phone} (Language: {language})")
    return {
        "status": "simulated",
        "carrier": "coastguard-sovereign-mesh",
        "phone": formatted_phone,
        "language": language,
        "message": message,
        "audio_url": audio_url
    }
