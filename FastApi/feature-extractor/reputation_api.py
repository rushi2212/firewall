import requests
import os

API_KEY = os.getenv("ABUSEIPDB_API_KEY", "")

def get_ip_reputation(ip):
    """
    Returns reputation score for a given IP using AbuseIPDB API.
    If no API key is provided, returns dummy reputation score.
    """
    if not ip or ip == "127.0.0.1":
        return 0

    if not API_KEY:
        # Offline mode / testing
        return 10  # neutral reputation

    try:
        url = f"https://api.abuseipdb.com/api/v2/check"
        headers = {"Key": API_KEY, "Accept": "application/json"}
        params = {"ipAddress": ip, "maxAgeInDays": 90}
        response = requests.get(url, headers=headers, params=params)
        data = response.json()
        return data.get("data", {}).get("abuseConfidenceScore", 0)

    except Exception:
        return 0
