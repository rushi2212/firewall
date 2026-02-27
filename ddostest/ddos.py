import requests
import json

URL = "http://localhost:5000/api/decision/analyze"

payload = {
    "ip": "10.0.0.9",
    "payload": "benign"
}

headers = {
    "Content-Type": "application/json"
}

TOTAL_REQUESTS = 50

print(f"Sending {TOTAL_REQUESTS} rapid requests to {URL}...\n")

for i in range(TOTAL_REQUESTS):
    try:
        response = requests.post(URL, headers=headers, data=json.dumps(payload))
        print(f"{i+1}: Status {response.status_code}")
    except Exception as e:
        print(f"{i+1}: Error -> {e}")

print("\nDone. Check /presentation for DDoS detection changes.")