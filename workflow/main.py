from fastapi import FastAPI, Request
import requests, os

app = FastAPI()

@app.post("/finalize")
async def finalize_alert(request: Request):
    data = await request.json()
    filename = data.get("filename")
    verdict = data.get("verdict")
    confidence = data.get("confidence")

    print(f"Received finalize for {filename} → {verdict} ({confidence})")

    # forward to backend
    try:
        requests.post("http://antarex_workflow:5002/finalize", json={
            "filename": filename,
            "verdict": verdict,
            "confidence": confidence
        }, timeout=10)

    except Exception as e:
        print(f"Failed to reach backend: {e}")
        
    return {"status": "workflow accepted"}
