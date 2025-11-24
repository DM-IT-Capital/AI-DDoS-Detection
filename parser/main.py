from fastapi import FastAPI, Request
import os, requests, re, time
from PyPDF2 import PdfReader

app = FastAPI()

RULE_ENGINE_URL = "http://antarex_rule_engine:5001/evaluate"
BACKEND_UPDATE_URL = "http://antarex_backend:8000/alerts/update"

def send_to_rule_engine(payload: dict) -> bool:
    for attempt in range(3):
        try:
            r = requests.post(RULE_ENGINE_URL, json=payload, timeout=30)
            r.raise_for_status()
            print(f"📤 Sent {payload['filename']} to Rule Engine: {r.status_code}")
            return True
        except Exception as e:
            wait = 2 * (attempt + 1)
            print(f"⚠️ Rule Engine call failed ({e}); retry in {wait}s…")
            time.sleep(wait)
    return False

def fallback_pending(filename: str):
    try:
        r = requests.put(  # ✅ use PUT
            "http://antarex_backend:8000/alerts/update",
            json={"filename": filename, "verdict": "Pending", "confidence": "0%"},
            timeout=15,
        )
        print(f"↩️ Fallback update to backend ({r.status_code}) for {filename}")
    except Exception as e:
        print(f"❌ Fallback update failed for {filename}: {e}")

def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        reader = PdfReader(pdf_path)
        return "".join(page.extract_text() or "" for page in reader.pages)
    except Exception as e:
        print(f"[Parser] PDF extraction failed: {e}")
        return ""

@app.post("/parse")
async def parse_alert(request: Request):
    data = await request.json()
    filename = data.get("filename")
    path = f"/app/uploads/{filename}"

    if not os.path.exists(path):
        return {"status": "error", "detail": f"File {filename} not found"}

    text = extract_text_from_pdf(path)

    bps_match = re.search(r"([\d\.]+)\s*Mbit/s", text)
    duration_match = re.search(r"(\d+)\s*minutes?", text)
    src_match = re.search(r"(\d+\.\d+\.\d+\.\d+)", text)

    bps = float(bps_match.group(1)) * 1_000_000 if bps_match else 0.0
    duration = float(duration_match.group(1)) if duration_match else 0.0
    src_ip = src_match.group(1) if src_match else "unknown"

    parsed = {"filename": filename, "source_ip": src_ip, "bps": bps, "duration": duration}
    print(f"🧩 Parsed {filename}: {parsed}")

    if not send_to_rule_engine(parsed):
        fallback_pending(filename)

    return {"status": "parsed", "data": parsed}
