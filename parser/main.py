from fastapi import FastAPI, Request
import os, requests, json, re

app = FastAPI()

@app.post("/parse")
async def parse_alert(request: Request):
    data = await request.json()
    filename = data.get("filename")
    path = f"/app/uploads/{filename}"

    if not os.path.exists(path):
        return {"status": "error", "detail": f"File {filename} not found"}

    # 🔍 Read PDF text content (replace this with your actual PDF reader later)
    # 🔍 Properly extract text from PDF
    from PyPDF2 import PdfReader

    def extract_text_from_pdf(pdf_path):
        try:
            reader = PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
        except Exception as e:
            print(f"[Parser] PDF extraction failed: {e}")
            return ""

    text = extract_text_from_pdf(path)


    # 🧠 Extract metrics from the text
    bps_match = re.search(r"([\d\.]+)\s*Mbit/s", text)
    duration_match = re.search(r"(\d+)\s*minutes?", text)
    src_match = re.search(r"(\d+\.\d+\.\d+\.\d+)", text)

    bps = float(bps_match.group(1)) * 1_000_000 if bps_match else 0
    duration = int(duration_match.group(1)) if duration_match else 0
    src_ip = src_match.group(1) if src_match else "unknown"

    parsed = {
        "filename": filename,
        "source_ip": src_ip,
        "bps": bps,
        "duration": duration,
    }

    # ✅ Forward parsed data to Rule Engine
    try:
        resp = requests.post(
            "http://antarex_rule_engine:5001/evaluate",
            json=parsed,
            timeout=10
        )
        resp.raise_for_status()
    except Exception as e:
        return {"status": "error", "detail": str(e)}

    return {"status": "parsed", "data": parsed}
