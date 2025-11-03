from fastapi import FastAPI, Request
import requests

app = FastAPI()

@app.post("/evaluate")
async def evaluate_alert(request: Request):
    data = await request.json()
    print(f"[RuleEngine] Received data: {data}")  # 👈 add this line

    filename = data.get("filename")
    bps = float(data.get("bps", 0))
    duration = float(data.get("duration", 0))

    verdict = "Legit Traffic"
    confidence = "100%"

    if bps > 200_000_000 or duration > 10:
        verdict = "Real Attack"
        confidence = "99%"

    try:
        requests.post(
            "http://antarex_workflow:5002/finalize",
            json={"filename": filename, "verdict": verdict, "confidence": confidence},
            timeout=10
        )
    except Exception as e:
        print(f"[RuleEngine] Workflow call failed: {e}")

    print(f"→ [RuleEngine] Evaluated {filename} → {verdict} ({confidence})")
    return {"filename": filename, "verdict": verdict, "confidence": confidence}

