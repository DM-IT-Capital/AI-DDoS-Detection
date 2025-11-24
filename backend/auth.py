# backend/auth.py
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
from schemas import UserCreate, ChangePassword
from utils.security import (
    verify_password,
    create_access_token,
    decode_token,
    hash_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

# --- DB session helper ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Current user from Bearer token ---
def get_current_user(request: Request, db: Session = Depends(get_db)):
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = auth.split(" ", 1)[1].strip()
    payload = decode_token(token)  # returns None or raises for bad/expired tokens
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.username == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- Login ---
@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "role": user.role, "token_type": "bearer"}

# --- Change own password ---
@router.post("/change-password")
def change_password(
    data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

# --- Add user (superadmin only) ---
@router.post("/add-user")
def add_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Permission denied")

    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": f"User {new_user.username} created", "role": new_user.role}

# --- List users (superadmin/admin) ---
@router.get("/users")
def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    users = db.query(User).all()
    if current_user.role == "admin":
        # admins can’t see superadmin
        users = [u for u in users if u.role != "superadmin"]

    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "created_at": u.created_at,
        }
        for u in users
    ]

# --- Delete user (superadmin only) ---
@router.delete("/delete-user/{username}")
def delete_user(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Permission denied")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "superadmin":
        raise HTTPException(status_code=403, detail="Cannot delete superadmin")

    db.delete(user)
    db.commit()
    return {"message": f"User '{username}' deleted successfully"}

# --- Reset password (superadmin; admin may reset read_only) ---
@router.post("/reset-password/{username}")
def reset_password(
    username: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    allowed = (
        current_user.role == "superadmin"
        or (current_user.role == "admin" and target.role in ["admin", "read_only"])
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied")

    new_password = data.get("new_password")
    if not new_password:
        raise HTTPException(status_code=400, detail="New password required")

    target.password_hash = hash_password(new_password)
    db.commit()
    return {"message": f"Password reset for user '{username}'"}
