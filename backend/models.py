from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True)
    verdict = Column(String)
    confidence = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="read_only")
    created_at = Column(DateTime, default=datetime.utcnow)
