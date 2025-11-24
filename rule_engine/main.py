from fastapi import FastAPI, Request
import requests, time

app = FastAPI()

BACKEND_UPDATE_URL = "http://antarex_backend:8000/alerts/update"  # no /api

def post_update(filename: str, verdict: str, confidence: str) -> bool:
    payload = {"filename": filename, "verdict": verdict, "confidence": confidence}
    for attempt in range(3):
        try:
            # ✅ use PUT to match backend
            r = requests.put(BACKEND_UPDATE_URL, json=payload, timeout=30)
            print(f"📤 Update to backend {r.status_code} → {payload}")
            if r.ok:
                return True
            else:
                print(f"↩️ Backend response body: {r.text[:200]}")
        except Exception as e:
            wait = 2 * (attempt + 1)
            print(f"⚠️ Update failed ({e}); retrying in {wait}s…")
            time.sleep(wait)
    return False

def evaluate_rules(bps: float, duration: float) -> tuple[str, str]:
    if bps > 500_000_000 or duration > 5:
        return ("Real Attack", "100%")
    elif bps < 200_000_000 and duration <= 2:
        return ("Legit Traffic", "100%")
    elif 200_000_000 <= bps <= 500_000_000:
        return ("Suspicious", "80%")
    return ("Suspicious", "60%")

@app.post("/evaluate")
async def evaluate(request: Request):
    data = await request.json()
    filename = data.get("filename")
    bps = float(data.get("bps", 0) or 0)
    duration = float(data.get("duration", 0) or 0)
    source_ip = data.get("source_ip", "unknown")
    print(f"⚙️ Evaluating {filename} | bps={bps}, duration={duration}, ip={source_ip}")

    verdict, confidence = evaluate_rules(bps, duration)
    ok = post_update(filename, verdict, confidence)
    if not ok:
        print(f"❌ Failed to update backend for {filename}")
    return {"filename": filename, "verdict": verdict, "confidence": confidence}
