from fastapi import FastAPI, UploadFile, File, Request, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine, SessionLocal
from models import Alert, User
from datetime import datetime
from auth import router as auth_router, get_current_user
from utils.security import hash_password
import os, requests, csv
from io import StringIO

# ✅ Initialize app
app = FastAPI(title="Antarex AI Backend")

# ✅ Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Create tables
Base.metadata.create_all(bind=engine)

# ✅ Ensure uploads folder exists
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ✅ Seed initial users if none exist
def seed_users():
    db = SessionLocal()
    existing = db.query(User).count()
    if existing == 0:
        users = [
            {"username": "superadmin", "password": "super123", "role": "superadmin"},
            {"username": "admin", "password": "admin123", "role": "admin"},
            {"username": "viewer", "password": "readonly123", "role": "read_only"},
        ]
        for u in users:
            user = User(
                username=u["username"],
                password_hash=hash_password(u["password"]),
                role=u["role"]
            )
            db.add(user)
        db.commit()
        print("✅ Default users seeded")
    db.close()

seed_users()


# ✅ Upload single or multiple files
@app.post("/upload")
async def upload_alert(files: list[UploadFile] = File(...), current_user: User = Depends(get_current_user)):
    """Allow multiple file uploads (limit 10)."""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed at once.")
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    db = SessionLocal()
    uploaded = []

    for file in files:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())

        new_alert = Alert(filename=file.filename, verdict="Pending", confidence="0%")
        db.add(new_alert)
        uploaded.append(file.filename)

        try:
            requests.post("http://antarex_parser:5000/parse", json={"filename": file.filename})
        except Exception as e:
            print(f"⚠️ Parser trigger failed for {file.filename}: {e}")

    db.commit()
    db.close()

    return {"message": f"Uploaded {len(uploaded)} file(s)", "files": uploaded}


# ✅ Update alert verdicts
@app.put("/alerts/update")
async def update_alert(request: Request, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    data = await request.json()
    filename = data.get("filename")
    verdict = data.get("verdict")
    confidence = data.get("confidence")

    if not filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    db = SessionLocal()
    try:
        alert = db.query(Alert).filter(Alert.filename == filename).first()
        if not alert:
            raise HTTPException(status_code=404, detail=f"No alert found for {filename}")

        alert.verdict = verdict
        alert.confidence = confidence
        alert.created_at = datetime.utcnow()
        db.commit()
        return {
            "status": "updated",
            "filename": filename,
            "verdict": verdict,
            "confidence": confidence
        }
    finally:
        db.close()


# ✅ Retrieve alerts
@app.get("/alerts")
def get_all_alerts():
    db = SessionLocal()
    try:
        results = db.query(Alert).order_by(Alert.id.desc()).limit(50).all()
        data = [
            {
                "filename": r.filename,
                "verdict": r.verdict,
                "confidence": r.confidence,
                "created_at": str(r.created_at),
            }
            for r in results
        ]
        return {"count": len(data), "alerts": data}
    finally:
        db.close()

# ✅ Download individual alert
@app.get("/download/{filename}")
async def download_alert(filename: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path, filename=filename, media_type="application/pdf")


# ✅ Export alerts to CSV
@app.get("/export/csv")
def export_alerts(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    db = SessionLocal()
    try:
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
    finally:
        db.close()


# ✅ Superadmin-only user list
@app.get("/users")
def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Permission denied")

    db = SessionLocal()
    users = db.query(User).all()
    db.close()
    return {"users": [{"username": u.username, "role": u.role} for u in users]}

from auth import router as auth_router
# ✅ Include auth routes
app.include_router(auth_router)
