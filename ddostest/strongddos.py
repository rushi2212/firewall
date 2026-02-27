import requests
import json
from concurrent.futures import ThreadPoolExecutor

URL = "http://localhost:5000/api/decision/analyze"

payload = {
    "ip": "10.0.0.9",
    "payload": "1; DROP TABLE users; --"
}

headers = {
    "Content-Type": "application/json"
}

TOTAL_REQUESTS = 50
MAX_WORKERS = 20  # concurrency level

def send_request(i):
    try:
        response = requests.post(URL, headers=headers, data=json.dumps(payload))
        return f"{i}: {response.status_code}"
    except Exception as e:
        return f"{i}: Error {e}"

print(f"Sending {TOTAL_REQUESTS} concurrent requests...\n")

with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
    results = executor.map(send_request, range(1, TOTAL_REQUESTS + 1))

for r in results:
    print(r)

print("\nDone. Monitor your WAF dashboard.")