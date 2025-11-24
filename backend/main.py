# backend/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Body
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timezone
from io import StringIO
from typing import List, Optional, Literal
from pydantic import BaseModel
import os, requests, csv, shutil

from database import Base, engine, SessionLocal
from models import Alert, User
from auth import router as auth_router, get_current_user
from utils.security import hash_password

# -------------------------------------------------
# FastAPI app + CORS
# -------------------------------------------------
app = FastAPI(title="Antarex API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include /auth routes (they already have prefix="/auth")
app.include_router(auth_router)

# DB bootstrap
Base.metadata.create_all(bind=engine)

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -------------------------------------------------
# Helpers
# -------------------------------------------------
@app.get("/healthz")
def healthz():
    return {"ok": True}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_users():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            users = [
                {"username": "superadmin", "password": "super123", "role": "superadmin"},
                {"username": "admin", "password": "admin123", "role": "admin"},
                {"username": "viewer", "password": "readonly123", "role": "read_only"},
            ]
            for u in users:
                db.add(User(
                    username=u["username"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"]
                ))
            db.commit()
            print("✅ Default users seeded")
    finally:
        db.close()

seed_users()

# -------------------------------------------------
# Upload (auth required)
# -------------------------------------------------
@app.post("/upload")
async def upload_alert(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        uploaded_files: List[str] = []

        for file in files:
            save_path = os.path.join(UPLOAD_DIR, file.filename)

            # Skip duplicates
            if db.query(Alert).filter(Alert.filename == file.filename).first():
                print(f"⚠️ Skipping duplicate file: {file.filename}")
                continue

            with open(save_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            new_alert = Alert(
                filename=file.filename,
                verdict="Pending",
                confidence="0%",
                created_at=datetime.now(timezone.utc),
            )
            db.add(new_alert)
            uploaded_files.append(file.filename)

            # Trigger parser (service-to-service)
            try:
                parser_url = "http://antarex_parser:5000/parse"
                res = requests.post(parser_url, json={"filename": file.filename}, timeout=60)
                print(f"📤 Sent {file.filename} to parser: {res.status_code}")
            except Exception as e:
                print(f"⚠️ Parser trigger failed for {file.filename}: {e}")

        db.commit()

        if not uploaded_files:
            raise HTTPException(status_code=400, detail="No new files uploaded (all duplicates).")

        return {"message": f"✅ Uploaded {len(uploaded_files)} file(s)", "files": uploaded_files}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

# -------------------------------------------------
# Alerts (public read)
# -------------------------------------------------
@app.get("/alerts")
def get_all_alerts(db: Session = Depends(get_db)):
    results = db.query(Alert).order_by(Alert.id.desc()).limit(50).all()
    data = [
        {
            "filename": r.filename,
            "verdict": r.verdict,
            "confidence": r.confidence,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in results
    ]
    return {"count": len(data), "alerts": data}

# Shared update core
def _update_alert_core(data: dict, db: Session):
    filename = data.get("filename")
    verdict = data.get("verdict")
    confidence = data.get("confidence")

    if not filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    alert = db.query(Alert).filter(Alert.filename == filename).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {filename} not found")

    alert.verdict = verdict
    alert.confidence = confidence
    alert.created_at = datetime.now(timezone.utc)
    db.commit()
    print(f"✅ Updated {filename}: {verdict} ({confidence})")

    return {"status": "updated", "filename": filename, "verdict": verdict, "confidence": confidence}

@app.put("/alerts/update")
def update_alert_put(data: dict = Body(...), db: Session = Depends(get_db)):
    return _update_alert_core(data, db)

@app.post("/alerts/update")
def update_alert_post(data: dict = Body(...), db: Session = Depends(get_db)):
    # Helpful log when rule engine posts
    print(f"↩️  /alerts/update payload: {data}")
    return _update_alert_core(data, db)

# -------------------------------------------------
# Bulk update (auth + RBAC)
# -------------------------------------------------
class BulkUpdateReq(BaseModel):
    scope: Literal["pending", "all", "filenames"] = "pending"
    filenames: Optional[List[str]] = None
    verdict: Literal["Real Attack", "Legit Traffic", "Suspicious", "Pending"]
    confidence: str = "100%"

@app.post("/alerts/bulk-update")
def bulk_update_alerts(
    req: BulkUpdateReq,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # RBAC: only admin or superadmin may bulk-update
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    q = db.query(Alert)

    if req.scope == "pending":
        q = q.filter(or_(Alert.verdict.is_(None), Alert.verdict == "Pending"))
    elif req.scope == "filenames":
        if not req.filenames:
            raise HTTPException(status_code=400, detail="filenames required for scope=filenames")
        q = q.filter(Alert.filename.in_(req.filenames))
    elif req.scope == "all":
        pass
    else:
        raise HTTPException(status_code=400, detail="Invalid scope")

    updated = q.update(
        {
            Alert.verdict: req.verdict,
            Alert.confidence: req.confidence,
            Alert.created_at: datetime.now(timezone.utc),
        },
        synchronize_session=False,
    )
    db.commit()
    return {"updated": updated, "verdict": req.verdict, "confidence": req.confidence}

# -------------------------------------------------
# Download / Export (auth + RBAC)
# -------------------------------------------------
@app.get("/download/{filename}")
def download_alert(filename: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path, filename=filename, media_type="application/pdf")

@app.get("/export/csv")
def export_alerts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    results = db.query(Alert).order_by(Alert.id.desc()).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Filename", "Verdict", "Confidence", "Created At"])

    for r in results:
        writer.writerow([r.filename, r.verdict, r.confidence, r.created_at])

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=alerts_export.csv"},
    )

# -------------------------------------------------
# Root
# -------------------------------------------------
@app.get("/")
def root():
    return {"message": "Antarex AI Backend is running"}
