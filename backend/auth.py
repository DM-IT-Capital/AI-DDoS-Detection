from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
from utils.security import hash_password, verify_password, create_access_token, decode_token
from schemas import UserCreate, ChangePassword
from jose import JWTError
from datetime import timedelta
import os

router = APIRouter(prefix="/auth", tags=["Auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 🔹 Utility: get current user from token
def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token_data = decode_token(token.split(" ")[1])
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.username == token_data["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user

# 🔹 Login endpoint
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": access_token, "role": user.role, "token_type": "bearer"}

# 🔹 Change password
@router.post("/change-password")
def change_password(data: ChangePassword, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

# 🔹 Add new user (superadmin only)
@router.post("/add-user")
def add_user(user_data: UserCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Permission denied")

    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": f"User {new_user.username} created", "role": new_user.role}

# 🔹 List all users (superadmin only)
@router.get("/users")
def list_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Permission denied")

    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "created_at": u.created_at,
        }
        for u in users
    ]

# 🔹 Delete new user (superadmin only)
@router.delete("/delete-user/{username}")
def delete_user(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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

