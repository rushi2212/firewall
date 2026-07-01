import os
import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

TARGET_URL = os.getenv("DDOS_TARGET_URL", "http://localhost:5000/presentation")
ATTACKER_IP = os.getenv("DDOS_ATTACKER_IP", "10.0.0.3")
TOTAL_REQUESTS = int(os.getenv("DDOS_TOTAL_REQUESTS", "42"))
BURST_WORKERS = int(os.getenv("DDOS_BURST_WORKERS", "12"))
WARMUP_REQUESTS = int(os.getenv("DDOS_WARMUP_REQUESTS", "6"))
COOLDOWN_REQUESTS = int(os.getenv("DDOS_COOLDOWN_REQUESTS", "6"))
COOLDOWN_WAIT_SECONDS = float(os.getenv("DDOS_COOLDOWN_WAIT_SECONDS", "16"))

headers = {
    "Content-Type": "application/json",
    "X-Forwarded-For": ATTACKER_IP,
}


def send_request(index, phase):
    try:
        request = Request(TARGET_URL, headers=headers, method="GET")
        with urlopen(request, timeout=5) as response:
            return f"{phase} #{index}: {response.status}"
    except HTTPError as exc:
        return f"{phase} #{index}: {exc.code}"
    except URLError as exc:
        return f"{phase} #{index}: Error {exc.reason}"
    except Exception as exc:
        return f"{phase} #{index}: Error {exc}"


def run_sequential(count, phase, delay_range=(0.25, 0.8)):
    for index in range(1, count + 1):
        print(send_request(index, phase))
        time.sleep(random.uniform(*delay_range))


def run_burst(count, phase):
    with ThreadPoolExecutor(max_workers=min(BURST_WORKERS, count)) as executor:
        futures = [executor.submit(send_request, index, phase)
                   for index in range(1, count + 1)]
        for future in as_completed(futures):
            print(future.result())


print(f"Targeting {TARGET_URL} from {ATTACKER_IP}")
print("Phase 1: warmup traffic")
run_sequential(WARMUP_REQUESTS, "warmup")

burst_requests = max(0, TOTAL_REQUESTS - WARMUP_REQUESTS - COOLDOWN_REQUESTS)
print("\nPhase 2: sustained burst")
run_burst(burst_requests, "burst")

print(f"\nWaiting {COOLDOWN_WAIT_SECONDS:g}s for the demo block window to reset")
time.sleep(COOLDOWN_WAIT_SECONDS)

print("\nPhase 3: cooldown probe")
run_sequential(COOLDOWN_REQUESTS, "cooldown", delay_range=(0.6, 1.2))

print("\nDone. The warmup should pass, the burst should trip the limiter, and the cooldown should show recovery behavior after the window resets.")
