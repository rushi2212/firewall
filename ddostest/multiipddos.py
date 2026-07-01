import os
import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

TARGET_URL = os.getenv("DDOS_TARGET_URL", "http://localhost:5000/presentation")
IP_POOL = [
    ip.strip()
    for ip in os.getenv(
        "DDOS_ATTACKER_IPS",
        "10.0.0.6,10.0.0.7,10.0.0.8,10.0.0.9",
    ).split(",")
    if ip.strip()
]
WARMUP_REQUESTS_PER_IP = int(os.getenv("DDOS_WARMUP_REQUESTS_PER_IP", "2"))
BURST_REQUESTS_PER_IP = int(os.getenv("DDOS_BURST_REQUESTS_PER_IP", "12"))
COOLDOWN_REQUESTS_PER_IP = int(os.getenv("DDOS_COOLDOWN_REQUESTS_PER_IP", "2"))
BURST_WORKERS = int(os.getenv("DDOS_BURST_WORKERS", "16"))
COOLDOWN_WAIT_SECONDS = float(os.getenv("DDOS_COOLDOWN_WAIT_SECONDS", "16"))


def build_headers(ip_address):
    return {
        "Content-Type": "application/json",
        "X-Forwarded-For": ip_address,
    }


def send_request(index, phase, ip_address):
    try:
        request = Request(TARGET_URL, headers=build_headers(
            ip_address), method="GET")
        with urlopen(request, timeout=5) as response:
            return f"{phase} #{index} [{ip_address}]: {response.status}"
    except HTTPError as exc:
        return f"{phase} #{index} [{ip_address}]: {exc.code}"
    except URLError as exc:
        return f"{phase} #{index} [{ip_address}]: Error {exc.reason}"
    except Exception as exc:
        return f"{phase} #{index} [{ip_address}]: Error {exc}"


def run_warmup():
    print("Phase 1: warmup traffic")
    request_number = 1
    for ip_address in IP_POOL:
        for _ in range(WARMUP_REQUESTS_PER_IP):
            print(send_request(request_number, "warmup", ip_address))
            request_number += 1
            time.sleep(random.uniform(0.2, 0.6))


def run_burst():
    print("\nPhase 2: multi-IP burst")
    burst_plan = []
    for ip_address in IP_POOL:
        for _ in range(BURST_REQUESTS_PER_IP):
            burst_plan.append(ip_address)

    random.shuffle(burst_plan)
    with ThreadPoolExecutor(max_workers=min(BURST_WORKERS, len(burst_plan))) as executor:
        futures = [
            executor.submit(send_request, index, "burst", ip_address)
            for index, ip_address in enumerate(burst_plan, start=1)
        ]
        for future in as_completed(futures):
            print(future.result())


def run_cooldown():
    print(
        f"\nWaiting {COOLDOWN_WAIT_SECONDS:g}s for the block window to settle")
    time.sleep(COOLDOWN_WAIT_SECONDS)

    print("\nPhase 3: cooldown probe")
    request_number = 1
    for ip_address in IP_POOL:
        for _ in range(COOLDOWN_REQUESTS_PER_IP):
            print(send_request(request_number, "cooldown", ip_address))
            request_number += 1
            time.sleep(random.uniform(0.5, 1.0))


print(f"Targeting {TARGET_URL}")
print(f"Using IP pool: {', '.join(IP_POOL) if IP_POOL else 'none'}")
print(
    "Warmup requests should pass first, then the burst should trip the limiter "
    "for each repeated IP, and the cooldown should show recovery after the window resets."
)

run_warmup()
run_burst()
run_cooldown()

print("\nDone.")
