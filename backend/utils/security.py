from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os
from config import SECRET_KEY, ALGORITHM
from fastapi import HTTPException

# ✅ Use Passlib for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ✅ JWT Secret and Algorithm
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ✅ Password hashing functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# ✅ Token creation
def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ✅ Token decoding
def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        exp: int = payload.get("exp")

        if username is None or exp is None:
            print("❌ Invalid token payload")
            return None

        if datetime.utcfromtimestamp(exp) < datetime.utcnow():
            print("❌ Token expired")
            return None

        return payload
    except JWTError as e:
        print(f"❌ Token decode failed: {e}")
        return None
